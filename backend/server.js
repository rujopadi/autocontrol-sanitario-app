
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const fs = require('fs');
const path = require('path');

// Import database configuration based on environment
const connectDB = process.env.NODE_ENV === 'production' 
  ? require('./config/database.prod').connectDB 
  : require('./config/db');

const { apiLimiter } = require('./middleware/rateLimiter');
const { sanitizeInput } = require('./middleware/validation');
const { 
  logger, 
  requestLogger, 
  performanceMonitor, 
  errorTracker,
  startMetricsCollection 
} = require('./middleware/monitoring');
const {
  rateLimiters,
  ipFilter,
  suspiciousActivityDetector,
  bruteForceProtection,
  cspHeaders,
  securityHeaders,
  requestSizeLimit,
  originValidation,
  securityAuditLogger
} = require('./middleware/security');

const app = express();

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Start system monitoring
if (process.env.NODE_ENV === 'production') {
  startMetricsCollection();
}

// Initialize monitoring service
const { MonitoringService } = require('./services/monitoringService');
if (process.env.ENABLE_MONITORING === 'true' || process.env.NODE_ENV === 'production') {
  MonitoringService.startMonitoring(60000); // Collect metrics every minute
}

// Conectar a la Base de Datos
connectDB();

// Trust proxy for production deployment
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Compression middleware for production
if (process.env.ENABLE_COMPRESSION === 'true') {
  app.use(compression());
}

// Request logging
if (process.env.ENABLE_REQUEST_LOGGING === 'true') {
  app.use(requestLogger);
}

// Performance monitoring
app.use(performanceMonitor);

// Security middleware
app.use(ipFilter);
app.use(suspiciousActivityDetector);
app.use(requestSizeLimit);
app.use(originValidation);
app.use(securityHeaders);
app.use(cspHeaders);
app.use(securityAuditLogger);

// Middleware de seguridad
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: process.env.NODE_ENV === 'production' ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  } : false
}));

// Rate limiting - more granular
app.use('/api/', rateLimiters.api);
app.use('/api/auth/login', rateLimiters.auth);
app.use('/api/auth/register', rateLimiters.registration);
app.use('/api/auth/reset-password', rateLimiters.passwordReset);
app.use('/api/auth/forgot-password', rateLimiters.passwordReset);
app.use('/api/upload', rateLimiters.upload);

// CORS Configuration - Production ready
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // In production, use specific allowed origins
    if (process.env.NODE_ENV === 'production') {
      const allowedOrigins = process.env.CORS_ORIGINS 
        ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
        : [process.env.FRONTEND_URL];
      
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        logger.warn('CORS blocked request', { origin, allowedOrigins });
        return callback(new Error('Not allowed by CORS'));
      }
    }
    
    // Allow all origins in development
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'x-auth-token'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Additional CORS headers middleware
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`${req.method} ${req.path} - Origin: ${req.headers.origin}`);
  }
  
  // Set additional CORS headers
  const origin = req.headers.origin;
  if (process.env.NODE_ENV === 'production') {
    const allowedOrigins = process.env.CORS_ORIGINS 
      ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
      : [process.env.FRONTEND_URL];
    
    if (allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    }
  } else {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-auth-token');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    if (process.env.NODE_ENV !== 'production') {
      console.log('OPTIONS preflight request handled');
    }
    return res.status(200).json({
      message: 'CORS preflight successful'
    });
  }
  
  next();
});

// Middleware para parsing JSON con límite de tamaño
app.use(express.json({ 
  limit: process.env.MAX_FILE_SIZE || '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

app.use(express.urlencoded({ extended: true, limit: process.env.MAX_FILE_SIZE || '10mb' }));

// Middleware de sanitización
app.use(sanitizeInput);

// Health check and welcome routes
app.get('/', (req, res) => {
  res.json({
    message: 'API para Autocontrol Sanitario Pro funcionando.',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    cors: 'enabled'
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    cors: 'enabled'
  });
});

// CORS test endpoint
app.get('/api/cors-test', (req, res) => {
  res.json({
    message: 'CORS test successful',
    origin: req.headers.origin,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Serve static files for monitoring dashboard
app.use('/public', express.static(path.join(__dirname, 'public')));

// Monitoring dashboard route
app.get('/monitoring', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'monitoring-dashboard.html'));
});

// Health check routes (before API routes)
if (process.env.HEALTH_CHECK_ENABLED === 'true') {
  app.use('/', require('./routes/health.routes'));
}

// Definir Rutas de la API
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/organization', require('./routes/organization.routes'));
app.use('/api/audit', require('./routes/audit.routes'));
app.use('/api/analytics', require('./routes/analytics.routes'));
app.use('/api/monitoring', require('./routes/monitoring.routes'));
// Aquí añadirías el resto de rutas para las otras funcionalidades

const PORT = process.env.PORT || 5000;

// Error tracking middleware
app.use(errorTracker);

// Error handling middleware
app.use((err, req, res, next) => {
  // Don't log the error again if it was already logged by errorTracker
  if (process.env.NODE_ENV !== 'production') {
    console.error('Error:', err.stack);
  }
  
  // Determine error status code
  const statusCode = err.statusCode || err.status || 500;
  
  // Prepare error response
  const errorResponse = {
    success: false,
    message: err.message || 'Something went wrong!',
    timestamp: new Date().toISOString()
  };
  
  // Include stack trace only in development
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.stack = err.stack;
  }
  
  // Include error code if available
  if (err.code) {
    errorResponse.code = err.code;
  }
  
  res.status(statusCode).json(errorResponse);
});

// Handle 404
app.use('*', (req, res) => {
  res.status(404).json({
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  const message = `🚀 Servidor corriendo en el puerto ${PORT}`;
  const environment = `📡 Environment: ${process.env.NODE_ENV || 'development'}`;
  const corsInfo = process.env.NODE_ENV === 'production' 
    ? `🌐 CORS: Enabled for specific origins`
    : `🌐 CORS: Enabled for all origins`;
  const healthCheck = `📊 Health check: http://localhost:${PORT}/health`;
  
  console.log(message);
  console.log(environment);
  console.log(corsInfo);
  console.log(healthCheck);
  
  // Log to Winston in production
  if (process.env.NODE_ENV === 'production') {
    logger.info('Server started', {
      port: PORT,
      environment: process.env.NODE_ENV,
      version: process.env.APP_VERSION || '1.0.0'
    });
  }
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received, shutting down gracefully`);
  
  server.close((err) => {
    if (err) {
      logger.error('Error during server shutdown', err);
      process.exit(1);
    }
    
    logger.info('Server closed successfully');
    process.exit(0);
  });
  
  // Force close after 30 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', err);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at Promise', { reason, promise });
  gracefulShutdown('UNHANDLED_REJECTION');
});
