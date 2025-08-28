# Production Deployment Guide - Autocontrol Sanitario Pro

This guide covers the complete production deployment process for the Autocontrol Sanitario Pro SaaS platform.

## Prerequisites

### System Requirements
- **Operating System**: Linux (Ubuntu 20.04+ recommended)
- **Node.js**: Version 18 or higher
- **Docker**: Version 20.10+ with Docker Compose
- **MongoDB**: Atlas cluster or self-hosted MongoDB 6.0+
- **Memory**: Minimum 2GB RAM (4GB+ recommended)
- **Storage**: Minimum 20GB free space
- **Network**: HTTPS-capable domain with SSL certificates

### Required Services
- **MongoDB Atlas** (recommended) or self-hosted MongoDB
- **Email Service**: SendGrid, AWS SES, or SMTP server
- **Domain**: Registered domain with DNS control
- **SSL Certificates**: Let's Encrypt or commercial certificates

## Quick Start with Docker Compose

### 1. Clone and Setup
```bash
git clone <repository-url>
cd autocontrol-sanitario-pro
```

### 2. Environment Configuration
```bash
# Copy environment template
cp .env.production.example .env.production

# Edit with your actual values
nano .env.production
```

### 3. Deploy with Docker Compose
```bash
# Build and start all services
docker-compose -f docker-compose.prod.yml up -d

# Check service status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

## Manual Deployment

### 1. Backend Setup

#### Install Dependencies
```bash
cd backend
npm install --production
```

#### Environment Configuration
```bash
# Copy and configure environment
cp config/production.env.example .env.production
nano .env.production
```

#### Database Setup
```bash
# Setup database indexes and configuration
npm run setup:db

# Verify database connection
npm run health:check
```

#### Start Backend Service
```bash
# Start in production mode
npm run start:prod

# Or use PM2 for process management
npm install -g pm2
pm2 start server.js --name "autocontrol-api" --env production
```

### 2. Frontend Setup

#### Build Frontend
```bash
# Install dependencies
npm install

# Build for production
npm run build
```

#### Serve with Nginx
```bash
# Copy built files to web server
sudo cp -r dist/* /var/www/autocontrolpro.com/

# Configure Nginx (see nginx configuration below)
sudo nano /etc/nginx/sites-available/autocontrolpro.com
sudo ln -s /etc/nginx/sites-available/autocontrolpro.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Database Configuration

### MongoDB Atlas (Recommended)

1. **Create Cluster**
   - Sign up at [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Create a new cluster (M0 free tier for testing)
   - Configure network access (whitelist your server IP)

2. **Create Database User**
   - Go to Database Access
   - Create user with read/write permissions
   - Note username and password

3. **Get Connection String**
   - Go to Clusters → Connect → Connect your application
   - Copy the connection string
   - Replace `<password>` and `<dbname>` with your values

### Self-Hosted MongoDB

```bash
# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Secure MongoDB
mongo
> use admin
> db.createUser({user: "admin", pwd: "secure_password", roles: ["root"]})
> exit

# Enable authentication
sudo nano /etc/mongod.conf
# Add: security.authorization: enabled
sudo systemctl restart mongod
```

## SSL/HTTPS Configuration

### Using Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificates
sudo certbot --nginx -d autocontrolpro.com -d www.autocontrolpro.com -d api.autocontrolpro.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Using Custom Certificates

```bash
# Place certificates
sudo mkdir -p /etc/nginx/ssl
sudo cp your-cert.pem /etc/nginx/ssl/cert.pem
sudo cp your-key.pem /etc/nginx/ssl/key.pem
sudo chmod 600 /etc/nginx/ssl/*
```

## Nginx Configuration

Create `/etc/nginx/sites-available/autocontrolpro.com`:

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name autocontrolpro.com www.autocontrolpro.com api.autocontrolpro.com;
    return 301 https://$server_name$request_uri;
}

# Main application
server {
    listen 443 ssl http2;
    server_name autocontrolpro.com www.autocontrolpro.com;

    ssl_certificate /etc/letsencrypt/live/autocontrolpro.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/autocontrolpro.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;

    # Frontend
    location / {
        root /var/www/autocontrolpro.com;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API proxy
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# API subdomain
server {
    listen 443 ssl http2;
    server_name api.autocontrolpro.com;

    ssl_certificate /etc/letsencrypt/live/autocontrolpro.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/autocontrolpro.com/privkey.pem;

    # CORS headers
    add_header Access-Control-Allow-Origin "https://autocontrolpro.com" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization" always;

    location / {
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "https://autocontrolpro.com";
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
            add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization";
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }

        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Process Management

### Using PM2 (Recommended)

```bash
# Install PM2
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'autocontrol-api',
    script: 'server.js',
    cwd: '/path/to/backend',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    instances: 'max',
    exec_mode: 'cluster',
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save
pm2 startup
```

### Using Systemd

```bash
# Create service file
sudo tee /etc/systemd/system/autocontrol-api.service > /dev/null <<EOF
[Unit]
Description=Autocontrol Sanitario Pro API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/backend
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable autocontrol-api
sudo systemctl start autocontrol-api
```

## Monitoring and Maintenance

### Health Checks

```bash
# Check application health
curl -f https://autocontrolpro.com/health

# Check API health
curl -f https://api.autocontrolpro.com/health

# Check detailed health (requires authentication)
curl -H "Authorization: Bearer <token>" https://api.autocontrolpro.com/health/detailed
```

### Log Management

```bash
# View application logs
tail -f backend/logs/combined.log

# View error logs
tail -f backend/logs/error.log

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Database Backups

```bash
# Create backup
cd backend
npm run backup:create

# List backups
npm run backup:list

# Cleanup old backups
npm run backup:cleanup

# Schedule automatic backups
crontab -e
# Add: 0 2 * * * cd /path/to/backend && npm run backup:create
```

### Performance Monitoring

```bash
# Monitor system resources
htop

# Monitor application performance
pm2 monit

# Check database performance
mongo --eval "db.runCommand({serverStatus: 1})"
```

## Security Checklist

- [ ] **SSL/HTTPS**: Certificates installed and configured
- [ ] **Firewall**: Only necessary ports open (80, 443, 22)
- [ ] **Database**: Authentication enabled, network restricted
- [ ] **Environment Variables**: Secure secrets, no hardcoded passwords
- [ ] **Updates**: System and dependencies up to date
- [ ] **Backups**: Automated database backups configured
- [ ] **Monitoring**: Health checks and alerting set up
- [ ] **Rate Limiting**: API rate limits configured
- [ ] **CORS**: Proper origin restrictions in place

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check MongoDB status
   sudo systemctl status mongod
   
   # Check connection string
   mongo "your-connection-string"
   ```

2. **SSL Certificate Issues**
   ```bash
   # Test SSL configuration
   sudo nginx -t
   
   # Renew Let's Encrypt certificates
   sudo certbot renew
   ```

3. **Application Won't Start**
   ```bash
   # Check logs
   tail -f backend/logs/error.log
   
   # Check environment variables
   printenv | grep -E "(MONGODB_URI|JWT_SECRET)"
   ```

4. **High Memory Usage**
   ```bash
   # Monitor memory
   free -h
   
   # Restart application
   pm2 restart autocontrol-api
   ```

### Performance Optimization

1. **Database Optimization**
   - Ensure proper indexes are created
   - Monitor slow queries
   - Use connection pooling

2. **Application Optimization**
   - Enable compression
   - Use clustering (PM2)
   - Implement caching

3. **Server Optimization**
   - Configure Nginx caching
   - Enable gzip compression
   - Optimize SSL settings

## Support

For deployment issues or questions:
- Check the logs first
- Review this documentation
- Contact support with specific error messages and logs

## Updates and Maintenance

### Application Updates
```bash
# Pull latest code
git pull origin main

# Update dependencies
npm install --production

# Run database migrations if needed
npm run migrate

# Restart application
pm2 restart autocontrol-api
```

### Security Updates
```bash
# Update system packages
sudo apt update && sudo apt upgrade

# Update Node.js dependencies
npm audit fix

# Update SSL certificates
sudo certbot renew
```