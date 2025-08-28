const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { promisify } = require('util');

const execAsync = promisify(exec);

class DatabaseBackup {
  constructor() {
    this.backupDir = process.env.BACKUP_DIR || './backups';
    this.retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS) || 30;
    this.mongoUri = process.env.MONGODB_URI;
    this.dbName = this.extractDbName(this.mongoUri);
  }

  extractDbName(uri) {
    try {
      const match = uri.match(/\/([^?]+)/);
      return match ? match[1] : 'autocontrol-prod';
    } catch (error) {
      return 'autocontrol-prod';
    }
  }

  async ensureBackupDirectory() {
    try {
      await fs.access(this.backupDir);
    } catch (error) {
      await fs.mkdir(this.backupDir, { recursive: true });
      console.log(`📁 Created backup directory: ${this.backupDir}`);
    }
  }

  generateBackupFileName() {
    const timestamp = new Date().toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .split('.')[0];
    return `${this.dbName}_backup_${timestamp}`;
  }

  async createBackup() {
    try {
      console.log('🚀 Starting database backup...');
      
      await this.ensureBackupDirectory();
      
      const backupName = this.generateBackupFileName();
      const backupPath = path.join(this.backupDir, backupName);
      
      // Use mongodump to create backup
      const command = `mongodump --uri="${this.mongoUri}" --out="${backupPath}"`;
      
      console.log('📦 Creating backup...');
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr && !stderr.includes('done dumping')) {
        throw new Error(`Backup failed: ${stderr}`);
      }
      
      // Compress the backup
      const archivePath = `${backupPath}.tar.gz`;
      const compressCommand = `tar -czf "${archivePath}" -C "${this.backupDir}" "${backupName}"`;
      
      console.log('🗜️ Compressing backup...');
      await execAsync(compressCommand);
      
      // Remove uncompressed backup directory
      await execAsync(`rm -rf "${backupPath}"`);
      
      // Get backup file size
      const stats = await fs.stat(archivePath);
      const fileSizeMB = Math.round(stats.size / 1024 / 1024 * 100) / 100;
      
      console.log(`✅ Backup created successfully:`);
      console.log(`   File: ${archivePath}`);
      console.log(`   Size: ${fileSizeMB} MB`);
      console.log(`   Date: ${new Date().toISOString()}`);
      
      return {
        success: true,
        filePath: archivePath,
        fileName: `${backupName}.tar.gz`,
        size: fileSizeMB,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Backup failed:', error.message);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async cleanupOldBackups() {
    try {
      console.log('🧹 Cleaning up old backups...');
      
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files.filter(file => 
        file.includes('_backup_') && file.endsWith('.tar.gz')
      );
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);
      
      let deletedCount = 0;
      
      for (const file of backupFiles) {
        const filePath = path.join(this.backupDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          console.log(`🗑️ Deleted old backup: ${file}`);
          deletedCount++;
        }
      }
      
      console.log(`✅ Cleanup completed. Deleted ${deletedCount} old backups.`);
      
      return { deletedCount };
      
    } catch (error) {
      console.error('❌ Cleanup failed:', error.message);
      return { error: error.message };
    }
  }

  async listBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files.filter(file => 
        file.includes('_backup_') && file.endsWith('.tar.gz')
      );
      
      const backups = [];
      
      for (const file of backupFiles) {
        const filePath = path.join(this.backupDir, file);
        const stats = await fs.stat(filePath);
        
        backups.push({
          fileName: file,
          filePath: filePath,
          size: Math.round(stats.size / 1024 / 1024 * 100) / 100, // MB
          created: stats.mtime.toISOString(),
          age: Math.floor((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24)) // days
        });
      }
      
      // Sort by creation date (newest first)
      backups.sort((a, b) => new Date(b.created) - new Date(a.created));
      
      return backups;
      
    } catch (error) {
      console.error('❌ Failed to list backups:', error.message);
      return [];
    }
  }

  async restoreBackup(backupFileName) {
    try {
      console.log(`🔄 Starting database restore from: ${backupFileName}`);
      
      const backupPath = path.join(this.backupDir, backupFileName);
      
      // Check if backup file exists
      await fs.access(backupPath);
      
      // Extract backup
      const extractDir = path.join(this.backupDir, 'temp_restore');
      await execAsync(`mkdir -p "${extractDir}"`);
      await execAsync(`tar -xzf "${backupPath}" -C "${extractDir}"`);
      
      // Find the extracted database directory
      const extractedContents = await fs.readdir(extractDir);
      const dbDir = path.join(extractDir, extractedContents[0], this.dbName);
      
      // Restore using mongorestore
      const restoreCommand = `mongorestore --uri="${this.mongoUri}" --drop "${dbDir}"`;
      
      console.log('📥 Restoring database...');
      const { stdout, stderr } = await execAsync(restoreCommand);
      
      if (stderr && !stderr.includes('done restoring')) {
        throw new Error(`Restore failed: ${stderr}`);
      }
      
      // Cleanup temporary files
      await execAsync(`rm -rf "${extractDir}"`);
      
      console.log('✅ Database restored successfully');
      
      return {
        success: true,
        message: 'Database restored successfully',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Restore failed:', error.message);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// CLI interface
const main = async () => {
  const backup = new DatabaseBackup();
  const command = process.argv[2];
  
  switch (command) {
    case 'create':
      await backup.createBackup();
      await backup.cleanupOldBackups();
      break;
      
    case 'list':
      const backups = await backup.listBackups();
      console.log('\n📋 Available Backups:');
      if (backups.length === 0) {
        console.log('   No backups found');
      } else {
        backups.forEach((backup, index) => {
          console.log(`   ${index + 1}. ${backup.fileName}`);
          console.log(`      Size: ${backup.size} MB`);
          console.log(`      Created: ${backup.created}`);
          console.log(`      Age: ${backup.age} days`);
          console.log('');
        });
      }
      break;
      
    case 'restore':
      const fileName = process.argv[3];
      if (!fileName) {
        console.error('❌ Please provide backup file name');
        console.log('Usage: node backup-database.js restore <backup-file-name>');
        process.exit(1);
      }
      await backup.restoreBackup(fileName);
      break;
      
    case 'cleanup':
      await backup.cleanupOldBackups();
      break;
      
    default:
      console.log('📖 Database Backup Tool');
      console.log('');
      console.log('Usage:');
      console.log('  node backup-database.js create   - Create new backup');
      console.log('  node backup-database.js list     - List all backups');
      console.log('  node backup-database.js restore <file> - Restore from backup');
      console.log('  node backup-database.js cleanup  - Remove old backups');
      break;
  }
};

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Command failed:', error);
    process.exit(1);
  });
}

module.exports = DatabaseBackup;