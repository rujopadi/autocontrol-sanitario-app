#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class ProductionDeployment {
  constructor() {
    this.projectRoot = path.join(__dirname, '..');
    this.requiredEnvVars = [
      'MONGODB_URI',
      'JWT_SECRET',
      'EMAIL_API_KEY',
      'FRONTEND_URL'
    ];
  }

  async checkPrerequisites() {
    console.log('🔍 Checking deployment prerequisites...');
    
    // Check if Node.js version is compatible
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion < 16) {
      throw new Error(`Node.js version ${nodeVersion} is not supported. Please use Node.js 16 or higher.`);
    }
    
    console.log(`✅ Node.js version: ${nodeVersion}`);
    
    // Check if required packages are installed
    try {
      await fs.access(path.join(this.projectRoot, 'node_modules'));
      console.log('✅ Node modules are installed');
    } catch (error) {
      throw new Error('Node modules not found. Please run "npm install" first.');
    }
    
    // Check if MongoDB tools are available (for backups)
    try {
      await execAsync('mongodump --version');
      console.log('✅ MongoDB tools are available');
    } catch (error) {
      console.warn('⚠️ MongoDB tools not found. Database backups will not be available.');
    }
  }

  async checkEnvironmentVariables() {
    console.log('🔧 Checking environment variables...');
    
    const missingVars = [];
    
    for (const envVar of this.requiredEnvVars) {
      if (!process.env[envVar]) {
        missingVars.push(envVar);
      }
    }
    
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
    
    console.log('✅ All required environment variables are set');
    
    // Validate MongoDB URI format
    if (!process.env.MONGODB_URI.startsWith('mongodb://') && !process.env.MONGODB_URI.startsWith('mongodb+srv://')) {
      throw new Error('Invalid MONGODB_URI format');
    }
    
    // Validate JWT secret length
    if (process.env.JWT_SECRET.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long');
    }
    
    console.log('✅ Environment variables validation passed');
  }

  async setupDirectories() {
    console.log('📁 Setting up directories...');
    
    const directories = [
      'logs',
      'backups',
      'uploads',
      'temp'
    ];
    
    for (const dir of directories) {
      const dirPath = path.join(this.projectRoot, dir);
      try {
        await fs.access(dirPath);
        console.log(`✅ Directory exists: ${dir}`);
      } catch (error) {
        await fs.mkdir(dirPath, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      }
    }
  }

  async setupDatabase() {
    console.log('🗄️ Setting up database...');
    
    try {
      // Import and run database setup
      const { setupDatabase } = require('./setup-database');
      await setupDatabase();
      console.log('✅ Database setup completed');
    } catch (error) {
      console.error('❌ Database setup failed:', error.message);
      throw error;
    }
  }

  async createSystemdService() {
    if (process.platform !== 'linux') {
      console.log('⏭️ Skipping systemd service creation (not on Linux)');
      return;
    }

    console.log('🔧 Creating systemd service...');
    
    const serviceName = 'autocontrol-api';
    const serviceContent = `[Unit]
Description=Autocontrol Sanitario Pro API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=${this.projectRoot}
Environment=NODE_ENV=production
ExecStart=${process.execPath} server.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=${serviceName}

[Install]
WantedBy=multi-user.target`;

    const servicePath = `/etc/systemd/system/${serviceName}.service`;
    
    try {
      await fs.writeFile(servicePath, serviceContent);
      await execAsync('systemctl daemon-reload');
      await execAsync(`systemctl enable ${serviceName}`);
      console.log(`✅ Systemd service created: ${serviceName}`);
    } catch (error) {
      console.warn('⚠️ Could not create systemd service (requires sudo):', error.message);
    }
  }

  async setupLogRotation() {
    if (process.platform !== 'linux') {
      console.log('⏭️ Skipping log rotation setup (not on Linux)');
      return;
    }

    console.log('📋 Setting up log rotation...');
    
    const logrotateConfig = `${path.join(this.projectRoot, 'logs')}/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0644 www-data www-data
    postrotate
        systemctl reload autocontrol-api || true
    endscript
}`;

    try {
      await fs.writeFile('/etc/logrotate.d/autocontrol-api', logrotateConfig);
      console.log('✅ Log rotation configured');
    } catch (error) {
      console.warn('⚠️ Could not setup log rotation (requires sudo):', error.message);
    }
  }

  async setupCronJobs() {
    console.log('⏰ Setting up cron jobs...');
    
    const cronJobs = [
      '0 2 * * * cd ' + this.projectRoot + ' && node scripts/backup-database.js create',
      '0 3 * * 0 cd ' + this.projectRoot + ' && node scripts/backup-database.js cleanup'
    ];
    
    try {
      const { stdout } = await execAsync('crontab -l');
      const existingCron = stdout;
      
      let newCron = existingCron;
      for (const job of cronJobs) {
        if (!existingCron.includes(job)) {
          newCron += '\n' + job;
        }
      }
      
      if (newCron !== existingCron) {
        await fs.writeFile('/tmp/new-crontab', newCron);
        await execAsync('crontab /tmp/new-crontab');
        await fs.unlink('/tmp/new-crontab');
        console.log('✅ Cron jobs configured');
      } else {
        console.log('✅ Cron jobs already configured');
      }
    } catch (error) {
      console.warn('⚠️ Could not setup cron jobs:', error.message);
    }
  }

  async runSecurityCheck() {
    console.log('🔒 Running security check...');
    
    try {
      // Check for npm audit issues
      const { stdout } = await execAsync('npm audit --audit-level moderate');
      console.log('✅ No security vulnerabilities found');
    } catch (error) {
      console.warn('⚠️ Security vulnerabilities detected. Run "npm audit fix" to resolve.');
    }
    
    // Check file permissions
    const sensitiveFiles = [
      '.env',
      '.env.production',
      'config/database.prod.js'
    ];
    
    for (const file of sensitiveFiles) {
      const filePath = path.join(this.projectRoot, file);
      try {
        const stats = await fs.stat(filePath);
        const mode = stats.mode & parseInt('777', 8);
        if (mode > parseInt('600', 8)) {
          console.warn(`⚠️ File ${file} has overly permissive permissions: ${mode.toString(8)}`);
        }
      } catch (error) {
        // File doesn't exist, which is fine
      }
    }
  }

  async performHealthCheck() {
    console.log('🏥 Performing health check...');
    
    // Start the server temporarily for health check
    const server = require('../server');
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Health check timeout'));
      }, 10000);
      
      const checkHealth = async () => {
        try {
          const response = await fetch(`http://localhost:${process.env.PORT || 5000}/health`);
          if (response.ok) {
            clearTimeout(timeout);
            console.log('✅ Health check passed');
            resolve();
          } else {
            throw new Error(`Health check failed with status: ${response.status}`);
          }
        } catch (error) {
          setTimeout(checkHealth, 1000);
        }
      };
      
      setTimeout(checkHealth, 2000);
    });
  }

  async deploy() {
    try {
      console.log('🚀 Starting production deployment...\n');
      
      await this.checkPrerequisites();
      await this.checkEnvironmentVariables();
      await this.setupDirectories();
      await this.setupDatabase();
      await this.createSystemdService();
      await this.setupLogRotation();
      await this.setupCronJobs();
      await this.runSecurityCheck();
      
      console.log('\n🎉 Production deployment completed successfully!');
      console.log('\n📋 Next steps:');
      console.log('1. Start the service: sudo systemctl start autocontrol-api');
      console.log('2. Check service status: sudo systemctl status autocontrol-api');
      console.log('3. View logs: sudo journalctl -u autocontrol-api -f');
      console.log('4. Configure your reverse proxy (nginx/apache)');
      console.log('5. Set up SSL certificates');
      
    } catch (error) {
      console.error('\n❌ Deployment failed:', error.message);
      process.exit(1);
    }
  }
}

// Run deployment if called directly
if (require.main === module) {
  const deployment = new ProductionDeployment();
  deployment.deploy();
}

module.exports = ProductionDeployment;