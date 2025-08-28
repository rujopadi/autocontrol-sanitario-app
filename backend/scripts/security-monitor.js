#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class SecurityMonitor {
  constructor() {
    this.projectRoot = path.join(__dirname, '..');
    this.alertThresholds = {
      failedLogins: 10, // per hour
      suspiciousRequests: 50, // per hour
      errorRate: 0.1, // 10% error rate
      responseTime: 5000 // 5 seconds
    };
    this.alerts = [];
  }

  async analyzeLogFiles() {
    console.log('📋 Analyzing log files for security events...');
    
    const logsDir = path.join(this.projectRoot, 'logs');
    
    try {
      const logFiles = await fs.readdir(logsDir);
      const securityEvents = {
        failedLogins: 0,
        suspiciousRequests: 0,
        rateLimitExceeded: 0,
        blockedIPs: new Set(),
        errorCount: 0,
        totalRequests: 0
      };
      
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      
      for (const logFile of logFiles) {
        if (logFile.endsWith('.log')) {
          const logPath = path.join(logsDir, logFile);
          const logContent = await fs.readFile(logPath, 'utf8');
          const lines = logContent.split('\n');
          
          for (const line of lines) {
            if (!line.trim()) continue;
            
            try {
              const logEntry = JSON.parse(line);
              const logTime = new Date(logEntry.timestamp).getTime();
              
              // Only analyze logs from the last hour
              if (logTime < oneHourAgo) continue;
              
              securityEvents.totalRequests++;
              
              // Check for failed logins
              if (logEntry.message && logEntry.message.includes('login failed')) {
                securityEvents.failedLogins++;
              }
              
              // Check for suspicious activity
              if (logEntry.type === 'security_event') {
                if (logEntry.eventType === 'suspicious_activity_detected') {
                  securityEvents.suspiciousRequests++;
                }
                
                if (logEntry.eventType === 'rate_limit_exceeded') {
                  securityEvents.rateLimitExceeded++;
                }
                
                if (logEntry.eventType === 'blocked_ip_access') {
                  securityEvents.blockedIPs.add(logEntry.details.ip);
                }
              }
              
              // Check for errors
              if (logEntry.level === 'error') {
                securityEvents.errorCount++;
              }
              
            } catch (parseError) {
              // Skip non-JSON log lines
            }
          }
        }
      }
      
      // Generate alerts based on thresholds
      if (securityEvents.failedLogins > this.alertThresholds.failedLogins) {
        this.alerts.push({
          type: 'HIGH',
          message: `High number of failed logins: ${securityEvents.failedLogins} in the last hour`,
          recommendation: 'Check for brute force attacks and consider blocking suspicious IPs'
        });
      }
      
      if (securityEvents.suspiciousRequests > this.alertThresholds.suspiciousRequests) {
        this.alerts.push({
          type: 'HIGH',
          message: `High number of suspicious requests: ${securityEvents.suspiciousRequests} in the last hour`,
          recommendation: 'Review security logs and consider implementing additional filtering'
        });
      }
      
      const errorRate = securityEvents.totalRequests > 0 
        ? securityEvents.errorCount / securityEvents.totalRequests 
        : 0;
      
      if (errorRate > this.alertThresholds.errorRate) {
        this.alerts.push({
          type: 'MEDIUM',
          message: `High error rate: ${(errorRate * 100).toFixed(2)}% in the last hour`,
          recommendation: 'Check application logs for recurring errors'
        });
      }
      
      console.log('✅ Log analysis completed');
      return securityEvents;
      
    } catch (error) {
      console.error('❌ Error analyzing logs:', error.message);
      return null;
    }
  }

  async checkSystemSecurity() {
    console.log('🔍 Checking system security status...');
    
    const checks = {
      firewall: false,
      sslCertificate: false,
      systemUpdates: false,
      diskSpace: false,
      processStatus: false
    };
    
    try {
      // Check firewall status (UFW on Ubuntu)
      try {
        const { stdout } = await execAsync('sudo ufw status');
        checks.firewall = stdout.includes('Status: active');
      } catch (error) {
        // UFW might not be installed or accessible
      }
      
      // Check SSL certificate expiration
      const domain = process.env.FRONTEND_URL?.replace('https://', '').replace('http://', '');
      if (domain) {
        try {
          const { stdout } = await execAsync(`echo | openssl s_client -servername ${domain} -connect ${domain}:443 2>/dev/null | openssl x509 -noout -dates`);
          const expiryMatch = stdout.match(/notAfter=(.+)/);
          if (expiryMatch) {
            const expiryDate = new Date(expiryMatch[1]);
            const daysUntilExpiry = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
            
            checks.sslCertificate = daysUntilExpiry > 0;
            
            if (daysUntilExpiry < 30) {
              this.alerts.push({
                type: 'HIGH',
                message: `SSL certificate expires in ${daysUntilExpiry} days`,
                recommendation: 'Renew SSL certificate before expiration'
              });
            }
          }
        } catch (error) {
          // SSL check failed
        }
      }
      
      // Check for system updates (Ubuntu/Debian)
      try {
        const { stdout } = await execAsync('apt list --upgradable 2>/dev/null | wc -l');
        const updateCount = parseInt(stdout.trim()) - 1; // Subtract header line
        checks.systemUpdates = updateCount === 0;
        
        if (updateCount > 0) {
          this.alerts.push({
            type: 'MEDIUM',
            message: `${updateCount} system updates available`,
            recommendation: 'Apply system updates regularly for security patches'
          });
        }
      } catch (error) {
        // Update check failed
      }
      
      // Check disk space
      try {
        const { stdout } = await execAsync('df -h / | tail -1');
        const usage = stdout.split(/\s+/)[4];
        const usagePercent = parseInt(usage.replace('%', ''));
        
        checks.diskSpace = usagePercent < 90;
        
        if (usagePercent > 90) {
          this.alerts.push({
            type: 'HIGH',
            message: `Disk space usage is ${usagePercent}%`,
            recommendation: 'Free up disk space or expand storage'
          });
        }
      } catch (error) {
        // Disk space check failed
      }
      
      // Check if application process is running
      try {
        const { stdout } = await execAsync('pgrep -f "node.*server.js" || pgrep -f "pm2"');
        checks.processStatus = stdout.trim().length > 0;
        
        if (!checks.processStatus) {
          this.alerts.push({
            type: 'CRITICAL',
            message: 'Application process is not running',
            recommendation: 'Start the application service immediately'
          });
        }
      } catch (error) {
        // Process check failed
      }
      
    } catch (error) {
      console.error('❌ Error checking system security:', error.message);
    }
    
    console.log('✅ System security check completed');
    return checks;
  }

  async checkNetworkSecurity() {
    console.log('🌐 Checking network security...');
    
    const networkChecks = {
      openPorts: [],
      suspiciousConnections: [],
      dnsResolution: false
    };
    
    try {
      // Check for open ports
      const { stdout } = await execAsync('netstat -tuln');
      const lines = stdout.split('\n');
      
      for (const line of lines) {
        if (line.includes('LISTEN')) {
          const parts = line.split(/\s+/);
          const address = parts[3];
          
          if (address && !address.includes('127.0.0.1') && !address.includes('::1')) {
            networkChecks.openPorts.push(address);
          }
        }
      }
      
      // Check DNS resolution for the domain
      const domain = process.env.FRONTEND_URL?.replace('https://', '').replace('http://', '');
      if (domain) {
        try {
          await execAsync(`nslookup ${domain}`);
          networkChecks.dnsResolution = true;
        } catch (error) {
          this.alerts.push({
            type: 'MEDIUM',
            message: `DNS resolution failed for ${domain}`,
            recommendation: 'Check DNS configuration'
          });
        }
      }
      
    } catch (error) {
      console.error('❌ Error checking network security:', error.message);
    }
    
    console.log('✅ Network security check completed');
    return networkChecks;
  }

  async generateSecurityReport() {
    console.log('📊 Generating security monitoring report...');
    
    const logAnalysis = await this.analyzeLogFiles();
    const systemChecks = await this.checkSystemSecurity();
    const networkChecks = await this.checkNetworkSecurity();
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        alertLevel: this.getHighestAlertLevel(),
        totalAlerts: this.alerts.length,
        criticalAlerts: this.alerts.filter(a => a.type === 'CRITICAL').length,
        highAlerts: this.alerts.filter(a => a.type === 'HIGH').length,
        mediumAlerts: this.alerts.filter(a => a.type === 'MEDIUM').length
      },
      logAnalysis,
      systemChecks,
      networkChecks,
      alerts: this.alerts,
      recommendations: this.generateRecommendations()
    };
    
    // Save report
    const reportPath = path.join(this.projectRoot, 'security-monitoring-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📄 Security monitoring report saved to: ${reportPath}`);
    
    return report;
  }

  getHighestAlertLevel() {
    if (this.alerts.some(a => a.type === 'CRITICAL')) return 'CRITICAL';
    if (this.alerts.some(a => a.type === 'HIGH')) return 'HIGH';
    if (this.alerts.some(a => a.type === 'MEDIUM')) return 'MEDIUM';
    return 'LOW';
  }

  generateRecommendations() {
    const recommendations = [
      'Regularly review security logs for suspicious activity',
      'Keep system and application dependencies up to date',
      'Monitor SSL certificate expiration dates',
      'Implement log rotation to prevent disk space issues',
      'Set up automated alerts for critical security events',
      'Regularly backup application data and test restore procedures',
      'Review and update firewall rules periodically',
      'Monitor application performance and error rates',
      'Implement intrusion detection system for advanced threat detection',
      'Conduct regular security audits and penetration testing'
    ];
    
    return recommendations;
  }

  async sendAlerts() {
    if (this.alerts.length === 0) {
      console.log('✅ No security alerts to send');
      return;
    }
    
    console.log(`📧 Sending ${this.alerts.length} security alerts...`);
    
    // Here you would implement actual alert sending (email, Slack, etc.)
    // For now, we'll just log them
    
    const criticalAlerts = this.alerts.filter(a => a.type === 'CRITICAL');
    const highAlerts = this.alerts.filter(a => a.type === 'HIGH');
    
    if (criticalAlerts.length > 0) {
      console.log('🚨 CRITICAL ALERTS:');
      criticalAlerts.forEach(alert => {
        console.log(`  - ${alert.message}`);
        console.log(`    Recommendation: ${alert.recommendation}`);
      });
    }
    
    if (highAlerts.length > 0) {
      console.log('⚠️ HIGH PRIORITY ALERTS:');
      highAlerts.forEach(alert => {
        console.log(`  - ${alert.message}`);
        console.log(`    Recommendation: ${alert.recommendation}`);
      });
    }
  }

  async runSecurityMonitoring() {
    console.log('🚀 Starting security monitoring...\n');
    
    try {
      const report = await this.generateSecurityReport();
      await this.sendAlerts();
      
      console.log('\n📊 Security Monitoring Summary:');
      console.log(`Alert Level: ${report.summary.alertLevel}`);
      console.log(`Total Alerts: ${report.summary.totalAlerts}`);
      console.log(`Critical: ${report.summary.criticalAlerts}`);
      console.log(`High: ${report.summary.highAlerts}`);
      console.log(`Medium: ${report.summary.mediumAlerts}`);
      
      console.log('\n🎉 Security monitoring completed!');
      
      return report.summary.alertLevel !== 'CRITICAL';
      
    } catch (error) {
      console.error('❌ Security monitoring failed:', error.message);
      return false;
    }
  }
}

// CLI interface
const main = async () => {
  const monitor = new SecurityMonitor();
  const success = await monitor.runSecurityMonitoring();
  
  process.exit(success ? 0 : 1);
};

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Security monitoring failed:', error);
    process.exit(1);
  });
}

module.exports = SecurityMonitor;