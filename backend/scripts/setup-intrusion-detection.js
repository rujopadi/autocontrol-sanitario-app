#!/usr/bin/env node
/**
 * Intrusion Detection Setup Script
 * Configures comprehensive intrusion detection and prevention systems
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const logger = require('../utils/logger');

/**
 * Intrusion detection configuration
 */
const IDS_CONFIG = {
  // Fail2Ban configuration
  fail2ban: {
    enabled: true,
    banTime: 3600,        // 1 hour
    findTime: 600,        // 10 minutes
    maxRetry: 5,
    jails: {
      sshd: { enabled: true, maxRetry: 3, banTime: 1800 },
      nginx: { enabled: true, maxRetry: 3, banTime: 3600 },
      autocontrol: { enabled: true, maxRetry: 5, banTime: 3600 }
    }
  },
  
  // OSSEC HIDS configuration
  ossec: {
    enabled: process.env.OSSEC_ENABLED === 'true',
    serverIP: process.env.OSSEC_SERVER_IP,
    agentKey: process.env.OSSEC_AGENT_KEY
  },
  
  // Custom detection rules
  customRules: {
    enabled: true,
    rules: [
      {
        name: 'sql_injection',
        pattern: '(union|select|insert|delete|update|drop|create|alter).*from',
        action: 'block',
        severity: 'high'
      },
      {
        name: 'xss_attempt',
        pattern: '<script|javascript:|onload=|onerror=',
        action: 'block',
        severity: 'high'
      },
      {
        name: 'path_traversal',
        pattern: '\\.\\./|\\.\\.\\\|%2e%2e%2f|%2e%2e%5c',
        action: 'block',
        severity: 'medium'
      },
      {
        name: 'brute_force',
        pattern: 'authentication_failed',
        threshold: 10,
        timeWindow: 300,
        action: 'block',
        severity: 'high'
      }
    ]
  },
  
  // Real-time monitoring
  realTimeMonitoring: {
    enabled: true,
    logFiles: [
      '/var/log/auth.log',
      '/var/log/nginx/access.log',
      '/var/log/nginx/error.log',
      '/var/log/autocontrol/app.log',
      '/var/log/autocontrol/security.log'
    ],
    alertThresholds: {
      failedLogins: 5,
      suspiciousRequests: 10,
      errorRate: 15
    }
  }
};

/**
 * Intrusion detection configurator
 */
class IntrusionDetectionConfigurator {
  constructor() {
    this.configPath = path.join(__dirname, '..', 'config', 'ids');
    this.scriptsPath = path.join(__dirname, '..', 'scripts', 'ids');
    this.logPath = '/var/log/autocontrol/security';
  }

  /**
   * Setup complete intrusion detection system
   */
  async setup() {
    try {
      console.log('🛡️  Setting up intrusion detection system...');
      console.log('============================================');
      
      // Create directories
      await this.createDirectories();
      
      // Setup Fail2Ban
      await this.setupFail2Ban();
      
      // Setup custom detection rules
      await this.setupCustomDetection();
      
      // Setup real-time monitoring
      await this.setupRealTimeMonitoring();
      
      // Setup OSSEC if enabled
      if (IDS_CONFIG.ossec.enabled) {
        await this.setupOSSEC();
      }
      
      // Create management scripts
      await this.createManagementScripts();
      
      // Setup alerting
      await this.setupAlerting();
      
      console.log('\n✅ Intrusion detection system setup completed!');
      
    } catch (error) {
      console.error('\n❌ Intrusion detection setup failed:', error);
      throw error;
    }
  }

  /**
   * Create necessary directories
   */
  async createDirectories() {
    console.log('\n📁 Creating IDS directories...');
    
    const directories = [
      this.configPath,
      this.scriptsPath,
      this.logPath,
      '/var/lib/autocontrol/ids'
    ];
    
    for (const dir of directories) {
      await fs.mkdir(dir, { recursive: true });
      await fs.chmod(dir, 0o750);
      console.log(`   ✅ Created directory: ${dir}`);
    }
  }

  /**
   * Setup Fail2Ban with custom jails
   */
  async setupFail2Ban() {
    console.log('\n🚫 Setting up Fail2Ban...');
    
    if (!IDS_CONFIG.fail2ban.enabled) {
      console.log('   ⚠️  Fail2Ban disabled in configuration');
      return;
    }
    
    try {
      // Install Fail2Ban
      await execAsync('sudo apt-get update && sudo apt-get install -y fail2ban');
      
      // Create custom jail configuration
      const jailConfig = this.generateFail2BanConfig();
      await fs.writeFile('/etc/fail2ban/jail.local', jailConfig);
      
      // Create custom filters
      await this.createFail2BanFilters();
      
      // Start and enable Fail2Ban
      await execAsync('sudo systemctl enable fail2ban');
      await execAsync('sudo systemctl restart fail2ban');
      
      console.log('   ✅ Fail2Ban configured and started');
      
      // Show status
      const status = await execAsync('sudo fail2ban-client status');
      console.log('   📊 Fail2Ban status:');
      console.log(status.stdout);
      
    } catch (error) {
      console.log(`   ❌ Fail2Ban setup failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate Fail2Ban configuration
   */
  generateFail2BanConfig() {
    const config = IDS_CONFIG.fail2ban;
    
    return `[DEFAULT]
bantime = ${config.banTime}
findtime = ${config.findTime}
maxretry = ${config.maxRetry}
backend = auto
usedns = warn
logencoding = auto
enabled = false
mode = normal
filter = %(__name__)s[mode=%(mode)s]
destemail = ${process.env.SECURITY_ALERT_EMAIL || 'admin@your-domain.com'}
sender = fail2ban@${require('os').hostname()}
mta = sendmail
action = %(action_mwl)s

[sshd]
enabled = ${config.jails.sshd.enabled}
port = ${process.env.SSH_PORT || 22}
filter = sshd
logpath = /var/log/auth.log
maxretry = ${config.jails.sshd.maxRetry}
bantime = ${config.jails.sshd.banTime}

[nginx-http-auth]
enabled = ${config.jails.nginx.enabled}
filter = nginx-http-auth
logpath = /var/log/nginx/error.log
maxretry = ${config.jails.nginx.maxRetry}
bantime = ${config.jails.nginx.banTime}

[nginx-limit-req]
enabled = ${config.jails.nginx.enabled}
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
maxretry = 10
findtime = 600
bantime = 7200

[nginx-badbots]
enabled = ${config.jails.nginx.enabled}
filter = nginx-badbots
logpath = /var/log/nginx/access.log
maxretry = 2
bantime = 86400

[autocontrol-auth]
enabled = ${config.jails.autocontrol.enabled}
filter = autocontrol-auth
logpath = /var/log/autocontrol/security.log
maxretry = ${config.jails.autocontrol.maxRetry}
findtime = 300
bantime = ${config.jails.autocontrol.banTime}

[autocontrol-abuse]
enabled = ${config.jails.autocontrol.enabled}
filter = autocontrol-abuse
logpath = /var/log/nginx/access.log
maxretry = 20
findtime = 300
bantime = 3600
`;
  }

  /**
   * Create custom Fail2Ban filters
   */
  async createFail2BanFilters() {
    console.log('\n   🔍 Creating custom Fail2Ban filters...');
    
    // AutoControl authentication filter
    const authFilter = `[Definition]
failregex = ^.*"ip":"<HOST>".*"event":"authentication_failed".*$
            ^.*Authentication failed for IP <HOST>.*$
            ^.*Invalid login attempt from <HOST>.*$
            ^.*Brute force attempt detected from <HOST>.*$
ignoreregex =
`;
    
    await fs.writeFile('/etc/fail2ban/filter.d/autocontrol-auth.conf', authFilter);
    
    // AutoControl abuse filter
    const abuseFilter = `[Definition]
failregex = ^<HOST> -.*"(GET|POST).*".*"(union|select|script|alert|drop|delete|insert|update)".*$
            ^<HOST> -.*"(GET|POST).*(\\.\\./).*".*$
            ^<HOST> -.*"(GET|POST).*(cmd=|exec=|system=).*".*$
            ^<HOST> -.*"(GET|POST).*(<script|javascript:|onload=|onerror=).*".*$
ignoreregex =
`;
    
    await fs.writeFile('/etc/fail2ban/filter.d/autocontrol-abuse.conf', abuseFilter);
    
    // Nginx bad bots filter
    const badBotsFilter = `[Definition]
failregex = ^<HOST> -.*"(GET|POST).*HTTP.*".*".*(?:bot|crawler|spider|scraper|scanner).*"$
            ^<HOST> -.*"(GET|POST).*HTTP.*".*".*(?:sqlmap|nmap|nikto|dirb|gobuster).*"$
ignoreregex =
`;
    
    await fs.writeFile('/etc/fail2ban/filter.d/nginx-badbots.conf', badBotsFilter);
    
    console.log('   ✅ Custom Fail2Ban filters created');
  }

  /**
   * Setup custom detection rules
   */
  async setupCustomDetection() {
    console.log('\n🔧 Setting up custom detection rules...');
    
    if (!IDS_CONFIG.customRules.enabled) {
      console.log('   ⚠️  Custom rules disabled in configuration');
      return;
    }
    
    // Create custom detection script
    const detectionScript = `#!/bin/bash
# Custom intrusion detection script

LOG_FILE="${this.logPath}/custom-detection.log"
ALERT_EMAIL="${process.env.SECURITY_ALERT_EMAIL || 'admin@your-domain.com'}"
NGINX_LOG="/var/log/nginx/access.log"
APP_LOG="/var/log/autocontrol/app.log"

# Function to check for SQL injection attempts
check_sql_injection() {
    local count=$(grep -i -E "(union|select|insert|delete|update|drop|create|alter).*from" "$NGINX_LOG" | grep "$(date '+%d/%b/%Y')" | wc -l)
    
    if [ "$count" -gt 0 ]; then
        echo "$(date): SQL injection attempts detected: $count" >> "$LOG_FILE"
        
        # Extract attacking IPs
        local attacking_ips=$(grep -i -E "(union|select|insert|delete|update|drop|create|alter).*from" "$NGINX_LOG" | grep "$(date '+%d/%b/%Y')" | awk '{print $1}' | sort | uniq)
        
        # Block attacking IPs
        for ip in $attacking_ips; do
            sudo ufw deny from "$ip" comment "SQL injection attempt"
            echo "$(date): Blocked IP $ip for SQL injection attempt" >> "$LOG_FILE"
        done
        
        # Send alert
        echo "SQL injection attempts detected and blocked.
        
Attacking IPs: $attacking_ips
Count: $count
Time: $(date)

Check log file: $LOG_FILE" | mail -s "Security Alert: SQL Injection Attempts" "$ALERT_EMAIL"
    fi
}

# Function to check for XSS attempts
check_xss_attempts() {
    local count=$(grep -i -E "(<script|javascript:|onload=|onerror=)" "$NGINX_LOG" | grep "$(date '+%d/%b/%Y')" | wc -l)
    
    if [ "$count" -gt 0 ]; then
        echo "$(date): XSS attempts detected: $count" >> "$LOG_FILE"
        
        local attacking_ips=$(grep -i -E "(<script|javascript:|onload=|onerror=)" "$NGINX_LOG" | grep "$(date '+%d/%b/%Y')" | awk '{print $1}' | sort | uniq)
        
        for ip in $attacking_ips; do
            sudo ufw deny from "$ip" comment "XSS attempt"
            echo "$(date): Blocked IP $ip for XSS attempt" >> "$LOG_FILE"
        done
        
        echo "XSS attempts detected and blocked.
        
Attacking IPs: $attacking_ips
Count: $count
Time: $(date)" | mail -s "Security Alert: XSS Attempts" "$ALERT_EMAIL"
    fi
}

# Function to check for path traversal attempts
check_path_traversal() {
    local count=$(grep -E "(\\.\\./|\\.\\.\\\|%2e%2e%2f|%2e%2e%5c)" "$NGINX_LOG" | grep "$(date '+%d/%b/%Y')" | wc -l)
    
    if [ "$count" -gt 0 ]; then
        echo "$(date): Path traversal attempts detected: $count" >> "$LOG_FILE"
        
        local attacking_ips=$(grep -E "(\\.\\./|\\.\\.\\\|%2e%2e%2f|%2e%2e%5c)" "$NGINX_LOG" | grep "$(date '+%d/%b/%Y')" | awk '{print $1}' | sort | uniq)
        
        for ip in $attacking_ips; do
            sudo ufw deny from "$ip" comment "Path traversal attempt"
            echo "$(date): Blocked IP $ip for path traversal attempt" >> "$LOG_FILE"
        done
    fi
}

# Function to check for brute force attempts
check_brute_force() {
    local count=$(grep "authentication_failed" "$APP_LOG" | grep "$(date '+%Y-%m-%d')" | wc -l)
    
    if [ "$count" -gt 10 ]; then
        echo "$(date): Brute force attempts detected: $count" >> "$LOG_FILE"
        
        # Extract attacking IPs from app log
        local attacking_ips=$(grep "authentication_failed" "$APP_LOG" | grep "$(date '+%Y-%m-%d')" | grep -o '"ip":"[^"]*"' | cut -d'"' -f4 | sort | uniq -c | sort -nr | head -5)
        
        echo "Brute force attempts detected.
        
Failed login attempts: $count
Top attacking IPs:
$attacking_ips
Time: $(date)" | mail -s "Security Alert: Brute Force Attempts" "$ALERT_EMAIL"
    fi
}

# Run all detection checks
check_sql_injection
check_xss_attempts
check_path_traversal
check_brute_force

echo "$(date): Custom detection scan completed" >> "$LOG_FILE"
`;
    
    const scriptPath = path.join(this.scriptsPath, 'custom-detection.sh');
    await fs.writeFile(scriptPath, detectionScript);
    await fs.chmod(scriptPath, 0o755);
    
    // Setup cron job for custom detection
    const cronJob = `*/5 * * * * ${scriptPath}`;
    await fs.writeFile('/tmp/ids-cron', cronJob);
    await execAsync('crontab /tmp/ids-cron');
    await fs.unlink('/tmp/ids-cron');
    
    console.log(`   ✅ Custom detection rules configured: ${scriptPath}`);
  }  /
**
   * Setup real-time monitoring
   */
  async setupRealTimeMonitoring() {
    console.log('\n📊 Setting up real-time monitoring...');
    
    if (!IDS_CONFIG.realTimeMonitoring.enabled) {
      console.log('   ⚠️  Real-time monitoring disabled in configuration');
      return;
    }
    
    // Create real-time monitoring script
    const monitoringScript = `#!/bin/bash
# Real-time log monitoring for intrusion detection

SECURITY_LOG="${this.logPath}/realtime-monitor.log"
ALERT_EMAIL="${process.env.SECURITY_ALERT_EMAIL || 'admin@your-domain.com'}"
PID_FILE="/var/run/autocontrol-monitor.pid"

# Check if already running
if [ -f "$PID_FILE" ]; then
    if ps -p $(cat "$PID_FILE") > /dev/null 2>&1; then
        echo "Real-time monitoring already running"
        exit 0
    else
        rm "$PID_FILE"
    fi
fi

# Write PID file
echo $$ > "$PID_FILE"

# Function to handle termination
cleanup() {
    echo "$(date): Stopping real-time monitoring" >> "$SECURITY_LOG"
    rm -f "$PID_FILE"
    exit 0
}

trap cleanup SIGTERM SIGINT

echo "$(date): Starting real-time monitoring" >> "$SECURITY_LOG"

# Monitor authentication failures
monitor_auth_failures() {
    tail -F /var/log/auth.log | while read line; do
        if echo "$line" | grep -q "authentication failure\\|Failed password\\|Invalid user"; then
            echo "$(date): Auth failure detected: $line" >> "$SECURITY_LOG"
            
            # Extract IP if possible
            local ip=$(echo "$line" | grep -o '[0-9]\\{1,3\\}\\.[0-9]\\{1,3\\}\\.[0-9]\\{1,3\\}\\.[0-9]\\{1,3\\}')
            
            if [ -n "$ip" ]; then
                # Count recent failures from this IP
                local recent_failures=$(grep "$ip" "$SECURITY_LOG" | grep "$(date '+%Y-%m-%d')" | wc -l)
                
                if [ "$recent_failures" -gt ${IDS_CONFIG.realTimeMonitoring.alertThresholds.failedLogins} ]; then
                    echo "High number of auth failures from $ip: $recent_failures" | \\
                    mail -s "Security Alert: Auth Failures from $ip" "$ALERT_EMAIL"
                fi
            fi
        fi
    done &
}

# Monitor nginx access log for suspicious activity
monitor_nginx_access() {
    tail -F /var/log/nginx/access.log | while read line; do
        # Check for suspicious patterns
        if echo "$line" | grep -i -E "(union|select|script|alert|drop|delete|insert|update|\\.\\./)"; then
            echo "$(date): Suspicious request detected: $line" >> "$SECURITY_LOG"
            
            local ip=$(echo "$line" | awk '{print $1}')
            echo "Suspicious request from $ip: $line" | \\
            mail -s "Security Alert: Suspicious Request" "$ALERT_EMAIL"
        fi
        
        # Check for high error rates
        if echo "$line" | grep -E " (4[0-9][0-9]|5[0-9][0-9]) "; then
            echo "$(date): HTTP error detected: $line" >> "$SECURITY_LOG"
        fi
    done &
}

# Monitor application logs
monitor_app_logs() {
    tail -F /var/log/autocontrol/app.log | while read line; do
        if echo "$line" | grep -i "error\\|exception\\|failed\\|unauthorized"; then
            echo "$(date): App error detected: $line" >> "$SECURITY_LOG"
        fi
        
        if echo "$line" | grep -i "authentication_failed"; then
            echo "$(date): App auth failure: $line" >> "$SECURITY_LOG"
        fi
    done &
}

# Start monitoring processes
monitor_auth_failures
monitor_nginx_access
monitor_app_logs

# Keep script running
while true; do
    sleep 60
    
    # Check if monitoring processes are still running
    if ! pgrep -f "tail -F /var/log/auth.log" > /dev/null; then
        echo "$(date): Auth monitoring stopped, restarting..." >> "$SECURITY_LOG"
        monitor_auth_failures
    fi
    
    if ! pgrep -f "tail -F /var/log/nginx/access.log" > /dev/null; then
        echo "$(date): Nginx monitoring stopped, restarting..." >> "$SECURITY_LOG"
        monitor_nginx_access
    fi
    
    if ! pgrep -f "tail -F /var/log/autocontrol/app.log" > /dev/null; then
        echo "$(date): App monitoring stopped, restarting..." >> "$SECURITY_LOG"
        monitor_app_logs
    fi
done
`;
    
    const monitorScriptPath = path.join(this.scriptsPath, 'realtime-monitor.sh');
    await fs.writeFile(monitorScriptPath, monitoringScript);
    await fs.chmod(monitorScriptPath, 0o755);
    
    // Create systemd service for real-time monitoring
    const serviceConfig = `[Unit]
Description=AutoControl Pro Real-time Security Monitor
After=network.target

[Service]
Type=simple
ExecStart=${monitorScriptPath}
ExecStop=/bin/kill -TERM $MAINPID
Restart=always
RestartSec=10
User=root
Group=root
PIDFile=/var/run/autocontrol-monitor.pid

[Install]
WantedBy=multi-user.target
`;
    
    try {
      await fs.writeFile('/etc/systemd/system/autocontrol-monitor.service', serviceConfig);
      await execAsync('sudo systemctl daemon-reload');
      await execAsync('sudo systemctl enable autocontrol-monitor');
      await execAsync('sudo systemctl start autocontrol-monitor');
      
      console.log('   ✅ Real-time monitoring service configured and started');
    } catch (error) {
      console.log(`   ⚠️  Could not configure systemd service: ${error.message}`);
    }
  }

  /**
   * Setup OSSEC HIDS
   */
  async setupOSSEC() {
    console.log('\n🔍 Setting up OSSEC HIDS...');
    
    try {
      // Install OSSEC agent
      await execAsync('wget -q -O - https://updates.atomicorp.com/installers/atomic | sudo bash');
      await execAsync('sudo apt-get install -y ossec-hids-agent');
      
      // Configure OSSEC agent
      const ossecConfig = `<ossec_config>
  <client>
    <server-ip>${IDS_CONFIG.ossec.serverIP}</server-ip>
  </client>

  <localfile>
    <log_format>syslog</log_format>
    <location>/var/log/auth.log</location>
  </localfile>

  <localfile>
    <log_format>apache</log_format>
    <location>/var/log/nginx/access.log</location>
  </localfile>

  <localfile>
    <log_format>apache</log_format>
    <location>/var/log/nginx/error.log</location>
  </localfile>

  <localfile>
    <log_format>syslog</log_format>
    <location>/var/log/autocontrol/app.log</location>
  </localfile>

  <rootcheck>
    <disabled>no</disabled>
    <check_files>yes</check_files>
    <check_trojans>yes</check_trojans>
    <check_dev>yes</check_dev>
    <check_sys>yes</check_sys>
    <check_pids>yes</check_pids>
    <check_ports>yes</check_ports>
    <check_if>yes</check_if>
  </rootcheck>

  <syscheck>
    <disabled>no</disabled>
    <frequency>7200</frequency>
    <directories check_all="yes">/etc,/usr/bin,/usr/sbin</directories>
    <directories check_all="yes">/bin,/sbin</directories>
    <directories check_all="yes">/var/www/autocontrol-pro</directories>
    <directories check_all="yes">/etc/autocontrol</directories>
  </syscheck>
</ossec_config>
`;
      
      await fs.writeFile('/var/ossec/etc/ossec.conf', ossecConfig);
      
      // Import agent key if provided
      if (IDS_CONFIG.ossec.agentKey) {
        await fs.writeFile('/tmp/agent.key', IDS_CONFIG.ossec.agentKey);
        await execAsync('sudo /var/ossec/bin/manage_agents -i /tmp/agent.key');
        await fs.unlink('/tmp/agent.key');
      }
      
      // Start OSSEC agent
      await execAsync('sudo systemctl enable ossec');
      await execAsync('sudo systemctl start ossec');
      
      console.log('   ✅ OSSEC HIDS configured and started');
      
    } catch (error) {
      console.log(`   ⚠️  OSSEC setup failed: ${error.message}`);
    }
  }

  /**
   * Create management scripts
   */
  async createManagementScripts() {
    console.log('\n🛠️  Creating IDS management scripts...');
    
    // IDS status script
    const statusScript = `#!/bin/bash
# IDS status check script

echo "=== AutoControl Pro Intrusion Detection System Status ==="
echo "Date: $(date)"
echo ""

# Check Fail2Ban status
echo "=== Fail2Ban Status ==="
if systemctl is-active fail2ban >/dev/null 2>&1; then
    echo "✅ Fail2Ban is running"
    sudo fail2ban-client status
else
    echo "❌ Fail2Ban is not running"
fi
echo ""

# Check real-time monitoring
echo "=== Real-time Monitoring ==="
if systemctl is-active autocontrol-monitor >/dev/null 2>&1; then
    echo "✅ Real-time monitoring is running"
else
    echo "❌ Real-time monitoring is not running"
fi
echo ""

# Check OSSEC if enabled
if systemctl is-active ossec >/dev/null 2>&1; then
    echo "=== OSSEC HIDS ==="
    echo "✅ OSSEC is running"
    sudo /var/ossec/bin/ossec-control status
else
    echo "=== OSSEC HIDS ==="
    echo "⚠️  OSSEC is not running or not installed"
fi
echo ""

# Show recent security events
echo "=== Recent Security Events ==="
tail -20 ${this.logPath}/custom-detection.log 2>/dev/null || echo "No recent events"
echo ""

# Show blocked IPs
echo "=== Currently Blocked IPs ==="
sudo ufw status | grep DENY || echo "No blocked IPs"
`;
    
    const statusScriptPath = path.join(this.scriptsPath, 'ids-status.sh');
    await fs.writeFile(statusScriptPath, statusScript);
    await fs.chmod(statusScriptPath, 0o755);
    
    // IDS management script
    const managementScript = `#!/bin/bash
# IDS management script

ACTION=$1
TARGET=$2

case "$ACTION" in
    "start")
        echo "Starting IDS services..."
        sudo systemctl start fail2ban
        sudo systemctl start autocontrol-monitor
        [ -f /etc/systemd/system/ossec.service ] && sudo systemctl start ossec
        echo "IDS services started"
        ;;
    "stop")
        echo "Stopping IDS services..."
        sudo systemctl stop fail2ban
        sudo systemctl stop autocontrol-monitor
        [ -f /etc/systemd/system/ossec.service ] && sudo systemctl stop ossec
        echo "IDS services stopped"
        ;;
    "restart")
        echo "Restarting IDS services..."
        sudo systemctl restart fail2ban
        sudo systemctl restart autocontrol-monitor
        [ -f /etc/systemd/system/ossec.service ] && sudo systemctl restart ossec
        echo "IDS services restarted"
        ;;
    "unban")
        if [ -z "$TARGET" ]; then
            echo "Usage: $0 unban <IP_ADDRESS>"
            exit 1
        fi
        echo "Unbanning IP: $TARGET"
        sudo fail2ban-client unban "$TARGET"
        sudo ufw delete deny from "$TARGET"
        echo "IP $TARGET unbanned"
        ;;
    "ban")
        if [ -z "$TARGET" ]; then
            echo "Usage: $0 ban <IP_ADDRESS>"
            exit 1
        fi
        echo "Banning IP: $TARGET"
        sudo ufw deny from "$TARGET"
        echo "IP $TARGET banned"
        ;;
    "status")
        ${statusScriptPath}
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|ban|unban} [IP_ADDRESS]"
        exit 1
        ;;
esac
`;
    
    const managementScriptPath = path.join(this.scriptsPath, 'ids-manage.sh');
    await fs.writeFile(managementScriptPath, managementScript);
    await fs.chmod(managementScriptPath, 0o755);
    
    console.log(`   ✅ IDS status script created: ${statusScriptPath}`);
    console.log(`   ✅ IDS management script created: ${managementScriptPath}`);
  }

  /**
   * Setup alerting system
   */
  async setupAlerting() {
    console.log('\n🚨 Setting up IDS alerting system...');
    
    // Create alerting configuration
    const alertConfig = {
      enabled: true,
      channels: {
        email: {
          enabled: process.env.SECURITY_ALERT_EMAIL ? true : false,
          recipients: process.env.SECURITY_ALERT_EMAIL?.split(',') || [],
          smtp: {
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT) || 587,
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        },
        webhook: {
          enabled: process.env.SECURITY_ALERT_WEBHOOK ? true : false,
          url: process.env.SECURITY_ALERT_WEBHOOK,
          timeout: 10000
        },
        slack: {
          enabled: process.env.SECURITY_ALERT_SLACK_WEBHOOK ? true : false,
          webhookUrl: process.env.SECURITY_ALERT_SLACK_WEBHOOK,
          channel: process.env.SECURITY_ALERT_SLACK_CHANNEL || '#security'
        }
      },
      rules: {
        critical: {
          events: ['brute_force', 'sql_injection', 'system_compromise'],
          channels: ['email', 'webhook', 'slack'],
          cooldown: 300 // 5 minutes
        },
        warning: {
          events: ['suspicious_request', 'failed_login', 'file_change'],
          channels: ['email', 'webhook'],
          cooldown: 900 // 15 minutes
        },
        info: {
          events: ['blocked_ip', 'service_restart'],
          channels: ['webhook'],
          cooldown: 0
        }
      }
    };
    
    const alertConfigPath = path.join(this.configPath, 'alerting.json');
    await fs.writeFile(alertConfigPath, JSON.stringify(alertConfig, null, 2));
    
    // Create alert sending script
    const alertScript = `#!/bin/bash
# IDS alert sending script

ALERT_TYPE=$1
MESSAGE=$2
SEVERITY=$3
CONFIG_FILE="${alertConfigPath}"

# Load configuration
if [ ! -f "$CONFIG_FILE" ]; then
    echo "Alert configuration not found: $CONFIG_FILE"
    exit 1
fi

# Send email alert
send_email_alert() {
    local subject="AutoControl Pro Security Alert: [$SEVERITY] $ALERT_TYPE"
    local body="Security Alert Details:

Type: $ALERT_TYPE
Severity: $SEVERITY
Message: $MESSAGE
Timestamp: $(date)
Server: $(hostname)

Please investigate and take appropriate action."
    
    echo "$body" | mail -s "$subject" "${process.env.SECURITY_ALERT_EMAIL || 'admin@your-domain.com'}"
}

# Send webhook alert
send_webhook_alert() {
    local payload=$(cat <<EOF
{
    "alert_type": "$ALERT_TYPE",
    "severity": "$SEVERITY",
    "message": "$MESSAGE",
    "timestamp": "$(date -Iseconds)",
    "server": "$(hostname)"
}
EOF
)
    
    curl -X POST \\
         -H "Content-Type: application/json" \\
         -d "$payload" \\
         --max-time 10 \\
         "${process.env.SECURITY_ALERT_WEBHOOK}"
}

# Send Slack alert
send_slack_alert() {
    local color="good"
    case "$SEVERITY" in
        "critical") color="danger" ;;
        "warning") color="warning" ;;
        "info") color="good" ;;
    esac
    
    local payload=$(cat <<EOF
{
    "channel": "${process.env.SECURITY_ALERT_SLACK_CHANNEL || '#security'}",
    "username": "AutoControl Security",
    "icon_emoji": ":shield:",
    "attachments": [
        {
            "color": "$color",
            "title": "Security Alert: $ALERT_TYPE",
            "text": "$MESSAGE",
            "fields": [
                {
                    "title": "Severity",
                    "value": "$SEVERITY",
                    "short": true
                },
                {
                    "title": "Server",
                    "value": "$(hostname)",
                    "short": true
                }
            ],
            "ts": $(date +%s)
        }
    ]
}
EOF
)
    
    curl -X POST \\
         -H "Content-Type: application/json" \\
         -d "$payload" \\
         "${process.env.SECURITY_ALERT_SLACK_WEBHOOK}"
}

# Main alert logic
if [ -z "$ALERT_TYPE" ] || [ -z "$MESSAGE" ] || [ -z "$SEVERITY" ]; then
    echo "Usage: $0 <alert_type> <message> <severity>"
    exit 1
fi

echo "Sending $SEVERITY alert: $ALERT_TYPE - $MESSAGE"

# Send alerts based on configuration
if [ -n "${process.env.SECURITY_ALERT_EMAIL}" ]; then
    send_email_alert
fi

if [ -n "${process.env.SECURITY_ALERT_WEBHOOK}" ]; then
    send_webhook_alert
fi

if [ -n "${process.env.SECURITY_ALERT_SLACK_WEBHOOK}" ]; then
    send_slack_alert
fi

echo "Alert sent successfully"
`;
    
    const alertScriptPath = path.join(this.scriptsPath, 'send-alert.sh');
    await fs.writeFile(alertScriptPath, alertScript);
    await fs.chmod(alertScriptPath, 0o755);
    
    console.log(`   ✅ Alert configuration saved: ${alertConfigPath}`);
    console.log(`   ✅ Alert script created: ${alertScriptPath}`);
  }

  /**
   * Get IDS status
   */
  async getIDSStatus() {
    const status = {
      fail2ban: 'unknown',
      monitoring: 'unknown',
      ossec: 'unknown',
      customRules: IDS_CONFIG.customRules.enabled
    };
    
    try {
      await execAsync('sudo systemctl is-active fail2ban');
      status.fail2ban = 'active';
    } catch (error) {
      status.fail2ban = 'inactive';
    }
    
    try {
      await execAsync('sudo systemctl is-active autocontrol-monitor');
      status.monitoring = 'active';
    } catch (error) {
      status.monitoring = 'inactive';
    }
    
    try {
      await execAsync('sudo systemctl is-active ossec');
      status.ossec = 'active';
    } catch (error) {
      status.ossec = 'inactive';
    }
    
    return status;
  }
}

/**
 * Main intrusion detection setup function
 */
async function setupIntrusionDetection() {
  try {
    const configurator = new IntrusionDetectionConfigurator();
    await configurator.setup();
    
    const status = await configurator.getIDSStatus();
    
    console.log('\n📋 Intrusion Detection System Summary:');
    console.log('====================================');
    console.log(`Fail2Ban: ${status.fail2ban}`);
    console.log(`Real-time Monitoring: ${status.monitoring}`);
    console.log(`OSSEC HIDS: ${status.ossec}`);
    console.log(`Custom Rules: ${status.customRules ? 'enabled' : 'disabled'}`);
    
    console.log('\n🛡️  IDS Features Configured:');
    console.log('- Fail2Ban with custom jails');
    console.log('- Real-time log monitoring');
    console.log('- Custom attack detection rules');
    console.log('- Automated IP blocking');
    console.log('- Multi-channel alerting');
    console.log('- Management and status scripts');
    
    return status;
    
  } catch (error) {
    console.error('❌ Intrusion detection setup failed:', error);
    throw error;
  }
}

// Run setup if called directly
if (require.main === module) {
  setupIntrusionDetection()
    .then(() => {
      console.log('\n🎉 Intrusion detection system setup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Setup failed:', error.message);
      process.exit(1);
    });
}

module.exports = {
  IntrusionDetectionConfigurator,
  setupIntrusionDetection,
  IDS_CONFIG
};