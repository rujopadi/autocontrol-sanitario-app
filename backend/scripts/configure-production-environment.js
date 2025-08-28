#!/usr/bin/env node
/**
 * Production Environment Configuration Script
 * Sets up environment variables, secrets management, and deployment configuration
 */
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

/**
 * Production environment configuration
 */
const ENV_CONFIG = {
  // Required environment variables
  required: [
    'NODE_ENV',
    'PORT',
    'JWT_SECRET',
    'SESSION_SECRET',
    'MONGODB_URI',
    'EMAIL_SERVICE',
    'SENDGRID_API_KEY'
  ],
  // Optional but recommended
  optional: [
    'REDIS_HOST',
    'AWS_ACCESS_KEY_ID',
    'SENTRY_DSN',
    'STRIPE_SECRET_KEY'
  ],
  // Security requirements
  security: {
    jwtSecretMinLength: 32,
    sessionSecretMinLength: 32,
    encryptionKeyLength: 32
  }
};

/**
 * Production environment configurator
 */
class ProductionEnvironmentConfigurator {
  constructor() {
    this.results = {
      startTime: new Date(),
      endTime: null,
      configurations: {},
      success: false
    };
  }

  /**
   * Configure production environment
   */
  async configure() {
    try {
      console.log('⚙️  Configuring production environment...');
      console.log('========================================');

      // Generate secure secrets
      await this.generateSecrets();

      // Create environment configuration
      await this.createEnvironmentConfig();

      // Setup secrets management
      await this.setupSecretsManagement();

      // Configure HTTPS and SSL
      await this.configureHTTPS();

      // Setup health checks
      await this.setupHealthChecks();

      // Configure logging aggregation
      await this.setupLoggingAggregation();

      // Create deployment configuration
      await this.createDeploymentConfig();

      this.results.success = true;
      this.results.endTime = new Date();

      console.log('\n🎉 Production environment configuration completed!');

    } catch (error) {
      this.results.success = false;
      this.results.endTime = new Date();
      console.error('\n💥 Environment configuration failed:', error.message);
      throw error;
    }
  }  /
**
   * Generate secure secrets
   */
  async generateSecrets() {
    console.log('\n🔐 Generating secure secrets...');

    const secrets = {
      jwtSecret: crypto.randomBytes(32).toString('hex'),
      sessionSecret: crypto.randomBytes(32).toString('hex'),
      encryptionKey: crypto.randomBytes(32).toString('hex'),
      apiKey: crypto.randomBytes(16).toString('hex'),
      webhookSecret: crypto.randomBytes(24).toString('hex')
    };

    // Save secrets to secure file
    await fs.writeFile('config/secrets.json', JSON.stringify(secrets, null, 2), { mode: 0o600 });

    console.log('   ✅ Secure secrets generated');
    console.log('   ⚠️  Store secrets securely and never commit to version control');

    this.results.configurations.secrets = {
      status: 'completed',
      generated: Object.keys(secrets).length
    };
  }

  /**
   * Create environment configuration
   */
  async createEnvironmentConfig() {
    console.log('\n📝 Creating environment configuration...');

    // Read generated secrets
    const secrets = JSON.parse(await fs.readFile('config/secrets.json', 'utf8'));

    const envConfig = `# AutoControl Pro - Production Environment Configuration
# Generated on ${new Date().toISOString()}

# Application Settings
NODE_ENV=production
PORT=3000
API_VERSION=v1
LOG_LEVEL=info
DEBUG=false

# Security Secrets (Replace with actual values)
JWT_SECRET=${secrets.jwtSecret}
SESSION_SECRET=${secrets.sessionSecret}
ENCRYPTION_KEY=${secrets.encryptionKey}
API_KEY=${secrets.apiKey}
WEBHOOK_SECRET=${secrets.webhookSecret}

# Database Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/autocontrol?retryWrites=true&w=majority
MONGODB_READONLY_URI=mongodb+srv://readonly:password@cluster.mongodb.net/autocontrol?readPreference=secondary
MONGODB_MONITOR_URI=mongodb+srv://monitor:password@cluster.mongodb.net/autocontrol?readPreference=secondaryPreferred

# Redis Cache Configuration
REDIS_HOST=your-redis-host.cache.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0
REDIS_TTL=3600

# Email Service Configuration
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=SG.your-sendgrid-api-key
EMAIL_FROM=noreply@autocontrol.com
EMAIL_FROM_NAME=AutoControl Pro
EMAIL_REPLY_TO=support@autocontrol.com

# File Storage Configuration
STORAGE_PROVIDER=aws-s3
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=autocontrol-prod-files
AWS_CLOUDFRONT_DOMAIN=cdn.autocontrol.com

# External Services
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-stripe-webhook-secret
STRIPE_PUBLISHABLE_KEY=pk_live_your-stripe-publishable-key

# Monitoring and Error Tracking
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
PROMETHEUS_ENABLED=true
GRAFANA_ENABLED=true
NEW_RELIC_LICENSE_KEY=your-new-relic-license-key

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS=false

# CORS Configuration
CORS_ORIGIN=https://app.autocontrol.com,https://autocontrol.com,https://www.autocontrol.com
CORS_CREDENTIALS=true
CORS_METHODS=GET,HEAD,PUT,PATCH,POST,DELETE
CORS_ALLOWED_HEADERS=Content-Type,Authorization,X-Requested-With

# SSL/TLS Configuration
SSL_ENABLED=true
SSL_REDIRECT=true
HSTS_ENABLED=true
HSTS_MAX_AGE=31536000
HSTS_INCLUDE_SUBDOMAINS=true

# Session Configuration
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_HTTP_ONLY=true
SESSION_COOKIE_SAME_SITE=strict
SESSION_COOKIE_MAX_AGE=86400000

# Security Headers
SECURITY_HEADERS_ENABLED=true
CSP_ENABLED=true
CSP_REPORT_URI=https://autocontrol.report-uri.com/r/d/csp/enforce

# Backup Configuration
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30
BACKUP_ENCRYPTION_ENABLED=true
BACKUP_S3_BUCKET=autocontrol-prod-backups

# Feature Flags
FEATURE_ANALYTICS_ENABLED=true
FEATURE_AUDIT_LOGGING_ENABLED=true
FEATURE_RATE_LIMITING_ENABLED=true
FEATURE_CACHE_ENABLED=true

# Performance Settings
NODE_OPTIONS=--max-old-space-size=1024
UV_THREADPOOL_SIZE=4
CLUSTER_WORKERS=max`;

    await fs.writeFile('.env.production', envConfig);

    // Create environment template for different stages
    const stagingEnv = envConfig
      .replace(/NODE_ENV=production/g, 'NODE_ENV=staging')
      .replace(/autocontrol-prod-/g, 'autocontrol-staging-')
      .replace(/app\.autocontrol\.com/g, 'staging.autocontrol.com')
      .replace(/sk_live_/g, 'sk_test_')
      .replace(/pk_live_/g, 'pk_test_');

    await fs.writeFile('.env.staging', stagingEnv);

    console.log('   ✅ Production environment file created');
    console.log('   ✅ Staging environment file created');

    this.results.configurations.environment = {
      status: 'completed',
      files: ['.env.production', '.env.staging']
    };
  }

  /**
   * Setup secrets management
   */
  async setupSecretsManagement() {
    console.log('\n🔒 Setting up secrets management...');

    // Create secrets management script
    const secretsScript = `#!/bin/bash
# Secrets Management Script

SECRETS_DIR="/etc/autocontrol/secrets"
VAULT_ADDR="\${VAULT_ADDR:-http://localhost:8200}"
VAULT_TOKEN="\${VAULT_TOKEN}"

# Create secrets directory
setup_secrets_dir() {
    echo "📁 Setting up secrets directory..."
    sudo mkdir -p "\$SECRETS_DIR"
    sudo chown root:autocontrol "\$SECRETS_DIR"
    sudo chmod 750 "\$SECRETS_DIR"
    echo "✅ Secrets directory configured"
}

# Generate secure secret
generate_secret() {
    local name=\$1
    local length=\${2:-32}
    
    echo "🔐 Generating secret: \$name"
    openssl rand -hex \$length > "\$SECRETS_DIR/\$name"
    sudo chown root:autocontrol "\$SECRETS_DIR/\$name"
    sudo chmod 640 "\$SECRETS_DIR/\$name"
    echo "✅ Secret generated: \$name"
}

# Load secret from file
load_secret() {
    local name=\$1
    local file="\$SECRETS_DIR/\$name"
    
    if [ -f "\$file" ]; then
        cat "\$file"
    else
        echo "❌ Secret not found: \$name" >&2
        return 1
    fi
}

# Store secret in HashiCorp Vault (if available)
store_in_vault() {
    local path=\$1
    local key=\$2
    local value=\$3
    
    if [ -n "\$VAULT_TOKEN" ]; then
        echo "🏦 Storing secret in Vault: \$path/\$key"
        vault kv put "\$path" "\$key=\$value"
        echo "✅ Secret stored in Vault"
    else
        echo "⚠️  Vault token not provided, skipping Vault storage"
    fi
}

# Rotate secrets
rotate_secrets() {
    echo "🔄 Rotating secrets..."
    
    # Backup current secrets
    sudo cp -r "\$SECRETS_DIR" "\$SECRETS_DIR.backup.\$(date +%Y%m%d-%H%M%S)"
    
    # Generate new secrets
    generate_secret "jwt_secret" 32
    generate_secret "session_secret" 32
    generate_secret "encryption_key" 32
    generate_secret "api_key" 16
    
    echo "✅ Secrets rotated successfully"
    echo "⚠️  Remember to restart the application"
}

# Main function
case "\${1:-help}" in
    setup)
        setup_secrets_dir
        ;;
    generate)
        generate_secret "\$2" "\$3"
        ;;
    load)
        load_secret "\$2"
        ;;
    rotate)
        rotate_secrets
        ;;
    vault-store)
        store_in_vault "\$2" "\$3" "\$4"
        ;;
    help|*)
        echo "Secrets Management Script"
        echo "Usage: \$0 {setup|generate|load|rotate|vault-store|help}"
        echo
        echo "Commands:"
        echo "  setup                    - Setup secrets directory"
        echo "  generate <name> [length] - Generate new secret"
        echo "  load <name>              - Load secret from file"
        echo "  rotate                   - Rotate all secrets"
        echo "  vault-store <path> <key> <value> - Store in Vault"
        ;;
esac`;

    await fs.writeFile('scripts/secrets-management.sh', secretsScript);
    await fs.chmod('scripts/secrets-management.sh', 0o755);

    // Create secrets loading utility
    const secretsLoader = `const fs = require('fs');
const path = require('path');

/**
 * Secrets loader utility
 */
class SecretsLoader {
  constructor(secretsDir = '/etc/autocontrol/secrets') {
    this.secretsDir = secretsDir;
    this.cache = new Map();
  }

  /**
   * Load secret from file or environment
   */
  loadSecret(name, fallbackEnvVar = null) {
    // Check cache first
    if (this.cache.has(name)) {
      return this.cache.get(name);
    }

    // Try to load from secrets directory
    const secretFile = path.join(this.secretsDir, name);
    if (fs.existsSync(secretFile)) {
      try {
        const secret = fs.readFileSync(secretFile, 'utf8').trim();
        this.cache.set(name, secret);
        return secret;
      } catch (error) {
        console.warn(\`Failed to load secret from file \${secretFile}: \${error.message}\`);
      }
    }

    // Fallback to environment variable
    if (fallbackEnvVar && process.env[fallbackEnvVar]) {
      const secret = process.env[fallbackEnvVar];
      this.cache.set(name, secret);
      return secret;
    }

    throw new Error(\`Secret not found: \${name}\`);
  }

  /**
   * Load all required secrets
   */
  loadAllSecrets() {
    const secrets = {
      jwtSecret: this.loadSecret('jwt_secret', 'JWT_SECRET'),
      sessionSecret: this.loadSecret('session_secret', 'SESSION_SECRET'),
      encryptionKey: this.loadSecret('encryption_key', 'ENCRYPTION_KEY'),
      apiKey: this.loadSecret('api_key', 'API_KEY')
    };

    return secrets;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

module.exports = SecretsLoader;`;

    await fs.writeFile('utils/secretsLoader.js', secretsLoader);

    console.log('   ✅ Secrets management script created');
    console.log('   ✅ Secrets loader utility created');

    this.results.configurations.secretsManagement = {
      status: 'completed',
      files: ['scripts/secrets-management.sh', 'utils/secretsLoader.js']
    };
  }

  /**
   * Configure HTTPS and SSL
   */
  async configureHTTPS() {
    console.log('\n🔒 Configuring HTTPS and SSL...');

    // Create SSL configuration
    const sslConfig = {
      enabled: true,
      port: 443,
      redirectHttp: true,
      hsts: {
        enabled: true,
        maxAge: 31536000,
        includeSubdomains: true,
        preload: true
      },
      certificates: {
        provider: 'letsencrypt',
        domains: ['autocontrol.com', 'www.autocontrol.com', 'app.autocontrol.com'],
        email: 'admin@autocontrol.com',
        autoRenewal: true
      },
      securityHeaders: {
        frameOptions: 'DENY',
        contentTypeOptions: 'nosniff',
        xssProtection: '1; mode=block',
        referrerPolicy: 'strict-origin-when-cross-origin',
        csp: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https:; frame-ancestors 'none';"
      }
    };

    await fs.writeFile('config/ssl-config.json', JSON.stringify(sslConfig, null, 2));

    // Create HTTPS server configuration
    const httpsServer = `const https = require('https');
const fs = require('fs');
const path = require('path');

/**
 * HTTPS Server Configuration
 */
class HTTPSServer {
  constructor(app) {
    this.app = app;
    this.sslConfig = require('../config/ssl-config.json');
  }

  /**
   * Create HTTPS server
   */
  createServer() {
    if (!this.sslConfig.enabled) {
      console.log('HTTPS disabled, using HTTP server');
      return null;
    }

    try {
      const options = {
        key: fs.readFileSync('/etc/letsencrypt/live/autocontrol.com/privkey.pem'),
        cert: fs.readFileSync('/etc/letsencrypt/live/autocontrol.com/fullchain.pem'),
        // Additional security options
        secureProtocol: 'TLSv1_2_method',
        ciphers: [
          'ECDHE-RSA-AES256-GCM-SHA512',
          'DHE-RSA-AES256-GCM-SHA512',
          'ECDHE-RSA-AES256-GCM-SHA384',
          'DHE-RSA-AES256-GCM-SHA384',
          'ECDHE-RSA-AES256-SHA384'
        ].join(':'),
        honorCipherOrder: true
      };

      const server = https.createServer(options, this.app);
      
      // Add security headers middleware
      this.app.use(this.securityHeadersMiddleware());
      
      return server;
    } catch (error) {
      console.error('Failed to create HTTPS server:', error.message);
      console.log('Falling back to HTTP server');
      return null;
    }
  }

  /**
   * Security headers middleware
   */
  securityHeadersMiddleware() {
    return (req, res, next) => {
      const headers = this.sslConfig.securityHeaders;
      
      // HSTS
      if (this.sslConfig.hsts.enabled) {
        let hstsValue = \`max-age=\${this.sslConfig.hsts.maxAge}\`;
        if (this.sslConfig.hsts.includeSubdomains) {
          hstsValue += '; includeSubDomains';
        }
        if (this.sslConfig.hsts.preload) {
          hstsValue += '; preload';
        }
        res.setHeader('Strict-Transport-Security', hstsValue);
      }
      
      // Other security headers
      res.setHeader('X-Frame-Options', headers.frameOptions);
      res.setHeader('X-Content-Type-Options', headers.contentTypeOptions);
      res.setHeader('X-XSS-Protection', headers.xssProtection);
      res.setHeader('Referrer-Policy', headers.referrerPolicy);
      res.setHeader('Content-Security-Policy', headers.csp);
      
      next();
    };
  }

  /**
   * Setup HTTP to HTTPS redirect
   */
  setupHttpRedirect() {
    if (!this.sslConfig.redirectHttp) {
      return null;
    }

    const express = require('express');
    const redirectApp = express();
    
    redirectApp.use((req, res) => {
      const httpsUrl = \`https://\${req.get('Host')}\${req.url}\`;
      res.redirect(301, httpsUrl);
    });
    
    return redirectApp;
  }
}

module.exports = HTTPSServer;`;

    await fs.writeFile('config/httpsServer.js', httpsServer);

    console.log('   ✅ SSL configuration created');
    console.log('   ✅ HTTPS server configuration created');

    this.results.configurations.https = {
      status: 'completed',
      files: ['config/ssl-config.json', 'config/httpsServer.js']
    };
  }

  /**
   * Setup health checks
   */
  async setupHealthChecks() {
    console.log('\n🏥 Setting up health checks...');

    // Create comprehensive health check system
    const healthCheckSystem = `const mongoose = require('mongoose');
const redis = require('redis');

/**
 * Comprehensive Health Check System
 */
class HealthCheckSystem {
  constructor() {
    this.checks = new Map();
    this.setupDefaultChecks();
  }

  /**
   * Setup default health checks
   */
  setupDefaultChecks() {
    this.addCheck('database', this.checkDatabase.bind(this));
    this.addCheck('redis', this.checkRedis.bind(this));
    this.addCheck('memory', this.checkMemory.bind(this));
    this.addCheck('disk', this.checkDisk.bind(this));
    this.addCheck('external_services', this.checkExternalServices.bind(this));
  }

  /**
   * Add health check
   */
  addCheck(name, checkFunction) {
    this.checks.set(name, checkFunction);
  }

  /**
   * Run all health checks
   */
  async runAllChecks() {
    const results = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {},
      summary: {
        total: this.checks.size,
        healthy: 0,
        unhealthy: 0,
        warnings: 0
      }
    };

    for (const [name, checkFunction] of this.checks) {
      try {
        const checkResult = await checkFunction();
        results.checks[name] = {
          status: checkResult.status,
          message: checkResult.message,
          details: checkResult.details || {},
          timestamp: new Date().toISOString()
        };

        if (checkResult.status === 'healthy') {
          results.summary.healthy++;
        } else if (checkResult.status === 'warning') {
          results.summary.warnings++;
        } else {
          results.summary.unhealthy++;
          results.status = 'unhealthy';
        }
      } catch (error) {
        results.checks[name] = {
          status: 'unhealthy',
          message: error.message,
          timestamp: new Date().toISOString()
        };
        results.summary.unhealthy++;
        results.status = 'unhealthy';
      }
    }

    // Overall status determination
    if (results.summary.unhealthy > 0) {
      results.status = 'unhealthy';
    } else if (results.summary.warnings > 0) {
      results.status = 'warning';
    }

    return results;
  }

  /**
   * Check database connectivity
   */
  async checkDatabase() {
    const startTime = Date.now();
    
    try {
      const dbState = mongoose.connection.readyState;
      const stateNames = ['disconnected', 'connected', 'connecting', 'disconnecting'];
      
      if (dbState !== 1) {
        return {
          status: 'unhealthy',
          message: \`Database not connected (state: \${stateNames[dbState]})\`,
          details: { state: dbState, stateName: stateNames[dbState] }
        };
      }

      // Test database operation
      await mongoose.connection.db.admin().ping();
      const responseTime = Date.now() - startTime;

      return {
        status: responseTime < 1000 ? 'healthy' : 'warning',
        message: \`Database connected (response time: \${responseTime}ms)\`,
        details: {
          state: dbState,
          stateName: stateNames[dbState],
          responseTime,
          host: mongoose.connection.host,
          name: mongoose.connection.name
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: \`Database check failed: \${error.message}\`,
        details: { error: error.message }
      };
    }
  }

  /**
   * Check Redis connectivity
   */
  async checkRedis() {
    if (!process.env.REDIS_HOST) {
      return {
        status: 'warning',
        message: 'Redis not configured',
        details: { configured: false }
      };
    }

    const startTime = Date.now();
    
    try {
      const client = redis.createClient({
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        connectTimeout: 5000
      });

      await client.connect();
      await client.ping();
      await client.disconnect();

      const responseTime = Date.now() - startTime;

      return {
        status: responseTime < 500 ? 'healthy' : 'warning',
        message: \`Redis connected (response time: \${responseTime}ms)\`,
        details: {
          responseTime,
          host: process.env.REDIS_HOST,
          port: process.env.REDIS_PORT || 6379
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: \`Redis check failed: \${error.message}\`,
        details: { error: error.message }
      };
    }
  }

  /**
   * Check memory usage
   */
  async checkMemory() {
    const memUsage = process.memoryUsage();
    const totalMem = require('os').totalmem();
    const freeMem = require('os').freemem();
    const usedMem = totalMem - freeMem;
    const memoryUsagePercent = (usedMem / totalMem) * 100;

    let status = 'healthy';
    let message = \`Memory usage: \${memoryUsagePercent.toFixed(1)}%\`;

    if (memoryUsagePercent > 90) {
      status = 'unhealthy';
      message = \`Critical memory usage: \${memoryUsagePercent.toFixed(1)}%\`;
    } else if (memoryUsagePercent > 80) {
      status = 'warning';
      message = \`High memory usage: \${memoryUsagePercent.toFixed(1)}%\`;
    }

    return {
      status,
      message,
      details: {
        system: {
          total: totalMem,
          used: usedMem,
          free: freeMem,
          percentage: memoryUsagePercent
        },
        process: {
          rss: memUsage.rss,
          heapTotal: memUsage.heapTotal,
          heapUsed: memUsage.heapUsed,
          external: memUsage.external
        }
      }
    };
  }

  /**
   * Check disk space
   */
  async checkDisk() {
    try {
      const { execSync } = require('child_process');
      const diskUsage = execSync("df / | awk 'NR==2 {print $5}' | sed 's/%//'", { encoding: 'utf8' });
      const usagePercent = parseInt(diskUsage.trim());

      let status = 'healthy';
      let message = \`Disk usage: \${usagePercent}%\`;

      if (usagePercent > 90) {
        status = 'unhealthy';
        message = \`Critical disk usage: \${usagePercent}%\`;
      } else if (usagePercent > 80) {
        status = 'warning';
        message = \`High disk usage: \${usagePercent}%\`;
      }

      return {
        status,
        message,
        details: { usagePercent }
      };
    } catch (error) {
      return {
        status: 'warning',
        message: 'Could not check disk usage',
        details: { error: error.message }
      };
    }
  }

  /**
   * Check external services
   */
  async checkExternalServices() {
    const services = [
      { name: 'SendGrid', url: 'https://api.sendgrid.com/v3/user/profile', required: true },
      { name: 'Stripe', url: 'https://api.stripe.com/v1/account', required: false }
    ];

    const results = [];
    let overallStatus = 'healthy';

    for (const service of services) {
      try {
        const response = await fetch(service.url, {
          method: 'HEAD',
          timeout: 5000
        });

        if (response.ok) {
          results.push({
            name: service.name,
            status: 'healthy',
            message: 'Service accessible'
          });
        } else {
          results.push({
            name: service.name,
            status: service.required ? 'unhealthy' : 'warning',
            message: \`Service returned \${response.status}\`
          });
          if (service.required) overallStatus = 'unhealthy';
        }
      } catch (error) {
        results.push({
          name: service.name,
          status: service.required ? 'unhealthy' : 'warning',
          message: \`Service check failed: \${error.message}\`
        });
        if (service.required) overallStatus = 'unhealthy';
      }
    }

    return {
      status: overallStatus,
      message: \`External services check completed\`,
      details: { services: results }
    };
  }
}

module.exports = HealthCheckSystem;`;

    await fs.writeFile('utils/healthCheckSystem.js', healthCheckSystem);

    console.log('   ✅ Health check system created');

    this.results.configurations.healthChecks = {
      status: 'completed',
      files: ['utils/healthCheckSystem.js']
    };
  }

  /**
   * Setup logging aggregation
   */
  async setupLoggingAggregation() {
    console.log('\n📝 Setting up logging aggregation...');

    // Create Winston logging configuration
    const loggingConfig = `const winston = require('winston');
const path = require('path');

/**
 * Production Logging Configuration
 */
class ProductionLogger {
  constructor() {
    this.logger = this.createLogger();
  }

  createLogger() {
    const logFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    );

    const transports = [
      // Console transport for development
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        ),
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
      }),

      // File transport for all logs
      new winston.transports.File({
        filename: path.join('logs', 'app.log'),
        format: logFormat,
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 10,
        tailable: true
      }),

      // Separate file for errors
      new winston.transports.File({
        filename: path.join('logs', 'error.log'),
        level: 'error',
        format: logFormat,
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
        tailable: true
      })
    ];

    // Add external logging services in production
    if (process.env.NODE_ENV === 'production') {
      // Sentry for error tracking
      if (process.env.SENTRY_DSN) {
        const Sentry = require('@sentry/node');
        Sentry.init({ dsn: process.env.SENTRY_DSN });
        
        transports.push(
          new winston.transports.Console({
            level: 'error',
            format: winston.format.printf(info => {
              if (info.level === 'error') {
                Sentry.captureException(info.error || new Error(info.message));
              }
              return '';
            })
          })
        );
      }

      // CloudWatch logs (if on AWS)
      if (process.env.AWS_REGION) {
        const CloudWatchTransport = require('winston-cloudwatch');
        transports.push(
          new CloudWatchTransport({
            logGroupName: 'autocontrol-prod',
            logStreamName: \`\${require('os').hostname()}-\${process.pid}\`,
            awsRegion: process.env.AWS_REGION,
            messageFormatter: (item) => \`[\${item.level}] \${item.message}\`
          })
        );
      }
    }

    return winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: logFormat,
      transports,
      exitOnError: false
    });
  }

  // Convenience methods
  info(message, meta = {}) {
    this.logger.info(message, meta);
  }

  error(message, error = null, meta = {}) {
    this.logger.error(message, { error, ...meta });
  }

  warn(message, meta = {}) {
    this.logger.warn(message, meta);
  }

  debug(message, meta = {}) {
    this.logger.debug(message, meta);
  }

  // Request logging middleware
  requestLogger() {
    return (req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        const logData = {
          method: req.method,
          url: req.url,
          status: res.statusCode,
          duration,
          userAgent: req.get('User-Agent'),
          ip: req.ip,
          userId: req.user?.id,
          organizationId: req.user?.organizationId
        };

        if (res.statusCode >= 400) {
          this.logger.warn('HTTP Request', logData);
        } else {
          this.logger.info('HTTP Request', logData);
        }
      });

      next();
    };
  }

  // Error logging middleware
  errorLogger() {
    return (error, req, res, next) => {
      this.logger.error('Unhandled Error', {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        },
        request: {
          method: req.method,
          url: req.url,
          headers: req.headers,
          body: req.body,
          params: req.params,
          query: req.query
        },
        user: {
          id: req.user?.id,
          organizationId: req.user?.organizationId
        }
      });

      next(error);
    };
  }
}

// Create singleton instance
const logger = new ProductionLogger();

module.exports = logger;`;

    await fs.writeFile('utils/productionLogger.js', loggingConfig);

    console.log('   ✅ Production logging configuration created');

    this.results.configurations.logging = {
      status: 'completed',
      files: ['utils/productionLogger.js']
    };
  }

  /**
   * Create deployment configuration
   */
  async createDeploymentConfig() {
    console.log('\n🚀 Creating deployment configuration...');

    // Create deployment configuration
    const deployConfig = {
      strategy: 'blue-green',
      environments: {
        staging: {
          url: 'https://staging.autocontrol.com',
          branch: 'develop',
          autoDeployment: true,
          healthCheckUrl: '/api/monitoring/health',
          rollbackOnFailure: true
        },
        production: {
          url: 'https://app.autocontrol.com',
          branch: 'main',
          autoDeployment: false,
          healthCheckUrl: '/api/monitoring/health',
          rollbackOnFailure: true,
          requiresApproval: true
        }
      },
      healthChecks: {
        timeout: 30000,
        retries: 3,
        interval: 5000
      },
      rollback: {
        enabled: true,
        automaticTriggers: ['health_check_failure', 'high_error_rate'],
        manualTrigger: true
      }
    };

    await fs.writeFile('config/deployment-config.json', JSON.stringify(deployConfig, null, 2));

    console.log('   ✅ Deployment configuration created');

    this.results.configurations.deployment = {
      status: 'completed',
      files: ['config/deployment-config.json']
    };
  }

  /**
   * Get configuration summary
   */
  getConfigurationSummary() {
    const components = Object.keys(this.results.configurations).length;
    const duration = this.results.endTime - this.results.startTime;

    return {
      success: this.results.success,
      duration: Math.round(duration / 1000),
      components,
      details: this.results.configurations
    };
  }
}

/**
 * Run production environment configuration
 */
async function configureProductionEnvironment() {
  try {
    const configurator = new ProductionEnvironmentConfigurator();
    await configurator.configure();
    
    const summary = configurator.getConfigurationSummary();
    
    console.log('\n📊 Environment Configuration Summary:');
    console.log('====================================');
    console.log(`Success: ${summary.success ? 'YES' : 'NO'}`);
    console.log(`Duration: ${summary.duration}s`);
    console.log(`Components: ${summary.components}`);

    return configurator.results;
  } catch (error) {
    console.error('❌ Production environment configuration failed:', error);
    throw error;
  }
}

// Run configuration if called directly
if (require.main === module) {
  configureProductionEnvironment()
    .then(() => {
      console.log('\n🎉 Production environment configuration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Production environment configuration failed:', error.message);
      process.exit(1);
    });
}

module.exports = {
  ProductionEnvironmentConfigurator,
  configureProductionEnvironment,
  ENV_CONFIG
};