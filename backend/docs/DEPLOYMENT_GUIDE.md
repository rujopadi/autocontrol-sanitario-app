# Deployment Guide

## Overview

This guide covers deploying AutoControl Pro to production environments. The application is designed to run in containerized environments with MongoDB as the database backend.

## Prerequisites

### System Requirements
- **Operating System**: Linux (Ubuntu 20.04+ recommended)
- **Node.js**: Version 18.x or higher
- **MongoDB**: Version 5.0 or higher
- **Memory**: Minimum 2GB RAM (4GB+ recommended)
- **Storage**: Minimum 20GB available space
- **Network**: HTTPS-capable domain with SSL certificate

### Required Services
- **Database**: MongoDB (local or MongoDB Atlas)
- **Email Service**: SendGrid, AWS SES, or similar
- **Reverse Proxy**: Nginx (recommended)
- **Process Manager**: PM2 or Docker
- **SSL Certificate**: Let's Encrypt or commercial certificate

## Environment Configuration

### Environment Variables

Create a `.env` file with the following variables:

```bash
# Application
NODE_ENV=production
PORT=3000
APP_NAME="AutoControl Pro"
APP_URL=https://your-domain.com

# Database
MONGODB_URI=mongodb://localhost:27017/autocontrol-pro
# For MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/autocontrol-pro

# Security
JWT_SECRET=your-super-secure-jwt-secret-key-here
JWT_EXPIRES_IN=24h
BCRYPT_ROUNDS=12

# Email Service (SendGrid example)
EMAIL_SERVICE=sendgrid
EMAIL_API_KEY=your-sendgrid-api-key
EMAIL_FROM=noreply@your-domain.com
EMAIL_FROM_NAME="AutoControl Pro"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring
ENABLE_MONITORING=true
ENABLE_ANALYTICS=true

# CORS
CORS_ORIGIN=https://your-domain.com
CORS_CREDENTIALS=true

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=/var/uploads

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/autocontrol/app.log
```

### Security Configuration

```bash
# Additional security variables
HELMET_CSP_DIRECTIVES=default-src 'self'; script-src 'self' 'unsafe-inline'
TRUST_PROXY=true
SECURE_COOKIES=true
SESSION_SECURE=true
```

## Database Setup

### Local MongoDB Installation

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y mongodb-org

# Start MongoDB service
sudo systemctl start mongod
sudo systemctl enable mongod

# Create database and user
mongosh
use autocontrol-pro
db.createUser({
  user: "autocontrol",
  pwd: "secure-password",
  roles: [{ role: "readWrite", db: "autocontrol-pro" }]
})
```

### MongoDB Atlas Setup

1. Create a MongoDB Atlas account
2. Create a new cluster
3. Configure network access (whitelist your server IP)
4. Create a database user
5. Get the connection string and update `MONGODB_URI`

### Database Initialization

```bash
# Run database setup script
node backend/scripts/setup-database.js

# Create indexes and initial data
node backend/scripts/mongo-init.js
```

## Application Deployment

### Method 1: Direct Node.js Deployment

```bash
# Clone repository
git clone https://github.com/your-org/autocontrol-pro.git
cd autocontrol-pro

# Install dependencies
npm install --production

# Build frontend
npm run build

# Install PM2 globally
npm install -g pm2

# Start application with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save
pm2 startup
```

### Method 2: Docker Deployment

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    depends_on:
      - mongodb
    restart: unless-stopped
    volumes:
      - ./logs:/var/log/autocontrol
      - ./uploads:/var/uploads

  mongodb:
    image: mongo:5.0
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=secure-password
      - MONGO_INITDB_DATABASE=autocontrol-pro
    volumes:
      - mongodb_data:/data/db
      - ./backend/scripts/mongo-init.js:/docker-entrypoint-initdb.d/mongo-init.js
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  mongodb_data:
```

Deploy with Docker:

```bash
# Build and start services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Method 3: Kubernetes Deployment

Create Kubernetes manifests:

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: autocontrol-pro
spec:
  replicas: 3
  selector:
    matchLabels:
      app: autocontrol-pro
  template:
    metadata:
      labels:
        app: autocontrol-pro
    spec:
      containers:
      - name: app
        image: autocontrol-pro:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: mongodb-uri
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: autocontrol-pro-service
spec:
  selector:
    app: autocontrol-pro
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

## Nginx Configuration

Create `/etc/nginx/sites-available/autocontrol-pro`:

```nginx
upstream autocontrol_backend {
    server 127.0.0.1:3000;
    keepalive 32;
}

server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Static Files
    location /static/ {
        alias /var/www/autocontrol-pro/build/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API Routes
    location /api/ {
        proxy_pass http://autocontrol_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Frontend Routes
    location / {
        try_files $uri $uri/ /index.html;
        root /var/www/autocontrol-pro/build;
        index index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Health Check
    location /health {
        proxy_pass http://autocontrol_backend/api/monitoring/health;
        access_log off;
    }

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    location /api/auth/ {
        limit_req zone=api burst=5 nodelay;
        proxy_pass http://autocontrol_backend;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/autocontrol-pro /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## SSL Certificate Setup

### Using Let's Encrypt (Certbot)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test automatic renewal
sudo certbot renew --dry-run

# Set up automatic renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Process Management

### PM2 Configuration

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'autocontrol-pro',
    script: './backend/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/autocontrol/error.log',
    out_file: '/var/log/autocontrol/out.log',
    log_file: '/var/log/autocontrol/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
```

### PM2 Commands

```bash
# Start application
pm2 start ecosystem.config.js --env production

# Monitor processes
pm2 monit

# View logs
pm2 logs autocontrol-pro

# Restart application
pm2 restart autocontrol-pro

# Stop application
pm2 stop autocontrol-pro

# Delete application
pm2 delete autocontrol-pro
```

## Monitoring and Logging

### Log Configuration

Create log directories:

```bash
sudo mkdir -p /var/log/autocontrol
sudo chown $USER:$USER /var/log/autocontrol
```

### Log Rotation

Create `/etc/logrotate.d/autocontrol-pro`:

```
/var/log/autocontrol/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 autocontrol autocontrol
    postrotate
        pm2 reloadLogs
    endscript
}
```

### System Monitoring

Install monitoring tools:

```bash
# Install htop for system monitoring
sudo apt install htop

# Install MongoDB monitoring tools
sudo apt install mongodb-tools

# Set up disk space monitoring
echo "df -h | grep -E '^/dev/' | awk '{print \$5 \" \" \$1}' | while read output; do echo \$output; done" > /usr/local/bin/check-disk.sh
chmod +x /usr/local/bin/check-disk.sh
```

## Backup Strategy

### Database Backup

Create backup script `/usr/local/bin/backup-mongodb.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="autocontrol-pro"

mkdir -p $BACKUP_DIR

# Create backup
mongodump --db $DB_NAME --out $BACKUP_DIR/$DATE

# Compress backup
tar -czf $BACKUP_DIR/backup_$DATE.tar.gz -C $BACKUP_DIR $DATE
rm -rf $BACKUP_DIR/$DATE

# Keep only last 7 days of backups
find $BACKUP_DIR -name "backup_*.tar.gz" -mtime +7 -delete

echo "Backup completed: backup_$DATE.tar.gz"
```

Set up automated backups:

```bash
chmod +x /usr/local/bin/backup-mongodb.sh

# Add to crontab
crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-mongodb.sh
```

### Application Backup

```bash
# Backup application files
tar -czf /var/backups/autocontrol-app-$(date +%Y%m%d).tar.gz \
    /var/www/autocontrol-pro \
    /etc/nginx/sites-available/autocontrol-pro \
    /var/log/autocontrol
```

## Security Hardening

### Firewall Configuration

```bash
# Install UFW
sudo apt install ufw

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH
sudo ufw allow ssh

# Allow HTTP and HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Allow MongoDB (if external access needed)
# sudo ufw allow from trusted-ip to any port 27017

# Enable firewall
sudo ufw enable
```

### System Updates

```bash
# Set up automatic security updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

# Configure automatic updates
echo 'Unattended-Upgrade::Automatic-Reboot "false";' >> /etc/apt/apt.conf.d/50unattended-upgrades
```

### File Permissions

```bash
# Set proper permissions
sudo chown -R www-data:www-data /var/www/autocontrol-pro
sudo chmod -R 755 /var/www/autocontrol-pro
sudo chmod -R 644 /var/www/autocontrol-pro/build

# Secure log files
sudo chown -R autocontrol:autocontrol /var/log/autocontrol
sudo chmod -R 640 /var/log/autocontrol
```

## Health Checks and Monitoring

### Application Health Check

The application provides health check endpoints:

```bash
# Basic health check
curl https://your-domain.com/api/monitoring/health

# Detailed status (requires authentication)
curl -H "Authorization: Bearer <token>" \
     https://your-domain.com/api/monitoring/status
```

### Monitoring Script

Create `/usr/local/bin/health-check.sh`:

```bash
#!/bin/bash
HEALTH_URL="https://your-domain.com/api/monitoring/health"
ALERT_EMAIL="admin@your-domain.com"

response=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $response -ne 200 ]; then
    echo "Health check failed with status: $response" | \
    mail -s "AutoControl Pro Health Check Failed" $ALERT_EMAIL
fi
```

Set up monitoring:

```bash
chmod +x /usr/local/bin/health-check.sh

# Add to crontab (check every 5 minutes)
crontab -e
# Add: */5 * * * * /usr/local/bin/health-check.sh
```

## Troubleshooting

### Common Issues

1. **Application won't start**
   - Check environment variables
   - Verify database connection
   - Check port availability
   - Review application logs

2. **Database connection errors**
   - Verify MongoDB is running
   - Check connection string
   - Verify network connectivity
   - Check authentication credentials

3. **SSL certificate issues**
   - Verify certificate files exist
   - Check certificate expiration
   - Verify domain configuration
   - Test with SSL checker tools

4. **Performance issues**
   - Monitor system resources
   - Check database indexes
   - Review slow query logs
   - Consider scaling options

### Log Analysis

```bash
# Application logs
tail -f /var/log/autocontrol/combined.log

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# System logs
journalctl -u nginx -f
journalctl -u mongod -f
```

## Scaling Considerations

### Horizontal Scaling

- Use load balancer (Nginx, HAProxy, or cloud load balancer)
- Deploy multiple application instances
- Use MongoDB replica sets for database scaling
- Implement session storage (Redis) for multi-instance deployments

### Vertical Scaling

- Increase server resources (CPU, RAM)
- Optimize database queries and indexes
- Implement caching strategies
- Use CDN for static assets

### Database Scaling

- MongoDB replica sets for read scaling
- MongoDB sharding for write scaling
- Database connection pooling
- Query optimization and indexing

This deployment guide provides a comprehensive foundation for running AutoControl Pro in production. Adjust configurations based on your specific requirements and infrastructure.