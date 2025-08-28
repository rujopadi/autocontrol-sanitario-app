#!/usr/bin/env node

/**
 * Production Environment Setup Script
 * Configures environment variables, secrets, and production settings
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

class ProductionEnvironmentSetup {
  constructor() {
    this.envPath = path.join(__dirname, '../.env.production');
    this.templatePath = path.join(__dirname, '../.env.production.template');
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async question(prompt) {
    return new Promise((resolve) => {
      this.rl.question(prompt, resolve);
    });
  }

  generateSecureSecret(length = 64) {
    return crypto.randomBytes(length).toString('hex');
  }

  async createProductionTemplate() {
    const template = `# Production Environment Configuration
# Generated on ${new Date().toISOString()}

# Application Settings
NODE_ENV=production
PORT=5000
APP_NAME=AutoControl Pro
APP_VERSION=1.0.0

# Database Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/autocontrol-pro?retryWrites=true&w=majority
MONGODB_OPTIONS={"maxPoolSize":10,"serverSelectionTimeoutMS":5000,"socketTimeoutMS":45000}

# Security Configuration
JWT_SECRET=REPLACE_WITH_SECURE_SECRET
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

# Email Service Configuration (SendGrid)
SENDGRID_API_KEY=your_sendgrid_api_key_here
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=AutoControl Pro

# SMTP Configuration (Alternative to SendGrid)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Domain and CORS Configuration
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://api.yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# SSL/TLS Configuration
SSL_CERT_PATH=/etc/ssl/certs/yourdomain.crt
SSL_KEY_PATH=/etc/ssl/private/yourdomain.key
FORCE_HTTPS=true

# Rate Limiting Configuration
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS=true

# Session Configuration
SESSION_SECRET=REPLACE_WITH_SECURE_SESSION_SECRET
SESSION_MAX_AGE=86400000
COOKIE_SECURE=true
COOKIE_SAME_SITE=strict

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=/var/uploads/autocontrol-pro
ALLOWED_FILE_TYPES=pdf,jpg,jpeg,png,csv,xlsx

# Logging Configuration
LOG_LEVEL=info
LOG_FILE_PATH=/var/log/autocontrol-pro
LOG_MAX_SIZE=10m
LOG_MAX_FILES=5

# Monitoring and Analytics
ENABLE_MONITORING=true
MONITORING_ENDPOINT=/health
ANALYTICS_ENABLED=true

# Backup Configuration
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30
BACKUP_ENCRYPTION_KEY=REPLACE_WITH_BACKUP_ENCRYPTION_KEY

# External Services
REDIS_URL=redis://localhost:6379
ELASTICSEARCH_URL=http://localhost:9200

# Security Headers
HELMET_ENABLED=true
CONTENT_SECURITY_POLICY=default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'

# Performance Configuration
COMPRESSION_ENABLED=true
CACHE_TTL=3600
STATIC_CACHE_MAX_AGE=31536000

# Error Tracking (Optional - Sentry)
SENTRY_DSN=your_sentry_dsn_here
SENTRY_ENVIRONMENT=production

# Health Check Configuration
HEALTH_CHECK_ENABLED=true
HEALTH_CHECK_TIMEOUT=5000
DATABASE_HEALTH_CHECK=true

# Maintenance Mode
MAINTENANCE_MODE=false
MAINTENANCE_MESSAGE=System is under maintenance. Please try again later.

# Feature Flags
ENABLE_REGISTRATION=true
ENABLE_EMAIL_VERIFICATION=true
ENABLE_PASSWORD_RESET=true
ENABLE_AUDIT_LOGGING=true
ENABLE_RATE_LIMITING=true

# Organization Limits
MAX_USERS_PER_ORG=100
MAX_STORAGE_RECORDS_PER_ORG=10000
MAX_DELIVERY_RECORDS_PER_ORG=5000

# API Configuration
API_VERSION=v1
API_PREFIX=/api
ENABLE_API_DOCS=false
API_DOCS_PATH=/docs

# Timezone Configuration
TZ=UTC
DEFAULT_LOCALE=es-ES

# Development/Debug (Should be false in production)
DEBUG=false
VERBOSE_LOGGING=false
ENABLE_CORS_DEBUG=false
`;

    await fs.writeFile(this.templatePath, template);
    console.log(`✅ Production template created at: ${this.templatePath}`);
  }

  async setupInteractiveConfiguration() {
    console.log('🚀 AutoControl Pro - Production Environment Setup');
    console.log('================================================\n');

    const config = {};

    // Basic Application Settings
    console.log('📋 Basic Application Settings:');
    config.APP_NAME = await this.question('Application Name [AutoControl Pro]: ') || 'AutoControl Pro';
    config.PORT = await this.question('Port [5000]: ') || '5000';
    
    // Domain Configuration
    console.log('\\n🌐 Domain Configuration:');
    config.FRONTEND_URL = await this.question('Frontend URL (https://yourdomain.com): ');
    config.BACKEND_URL = await this.question('Backend URL (https://api.yourdomain.com): ');
    
    if (!config.FRONTEND_URL || !config.BACKEND_URL) {
      console.log('❌ Frontend and Backend URLs are required for production');
      process.exit(1);
    }

    // Database Configuration
    console.log('\\n🗄️ Database Configuration:');
    config.MONGODB_URI = await this.question('MongoDB URI: ');
    
    if (!config.MONGODB_URI) {
      console.log('❌ MongoDB URI is required');
      process.exit(1);
    }

    // Security Configuration
    console.log('\\n🔒 Security Configuration:');
    const generateSecrets = await this.question('Generate secure secrets automatically? [Y/n]: ');
    
    if (generateSecrets.toLowerCase() !== 'n') {
      config.JWT_SECRET = this.generateSecureSecret(64);
      config.SESSION_SECRET = this.generateSecureSecret(64);
      config.BACKUP_ENCRYPTION_KEY = this.generateSecureSecret(32);
      console.log('✅ Secure secrets generated automatically');
    } else {
      config.JWT_SECRET = await this.question('JWT Secret (leave empty to generate): ') || this.generateSecureSecret(64);
      config.SESSION_SECRET = await this.question('Session Secret (leave empty to generate): ') || this.generateSecureSecret(64);
      config.BACKUP_ENCRYPTION_KEY = await this.question('Backup Encryption Key (leave empty to generate): ') || this.generateSecureSecret(32);
    }

    // Email Configuration
    console.log('\\n📧 Email Configuration:');
    const emailProvider = await this.question('Email provider (sendgrid/smtp) [sendgrid]: ') || 'sendgrid';
    
    if (emailProvider === 'sendgrid') {
      config.SENDGRID_API_KEY = await this.question('SendGrid API Key: ');
      config.FROM_EMAIL = await this.question('From Email: ');
      config.FROM_NAME = config.APP_NAME;
    } else {
      config.SMTP_HOST = await this.question('SMTP Host: ');
      config.SMTP_PORT = await this.question('SMTP Port [587]: ') || '587';
      config.SMTP_USER = await this.question('SMTP User: ');
      config.SMTP_PASS = await this.question('SMTP Password: ');
      config.FROM_EMAIL = config.SMTP_USER;
      config.FROM_NAME = config.APP_NAME;
    }

    // SSL Configuration
    console.log('\\n🔐 SSL Configuration:');
    const sslEnabled = await this.question('Enable SSL/HTTPS? [Y/n]: ');
    
    if (sslEnabled.toLowerCase() !== 'n') {
      config.FORCE_HTTPS = 'true';
      config.SSL_CERT_PATH = await this.question('SSL Certificate Path [/etc/ssl/certs/cert.pem]: ') || '/etc/ssl/certs/cert.pem';
      config.SSL_KEY_PATH = await this.question('SSL Private Key Path [/etc/ssl/private/key.pem]: ') || '/etc/ssl/private/key.pem';
    } else {
      config.FORCE_HTTPS = 'false';
    }

    return config;
  }

  async generateProductionEnv(config) {
    const envContent = `# Production Environment Configuration
# Generated on ${new Date().toISOString()}
# DO NOT COMMIT THIS FILE TO VERSION CONTROL

# Application Settings
NODE_ENV=production
PORT=${config.PORT}
APP_NAME=${config.APP_NAME}
APP_VERSION=1.0.0

# Database Configuration
MONGODB_URI=${config.MONGODB_URI}
MONGODB_OPTIONS={"maxPoolSize":10,"serverSelectionTimeoutMS":5000,"socketTimeoutMS":45000}

# Security Configuration
JWT_SECRET=${config.JWT_SECRET}
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

# Session Configuration
SESSION_SECRET=${config.SESSION_SECRET}
SESSION_MAX_AGE=86400000
COOKIE_SECURE=${config.FORCE_HTTPS}
COOKIE_SAME_SITE=strict

# Email Configuration
${config.SENDGRID_API_KEY ? `SENDGRID_API_KEY=${config.SENDGRID_API_KEY}` : ''}
${config.SMTP_HOST ? `SMTP_HOST=${config.SMTP_HOST}` : ''}
${config.SMTP_PORT ? `SMTP_PORT=${config.SMTP_PORT}` : ''}
${config.SMTP_USER ? `SMTP_USER=${config.SMTP_USER}` : ''}
${config.SMTP_PASS ? `SMTP_PASS=${config.SMTP_PASS}` : ''}
FROM_EMAIL=${config.FROM_EMAIL}
FROM_NAME=${config.FROM_NAME}

# Domain and CORS Configuration
FRONTEND_URL=${config.FRONTEND_URL}
BACKEND_URL=${config.BACKEND_URL}
ALLOWED_ORIGINS=${config.FRONTEND_URL},${config.FRONTEND_URL.replace('https://', 'https://www.')}

# SSL/TLS Configuration
${config.SSL_CERT_PATH ? `SSL_CERT_PATH=${config.SSL_CERT_PATH}` : ''}
${config.SSL_KEY_PATH ? `SSL_KEY_PATH=${config.SSL_KEY_PATH}` : ''}
FORCE_HTTPS=${config.FORCE_HTTPS}

# Rate Limiting Configuration
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS=true

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=/var/uploads/autocontrol-pro
ALLOWED_FILE_TYPES=pdf,jpg,jpeg,png,csv,xlsx

# Logging Configuration
LOG_LEVEL=info
LOG_FILE_PATH=/var/log/autocontrol-pro
LOG_MAX_SIZE=10m
LOG_MAX_FILES=5

# Monitoring and Analytics
ENABLE_MONITORING=true
MONITORING_ENDPOINT=/health
ANALYTICS_ENABLED=true

# Backup Configuration
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30
BACKUP_ENCRYPTION_KEY=${config.BACKUP_ENCRYPTION_KEY}

# Security Headers
HELMET_ENABLED=true
CONTENT_SECURITY_POLICY=default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'

# Performance Configuration
COMPRESSION_ENABLED=true
CACHE_TTL=3600
STATIC_CACHE_MAX_AGE=31536000

# Health Check Configuration
HEALTH_CHECK_ENABLED=true
HEALTH_CHECK_TIMEOUT=5000
DATABASE_HEALTH_CHECK=true

# Feature Flags
ENABLE_REGISTRATION=true
ENABLE_EMAIL_VERIFICATION=true
ENABLE_PASSWORD_RESET=true
ENABLE_AUDIT_LOGGING=true
ENABLE_RATE_LIMITING=true

# Organization Limits
MAX_USERS_PER_ORG=100
MAX_STORAGE_RECORDS_PER_ORG=10000
MAX_DELIVERY_RECORDS_PER_ORG=5000

# API Configuration
API_VERSION=v1
API_PREFIX=/api
ENABLE_API_DOCS=false

# Timezone Configuration
TZ=UTC
DEFAULT_LOCALE=es-ES

# Production Settings
DEBUG=false
VERBOSE_LOGGING=false
MAINTENANCE_MODE=false
`;

    await fs.writeFile(this.envPath, envContent);
    console.log(`\\n✅ Production environment file created at: ${this.envPath}`);
  }

  async setupSystemdService() {
    const serviceName = 'autocontrol-pro';
    const serviceContent = `[Unit]
Description=AutoControl Pro - Food Safety Management System
After=network.target mongod.service
Wants=mongod.service

[Service]
Type=simple
User=autocontrol
Group=autocontrol
WorkingDirectory=/opt/autocontrol-pro/backend
Environment=NODE_ENV=production
EnvironmentFile=/opt/autocontrol-pro/backend/.env.production
ExecStart=/usr/bin/node server.js
ExecReload=/bin/kill -HUP $MAINPID
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=autocontrol-pro

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/log/autocontrol-pro /var/uploads/autocontrol-pro

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
`;

    const servicePath = path.join(__dirname, '../autocontrol-pro.service');
    await fs.writeFile(servicePath, serviceContent);
    console.log(`✅ Systemd service file created at: ${servicePath}`);
    
    console.log('\\n📋 To install the service:');
    console.log('sudo cp autocontrol-pro.service /etc/systemd/system/');
    console.log('sudo systemctl daemon-reload');
    console.log('sudo systemctl enable autocontrol-pro');
    console.log('sudo systemctl start autocontrol-pro');
  }

  async setupNginxConfig() {
    const nginxConfig = `# AutoControl Pro - Nginx Configuration
# Place this file in /etc/nginx/sites-available/autocontrol-pro
# Then create symlink: sudo ln -s /etc/nginx/sites-available/autocontrol-pro /etc/nginx/sites-enabled/

# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/s;

# Upstream backend
upstream autocontrol_backend {
    server 127.0.0.1:5000;
    keepalive 32;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# Frontend (HTTPS)
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/ssl/certs/yourdomain.crt;
    ssl_certificate_key /etc/ssl/private/yourdomain.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;" always;

    # Document root
    root /opt/autocontrol-pro/frontend/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Static files caching
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Frontend routing (SPA)
    location / {
        try_files $uri $uri/ /index.html;
        
        # Security headers for HTML files
        location ~* \\.html$ {
            add_header Cache-Control "no-cache, no-store, must-revalidate";
            add_header Pragma "no-cache";
            add_header Expires "0";
        }
    }

    # Health check
    location /health {
        access_log off;
        return 200 "healthy\\n";
        add_header Content-Type text/plain;
    }
}

# Backend API (HTTPS)
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    # SSL Configuration (same as frontend)
    ssl_certificate /etc/ssl/certs/yourdomain.crt;
    ssl_certificate_key /etc/ssl/private/yourdomain.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Request size limits
    client_max_body_size 10M;

    # Proxy settings
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Connection "";
    proxy_http_version 1.1;

    # API endpoints with rate limiting
    location /api/auth {
        limit_req zone=auth burst=10 nodelay;
        proxy_pass http://autocontrol_backend;
    }

    location /api {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://autocontrol_backend;
    }

    # Health check (no rate limiting)
    location /health {
        access_log off;
        proxy_pass http://autocontrol_backend;
    }

    # Monitoring endpoint (restrict access)
    location /monitoring {
        allow 127.0.0.1;
        allow 10.0.0.0/8;
        allow 172.16.0.0/12;
        allow 192.168.0.0/16;
        deny all;
        proxy_pass http://autocontrol_backend;
    }
}
`;

    const nginxPath = path.join(__dirname, '../nginx/autocontrol-pro.conf');
    await fs.mkdir(path.dirname(nginxPath), { recursive: true });
    await fs.writeFile(nginxPath, nginxConfig);
    console.log(`✅ Nginx configuration created at: ${nginxPath}`);
    
    console.log('\\n📋 To install Nginx configuration:');
    console.log('sudo cp nginx/autocontrol-pro.conf /etc/nginx/sites-available/');
    console.log('sudo ln -s /etc/nginx/sites-available/autocontrol-pro /etc/nginx/sites-enabled/');
    console.log('sudo nginx -t');
    console.log('sudo systemctl reload nginx');
  }

  async setupLogRotation() {
    const logrotateConfig = `# AutoControl Pro Log Rotation
# Place this file in /etc/logrotate.d/autocontrol-pro

/var/log/autocontrol-pro/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0644 autocontrol autocontrol
    postrotate
        systemctl reload autocontrol-pro > /dev/null 2>&1 || true
    endscript
}

# System logs for AutoControl Pro
/var/log/syslog {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    postrotate
        /usr/lib/rsyslog/rsyslog-rotate
    endscript
}
`;

    const logrotateDir = path.join(__dirname, '../config');
    await fs.mkdir(logrotateDir, { recursive: true });
    const logrotatePath = path.join(logrotateDir, 'logrotate-autocontrol-pro');
    await fs.writeFile(logrotatePath, logrotateConfig);
    console.log(`✅ Logrotate configuration created at: ${logrotatePath}`);
    
    console.log('\\n📋 To install logrotate configuration:');
    console.log('sudo cp config/logrotate-autocontrol-pro /etc/logrotate.d/autocontrol-pro');
    console.log('sudo logrotate -d /etc/logrotate.d/autocontrol-pro  # Test configuration');
  }

  async createDeploymentScript() {
    const deployScript = `#!/bin/bash

# AutoControl Pro - Production Deployment Script
# This script automates the deployment process

set -e  # Exit on any error

echo "🚀 AutoControl Pro - Production Deployment"
echo "=========================================="

# Configuration
APP_NAME="autocontrol-pro"
APP_DIR="/opt/autocontrol-pro"
BACKUP_DIR="/opt/backups/autocontrol-pro"
SERVICE_NAME="autocontrol-pro"
NGINX_CONFIG="autocontrol-pro"

# Colors for output
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
NC='\\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   log_error "This script should not be run as root for security reasons"
   exit 1
fi

# Check if required commands exist
command -v node >/dev/null 2>&1 || { log_error "Node.js is required but not installed. Aborting."; exit 1; }
command -v npm >/dev/null 2>&1 || { log_error "npm is required but not installed. Aborting."; exit 1; }
command -v git >/dev/null 2>&1 || { log_error "git is required but not installed. Aborting."; exit 1; }

# Create backup
log_info "Creating backup..."
BACKUP_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
sudo mkdir -p "$BACKUP_DIR"
if [ -d "$APP_DIR" ]; then
    sudo tar -czf "$BACKUP_DIR/backup_$BACKUP_TIMESTAMP.tar.gz" -C "$APP_DIR" . 2>/dev/null || log_warn "Backup creation failed"
    log_info "Backup created: $BACKUP_DIR/backup_$BACKUP_TIMESTAMP.tar.gz"
fi

# Stop the service
log_info "Stopping $SERVICE_NAME service..."
sudo systemctl stop $SERVICE_NAME 2>/dev/null || log_warn "Service was not running"

# Create application directory
log_info "Setting up application directory..."
sudo mkdir -p "$APP_DIR"
sudo chown -R $USER:$USER "$APP_DIR"

# Clone or update repository
if [ -d "$APP_DIR/.git" ]; then
    log_info "Updating existing repository..."
    cd "$APP_DIR"
    git fetch origin
    git reset --hard origin/main
else
    log_info "Cloning repository..."
    git clone https://github.com/yourusername/autocontrol-pro.git "$APP_DIR"
    cd "$APP_DIR"
fi

# Install backend dependencies
log_info "Installing backend dependencies..."
cd "$APP_DIR/backend"
npm ci --production

# Build frontend
log_info "Building frontend..."
cd "$APP_DIR/frontend"
npm ci
npm run build

# Set up environment file
if [ ! -f "$APP_DIR/backend/.env.production" ]; then
    log_warn "Production environment file not found. Please run setup-production-environment.js first."
    exit 1
fi

# Set up directories and permissions
log_info "Setting up directories and permissions..."
sudo mkdir -p /var/log/autocontrol-pro
sudo mkdir -p /var/uploads/autocontrol-pro
sudo chown -R autocontrol:autocontrol /var/log/autocontrol-pro
sudo chown -R autocontrol:autocontrol /var/uploads/autocontrol-pro
sudo chmod 755 /var/log/autocontrol-pro
sudo chmod 755 /var/uploads/autocontrol-pro

# Install systemd service
if [ -f "$APP_DIR/backend/autocontrol-pro.service" ]; then
    log_info "Installing systemd service..."
    sudo cp "$APP_DIR/backend/autocontrol-pro.service" /etc/systemd/system/
    sudo systemctl daemon-reload
    sudo systemctl enable $SERVICE_NAME
fi

# Install nginx configuration
if [ -f "$APP_DIR/backend/nginx/autocontrol-pro.conf" ]; then
    log_info "Installing nginx configuration..."
    sudo cp "$APP_DIR/backend/nginx/autocontrol-pro.conf" /etc/nginx/sites-available/
    sudo ln -sf /etc/nginx/sites-available/$NGINX_CONFIG /etc/nginx/sites-enabled/
    sudo nginx -t && sudo systemctl reload nginx
fi

# Install logrotate configuration
if [ -f "$APP_DIR/backend/config/logrotate-autocontrol-pro" ]; then
    log_info "Installing logrotate configuration..."
    sudo cp "$APP_DIR/backend/config/logrotate-autocontrol-pro" /etc/logrotate.d/autocontrol-pro
fi

# Start the service
log_info "Starting $SERVICE_NAME service..."
sudo systemctl start $SERVICE_NAME

# Wait for service to start
sleep 5

# Check service status
if sudo systemctl is-active --quiet $SERVICE_NAME; then
    log_info "✅ Service is running successfully"
else
    log_error "❌ Service failed to start"
    sudo systemctl status $SERVICE_NAME
    exit 1
fi

# Health check
log_info "Performing health check..."
if curl -f http://localhost:5000/health >/dev/null 2>&1; then
    log_info "✅ Health check passed"
else
    log_error "❌ Health check failed"
    exit 1
fi

# Clean up old backups (keep last 10)
log_info "Cleaning up old backups..."
sudo find "$BACKUP_DIR" -name "backup_*.tar.gz" -type f -mtime +30 -delete 2>/dev/null || true

log_info "🎉 Deployment completed successfully!"
log_info "Application is running at: https://yourdomain.com"
log_info "API is available at: https://api.yourdomain.com"

# Show service status
echo ""
log_info "Service Status:"
sudo systemctl status $SERVICE_NAME --no-pager -l
`;

    const deployScriptPath = path.join(__dirname, '../deploy.sh');
    await fs.writeFile(deployScriptPath, deployScript);
    
    // Make script executable
    await fs.chmod(deployScriptPath, 0o755);
    
    console.log(`✅ Deployment script created at: ${deployScriptPath}`);
    console.log('\\n📋 To deploy:');
    console.log('./deploy.sh');
  }

  async run() {
    try {
      console.log('🚀 Starting Production Environment Setup...');
      
      // Create template first
      await this.createProductionTemplate();
      
      // Interactive configuration
      const config = await this.setupInteractiveConfiguration();
      
      // Generate production environment file
      await this.generateProductionEnv(config);
      
      // Setup system configurations
      await this.setupSystemdService();
      await this.setupNginxConfig();
      await this.setupLogRotation();
      await this.createDeploymentScript();
      
      console.log('\\n🎉 Production Environment Setup Complete!');
      console.log('\\n📋 Next Steps:');
      console.log('1. Review and customize .env.production file');
      console.log('2. Update domain names in nginx configuration');
      console.log('3. Obtain SSL certificates (Let\\'s Encrypt recommended)');
      console.log('4. Create autocontrol user: sudo useradd -r -s /bin/false autocontrol');
      console.log('5. Run deployment script: ./deploy.sh');
      console.log('\\n⚠️  Security Reminders:');
      console.log('- Never commit .env.production to version control');
      console.log('- Regularly update SSL certificates');
      console.log('- Monitor logs for security issues');
      console.log('- Keep system and dependencies updated');
      
    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      process.exit(1);
    } finally {
      this.rl.close();
    }
  }
}

// Run if called directly
if (require.main === module) {
  const setup = new ProductionEnvironmentSetup();
  setup.run();
}

module.exports = ProductionEnvironmentSetup;