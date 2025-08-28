#!/usr/bin/env node
/**
 * Automated Backup Setup Script
 * Configures automated backups and disaster recovery procedures
 */

const mongoose = require('mongoose');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

/**
 * Backup configuration
 */
const BACKUP_CONFIG = {
  // Backup settings
  schedule: {
    full: '0 2 * * *', // Daily at 2 AM
    incremental: '0 */6 * * *', // Every 6 hours
    weekly: '0 1 * * 0', // Weekly on Sunday at 1 AM
    monthly: '0 0 1 * *' // Monthly on 1st at midnight
  },
  
  // Retention policy
  retention: {
    daily: 7, // Keep 7 daily backups
    weekly: 4, // Keep 4 weekly backups
    monthly: 12, // Keep 12 monthly backups
    yearly: 3 // Keep 3 yearly backups
  },
  
  // Storage locations
  storage: {
    local: {
      enabled: true,
      path: process.env.BACKUP_LOCAL_PATH || '/var/backups/autocontrol',
      compression: true,
      encryption: true
    },
    s3: {
      enabled: process.env.BACKUP_S3_ENABLED === 'true',
      bucket: process.env.BACKUP_S3_BUCKET,
      region: process.env.BACKUP_S3_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      encryption: 'AES256'
    },
    atlas: {
      enabled: true, // MongoDB Atlas automatic backups
      retentionDays: 30
    }
  },
  
  // Backup options
  options: {
    compression: 'gzip',
    parallel: true,
    excludeCollections: ['sessions', 'temp_data'],
    includeIndexes: true,
    oplog: true // For point-in-time recovery
  },
  
  // Notification settings
  notifications: {
    email: {
      enabled: process.env.BACKUP_EMAIL_NOTIFICATIONS === 'true',
      recipients: process.env.BACKUP_EMAIL_RECIPIENTS?.split(',') || [],
      onSuccess: false, // Only notify on failures by default
      onFailure: true
    },
    webhook: {
      enabled: process.env.BACKUP_WEBHOOK_ENABLED === 'true',
      url: process.env.BACKUP_WEBHOOK_URL
    }
  }
};

/**
 * Backup manager class
 */
class BackupManager {
  constructor() {
    this.isRunning = false;
    this.currentBackups = new Map();
    this.backupHistory = [];
  }

  /**
   * Initialize backup system
   */
  async initialize() {
    try {
      console.log('🚀 Initializing backup system...');
      
      // Create backup directories
      await this.createBackupDirectories();
      
      // Validate configuration
      await this.validateConfiguration();
      
      // Setup backup schedules
      await this.setupBackupSchedules();
      
      // Test backup functionality
      await this.testBackupFunctionality();
      
      console.log('✅ Backup system initialized successfully');
      
    } catch (error) {
      console.error('❌ Error initializing backup system:', error);
      throw error;
    }
  }

  /**
   * Create backup directories
   */
  async createBackupDirectories() {
    if (!BACKUP_CONFIG.storage.local.enabled) {
      return;
    }

    const backupPath = BACKUP_CONFIG.storage.local.path;
    const subdirs = ['daily', 'weekly', 'monthly', 'temp'];

    try {
      // Create main backup directory
      await fs.mkdir(backupPath, { recursive: true });
      
      // Create subdirectories
      for (const subdir of subdirs) {
        await fs.mkdir(path.join(backupPath, subdir), { recursive: true });
      }
      
      console.log(`✅ Backup directories created at ${backupPath}`);
      
    } catch (error) {
      console.error('Error creating backup directories:', error);
      throw error;
    }
  }

  /**
   * Validate backup configuration
   */
  async validateConfiguration() {
    console.log('🔍 Validating backup configuration...');
    
    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
    
    // Check local storage
    if (BACKUP_CONFIG.storage.local.enabled) {
      try {
        await fs.access(BACKUP_CONFIG.storage.local.path);
      } catch (error) {
        throw new Error(`Local backup path not accessible: ${BACKUP_CONFIG.storage.local.path}`);
      }
    }
    
    // Check S3 configuration
    if (BACKUP_CONFIG.storage.s3.enabled) {
      if (!BACKUP_CONFIG.storage.s3.bucket || 
          !BACKUP_CONFIG.storage.s3.accessKeyId || 
          !BACKUP_CONFIG.storage.s3.secretAccessKey) {
        throw new Error('S3 backup enabled but missing required configuration');
      }
    }
    
    // Check mongodump availability
    try {
      await this.executeCommand('mongodump --version');
      console.log('✅ mongodump available');
    } catch (error) {
      throw new Error('mongodump not found. Please install MongoDB tools.');
    }
    
    console.log('✅ Backup configuration validated');
  }

  /**
   * Setup backup schedules
   */
  async setupBackupSchedules() {
    const cron = require('node-cron');
    
    console.log('⏰ Setting up backup schedules...');
    
    // Daily backup
    cron.schedule(BACKUP_CONFIG.schedule.full, async () => {
      await this.performBackup('daily');
    });
    
    // Weekly backup
    cron.schedule(BACKUP_CONFIG.schedule.weekly, async () => {
      await this.performBackup('weekly');
    });
    
    // Monthly backup
    cron.schedule(BACKUP_CONFIG.schedule.monthly, async () => {
      await this.performBackup('monthly');
    });
    
    console.log('✅ Backup schedules configured');
  }

  /**
   * Perform backup
   */
  async performBackup(type = 'daily') {
    const backupId = `${type}_${Date.now()}`;
    const startTime = new Date();
    
    try {
      console.log(`🔄 Starting ${type} backup (${backupId})...`);
      
      this.currentBackups.set(backupId, {
        type,
        startTime,
        status: 'running'
      });
      
      // Create backup
      const backupResult = await this.createBackup(backupId, type);
      
      // Upload to remote storage
      if (BACKUP_CONFIG.storage.s3.enabled) {
        await this.uploadToS3(backupResult.filePath, backupId);
      }
      
      // Cleanup old backups
      await this.cleanupOldBackups(type);
      
      // Update backup status
      const endTime = new Date();
      const duration = endTime - startTime;
      
      this.currentBackups.set(backupId, {
        type,
        startTime,
        endTime,
        duration,
        status: 'completed',
        size: backupResult.size,
        filePath: backupResult.filePath
      });
      
      // Add to history
      this.backupHistory.push(this.currentBackups.get(backupId));
      this.currentBackups.delete(backupId);
      
      // Keep only last 100 history entries
      if (this.backupHistory.length > 100) {
        this.backupHistory = this.backupHistory.slice(-100);
      }
      
      console.log(`✅ ${type} backup completed (${backupId}) - Duration: ${duration}ms`);
      
      // Send success notification if enabled
      if (BACKUP_CONFIG.notifications.email.onSuccess) {
        await this.sendNotification('success', {
          type,
          backupId,
          duration,
          size: backupResult.size
        });
      }
      
      return backupResult;
      
    } catch (error) {
      console.error(`❌ ${type} backup failed (${backupId}):`, error);
      
      // Update backup status
      this.currentBackups.set(backupId, {
        type,
        startTime,
        endTime: new Date(),
        status: 'failed',
        error: error.message
      });
      
      // Send failure notification
      await this.sendNotification('failure', {
        type,
        backupId,
        error: error.message
      });
      
      throw error;
    }
  }

  /**
   * Create backup using mongodump
   */
  async createBackup(backupId, type) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `backup_${type}_${timestamp}`;
    const tempDir = path.join(BACKUP_CONFIG.storage.local.path, 'temp', backupName);
    const outputFile = path.join(
      BACKUP_CONFIG.storage.local.path, 
      type, 
      `${backupName}.tar.gz`
    );
    
    try {
      // Create temp directory
      await fs.mkdir(tempDir, { recursive: true });
      
      // Build mongodump command
      const uri = new URL(process.env.MONGODB_URI);
      const dbName = uri.pathname.slice(1) || 'autocontrol-pro';
      
      let mongodumpCmd = `mongodump --uri="${process.env.MONGODB_URI}" --out="${tempDir}"`;
      
      // Add options
      if (BACKUP_CONFIG.options.oplog) {
        mongodumpCmd += ' --oplog';
      }
      
      if (BACKUP_CONFIG.options.parallel) {
        mongodumpCmd += ' --numParallelCollections=4';
      }
      
      // Exclude collections
      if (BACKUP_CONFIG.options.excludeCollections.length > 0) {
        for (const collection of BACKUP_CONFIG.options.excludeCollections) {
          mongodumpCmd += ` --excludeCollection=${collection}`;
        }
      }
      
      // Execute mongodump
      console.log(`📦 Creating database dump...`);
      await this.executeCommand(mongodumpCmd);
      
      // Compress backup
      console.log(`🗜️ Compressing backup...`);
      const tarCmd = `tar -czf "${outputFile}" -C "${path.dirname(tempDir)}" "${path.basename(tempDir)}"`;
      await this.executeCommand(tarCmd);
      
      // Get file size
      const stats = await fs.stat(outputFile);
      const size = stats.size;
      
      // Cleanup temp directory
      await fs.rm(tempDir, { recursive: true, force: true });
      
      console.log(`✅ Backup created: ${outputFile} (${this.formatBytes(size)})`);
      
      return {
        filePath: outputFile,
        size,
        timestamp: new Date()
      };
      
    } catch (error) {
      // Cleanup on error
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
        await fs.rm(outputFile, { force: true });
      } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError);
      }
      
      throw error;
    }
  }

  /**
   * Upload backup to S3
   */
  async uploadToS3(filePath, backupId) {
    if (!BACKUP_CONFIG.storage.s3.enabled) {
      return;
    }
    
    try {
      console.log(`☁️ Uploading backup to S3...`);
      
      const AWS = require('aws-sdk');
      const s3 = new AWS.S3({
        accessKeyId: BACKUP_CONFIG.storage.s3.accessKeyId,
        secretAccessKey: BACKUP_CONFIG.storage.s3.secretAccessKey,
        region: BACKUP_CONFIG.storage.s3.region
      });
      
      const fileContent = await fs.readFile(filePath);
      const fileName = path.basename(filePath);
      
      const uploadParams = {
        Bucket: BACKUP_CONFIG.storage.s3.bucket,
        Key: `backups/${fileName}`,
        Body: fileContent,
        ServerSideEncryption: BACKUP_CONFIG.storage.s3.encryption,
        StorageClass: 'STANDARD_IA' // Infrequent Access for cost optimization
      };
      
      await s3.upload(uploadParams).promise();
      
      console.log(`✅ Backup uploaded to S3: s3://${BACKUP_CONFIG.storage.s3.bucket}/backups/${fileName}`);
      
    } catch (error) {
      console.error('Error uploading to S3:', error);
      throw error;
    }
  }

  /**
   * Cleanup old backups
   */
  async cleanupOldBackups(type) {
    if (!BACKUP_CONFIG.storage.local.enabled) {
      return;
    }
    
    try {
      const backupDir = path.join(BACKUP_CONFIG.storage.local.path, type);
      const files = await fs.readdir(backupDir);
      
      // Sort files by modification time (newest first)
      const fileStats = await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(backupDir, file);
          const stats = await fs.stat(filePath);
          return { file, filePath, mtime: stats.mtime };
        })
      );
      
      fileStats.sort((a, b) => b.mtime - a.mtime);
      
      // Keep only the required number of backups
      const retentionCount = BACKUP_CONFIG.retention[type] || 7;
      const filesToDelete = fileStats.slice(retentionCount);
      
      for (const fileInfo of filesToDelete) {
        await fs.rm(fileInfo.filePath);
        console.log(`🗑️ Deleted old backup: ${fileInfo.file}`);
      }
      
      if (filesToDelete.length > 0) {
        console.log(`✅ Cleaned up ${filesToDelete.length} old ${type} backups`);
      }
      
    } catch (error) {
      console.error('Error cleaning up old backups:', error);
    }
  }

  /**
   * Test backup functionality
   */
  async testBackupFunctionality() {
    console.log('🧪 Testing backup functionality...');
    
    try {
      // Create a small test backup
      const testResult = await this.createBackup('test', 'daily');
      
      // Verify backup file exists and has content
      const stats = await fs.stat(testResult.filePath);
      if (stats.size === 0) {
        throw new Error('Test backup file is empty');
      }
      
      // Cleanup test backup
      await fs.rm(testResult.filePath);
      
      console.log('✅ Backup functionality test passed');
      
    } catch (error) {
      console.error('❌ Backup functionality test failed:', error);
      throw error;
    }
  }

  /**
   * Send notification
   */
  async sendNotification(type, data) {
    try {
      // Email notification
      if (BACKUP_CONFIG.notifications.email.enabled) {
        await this.sendEmailNotification(type, data);
      }
      
      // Webhook notification
      if (BACKUP_CONFIG.notifications.webhook.enabled) {
        await this.sendWebhookNotification(type, data);
      }
      
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  /**
   * Send email notification
   */
  async sendEmailNotification(type, data) {
    const nodemailer = require('nodemailer');
    
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    
    const subject = type === 'success' 
      ? `Backup Completed: ${data.type}` 
      : `Backup Failed: ${data.type}`;
    
    const text = type === 'success'
      ? `Backup completed successfully:
        
Type: ${data.type}
Backup ID: ${data.backupId}
Duration: ${data.duration}ms
Size: ${this.formatBytes(data.size)}
        `
      : `Backup failed:
        
Type: ${data.type}
Backup ID: ${data.backupId}
Error: ${data.error}
        `;
    
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: BACKUP_CONFIG.notifications.email.recipients.join(','),
      subject,
      text
    });
  }

  /**
   * Send webhook notification
   */
  async sendWebhookNotification(type, data) {
    const axios = require('axios');
    
    await axios.post(BACKUP_CONFIG.notifications.webhook.url, {
      event: `backup_${type}`,
      timestamp: new Date().toISOString(),
      data
    });
  }

  /**
   * Execute shell command
   */
  async executeCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Command failed: ${error.message}\nStderr: ${stderr}`));
        } else {
          resolve(stdout);
        }
      });
    });
  }

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get backup status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      currentBackups: Array.from(this.currentBackups.values()),
      recentHistory: this.backupHistory.slice(-10),
      config: BACKUP_CONFIG
    };
  }
}

/**
 * Setup automated backups
 */
async function setupAutomatedBackups() {
  try {
    console.log('🔧 Setting up automated backups...');
    
    // Create backup manager
    const backupManager = new BackupManager();
    
    // Initialize backup system
    await backupManager.initialize();
    
    console.log('✅ Automated backup setup completed');
    
    // Setup graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down backup system...');
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.log('\n🛑 Shutting down backup system...');
      process.exit(0);
    });
    
    // Keep process running
    setInterval(() => {
      const status = backupManager.getStatus();
      console.log(`💾 Backup status - Running backups: ${status.currentBackups.length}, Recent history: ${status.recentHistory.length}`);
    }, 300000); // Log status every 5 minutes
    
  } catch (error) {
    console.error('❌ Error setting up automated backups:', error);
    process.exit(1);
  }
}

// Run setup if called directly
if (require.main === module) {
  setupAutomatedBackups();
}

module.exports = {
  BackupManager,
  setupAutomatedBackups,
  BACKUP_CONFIG
};