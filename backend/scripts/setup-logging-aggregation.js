#!/usr/bin/env node

/**
 * Logging Aggregation Setup Script
 * Configures centralized logging, log rotation, and monitoring
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class LoggingAggregationSetup {
  constructor() {
    this.appName = 'autocontrol-pro';
    this.logDir = `/var/log/${this.appName}`;
    this.configDir = path.join(__dirname, '../config');
  }

  async run() {
    console.log('📝 Setting up logging aggregation...');
    
    try {
      await this.setupLogDirectories();
      await this.configureWinston();
      await this.setupLogRotation();
      await this.configureRsyslog();
      await this.setupLogMonitoring();
      await this.createLogAnalysisScripts();
      
      console.log('✅ Logging aggregation setup completed successfully!');
      this.printLoggingInfo();
    } catch (error) {
      console.error('❌ Logging setup failed:', error.message);
      process.exit(1);
    }
  }

  async setupLogDirectories() {
    console.log('📁 Setting up log directories...');
    
    const directories = [
      this.logDir,
      `${this.logDir}/app`,
      `${this.logDir}/access`,
      `${this.logDir}/error`,
      `${this.logDir}/security`,
      `${this.logDir}/audit`,
      `${this.logDir}/performance`,
      `${this.logDir}/archived`
    ];

    for (const dir of directories) {
      try {
        await fs.mkdir(dir, { recursive: true });
        
        // Set proper permissions
        try {
          execSync(`sudo chown -R www-data:www-data ${dir}`);
          execSync(`sudo chmod -R 755 ${dir}`);
          console.log(`   ✓ Created: ${dir}`);
        } catch (error) {
          console.log(`   ⚠️  Created ${dir} but couldn't set permissions`);
        }
      } catch (error) {
        console.log(`   ❌ Failed to create ${dir}: ${error.message}`);
      }
    }
  }

  async configureWinston() {
    console.log('⚙️  Configuring Winston logging...');
    
    const winstonConfig = {
      level: 'info',
      format: {
        timestamp: true,
        errors: { stack: true },
        json: true
      },
      defaultMeta: {
        service: this.appName,
        version: '1.0.0'
      },
      transports: [
        {
          type: 'file',
          level: 'info',
          filename: `${this.logDir}/app/combined.log`,
          handleExceptions: true,
          maxsize: 10485760, // 10MB
          maxFiles: 10,
          format: 'json'
        },
        {
          type: 'file',
          level: 'error',
          filename: `${this.logDir}/error/error.log`,
          handleExceptions: true,
          handleRejections: true,
          maxsize: 10485760, // 10MB
          maxFiles: 10,
          format: 'json'
        },
        {
          type: 'file',
          level: 'warn',
          filename: `${this.logDir}/app/warnings.log`,
          maxsize: 5242880, // 5MB
          maxFiles: 5,
          format: 'json'
        },
        {
          type: 'console',
          level: 'debug',
          format: 'simple',
          colorize: true
        }
      ],
      exceptionHandlers: [
        {
          type: 'file',
          filename: `${this.logDir}/error/exceptions.log`,
          maxsize: 10485760,
          maxFiles: 5
        }
      ],
      rejectionHandlers: [
        {
          type: 'file',
          filename: `${this.logDir}/error/rejections.log`,
          maxsize: 10485760,
          maxFiles: 5
        }
      ]
    };

    await fs.mkdir(this.configDir, { recursive: true });
    const configFile = path.join(this.configDir, 'winston.json');
    await fs.writeFile(configFile, JSON.stringify(winstonConfig, null, 2));
    console.log(`   ✓ Winston configuration saved to: ${configFile}`);

    // Create custom logging service
    const loggingService = `const winston = require('winston');
const path = require('path');
const config = require('./config/winston.json');

// Custom format for structured logging
const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    return JSON.stringify({
      timestamp,
      level,
      service,
      message,
      ...meta
    });
  })
);

// Create transports based on configuration
const transports = config.transports.map(transportConfig => {
  switch (transportConfig.type) {
    case 'file':
      return new winston.transports.File({
        ...transportConfig,
        format: customFormat
      });
    case 'console':
      return new winston.transports.Console({
        ...transportConfig,
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      });
    default:
      throw new Error(\`Unknown transport type: \${transportConfig.type}\`);
  }
});

// Create logger instance
const logger = winston.createLogger({
  level: config.level,
  defaultMeta: config.defaultMeta,
  transports,
  exceptionHandlers: config.exceptionHandlers.map(handler => 
    new winston.transports.File({
      ...handler,
      format: customFormat
    })
  ),
  rejectionHandlers: config.rejectionHandlers.map(handler => 
    new winston.transports.File({
      ...handler,
      format: customFormat
    })
  ),
  exitOnError: false
});

// Add custom logging methods
logger.security = (message, meta = {}) => {
  logger.warn(message, { ...meta, category: 'security' });
};

logger.audit = (message, meta = {}) => {
  logger.info(message, { ...meta, category: 'audit' });
};

logger.performance = (message, meta = {}) => {
  logger.info(message, { ...meta, category: 'performance' });
};

logger.business = (message, meta = {}) => {
  logger.info(message, { ...meta, category: 'business' });
};

module.exports = logger;
`;

    const serviceFile = path.join(__dirname, '../services/logger.js');
    await fs.writeFile(serviceFile, loggingService);
    console.log(`   ✓ Logging service created: ${serviceFile}`);
  }

  async setupLogRotation() {
    console.log('🔄 Setting up log rotation...');
    
    const logrotateConfig = `# AutoControl Pro log rotation configuration
${this.logDir}/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    sharedscripts
    postrotate
        systemctl reload ${this.appName} > /dev/null 2>&1 || true
    endscript
}

${this.logDir}/*/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    sharedscripts
    postrotate
        systemctl reload ${this.appName} > /dev/null 2>&1 || true
    endscript
}

# Archive old logs
${this.logDir}/archived/*.log.gz {
    monthly
    missingok
    rotate 12
    compress
    delaycompress
    notifempty
}
`;

    const logrotateFile = path.join(__dirname, `../logrotate.d/${this.appName}`);
    await fs.mkdir(path.dirname(logrotateFile), { recursive: true });
    await fs.writeFile(logrotateFile, logrotateConfig);
    console.log(`   ✓ Logrotate configuration created: ${logrotateFile}`);
    
    // Copy to system logrotate directory
    try {
      execSync(`sudo cp ${logrotateFile} /etc/logrotate.d/${this.appName}`);
      console.log(`   ✓ Logrotate configuration installed to /etc/logrotate.d/`);
    } catch (error) {
      console.log(`   ⚠️  Copy ${logrotateFile} to /etc/logrotate.d/ manually`);
    }
  }

  async configureRsyslog() {
    console.log('📡 Configuring rsyslog...');
    
    const rsyslogConfig = `# AutoControl Pro rsyslog configuration
# Separate application logs by facility

# Application logs
local0.*    ${this.logDir}/app/app.log
local1.*    ${this.logDir}/access/access.log
local2.*    ${this.logDir}/error/error.log
local3.*    ${this.logDir}/security/security.log
local4.*    ${this.logDir}/audit/audit.log
local5.*    ${this.logDir}/performance/performance.log

# Stop processing these logs in other files
local0.*    stop
local1.*    stop
local2.*    stop
local3.*    stop
local4.*    stop
local5.*    stop

# Remote logging (optional)
# *.* @@log-server.example.com:514
`;

    const rsyslogFile = path.join(__dirname, `../rsyslog.d/10-${this.appName}.conf`);
    await fs.mkdir(path.dirname(rsyslogFile), { recursive: true });
    await fs.writeFile(rsyslogFile, rsyslogConfig);
    console.log(`   ✓ Rsyslog configuration created: ${rsyslogFile}`);
    
    try {
      execSync(`sudo cp ${rsyslogFile} /etc/rsyslog.d/10-${this.appName}.conf`);
      execSync('sudo systemctl restart rsyslog');
      console.log(`   ✓ Rsyslog configuration installed and restarted`);
    } catch (error) {
      console.log(`   ⚠️  Install rsyslog config manually and restart rsyslog`);
    }
  }

  async setupLogMonitoring() {
    console.log('👁️  Setting up log monitoring...');
    
    // Log monitoring script
    const monitorScript = `#!/bin/bash
# AutoControl Pro Log Monitoring Script

LOG_DIR="${this.logDir}"
ALERT_EMAIL="admin@your-domain.com"
ERROR_THRESHOLD=10
WARN_THRESHOLD=50

# Function to send alert
send_alert() {
    local subject="$1"
    local message="$2"
    echo "$message" | mail -s "$subject" "$ALERT_EMAIL"
}

# Check error log for recent errors
check_errors() {
    local error_count=$(tail -n 100 "$LOG_DIR/error/error.log" | grep "$(date '+%Y-%m-%d')" | wc -l)
    
    if [ "$error_count" -gt "$ERROR_THRESHOLD" ]; then
        send_alert "AutoControl Pro: High Error Rate" "Error count in last 100 lines: $error_count"
    fi
}

# Check for security events
check_security() {
    local security_events=$(tail -n 50 "$LOG_DIR/security/security.log" | grep "$(date '+%Y-%m-%d')" | wc -l)
    
    if [ "$security_events" -gt 5 ]; then
        send_alert "AutoControl Pro: Security Events" "Security events detected: $security_events"
    fi
}

# Check disk space
check_disk_space() {
    local disk_usage=$(df "$LOG_DIR" | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$disk_usage" -gt 80 ]; then
        send_alert "AutoControl Pro: High Disk Usage" "Log directory disk usage: $disk_usage%"
    fi
}

# Check log file sizes
check_log_sizes() {
    find "$LOG_DIR" -name "*.log" -size +100M -exec basename {} \\; | while read file; do
        send_alert "AutoControl Pro: Large Log File" "Log file $file is larger than 100MB"
    done
}

# Run checks
check_errors
check_security
check_disk_space
check_log_sizes

echo "Log monitoring check completed at $(date)"
`;

    const monitorFile = path.join(__dirname, 'log-monitor.sh');
    await fs.writeFile(monitorFile, monitorScript);
    await fs.chmod(monitorFile, 0o755);
    console.log(`   ✓ Log monitoring script created: ${monitorFile}`);

    // Create cron job for log monitoring
    const cronJob = `# AutoControl Pro log monitoring
*/15 * * * * ${monitorFile} >> ${this.logDir}/monitoring.log 2>&1
`;

    const cronFile = path.join(__dirname, `../cron.d/${this.appName}-monitoring`);
    await fs.mkdir(path.dirname(cronFile), { recursive: true });
    await fs.writeFile(cronFile, cronJob);
    console.log(`   ✓ Cron job created: ${cronFile}`);
  }

  async createLogAnalysisScripts() {
    console.log('📊 Creating log analysis scripts...');
    
    // Error analysis script
    const errorAnalysisScript = `#!/bin/bash
# Error Analysis Script

LOG_DIR="${this.logDir}"
DATE_FILTER=\${1:-$(date '+%Y-%m-%d')}

echo "AutoControl Pro Error Analysis for $DATE_FILTER"
echo "================================================"

echo ""
echo "Error Summary:"
echo "--------------"
grep "$DATE_FILTER" "$LOG_DIR/error/error.log" | jq -r '.level' | sort | uniq -c | sort -nr

echo ""
echo "Top Error Messages:"
echo "-------------------"
grep "$DATE_FILTER" "$LOG_DIR/error/error.log" | jq -r '.message' | sort | uniq -c | sort -nr | head -10

echo ""
echo "Error Timeline:"
echo "---------------"
grep "$DATE_FILTER" "$LOG_DIR/error/error.log" | jq -r '[.timestamp, .level, .message] | @tsv' | head -20

echo ""
echo "Security Events:"
echo "----------------"
grep "$DATE_FILTER" "$LOG_DIR/security/security.log" | jq -r '[.timestamp, .message] | @tsv' | head -10
`;

    // Performance analysis script
    const performanceAnalysisScript = `#!/bin/bash
# Performance Analysis Script

LOG_DIR="${this.logDir}"
DATE_FILTER=\${1:-$(date '+%Y-%m-%d')}

echo "AutoControl Pro Performance Analysis for $DATE_FILTER"
echo "======================================================"

echo ""
echo "Response Time Statistics:"
echo "-------------------------"
grep "$DATE_FILTER" "$LOG_DIR/performance/performance.log" | jq -r '.responseTime' | awk '
{
    sum += $1
    count++
    if ($1 > max) max = $1
    if (min == "" || $1 < min) min = $1
}
END {
    if (count > 0) {
        print "Count: " count
        print "Average: " sum/count "ms"
        print "Min: " min "ms"
        print "Max: " max "ms"
    }
}'

echo ""
echo "Slowest Endpoints:"
echo "------------------"
grep "$DATE_FILTER" "$LOG_DIR/performance/performance.log" | jq -r '[.endpoint, .responseTime] | @tsv' | sort -k2 -nr | head -10

echo ""
echo "Memory Usage:"
echo "-------------"
grep "$DATE_FILTER" "$LOG_DIR/performance/performance.log" | jq -r '.memoryUsage' | tail -20
`;

    // Access log analysis script
    const accessAnalysisScript = `#!/bin/bash
# Access Log Analysis Script

LOG_DIR="${this.logDir}"
DATE_FILTER=\${1:-$(date '+%Y-%m-%d')}

echo "AutoControl Pro Access Analysis for $DATE_FILTER"
echo "================================================="

echo ""
echo "Request Summary:"
echo "----------------"
grep "$DATE_FILTER" "$LOG_DIR/access/access.log" | jq -r '.method' | sort | uniq -c | sort -nr

echo ""
echo "Status Code Distribution:"
echo "-------------------------"
grep "$DATE_FILTER" "$LOG_DIR/access/access.log" | jq -r '.statusCode' | sort | uniq -c | sort -nr

echo ""
echo "Top Endpoints:"
echo "--------------"
grep "$DATE_FILTER" "$LOG_DIR/access/access.log" | jq -r '.url' | sort | uniq -c | sort -nr | head -10

echo ""
echo "Top User Agents:"
echo "----------------"
grep "$DATE_FILTER" "$LOG_DIR/access/access.log" | jq -r '.userAgent' | sort | uniq -c | sort -nr | head -5

echo ""
echo "IP Address Summary:"
echo "-------------------"
grep "$DATE_FILTER" "$LOG_DIR/access/access.log" | jq -r '.ip' | sort | uniq -c | sort -nr | head -10
`;

    const scripts = [
      { name: 'analyze-errors.sh', content: errorAnalysisScript },
      { name: 'analyze-performance.sh', content: performanceAnalysisScript },
      { name: 'analyze-access.sh', content: accessAnalysisScript }
    ];

    const scriptsDir = path.join(__dirname, 'log-analysis');
    await fs.mkdir(scriptsDir, { recursive: true });

    for (const script of scripts) {
      const scriptPath = path.join(scriptsDir, script.name);
      await fs.writeFile(scriptPath, script.content);
      await fs.chmod(scriptPath, 0o755);
      console.log(`   ✓ Created: ${script.name}`);
    }

    console.log(`   📁 Analysis scripts saved to: ${scriptsDir}`);
  }

  printLoggingInfo() {
    console.log('\\n' + '='.repeat(60));
    console.log('📝 LOGGING CONFIGURATION SUMMARY');
    console.log('='.repeat(60));
    
    console.log('\\n📁 Log Directories:');
    console.log(`   Main: ${this.logDir}`);
    console.log(`   App logs: ${this.logDir}/app/`);
    console.log(`   Error logs: ${this.logDir}/error/`);
    console.log(`   Access logs: ${this.logDir}/access/`);
    console.log(`   Security logs: ${this.logDir}/security/`);
    console.log(`   Audit logs: ${this.logDir}/audit/`);
    console.log(`   Performance logs: ${this.logDir}/performance/`);
    
    console.log('\\n⚙️  Configuration Files:');
    console.log(`   Winston config: ${this.configDir}/winston.json`);
    console.log(`   Logrotate config: /etc/logrotate.d/${this.appName}`);
    console.log(`   Rsyslog config: /etc/rsyslog.d/10-${this.appName}.conf`);
    
    console.log('\\n📊 Analysis Scripts:');
    console.log(`   ./scripts/log-analysis/analyze-errors.sh [date]`);
    console.log(`   ./scripts/log-analysis/analyze-performance.sh [date]`);
    console.log(`   ./scripts/log-analysis/analyze-access.sh [date]`);
    
    console.log('\\n👁️  Monitoring:');
    console.log(`   Monitor script: ./scripts/log-monitor.sh`);
    console.log(`   Runs every 15 minutes via cron`);
    console.log(`   Alerts sent to: admin@your-domain.com`);
    
    console.log('\\n📋 Useful Commands:');
    console.log(`   tail -f ${this.logDir}/app/combined.log     # Follow app logs`);
    console.log(`   tail -f ${this.logDir}/error/error.log     # Follow error logs`);
    console.log(`   journalctl -u ${this.appName} -f           # Follow systemd logs`);
    console.log(`   logrotate -f /etc/logrotate.d/${this.appName}  # Force log rotation`);
    
    console.log('\\n' + '='.repeat(60));
  }
}

// Run if called directly
if (require.main === module) {
  const setup = new LoggingAggregationSetup();
  setup.run().catch(error => {
    console.error('Setup failed:', error);
    process.exit(1);
  });
}

module.exports = LoggingAggregationSetup;