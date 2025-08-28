# Infrastructure Setup Guide

## Overview

This guide covers the complete setup of production infrastructure for AutoControl Pro, including database configuration, monitoring, backups, and optimization.

## Quick Start

### 1. Prerequisites

Ensure you have the following installed and configured:

- **Node.js** 18.x or higher
- **MongoDB Tools** (mongodump, mongorestore)
- **MongoDB Atlas** account (recommended for production)
- **AWS Account** (optional, for S3 backups)
- **Email Service** (SendGrid, AWS SES, or SMTP)

### 2. Environment Configuration

Copy the production environment template:

```bash
cp .env.production.example .env.production
```

Edit `.env.production` with your actual values:

```bash
# Required - Update these values
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/autocontrol-pro
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-characters
EMAIL_API_KEY=your-email-service-api-key
DB_PASSWORD=your-database-password
```

### 3. Run Complete Infrastructure Setup

Execute the master setup script:

```bash
npm run setup:production
```

This will run all infrastructure setup phases:
- ✅ Database configuration and optimization
- ✅ Connection pooling optimization
- ✅ Monitoring system setup
- ✅ Automated backup configuration

## Individual Setup Scripts

You can also run individual setup components:

### Database Setup

```bash
# Setup production database with security and indexes
npm run setup:production-db

# Optimize connection pooling
npm run optimize:connections
```

### Monitoring Setup

```bash
# Setup database monitoring and alerting
npm run setup:db-monitoring

# Setup general application monitoring
npm run monitoring:setup
```

### Backup Setup

```bash
# Configure automated backups
npm run setup:backups

# Create manual backup
npm run backup:create
```

## Infrastructure Components

### 1. Database Configuration

#### MongoDB Atlas Setup

1. **Create Cluster**:
   - Cluster Name: `autocontrol-pro-cluster`
   - Tier: M10 (Production) or higher
   - Region: Choose closest to your users
   - Enable Backup and Encryption at Rest

2. **Network Security**:
   - Add your server IP addresses to IP Access List
   - Configure VPC Peering if needed
   - Use strong passwords for database users

3. **Database Users**:
   ```javascript
   // Application User
   {
     username: "autocontrol-app",
     password: "secure-password",
     roles: [{ role: "readWrite", db: "autocontrol-pro" }]
   }
   
   // Backup User
   {
     username: "autocontrol-backup", 
     password: "backup-password",
     roles: [{ role: "backup", db: "admin" }]
   }
   ```

#### Connection Pooling

Optimized settings for production:

```javascript
{
  maxPoolSize: 10,        // Maximum connections
  minPoolSize: 2,         // Minimum connections
  maxIdleTimeMS: 30000,   // Close idle connections after 30s
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  retryWrites: true,
  retryReads: true
}
```

### 2. Monitoring System

#### Database Monitoring

- **Performance Metrics**: CPU, memory, disk usage
- **Connection Monitoring**: Pool utilization, active connections
- **Query Performance**: Slow query detection and alerting
- **Replication Lag**: Monitor replica set health

#### Application Monitoring

- **System Health**: Server resources and uptime
- **API Performance**: Response times and error rates
- **User Analytics**: Activity tracking and usage patterns
- **Security Events**: Authentication attempts and failures

#### Alerting

Configure alerts for:
- High CPU/Memory usage (>80%)
- Database connection issues
- Slow queries (>1000ms)
- High error rates (>5%)
- Backup failures

### 3. Automated Backups

#### Backup Strategy

- **Daily Backups**: Full database backup at 2 AM
- **Weekly Backups**: Retained for 4 weeks
- **Monthly Backups**: Retained for 12 months
- **Point-in-Time Recovery**: Using MongoDB oplog

#### Storage Locations

1. **Local Storage**: `/var/backups/autocontrol`
2. **MongoDB Atlas**: Automatic cloud backups
3. **AWS S3**: Optional offsite backup storage

#### Backup Verification

- Automatic backup integrity checks
- Test restore procedures monthly
- Monitor backup completion and file sizes

### 4. Security Configuration

#### Database Security

- **Encryption at Rest**: Enabled on MongoDB Atlas
- **Encryption in Transit**: TLS/SSL connections
- **Authentication**: Strong passwords and user roles
- **Network Security**: IP whitelisting and VPC

#### Application Security

- **JWT Tokens**: Secure token generation and validation
- **Rate Limiting**: Prevent brute force attacks
- **Input Validation**: Sanitize all user inputs
- **Security Headers**: Helmet.js configuration

## Environment-Specific Configurations

### Production Environment

```bash
NODE_ENV=production
DB_MAX_POOL_SIZE=10
DB_MIN_POOL_SIZE=2
ENABLE_MONITORING=true
ENABLE_ANALYTICS=true
BACKUP_S3_ENABLED=true
```

### Staging Environment

```bash
NODE_ENV=staging
DB_MAX_POOL_SIZE=5
DB_MIN_POOL_SIZE=1
ENABLE_MONITORING=true
ENABLE_ANALYTICS=false
BACKUP_S3_ENABLED=false
```

### Development Environment

```bash
NODE_ENV=development
DB_MAX_POOL_SIZE=3
DB_MIN_POOL_SIZE=1
ENABLE_MONITORING=false
ENABLE_ANALYTICS=false
```

## Monitoring and Maintenance

### Health Checks

Monitor these endpoints:

- `GET /api/monitoring/health` - Basic health check
- `GET /api/monitoring/status` - Detailed system status (Admin)
- `GET /api/analytics/dashboard` - Analytics dashboard

### Performance Monitoring

Key metrics to monitor:

1. **Database Performance**:
   - Query response times
   - Connection pool utilization
   - Index usage and efficiency
   - Disk space and growth

2. **Application Performance**:
   - API response times
   - Memory usage and garbage collection
   - CPU utilization
   - Error rates and types

3. **User Experience**:
   - Page load times
   - User session duration
   - Feature usage patterns
   - Error frequency

### Maintenance Tasks

#### Daily
- Monitor system health dashboards
- Check backup completion status
- Review error logs and alerts

#### Weekly
- Analyze performance trends
- Review slow query reports
- Update security patches
- Test backup restore procedures

#### Monthly
- Database index optimization
- Performance tuning review
- Security audit and updates
- Capacity planning review

## Troubleshooting

### Common Issues

#### Database Connection Problems

```bash
# Check connection status
npm run optimize:connections

# Test database connectivity
node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected'))
  .catch(err => console.error('❌ Error:', err));
"
```

#### High Memory Usage

1. Check connection pool settings
2. Review query efficiency
3. Monitor for memory leaks
4. Optimize garbage collection

#### Slow Query Performance

1. Enable MongoDB profiling
2. Analyze slow query logs
3. Add missing indexes
4. Optimize query patterns

#### Backup Failures

1. Check disk space availability
2. Verify database permissions
3. Test network connectivity
4. Review backup logs

### Performance Optimization

#### Database Optimization

```bash
# Analyze and optimize connection pooling
npm run optimize:connections

# Create database indexes
npm run setup:production-db
```

#### Query Optimization

1. **Use Indexes**: Ensure all queries use appropriate indexes
2. **Limit Results**: Use pagination for large result sets
3. **Project Fields**: Only select needed fields
4. **Aggregate Efficiently**: Optimize aggregation pipelines

#### Connection Pool Tuning

Monitor and adjust based on usage:

```javascript
// High traffic applications
maxPoolSize: 15-20

// Medium traffic applications  
maxPoolSize: 8-12

// Low traffic applications
maxPoolSize: 3-5
```

## Scaling Considerations

### Horizontal Scaling

1. **Load Balancing**: Use Nginx or cloud load balancers
2. **Database Sharding**: For very large datasets
3. **Read Replicas**: Distribute read operations
4. **Microservices**: Split into smaller services

### Vertical Scaling

1. **Server Resources**: Increase CPU and RAM
2. **Database Tier**: Upgrade MongoDB Atlas tier
3. **Connection Pools**: Increase pool sizes
4. **Caching**: Implement Redis or Memcached

## Security Best Practices

### Database Security

- Use strong, unique passwords
- Enable two-factor authentication
- Regular security updates
- Monitor access logs
- Implement least privilege access

### Application Security

- Keep dependencies updated
- Use HTTPS everywhere
- Implement proper authentication
- Validate all inputs
- Log security events

### Infrastructure Security

- Use firewalls and VPCs
- Regular security scans
- Backup encryption
- Access control and monitoring
- Incident response procedures

## Support and Resources

### Documentation

- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Express.js Security](https://expressjs.com/en/advanced/best-practice-security.html)

### Monitoring Tools

- MongoDB Atlas Monitoring
- New Relic APM
- DataDog Infrastructure
- Sentry Error Tracking

### Community Resources

- [MongoDB Community Forums](https://community.mongodb.com/)
- [Node.js Community](https://nodejs.org/en/community/)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/mongodb+node.js)

---

For additional support or questions about infrastructure setup, please refer to the [Troubleshooting Guide](docs/TROUBLESHOOTING.md) or contact the development team.