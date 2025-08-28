const winston = require('winston');
const morgan = require('morgan');

// Configure Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { 
    service: 'autocontrol-api',
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Write all logs with level 'info' and below to combined.log
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Request logging middleware
const requestLogger = morgan('combined', {
  stream: {
    write: (message) => {
      logger.info(message.trim(), { type: 'http_request' });
    }
  },
  skip: (req, res) => {
    // Skip health check endpoints in production
    if (process.env.NODE_ENV === 'production') {
      return req.url.startsWith('/health') || req.url.startsWith('/ready') || req.url.startsWith('/live');
    }
    return false;
  }
});

// Performance monitoring middleware
const performanceMonitor = (req, res, next) => {
  const startTime = Date.now();
  
  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(...args) {
    const responseTime = Date.now() - startTime;
    
    // Log slow requests
    if (responseTime > 1000) { // Log requests taking more than 1 second
      logger.warn('Slow request detected', {
        type: 'performance',
        method: req.method,
        url: req.url,
        responseTime: responseTime,
        statusCode: res.statusCode,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
    }
    
    // Add response time header
    res.set('X-Response-Time', `${responseTime}ms`);
    
    originalEnd.apply(this, args);
  };
  
  next();
};

// Error tracking middleware
const errorTracker = (err, req, res, next) => {
  // Log the error
  logger.error('Application error', {
    type: 'application_error',
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name
    },
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      params: req.params,
      query: req.query,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    },
    user: req.user ? {
      id: req.user.id,
      email: req.user.email,
      organizationId: req.user.organizationId
    } : null
  });
  
  next(err);
};

// Security event logger
const logSecurityEvent = (eventType, details, req = null) => {
  logger.warn('Security event', {
    type: 'security_event',
    eventType: eventType,
    details: details,
    request: req ? {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      headers: {
        'x-forwarded-for': req.get('X-Forwarded-For'),
        'x-real-ip': req.get('X-Real-IP')
      }
    } : null,
    timestamp: new Date().toISOString()
  });
};

// Rate limit event logger
const logRateLimitEvent = (req, res, next) => {
  // This will be called when rate limit is exceeded
  logSecurityEvent('rate_limit_exceeded', {
    ip: req.ip,
    endpoint: req.url,
    method: req.method
  }, req);
  
  next();
};

// Database operation logger
const logDatabaseOperation = (operation, collection, organizationId, userId, details = {}) => {
  logger.info('Database operation', {
    type: 'database_operation',
    operation: operation,
    collection: collection,
    organizationId: organizationId,
    userId: userId,
    details: details,
    timestamp: new Date().toISOString()
  });
};

// System metrics collector
const collectSystemMetrics = () => {
  const metrics = {
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    uptime: process.uptime(),
    system: {
      loadAverage: require('os').loadavg(),
      freeMemory: require('os').freemem(),
      totalMemory: require('os').totalmem()
    }
  };
  
  logger.info('System metrics', {
    type: 'system_metrics',
    metrics: metrics
  });
  
  return metrics;
};

// Start system metrics collection
let metricsInterval;
const startMetricsCollection = () => {
  if (process.env.ENABLE_METRICS_COLLECTION === 'true') {
    metricsInterval = setInterval(collectSystemMetrics, 60000); // Every minute
    logger.info('System metrics collection started');
  }
};

const stopMetricsCollection = () => {
  if (metricsInterval) {
    clearInterval(metricsInterval);
    logger.info('System metrics collection stopped');
  }
};

// Graceful shutdown handler
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  stopMetricsCollection();
  
  // Close Winston logger
  logger.end();
  
  process.exit(0);
};

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = {
  logger,
  requestLogger,
  performanceMonitor,
  errorTracker,
  logSecurityEvent,
  logRateLimitEvent,
  logDatabaseOperation,
  collectSystemMetrics,
  startMetricsCollection,
  stopMetricsCollection
};