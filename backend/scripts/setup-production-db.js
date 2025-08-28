#!/usr/bin/env node
/**
 * Production Database Setup Script
 * Configures MongoDB Atlas cluster and production database settings
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

// MongoDB Atlas configuration
const ATLAS_CONFIG = {
  // Cluster configuration
  cluster: {
    name: process.env.ATLAS_CLUSTER_NAME || 'autocontrol-pro-cluster',
    region: process.env.ATLAS_REGION || 'us-east-1',
    tier: process.env.ATLAS_TIER || 'M10', // Production tier
    diskSizeGB: parseInt(process.env.ATLAS_DISK_SIZE) || 10,
    backupEnabled: true,
    encryptionAtRest: true
  },
  
  // Network security
  network: {
    allowedIPs: process.env.ATLAS_ALLOWED_IPS ? 
      process.env.ATLAS_ALLOWED_IPS.split(',') : 
      ['0.0.0.0/0'], // Configure specific IPs in production
    vpcPeering: process.env.ATLAS_VPC_PEERING === 'true'
  },
  
  // Database users
  users: [
    {
      username: process.env.DB_USER || 'autocontrol-app',
      password: process.env.DB_PASSWORD,
      roles: [
        { role: 'readWrite', db: process.env.DB_NAME || 'autocontrol-pro' }
      ]
    },
    {
      username: process.env.DB_BACKUP_USER || 'autocontrol-backup',
      password: process.env.DB_BACKUP_PASSWORD,
      roles: [
        { role: 'backup', db: 'admin' },
        { role: 'read', db: process.env.DB_NAME || 'autocontrol-pro' }
      ]
    }
  ]
};

/**
 * Setup production database configuration
 */
async function setupProductionDatabase() {
  try {
    console.log('🚀 Setting up production database infrastructure...');
    
    // Validate environment variables
    validateEnvironment();
    
    // Connect to MongoDB
    await connectToDatabase();
    
    // Create database indexes
    await createIndexes();
    
    // Setup database monitoring
    await setupMonitoring();
    
    // Configure connection pooling
    await configureConnectionPooling();
    
    // Setup backup procedures
    await setupBackupProcedures();
    
    // Validate database setup
    await validateDatabaseSetup();
    
    console.log('✅ Production database setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error setting up production database:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

/**
 * Validate required environment variables
 */
function validateEnvironment() {
  const required = [
    'MONGODB_URI',
    'DB_PASSWORD',
    'DB_BACKUP_PASSWORD'
  ];
  
  const missing = required.filter(env => !process.env[env]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  console.log('✅ Environment variables validated');
}

/**
 * Connect to MongoDB with production settings
 */
async function connectToDatabase() {
  const options = {
    // Connection pooling
    maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE) || 10,
    minPoolSize: parseInt(process.env.DB_MIN_POOL_SIZE) || 2,
    maxIdleTimeMS: parseInt(process.env.DB_MAX_IDLE_TIME) || 30000,
    
    // Timeouts
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
    
    // Buffering
    bufferMaxEntries: 0,
    bufferCommands: false,
    
    // Monitoring
    heartbeatFrequencyMS: 10000,
    
    // Security
    ssl: true,
    sslValidate: true,
    
    // Retry logic
    retryWrites: true,
    retryReads: true
  };
  
  await mongoose.connect(process.env.MONGODB_URI, options);
  console.log('✅ Connected to production database');
}

/**
 * Create optimized database indexes
 */
async function createIndexes() {
  console.log('📊 Creating database indexes...');
  
  const db = mongoose.connection.db;
  
  // User indexes
  await db.collection('users').createIndexes([
    { key: { email: 1 }, unique: true },
    { key: { organizationId: 1 } },
    { key: { organizationId: 1, email: 1 }, unique: true },
    { key: { organizationId: 1, role: 1 } },
    { key: { emailVerificationToken: 1 }, sparse: true },
    { key: { passwordResetToken: 1 }, sparse: true },
    { key: { createdAt: 1 } }
  ]);
  
  // Organization indexes
  await db.collection('organizations').createIndexes([
    { key: { subdomain: 1 }, unique: true },
    { key: { name: 1 } },
    { key: { createdAt: 1 } },
    { key: { 'subscription.status': 1 } },
    { key: { 'settings.timezone': 1 } }
  ]);
  
  // Analytics events indexes
  await db.collection('analytics_events').createIndexes([
    { key: { organizationId: 1, timestamp: -1 } },
    { key: { organizationId: 1, name: 1, timestamp: -1 } },
    { key: { organizationId: 1, category: 1, timestamp: -1 } },
    { key: { userId: 1, timestamp: -1 } },
    { key: { sessionId: 1, timestamp: -1 } },
    // TTL index for automatic cleanup (90 days)
    { key: { timestamp: 1 }, expireAfterSeconds: 90 * 24 * 60 * 60 }
  ]);
  
  // Audit logs indexes
  await db.collection('audit_logs').createIndexes([
    { key: { organizationId: 1, timestamp: -1 } },
    { key: { userId: 1, timestamp: -1 } },
    { key: { action: 1, timestamp: -1 } },
    { key: { resourceType: 1, resourceId: 1 } },
    // TTL index for automatic cleanup (1 year)
    { key: { timestamp: 1 }, expireAfterSeconds: 365 * 24 * 60 * 60 }
  ]);
  
  // Business data indexes (Storage, Deliveries, etc.)
  await db.collection('storage_records').createIndexes([
    { key: { organizationId: 1, createdAt: -1 } },
    { key: { organizationId: 1, producto: 1 } },
    { key: { organizationId: 1, lote: 1 } },
    { key: { organizationId: 1, fechaCaducidad: 1 } },
    { key: { organizationId: 1, registradoPor: 1 } }
  ]);
  
  await db.collection('delivery_records').createIndexes([
    { key: { organizationId: 1, createdAt: -1 } },
    { key: { organizationId: 1, proveedor: 1 } },
    { key: { organizationId: 1, fechaEntrega: 1 } },
    { key: { organizationId: 1, estado: 1 } },
    { key: { organizationId: 1, registradoPor: 1 } }
  ]);
  
  console.log('✅ Database indexes created');
}

/**
 * Setup database monitoring
 */
async function setupMonitoring() {
  console.log('📈 Setting up database monitoring...');
  
  // Create monitoring collection for database metrics
  const db = mongoose.connection.db;
  
  try {
    await db.createCollection('db_metrics', {
      capped: true,
      size: 10485760, // 10MB
      max: 1000
    });
  } catch (error) {
    // Collection might already exist
    if (!error.message.includes('already exists')) {
      throw error;
    }
  }
  
  // Setup monitoring indexes
  await db.collection('db_metrics').createIndexes([
    { key: { timestamp: -1 } },
    { key: { metricType: 1, timestamp: -1 } }
  ]);
  
  console.log('✅ Database monitoring configured');
}

/**
 * Configure connection pooling
 */
async function configureConnectionPooling() {
  console.log('🔗 Configuring connection pooling...');
  
  // Connection pool is configured in the connect options above
  // Log current pool status
  const poolSize = mongoose.connection.db.serverConfig?.s?.pool?.size || 'unknown';
  console.log(`✅ Connection pool configured (current size: ${poolSize})`);
}

/**
 * Setup backup procedures
 */
async function setupBackupProcedures() {
  console.log('💾 Setting up backup procedures...');
  
  // Create backup configuration
  const backupConfig = {
    enabled: true,
    frequency: 'daily',
    retentionDays: 30,
    compression: true,
    encryption: true,
    destinations: [
      {
        type: 'atlas',
        enabled: true
      },
      {
        type: 's3',
        enabled: process.env.BACKUP_S3_ENABLED === 'true',
        bucket: process.env.BACKUP_S3_BUCKET,
        region: process.env.BACKUP_S3_REGION
      }
    ]
  };
  
  // Store backup configuration in database
  const db = mongoose.connection.db;
  await db.collection('system_config').updateOne(
    { type: 'backup' },
    { $set: { config: backupConfig, updatedAt: new Date() } },
    { upsert: true }
  );
  
  console.log('✅ Backup procedures configured');
}

/**
 * Validate database setup
 */
async function validateDatabaseSetup() {
  console.log('🔍 Validating database setup...');
  
  const db = mongoose.connection.db;
  
  // Check collections exist
  const collections = await db.listCollections().toArray();
  const collectionNames = collections.map(c => c.name);
  
  const requiredCollections = [
    'users',
    'organizations',
    'analytics_events',
    'audit_logs',
    'storage_records',
    'delivery_records'
  ];
  
  const missingCollections = requiredCollections.filter(
    name => !collectionNames.includes(name)
  );
  
  if (missingCollections.length > 0) {
    console.warn(`⚠️  Missing collections: ${missingCollections.join(', ')}`);
  }
  
  // Check indexes
  for (const collectionName of requiredCollections) {
    if (collectionNames.includes(collectionName)) {
      const indexes = await db.collection(collectionName).indexes();
      console.log(`✅ ${collectionName}: ${indexes.length} indexes`);
    }
  }
  
  // Test database operations
  await testDatabaseOperations();
  
  console.log('✅ Database setup validation completed');
}

/**
 * Test basic database operations
 */
async function testDatabaseOperations() {
  const db = mongoose.connection.db;
  
  // Test write operation
  const testDoc = {
    type: 'setup_test',
    timestamp: new Date(),
    data: { test: true }
  };
  
  await db.collection('system_config').insertOne(testDoc);
  
  // Test read operation
  const retrieved = await db.collection('system_config').findOne({
    type: 'setup_test'
  });
  
  if (!retrieved) {
    throw new Error('Database read/write test failed');
  }
  
  // Clean up test document
  await db.collection('system_config').deleteOne({
    type: 'setup_test'
  });
  
  console.log('✅ Database operations test passed');
}

/**
 * Display Atlas configuration guide
 */
function displayAtlasGuide() {
  console.log('\n📋 MongoDB Atlas Configuration Guide:');
  console.log('=====================================');
  console.log('1. Create MongoDB Atlas account at https://cloud.mongodb.com');
  console.log('2. Create a new cluster with the following settings:');
  console.log(`   - Cluster Name: ${ATLAS_CONFIG.cluster.name}`);
  console.log(`   - Region: ${ATLAS_CONFIG.cluster.region}`);
  console.log(`   - Tier: ${ATLAS_CONFIG.cluster.tier} (Production)`);
  console.log(`   - Disk Size: ${ATLAS_CONFIG.cluster.diskSizeGB}GB`);
  console.log('   - Enable Backup');
  console.log('   - Enable Encryption at Rest');
  console.log('3. Configure Network Access:');
  console.log('   - Add your application server IPs');
  console.log('   - Configure VPC Peering if needed');
  console.log('4. Create Database Users:');
  ATLAS_CONFIG.users.forEach(user => {
    console.log(`   - Username: ${user.username}`);
    console.log(`   - Roles: ${user.roles.map(r => `${r.role}@${r.db}`).join(', ')}`);
  });
  console.log('5. Get connection string and update MONGODB_URI environment variable');
  console.log('\n🔗 Connection String Format:');
  console.log('mongodb+srv://<username>:<password>@<cluster>/<database>?retryWrites=true&w=majority');
  console.log('\n');
}

// Run setup if called directly
if (require.main === module) {
  // Display guide first
  displayAtlasGuide();
  
  // Ask for confirmation
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('Have you configured MongoDB Atlas? (y/N): ', (answer) => {
    rl.close();
    
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      setupProductionDatabase();
    } else {
      console.log('Please configure MongoDB Atlas first, then run this script again.');
      process.exit(0);
    }
  });
}

module.exports = {
  setupProductionDatabase,
  ATLAS_CONFIG
};