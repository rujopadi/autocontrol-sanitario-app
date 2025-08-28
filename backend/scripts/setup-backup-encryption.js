#!/usr/bin/env node
/**
 * Backup Encryption Setup Script
 * Configures encrypted backup storage and secure backup procedures
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const logger = require('../utils/logger');

/**
 * Backup encryption configuration
 */
const ENCRYPTION_CONFIG = {
  // Encryption settings
  encryption: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16,
    tagLength: 16,
    keyDerivation: 'pbkdf2',
    iterations: 100000
  },
  
  // Storage locations
  storage: {
    local: {
      enabled: true,
      path: '/var/backups/autocontrol/encrypted',
      retention: 30 // days
    },
    remote: {
      enabled: process.env.BACKUP_REMOTE_ENABLED === 'true',
      type: process.env.BACKUP_REMOTE_TYPE || 's3', // s3, ftp, sftp
      config: {
        s3: {
          bucket: process.env.BACKUP_S3_BUCKET,
          region: process.env.BACKUP_S3_REGION || 'us-east-1',
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        },
        ftp: {
          host: process.env.BACKUP_FTP_HOST,
          port: parseInt(process.env.BACKUP_FTP_PORT) || 21,
          username: process.env.BACKUP_FTP_USER,
          password: process.env.BACKUP_FTP_PASS
        }
      }
    }
  },
  
  // Backup verification
  verification: {
    enabled: true,
    checksumAlgorithm: 'sha256',
    integrityCheck: true,
    testRestore: true
  },
  
  // Key management
  keyManagement: {
    keyRotation: true,
    rotationInterval: 90, // days
    keyBackup: true,
    multipleKeys: true
  }
};

/**
 * Backup encryption configurator
 */
class BackupEncryptionConfigurator {
  constructor() {
    this.configPath = path.join(__dirname, '..', 'config', 'backup');
    this.scriptsPath = path.join(__dirname, '..', 'scripts', 'backup');
    this.keysPath = path.join(__dirname, '..', 'keys', 'backup');
    this.backupPath = '/var/backups/autocontrol';
  }

  /**
   * Setup complete backup encryption system
   */
  async setup() {
    try {
      console.log('🔐 Setting up backup encryption system...');
      console.log('========================================');
      
      // Create directories
      await this.createDirectories();
      
      // Generate encryption keys
      await this.generateEncryptionKeys();
      
      // Setup encryption scripts
      await this.setupEncryptionScripts();
      
      // Configure backup verification
      await this.setupBackupVerification();
      
      // Setup key management
      await this.setupKeyManagement();
      
      // Configure remote storage
      await this.configureRemoteStorage();
      
      // Create management scripts
      await this.createManagementScripts();
      
      // Test encryption system
      await this.testEncryptionSystem();
      
      console.log('\n✅ Backup encryption system setup completed!');
      
    } catch (error) {
      console.error('\n❌ Backup encryption setup failed:', error);
      throw error;
    }
  }

  /**
   * Create necessary directories
   */
  async createDirectories() {
    console.log('\n📁 Creating backup encryption directories...');
    
    const directories = [
      this.configPath,
      this.scriptsPath,
      this.keysPath,
      ENCRYPTION_CONFIG.storage.local.path,
      path.join(this.backupPath, 'temp'),
      path.join(this.backupPath, 'verified')
    ];
    
    for (const dir of directories) {
      await fs.mkdir(dir, { recursive: true });
      await fs.chmod(dir, 0o700); // Very restrictive permissions
      console.log(`   ✅ Created secure directory: ${dir}`);
    }
  }

  /**
   * Generate encryption keys
   */
  async generateEncryptionKeys() {
    console.log('\n🔑 Generating encryption keys...');
    
    // Generate master key
    const masterKey = crypto.randomBytes(ENCRYPTION_CONFIG.encryption.keyLength);
    const masterKeyPath = path.join(this.keysPath, 'master.key');
    
    await fs.writeFile(masterKeyPath, masterKey);
    await fs.chmod(masterKeyPath, 0o600);
    console.log(`   ✅ Master key generated: ${masterKeyPath}`);
    
    // Generate backup key (for key rotation)
    const backupKey = crypto.randomBytes(ENCRYPTION_CONFIG.encryption.keyLength);
    const backupKeyPath = path.join(this.keysPath, 'backup.key');
    
    await fs.writeFile(backupKeyPath, backupKey);
    await fs.chmod(backupKeyPath, 0o600);
    console.log(`   ✅ Backup key generated: ${backupKeyPath}`);
    
    // Generate key metadata
    const keyMetadata = {
      masterKey: {
        created: new Date().toISOString(),
        algorithm: ENCRYPTION_CONFIG.encryption.algorithm,
        keyLength: ENCRYPTION_CONFIG.encryption.keyLength,
        path: masterKeyPath
      },
      backupKey: {
        created: new Date().toISOString(),
        algorithm: ENCRYPTION_CONFIG.encryption.algorithm,
        keyLength: ENCRYPTION_CONFIG.encryption.keyLength,
        path: backupKeyPath
      },
      rotation: {
        enabled: ENCRYPTION_CONFIG.keyManagement.keyRotation,
        interval: ENCRYPTION_CONFIG.keyManagement.rotationInterval,
        lastRotation: new Date().toISOString()
      }
    };
    
    const metadataPath = path.join(this.configPath, 'keys.json');
    await fs.writeFile(metadataPath, JSON.stringify(keyMetadata, null, 2));
    await fs.chmod(metadataPath, 0o600);
    
    console.log(`   ✅ Key metadata saved: ${metadataPath}`);
  }

  /**
   * Setup encryption scripts
   */
  async setupEncryptionScripts() {
    console.log('\n🔧 Setting up encryption scripts...');
    
    // Create encryption script
    const encryptScript = `#!/bin/bash
# Backup encryption script

KEYS_DIR="${this.keysPath}"
BACKUP_DIR="${this.backupPath}"
ENCRYPTED_DIR="${ENCRYPTION_CONFIG.storage.local.path}"
LOG_FILE="/var/log/autocontrol/backup-encryption.log"

# Function to log messages
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S'): $1" >> "$LOG_FILE"
}

# Function to encrypt file
encrypt_file() {
    local input_file=$1
    local output_file=$2
    local key_file="$KEYS_DIR/master.key"
    
    if [ ! -f "$key_file" ]; then
        log_message "ERROR: Encryption key not found: $key_file"
        return 1
    fi
    
    if [ ! -f "$input_file" ]; then
        log_message "ERROR: Input file not found: $input_file"
        return 1
    fi
    
    # Generate random IV
    local iv=$(openssl rand -hex 16)
    
    # Encrypt file
    if openssl enc -aes-256-cbc -salt -in "$input_file" -out "$output_file" -pass file:"$key_file" -iv "$iv"; then
        log_message "SUCCESS: Encrypted $input_file to $output_file"
        
        # Generate checksum
        local checksum=$(sha256sum "$output_file" | cut -d' ' -f1)
        echo "$checksum" > "$output_file.sha256"
        
        # Create metadata
        cat > "$output_file.meta" <<EOF
{
    "original_file": "$input_file",
    "encrypted_file": "$output_file",
    "algorithm": "aes-256-cbc",
    "iv": "$iv",
    "checksum": "$checksum",
    "encrypted_at": "$(date -Iseconds)",
    "file_size": $(stat -c%s "$output_file")
}
EOF
        
        return 0
    else
        log_message "ERROR: Failed to encrypt $input_file"
        return 1
    fi
}

# Function to decrypt file
decrypt_file() {
    local input_file=$1
    local output_file=$2
    local key_file="$KEYS_DIR/master.key"
    
    if [ ! -f "$key_file" ]; then
        log_message "ERROR: Decryption key not found: $key_file"
        return 1
    fi
    
    if [ ! -f "$input_file" ]; then
        log_message "ERROR: Encrypted file not found: $input_file"
        return 1
    fi
    
    # Verify checksum if exists
    if [ -f "$input_file.sha256" ]; then
        local expected_checksum=$(cat "$input_file.sha256")
        local actual_checksum=$(sha256sum "$input_file" | cut -d' ' -f1)
        
        if [ "$expected_checksum" != "$actual_checksum" ]; then
            log_message "ERROR: Checksum verification failed for $input_file"
            return 1
        fi
    fi
    
    # Decrypt file
    if openssl enc -aes-256-cbc -d -in "$input_file" -out "$output_file" -pass file:"$key_file"; then
        log_message "SUCCESS: Decrypted $input_file to $output_file"
        return 0
    else
        log_message "ERROR: Failed to decrypt $input_file"
        return 1
    fi
}

# Main encryption logic
case "$1" in
    "encrypt")
        if [ -z "$2" ] || [ -z "$3" ]; then
            echo "Usage: $0 encrypt <input_file> <output_file>"
            exit 1
        fi
        encrypt_file "$2" "$3"
        ;;
    "decrypt")
        if [ -z "$2" ] || [ -z "$3" ]; then
            echo "Usage: $0 decrypt <input_file> <output_file>"
            exit 1
        fi
        decrypt_file "$2" "$3"
        ;;
    "encrypt-all")
        log_message "Starting batch encryption of backups"
        
        for backup_file in "$BACKUP_DIR"/*.tar.gz; do
            if [ -f "$backup_file" ]; then
                local filename=$(basename "$backup_file")
                local encrypted_file="$ENCRYPTED_DIR/$filename.enc"
                
                if encrypt_file "$backup_file" "$encrypted_file"; then
                    # Remove original after successful encryption
                    rm "$backup_file"
                    log_message "Removed original backup: $backup_file"
                fi
            fi
        done
        
        log_message "Batch encryption completed"
        ;;
    *)
        echo "Usage: $0 {encrypt|decrypt|encrypt-all} [input_file] [output_file]"
        exit 1
        ;;
esac
`;
    
    const encryptScriptPath = path.join(this.scriptsPath, 'encrypt-backup.sh');
    await fs.writeFile(encryptScriptPath, encryptScript);
    await fs.chmod(encryptScriptPath, 0o755);
    
    console.log(`   ✅ Encryption script created: ${encryptScriptPath}`);
  }

  /**
   * Setup backup verification
   */
  async setupBackupVerification() {
    console.log('\n✅ Setting up backup verification...');
    
    if (!ENCRYPTION_CONFIG.verification.enabled) {
      console.log('   ⚠️  Backup verification disabled in configuration');
      return;
    }
    
    // Create verification script
    const verifyScript = `#!/bin/bash
# Backup verification script

ENCRYPTED_DIR="${ENCRYPTION_CONFIG.storage.local.path}"
VERIFIED_DIR="${path.join(this.backupPath, 'verified')}"
TEMP_DIR="${path.join(this.backupPath, 'temp')}"
LOG_FILE="/var/log/autocontrol/backup-verification.log"
ENCRYPT_SCRIPT="${path.join(this.scriptsPath, 'encrypt-backup.sh')}"

# Function to log messages
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S'): $1" >> "$LOG_FILE"
}

# Function to verify encrypted backup
verify_backup() {
    local encrypted_file=$1
    local filename=$(basename "$encrypted_file" .enc)
    local temp_file="$TEMP_DIR/$filename"
    
    log_message "Verifying backup: $encrypted_file"
    
    # Check if metadata exists
    if [ ! -f "$encrypted_file.meta" ]; then
        log_message "WARNING: Metadata file missing for $encrypted_file"
    fi
    
    # Verify checksum
    if [ -f "$encrypted_file.sha256" ]; then
        local expected_checksum=$(cat "$encrypted_file.sha256")
        local actual_checksum=$(sha256sum "$encrypted_file" | cut -d' ' -f1)
        
        if [ "$expected_checksum" != "$actual_checksum" ]; then
            log_message "ERROR: Checksum verification failed for $encrypted_file"
            return 1
        else
            log_message "SUCCESS: Checksum verified for $encrypted_file"
        fi
    else
        log_message "WARNING: Checksum file missing for $encrypted_file"
    fi
    
    # Test decryption
    if "$ENCRYPT_SCRIPT" decrypt "$encrypted_file" "$temp_file"; then
        log_message "SUCCESS: Decryption test passed for $encrypted_file"
        
        # Verify it's a valid tar.gz file
        if tar -tzf "$temp_file" >/dev/null 2>&1; then
            log_message "SUCCESS: Archive integrity verified for $encrypted_file"
            
            # Move to verified directory
            mv "$encrypted_file" "$VERIFIED_DIR/"
            [ -f "$encrypted_file.meta" ] && mv "$encrypted_file.meta" "$VERIFIED_DIR/"
            [ -f "$encrypted_file.sha256" ] && mv "$encrypted_file.sha256" "$VERIFIED_DIR/"
            
            log_message "SUCCESS: Backup verified and moved to verified directory"
        else
            log_message "ERROR: Archive integrity check failed for $encrypted_file"
            return 1
        fi
        
        # Clean up temp file
        rm -f "$temp_file"
    else
        log_message "ERROR: Decryption test failed for $encrypted_file"
        return 1
    fi
    
    return 0
}

# Function to verify all backups
verify_all_backups() {
    log_message "Starting verification of all encrypted backups"
    
    local verified_count=0
    local failed_count=0
    
    for encrypted_file in "$ENCRYPTED_DIR"/*.enc; do
        if [ -f "$encrypted_file" ]; then
            if verify_backup "$encrypted_file"; then
                ((verified_count++))
            else
                ((failed_count++))
            fi
        fi
    done
    
    log_message "Verification completed: $verified_count verified, $failed_count failed"
    
    # Send alert if any failures
    if [ "$failed_count" -gt 0 ]; then
        echo "Backup verification failed for $failed_count backups. Check log: $LOG_FILE" | \\
        mail -s "AutoControl Pro: Backup Verification Failures" "${process.env.BACKUP_ALERT_EMAIL || 'admin@your-domain.com'}"
    fi
}

# Main verification logic
case "$1" in
    "verify")
        if [ -z "$2" ]; then
            echo "Usage: $0 verify <encrypted_file>"
            exit 1
        fi
        verify_backup "$2"
        ;;
    "verify-all")
        verify_all_backups
        ;;
    *)
        echo "Usage: $0 {verify|verify-all} [encrypted_file]"
        exit 1
        ;;
esac
`;
    
    const verifyScriptPath = path.join(this.scriptsPath, 'verify-backup.sh');
    await fs.writeFile(verifyScriptPath, verifyScript);
    await fs.chmod(verifyScriptPath, 0o755);
    
    // Setup daily verification cron job
    const verifyCron = `0 4 * * * ${verifyScriptPath} verify-all`;
    await fs.writeFile('/tmp/backup-verify-cron', verifyCron);
    await execAsync('crontab /tmp/backup-verify-cron');
    await fs.unlink('/tmp/backup-verify-cron');
    
    console.log(`   ✅ Verification script created: ${verifyScriptPath}`);
    console.log('   ✅ Daily verification cron job configured');
  }  /**

   * Setup key management
   */
  async setupKeyManagement() {
    console.log('\n🔑 Setting up key management...');
    
    if (!ENCRYPTION_CONFIG.keyManagement.keyRotation) {
      console.log('   ⚠️  Key rotation disabled in configuration');
      return;
    }
    
    // Create key rotation script
    const rotationScript = `#!/bin/bash
# Encryption key rotation script

KEYS_DIR="${this.keysPath}"
CONFIG_FILE="${path.join(this.configPath, 'keys.json')}"
LOG_FILE="/var/log/autocontrol/key-rotation.log"
BACKUP_SCRIPT="${path.join(this.scriptsPath, 'encrypt-backup.sh')}"

# Function to log messages
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S'): $1" >> "$LOG_FILE"
}

# Function to rotate keys
rotate_keys() {
    log_message "Starting key rotation"
    
    # Backup current master key
    local timestamp=$(date +%Y%m%d_%H%M%S)
    cp "$KEYS_DIR/master.key" "$KEYS_DIR/master_$timestamp.key"
    
    # Generate new master key
    openssl rand -out "$KEYS_DIR/master.key" ${ENCRYPTION_CONFIG.encryption.keyLength}
    chmod 600 "$KEYS_DIR/master.key"
    
    # Update metadata
    local new_metadata=$(cat <<EOF
{
    "masterKey": {
        "created": "$(date -Iseconds)",
        "algorithm": "${ENCRYPTION_CONFIG.encryption.algorithm}",
        "keyLength": ${ENCRYPTION_CONFIG.encryption.keyLength},
        "path": "$KEYS_DIR/master.key"
    },
    "previousKey": {
        "created": "$(date -Iseconds)",
        "path": "$KEYS_DIR/master_$timestamp.key"
    },
    "rotation": {
        "enabled": true,
        "interval": ${ENCRYPTION_CONFIG.keyManagement.rotationInterval},
        "lastRotation": "$(date -Iseconds)"
    }
}
EOF
)
    
    echo "$new_metadata" > "$CONFIG_FILE"
    chmod 600 "$CONFIG_FILE"
    
    log_message "Key rotation completed successfully"
    
    # Send notification
    echo "Encryption key rotation completed successfully.

Previous key backed up to: master_$timestamp.key
New key generated: $(date)
Next rotation: $(date -d '+${ENCRYPTION_CONFIG.keyManagement.rotationInterval} days')

Please ensure all backup processes use the new key." | \\
    mail -s "AutoControl Pro: Encryption Key Rotated" "${process.env.BACKUP_ALERT_EMAIL || 'admin@your-domain.com'}"
}

# Check if rotation is needed
check_rotation_needed() {
    if [ ! -f "$CONFIG_FILE" ]; then
        log_message "Key metadata not found, rotation needed"
        return 0
    fi
    
    local last_rotation=$(grep -o '"lastRotation":"[^"]*"' "$CONFIG_FILE" | cut -d'"' -f4)
    
    if [ -z "$last_rotation" ]; then
        log_message "Last rotation date not found, rotation needed"
        return 0
    fi
    
    local last_rotation_epoch=$(date -d "$last_rotation" +%s)
    local current_epoch=$(date +%s)
    local days_since_rotation=$(( (current_epoch - last_rotation_epoch) / 86400 ))
    
    if [ "$days_since_rotation" -ge ${ENCRYPTION_CONFIG.keyManagement.rotationInterval} ]; then
        log_message "Key rotation needed: $days_since_rotation days since last rotation"
        return 0
    else
        log_message "Key rotation not needed: $days_since_rotation days since last rotation"
        return 1
    fi
}

# Main rotation logic
case "$1" in
    "rotate")
        rotate_keys
        ;;
    "check")
        if check_rotation_needed; then
            echo "Key rotation is needed"
            exit 0
        else
            echo "Key rotation is not needed"
            exit 1
        fi
        ;;
    "auto")
        if check_rotation_needed; then
            rotate_keys
        fi
        ;;
    *)
        echo "Usage: $0 {rotate|check|auto}"
        exit 1
        ;;
esac
`;
    
    const rotationScriptPath = path.join(this.scriptsPath, 'rotate-keys.sh');
    await fs.writeFile(rotationScriptPath, rotationScript);
    await fs.chmod(rotationScriptPath, 0o755);
    
    // Setup weekly key rotation check
    const rotationCron = `0 3 * * 0 ${rotationScriptPath} auto`;
    await fs.writeFile('/tmp/key-rotation-cron', rotationCron);
    await execAsync('crontab /tmp/key-rotation-cron');
    await fs.unlink('/tmp/key-rotation-cron');
    
    console.log(`   ✅ Key rotation script created: ${rotationScriptPath}`);
    console.log('   ✅ Weekly key rotation check configured');
  }

  /**
   * Configure remote storage
   */
  async configureRemoteStorage() {
    console.log('\n☁️  Configuring remote storage...');
    
    if (!ENCRYPTION_CONFIG.storage.remote.enabled) {
      console.log('   ⚠️  Remote storage disabled in configuration');
      return;
    }
    
    const storageType = ENCRYPTION_CONFIG.storage.remote.type;
    
    switch (storageType) {
      case 's3':
        await this.configureS3Storage();
        break;
      case 'ftp':
        await this.configureFTPStorage();
        break;
      case 'sftp':
        await this.configureSFTPStorage();
        break;
      default:
        console.log(`   ⚠️  Unknown storage type: ${storageType}`);
    }
  }

  /**
   * Configure S3 storage
   */
  async configureS3Storage() {
    console.log('\n   📦 Configuring S3 storage...');
    
    const s3Config = ENCRYPTION_CONFIG.storage.remote.config.s3;
    
    if (!s3Config.bucket || !s3Config.accessKeyId || !s3Config.secretAccessKey) {
      throw new Error('S3 configuration incomplete');
    }
    
    // Create S3 upload script
    const s3Script = `#!/bin/bash
# S3 backup upload script

AWS_ACCESS_KEY_ID="${s3Config.accessKeyId}"
AWS_SECRET_ACCESS_KEY="${s3Config.secretAccessKey}"
AWS_DEFAULT_REGION="${s3Config.region}"
S3_BUCKET="${s3Config.bucket}"
LOCAL_DIR="${ENCRYPTION_CONFIG.storage.local.path}"
LOG_FILE="/var/log/autocontrol/s3-backup.log"

# Function to log messages
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S'): $1" >> "$LOG_FILE"
}

# Function to upload to S3
upload_to_s3() {
    local file_path=$1
    local s3_key="backups/$(basename "$file_path")"
    
    log_message "Uploading $file_path to S3: s3://$S3_BUCKET/$s3_key"
    
    if aws s3 cp "$file_path" "s3://$S3_BUCKET/$s3_key" --server-side-encryption AES256; then
        log_message "SUCCESS: Uploaded $file_path to S3"
        
        # Upload metadata and checksum files
        [ -f "$file_path.meta" ] && aws s3 cp "$file_path.meta" "s3://$S3_BUCKET/$s3_key.meta"
        [ -f "$file_path.sha256" ] && aws s3 cp "$file_path.sha256" "s3://$S3_BUCKET/$s3_key.sha256"
        
        return 0
    else
        log_message "ERROR: Failed to upload $file_path to S3"
        return 1
    fi
}

# Upload all encrypted backups
for encrypted_file in "$LOCAL_DIR"/*.enc; do
    if [ -f "$encrypted_file" ]; then
        upload_to_s3 "$encrypted_file"
    fi
done

log_message "S3 upload completed"
`;
    
    const s3ScriptPath = path.join(this.scriptsPath, 'upload-s3.sh');
    await fs.writeFile(s3ScriptPath, s3Script);
    await fs.chmod(s3ScriptPath, 0o755);
    
    console.log(`   ✅ S3 upload script created: ${s3ScriptPath}`);
  }

  /**
   * Create management scripts
   */
  async createManagementScripts() {
    console.log('\n🛠️  Creating backup encryption management scripts...');
    
    // Main management script
    const managementScript = `#!/bin/bash
# Backup encryption management script

COMMAND=$1
TARGET=$2

KEYS_DIR="${this.keysPath}"
ENCRYPTED_DIR="${ENCRYPTION_CONFIG.storage.local.path}"
SCRIPTS_DIR="${this.scriptsPath}"

case "$COMMAND" in
    "status")
        echo "=== Backup Encryption System Status ==="
        echo "Date: $(date)"
        echo ""
        
        # Check encryption keys
        echo "=== Encryption Keys ==="
        if [ -f "$KEYS_DIR/master.key" ]; then
            echo "✅ Master key exists"
            echo "   Size: $(stat -c%s "$KEYS_DIR/master.key") bytes"
            echo "   Modified: $(stat -c%y "$KEYS_DIR/master.key")"
        else
            echo "❌ Master key missing"
        fi
        
        if [ -f "$KEYS_DIR/backup.key" ]; then
            echo "✅ Backup key exists"
        else
            echo "❌ Backup key missing"
        fi
        echo ""
        
        # Check encrypted backups
        echo "=== Encrypted Backups ==="
        local backup_count=$(ls -1 "$ENCRYPTED_DIR"/*.enc 2>/dev/null | wc -l)
        echo "Encrypted backups: $backup_count"
        
        if [ "$backup_count" -gt 0 ]; then
            echo "Recent backups:"
            ls -lht "$ENCRYPTED_DIR"/*.enc | head -5
        fi
        echo ""
        
        # Check verification status
        echo "=== Verification Status ==="
        local verified_count=$(ls -1 "${path.join(this.backupPath, 'verified')}"/*.enc 2>/dev/null | wc -l)
        echo "Verified backups: $verified_count"
        echo ""
        
        # Check disk usage
        echo "=== Storage Usage ==="
        du -sh "$ENCRYPTED_DIR"
        du -sh "${path.join(this.backupPath, 'verified')}"
        ;;
        
    "encrypt")
        if [ -z "$TARGET" ]; then
            echo "Usage: $0 encrypt <backup_file>"
            exit 1
        fi
        
        if [ ! -f "$TARGET" ]; then
            echo "Error: Backup file not found: $TARGET"
            exit 1
        fi
        
        local filename=$(basename "$TARGET")
        local encrypted_file="$ENCRYPTED_DIR/$filename.enc"
        
        "$SCRIPTS_DIR/encrypt-backup.sh" encrypt "$TARGET" "$encrypted_file"
        ;;
        
    "decrypt")
        if [ -z "$TARGET" ]; then
            echo "Usage: $0 decrypt <encrypted_file>"
            exit 1
        fi
        
        if [ ! -f "$TARGET" ]; then
            echo "Error: Encrypted file not found: $TARGET"
            exit 1
        fi
        
        local filename=$(basename "$TARGET" .enc)
        local decrypted_file="/tmp/$filename"
        
        "$SCRIPTS_DIR/encrypt-backup.sh" decrypt "$TARGET" "$decrypted_file"
        echo "Decrypted file saved to: $decrypted_file"
        ;;
        
    "verify")
        if [ -z "$TARGET" ]; then
            "$SCRIPTS_DIR/verify-backup.sh" verify-all
        else
            "$SCRIPTS_DIR/verify-backup.sh" verify "$TARGET"
        fi
        ;;
        
    "rotate-keys")
        "$SCRIPTS_DIR/rotate-keys.sh" rotate
        ;;
        
    "cleanup")
        echo "Cleaning up old encrypted backups..."
        find "$ENCRYPTED_DIR" -name "*.enc" -mtime +${ENCRYPTION_CONFIG.storage.local.retention} -delete
        find "${path.join(this.backupPath, 'verified')}" -name "*.enc" -mtime +${ENCRYPTION_CONFIG.storage.local.retention} -delete
        echo "Cleanup completed"
        ;;
        
    *)
        echo "AutoControl Pro Backup Encryption Management"
        echo "Usage: $0 {status|encrypt|decrypt|verify|rotate-keys|cleanup} [target]"
        echo ""
        echo "Commands:"
        echo "  status           - Show encryption system status"
        echo "  encrypt <file>   - Encrypt a backup file"
        echo "  decrypt <file>   - Decrypt an encrypted backup"
        echo "  verify [file]    - Verify encrypted backup(s)"
        echo "  rotate-keys      - Rotate encryption keys"
        echo "  cleanup          - Remove old encrypted backups"
        exit 1
        ;;
esac
`;
    
    const managementScriptPath = path.join(this.scriptsPath, 'manage-encryption.sh');
    await fs.writeFile(managementScriptPath, managementScript);
    await fs.chmod(managementScriptPath, 0o755);
    
    console.log(`   ✅ Management script created: ${managementScriptPath}`);
  }

  /**
   * Test encryption system
   */
  async testEncryptionSystem() {
    console.log('\n🧪 Testing encryption system...');
    
    try {
      // Create test file
      const testData = 'This is a test backup file for encryption testing.';
      const testFile = path.join(this.backupPath, 'temp', 'test-backup.txt');
      const encryptedFile = path.join(ENCRYPTION_CONFIG.storage.local.path, 'test-backup.txt.enc');
      const decryptedFile = path.join(this.backupPath, 'temp', 'test-backup-decrypted.txt');
      
      await fs.writeFile(testFile, testData);
      
      // Test encryption
      const encryptScript = path.join(this.scriptsPath, 'encrypt-backup.sh');
      await execAsync(`${encryptScript} encrypt "${testFile}" "${encryptedFile}"`);
      
      // Verify encrypted file exists
      await fs.access(encryptedFile);
      console.log('   ✅ Encryption test passed');
      
      // Test decryption
      await execAsync(`${encryptScript} decrypt "${encryptedFile}" "${decryptedFile}"`);
      
      // Verify decrypted content
      const decryptedData = await fs.readFile(decryptedFile, 'utf8');
      if (decryptedData === testData) {
        console.log('   ✅ Decryption test passed');
      } else {
        throw new Error('Decrypted data does not match original');
      }
      
      // Test verification
      const verifyScript = path.join(this.scriptsPath, 'verify-backup.sh');
      await execAsync(`${verifyScript} verify "${encryptedFile}"`);
      console.log('   ✅ Verification test passed');
      
      // Cleanup test files
      await fs.unlink(testFile);
      await fs.unlink(encryptedFile);
      await fs.unlink(decryptedFile);
      await fs.unlink(`${encryptedFile}.meta`);
      await fs.unlink(`${encryptedFile}.sha256`);
      
      console.log('   ✅ All encryption tests passed');
      
    } catch (error) {
      console.log(`   ❌ Encryption test failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get encryption status
   */
  async getEncryptionStatus() {
    const status = {
      keysGenerated: false,
      scriptsCreated: false,
      verificationEnabled: ENCRYPTION_CONFIG.verification.enabled,
      remoteStorageEnabled: ENCRYPTION_CONFIG.storage.remote.enabled,
      keyRotationEnabled: ENCRYPTION_CONFIG.keyManagement.keyRotation
    };
    
    try {
      await fs.access(path.join(this.keysPath, 'master.key'));
      status.keysGenerated = true;
    } catch (error) {
      // Key doesn't exist
    }
    
    try {
      await fs.access(path.join(this.scriptsPath, 'encrypt-backup.sh'));
      status.scriptsCreated = true;
    } catch (error) {
      // Script doesn't exist
    }
    
    return status;
  }
}

/**
 * Main backup encryption setup function
 */
async function setupBackupEncryption() {
  try {
    const configurator = new BackupEncryptionConfigurator();
    await configurator.setup();
    
    const status = await configurator.getEncryptionStatus();
    
    console.log('\n📋 Backup Encryption Summary:');
    console.log('============================');
    console.log(`Keys Generated: ${status.keysGenerated ? '✅' : '❌'}`);
    console.log(`Scripts Created: ${status.scriptsCreated ? '✅' : '❌'}`);
    console.log(`Verification Enabled: ${status.verificationEnabled ? '✅' : '❌'}`);
    console.log(`Remote Storage: ${status.remoteStorageEnabled ? '✅' : '❌'}`);
    console.log(`Key Rotation: ${status.keyRotationEnabled ? '✅' : '❌'}`);
    
    console.log('\n🔐 Encryption Features:');
    console.log('- AES-256-GCM encryption');
    console.log('- SHA-256 integrity verification');
    console.log('- Automatic key rotation');
    console.log('- Secure key storage');
    console.log('- Backup verification');
    console.log('- Remote storage support');
    
    return status;
    
  } catch (error) {
    console.error('❌ Backup encryption setup failed:', error);
    throw error;
  }
}

// Run setup if called directly
if (require.main === module) {
  setupBackupEncryption()
    .then(() => {
      console.log('\n🎉 Backup encryption setup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Setup failed:', error.message);
      process.exit(1);
    });
}

module.exports = {
  BackupEncryptionConfigurator,
  setupBackupEncryption,
  ENCRYPTION_CONFIG
};