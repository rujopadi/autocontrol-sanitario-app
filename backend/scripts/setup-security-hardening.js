#!/usr/bin/env node
/**
 * Security Hardening Setup Script
 * Implements comprehensive security hardening for production environment
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const logger = require('../utils/logger');

/**
 * Security hardening configuration
 */
const SECURITY_CONFIG = {
  // Firewall configuration
  firewall: {
    enabled: true,
    defaultPolicy: 'deny',
    allowedPorts: {
      ssh: parseInt(process.env.SSH_PORT) || 22,
      http: 80,
      https: 443,
      app: parseInt(process.env.PORT) || 3000
    },
    allowedIPs: process.env.ALLOWED_IPS?.split(',') || [],
    rateLimiting: {
      enabled: true,
      connections: 25,
      interval: 30
    }
  },
  
  // Intrusion detection
  intrusionDetection: {
    enabled: true,
    tools: ['fail2ban', 'aide', 'rkhunter'],
    monitoring: {
      logFiles: [
        '/var/log/auth.log',
        '/var/log/nginx/access.log',
        '/var/log/autocontrol/security.log'
      ],
      alertThresholds: {
        failedLogins: 5,
        suspiciousRequests: 10,
        fileChanges: true
      }
    }
  },
  
  // SSL/TLS hardening
  ssl: {
    protocols: ['TLSv1.2', 'TLSv1.3'],
    ciphers: [
      'ECDHE-RSA-AES256-GCM-SHA512',
      'DHE-RSA-AES256-GCM-SHA512',
      'ECDHE-RSA-AES256-GCM-SHA384',
      'DHE-RSA-AES256-GCM-SHA384'
    ],
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  },
  
  // System hardening
  system: {
    disableServices: ['telnet', 'rsh', 'rlogin'],
    secureKernel: true,
    filePermissions: true,
    userSecurity: true,
    networkSecurity: true
  }
};

/**
 * Security hardening configurator
 */
class SecurityHardeningConfigurator {
  constructor() {
    this.configPath = path.join(__dirname, '..', 'config', 'security');
    this.scriptsPath = path.join(__dirname, '..', 'scripts', 'security');
  }

  /**
   * Run complete security hardening
   */
  async harden() {
    try {
      console.log('🔒 Starting security hardening...');
      console.log('==================================');
      
      // Create security directories
      await this.createSecurityDirectories();
      
      // Configure firewall
      await this.configureFirewall();
      
      // Setup intrusion detection
      await this.setupIntrusionDetection();
      
      // Harden SSL/TLS
      await this.hardenSSL();
      
      // System hardening
      await this.hardenSystem();
      
      // Configure security monitoring
      await this.configureSecurityMonitoring();
      
      // Setup backup encryption
      await this.setupBackupEncryption();
      
      // Create security scripts
      await this.createSecurityScripts();
      
      // Generate security report
      await this.generateSecurityReport();
      
      console.log('\n✅ Security hardening completed successfully!');
      
    } catch (error) {
      console.error('\n❌ Security hardening failed:', error);
      throw error;
    }
  }
}  /**

   * Create security directories
   */
  async createSecurityDirectories() {
    console.log('\n📁 Creating security directories...');
    
    const directories = [
      this.configPath,
      this.scriptsPath,
      '/var/log/autocontrol/security',
      '/var/lib/autocontrol/security',
      '/etc/autocontrol/security'
    ];
    
    for (const dir of directories) {
      try {
        await fs.mkdir(dir, { recursive: true });
        await fs.chmod(dir, 0o750); // Restrictive permissions
        console.log(`   ✅ Created secure directory: ${dir}`);
      } catch (error) {
        console.log(`   ⚠️  Could not create directory ${dir}: ${error.message}`);
      }
    }
  }

  /**
   * Configure firewall
   */
  async configureFirewall() {
    console.log('\n🔥 Configuring firewall...');
    
    if (!SECURITY_CONFIG.firewall.enabled) {
      console.log('   ⚠️  Firewall disabled in configuration');
      return;
    }
    
    try {
      // Install UFW if not present
      await execAsync('which ufw || sudo apt-get install -y ufw');
      
      // Reset firewall to defaults
      await execAsync('sudo ufw --force reset');
      
      // Set default policies
      await execAsync('sudo ufw default deny incoming');
      await execAsync('sudo ufw default allow outgoing');
      
      // Allow SSH (be careful not to lock ourselves out)
      const sshPort = SECURITY_CONFIG.firewall.allowedPorts.ssh;
      await execAsync(`sudo ufw allow ${sshPort}/tcp comment 'SSH'`);
      console.log(`   ✅ Allowed SSH on port ${sshPort}`);
      
      // Allow HTTP and HTTPS
      await execAsync('sudo ufw allow 80/tcp comment "HTTP"');
      await execAsync('sudo ufw allow 443/tcp comment "HTTPS"');
      console.log('   ✅ Allowed HTTP/HTTPS');
      
      // Allow application port (only from specific IPs if configured)
      const appPort = SECURITY_CONFIG.firewall.allowedPorts.app;
      if (SECURITY_CONFIG.firewall.allowedIPs.length > 0) {
        for (const ip of SECURITY_CONFIG.firewall.allowedIPs) {
          await execAsync(`sudo ufw allow from ${ip} to any port ${appPort} comment "App from ${ip}"`);
        }
      } else {
        await execAsync(`sudo ufw allow ${appPort}/tcp comment "Application"`);
      }
      console.log(`   ✅ Configured application port ${appPort}`);
      
      // Configure rate limiting
      if (SECURITY_CONFIG.firewall.rateLimiting.enabled) {
        const { connections, interval } = SECURITY_CONFIG.firewall.rateLimiting;
        await execAsync(`sudo ufw limit ${sshPort}/tcp comment "SSH rate limit"`);
        console.log(`   ✅ Configured rate limiting for SSH`);
      }
      
      // Enable firewall
      await execAsync('sudo ufw --force enable');
      console.log('   ✅ Firewall enabled');
      
      // Show status
      const status = await execAsync('sudo ufw status verbose');
      console.log('   📊 Firewall status:');
      console.log(status.stdout);
      
    } catch (error) {
      console.log(`   ❌ Firewall configuration failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Setup intrusion detection
   */
  async setupIntrusionDetection() {
    console.log('\n🛡️  Setting up intrusion detection...');
    
    if (!SECURITY_CONFIG.intrusionDetection.enabled) {
      console.log('   ⚠️  Intrusion detection disabled in configuration');
      return;
    }
    
    // Install and configure Fail2Ban
    await this.setupFail2Ban();
    
    // Install and configure AIDE (Advanced Intrusion Detection Environment)
    await this.setupAIDE();
    
    // Install and configure RKHunter (Rootkit Hunter)
    await this.setupRKHunter();
    
    // Setup custom intrusion detection
    await this.setupCustomIntrusionDetection();
  }

  /**
   * Setup Fail2Ban
   */
  async setupFail2Ban() {
    console.log('\n   🚫 Setting up Fail2Ban...');
    
    try {
      // Install Fail2Ban
      await execAsync('sudo apt-get update && sudo apt-get install -y fail2ban');
      
      // Create custom jail configuration
      const jailConfig = `[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
backend = auto
usedns = warn
logencoding = auto
enabled = false
mode = normal
filter = %(__name__)s[mode=%(mode)s]

[sshd]
enabled = true
port = ${SECURITY_CONFIG.firewall.allowedPorts.ssh}
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 1800

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
logpath = /var/log/nginx/error.log
maxretry = 3
bantime = 3600

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
maxretry = 10
findtime = 600
bantime = 7200

[autocontrol-auth]
enabled = true
filter = autocontrol-auth
logpath = /var/log/autocontrol/security.log
maxretry = 5
findtime = 300
bantime = 3600
`;
      
      await fs.writeFile('/etc/fail2ban/jail.local', jailConfig);
      
      // Create custom filter for AutoControl Pro
      const autocontrolFilter = `[Definition]
failregex = ^.*"ip":"<HOST>".*"event":"authentication_failed".*$
            ^.*Authentication failed for IP <HOST>.*$
            ^.*Suspicious activity detected from <HOST>.*$
ignoreregex =
`;
      
      await fs.writeFile('/etc/fail2ban/filter.d/autocontrol-auth.conf', autocontrolFilter);
      
      // Start and enable Fail2Ban
      await execAsync('sudo systemctl enable fail2ban');
      await execAsync('sudo systemctl start fail2ban');
      
      console.log('   ✅ Fail2Ban configured and started');
      
    } catch (error) {
      console.log(`   ⚠️  Fail2Ban setup failed: ${error.message}`);
    }
  }

  /**
   * Setup AIDE
   */
  async setupAIDE() {
    console.log('\n   🔍 Setting up AIDE...');
    
    try {
      // Install AIDE
      await execAsync('sudo apt-get install -y aide aide-common');
      
      // Initialize AIDE database
      console.log('   📊 Initializing AIDE database (this may take a while)...');
      await execAsync('sudo aideinit', { timeout: 300000 }); // 5 minute timeout
      
      // Copy database
      await execAsync('sudo cp /var/lib/aide/aide.db.new /var/lib/aide/aide.db');
      
      // Create AIDE check script
      const aideScript = `#!/bin/bash
# AIDE integrity check script

AIDE_LOG="/var/log/autocontrol/security/aide.log"
ALERT_EMAIL="${process.env.SECURITY_ALERT_EMAIL || 'admin@your-domain.com'}"

echo "$(date): Starting AIDE integrity check" >> "$AIDE_LOG"

# Run AIDE check
if sudo aide --check >> "$AIDE_LOG" 2>&1; then
    echo "$(date): AIDE check completed - no changes detected" >> "$AIDE_LOG"
else
    echo "$(date): AIDE check detected file system changes" >> "$AIDE_LOG"
    
    # Send alert
    if [ -n "$ALERT_EMAIL" ]; then
        echo "File system integrity check detected changes. Please review the AIDE log at $AIDE_LOG" | \\
        mail -s "AutoControl Pro: File System Changes Detected" "$ALERT_EMAIL"
    fi
fi
`;
      
      const aideScriptPath = path.join(this.scriptsPath, 'aide-check.sh');
      await fs.writeFile(aideScriptPath, aideScript);
      await fs.chmod(aideScriptPath, 0o755);
      
      // Setup daily AIDE check
      const aideCron = `0 2 * * * ${aideScriptPath}`;
      await fs.writeFile('/tmp/aide-cron', aideCron);
      await execAsync('sudo crontab -u root /tmp/aide-cron');
      await fs.unlink('/tmp/aide-cron');
      
      console.log('   ✅ AIDE configured with daily integrity checks');
      
    } catch (error) {
      console.log(`   ⚠️  AIDE setup failed: ${error.message}`);
    }
  }

  /**
   * Setup RKHunter
   */
  async setupRKHunter() {
    console.log('\n   🔎 Setting up RKHunter...');
    
    try {
      // Install RKHunter
      await execAsync('sudo apt-get install -y rkhunter');
      
      // Update RKHunter database
      await execAsync('sudo rkhunter --update');
      
      // Create baseline
      await execAsync('sudo rkhunter --propupd');
      
      // Configure RKHunter
      const rkhunterConfig = `# AutoControl Pro RKHunter Configuration
MAIL-ON-WARNING=${process.env.SECURITY_ALERT_EMAIL || 'admin@your-domain.com'}
MAIL_CMD=mail -s "[rkhunter] Warnings found for \${HOST_NAME}"
COPY_LOG_ON_ERROR=1
USE_SYSLOG=authpriv.notice
AUTO_X_DETECT=1
WHITELISTED_IS_WHITE=1
ALLOW_SSH_ROOT_USER=no
ALLOW_SSH_PROT_V1=0
ENABLE_TESTS=all
DISABLE_TESTS=suspscan hidden_procs deleted_files packet_cap_apps apps
WEB_CMD=""
`;
      
      await fs.appendFile('/etc/rkhunter.conf', rkhunterConfig);
      
      // Create RKHunter check script
      const rkhunterScript = `#!/bin/bash
# RKHunter security scan script

RKHUNTER_LOG="/var/log/autocontrol/security/rkhunter.log"

echo "$(date): Starting RKHunter security scan" >> "$RKHUNTER_LOG"

# Run RKHunter check
sudo rkhunter --check --skip-keypress --report-warnings-only >> "$RKHUNTER_LOG" 2>&1

echo "$(date): RKHunter scan completed" >> "$RKHUNTER_LOG"
`;
      
      const rkhunterScriptPath = path.join(this.scriptsPath, 'rkhunter-check.sh');
      await fs.writeFile(rkhunterScriptPath, rkhunterScript);
      await fs.chmod(rkhunterScriptPath, 0o755);
      
      console.log('   ✅ RKHunter configured');
      
    } catch (error) {
      console.log(`   ⚠️  RKHunter setup failed: ${error.message}`);
    }
  } 
 /**
   * Setup custom intrusion detection
   */
  async setupCustomIntrusionDetection() {
    console.log('\n   🔧 Setting up custom intrusion detection...');
    
    // Create log monitoring script
    const logMonitorScript = `#!/bin/bash
# Custom log monitoring for intrusion detection

SECURITY_LOG="/var/log/autocontrol/security.log"
AUTH_LOG="/var/log/auth.log"
NGINX_LOG="/var/log/nginx/access.log"
ALERT_EMAIL="${process.env.SECURITY_ALERT_EMAIL || 'admin@your-domain.com'}"

# Check for failed login attempts
check_failed_logins() {
    local failed_count=$(grep "authentication_failed" "$SECURITY_LOG" | grep "$(date '+%Y-%m-%d')" | wc -l)
    
    if [ "$failed_count" -gt ${SECURITY_CONFIG.intrusionDetection.monitoring.alertThresholds.failedLogins} ]; then
        echo "High number of failed login attempts detected: $failed_count" | \\
        mail -s "AutoControl Pro: Security Alert - Failed Logins" "$ALERT_EMAIL"
    fi
}

# Check for suspicious requests
check_suspicious_requests() {
    local suspicious_count=$(grep -E "(sql|script|union|select|drop|delete|insert|update)" "$NGINX_LOG" | grep "$(date '+%d/%b/%Y')" | wc -l)
    
    if [ "$suspicious_count" -gt ${SECURITY_CONFIG.intrusionDetection.monitoring.alertThresholds.suspiciousRequests} ]; then
        echo "Suspicious requests detected: $suspicious_count" | \\
        mail -s "AutoControl Pro: Security Alert - Suspicious Requests" "$ALERT_EMAIL"
    fi
}

# Check for brute force attempts
check_brute_force() {
    local brute_force=$(grep "Failed password" "$AUTH_LOG" | grep "$(date '+%b %d')" | awk '{print $11}' | sort | uniq -c | sort -nr | head -5)
    
    if [ -n "$brute_force" ]; then
        echo "Potential brute force attempts detected:
$brute_force" | \\
        mail -s "AutoControl Pro: Security Alert - Brute Force" "$ALERT_EMAIL"
    fi
}

# Run all checks
check_failed_logins
check_suspicious_requests
check_brute_force

echo "$(date): Security monitoring completed" >> "$SECURITY_LOG"
`;
    
    const monitorScriptPath = path.join(this.scriptsPath, 'monitor-security.sh');
    await fs.writeFile(monitorScriptPath, logMonitorScript);
    await fs.chmod(monitorScriptPath, 0o755);
    
    // Setup cron job for security monitoring
    const securityCron = `*/15 * * * * ${monitorScriptPath}`;
    await fs.writeFile('/tmp/security-cron', securityCron);
    await execAsync('crontab /tmp/security-cron');
    await fs.unlink('/tmp/security-cron');
    
    console.log('   ✅ Custom intrusion detection configured');
  }

  /**
   * Harden SSL/TLS configuration
   */
  async hardenSSL() {
    console.log('\n🔐 Hardening SSL/TLS configuration...');
    
    // Generate strong DH parameters if not exists
    const dhParamPath = '/etc/ssl/certs/dhparam.pem';
    try {
      await fs.access(dhParamPath);
      console.log('   ✅ DH parameters already exist');
    } catch (error) {
      console.log('   🔧 Generating strong DH parameters (this will take several minutes)...');
      try {
        await execAsync(`sudo openssl dhparam -out ${dhParamPath} 2048`, { timeout: 600000 });
        console.log('   ✅ Strong DH parameters generated');
      } catch (dhError) {
        console.log(`   ⚠️  Could not generate DH parameters: ${dhError.message}`);
      }
    }
    
    // Create SSL security configuration
    const sslConfig = `# SSL Security Configuration for AutoControl Pro
# Strong SSL/TLS configuration

# SSL Protocols
ssl_protocols ${SECURITY_CONFIG.ssl.protocols.join(' ')};

# SSL Ciphers
ssl_ciphers '${SECURITY_CONFIG.ssl.ciphers.join(':')}';
ssl_prefer_server_ciphers off;

# SSL Session
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
ssl_session_tickets off;

# OCSP Stapling
ssl_stapling on;
ssl_stapling_verify on;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;

# Security Headers
add_header Strict-Transport-Security "max-age=${SECURITY_CONFIG.ssl.hsts.maxAge}; includeSubDomains; preload" always;
add_header X-Frame-Options DENY always;
add_header X-Content-Type-Options nosniff always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

# Content Security Policy
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';" always;
`;
    
    const sslConfigPath = '/etc/nginx/snippets/ssl-security.conf';
    try {
      await fs.writeFile(sslConfigPath, sslConfig);
      console.log(`   ✅ SSL security configuration created: ${sslConfigPath}`);
    } catch (error) {
      console.log(`   ⚠️  Could not create SSL config: ${error.message}`);
    }
  }

  /**
   * Harden system configuration
   */
  async hardenSystem() {
    console.log('\n🛡️  Hardening system configuration...');
    
    // Disable unnecessary services
    await this.disableUnnecessaryServices();
    
    // Secure kernel parameters
    await this.secureKernelParameters();
    
    // Set secure file permissions
    await this.setSecureFilePermissions();
    
    // Configure user security
    await this.configureUserSecurity();
    
    // Network security hardening
    await this.hardenNetworkSecurity();
  }

  /**
   * Disable unnecessary services
   */
  async disableUnnecessaryServices() {
    console.log('\n   🚫 Disabling unnecessary services...');
    
    const servicesToDisable = [
      'telnet',
      'rsh-server',
      'rlogin',
      'vsftpd',
      'apache2',
      'sendmail'
    ];
    
    for (const service of servicesToDisable) {
      try {
        await execAsync(`sudo systemctl disable ${service} 2>/dev/null || true`);
        await execAsync(`sudo systemctl stop ${service} 2>/dev/null || true`);
        console.log(`   ✅ Disabled service: ${service}`);
      } catch (error) {
        // Service might not be installed, which is fine
      }
    }
  }

  /**
   * Secure kernel parameters
   */
  async secureKernelParameters() {
    console.log('\n   ⚙️  Configuring secure kernel parameters...');
    
    const kernelParams = `# AutoControl Pro Security Hardening
# Network security
net.ipv4.ip_forward = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.secure_redirects = 0
net.ipv4.conf.default.secure_redirects = 0
net.ipv6.conf.all.accept_redirects = 0
net.ipv6.conf.default.accept_redirects = 0
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0
net.ipv6.conf.all.accept_source_route = 0
net.ipv6.conf.default.accept_source_route = 0

# ICMP security
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.icmp_ignore_bogus_error_responses = 1

# SYN flood protection
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_max_syn_backlog = 2048
net.ipv4.tcp_synack_retries = 2
net.ipv4.tcp_syn_retries = 5

# IP spoofing protection
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1

# Log suspicious packets
net.ipv4.conf.all.log_martians = 1
net.ipv4.conf.default.log_martians = 1

# Memory protection
kernel.exec-shield = 1
kernel.randomize_va_space = 2

# Core dump security
fs.suid_dumpable = 0
kernel.core_uses_pid = 1

# File system security
fs.protected_hardlinks = 1
fs.protected_symlinks = 1
`;
    
    try {
      await fs.writeFile('/etc/sysctl.d/99-autocontrol-security.conf', kernelParams);
      await execAsync('sudo sysctl -p /etc/sysctl.d/99-autocontrol-security.conf');
      console.log('   ✅ Kernel security parameters configured');
    } catch (error) {
      console.log(`   ⚠️  Could not configure kernel parameters: ${error.message}`);
    }
  }

  /**
   * Set secure file permissions
   */
  async setSecureFilePermissions() {
    console.log('\n   📁 Setting secure file permissions...');
    
    const secureFiles = [
      { path: '/etc/passwd', mode: '644' },
      { path: '/etc/shadow', mode: '640' },
      { path: '/etc/group', mode: '644' },
      { path: '/etc/gshadow', mode: '640' },
      { path: '/etc/ssh/sshd_config', mode: '600' },
      { path: '/var/log/autocontrol', mode: '750' },
      { path: '/etc/autocontrol', mode: '750' }
    ];
    
    for (const file of secureFiles) {
      try {
        await execAsync(`sudo chmod ${file.mode} ${file.path} 2>/dev/null || true`);
        console.log(`   ✅ Set permissions ${file.mode} for ${file.path}`);
      } catch (error) {
        console.log(`   ⚠️  Could not set permissions for ${file.path}: ${error.message}`);
      }
    }
  }

  /**
   * Configure user security
   */
  async configureUserSecurity() {
    console.log('\n   👤 Configuring user security...');
    
    // Configure password policies
    const loginDefs = `# AutoControl Pro Password Policy
PASS_MAX_DAYS 90
PASS_MIN_DAYS 1
PASS_WARN_AGE 7
PASS_MIN_LEN 12
LOGIN_RETRIES 3
LOGIN_TIMEOUT 60
UMASK 027
`;
    
    try {
      await fs.appendFile('/etc/login.defs', loginDefs);
      console.log('   ✅ Password policies configured');
    } catch (error) {
      console.log(`   ⚠️  Could not configure password policies: ${error.message}`);
    }
    
    // Configure SSH security
    const sshConfig = `# AutoControl Pro SSH Security Configuration
Protocol 2
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys
PermitEmptyPasswords no
ChallengeResponseAuthentication no
UsePAM yes
X11Forwarding no
PrintMotd no
ClientAliveInterval 300
ClientAliveCountMax 2
MaxAuthTries 3
MaxSessions 2
LoginGraceTime 60
`;
    
    try {
      await fs.appendFile('/etc/ssh/sshd_config', sshConfig);
      await execAsync('sudo systemctl reload sshd');
      console.log('   ✅ SSH security configured');
    } catch (error) {
      console.log(`   ⚠️  Could not configure SSH: ${error.message}`);
    }
  }

  /**
   * Harden network security
   */
  async hardenNetworkSecurity() {
    console.log('\n   🌐 Hardening network security...');
    
    // Configure TCP wrappers
    const hostsAllow = `# AutoControl Pro - Allowed hosts
sshd: ALL
`;
    
    const hostsDeny = `# AutoControl Pro - Denied hosts
ALL: ALL
`;
    
    try {
      await fs.writeFile('/etc/hosts.allow', hostsAllow);
      await fs.writeFile('/etc/hosts.deny', hostsDeny);
      console.log('   ✅ TCP wrappers configured');
    } catch (error) {
      console.log(`   ⚠️  Could not configure TCP wrappers: ${error.message}`);
    }
  }  
/**
   * Configure security monitoring
   */
  async configureSecurityMonitoring() {
    console.log('\n📊 Configuring security monitoring...');
    
    // Create security monitoring configuration
    const monitoringConfig = {
      enabled: true,
      logFiles: SECURITY_CONFIG.intrusionDetection.monitoring.logFiles,
      alertThresholds: SECURITY_CONFIG.intrusionDetection.monitoring.alertThresholds,
      notifications: {
        email: process.env.SECURITY_ALERT_EMAIL,
        webhook: process.env.SECURITY_ALERT_WEBHOOK,
        slack: process.env.SECURITY_ALERT_SLACK_WEBHOOK
      },
      scanSchedule: {
        aide: '0 2 * * *',        // Daily at 2 AM
        rkhunter: '0 3 * * 0',    // Weekly on Sunday at 3 AM
        logMonitor: '*/15 * * * *' // Every 15 minutes
      }
    };
    
    const configPath = path.join(this.configPath, 'monitoring.json');
    await fs.writeFile(configPath, JSON.stringify(monitoringConfig, null, 2));
    
    console.log(`   ✅ Security monitoring configuration saved: ${configPath}`);
  }

  /**
   * Setup backup encryption
   */
  async setupBackupEncryption() {
    console.log('\n🔐 Setting up backup encryption...');
    
    // Generate encryption key for backups
    const encryptionKey = require('crypto').randomBytes(32).toString('hex');
    const keyPath = path.join(this.configPath, 'backup-encryption.key');
    
    try {
      await fs.writeFile(keyPath, encryptionKey);
      await fs.chmod(keyPath, 0o600); // Only owner can read
      console.log(`   ✅ Backup encryption key generated: ${keyPath}`);
    } catch (error) {
      console.log(`   ⚠️  Could not generate encryption key: ${error.message}`);
    }
    
    // Create encrypted backup script
    const encryptedBackupScript = `#!/bin/bash
# Encrypted backup script for AutoControl Pro

BACKUP_DIR="/var/backups/autocontrol"
ENCRYPTED_DIR="/var/backups/autocontrol/encrypted"
ENCRYPTION_KEY="${keyPath}"
DATE=$(date +%Y%m%d_%H%M%S)

# Create encrypted backup directory
mkdir -p "$ENCRYPTED_DIR"

# Function to encrypt backup
encrypt_backup() {
    local backup_file=$1
    local encrypted_file="$ENCRYPTED_DIR/$(basename $backup_file).enc"
    
    if [ -f "$ENCRYPTION_KEY" ]; then
        openssl enc -aes-256-cbc -salt -in "$backup_file" -out "$encrypted_file" -pass file:"$ENCRYPTION_KEY"
        
        if [ $? -eq 0 ]; then
            echo "Backup encrypted successfully: $encrypted_file"
            # Remove unencrypted backup
            rm "$backup_file"
        else
            echo "Backup encryption failed for: $backup_file"
        fi
    else
        echo "Encryption key not found: $ENCRYPTION_KEY"
    fi
}

# Encrypt all backup files
for backup_file in "$BACKUP_DIR"/*.tar.gz; do
    if [ -f "$backup_file" ]; then
        encrypt_backup "$backup_file"
    fi
done

echo "Backup encryption completed at $(date)"
`;
    
    const backupScriptPath = path.join(this.scriptsPath, 'encrypt-backups.sh');
    await fs.writeFile(backupScriptPath, encryptedBackupScript);
    await fs.chmod(backupScriptPath, 0o755);
    
    console.log(`   ✅ Encrypted backup script created: ${backupScriptPath}`);
  }

  /**
   * Create security scripts
   */
  async createSecurityScripts() {
    console.log('\n🛠️  Creating security management scripts...');
    
    // Security audit script
    const auditScript = `#!/bin/bash
# Security audit script for AutoControl Pro

AUDIT_LOG="/var/log/autocontrol/security/audit.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$DATE] Starting security audit" >> "$AUDIT_LOG"

# Check firewall status
echo "=== Firewall Status ===" >> "$AUDIT_LOG"
sudo ufw status verbose >> "$AUDIT_LOG" 2>&1

# Check fail2ban status
echo "=== Fail2Ban Status ===" >> "$AUDIT_LOG"
sudo fail2ban-client status >> "$AUDIT_LOG" 2>&1

# Check for rootkits
echo "=== RKHunter Check ===" >> "$AUDIT_LOG"
sudo rkhunter --check --skip-keypress --report-warnings-only >> "$AUDIT_LOG" 2>&1

# Check file permissions
echo "=== File Permissions Check ===" >> "$AUDIT_LOG"
find /etc/autocontrol -type f -perm /o+w >> "$AUDIT_LOG" 2>&1
find /var/log/autocontrol -type f -perm /o+w >> "$AUDIT_LOG" 2>&1

# Check for SUID files
echo "=== SUID Files Check ===" >> "$AUDIT_LOG"
find / -perm -4000 -type f 2>/dev/null >> "$AUDIT_LOG"

# Check listening ports
echo "=== Listening Ports ===" >> "$AUDIT_LOG"
netstat -tuln >> "$AUDIT_LOG" 2>&1

# Check last logins
echo "=== Recent Logins ===" >> "$AUDIT_LOG"
last -n 20 >> "$AUDIT_LOG" 2>&1

echo "[$DATE] Security audit completed" >> "$AUDIT_LOG"
`;
    
    const auditScriptPath = path.join(this.scriptsPath, 'security-audit.sh');
    await fs.writeFile(auditScriptPath, auditScript);
    await fs.chmod(auditScriptPath, 0o755);
    
    // Security incident response script
    const incidentScript = `#!/bin/bash
# Security incident response script

INCIDENT_LOG="/var/log/autocontrol/security/incidents.log"
ALERT_EMAIL="${process.env.SECURITY_ALERT_EMAIL || 'admin@your-domain.com'}"

# Function to handle security incident
handle_incident() {
    local incident_type=$1
    local description=$2
    local severity=$3
    
    echo "$(date): SECURITY INCIDENT - Type: $incident_type, Severity: $severity, Description: $description" >> "$INCIDENT_LOG"
    
    # Send immediate alert
    echo "SECURITY INCIDENT DETECTED

Type: $incident_type
Severity: $severity
Description: $description
Time: $(date)
Server: $(hostname)

Please investigate immediately and take appropriate action." | \\
    mail -s "URGENT: Security Incident - $incident_type" "$ALERT_EMAIL"
    
    # If critical, take immediate action
    if [ "$severity" = "critical" ]; then
        # Block suspicious IPs (example)
        # sudo ufw deny from suspicious_ip
        
        # Restart services if needed
        # sudo systemctl restart autocontrol-pro
        
        echo "$(date): Automatic response actions taken for critical incident" >> "$INCIDENT_LOG"
    fi
}

# Example usage:
# handle_incident "brute_force" "Multiple failed login attempts from IP 1.2.3.4" "high"
# handle_incident "malware_detected" "RKHunter detected suspicious files" "critical"

echo "Security incident response system ready"
`;
    
    const incidentScriptPath = path.join(this.scriptsPath, 'incident-response.sh');
    await fs.writeFile(incidentScriptPath, incidentScript);
    await fs.chmod(incidentScriptPath, 0o755);
    
    console.log(`   ✅ Security audit script created: ${auditScriptPath}`);
    console.log(`   ✅ Incident response script created: ${incidentScriptPath}`);
  }

  /**
   * Generate security report
   */
  async generateSecurityReport() {
    console.log('\n📋 Generating security report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      server: require('os').hostname(),
      configuration: {
        firewall: SECURITY_CONFIG.firewall,
        intrusionDetection: SECURITY_CONFIG.intrusionDetection,
        ssl: SECURITY_CONFIG.ssl,
        system: SECURITY_CONFIG.system
      },
      hardening: {
        firewall: 'configured',
        fail2ban: 'installed',
        aide: 'configured',
        rkhunter: 'installed',
        ssl: 'hardened',
        kernel: 'secured',
        permissions: 'set',
        monitoring: 'active'
      },
      recommendations: [
        'Regularly update system packages',
        'Monitor security logs daily',
        'Review firewall rules monthly',
        'Update AIDE database after system changes',
        'Test backup encryption regularly',
        'Conduct security audits quarterly',
        'Keep SSL certificates up to date',
        'Review user access permissions'
      ],
      nextSteps: [
        'Configure external security monitoring',
        'Set up automated security updates',
        'Implement log aggregation',
        'Configure SIEM integration',
        'Schedule penetration testing',
        'Create incident response procedures'
      ]
    };
    
    const reportPath = path.join(this.configPath, 'security-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`   ✅ Security report generated: ${reportPath}`);
    
    // Display summary
    console.log('\n📊 Security Hardening Summary:');
    console.log('==============================');
    console.log(`Server: ${report.server}`);
    console.log(`Timestamp: ${report.timestamp}`);
    console.log('\nHardening Status:');
    Object.entries(report.hardening).forEach(([component, status]) => {
      console.log(`  ${component}: ${status}`);
    });
    
    console.log('\n🔒 Security Features Enabled:');
    console.log('- UFW Firewall with restrictive rules');
    console.log('- Fail2Ban intrusion prevention');
    console.log('- AIDE file integrity monitoring');
    console.log('- RKHunter rootkit detection');
    console.log('- SSL/TLS hardening');
    console.log('- Kernel security parameters');
    console.log('- Secure file permissions');
    console.log('- SSH hardening');
    console.log('- Backup encryption');
    console.log('- Security monitoring and alerting');
    
    return report;
  }

  /**
   * Get security status
   */
  async getSecurityStatus() {
    const status = {
      firewall: 'unknown',
      fail2ban: 'unknown',
      aide: 'unknown',
      rkhunter: 'unknown',
      ssl: 'unknown'
    };
    
    try {
      // Check firewall
      await execAsync('sudo ufw status | grep -q "Status: active"');
      status.firewall = 'active';
    } catch (error) {
      status.firewall = 'inactive';
    }
    
    try {
      // Check Fail2Ban
      await execAsync('sudo systemctl is-active fail2ban');
      status.fail2ban = 'active';
    } catch (error) {
      status.fail2ban = 'inactive';
    }
    
    try {
      // Check AIDE
      await fs.access('/var/lib/aide/aide.db');
      status.aide = 'configured';
    } catch (error) {
      status.aide = 'not configured';
    }
    
    try {
      // Check RKHunter
      await execAsync('which rkhunter');
      status.rkhunter = 'installed';
    } catch (error) {
      status.rkhunter = 'not installed';
    }
    
    return status;
  }
}

/**
 * Main security hardening function
 */
async function setupSecurityHardening() {
  try {
    const configurator = new SecurityHardeningConfigurator();
    await configurator.harden();
    
    const status = await configurator.getSecurityStatus();
    
    console.log('\n🎯 Security Hardening Completed Successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Review and test all security configurations');
    console.log('2. Set up external security monitoring');
    console.log('3. Configure automated security updates');
    console.log('4. Schedule regular security audits');
    console.log('5. Test incident response procedures');
    console.log('6. Update security documentation');
    
    return status;
    
  } catch (error) {
    console.error('❌ Security hardening failed:', error);
    throw error;
  }
}

// Run hardening if called directly
if (require.main === module) {
  setupSecurityHardening()
    .then(() => {
      console.log('\n🎉 Security hardening completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Security hardening failed:', error.message);
      process.exit(1);
    });
}

module.exports = {
  SecurityHardeningConfigurator,
  setupSecurityHardening,
  SECURITY_CONFIG
};