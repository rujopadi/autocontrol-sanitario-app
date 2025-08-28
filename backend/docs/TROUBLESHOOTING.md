# Troubleshooting Guide

## Common Issues and Solutions

### Authentication Issues

#### Problem: "Authentication required" error
**Symptoms:** API returns 401 status code
**Causes:**
- Missing or invalid JWT token
- Expired token
- Incorrect Authorization header format

**Solutions:**
1. Check that the Authorization header is properly formatted:
   ```
   Authorization: Bearer <your-jwt-token>
   ```
2. Verify the token hasn't expired (check `exp` claim)
3. Ensure the token was generated with the correct secret
4. Try refreshing the token using the refresh endpoint

#### Problem: "Access denied" error
**Symptoms:** API returns 403 status code
**Causes:**
- User doesn't have required permissions
- User trying to access another organization's data
- Admin-only endpoint accessed by regular user

**Solutions:**
1. Check user role and permissions
2. Verify the user belongs to the correct organization
3. Ensure the endpoint allows the user's role level

### Database Connection Issues

#### Problem: "Database connection failed"
**Symptoms:** 
- Server fails to start
- 503 errors on health check endpoint
- "MongoError" in logs

**Solutions:**
1. Check MongoDB connection string in environment variables
2. Verify MongoDB server is running and accessible
3. Check network connectivity and firewall rules
4. Verify database credentials and permissions
5. Check MongoDB Atlas IP whitelist (if using Atlas)

**Diagnostic commands:**
```bash
# Test MongoDB connection
mongosh "mongodb://localhost:27017/autocontrol-pro"

# Check MongoDB service status
systemctl status mongod

# View MongoDB logs
tail -f /var/log/mongodb/mongod.log
```

### Performance Issues

#### Problem: Slow API responses
**Symptoms:**
- High response times (>2 seconds)
- Timeout errors
- High CPU/memory usage

**Solutions:**
1. Check database indexes:
   ```javascript
   // In MongoDB shell
   db.users.getIndexes()
   db.organizations.getIndexes()
   db.analytics_events.getIndexes()
   ```
2. Monitor system resources:
   ```bash
   # Check CPU and memory usage
   top
   htop
   
   # Check disk usage
   df -h
   
   # Check MongoDB performance
   mongostat
   ```
3. Review slow queries in MongoDB logs
4. Consider adding database indexes for frequently queried fields
5. Implement caching for frequently accessed data

#### Problem: High memory usage
**Symptoms:**
- Server becomes unresponsive
- Out of memory errors
- Slow performance

**Solutions:**
1. Check for memory leaks in application code
2. Monitor Node.js heap usage:
   ```javascript
   console.log(process.memoryUsage());
   ```
3. Implement proper cleanup of event listeners and timers
4. Consider increasing server memory or optimizing queries
5. Use MongoDB connection pooling to limit connections

### Multi-Tenant Issues

#### Problem: Users seeing data from other organizations
**Symptoms:**
- Cross-tenant data leakage
- Users accessing unauthorized data

**Solutions:**
1. Verify all database queries include organizationId filter
2. Check middleware is properly injecting organization context
3. Review TenantAwareModel implementation
4. Audit all API endpoints for proper tenant isolation
5. Run multi-tenant security tests

#### Problem: Organization creation fails
**Symptoms:**
- Registration process fails
- Subdomain conflicts
- Database errors during organization setup

**Solutions:**
1. Check subdomain uniqueness validation
2. Verify organization schema validation
3. Check database permissions for creating new collections
4. Review organization creation transaction logic
5. Check for required fields in organization data

### Email Service Issues

#### Problem: Emails not being sent
**Symptoms:**
- Users not receiving verification emails
- Password reset emails missing
- No email notifications

**Solutions:**
1. Check email service configuration (SendGrid, etc.)
2. Verify API keys and credentials
3. Check email service quotas and limits
4. Review email templates for errors
5. Check spam folders and email deliverability

**Diagnostic steps:**
```javascript
// Test email service
const emailService = require('./services/emailService');
await emailService.sendTestEmail('test@example.com');
```

### Analytics and Monitoring Issues

#### Problem: Analytics data not being collected
**Symptoms:**
- Empty analytics dashboard
- Missing user activity data
- No performance metrics

**Solutions:**
1. Check analytics middleware is properly installed
2. Verify analytics service is enabled (not in test mode)
3. Check database permissions for analytics collections
4. Review analytics event tracking in application code
5. Check for JavaScript errors preventing client-side tracking

#### Problem: Monitoring alerts not working
**Symptoms:**
- No alerts for system issues
- Missing performance notifications
- Alert thresholds not triggering

**Solutions:**
1. Check monitoring service configuration
2. Verify alert thresholds are properly set
3. Check notification service integration
4. Review monitoring service logs for errors
5. Test alert system with manual triggers

### Deployment Issues

#### Problem: Application fails to start in production
**Symptoms:**
- Server crashes on startup
- Environment variable errors
- Port binding failures

**Solutions:**
1. Check all required environment variables are set
2. Verify port availability and permissions
3. Check file permissions and ownership
4. Review production configuration differences
5. Check system dependencies and versions

**Environment checklist:**
```bash
# Required environment variables
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://...
JWT_SECRET=your-secret
EMAIL_API_KEY=your-key
```

#### Problem: CORS errors in production
**Symptoms:**
- Browser console shows CORS errors
- API requests blocked by browser
- Cross-origin request failures

**Solutions:**
1. Check CORS configuration in server.js
2. Verify allowed origins include production domain
3. Check preflight request handling
4. Review proxy/load balancer configuration
5. Ensure credentials are properly configured

### Security Issues

#### Problem: Rate limiting not working
**Symptoms:**
- Excessive requests not blocked
- No rate limit headers in responses
- Potential abuse not prevented

**Solutions:**
1. Check rate limiting middleware configuration
2. Verify Redis connection (if using Redis store)
3. Check rate limit rules and thresholds
4. Review IP detection logic
5. Test rate limiting with automated requests

#### Problem: Security headers missing
**Symptoms:**
- Security scanners report missing headers
- Potential XSS vulnerabilities
- Missing HTTPS enforcement

**Solutions:**
1. Check helmet middleware configuration
2. Verify security headers in responses
3. Review CSP (Content Security Policy) settings
4. Check HTTPS redirect configuration
5. Implement additional security measures

## Diagnostic Tools

### Health Check Endpoints
```bash
# Basic health check
curl http://localhost:3000/api/monitoring/health

# Detailed system status (requires admin auth)
curl -H "Authorization: Bearer <token>" \
     http://localhost:3000/api/monitoring/status
```

### Database Diagnostics
```javascript
// Check database connection
const mongoose = require('mongoose');
console.log('Connection state:', mongoose.connection.readyState);

// Check collection stats
const stats = await db.collection('users').stats();
console.log('Collection stats:', stats);
```

### Performance Monitoring
```bash
# Monitor API response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/health

# Check system resources
iostat -x 1
vmstat 1
```

### Log Analysis
```bash
# Application logs
tail -f logs/app.log | grep ERROR

# MongoDB logs
tail -f /var/log/mongodb/mongod.log

# System logs
journalctl -u your-app-service -f
```

## Getting Help

### Log Collection
When reporting issues, please include:

1. **Application logs** with error messages
2. **System information** (OS, Node.js version, MongoDB version)
3. **Configuration** (sanitized environment variables)
4. **Steps to reproduce** the issue
5. **Expected vs actual behavior**

### Debug Mode
Enable debug mode for detailed logging:
```bash
DEBUG=* NODE_ENV=development npm start
```

### Support Channels
- **Documentation**: Check this guide and API documentation
- **GitHub Issues**: Report bugs and feature requests
- **Community Forum**: Ask questions and share solutions
- **Email Support**: For critical production issues

### Emergency Procedures

#### System Down
1. Check health endpoint: `/api/monitoring/health`
2. Review recent deployments and changes
3. Check system resources and database connectivity
4. Review error logs for critical issues
5. Implement rollback if necessary

#### Data Loss Prevention
1. Verify database backups are current
2. Check replication status (if using replica sets)
3. Document any data inconsistencies
4. Contact support before making changes

#### Security Incident
1. Immediately change all API keys and secrets
2. Review access logs for suspicious activity
3. Check for unauthorized data access
4. Implement additional security measures
5. Document incident for post-mortem analysis