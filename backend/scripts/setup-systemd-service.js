#!/usr/bin/env node

/**
 * SystemD Service Setup Script
 * Creates and configures systemd service for AutoControl Pro
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class SystemdServiceSetup {
  constructor() {
    this.serviceName = 'autocontrol-pro';
    this.serviceFile = `/etc/systemd/system/${this.serviceName}.service`;
    this.appPath = path.resolve(__dirname, '..');
    this.user = 'www-data';
    this.group = 'www-data';
  }

  async run() {
    console.log('🔧 Setting up SystemD service...');
    
    try {
      await this.createServiceFile();
      await this.createEnvironmentFile();
      await this.setupLogDirectories();
      await this.enableService();
      await this.createServiceScripts();
      
      console.log('✅ SystemD service setup completed successfully!');
      this.printServiceCommands();
    } catch (error) {
      console.error('❌ SystemD service setup failed:', error.message);
      process.exit(1);
    }
  }

  async createServiceFile() {
    console.log('📝 Creating systemd service file...');
    
    const serviceContent = `[Unit]
Description=AutoControl Pro - Food Safety Management System
Documentation=https://github.com/your-org/autocontrol-pro
After=network.target mongod.service
Wants=network.target

[Service]
Type=simple
User=${this.user}
Group=${this.group}
WorkingDirectory=${this.appPath}
ExecStart=/usr/bin/node server.js
ExecReload=/bin/kill -HUP $MAINPID
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=${this.serviceName}

# Environment
Environment=NODE_ENV=production
EnvironmentFile=${this.appPath}/.env.production

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=${this.appPath}/logs ${this.appPath}/uploads /var/log/${this.serviceName}
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
RestrictRealtime=true
RestrictNamespaces=true
LockPersonality=true
MemoryDenyWriteExecute=true
RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6
SystemCallFilter=@system-service
SystemCallErrorNumber=EPERM

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096
MemoryMax=1G
CPUQuota=200%

# Process management
KillMode=mixed
KillSignal=SIGTERM
TimeoutStopSec=30
FinalKillSignal=SIGKILL

[Install]
WantedBy=multi-user.target
`;

    try {
      await fs.writeFile(this.serviceFile, serviceContent);
      console.log(`   ✓ Created service file: ${this.serviceFile}`);
    } catch (error) {
      if (error.code === 'EACCES') {
        console.log('   ⚠️  Need sudo privileges to create service file');
        console.log('   💡 Run this script with sudo or manually create the service file');
        
        // Save service content to a temporary file
        const tempFile = path.join(__dirname, `${this.serviceName}.service`);
        await fs.writeFile(tempFile, serviceContent);
        console.log(`   ✓ Service file saved to: ${tempFile}`);
        console.log(`   📋 Copy it to ${this.serviceFile} with sudo`);
      } else {
        throw error;
      }
    }
  }

  async createEnvironmentFile() {
    console.log('⚙️  Creating environment file for systemd...');
    
    const envFile = path.join(this.appPath, '.env.systemd');
    const envContent = `# SystemD Environment File
# Additional environment variables for the service

# Process settings
NODE_OPTIONS=--max-old-space-size=1024
UV_THREADPOOL_SIZE=4

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Security
FORCE_HTTPS=true
TRUST_PROXY=true

# Performance
CLUSTER_WORKERS=2
KEEP_ALIVE_TIMEOUT=65000
HEADERS_TIMEOUT=66000
`;

    await fs.writeFile(envFile, envContent);
    console.log(`   ✓ Created environment file: ${envFile}`);
  }

  async setupLogDirectories() {
    console.log('📁 Setting up log directories...');
    
    const logDirs = [
      `/var/log/${this.serviceName}`,
      path.join(this.appPath, 'logs')
    ];

    for (const dir of logDirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
        
        // Try to set ownership (may require sudo)
        try {
          execSync(`sudo chown ${this.user}:${this.group} ${dir}`);
          execSync(`sudo chmod 755 ${dir}`);
          console.log(`   ✓ Created and configured: ${dir}`);
        } catch (error) {
          console.log(`   ⚠️  Created ${dir} but couldn't set ownership (run with sudo)`);
        }
      } catch (error) {
        console.log(`   ❌ Failed to create ${dir}: ${error.message}`);
      }
    }
  }

  async enableService() {
    console.log('🔄 Configuring systemd service...');
    
    const commands = [
      'sudo systemctl daemon-reload',
      `sudo systemctl enable ${this.serviceName}`,
    ];

    for (const command of commands) {
      try {
        execSync(command, { stdio: 'inherit' });
        console.log(`   ✓ Executed: ${command}`);
      } catch (error) {
        console.log(`   ⚠️  Failed to execute: ${command}`);
        console.log(`   💡 Run manually: ${command}`);
      }
    }
  }

  async createServiceScripts() {
    console.log('📜 Creating service management scripts...');
    
    // Start script
    const startScript = `#!/bin/bash
# Start AutoControl Pro service

echo "Starting AutoControl Pro..."
sudo systemctl start ${this.serviceName}

if sudo systemctl is-active --quiet ${this.serviceName}; then
    echo "✅ AutoControl Pro started successfully"
    sudo systemctl status ${this.serviceName} --no-pager -l
else
    echo "❌ Failed to start AutoControl Pro"
    sudo systemctl status ${this.serviceName} --no-pager -l
    exit 1
fi
`;

    // Stop script
    const stopScript = `#!/bin/bash
# Stop AutoControl Pro service

echo "Stopping AutoControl Pro..."
sudo systemctl stop ${this.serviceName}

if ! sudo systemctl is-active --quiet ${this.serviceName}; then
    echo "✅ AutoControl Pro stopped successfully"
else
    echo "❌ Failed to stop AutoControl Pro"
    sudo systemctl status ${this.serviceName} --no-pager -l
    exit 1
fi
`;

    // Restart script
    const restartScript = `#!/bin/bash
# Restart AutoControl Pro service

echo "Restarting AutoControl Pro..."
sudo systemctl restart ${this.serviceName}

if sudo systemctl is-active --quiet ${this.serviceName}; then
    echo "✅ AutoControl Pro restarted successfully"
    sudo systemctl status ${this.serviceName} --no-pager -l
else
    echo "❌ Failed to restart AutoControl Pro"
    sudo systemctl status ${this.serviceName} --no-pager -l
    exit 1
fi
`;

    // Status script
    const statusScript = `#!/bin/bash
# Check AutoControl Pro service status

echo "AutoControl Pro Service Status:"
echo "================================"
sudo systemctl status ${this.serviceName} --no-pager -l

echo ""
echo "Recent Logs:"
echo "============"
sudo journalctl -u ${this.serviceName} --no-pager -l -n 20
`;

    // Logs script
    const logsScript = `#!/bin/bash
# View AutoControl Pro logs

if [ "$1" = "-f" ] || [ "$1" = "--follow" ]; then
    echo "Following AutoControl Pro logs (Ctrl+C to exit):"
    sudo journalctl -u ${this.serviceName} -f
else
    echo "Recent AutoControl Pro logs:"
    sudo journalctl -u ${this.serviceName} --no-pager -l -n 50
fi
`;

    const scripts = [
      { name: 'start.sh', content: startScript },
      { name: 'stop.sh', content: stopScript },
      { name: 'restart.sh', content: restartScript },
      { name: 'status.sh', content: statusScript },
      { name: 'logs.sh', content: logsScript }
    ];

    const scriptsDir = path.join(__dirname, 'service');
    await fs.mkdir(scriptsDir, { recursive: true });

    for (const script of scripts) {
      const scriptPath = path.join(scriptsDir, script.name);
      await fs.writeFile(scriptPath, script.content);
      await fs.chmod(scriptPath, 0o755);
      console.log(`   ✓ Created: ${script.name}`);
    }

    console.log(`   📁 Scripts saved to: ${scriptsDir}`);
  }

  printServiceCommands() {
    console.log('\\n' + '='.repeat(60));
    console.log('🎯 SYSTEMD SERVICE COMMANDS');
    console.log('='.repeat(60));
    
    console.log('\\n📋 Basic Commands:');
    console.log(`   sudo systemctl start ${this.serviceName}     # Start service`);
    console.log(`   sudo systemctl stop ${this.serviceName}      # Stop service`);
    console.log(`   sudo systemctl restart ${this.serviceName}   # Restart service`);
    console.log(`   sudo systemctl status ${this.serviceName}    # Check status`);
    console.log(`   sudo systemctl enable ${this.serviceName}    # Enable auto-start`);
    console.log(`   sudo systemctl disable ${this.serviceName}   # Disable auto-start`);
    
    console.log('\\n📊 Monitoring Commands:');
    console.log(`   sudo journalctl -u ${this.serviceName}       # View logs`);
    console.log(`   sudo journalctl -u ${this.serviceName} -f    # Follow logs`);
    console.log(`   sudo journalctl -u ${this.serviceName} --since "1 hour ago"`);
    
    console.log('\\n🔧 Configuration:');
    console.log(`   sudo systemctl edit ${this.serviceName}      # Override settings`);
    console.log(`   sudo systemctl daemon-reload                 # Reload after changes`);
    
    console.log('\\n📜 Helper Scripts:');
    console.log(`   ./scripts/service/start.sh                   # Start with status`);
    console.log(`   ./scripts/service/stop.sh                    # Stop with status`);
    console.log(`   ./scripts/service/restart.sh                 # Restart with status`);
    console.log(`   ./scripts/service/status.sh                  # Detailed status`);
    console.log(`   ./scripts/service/logs.sh                    # View recent logs`);
    console.log(`   ./scripts/service/logs.sh -f                 # Follow logs`);
    
    console.log('\\n' + '='.repeat(60));
  }
}

// Run if called directly
if (require.main === module) {
  const setup = new SystemdServiceSetup();
  setup.run().catch(error => {
    console.error('Setup failed:', error);
    process.exit(1);
  });
}

module.exports = SystemdServiceSetup;