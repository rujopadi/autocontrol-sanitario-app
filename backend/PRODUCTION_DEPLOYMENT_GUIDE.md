# Production Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying AutoControl Pro to a production environment. The deployment process includes environment configuration, SSL setup, logging aggregation, health monitoring, and security hardening.

## Quick Start

### 1. Prerequisites

Ensure your production server meets these requirements:

- **Operating System**: Ubuntu 20.04+ or CentOS 8+
- **Node.js**: Version 18.x or higher
- **Memory**: Minimum 2GB RAM (4GB+ recommended)
- **Storage**: Minimum 20GB available space
- **Network**: Public IP address and domain name
- **Database**: MongoDB Atlas account or local MongoDB 5.0+

### 2. Initial Server Setup

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install required system packages
sudo apt install -y nginx mongodb-tools curl wget git unzip

# Install PM2 globally
sudo npm install -g pm2

# Create application user
sudo useradd -m -s /bin/bash autocontrol
sudo usermod -aG sudo autocontrol
```

### 3. Application Deployment

```bash
# Clone the repository
git clone https://github.com/your-org/autocontrol-pro.git
cd autocontrol-pro

# Install dependencies
npm install --production

# Build the frontend
npm run build

# Run complete deployment setup
npm run deploy:complete
```

This will automatically:
- ✅ Set up production database infrastructure
- ✅ Configure environment variables and secrets
- ✅ Set up logging aggregation and error tracking
- ✅ Configure comprehensive health monitoring
- ✅ Create SSL/TLS configuration templates
- ✅ Set up process management with PM2
- ✅ Configure Nginx reverse proxy
- ✅ Create monitoring and alerting systems

## Detailed Deployment Steps

### Step 1: Database Setup

#### Option A: MongoDB Atlas (Recommended)

1. **Create MongoDB Atlas Account**
   - Sign up at https://cloud.mongodb.com
   - Create a new project: "AutoControl Pro"

2. **Create Cluster**
   - Choose M10 tier or higher for production
   - Select region closest to your users
   - Enable backup and encryption at rest

3. **Configure Network Access**
   - Add your server's IP address to IP Access List
   - Consider VPC Peering for enhanced security

4. **Create Database Users**
   ```javascript
   // Application user
   Username: autocontrol-app
   Password: [generate strong password]
   Roles: readWrite@autocontrol-pro
   
   // Backup user
   Username: autocontrol-backup
   Password: [generate strong password]
   Roles: backup@admin, read@autocontrol-pro
   ```

5. **Get Connection String**
   ```
   mongodb+srv://autocontrol-app:password@cluster.mongodb.net/autocontrol-pro?retryWrites=true&w=majority
   ```

#### Option B: Self-Hosted MongoDB

```bash
# Install MongoDB 5.0
wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-5.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start and enable MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Secure MongoDB installation
mongo --eval "
use admin
db.createUser({
  user: 'admin',
  pwd: 'secure-admin-password',
  roles: ['userAdminAnyDatabase', 'dbAdminAnyDatabase', 'readWriteAnyDatabase']
})
"

# Enable authentication
sudo sed -i 's/#security:/security:\n  authorization: enabled/' /etc/mongod.conf
sudo systemctl restart mongod
```

### Step 2: Environment Configuration

1. **Copy Environment Template**
   ```bash
   cp .env.production.example .env.production
   ```

2. **Update Environment Variables**
   ```bash
   # Edit .env.production with your actual values
   nano .env.production
   ```

   Key variables to update:
   ```env
   # Application
   NODE_ENV=production
   PORT=3000
   APP_URL=https://your-domain.com
   
   # Database
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/autocontrol-pro
   
   # Security
   JWT_SECRET=your-super-secure-jwt-secret-minimum-32-characters
   
   # Email Service
   EMAIL_API_KEY=your-sendgrid-api-key
   EMAIL_FROM=noreply@your-domain.com
   
   # CORS
   CORS_ORIGIN=https://your-domain.com,https://www.your-domain.com
   ```

3. **Run Environment Setup**
   ```bash
   npm run deploy:environment
   ```

### Step 3: SSL Certificate Setup

#### Option A: Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test automatic renewal
sudo certbot renew --dry-run

# Set up automatic renewal cron job
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

#### Option B: Custom SSL Certificate

```bash
# Place your certificate files
sudo cp your-certificate.crt /etc/ssl/certs/autocontrol-pro.crt
sudo cp your-private-key.key /etc/ssl/private/autocontrol-pro.key

# Set proper permissions
sudo chmod 644 /etc/ssl/certs/autocontrol-pro.crt
sudo chmod 600 /etc/ssl/private/autocontrol-pro.key

# Update environment variables
echo "SSL_CERT_PATH=/etc/ssl/certs/autocontrol-pro.crt" >> .env.production
echo "SSL_KEY_PATH=/etc/ssl/private/autocontrol-pro.key" >> .env.production
```

### Step 4: Logging and Monitoring Setup

```bash
# Set up logging aggregation
npm run deploy:logging

# Configure health monitoring
npm run deploy:health

# Test logging system
echo "Test log message" | logger -t autocontrol-pro

# Verify log files
ls -la /var/log/autocontrol/
```

### Step 5: Application Startup

```bash
# Start application with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Set up PM2 to start on boot
pm2 startup
# Follow the instructions provided by PM2

# Check application status
pm2 status
pm2 logs autocontrol-pro
```

### Step 6: Nginx Configuration

```bash
# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Enable Nginx to start on boot
sudo systemctl enable nginx

# Check Nginx status
sudo systemctl status nginx
```

### Step 7: Firewall Configuration

```bash
# Install and configure UFW
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (adjust port if needed)
sudo ufw allow ssh

# Allow HTTP and HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Enable firewall
sudo ufw --force enable

# Check firewall status
sudo ufw status verbose
```

### Step 8: Final Verification

```bash
# Test application health
curl -f https://your-domain.com/api/monitoring/health

# Check detailed status
curl -f https://your-domain.com/api/monitoring/status

# Verify SSL certificate
curl -I https://your-domain.com

# Test application functionality
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpassword"}'
```

## Monitoring and Maintenance

### Health Monitoring

The deployment includes comprehensive health monitoring:

- **Basic Health Check**: `/api/monitoring/health`
- **Detailed Status**: `/api/monitoring/status`
- **Health Dashboard**: `/health-dashboard.html`

### Log Monitoring

Logs are centralized in `/var/log/autocontrol/`:

```bash
# View application logs
tail -f /var/log/autocontrol/app.log

# View error logs
tail -f /var/log/autocontrol/error.log

# View access logs
tail -f /var/log/autocontrol/access.log

# View all logs
tail -f /var/log/autocontrol/*.log
```

### Performance Monitoring

```bash
# Monitor system resources
htop

# Monitor application performance
pm2 monit

# Check database performance
mongostat --host your-mongodb-host

# Monitor disk usage
df -h
du -sh /var/log/autocontrol/
```

### Backup Verification

```bash
# Check backup status
npm run backup:list

# Test backup creation
npm run backup:create

# Verify backup integrity
npm run backup:verify
```

## Troubleshooting

### Common Issues

#### Application Won't Start

```bash
# Check PM2 logs
pm2 logs autocontrol-pro

# Check environment variables
pm2 env 0

# Restart application
pm2 restart autocontrol-pro

# Check port availability
netstat -tuln | grep :3000
```

#### Database Connection Issues

```bash
# Test MongoDB connection
mongosh "your-mongodb-connection-string"

# Check network connectivity
ping your-mongodb-host

# Verify credentials
mongo --eval "db.runCommand({connectionStatus: 1})"
```

#### SSL Certificate Issues

```bash
# Check certificate validity
openssl x509 -in /etc/ssl/certs/autocontrol-pro.crt -text -noout

# Test SSL configuration
openssl s_client -connect your-domain.com:443

# Renew Let's Encrypt certificate
sudo certbot renew --force-renewal
```

#### High Memory Usage

```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head

# Restart application
pm2 restart autocontrol-pro

# Adjust PM2 memory limit
pm2 start ecosystem.config.js --max-memory-restart 1G
```

### Performance Optimization

#### Database Optimization

```bash
# Run database optimization script
npm run optimize:connections

# Check slow queries
# (Enable profiling in MongoDB)

# Add missing indexes
npm run setup:production-db
```

#### Application Optimization

```bash
# Enable gzip compression (already configured in Nginx)
# Optimize static asset caching
# Configure CDN if needed

# Monitor and adjust PM2 settings
pm2 start ecosystem.config.js --instances max
```

## Security Checklist

### Pre-Deployment Security

- [ ] Strong passwords for all accounts
- [ ] SSH key-based authentication
- [ ] Firewall properly configured
- [ ] SSL certificates installed and valid
- [ ] Database access restricted
- [ ] Environment variables secured

### Post-Deployment Security

- [ ] Regular security updates
- [ ] Log monitoring and alerting
- [ ] Backup encryption and testing
- [ ] Access control and monitoring
- [ ] Security headers configured
- [ ] Rate limiting enabled

### Security Monitoring

```bash
# Monitor failed login attempts
grep "authentication failed" /var/log/autocontrol/security.log

# Check for suspicious activity
grep "rate limit" /var/log/autocontrol/access.log

# Monitor system access
last -n 20
```

## Scaling Considerations

### Horizontal Scaling

When you need to scale beyond a single server:

1. **Load Balancer Setup**
   - Use Nginx, HAProxy, or cloud load balancer
   - Configure session affinity or stateless sessions
   - Health check configuration

2. **Database Scaling**
   - MongoDB replica sets for read scaling
   - MongoDB sharding for write scaling
   - Connection pooling optimization

3. **Shared Storage**
   - Use shared file system for uploads
   - Configure Redis for session storage
   - Centralized logging and monitoring

### Vertical Scaling

To scale up your current server:

```bash
# Increase PM2 instances
pm2 scale autocontrol-pro +2

# Adjust memory limits
pm2 start ecosystem.config.js --max-memory-restart 2G

# Optimize database connection pool
# Update DB_MAX_POOL_SIZE in .env.production
```

## Backup and Recovery

### Automated Backups

Backups are configured automatically during deployment:

```bash
# Check backup configuration
cat /etc/cron.d/autocontrol-backups

# Manual backup
npm run backup:create

# List available backups
npm run backup:list

# Restore from backup
npm run backup:restore backup-filename.tar.gz
```

### Disaster Recovery

1. **Database Recovery**
   ```bash
   # Restore from MongoDB Atlas backup
   # Or restore from local backup
   mongorestore --uri="connection-string" backup-directory/
   ```

2. **Application Recovery**
   ```bash
   # Redeploy application
   git pull origin main
   npm install --production
   npm run build
   pm2 restart autocontrol-pro
   ```

3. **SSL Certificate Recovery**
   ```bash
   # Restore certificates
   sudo certbot certificates
   sudo certbot renew --force-renewal
   ```

## Support and Resources

### Documentation

- [API Documentation](docs/API_DOCUMENTATION.md)
- [User Guide](docs/USER_GUIDE.md)
- [Admin Guide](docs/ADMIN_GUIDE.md)
- [Troubleshooting Guide](docs/TROUBLESHOOTING.md)

### Monitoring Tools

- Application health: `/health-dashboard.html`
- PM2 monitoring: `pm2 monit`
- System monitoring: `htop`, `iotop`, `nethogs`
- Log analysis: `tail`, `grep`, `awk`

### Getting Help

- Check logs: `/var/log/autocontrol/`
- Review documentation: `docs/`
- GitHub issues: Create detailed issue reports
- Email support: Include logs and system information

---

**Note**: This guide assumes a Ubuntu/Debian-based system. Adjust commands accordingly for other Linux distributions.

For additional help or questions, please refer to the troubleshooting guide or contact support with detailed system information and error logs.