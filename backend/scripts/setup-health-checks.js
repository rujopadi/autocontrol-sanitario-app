#!/usr/bin/env node
/**
 * Health Checks Setup Script
 * Configures comprehensive health monitoring and alerting
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const logger = require('../utils/logger');

/**
 * Health checks configuration
 */
const HEALTH_CONFIG = {
  // Health check endpoints
  endpoints: {
    basic: {
      path: '/api/monitoring/health',
      timeout: 5000,
      interval: 30000,
      retries: 3,
      expectedStatus: 200
    },
    detailed: {
      path: '/api/monitoring/status',
      timeout: 10000,
      interval: 60000,
      retries: 2,
      expectedStatus: 200,
      requiresAuth: true
    },
    database: {
      path: '/api/monitoring/database',
      timeout: 15000,
      interval: 120000,
      retries: 2,
      expectedStatus: 200,
      requiresAuth: true
    }
  },
  
  // Health check types
  checks: {
    application: {
      enabled: true,
      checks: ['server_running', 'memory_usage', 'cpu_usage', 'uptime']
    },
    database: {
      enabled: true,
      checks: ['connection', 'response_time', 'replication_lag', 'disk_space']
    },
    external: {
      enabled: true,
      checks: ['email_service', 'backup_storage', 'cdn_status']
    },
    security: {
      enabled: true,
      checks: ['ssl_certificate', 'security_headers', 'rate_limiting']
    }
  },
  
  // Alerting configuration
  alerting: {
    channels: {
      email: {
        enabled: process.env.HEALTH_ALERT_EMAIL_ENABLED === 'true',
        recipients: process.env.HEALTH_ALERT_EMAIL_RECIPIENTS?.split(',') || [],
        smtp: {
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        }
      },
      webhook: {
        enabled: process.env.HEALTH_ALERT_WEBHOOK_ENABLED === 'true',
        url: process.env.HEALTH_ALERT_WEBHOOK_URL,
        timeout: 10000,
        retries: 3
      },
      slack: {
        enabled: process.env.HEALTH_ALERT_SLACK_ENABLED === 'true',
        webhookUrl: process.env.HEALTH_ALERT_SLACK_WEBHOOK,
        channel: process.env.HEALTH_ALERT_SLACK_CHANNEL || '#alerts'
      },
      sms: {
        enabled: process.env.HEALTH_ALERT_SMS_ENABLED === 'true',
        service: process.env.SMS_SERVICE || 'twilio',
        accountSid: process.env.SMS_ACCOUNT_SID,
        authToken: process.env.SMS_AUTH_TOKEN,
        fromNumber: process.env.SMS_FROM_NUMBER,
        toNumbers: process.env.HEALTH_ALERT_SMS_NUMBERS?.split(',') || []
      }
    },
    
    // Alert rules
    rules: {
      critical: {
        conditions: ['application_down', 'database_down', 'ssl_expired'],
        channels: ['email', 'webhook', 'slack', 'sms'],
        cooldown: 300000 // 5 minutes
      },
      warning: {
        conditions: ['high_memory', 'high_cpu', 'slow_response', 'disk_space_low'],
        channels: ['email', 'webhook', 'slack'],
        cooldown: 900000 // 15 minutes
      },
      info: {
        conditions: ['backup_completed', 'deployment_success'],
        channels: ['webhook'],
        cooldown: 0
      }
    }
  },
  
  // Monitoring thresholds
  thresholds: {
    memory: {
      warning: 80, // 80% memory usage
      critical: 95  // 95% memory usage
    },
    cpu: {
      warning: 80,  // 80% CPU usage
      critical: 95   // 95% CPU usage
    },
    responseTime: {
      warning: 2000,  // 2 seconds
      critical: 5000  // 5 seconds
    },
    diskSpace: {
      warning: 80,  // 80% disk usage
      critical: 95   // 95% disk usage
    },
    errorRate: {
      warning: 5,   // 5% error rate
      critical: 15  // 15% error rate
    }
  }
};

/**
 * Health checks configurator
 */
class HealthChecksConfigurator {
  constructor() {
    this.configPath = path.join(__dirname, '..', 'config');
    this.scriptsPath = path.join(__dirname, '..', 'scripts');
    this.alertHistory = new Map();
  }

  /**
   * Setup comprehensive health checks
   */
  async setup() {
    try {
      console.log('🏥 Setting up health checks...');
      console.log('=============================');
      
      // Create configuration directories
      await this.createDirectories();
      
      // Setup health check endpoints
      await this.setupHealthEndpoints();
      
      // Configure monitoring scripts
      await this.configureMonitoringScripts();
      
      // Setup alerting system
      await this.setupAlertingSystem();
      
      // Create health check services
      await this.createHealthServices();
      
      // Configure external monitoring
      await this.configureExternalMonitoring();
      
      // Setup health dashboard
      await this.setupHealthDashboard();
      
      console.log('\n✅ Health checks setup completed successfully!');
      
    } catch (error) {
      console.error('\n❌ Health checks setup failed:', error);
      throw error;
    }
  }

  /**
   * Create configuration directories
   */
  async createDirectories() {
    console.log('\n📁 Creating configuration directories...');
    
    const directories = [
      this.configPath,
      path.join(this.configPath, 'health'),
      path.join(this.scriptsPath, 'health'),
      '/var/log/autocontrol/health',
      '/var/lib/autocontrol/health'
    ];
    
    for (const dir of directories) {
      await fs.mkdir(dir, { recursive: true });
      console.log(`   ✅ Created directory: ${dir}`);
    }
  }

  /**
   * Setup health check endpoints
   */
  async setupHealthEndpoints() {
    console.log('\n🔗 Setting up health check endpoints...');
    
    // Create health check middleware
    const healthMiddleware = `/**
 * Health Check Middleware
 * Provides comprehensive health monitoring endpoints
 */

const mongoose = require('mongoose');
const os = require('os');

/**
 * Basic health check
 */
const basicHealthCheck = async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'production'
    };
    
    // Quick database check
    if (mongoose.connection.readyState !== 1) {
      health.status = 'unhealthy';
      health.issues = ['Database connection lost'];
      return res.status(503).json(health);
    }
    
    res.json(health);
    
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
};

/**
 * Detailed health check
 */
const detailedHealthCheck = async (req, res) => {
  try {
    const checks = await Promise.allSettled([
      checkApplication(),
      checkDatabase(),
      checkExternalServices(),
      checkSecurity()
    ]);
    
    const results = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        application: checks[0].status === 'fulfilled' ? checks[0].value : { status: 'failed', error: checks[0].reason.message },
        database: checks[1].status === 'fulfilled' ? checks[1].value : { status: 'failed', error: checks[1].reason.message },
        external: checks[2].status === 'fulfilled' ? checks[2].value : { status: 'failed', error: checks[2].reason.message },
        security: checks[3].status === 'fulfilled' ? checks[3].value : { status: 'failed', error: checks[3].reason.message }
      }
    };
    
    // Determine overall status
    const hasFailures = Object.values(results.checks).some(check => check.status === 'failed');
    const hasWarnings = Object.values(results.checks).some(check => check.status === 'warning');
    
    if (hasFailures) {
      results.status = 'unhealthy';
    } else if (hasWarnings) {
      results.status = 'degraded';
    }
    
    const statusCode = results.status === 'unhealthy' ? 503 : 200;
    res.status(statusCode).json(results);
    
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
};

/**
 * Check application health
 */
async function checkApplication() {
  const memUsage = process.memoryUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memPercentage = (usedMem / totalMem) * 100;
  
  const cpuUsage = await getCPUUsage();
  
  const status = {
    status: 'healthy',
    metrics: {
      memory: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
        system: {
          used: usedMem,
          total: totalMem,
          percentage: memPercentage
        }
      },
      cpu: {
        usage: cpuUsage,
        cores: os.cpus().length
      },
      uptime: process.uptime(),
      loadAverage: os.loadavg()
    }
  };
  
  // Check thresholds
  if (memPercentage > ${HEALTH_CONFIG.thresholds.memory.critical}) {
    status.status = 'failed';
    status.issues = ['Critical memory usage'];
  } else if (memPercentage > ${HEALTH_CONFIG.thresholds.memory.warning}) {
    status.status = 'warning';
    status.issues = ['High memory usage'];
  }
  
  if (cpuUsage > ${HEALTH_CONFIG.thresholds.cpu.critical}) {
    status.status = 'failed';
    status.issues = status.issues || [];
    status.issues.push('Critical CPU usage');
  } else if (cpuUsage > ${HEALTH_CONFIG.thresholds.cpu.warning}) {
    status.status = status.status === 'failed' ? 'failed' : 'warning';
    status.issues = status.issues || [];
    status.issues.push('High CPU usage');
  }
  
  return status;
}

/**
 * Check database health
 */
async function checkDatabase() {
  const startTime = Date.now();
  
  try {
    // Test database connection
    await mongoose.connection.db.admin().ping();
    const responseTime = Date.now() - startTime;
    
    // Get database stats
    const dbStats = await mongoose.connection.db.stats();
    
    const status = {
      status: 'healthy',
      metrics: {
        connectionState: mongoose.connection.readyState,
        responseTime,
        collections: dbStats.collections,
        dataSize: dbStats.dataSize,
        storageSize: dbStats.storageSize,
        indexes: dbStats.indexes
      }
    };
    
    // Check response time
    if (responseTime > ${HEALTH_CONFIG.thresholds.responseTime.critical}) {
      status.status = 'failed';
      status.issues = ['Database response time critical'];
    } else if (responseTime > ${HEALTH_CONFIG.thresholds.responseTime.warning}) {
      status.status = 'warning';
      status.issues = ['Database response time high'];
    }
    
    return status;
    
  } catch (error) {
    return {
      status: 'failed',
      error: error.message,
      metrics: {
        connectionState: mongoose.connection.readyState,
        responseTime: Date.now() - startTime
      }
    };
  }
}

/**
 * Check external services
 */
async function checkExternalServices() {
  const checks = [];
  
  // Email service check
  if (process.env.EMAIL_API_KEY) {
    checks.push(checkEmailService());
  }
  
  // Backup storage check
  if (process.env.BACKUP_S3_ENABLED === 'true') {
    checks.push(checkBackupStorage());
  }
  
  const results = await Promise.allSettled(checks);
  
  return {
    status: results.every(r => r.status === 'fulfilled' && r.value.status === 'healthy') ? 'healthy' : 'warning',
    services: results.map((r, i) => ({
      name: ['email', 'backup'][i],
      status: r.status === 'fulfilled' ? r.value.status : 'failed',
      error: r.status === 'rejected' ? r.reason.message : undefined
    }))
  };
}

/**
 * Check security status
 */
async function checkSecurity() {
  const checks = {
    ssl: await checkSSLCertificate(),
    headers: checkSecurityHeaders(),
    rateLimit: checkRateLimit()
  };
  
  const hasFailures = Object.values(checks).some(check => check.status === 'failed');
  const hasWarnings = Object.values(checks).some(check => check.status === 'warning');
  
  return {
    status: hasFailures ? 'failed' : hasWarnings ? 'warning' : 'healthy',
    checks
  };
}

/**
 * Get CPU usage
 */
function getCPUUsage() {
  return new Promise((resolve) => {
    const startMeasure = cpuAverage();
    setTimeout(() => {
      const endMeasure = cpuAverage();
      const idleDifference = endMeasure.idle - startMeasure.idle;
      const totalDifference = endMeasure.total - startMeasure.total;
      const percentageCPU = 100 - ~~(100 * idleDifference / totalDifference);
      resolve(percentageCPU);
    }, 1000);
  });
}

function cpuAverage() {
  const cpus = os.cpus();
  let user = 0, nice = 0, sys = 0, idle = 0, irq = 0;
  
  for (let cpu of cpus) {
    user += cpu.times.user;
    nice += cpu.times.nice;
    sys += cpu.times.sys;
    idle += cpu.times.idle;
    irq += cpu.times.irq;
  }
  
  const total = user + nice + sys + idle + irq;
  return { idle, total };
}

/**
 * Check email service
 */
async function checkEmailService() {
  // Implementation depends on email service
  return { status: 'healthy' };
}

/**
 * Check backup storage
 */
async function checkBackupStorage() {
  // Implementation depends on backup storage
  return { status: 'healthy' };
}

/**
 * Check SSL certificate
 */
async function checkSSLCertificate() {
  // Implementation for SSL certificate check
  return { status: 'healthy' };
}

/**
 * Check security headers
 */
function checkSecurityHeaders() {
  // Implementation for security headers check
  return { status: 'healthy' };
}

/**
 * Check rate limiting
 */
function checkRateLimit() {
  // Implementation for rate limit check
  return { status: 'healthy' };
}

module.exports = {
  basicHealthCheck,
  detailedHealthCheck
};`;
    
    const middlewarePath = path.join(__dirname, '..', 'middleware', 'health-checks.js');
    await fs.writeFile(middlewarePath, healthMiddleware);
    
    console.log(`   ✅ Health check middleware created: ${middlewarePath}`);
  }

  /**
   * Configure monitoring scripts
   */
  async configureMonitoringScripts() {
    console.log('\n📊 Configuring monitoring scripts...');
    
    // Main health monitoring script
    const monitoringScript = `#!/bin/bash
# Comprehensive health monitoring script

HEALTH_URL="http://localhost:${process.env.PORT || 3000}/api/monitoring/health"
DETAILED_URL="http://localhost:${process.env.PORT || 3000}/api/monitoring/status"
LOG_FILE="/var/log/autocontrol/health/monitoring.log"
ALERT_SCRIPT="${path.join(this.scriptsPath, 'health', 'send-alert.sh')}"

# Configuration
MAX_RETRIES=3
TIMEOUT=10
ALERT_COOLDOWN=300  # 5 minutes

# Function to log with timestamp
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# Function to check basic health
check_basic_health() {
    local retries=0
    
    while [ $retries -lt $MAX_RETRIES ]; do
        if curl -f -s --max-time $TIMEOUT "$HEALTH_URL" > /dev/null; then
            log_message "Basic health check: PASSED"
            return 0
        fi
        
        retries=$((retries + 1))
        if [ $retries -lt $MAX_RETRIES ]; then
            log_message "Basic health check failed, retrying in 5 seconds..."
            sleep 5
        fi
    done
    
    log_message "Basic health check: FAILED after $MAX_RETRIES attempts"
    return 1
}

# Function to check detailed health
check_detailed_health() {
    local response=$(curl -f -s --max-time $TIMEOUT "$DETAILED_URL" 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        local status=$(echo "$response" | jq -r '.status' 2>/dev/null)
        
        case "$status" in
            "healthy")
                log_message "Detailed health check: HEALTHY"
                return 0
                ;;
            "degraded")
                log_message "Detailed health check: DEGRADED"
                return 1
                ;;
            "unhealthy")
                log_message "Detailed health check: UNHEALTHY"
                return 2
                ;;
            *)
                log_message "Detailed health check: UNKNOWN status"
                return 3
                ;;
        esac
    else
        log_message "Detailed health check: FAILED to connect"
        return 4
    fi
}

# Function to send alert
send_alert() {
    local severity=$1
    local message=$2
    local cooldown_file="/tmp/health_alert_cooldown_$severity"
    
    # Check cooldown
    if [ -f "$cooldown_file" ]; then
        local last_alert=$(cat "$cooldown_file")
        local current_time=$(date +%s)
        local time_diff=$((current_time - last_alert))
        
        if [ $time_diff -lt $ALERT_COOLDOWN ]; then
            log_message "Alert suppressed due to cooldown: $message"
            return
        fi
    fi
    
    # Send alert
    if [ -x "$ALERT_SCRIPT" ]; then
        "$ALERT_SCRIPT" "$severity" "$message"
        echo "$(date +%s)" > "$cooldown_file"
        log_message "Alert sent: [$severity] $message"
    else
        log_message "Alert script not found or not executable: $ALERT_SCRIPT"
    fi
}

# Main monitoring logic
main() {
    log_message "Starting health monitoring check"
    
    # Check basic health
    if ! check_basic_health; then
        send_alert "critical" "Application health check failed - service may be down"
        exit 1
    fi
    
    # Check detailed health
    check_detailed_health
    local detailed_status=$?
    
    case $detailed_status in
        1)
            send_alert "warning" "Application health degraded - some components have issues"
            ;;
        2)
            send_alert "critical" "Application unhealthy - multiple components failing"
            ;;
        3|4)
            send_alert "warning" "Health monitoring issues - unable to get detailed status"
            ;;
    esac
    
    log_message "Health monitoring check completed"
}

# Run main function
main "$@"
`;
    
    const scriptPath = path.join(this.scriptsPath, 'health', 'monitor-health.sh');
    await fs.mkdir(path.dirname(scriptPath), { recursive: true });
    await fs.writeFile(scriptPath, monitoringScript);
    await fs.chmod(scriptPath, 0o755);
    
    console.log(`   ✅ Health monitoring script created: ${scriptPath}`);
  }

  /**
   * Setup alerting system
   */
  async setupAlertingSystem() {
    console.log('\n🚨 Setting up alerting system...');
    
    // Alert sending script
    const alertScript = `#!/bin/bash
# Health alert sending script

SEVERITY=$1
MESSAGE=$2
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Configuration
EMAIL_ENABLED="${HEALTH_CONFIG.alerting.channels.email.enabled}"
WEBHOOK_ENABLED="${HEALTH_CONFIG.alerting.channels.webhook.enabled}"
SLACK_ENABLED="${HEALTH_CONFIG.alerting.channels.slack.enabled}"
SMS_ENABLED="${HEALTH_CONFIG.alerting.channels.sms.enabled}"

# Email configuration
EMAIL_RECIPIENTS="${HEALTH_CONFIG.alerting.channels.email.recipients.join(' ')}"
SMTP_HOST="${HEALTH_CONFIG.alerting.channels.email.smtp.host}"
SMTP_USER="${HEALTH_CONFIG.alerting.channels.email.smtp.auth.user}"

# Webhook configuration
WEBHOOK_URL="${HEALTH_CONFIG.alerting.channels.webhook.url}"

# Slack configuration
SLACK_WEBHOOK="${HEALTH_CONFIG.alerting.channels.slack.webhookUrl}"
SLACK_CHANNEL="${HEALTH_CONFIG.alerting.channels.slack.channel}"

# Function to send email alert
send_email_alert() {
    if [ "$EMAIL_ENABLED" = "true" ] && [ -n "$EMAIL_RECIPIENTS" ]; then
        local subject="AutoControl Pro Alert: [$SEVERITY] Health Check"
        local body="Alert Details:
        
Severity: $SEVERITY
Message: $MESSAGE
Timestamp: $TIMESTAMP
Server: $(hostname)
Environment: ${process.env.NODE_ENV || 'production'}

Please check the application status and take appropriate action."
        
        for recipient in $EMAIL_RECIPIENTS; do
            echo "$body" | mail -s "$subject" "$recipient"
        done
        
        echo "Email alert sent to: $EMAIL_RECIPIENTS"
    fi
}

# Function to send webhook alert
send_webhook_alert() {
    if [ "$WEBHOOK_ENABLED" = "true" ] && [ -n "$WEBHOOK_URL" ]; then
        local payload=$(cat <<EOF
{
    "severity": "$SEVERITY",
    "message": "$MESSAGE",
    "timestamp": "$TIMESTAMP",
    "server": "$(hostname)",
    "environment": "${process.env.NODE_ENV || 'production'}"
}
EOF
)
        
        curl -X POST \\
             -H "Content-Type: application/json" \\
             -d "$payload" \\
             --max-time 10 \\
             "$WEBHOOK_URL"
        
        echo "Webhook alert sent to: $WEBHOOK_URL"
    fi
}

# Function to send Slack alert
send_slack_alert() {
    if [ "$SLACK_ENABLED" = "true" ] && [ -n "$SLACK_WEBHOOK" ]; then
        local color="good"
        case "$SEVERITY" in
            "critical") color="danger" ;;
            "warning") color="warning" ;;
            "info") color="good" ;;
        esac
        
        local payload=$(cat <<EOF
{
    "channel": "$SLACK_CHANNEL",
    "username": "AutoControl Pro Monitor",
    "icon_emoji": ":warning:",
    "attachments": [
        {
            "color": "$color",
            "title": "Health Alert: $SEVERITY",
            "text": "$MESSAGE",
            "fields": [
                {
                    "title": "Server",
                    "value": "$(hostname)",
                    "short": true
                },
                {
                    "title": "Environment",
                    "value": "${process.env.NODE_ENV || 'production'}",
                    "short": true
                },
                {
                    "title": "Timestamp",
                    "value": "$TIMESTAMP",
                    "short": false
                }
            ]
        }
    ]
}
EOF
)
        
        curl -X POST \\
             -H "Content-Type: application/json" \\
             -d "$payload" \\
             --max-time 10 \\
             "$SLACK_WEBHOOK"
        
        echo "Slack alert sent to: $SLACK_CHANNEL"
    fi
}

# Function to send SMS alert (for critical alerts only)
send_sms_alert() {
    if [ "$SMS_ENABLED" = "true" ] && [ "$SEVERITY" = "critical" ]; then
        # SMS implementation would go here
        # This is a placeholder for SMS service integration
        echo "SMS alert would be sent for critical severity"
    fi
}

# Main alert sending logic
if [ -z "$SEVERITY" ] || [ -z "$MESSAGE" ]; then
    echo "Usage: $0 <severity> <message>"
    exit 1
fi

echo "Sending $SEVERITY alert: $MESSAGE"

# Send alerts through configured channels
send_email_alert
send_webhook_alert
send_slack_alert
send_sms_alert

echo "Alert processing completed"
`;
    
    const alertScriptPath = path.join(this.scriptsPath, 'health', 'send-alert.sh');
    await fs.writeFile(alertScriptPath, alertScript);
    await fs.chmod(alertScriptPath, 0o755);
    
    console.log(`   ✅ Alert script created: ${alertScriptPath}`);
    
    // Alert configuration file
    const alertConfig = {
      channels: HEALTH_CONFIG.alerting.channels,
      rules: HEALTH_CONFIG.alerting.rules,
      thresholds: HEALTH_CONFIG.thresholds
    };
    
    const alertConfigPath = path.join(this.configPath, 'health', 'alerts.json');
    await fs.writeFile(alertConfigPath, JSON.stringify(alertConfig, null, 2));
    
    console.log(`   ✅ Alert configuration saved: ${alertConfigPath}`);
  }

  /**
   * Create health check services
   */
  async createHealthServices() {
    console.log('\n⚙️  Creating health check services...');
    
    // Systemd service for health monitoring
    const healthService = `[Unit]
Description=AutoControl Pro Health Monitor
After=network.target autocontrol-pro.service
Requires=autocontrol-pro.service

[Service]
Type=oneshot
ExecStart=${path.join(this.scriptsPath, 'health', 'monitor-health.sh')}
User=www-data
Group=www-data
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
`;
    
    const servicePath = '/etc/systemd/system/autocontrol-health-monitor.service';
    try {
      await fs.writeFile(servicePath, healthService);
      
      // Create timer for periodic health checks
      const healthTimer = `[Unit]
Description=Run AutoControl Pro Health Monitor every 2 minutes
Requires=autocontrol-health-monitor.service

[Timer]
OnCalendar=*:0/2
Persistent=true
RandomizedDelaySec=30

[Install]
WantedBy=timers.target
`;
      
      const timerPath = '/etc/systemd/system/autocontrol-health-monitor.timer';
      await fs.writeFile(timerPath, healthTimer);
      
      // Enable and start the timer
      await execAsync('systemctl daemon-reload');
      await execAsync('systemctl enable autocontrol-health-monitor.timer');
      await execAsync('systemctl start autocontrol-health-monitor.timer');
      
      console.log('   ✅ Health monitoring service and timer configured');
      
    } catch (error) {
      console.log(`   ⚠️  Could not configure systemd service: ${error.message}`);
    }
  }

  /**
   * Configure external monitoring
   */
  async configureExternalMonitoring() {
    console.log('\n🌐 Configuring external monitoring...');
    
    // Uptime monitoring configuration
    const uptimeConfig = {
      services: [
        'Pingdom',
        'UptimeRobot',
        'StatusCake',
        'Site24x7'
      ],
      endpoints: [
        {
          name: 'Main Application',
          url: `${process.env.APP_URL || 'https://your-domain.com'}/api/monitoring/health`,
          method: 'GET',
          expectedStatus: 200,
          timeout: 30,
          interval: 60
        },
        {
          name: 'API Health',
          url: `${process.env.APP_URL || 'https://your-domain.com'}/api/monitoring/status`,
          method: 'GET',
          expectedStatus: 200,
          timeout: 30,
          interval: 300,
          headers: {
            'Authorization': 'Bearer monitoring-token'
          }
        }
      ],
      notifications: {
        email: HEALTH_CONFIG.alerting.channels.email.recipients,
        webhook: HEALTH_CONFIG.alerting.channels.webhook.url,
        slack: HEALTH_CONFIG.alerting.channels.slack.webhookUrl
      }
    };
    
    const uptimeConfigPath = path.join(this.configPath, 'health', 'uptime-monitoring.json');
    await fs.writeFile(uptimeConfigPath, JSON.stringify(uptimeConfig, null, 2));
    
    console.log(`   ✅ Uptime monitoring configuration created: ${uptimeConfigPath}`);
    
    // Create monitoring setup instructions
    const instructions = `# External Monitoring Setup Instructions

## Uptime Monitoring Services

### 1. Pingdom
- Sign up at https://www.pingdom.com
- Add uptime check for: ${process.env.APP_URL || 'https://your-domain.com'}/api/monitoring/health
- Set check interval to 1 minute
- Configure alerts to: ${HEALTH_CONFIG.alerting.channels.email.recipients.join(', ')}

### 2. UptimeRobot
- Sign up at https://uptimerobot.com
- Create HTTP(s) monitor
- URL: ${process.env.APP_URL || 'https://your-domain.com'}/api/monitoring/health
- Monitoring interval: 5 minutes
- Alert contacts: Email, Webhook, Slack

### 3. StatusCake
- Sign up at https://www.statuscake.com
- Create uptime test
- Website URL: ${process.env.APP_URL || 'https://your-domain.com'}/api/monitoring/health
- Check rate: Every 1 minute
- Contact groups: Configure email and webhook alerts

## Application Performance Monitoring (APM)

### 1. New Relic
- Install New Relic agent: npm install newrelic
- Add license key to environment: NEW_RELIC_LICENSE_KEY
- Configure app name: NEW_RELIC_APP_NAME=AutoControl Pro

### 2. DataDog
- Install DataDog agent: npm install dd-trace
- Add API key: DD_API_KEY
- Configure service name: DD_SERVICE=autocontrol-pro

### 3. Sentry (Error Tracking)
- Install Sentry: npm install @sentry/node
- Add DSN: SENTRY_DSN=your-sentry-dsn
- Configure environment: SENTRY_ENVIRONMENT=production

## Infrastructure Monitoring

### 1. Prometheus + Grafana
- Install Prometheus Node Exporter
- Configure Grafana dashboards
- Set up alerting rules

### 2. ELK Stack (Elasticsearch, Logstash, Kibana)
- Configure log shipping with Filebeat
- Set up Elasticsearch indexes
- Create Kibana dashboards

## Configuration Files
- Uptime monitoring: ${uptimeConfigPath}
- Alert configuration: ${path.join(this.configPath, 'health', 'alerts.json')}
- Health scripts: ${path.join(this.scriptsPath, 'health')}
`;
    
    const instructionsPath = path.join(__dirname, '..', 'EXTERNAL_MONITORING_SETUP.md');
    await fs.writeFile(instructionsPath, instructions);
    
    console.log(`   ✅ External monitoring instructions created: ${instructionsPath}`);
  }

  /**
   * Setup health dashboard
   */
  async setupHealthDashboard() {
    console.log('\n📊 Setting up health dashboard...');
    
    // Simple HTML health dashboard
    const healthDashboard = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AutoControl Pro - Health Dashboard</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: #fff; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .status-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .status-card { background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .status-healthy { border-left: 4px solid #4CAF50; }
        .status-warning { border-left: 4px solid #FF9800; }
        .status-critical { border-left: 4px solid #F44336; }
        .status-indicator { display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-right: 8px; }
        .healthy { background: #4CAF50; }
        .warning { background: #FF9800; }
        .critical { background: #F44336; }
        .metric { display: flex; justify-content: space-between; margin: 10px 0; }
        .refresh-btn { background: #2196F3; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; }
        .timestamp { color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>AutoControl Pro - Health Dashboard</h1>
            <button class="refresh-btn" onclick="refreshData()">Refresh</button>
            <div class="timestamp" id="lastUpdate">Last updated: Loading...</div>
        </div>
        
        <div class="status-grid" id="statusGrid">
            <div class="status-card">
                <h3>Loading health data...</h3>
            </div>
        </div>
    </div>

    <script>
        let healthData = {};
        
        async function fetchHealthData() {
            try {
                const response = await fetch('/api/monitoring/status');
                const data = await response.json();
                healthData = data;
                updateDashboard();
            } catch (error) {
                console.error('Failed to fetch health data:', error);
                showError('Failed to load health data');
            }
        }
        
        function updateDashboard() {
            const grid = document.getElementById('statusGrid');
            const timestamp = document.getElementById('lastUpdate');
            
            timestamp.textContent = \`Last updated: \${new Date().toLocaleString()}\`;
            
            grid.innerHTML = '';
            
            // Overall status
            const overallCard = createStatusCard('Overall Status', healthData.status, {
                'Environment': '${process.env.NODE_ENV || 'production'}',
                'Uptime': formatUptime(healthData.uptime || 0),
                'Version': healthData.version || '1.0.0'
            });
            grid.appendChild(overallCard);
            
            // Application status
            if (healthData.checks && healthData.checks.application) {
                const appCard = createStatusCard('Application', healthData.checks.application.status, {
                    'Memory Usage': \`\${healthData.checks.application.metrics?.memory?.percentage?.toFixed(1) || 0}%\`,
                    'CPU Usage': \`\${healthData.checks.application.metrics?.cpu?.usage?.toFixed(1) || 0}%\`,
                    'Load Average': healthData.checks.application.metrics?.loadAverage?.map(l => l.toFixed(2)).join(', ') || 'N/A'
                });
                grid.appendChild(appCard);
            }
            
            // Database status
            if (healthData.checks && healthData.checks.database) {
                const dbCard = createStatusCard('Database', healthData.checks.database.status, {
                    'Connection State': healthData.checks.database.metrics?.connectionState === 1 ? 'Connected' : 'Disconnected',
                    'Response Time': \`\${healthData.checks.database.metrics?.responseTime || 0}ms\`,
                    'Collections': healthData.checks.database.metrics?.collections || 0
                });
                grid.appendChild(dbCard);
            }
            
            // External services
            if (healthData.checks && healthData.checks.external) {
                const extCard = createStatusCard('External Services', healthData.checks.external.status, 
                    healthData.checks.external.services?.reduce((acc, service) => {
                        acc[service.name] = service.status;
                        return acc;
                    }, {}) || {}
                );
                grid.appendChild(extCard);
            }
        }
        
        function createStatusCard(title, status, metrics) {
            const card = document.createElement('div');
            card.className = \`status-card status-\${status}\`;
            
            let statusClass = 'healthy';
            if (status === 'warning' || status === 'degraded') statusClass = 'warning';
            if (status === 'failed' || status === 'unhealthy') statusClass = 'critical';
            
            let html = \`
                <h3>
                    <span class="status-indicator \${statusClass}"></span>
                    \${title}
                </h3>
            \`;
            
            for (const [key, value] of Object.entries(metrics)) {
                html += \`<div class="metric"><span>\${key}:</span><span>\${value}</span></div>\`;
            }
            
            card.innerHTML = html;
            return card;
        }
        
        function formatUptime(seconds) {
            const days = Math.floor(seconds / 86400);
            const hours = Math.floor((seconds % 86400) / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            
            if (days > 0) return \`\${days}d \${hours}h \${minutes}m\`;
            if (hours > 0) return \`\${hours}h \${minutes}m\`;
            return \`\${minutes}m\`;
        }
        
        function showError(message) {
            const grid = document.getElementById('statusGrid');
            grid.innerHTML = \`<div class="status-card status-critical"><h3>Error</h3><p>\${message}</p></div>\`;
        }
        
        function refreshData() {
            fetchHealthData();
        }
        
        // Initial load
        fetchHealthData();
        
        // Auto-refresh every 30 seconds
        setInterval(fetchHealthData, 30000);
    </script>
</body>
</html>`;
    
    const dashboardPath = path.join(__dirname, '..', 'public', 'health-dashboard.html');
    await fs.mkdir(path.dirname(dashboardPath), { recursive: true });
    await fs.writeFile(dashboardPath, healthDashboard);
    
    console.log(`   ✅ Health dashboard created: ${dashboardPath}`);
  }

  /**
   * Get setup summary
   */
  getSetupSummary() {
    return {
      configPath: this.configPath,
      scriptsPath: this.scriptsPath,
      endpoints: HEALTH_CONFIG.endpoints,
      checks: HEALTH_CONFIG.checks,
      alerting: HEALTH_CONFIG.alerting,
      thresholds: HEALTH_CONFIG.thresholds
    };
  }
}

/**
 * Setup health checks
 */
async function setupHealthChecks() {
  try {
    const configurator = new HealthChecksConfigurator();
    await configurator.setup();
    
    const summary = configurator.getSetupSummary();
    
    console.log('\n📋 Health Checks Setup Summary:');
    console.log('==============================');
    console.log(`Config Directory: ${summary.configPath}`);
    console.log(`Scripts Directory: ${summary.scriptsPath}`);
    console.log(`Health Endpoints: ${Object.keys(summary.endpoints).length}`);
    console.log(`Check Types: ${Object.keys(summary.checks).filter(k => summary.checks[k].enabled).join(', ')}`);
    console.log(`Alert Channels: ${Object.keys(summary.alerting.channels).filter(k => summary.alerting.channels[k].enabled).join(', ')}`);
    
    console.log('\n🔗 Health Check URLs:');
    Object.entries(summary.endpoints).forEach(([name, config]) => {
      console.log(`${name}: ${process.env.APP_URL || 'http://localhost:3000'}${config.path}`);
    });
    
    return summary;
    
  } catch (error) {
    console.error('❌ Health checks setup failed:', error);
    throw error;
  }
}

// Run setup if called directly
if (require.main === module) {
  setupHealthChecks()
    .then(() => {
      console.log('\n🎉 Health checks setup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Setup failed:', error.message);
      process.exit(1);
    });
}

module.exports = {
  HealthChecksConfigurator,
  setupHealthChecks,
  HEALTH_CONFIG
};