#!/usr/bin/env node
/**
 * Production Database Setup Script
 * Configures MongoDB Atlas cluster with proper security settings
 */
const { MongoClient } = require('mongodb');
const fs = require('fs').promises;
const path = require('path');

/**
 * Production database configuration
 */
const DB_CONFIG = {
  // MongoDB Atlas configuration
  atlas: {
    clusterName: 'autocontrol-prod',
    region: 'us-east-1',
    tier: 'M10', // Production tier
    diskSizeGB: 10,
    backupEnabled: true,
    encryptionAtRest: true
  },
  // Security settings
  security: {
    authenticationDatabase: 'admin',
    ssl: true,
    retryWrites: true,
    w: 'majority',
    readPreference: 'primaryPreferred'
  },
  // Connection pool settings
  connectionPool: {
    maxPoolSize: 20,
    minPoolSize: 5,
    maxIdleTimeMS: 600000,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000
  },
  // Indexes for optimization
  indexes: {
    users: [
      { key: { email: 1 }, unique: true },
      { key: { organizationId: 1, email: 1 }, unique: true },
      { key: { organizationId: 1, role: 1 } },
      { key: { emailVerified: 1, isActive: 1 } }
    ],
    organizations: [
      { key: { subdomain: 1 }, unique: true },
      { key: { name: 1 } },
      { key: { isActive: 1, subscriptionStatus: 1 } }
    ],
    storagerecords: [
      { key: { organizationId: 1, producto: 1 } },
      { key: { organizationId: 1, fechaCaducidad: 1 } },
      { key: { organizationId: 1, createdAt: -1 } }
    ],
    deliveryrecords: [
      { key: { organizationId: 1, fechaEntrega: -1 } },
      { key: { organizationId: 1, cliente: 1 } },
      { key: { organizationId: 1, createdAt: -1 } }
    ],
    auditlogs: [
      { key: { organizationId: 1, timestamp: -1 } },
      { key: { organizationId: 1, userId: 1, timestamp: -1 } }
    ]
  }
};

/**
 * Production database setup class
 */
class ProductionDatabaseSetup {
  constructor() {
    this.client = null;
    this.db = null;
    this.results = {
      startTime: new Date(),
      endTime: null,
      operations: [],
      success: false
    };
  }

  /**
   * Setup production database
   */
  async setup() {
    try {
      console.log('🗄️  Setting up production database...');
      console.log('=====================================');

      // Connect to database
      await this.connectToDatabase();

      // Create database and collections
      await this.createDatabaseStructure();

      // Create indexes
      await this.createIndexes();

      // Setup database users and roles
      await this.setupDatabaseSecurity();

      // Configure backup settings
      await this.configureBackups();

      // Setup monitoring
      await this.setupMonitoring();

      // Generate connection strings
      await this.generateConnectionStrings();

      this.results.success = true;
      this.results.endTime = new Date();

      console.log('\n🎉 Production database setup completed!');

    } catch (error) {
      this.results.success = false;
      this.results.endTime = new Date();
      console.error('\n💥 Database setup failed:', error.message);
      throw error;
    } finally {
      if (this.client) {
        await this.client.close();
      }
    }
  }

  /**
   * Connect to database
   */
  async connectToDatabase() {
    console.log('\n🔌 Connecting to production database...');

    const connectionString = process.env.MONGODB_PROD_URI || 
      'mongodb+srv://username:password@cluster.mongodb.net/autocontrol?retryWrites=true&w=majority';

    this.client = new MongoClient(connectionString, {
      maxPoolSize: DB_CONFIG.connectionPool.maxPoolSize,
      minPoolSize: DB_CONFIG.connectionPool.minPoolSize,
      maxIdleTimeMS: DB_CONFIG.connectionPool.maxIdleTimeMS,
      serverSelectionTimeoutMS: DB_CONFIG.connectionPool.serverSelectionTimeoutMS,
      socketTimeoutMS: DB_CONFIG.connectionPool.socketTimeoutMS,
      ssl: DB_CONFIG.security.ssl,
      retryWrites: DB_CONFIG.security.retryWrites,
      w: DB_CONFIG.security.w,
      readPreference: DB_CONFIG.security.readPreference
    });

    await this.client.connect();
    this.db = this.client.db('autocontrol');

    console.log('   ✅ Connected to production database');
    this.results.operations.push({
      operation: 'database_connection',
      status: 'success',
      timestamp: new Date()
    });
  }

  /**
   * Create database structure
   */
  async createDatabaseStructure() {
    console.log('\n🏗️  Creating database structure...');

    const collections = [
      'users',
      'organizations', 
      'storagerecords',
      'deliveryrecords',
      'auditlogs',
      'sessions'
    ];

    for (const collectionName of collections) {
      try {
        // Check if collection exists
        const collections = await this.db.listCollections({ name: collectionName }).toArray();
        
        if (collections.length === 0) {
          // Create collection with validation
          await this.createCollectionWithValidation(collectionName);
          console.log(`   ✅ Created collection: ${collectionName}`);
        } else {
          console.log(`   ⏭️  Collection already exists: ${collectionName}`);
        }

        this.results.operations.push({
          operation: `create_collection_${collectionName}`,
          status: 'success',
          timestamp: new Date()
        });

      } catch (error) {
        console.log(`   ❌ Failed to create collection ${collectionName}: ${error.message}`);
        this.results.operations.push({
          operation: `create_collection_${collectionName}`,
          status: 'failed',
          error: error.message,
          timestamp: new Date()
        });
      }
    }
  }

  /**
   * Create collection with validation
   */
  async createCollectionWithValidation(collectionName) {
    const validationRules = this.getValidationRules(collectionName);
    
    if (validationRules) {
      await this.db.createCollection(collectionName, {
        validator: validationRules,
        validationLevel: 'strict',
        validationAction: 'error'
      });
    } else {
      await this.db.createCollection(collectionName);
    }
  }

  /**
   * Get validation rules for collection
   */
  getValidationRules(collectionName) {
    const rules = {
      users: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['email', 'organizationId', 'role'],
          properties: {
            email: { bsonType: 'string', pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$' },
            organizationId: { bsonType: 'objectId' },
            role: { enum: ['admin', 'user', 'viewer'] },
            isActive: { bsonType: 'bool' },
            emailVerified: { bsonType: 'bool' }
          }
        }
      },
      organizations: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['name', 'subdomain'],
          properties: {
            name: { bsonType: 'string', minLength: 1, maxLength: 100 },
            subdomain: { bsonType: 'string', pattern: '^[a-z0-9-]+$', minLength: 3, maxLength: 50 },
            isActive: { bsonType: 'bool' },
            subscriptionStatus: { enum: ['trial', 'active', 'suspended', 'cancelled'] }
          }
        }
      },
      storagerecords: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['organizationId', 'producto', 'cantidad'],
          properties: {
            organizationId: { bsonType: 'objectId' },
            producto: { bsonType: 'string', minLength: 1 },
            cantidad: { bsonType: 'number', minimum: 0 },
            fechaCaducidad: { bsonType: 'date' }
          }
        }
      }
    };

    return rules[collectionName] || null;
  }

  /**
   * Create indexes
   */
  async createIndexes() {
    console.log('\n📇 Creating database indexes...');

    for (const [collectionName, indexes] of Object.entries(DB_CONFIG.indexes)) {
      try {
        const collection = this.db.collection(collectionName);
        
        for (const indexSpec of indexes) {
          const options = {
            background: true,
            ...indexSpec
          };
          
          delete options.key;
          
          await collection.createIndex(indexSpec.key, options);
          console.log(`   ✅ Created index on ${collectionName}: ${JSON.stringify(indexSpec.key)}`);
        }

        this.results.operations.push({
          operation: `create_indexes_${collectionName}`,
          status: 'success',
          count: indexes.length,
          timestamp: new Date()
        });

      } catch (error) {
        console.log(`   ❌ Failed to create indexes for ${collectionName}: ${error.message}`);
        this.results.operations.push({
          operation: `create_indexes_${collectionName}`,
          status: 'failed',
          error: error.message,
          timestamp: new Date()
        });
      }
    }
  }

  /**
   * Setup database security
   */
  async setupDatabaseSecurity() {
    console.log('\n🔒 Setting up database security...');

    try {
      // Create application user with limited permissions
      const appUser = {
        user: 'autocontrol-app',
        pwd: process.env.DB_APP_PASSWORD || 'generate-secure-password',
        roles: [
          { role: 'readWrite', db: 'autocontrol' },
          { role: 'read', db: 'autocontrol' }
        ]
      };

      // Note: In MongoDB Atlas, users are managed through the web interface
      // This is a template for self-hosted MongoDB
      console.log('   ℹ️  Database users should be configured in MongoDB Atlas dashboard');
      console.log('   ℹ️  Recommended roles: readWrite for application, read for monitoring');

      this.results.operations.push({
        operation: 'setup_database_security',
        status: 'info',
        message: 'Security configuration noted for Atlas setup',
        timestamp: new Date()
      });

    } catch (error) {
      console.log(`   ⚠️  Security setup note: ${error.message}`);
    }
  }

  /**
   * Configure backups
   */
  async configureBackups() {
    console.log('\n💾 Configuring backup settings...');

    const backupConfig = {
      enabled: true,
      frequency: 'daily',
      retention: '30 days',
      pointInTimeRecovery: true,
      crossRegionBackup: true,
      encryptionEnabled: true
    };

    // Create backup configuration file
    await fs.writeFile(
      'config/backup-config.json',
      JSON.stringify(backupConfig, null, 2)
    );

    console.log('   ✅ Backup configuration created');
    console.log('   ℹ️  Enable backups in MongoDB Atlas dashboard');

    this.results.operations.push({
      operation: 'configure_backups',
      status: 'success',
      config: backupConfig,
      timestamp: new Date()
    });
  }

  /**
   * Setup monitoring
   */
  async setupMonitoring() {
    console.log('\n📊 Setting up database monitoring...');

    const monitoringConfig = {
      alerts: {
        highCPU: { threshold: 80, enabled: true },
        highMemory: { threshold: 85, enabled: true },
        slowQueries: { threshold: 1000, enabled: true },
        connectionLimit: { threshold: 80, enabled: true },
        diskSpace: { threshold: 85, enabled: true }
      },
      metrics: {
        collectionStats: true,
        indexStats: true,
        queryStats: true,
        connectionStats: true
      }
    };

    await fs.writeFile(
      'config/db-monitoring-config.json',
      JSON.stringify(monitoringConfig, null, 2)
    );

    console.log('   ✅ Monitoring configuration created');
    console.log('   ℹ️  Configure alerts in MongoDB Atlas dashboard');

    this.results.operations.push({
      operation: 'setup_monitoring',
      status: 'success',
      config: monitoringConfig,
      timestamp: new Date()
    });
  }

  /**
   * Generate connection strings
   */
  async generateConnectionStrings() {
    console.log('\n🔗 Generating connection strings...');

    const connectionStrings = {
      production: {
        primary: 'mongodb+srv://username:password@cluster.mongodb.net/autocontrol?retryWrites=true&w=majority',
        readonly: 'mongodb+srv://readonly:password@cluster.mongodb.net/autocontrol?readPreference=secondary',
        monitoring: 'mongodb+srv://monitor:password@cluster.mongodb.net/autocontrol?readPreference=secondaryPreferred'
      },
      environment: {
        MONGODB_URI: '${MONGODB_PROD_URI}',
        MONGODB_READONLY_URI: '${MONGODB_READONLY_URI}',
        MONGODB_MONITOR_URI: '${MONGODB_MONITOR_URI}'
      }
    };

    await fs.writeFile(
      'config/connection-strings.json',
      JSON.stringify(connectionStrings, null, 2)
    );

    // Update .env.production.example
    const envExample = `# Production Database Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/autocontrol?retryWrites=true&w=majority
MONGODB_READONLY_URI=mongodb+srv://readonly:password@cluster.mongodb.net/autocontrol?readPreference=secondary
MONGODB_MONITOR_URI=mongodb+srv://monitor:password@cluster.mongodb.net/autocontrol?readPreference=secondaryPreferred

# Database Security
DB_APP_PASSWORD=your-secure-app-password
DB_READONLY_PASSWORD=your-readonly-password
DB_MONITOR_PASSWORD=your-monitor-password

# Connection Pool Settings
DB_MAX_POOL_SIZE=20
DB_MIN_POOL_SIZE=5
DB_MAX_IDLE_TIME_MS=600000
DB_SERVER_SELECTION_TIMEOUT_MS=30000
DB_SOCKET_TIMEOUT_MS=45000`;

    await fs.appendFile('.env.production.example', '\n\n' + envExample);

    console.log('   ✅ Connection strings generated');
    console.log('   ✅ Environment variables updated');

    this.results.operations.push({
      operation: 'generate_connection_strings',
      status: 'success',
      timestamp: new Date()
    });
  }

  /**
   * Get setup summary
   */
  getSetupSummary() {
    const successful = this.results.operations.filter(op => op.status === 'success').length;
    const failed = this.results.operations.filter(op => op.status === 'failed').length;
    const duration = this.results.endTime - this.results.startTime;

    return {
      success: this.results.success,
      duration: Math.round(duration / 1000),
      operations: {
        total: this.results.operations.length,
        successful,
        failed
      },
      collections: Object.keys(DB_CONFIG.indexes).length,
      indexes: Object.values(DB_CONFIG.indexes).reduce((sum, indexes) => sum + indexes.length, 0)
    };
  }
}

/**
 * Run production database setup
 */
async function setupProductionDatabase() {
  try {
    const setup = new ProductionDatabaseSetup();
    await setup.setup();
    
    const summary = setup.getSetupSummary();
    
    console.log('\n📊 Database Setup Summary:');
    console.log('==========================');
    console.log(`Success: ${summary.success ? 'YES' : 'NO'}`);
    console.log(`Duration: ${summary.duration}s`);
    console.log(`Operations: ${summary.operations.successful}/${summary.operations.total} successful`);
    console.log(`Collections: ${summary.collections}`);
    console.log(`Indexes: ${summary.indexes}`);

    return setup.results;
  } catch (error) {
    console.error('❌ Production database setup failed:', error);
    throw error;
  }
}

// Run setup if called directly
if (require.main === module) {
  setupProductionDatabase()
    .then(() => {
      console.log('\n🎉 Production database setup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Production database setup failed:', error.message);
      process.exit(1);
    });
}

module.exports = {
  ProductionDatabaseSetup,
  setupProductionDatabase,
  DB_CONFIG
};