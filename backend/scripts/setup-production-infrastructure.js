#!/usr/bin/env node
/**
 * Production Infrastructure Setup Script
 * Configures production environment, monitoring, and deployment infrastructure
 */
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

/**
 * Infrastructure configuration
 */
const INFRA_CONFIG = {
  // Environment settings
  environment: {
    nodeEnv: 'production',
    port: 3000,
    logLevel: 'info',
    sessionSecret: 'generate-secure-session-secret',
    jwtSecret: 'generate-secure-jwt-secret'
  },
  // Load balancer settings
  loadBalancer: {
    enabled: true,
    algorithm: 'round_robin',
    healthCheck: '/api/monitoring/health',
    healthCheckInterval: 30,
    maxRetries: 3
  },
  // SSL/TLS configuration
  ssl: {
    enabled: true,
    redirectHttp: true,
    hsts: true,
    certificateProvider: 'letsencrypt'
  },
  // Monitoring configuration
  monitoring: {
    prometheus: true,
    grafana: true,
    alertmanager: true,
    nodeExporter: true,
    mongoExporter: true
  }
};

/**
 * Production infrastructure setup class
 */
class ProductionInfrastructureSetup {
  constructor() {
    this.results = {
      startTime: new Date(),
      endTime: null,
      components: {},
      success: false
    };
  }

  /**
   * Setup production infrastructure
   */
  async setup() {
    try {
      console.log('🏗️  Setting up production infrastructure...');
      console.log('==========================================');

      // Setup environment configuration
      await this.setupEnvironmentConfig();

      // Configure load balancer
      await this.configureLoadBalancer();

      // Setup SSL/TLS
      await this.setupSSL();

      // Configure monitoring stack
      await this.setupMonitoringStack();

      // Setup logging
      await this.setupLogging();

      // Configure process management
      await this.setupProcessManagement();

      // Create deployment scripts
      await this.createDeploymentScripts();

      this.results.success = true;
      this.results.endTime = new Date();

      console.log('\n🎉 Production infrastructure setup completed!');

    } catch (error) {
      this.results.success = false;
      this.results.endTime = new Date();
      console.error('\n💥 Infrastructure setup failed:', error.message);
      throw error;
    }
  }

  /**
   * Setup environment configuration
   */
  async setupEnvironmentConfig() {
    console.log('\n⚙️  Setting up environment configuration...');

    // Create production environment file
    const prodEnv = `# AutoControl Pro - Production Environment Configuration

# Application Settings
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
API_VERSION=v1

# Security
JWT_SECRET=your-super-secure-jwt-secret-here
SESSION_SECRET=your-super-secure-session-secret-here
ENCRYPTION_KEY=your-32-character-encryption-key

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/autocontrol?retryWrites=true&w=majority
MONGODB_READONLY_URI=mongodb+srv://readonly:password@cluster.mongodb.net/autocontrol?readPreference=secondary

# Redis Cache
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0

# Email Service
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your-sendgrid-api-key
EMAIL_FROM=noreply@autocontrol.com
EMAIL_FROM_NAME=AutoControl Pro

# File Storage
STORAGE_PROVIDER=aws-s3
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=autocontrol-prod-files

# Monitoring
PROMETHEUS_ENABLED=true
GRAFANA_ENABLED=true
SENTRY_DSN=your-sentry-dsn

# External Services
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# CORS
CORS_ORIGIN=https://app.autocontrol.com,https://autocontrol.com
CORS_CREDENTIALS=true

# SSL/TLS
SSL_ENABLED=true
SSL_REDIRECT=true
HSTS_ENABLED=true`;

    await fs.writeFile('.env.production', prodEnv);

    // Create environment validation script
    const envValidator = `#!/usr/bin/env node
/**
 * Environment Variables Validator
 */
const requiredVars = [
  'NODE_ENV',
  'PORT',
  'JWT_SECRET',
  'SESSION_SECRET',
  'MONGODB_URI',
  'EMAIL_SERVICE',
  'SENDGRID_API_KEY'
];

const optionalVars = [
  'REDIS_HOST',
  'AWS_ACCESS_KEY_ID',
  'SENTRY_DSN',
  'STRIPE_SECRET_KEY'
];

function validateEnvironment() {
  console.log('🔍 Validating environment variables...');
  
  const missing = [];
  const warnings = [];
  
  // Check required variables
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  });
  
  // Check optional but recommended variables
  optionalVars.forEach(varName => {
    if (!process.env[varName]) {
      warnings.push(varName);
    }
  });
  
  // Report results
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(varName => console.error(\`   - \${varName}\`));
    process.exit(1);
  }
  
  if (warnings.length > 0) {
    console.warn('⚠️  Missing optional environment variables:');
    warnings.forEach(varName => console.warn(\`   - \${varName}\`));
  }
  
  // Validate JWT secret strength
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.error('❌ JWT_SECRET must be at least 32 characters long');
    process.exit(1);
  }
  
  console.log('✅ Environment validation passed');
}

if (require.main === module) {
  validateEnvironment();
}

module.exports = { validateEnvironment };`;

    await fs.writeFile('scripts/validate-env.js', envValidator);
    await execAsync('chmod +x scripts/validate-env.js');

    console.log('   ✅ Environment configuration created');
    console.log('   ✅ Environment validator created');

    this.results.components.environment = {
      status: 'completed',
      files: ['.env.production', 'scripts/validate-env.js']
    };
  }

  /**
   * Configure load balancer
   */
  async configureLoadBalancer() {
    console.log('\n⚖️  Configuring load balancer...');

    // Create Nginx configuration
    const nginxConfig = `# AutoControl Pro - Production Nginx Configuration

upstream autocontrol_backend {
    least_conn;
    server 127.0.0.1:3000 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3001 max_fails=3 fail_timeout=30s backup;
}

# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/s;

# SSL configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;

server {
    listen 80;
    server_name app.autocontrol.com autocontrol.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.autocontrol.com autocontrol.com;
    
    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/autocontrol.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/autocontrol.com/privkey.pem;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https:; frame-ancestors 'none';" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Static files
    location /static/ {
        alias /var/www/autocontrol/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://autocontrol_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Authentication endpoints with stricter rate limiting
    location /api/auth/ {
        limit_req zone=auth burst=10 nodelay;
        proxy_pass http://autocontrol_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
    
    # API endpoints
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://autocontrol_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
    
    # Frontend application
    location / {
        try_files $uri $uri/ /index.html;
        root /var/www/autocontrol/public;
        expires 1h;
        add_header Cache-Control "public";
    }
}`;

    await fs.mkdir('nginx', { recursive: true });
    await fs.writeFile('nginx/nginx.conf', nginxConfig);

    // Create load balancer health check script
    const healthCheckScript = `#!/bin/bash
# Load Balancer Health Check Script

BACKEND_SERVERS=("127.0.0.1:3000" "127.0.0.1:3001")
HEALTH_ENDPOINT="/api/monitoring/health"
TIMEOUT=5

check_server_health() {
    local server=$1
    local url="http://$server$HEALTH_ENDPOINT"
    
    if curl -f -s --max-time $TIMEOUT "$url" > /dev/null; then
        echo "✅ $server is healthy"
        return 0
    else
        echo "❌ $server is unhealthy"
        return 1
    fi
}

main() {
    echo "🔍 Checking backend server health..."
    
    healthy_servers=0
    total_servers=${#BACKEND_SERVERS[@]}
    
    for server in "${BACKEND_SERVERS[@]}"; do
        if check_server_health "$server"; then
            ((healthy_servers++))
        fi
    done
    
    echo "📊 Health check results: $healthy_servers/$total_servers servers healthy"
    
    if [ $healthy_servers -eq 0 ]; then
        echo "🚨 All servers are unhealthy!"
        exit 1
    elif [ $healthy_servers -lt $total_servers ]; then
        echo "⚠️  Some servers are unhealthy"
        exit 2
    else
        echo "✅ All servers are healthy"
        exit 0
    fi
}

main`;

    await fs.writeFile('scripts/health-check.sh', healthCheckScript);
    await execAsync('chmod +x scripts/health-check.sh');

    console.log('   ✅ Nginx configuration created');
    console.log('   ✅ Health check script created');

    this.results.components.loadBalancer = {
      status: 'completed',
      files: ['nginx/nginx.conf', 'scripts/health-check.sh']
    };
  }

  /**
   * Setup SSL/TLS
   */
  async setupSSL() {
    console.log('\n🔒 Setting up SSL/TLS...');

    // Create SSL setup script
    const sslSetupScript = `#!/bin/bash
# SSL Certificate Setup Script using Let's Encrypt

DOMAIN="autocontrol.com"
EMAIL="admin@autocontrol.com"
WEBROOT="/var/www/autocontrol/public"

setup_ssl() {
    echo "🔒 Setting up SSL certificates..."
    
    # Install certbot if not already installed
    if ! command -v certbot &> /dev/null; then
        echo "Installing certbot..."
        sudo apt-get update
        sudo apt-get install -y certbot python3-certbot-nginx
    fi
    
    # Stop nginx temporarily
    sudo systemctl stop nginx
    
    # Obtain SSL certificate
    sudo certbot certonly --standalone \\
        --email "$EMAIL" \\
        --agree-tos \\
        --no-eff-email \\
        -d "$DOMAIN" \\
        -d "www.$DOMAIN" \\
        -d "app.$DOMAIN"
    
    # Start nginx
    sudo systemctl start nginx
    
    # Setup auto-renewal
    echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
    
    echo "✅ SSL certificates configured"
}

# SSL security test
test_ssl() {
    echo "🔍 Testing SSL configuration..."
    
    # Test SSL certificate
    echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | openssl x509 -noout -dates
    
    # Test SSL rating (requires external service)
    echo "💡 Test your SSL configuration at: https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"
}

case "${1:-setup}" in
    setup)
        setup_ssl
        ;;
    test)
        test_ssl
        ;;
    renew)
        sudo certbot renew
        ;;
    *)
        echo "Usage: $0 {setup|test|renew}"
        exit 1
        ;;
esac`;

    await fs.writeFile('scripts/setup-ssl.sh', sslSetupScript);
    await execAsync('chmod +x scripts/setup-ssl.sh');

    // Create SSL configuration
    const sslConfig = {
      enabled: true,
      provider: 'letsencrypt',
      domains: ['autocontrol.com', 'www.autocontrol.com', 'app.autocontrol.com'],
      autoRenewal: true,
      securityHeaders: {
        hsts: true,
        hstsMaxAge: 31536000,
        hstsIncludeSubdomains: true,
        frameOptions: 'DENY',
        contentTypeOptions: 'nosniff',
        xssProtection: '1; mode=block'
      }
    };

    await fs.writeFile('config/ssl-config.json', JSON.stringify(sslConfig, null, 2));

    console.log('   ✅ SSL setup script created');
    console.log('   ✅ SSL configuration created');

    this.results.components.ssl = {
      status: 'completed',
      files: ['scripts/setup-ssl.sh', 'config/ssl-config.json']
    };
  }

  /**
   * Setup monitoring stack
   */
  async setupMonitoringStack() {
    console.log('\n📊 Setting up monitoring stack...');

    // Create Docker Compose for monitoring
    const monitoringCompose = `version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./monitoring/alert_rules.yml:/etc/prometheus/alert_rules.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3001:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/provisioning:/etc/grafana/provisioning
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=\${GRAFANA_PASSWORD}
      - GF_USERS_ALLOW_SIGN_UP=false
    restart: unless-stopped

  alertmanager:
    image: prom/alertmanager:latest
    container_name: alertmanager
    ports:
      - "9093:9093"
    volumes:
      - ./monitoring/alertmanager.yml:/etc/alertmanager/alertmanager.yml
      - alertmanager_data:/alertmanager
    restart: unless-stopped

  node-exporter:
    image: prom/node-exporter:latest
    container_name: node-exporter
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.rootfs=/rootfs'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
    restart: unless-stopped

  mongodb-exporter:
    image: percona/mongodb_exporter:latest
    container_name: mongodb-exporter
    ports:
      - "9216:9216"
    environment:
      - MONGODB_URI=\${MONGODB_MONITOR_URI}
    restart: unless-stopped

volumes:
  prometheus_data:
  grafana_data:
  alertmanager_data:`;

    await fs.mkdir('monitoring', { recursive: true });
    await fs.writeFile('docker-compose.monitoring.yml', monitoringCompose);

    // Create monitoring startup script
    const monitoringScript = `#!/bin/bash
# Monitoring Stack Management Script

COMPOSE_FILE="docker-compose.monitoring.yml"

start_monitoring() {
    echo "🚀 Starting monitoring stack..."
    docker-compose -f $COMPOSE_FILE up -d
    echo "✅ Monitoring stack started"
    echo "📊 Grafana: http://localhost:3001"
    echo "📈 Prometheus: http://localhost:9090"
    echo "🚨 Alertmanager: http://localhost:9093"
}

stop_monitoring() {
    echo "🛑 Stopping monitoring stack..."
    docker-compose -f $COMPOSE_FILE down
    echo "✅ Monitoring stack stopped"
}

status_monitoring() {
    echo "📊 Monitoring stack status:"
    docker-compose -f $COMPOSE_FILE ps
}

logs_monitoring() {
    local service=\${1:-}
    if [ -n "$service" ]; then
        docker-compose -f $COMPOSE_FILE logs -f "$service"
    else
        docker-compose -f $COMPOSE_FILE logs -f
    fi
}

case "${1:-start}" in
    start)
        start_monitoring
        ;;
    stop)
        stop_monitoring
        ;;
    restart)
        stop_monitoring
        sleep 5
        start_monitoring
        ;;
    status)
        status_monitoring
        ;;
    logs)
        logs_monitoring "\$2"
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs [service]}"
        exit 1
        ;;
esac`;

    await fs.writeFile('scripts/monitoring.sh', monitoringScript);
    await execAsync('chmod +x scripts/monitoring.sh');

    console.log('   ✅ Monitoring Docker Compose created');
    console.log('   ✅ Monitoring management script created');

    this.results.components.monitoring = {
      status: 'completed',
      services: ['prometheus', 'grafana', 'alertmanager', 'node-exporter', 'mongodb-exporter'],
      files: ['docker-compose.monitoring.yml', 'scripts/monitoring.sh']
    };
  }

  /**
   * Setup logging
   */
  async setupLogging() {
    console.log('\n📝 Setting up logging...');

    // Create logging configuration
    const loggingConfig = {
      level: 'info',
      format: 'json',
      transports: {
        console: {
          enabled: true,
          level: 'info',
          colorize: true
        },
        file: {
          enabled: true,
          level: 'info',
          filename: 'logs/app.log',
          maxsize: '10MB',
          maxFiles: 10,
          rotate: true
        },
        error: {
          enabled: true,
          level: 'error',
          filename: 'logs/error.log',
          maxsize: '10MB',
          maxFiles: 5
        }
      },
      logRotation: {
        enabled: true,
        frequency: 'daily',
        retention: '30d'
      }
    };

    await fs.mkdir('logs', { recursive: true });
    await fs.writeFile('config/logging-config.json', JSON.stringify(loggingConfig, null, 2));

    // Create log rotation script
    const logRotationScript = `#!/bin/bash
# Log Rotation Script

LOG_DIR="/var/log/autocontrol"
RETENTION_DAYS=30

rotate_logs() {
    echo "🔄 Rotating application logs..."
    
    # Create log directory if it doesn't exist
    mkdir -p "$LOG_DIR"
    
    # Rotate application logs
    if [ -f "$LOG_DIR/app.log" ]; then
        mv "$LOG_DIR/app.log" "$LOG_DIR/app.log.$(date +%Y%m%d-%H%M%S)"
        touch "$LOG_DIR/app.log"
        chown autocontrol:autocontrol "$LOG_DIR/app.log"
    fi
    
    # Rotate error logs
    if [ -f "$LOG_DIR/error.log" ]; then
        mv "$LOG_DIR/error.log" "$LOG_DIR/error.log.$(date +%Y%m%d-%H%M%S)"
        touch "$LOG_DIR/error.log"
        chown autocontrol:autocontrol "$LOG_DIR/error.log"
    fi
    
    # Compress old logs
    find "$LOG_DIR" -name "*.log.*" -mtime +1 -exec gzip {} \\;
    
    # Remove old logs
    find "$LOG_DIR" -name "*.log.*.gz" -mtime +$RETENTION_DAYS -delete
    
    # Send HUP signal to application to reopen log files
    pkill -HUP -f "node.*server.js" || true
    
    echo "✅ Log rotation completed"
}

# Setup logrotate configuration
setup_logrotate() {
    cat > /etc/logrotate.d/autocontrol << EOF
$LOG_DIR/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 autocontrol autocontrol
    postrotate
        pkill -HUP -f "node.*server.js" || true
    endscript
}
EOF
    echo "✅ Logrotate configuration created"
}

case "${1:-rotate}" in
    rotate)
        rotate_logs
        ;;
    setup)
        setup_logrotate
        ;;
    *)
        echo "Usage: $0 {rotate|setup}"
        exit 1
        ;;
esac`;

    await fs.writeFile('scripts/log-rotation.sh', logRotationScript);
    await execAsync('chmod +x scripts/log-rotation.sh');

    console.log('   ✅ Logging configuration created');
    console.log('   ✅ Log rotation script created');

    this.results.components.logging = {
      status: 'completed',
      files: ['config/logging-config.json', 'scripts/log-rotation.sh']
    };
  }

  /**
   * Setup process management
   */
  async setupProcessManagement() {
    console.log('\n⚙️  Setting up process management...');

    // Create PM2 ecosystem configuration
    const pm2Config = {
      apps: [
        {
          name: 'autocontrol-prod',
          script: 'server.js',
          cwd: '/var/www/autocontrol',
          instances: 'max',
          exec_mode: 'cluster',
          env: {
            NODE_ENV: 'production',
            PORT: 3000
          },
          error_file: '/var/log/autocontrol/pm2-error.log',
          out_file: '/var/log/autocontrol/pm2-out.log',
          log_file: '/var/log/autocontrol/pm2-combined.log',
          time: true,
          max_memory_restart: '1G',
          node_args: '--max-old-space-size=1024',
          watch: false,
          ignore_watch: ['node_modules', 'logs', '.git'],
          max_restarts: 10,
          min_uptime: '10s',
          kill_timeout: 5000,
          wait_ready: true,
          listen_timeout: 10000
        }
      ]
    };

    await fs.writeFile('ecosystem.config.js', `module.exports = ${JSON.stringify(pm2Config, null, 2)};`);

    // Create process management script
    const processScript = `#!/bin/bash
# Process Management Script

PM2_CONFIG="ecosystem.config.js"
APP_NAME="autocontrol-prod"

start_app() {
    echo "🚀 Starting application..."
    pm2 start $PM2_CONFIG
    pm2 save
    echo "✅ Application started"
}

stop_app() {
    echo "🛑 Stopping application..."
    pm2 stop $APP_NAME
    echo "✅ Application stopped"
}

restart_app() {
    echo "🔄 Restarting application..."
    pm2 restart $APP_NAME
    echo "✅ Application restarted"
}

reload_app() {
    echo "🔄 Reloading application (zero-downtime)..."
    pm2 reload $APP_NAME
    echo "✅ Application reloaded"
}

status_app() {
    echo "📊 Application status:"
    pm2 status
    pm2 monit
}

logs_app() {
    echo "📝 Application logs:"
    pm2 logs $APP_NAME --lines 100
}

setup_startup() {
    echo "⚙️  Setting up PM2 startup script..."
    pm2 startup
    echo "✅ PM2 startup configured"
}

case "${1:-status}" in
    start)
        start_app
        ;;
    stop)
        stop_app
        ;;
    restart)
        restart_app
        ;;
    reload)
        reload_app
        ;;
    status)
        status_app
        ;;
    logs)
        logs_app
        ;;
    setup)
        setup_startup
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|reload|status|logs|setup}"
        exit 1
        ;;
esac`;

    await fs.writeFile('scripts/process-management.sh', processScript);
    await execAsync('chmod +x scripts/process-management.sh');

    console.log('   ✅ PM2 ecosystem configuration created');
    console.log('   ✅ Process management script created');

    this.results.components.processManagement = {
      status: 'completed',
      files: ['ecosystem.config.js', 'scripts/process-management.sh']
    };
  }

  /**
   * Create deployment scripts
   */
  async createDeploymentScripts() {
    console.log('\n🚀 Creating deployment scripts...');

    // Create main deployment script
    const deployScript = `#!/bin/bash
# Production Deployment Script

set -e

# Configuration
APP_DIR="/var/www/autocontrol"
BACKUP_DIR="/var/backups/autocontrol"
GIT_REPO="https://github.com/your-username/autocontrol.git"
BRANCH="main"

# Colors
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
NC='\\033[0m'

log() {
    echo -e "\${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1\${NC}"
}

warn() {
    echo -e "\${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1\${NC}"
}

error() {
    echo -e "\${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1\${NC}"
    exit 1
}

# Pre-deployment checks
pre_deployment_checks() {
    log "Running pre-deployment checks..."
    
    # Check if required services are running
    if ! systemctl is-active --quiet nginx; then
        error "Nginx is not running"
    fi
    
    if ! systemctl is-active --quiet mongodb; then
        warn "MongoDB service not found (using Atlas?)"
    fi
    
    # Check disk space
    DISK_USAGE=\$(df / | awk 'NR==2 {print \$5}' | sed 's/%//')
    if [ \$DISK_USAGE -gt 80 ]; then
        warn "Disk usage is above 80%: \${DISK_USAGE}%"
    fi
    
    # Check memory
    MEMORY_USAGE=\$(free | awk 'NR==2{printf "%.0f", \$3*100/\$2}')
    if [ \$MEMORY_USAGE -gt 80 ]; then
        warn "Memory usage is above 80%: \${MEMORY_USAGE}%"
    fi
    
    log "Pre-deployment checks completed"
}

# Backup current deployment
backup_current() {
    log "Creating backup of current deployment..."
    
    mkdir -p "\$BACKUP_DIR"
    BACKUP_NAME="backup-\$(date +%Y%m%d-%H%M%S)"
    
    if [ -d "\$APP_DIR" ]; then
        tar -czf "\$BACKUP_DIR/\$BACKUP_NAME.tar.gz" -C "\$APP_DIR" .
        log "Backup created: \$BACKUP_DIR/\$BACKUP_NAME.tar.gz"
    else
        warn "Application directory not found, skipping backup"
    fi
}

# Deploy application
deploy_application() {
    log "Deploying application..."
    
    # Create application directory
    mkdir -p "\$APP_DIR"
    cd "\$APP_DIR"
    
    # Clone or update repository
    if [ -d ".git" ]; then
        log "Updating existing repository..."
        git fetch origin
        git reset --hard origin/\$BRANCH
    else
        log "Cloning repository..."
        git clone -b \$BRANCH "\$GIT_REPO" .
    fi
    
    # Install dependencies
    log "Installing dependencies..."
    npm ci --production
    
    # Build application
    log "Building application..."
    npm run build
    
    # Set permissions
    chown -R autocontrol:autocontrol "\$APP_DIR"
    chmod -R 755 "\$APP_DIR"
    
    log "Application deployed successfully"
}

# Update configuration
update_configuration() {
    log "Updating configuration..."
    
    # Copy production environment file
    if [ -f ".env.production" ]; then
        cp .env.production .env
        log "Production environment configured"
    else
        warn "Production environment file not found"
    fi
    
    # Validate environment
    node scripts/validate-env.js
    
    log "Configuration updated"
}

# Database migration
run_migrations() {
    log "Running database migrations..."
    
    # Run any pending migrations
    if [ -f "scripts/migrate.js" ]; then
        node scripts/migrate.js
        log "Database migrations completed"
    else
        log "No migration script found, skipping"
    fi
}

# Start services
start_services() {
    log "Starting services..."
    
    # Reload PM2 configuration
    pm2 delete autocontrol-prod || true
    pm2 start ecosystem.config.js
    pm2 save
    
    # Reload Nginx
    nginx -t && systemctl reload nginx
    
    log "Services started successfully"
}

# Health check
health_check() {
    log "Performing health check..."
    
    # Wait for application to start
    sleep 10
    
    # Check application health
    if curl -f -s http://localhost:3000/api/monitoring/health > /dev/null; then
        log "Application health check passed"
    else
        error "Application health check failed"
    fi
    
    # Check external health
    if curl -f -s https://app.autocontrol.com/api/monitoring/health > /dev/null; then
        log "External health check passed"
    else
        warn "External health check failed (DNS/SSL issue?)"
    fi
}

# Main deployment function
main() {
    log "Starting production deployment..."
    
    pre_deployment_checks
    backup_current
    deploy_application
    update_configuration
    run_migrations
    start_services
    health_check
    
    log "🎉 Deployment completed successfully!"
}

# Handle script arguments
case "\${1:-deploy}" in
    deploy)
        main
        ;;
    backup)
        backup_current
        ;;
    health)
        health_check
        ;;
    *)
        echo "Usage: \$0 {deploy|backup|health}"
        exit 1
        ;;
esac`;

    await fs.writeFile('scripts/deploy-production.sh', deployScript);
    await execAsync('chmod +x scripts/deploy-production.sh');

    console.log('   ✅ Production deployment script created');

    this.results.components.deployment = {
      status: 'completed',
      files: ['scripts/deploy-production.sh']
    };
  }

  /**
   * Get setup summary
   */
  getSetupSummary() {
    const components = Object.keys(this.results.components).length;
    const duration = this.results.endTime - this.results.startTime;

    return {
      success: this.results.success,
      duration: Math.round(duration / 1000),
      components,
      details: this.results.components
    };
  }
}

/**
 * Run production infrastructure setup
 */
async function setupProductionInfrastructure() {
  try {
    const setup = new ProductionInfrastructureSetup();
    await setup.setup();
    
    const summary = setup.getSetupSummary();
    
    console.log('\n📊 Infrastructure Setup Summary:');
    console.log('=================================');
    console.log(`Success: ${summary.success ? 'YES' : 'NO'}`);
    console.log(`Duration: ${summary.duration}s`);
    console.log(`Components: ${summary.components}`);

    return setup.results;
  } catch (error) {
    console.error('❌ Production infrastructure setup failed:', error);
    throw error;
  }
}

// Run setup if called directly
if (require.main === module) {
  setupProductionInfrastructure()
    .then(() => {
      console.log('\n🎉 Production infrastructure setup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Production infrastructure setup failed:', error.message);
      process.exit(1);
    });
}

module.exports = {
  ProductionInfrastructureSetup,
  setupProductionInfrastructure,
  INFRA_CONFIG
};