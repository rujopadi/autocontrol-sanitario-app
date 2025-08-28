#!/usr/bin/env node
/**
 * Database Query Optimization Script
 * Analyzes and optimizes database queries for better performance
 */
const mongoose = require('mongoose');
const { promisify } = require('util');
const fs = require('fs').promises;

/**
 * Database optimization configuration
 */
const OPTIMIZATION_CONFIG = {
  // Index recommendations
  indexes: {
    // User collection indexes
    users: [
      { fields: { email: 1 }, options: { unique: true } },
      { fields: { organizationId: 1 } },
      { fields: { role: 1 } },
      { fields: { isActive: 1 } },
      { fields: { createdAt: -1 } }
    ],
    // Storage collection indexes
    storage: [
      { fields: { organizationId: 1 } },
      { fields: { producto: 1 } },
      { fields: { lote: 1 } },
      { fields: { fechaCaducidad: 1 } },
      { fields: { organizationId: 1, producto: 1 } },
      { fields: { organizationId: 1, fechaCaducidad: 1 } },
      { fields: { createdAt: -1 } }
    ],
    // Deliveries collection indexes
    deliveries: [
      { fields: { organizationId: 1 } },
      { fields: { fecha: -1 } },
      { fields: { proveedor: 1 } },
      { fields: { organizationId: 1, fecha: -1 } },
      { fields: { createdAt: -1 } }
    ],
    // Organizations collection indexes
    organizations: [
      { fields: { name: 1 } },
      { fields: { isActive: 1 } },
      { fields: { createdAt: -1 } }
    ],
    // Audit logs collection indexes
    auditlogs: [
      { fields: { organizationId: 1 } },
      { fields: { userId: 1 } },
      { fields: { action: 1 } },
      { fields: { timestamp: -1 } },
      { fields: { organizationId: 1, timestamp: -1 } },
      { fields: { userId: 1, timestamp: -1 } }
    ]
  },
  // Query optimization patterns
  queryOptimizations: {
    // Pagination optimization
    pagination: {
      useSkipLimit: false,
      useCursorBased: true,
      defaultLimit: 50,
      maxLimit: 1000
    },
    // Aggregation optimization
    aggregation: {
      useIndexes: true,
      limitEarly: true,
      projectEarly: true
    },
    // Population optimization
    population: {
      selectFields: true,
      limitPopulation: true
    }
  },
  // Performance thresholds
  thresholds: {
    queryTime: 100, // milliseconds
    indexUsage: 95, // percentage
    collectionScan: 5 // percentage
  }
};

/**
 * Database optimizer
 */
class DatabaseOptimizer {
  constructor() {
    this.results = {
      startTime: new Date(),
      endTime: null,
      indexes: {
        created: [],
        existing: [],
        recommendations: []
      },
      queries: {
        analyzed: 0,
        optimized: 0,
        issues: []
      },
      performance: {
        before: {},
        after: {},
        improvement: {}
      },
      success: false
    };
  }

  /**
   * Run database optimization
   */
  async optimize() {
    try {
      console.log('🔧 Starting database optimization...');
      console.log('===================================');

      // Connect to database
      await this.connectToDatabase();

      // Analyze current performance
      await this.analyzeCurrentPerformance();

      // Create recommended indexes
      await this.createIndexes();

      // Optimize queries
      await this.optimizeQueries();

      // Analyze performance after optimization
      await this.analyzeOptimizedPerformance();

      // Generate optimization report
      await this.generateOptimizationReport();

      this.results.success = true;
      this.results.endTime = new Date();

      console.log('\n🎉 Database optimization completed successfully!');
    } catch (error) {
      this.results.success = false;
      this.results.endTime = new Date();
      console.error('\n💥 Database optimization failed:', error.message);
      throw error;
    } finally {
      // Close database connection
      if (mongoose.connection.readyState === 1) {
        await mongoose.disconnect();
      }
    }
  }

  /**
   * Connect to database
   */
  async connectToDatabase() {
    console.log('\n🔌 Connecting to database...');
    
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/autocontrol';
    
    try {
      await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      console.log('   ✅ Database connected');
    } catch (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  /**
   * Analyze current performance
   */
  async analyzeCurrentPerformance() {
    console.log('\n📊 Analyzing current database performance...');

    try {
      const db = mongoose.connection.db;
      
      // Get database stats
      const dbStats = await db.stats();
      
      // Get collection stats
      const collections = await db.listCollections().toArray();
      const collectionStats = {};
      
      for (const collection of collections) {
        const collName = collection.name;
        try {
          const stats = await db.collection(collName).stats();
          const indexes = await db.collection(collName).indexes();
          
          collectionStats[collName] = {
            documents: stats.count,
            size: stats.size,
            avgObjSize: stats.avgObjSize,
            indexes: indexes.length,
            indexSizes: stats.totalIndexSize
          };
        } catch (error) {
          console.log(`   ⚠️  Could not get stats for collection: ${collName}`);
        }
      }

      this.results.performance.before = {
        database: {
          collections: dbStats.collections,
          dataSize: dbStats.dataSize,
          indexSize: dbStats.indexSize,
          storageSize: dbStats.storageSize
        },
        collections: collectionStats
      };

      console.log('   ✅ Current performance analyzed');
      console.log(`      Collections: ${dbStats.collections}`);
      console.log(`      Data Size: ${Math.round(dbStats.dataSize / 1024 / 1024)}MB`);
      console.log(`      Index Size: ${Math.round(dbStats.indexSize / 1024 / 1024)}MB`);
    } catch (error) {
      console.log('   ⚠️  Performance analysis failed:', error.message);
    }
  }

  /**
   * Create indexes
   */
  async createIndexes() {
    console.log('\n🔍 Creating recommended indexes...');

    const db = mongoose.connection.db;
    
    for (const [collectionName, indexes] of Object.entries(OPTIMIZATION_CONFIG.indexes)) {
      console.log(`\n   📋 Processing collection: ${collectionName}`);
      
      const collection = db.collection(collectionName);
      
      // Get existing indexes
      let existingIndexes = [];
      try {
        existingIndexes = await collection.indexes();
        this.results.indexes.existing.push({
          collection: collectionName,
          indexes: existingIndexes
        });
      } catch (error) {
        console.log(`      ⚠️  Collection ${collectionName} does not exist, skipping...`);
        continue;
      }

      // Create new indexes
      for (const indexSpec of indexes) {
        try {
          const indexName = this.generateIndexName(indexSpec.fields);
          
          // Check if index already exists
          const indexExists = existingIndexes.some(idx => 
            JSON.stringify(idx.key) === JSON.stringify(indexSpec.fields)
          );

          if (indexExists) {
            console.log(`      ✅ Index already exists: ${indexName}`);
            continue;
          }

          // Create index
          await collection.createIndex(indexSpec.fields, {
            name: indexName,
            background: true,
            ...indexSpec.options
          });

          this.results.indexes.created.push({
            collection: collectionName,
            fields: indexSpec.fields,
            name: indexName,
            options: indexSpec.options
          });

          console.log(`      ✅ Created index: ${indexName}`);
        } catch (error) {
          console.log(`      ❌ Failed to create index: ${error.message}`);
        }
      }
    }

    console.log(`\n   📊 Index Summary:`);
    console.log(`      Created: ${this.results.indexes.created.length}`);
    console.log(`      Existing: ${this.results.indexes.existing.length}`);
  }

  /**
   * Generate index name
   */
  generateIndexName(fields) {
    return Object.entries(fields)
      .map(([field, direction]) => `${field}_${direction}`)
      .join('_');
  }

  /**
   * Optimize queries
   */
  async optimizeQueries() {
    console.log('\n⚡ Optimizing database queries...');

    // Query optimization recommendations
    const optimizations = [
      {
        name: 'Pagination Optimization',
        description: 'Use cursor-based pagination instead of skip/limit',
        implementation: this.optimizePagination.bind(this)
      },
      {
        name: 'Aggregation Optimization',
        description: 'Optimize aggregation pipelines',
        implementation: this.optimizeAggregations.bind(this)
      },
      {
        name: 'Population Optimization',
        description: 'Optimize Mongoose population queries',
        implementation: this.optimizePopulation.bind(this)
      }
    ];

    for (const optimization of optimizations) {
      try {
        console.log(`\n   🔧 ${optimization.name}...`);
        await optimization.implementation();
        this.results.queries.optimized++;
        console.log(`      ✅ ${optimization.description}`);
      } catch (error) {
        console.log(`      ❌ Failed: ${error.message}`);
        this.results.queries.issues.push({
          optimization: optimization.name,
          error: error.message
        });
      }
    }
  }

  /**
   * Optimize pagination
   */
  async optimizePagination() {
    // Create optimized pagination helper
    const paginationHelper = `
// Optimized pagination helper
function createCursorPagination(model, query = {}, options = {}) {
  const {
    limit = 50,
    sortField = '_id',
    sortDirection = 1,
    cursor = null,
    select = null
  } = options;

  // Build query with cursor
  const paginationQuery = { ...query };
  if (cursor) {
    const operator = sortDirection === 1 ? '$gt' : '$lt';
    paginationQuery[sortField] = { [operator]: cursor };
  }

  // Execute query
  let queryBuilder = model.find(paginationQuery)
    .sort({ [sortField]: sortDirection })
    .limit(limit + 1); // +1 to check if there are more results

  if (select) {
    queryBuilder = queryBuilder.select(select);
  }

  return queryBuilder.exec().then(results => {
    const hasMore = results.length > limit;
    const items = hasMore ? results.slice(0, -1) : results;
    const nextCursor = hasMore && items.length > 0 
      ? items[items.length - 1][sortField] 
      : null;

    return {
      items,
      hasMore,
      nextCursor,
      count: items.length
    };
  });
}

module.exports = { createCursorPagination };
`;

    await fs.writeFile('backend/utils/pagination.js', paginationHelper);
  }

  /**
   * Optimize aggregations
   */
  async optimizeAggregations() {
    // Create optimized aggregation helpers
    const aggregationHelpers = `
// Optimized aggregation helpers
class AggregationOptimizer {
  static optimizePipeline(pipeline) {
    const optimized = [...pipeline];
    
    // Move $match stages to the beginning
    const matchStages = optimized.filter(stage => stage.$match);
    const otherStages = optimized.filter(stage => !stage.$match);
    
    // Move $project stages after $match but before expensive operations
    const projectStages = otherStages.filter(stage => stage.$project);
    const remainingStages = otherStages.filter(stage => !stage.$project);
    
    return [
      ...matchStages,
      ...projectStages,
      ...remainingStages
    ];
  }
  
  static addIndexHints(pipeline, indexName) {
    return [
      { $hint: indexName },
      ...pipeline
    ];
  }
  
  static limitEarly(pipeline, limit) {
    // Add $limit after $match stages
    const matchIndex = pipeline.findLastIndex(stage => stage.$match);
    if (matchIndex >= 0) {
      pipeline.splice(matchIndex + 1, 0, { $limit: limit });
    }
    return pipeline;
  }
}

module.exports = { AggregationOptimizer };
`;

    await fs.writeFile('backend/utils/aggregationOptimizer.js', aggregationHelpers);
  }

  /**
   * Optimize population
   */
  async optimizePopulation() {
    // Create optimized population helpers
    const populationHelpers = `
// Optimized population helpers
class PopulationOptimizer {
  static optimizePopulate(populateOptions) {
    if (Array.isArray(populateOptions)) {
      return populateOptions.map(option => this.optimizeSinglePopulate(option));
    }
    return this.optimizeSinglePopulate(populateOptions);
  }
  
  static optimizeSinglePopulate(option) {
    const optimized = { ...option };
    
    // Always select only needed fields
    if (!optimized.select) {
      optimized.select = '_id name'; // Default minimal selection
    }
    
    // Limit population results
    if (!optimized.options) {
      optimized.options = {};
    }
    if (!optimized.options.limit) {
      optimized.options.limit = 100; // Default limit
    }
    
    return optimized;
  }
  
  static createVirtualPopulate(schema, fieldName, options) {
    schema.virtual(fieldName, {
      ref: options.ref,
      localField: options.localField,
      foreignField: options.foreignField,
      justOne: options.justOne || false,
      options: {
        select: options.select || '_id name',
        limit: options.limit || 100
      }
    });
  }
}

module.exports = { PopulationOptimizer };
`;

    await fs.writeFile('backend/utils/populationOptimizer.js', populationHelpers);
  }

  /**
   * Analyze optimized performance
   */
  async analyzeOptimizedPerformance() {
    console.log('\n📈 Analyzing optimized performance...');

    try {
      const db = mongoose.connection.db;
      
      // Get updated database stats
      const dbStats = await db.stats();
      
      // Get updated collection stats
      const collections = await db.listCollections().toArray();
      const collectionStats = {};
      
      for (const collection of collections) {
        const collName = collection.name;
        try {
          const stats = await db.collection(collName).stats();
          const indexes = await db.collection(collName).indexes();
          
          collectionStats[collName] = {
            documents: stats.count,
            size: stats.size,
            avgObjSize: stats.avgObjSize,
            indexes: indexes.length,
            indexSizes: stats.totalIndexSize
          };
        } catch (error) {
          // Collection might not exist
        }
      }

      this.results.performance.after = {
        database: {
          collections: dbStats.collections,
          dataSize: dbStats.dataSize,
          indexSize: dbStats.indexSize,
          storageSize: dbStats.storageSize
        },
        collections: collectionStats
      };

      // Calculate improvements
      const before = this.results.performance.before;
      const after = this.results.performance.after;
      
      this.results.performance.improvement = {
        indexSizeIncrease: after.database.indexSize - before.database.indexSize,
        indexesCreated: this.results.indexes.created.length,
        queriesOptimized: this.results.queries.optimized
      };

      console.log('   ✅ Optimized performance analyzed');
      console.log(`      New Index Size: ${Math.round(after.database.indexSize / 1024 / 1024)}MB`);
      console.log(`      Indexes Created: ${this.results.indexes.created.length}`);
      console.log(`      Queries Optimized: ${this.results.queries.optimized}`);
    } catch (error) {
      console.log('   ⚠️  Performance analysis failed:', error.message);
    }
  }

  /**
   * Generate optimization report
   */
  async generateOptimizationReport() {
    console.log('\n📄 Generating optimization report...');

    const report = {
      timestamp: new Date(),
      duration: this.results.endTime - this.results.startTime,
      success: this.results.success,
      indexes: this.results.indexes,
      queries: this.results.queries,
      performance: this.results.performance,
      recommendations: this.generateRecommendations(),
      configuration: OPTIMIZATION_CONFIG
    };

    // Save report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = `backend/optimization-report-${timestamp}.json`;
    
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`   ✅ Optimization report saved: ${reportPath}`);
    
    return report;
  }

  /**
   * Generate recommendations
   */
  generateRecommendations() {
    const recommendations = [];

    // Index recommendations
    if (this.results.indexes.created.length === 0) {
      recommendations.push({
        type: 'index',
        priority: 'medium',
        message: 'Consider creating additional indexes for frequently queried fields'
      });
    }

    // Query optimization recommendations
    recommendations.push({
      type: 'query',
      priority: 'high',
      message: 'Use cursor-based pagination for large datasets'
    });

    recommendations.push({
      type: 'query',
      priority: 'medium',
      message: 'Optimize aggregation pipelines by moving $match stages early'
    });

    recommendations.push({
      type: 'query',
      priority: 'medium',
      message: 'Limit populated fields to only what is needed'
    });

    // Performance recommendations
    recommendations.push({
      type: 'performance',
      priority: 'low',
      message: 'Monitor query performance regularly and adjust indexes as needed'
    });

    return recommendations;
  }
}

/**
 * Run database optimization
 */
async function optimizeDatabase() {
  try {
    const optimizer = new DatabaseOptimizer();
    await optimizer.optimize();
    
    console.log('\n📊 Database Optimization Summary:');
    console.log('=================================');
    console.log(`Success: ${optimizer.results.success ? 'YES' : 'NO'}`);
    console.log(`Indexes Created: ${optimizer.results.indexes.created.length}`);
    console.log(`Queries Optimized: ${optimizer.results.queries.optimized}`);
    console.log(`Issues Found: ${optimizer.results.queries.issues.length}`);
    
    return optimizer.results;
  } catch (error) {
    console.error('❌ Database optimization failed:', error);
    throw error;
  }
}

// Run optimization if called directly
if (require.main === module) {
  optimizeDatabase()
    .then(() => {
      console.log('\n🎉 Database optimization completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Database optimization failed:', error.message);
      process.exit(1);
    });
}

module.exports = {
  DatabaseOptimizer,
  optimizeDatabase,
  OPTIMIZATION_CONFIG
};#!/usr/b
in/env node
/**
 * Database Query Optimization Script
 * Analyzes and optimizes MongoDB queries for better performance
 */
const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');

/**
 * Database optimization configuration
 */
const OPTIMIZATION_CONFIG = {
  // Index recommendations
  indexes: {
    // User collection indexes
    users: [
      { fields: { email: 1 }, options: { unique: true } },
      { fields: { organizationId: 1, email: 1 }, options: { unique: true } },
      { fields: { organizationId: 1, role: 1 } },
      { fields: { emailVerified: 1, isActive: 1 } },
      { fields: { passwordResetToken: 1 }, options: { sparse: true } },
      { fields: { emailVerificationToken: 1 }, options: { sparse: true } }
    ],
    // Organization collection indexes
    organizations: [
      { fields: { subdomain: 1 }, options: { unique: true } },
      { fields: { name: 1 } },
      { fields: { isActive: 1, subscriptionStatus: 1 } },
      { fields: { createdAt: 1 } }
    ],
    // Storage records indexes
    storagerecords: [
      { fields: { organizationId: 1, producto: 1 } },
      { fields: { organizationId: 1, lote: 1 } },
      { fields: { organizationId: 1, fechaCaducidad: 1 } },
      { fields: { organizationId: 1, createdAt: -1 } },
      { fields: { organizationId: 1, registradoPor: 1 } }
    ],
    // Delivery records indexes
    deliveryrecords: [
      { fields: { organizationId: 1, fechaEntrega: -1 } },
      { fields: { organizationId: 1, cliente: 1 } },
      { fields: { organizationId: 1, estado: 1 } },
      { fields: { organizationId: 1, createdAt: -1 } },
      { fields: { organizationId: 1, registradoPor: 1 } }
    ],
    // Audit logs indexes
    auditlogs: [
      { fields: { organizationId: 1, timestamp: -1 } },
      { fields: { organizationId: 1, userId: 1, timestamp: -1 } },
      { fields: { organizationId: 1, action: 1, timestamp: -1 } },
      { fields: { organizationId: 1, resource: 1, timestamp: -1 } }
    ]
  },
  // Query optimization patterns
  queryPatterns: {
    // Common slow query patterns to optimize
    slowPatterns: [
      /\$where/,
      /\$regex.*\$options.*i/,
      /\$ne.*null/,
      /\$exists.*false/
    ],
    // Recommended alternatives
    optimizations: {
      '$where': 'Use $expr with aggregation operators instead',
      '$regex with $options: "i"': 'Create text index or use case-insensitive collation',
      '$ne: null': 'Use $exists: true instead',
      '$exists: false': 'Use $exists: true with negation in application logic'
    }
  },
  // Performance thresholds
  thresholds: {
    queryTime: 100, // milliseconds
    indexUsage: 0.8, // 80% index usage
    collectionScan: 0.1, // 10% collection scans
    documentsExamined: 1000 // maximum documents examined
  }
};

/**
 * Database query optimizer
 */
class DatabaseQueryOptimizer {
  constructor() {
    this.db = null;
    this.results = {
      startTime: new Date(),
      endTime: null,
      collections: {},
      indexes: {
        existing: [],
        recommended: [],
        created: []
      },
      queries: {
        analyzed: 0,
        optimized: 0,
        issues: []
      },
      performance: {
        before: {},
        after: {}
      },
      success: false
    };
  }

  /**
   * Run database optimization
   */
  async run() {
    try {
      console.log('🔧 Starting database query optimization...');
      console.log('==========================================');

      // Connect to database
      await this.connectToDatabase();

      // Analyze current database state
      await this.analyzeCurrentState();

      // Analyze existing indexes
      await this.analyzeExistingIndexes();

      // Create recommended indexes
      await this.createRecommendedIndexes();

      // Analyze query performance
      await this.analyzeQueryPerformance();

      // Optimize slow queries
      await this.optimizeSlowQueries();

      // Generate optimization report
      await this.generateOptimizationReport();

      this.results.success = true;
      this.results.endTime = new Date();

      console.log('\n🎉 Database optimization completed successfully!');
      console.log(`Total time: ${Math.round((this.results.endTime - this.results.startTime) / 1000)}s`);

    } catch (error) {
      this.results.success = false;
      this.results.endTime = new Date();
      console.error('\n💥 Database optimization failed:', error.message);
      throw error;
    } finally {
      if (this.db) {
        await mongoose.disconnect();
      }
    }
  }

  /**
   * Connect to database
   */
  async connectToDatabase() {
    console.log('\n🔌 Connecting to database...');
    
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/autocontrol';
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    this.db = mongoose.connection.db;
    console.log('   ✅ Database connected');
  }

  /**
   * Analyze current database state
   */
  async analyzeCurrentState() {
    console.log('\n📊 Analyzing current database state...');

    // Get database stats
    const dbStats = await this.db.stats();
    
    // Get collection information
    const collections = await this.db.listCollections().toArray();
    
    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      const collection = this.db.collection(collectionName);
      
      try {
        const stats = await collection.stats();
        this.results.collections[collectionName] = {
          count: stats.count,
          size: stats.size,
          avgObjSize: stats.avgObjSize,
          storageSize: stats.storageSize,
          indexes: stats.nindexes,
          indexSize: stats.totalIndexSize
        };
        
        console.log(`   📋 ${collectionName}: ${stats.count} documents, ${Math.round(stats.size / 1024)}KB`);
      } catch (error) {
        console.warn(`   ⚠️  Could not get stats for ${collectionName}: ${error.message}`);
      }
    }

    console.log(`   ✅ Analyzed ${collections.length} collections`);
  }

  /**
   * Analyze existing indexes
   */
  async analyzeExistingIndexes() {
    console.log('\n🔍 Analyzing existing indexes...');

    for (const collectionName of Object.keys(this.results.collections)) {
      const collection = this.db.collection(collectionName);
      
      try {
        const indexes = await collection.indexes();
        
        for (const index of indexes) {
          this.results.indexes.existing.push({
            collection: collectionName,
            name: index.name,
            key: index.key,
            unique: index.unique || false,
            sparse: index.sparse || false,
            background: index.background || false
          });
        }
        
        console.log(`   📇 ${collectionName}: ${indexes.length} indexes`);
      } catch (error) {
        console.warn(`   ⚠️  Could not analyze indexes for ${collectionName}: ${error.message}`);
      }
    }

    console.log(`   ✅ Found ${this.results.indexes.existing.length} existing indexes`);
  }

  /**
   * Create recommended indexes
   */
  async createRecommendedIndexes() {
    console.log('\n🏗️  Creating recommended indexes...');

    for (const [collectionName, indexSpecs] of Object.entries(OPTIMIZATION_CONFIG.indexes)) {
      if (!this.results.collections[collectionName]) {
        console.log(`   ⏭️  Skipping ${collectionName} (collection not found)`);
        continue;
      }

      const collection = this.db.collection(collectionName);

      for (const indexSpec of indexSpecs) {
        try {
          // Check if index already exists
          const existingIndex = this.results.indexes.existing.find(idx => 
            idx.collection === collectionName && 
            JSON.stringify(idx.key) === JSON.stringify(indexSpec.fields)
          );

          if (existingIndex) {
            console.log(`   ⏭️  Index already exists: ${collectionName}.${JSON.stringify(indexSpec.fields)}`);
            continue;
          }

          // Create the index
          const indexName = await collection.createIndex(indexSpec.fields, indexSpec.options || {});
          
          this.results.indexes.created.push({
            collection: collectionName,
            name: indexName,
            fields: indexSpec.fields,
            options: indexSpec.options || {}
          });

          this.results.indexes.recommended.push({
            collection: collectionName,
            fields: indexSpec.fields,
            options: indexSpec.options || {},
            status: 'created'
          });

          console.log(`   ✅ Created index: ${collectionName}.${JSON.stringify(indexSpec.fields)}`);
        } catch (error) {
          console.warn(`   ⚠️  Failed to create index ${collectionName}.${JSON.stringify(indexSpec.fields)}: ${error.message}`);
          
          this.results.indexes.recommended.push({
            collection: collectionName,
            fields: indexSpec.fields,
            options: indexSpec.options || {},
            status: 'failed',
            error: error.message
          });
        }
      }
    }

    console.log(`   ✅ Created ${this.results.indexes.created.length} new indexes`);
  }

  /**
   * Analyze query performance
   */
  async analyzeQueryPerformance() {
    console.log('\n⚡ Analyzing query performance...');

    // Enable profiling for slow queries
    try {
      await this.db.admin().command({ profile: 2, slowms: OPTIMIZATION_CONFIG.thresholds.queryTime });
      console.log('   ✅ Enabled query profiling');
    } catch (error) {
      console.warn('   ⚠️  Could not enable profiling:', error.message);
    }

    // Analyze common query patterns
    const commonQueries = [
      // User queries
      { collection: 'users', query: { organizationId: new mongoose.Types.ObjectId() } },
      { collection: 'users', query: { email: 'test@example.com' } },
      
      // Storage queries
      { collection: 'storagerecords', query: { organizationId: new mongoose.Types.ObjectId() } },
      { collection: 'storagerecords', query: { organizationId: new mongoose.Types.ObjectId(), producto: 'test' } },
      
      // Delivery queries
      { collection: 'deliveryrecords', query: { organizationId: new mongoose.Types.ObjectId() } },
      { collection: 'deliveryrecords', query: { organizationId: new mongoose.Types.ObjectId(), fechaEntrega: { $gte: new Date() } } }
    ];

    for (const queryTest of commonQueries) {
      if (!this.results.collections[queryTest.collection]) continue;

      try {
        const collection = this.db.collection(queryTest.collection);
        
        // Explain the query
        const explanation = await collection.find(queryTest.query).explain('executionStats');
        
        const stats = explanation.executionStats;
        const performance = {
          collection: queryTest.collection,
          query: queryTest.query,
          executionTimeMs: stats.executionTimeMillis,
          totalDocsExamined: stats.totalDocsExamined,
          totalDocsReturned: stats.totalDocsReturned,
          indexUsed: stats.executionStages?.stage === 'IXSCAN',
          efficiency: stats.totalDocsReturned / Math.max(stats.totalDocsExamined, 1)
        };

        this.results.queries.analyzed++;

        // Check for performance issues
        if (performance.executionTimeMs > OPTIMIZATION_CONFIG.thresholds.queryTime) {
          this.results.queries.issues.push({
            type: 'slow_query',
            collection: queryTest.collection,
            query: queryTest.query,
            executionTime: performance.executionTimeMs,
            recommendation: 'Consider adding appropriate indexes'
          });
        }

        if (performance.efficiency < OPTIMIZATION_CONFIG.thresholds.indexUsage) {
          this.results.queries.issues.push({
            type: 'low_efficiency',
            collection: queryTest.collection,
            query: queryTest.query,
            efficiency: performance.efficiency,
            recommendation: 'Query examines too many documents relative to results'
          });
        }

        console.log(`   📊 ${queryTest.collection}: ${performance.executionTimeMs}ms, efficiency: ${(performance.efficiency * 100).toFixed(1)}%`);
      } catch (error) {
        console.warn(`   ⚠️  Could not analyze query for ${queryTest.collection}: ${error.message}`);
      }
    }

    console.log(`   ✅ Analyzed ${this.results.queries.analyzed} queries`);
  }

  /**
   * Optimize slow queries
   */
  async optimizeSlowQueries() {
    console.log('\n🚀 Optimizing slow queries...');

    // Get profiler data for slow queries
    try {
      const profilerCollection = this.db.collection('system.profile');
      const slowQueries = await profilerCollection.find({
        ts: { $gte: new Date(Date.now() - 3600000) }, // Last hour
        millis: { $gte: OPTIMIZATION_CONFIG.thresholds.queryTime }
      }).limit(50).toArray();

      for (const slowQuery of slowQueries) {
        const optimization = this.analyzeSlowQuery(slowQuery);
        if (optimization) {
          this.results.queries.issues.push({
            type: 'slow_query_detected',
            collection: slowQuery.ns.split('.')[1],
            query: slowQuery.command,
            executionTime: slowQuery.millis,
            recommendation: optimization
          });
          this.results.queries.optimized++;
        }
      }

      console.log(`   ✅ Analyzed ${slowQueries.length} slow queries from profiler`);
    } catch (error) {
      console.warn('   ⚠️  Could not access profiler data:', error.message);
    }

    // Disable profiling
    try {
      await this.db.admin().command({ profile: 0 });
    } catch (error) {
      console.warn('   ⚠️  Could not disable profiling:', error.message);
    }
  }

  /**
   * Analyze slow query and provide optimization recommendation
   */
  analyzeSlowQuery(slowQuery) {
    const queryStr = JSON.stringify(slowQuery.command);
    
    // Check for common anti-patterns
    for (const pattern of OPTIMIZATION_CONFIG.queryPatterns.slowPatterns) {
      if (pattern.test(queryStr)) {
        const patternName = pattern.source;
        return OPTIMIZATION_CONFIG.queryPatterns.optimizations[patternName] || 
               'Consider rewriting this query pattern for better performance';
      }
    }

    // Check for missing organizationId in multi-tenant queries
    if (slowQuery.command.find && !slowQuery.command.find.organizationId) {
      return 'Add organizationId to query for better performance in multi-tenant setup';
    }

    // Check for inefficient sorting
    if (slowQuery.command.sort && !slowQuery.command.find) {
      return 'Consider adding compound index that includes sort fields';
    }

    return 'Consider adding appropriate indexes for this query pattern';
  }

  /**
   * Generate optimization report
   */
  async generateOptimizationReport() {
    console.log('\n📄 Generating optimization report...');

    const report = {
      timestamp: new Date(),
      duration: this.results.endTime - this.results.startTime,
      success: this.results.success,
      database: {
        collections: Object.keys(this.results.collections).length,
        totalDocuments: Object.values(this.results.collections).reduce((sum, col) => sum + col.count, 0),
        totalSize: Object.values(this.results.collections).reduce((sum, col) => sum + col.size, 0)
      },
      indexes: {
        existing: this.results.indexes.existing.length,
        created: this.results.indexes.created.length,
        recommended: this.results.indexes.recommended.length
      },
      queries: {
        analyzed: this.results.queries.analyzed,
        optimized: this.results.queries.optimized,
        issues: this.results.queries.issues.length
      },
      collections: this.results.collections,
      indexDetails: this.results.indexes,
      queryIssues: this.results.queries.issues,
      recommendations: this.generateRecommendations()
    };

    // Generate HTML report
    const htmlReport = this.generateHTMLReport(report);

    // Save reports
    await fs.mkdir('optimization-results', { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = `optimization-results/db-optimization-${timestamp}.json`;
    const htmlReportPath = `optimization-results/db-optimization-${timestamp}.html`;

    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    await fs.writeFile(htmlReportPath, htmlReport);

    console.log(`   ✅ Optimization report saved: ${reportPath}`);
    console.log(`   ✅ HTML report saved: ${htmlReportPath}`);

    return report;
  }

  /**
   * Generate recommendations
   */
  generateRecommendations() {
    const recommendations = [];

    // Index recommendations
    if (this.results.indexes.created.length > 0) {
      recommendations.push({
        category: 'indexes',
        priority: 'high',
        title: 'New Indexes Created',
        description: `Created ${this.results.indexes.created.length} new indexes to improve query performance`,
        action: 'Monitor query performance to ensure indexes are being used effectively'
      });
    }

    // Query optimization recommendations
    const slowQueries = this.results.queries.issues.filter(issue => issue.type === 'slow_query');
    if (slowQueries.length > 0) {
      recommendations.push({
        category: 'queries',
        priority: 'high',
        title: 'Slow Queries Detected',
        description: `Found ${slowQueries.length} slow queries that need optimization`,
        action: 'Review and optimize the identified slow queries'
      });
    }

    // Collection scan recommendations
    const inefficientQueries = this.results.queries.issues.filter(issue => issue.type === 'low_efficiency');
    if (inefficientQueries.length > 0) {
      recommendations.push({
        category: 'efficiency',
        priority: 'medium',
        title: 'Inefficient Queries',
        description: `Found ${inefficientQueries.length} queries with low efficiency`,
        action: 'Add appropriate indexes to reduce document examination'
      });
    }

    // General recommendations
    recommendations.push({
      category: 'monitoring',
      priority: 'medium',
      title: 'Continuous Monitoring',
      description: 'Set up regular database performance monitoring',
      action: 'Implement automated query performance monitoring and alerting'
    });

    return recommendations;
  }

  /**
   * Generate HTML report
   */
  generateHTMLReport(report) {
    const statusColor = report.success ? '#4CAF50' : '#F44336';
    const statusText = report.success ? 'SUCCESS' : 'FAILED';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AutoControl Pro - Database Optimization Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: #fff; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .status { display: inline-block; padding: 8px 16px; border-radius: 4px; color: white; font-weight: bold; background: ${statusColor}; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .card { background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric { display: flex; justify-content: space-between; margin: 10px 0; }
        .metric-value { font-weight: bold; }
        .success { color: #4CAF50; }
        .warning { color: #FF9800; }
        .error { color: #F44336; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
        .priority-high { color: #F44336; font-weight: bold; }
        .priority-medium { color: #FF9800; font-weight: bold; }
        .priority-low { color: #4CAF50; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>AutoControl Pro - Database Optimization Report</h1>
            <div class="status">${statusText}</div>
            <p>Generated: ${report.timestamp}</p>
            <p>Duration: ${Math.round(report.duration / 1000)}s</p>
        </div>
        
        <div class="grid">
            <div class="card">
                <h3>Database Overview</h3>
                <div class="metric">
                    <span>Collections:</span>
                    <span class="metric-value">${report.database.collections}</span>
                </div>
                <div class="metric">
                    <span>Total Documents:</span>
                    <span class="metric-value">${report.database.totalDocuments.toLocaleString()}</span>
                </div>
                <div class="metric">
                    <span>Total Size:</span>
                    <span class="metric-value">${Math.round(report.database.totalSize / 1024 / 1024)}MB</span>
                </div>
            </div>
            
            <div class="card">
                <h3>Index Optimization</h3>
                <div class="metric">
                    <span>Existing Indexes:</span>
                    <span class="metric-value">${report.indexes.existing}</span>
                </div>
                <div class="metric">
                    <span>New Indexes Created:</span>
                    <span class="metric-value success">${report.indexes.created}</span>
                </div>
                <div class="metric">
                    <span>Recommendations:</span>
                    <span class="metric-value">${report.indexes.recommended}</span>
                </div>
            </div>
            
            <div class="card">
                <h3>Query Analysis</h3>
                <div class="metric">
                    <span>Queries Analyzed:</span>
                    <span class="metric-value">${report.queries.analyzed}</span>
                </div>
                <div class="metric">
                    <span>Queries Optimized:</span>
                    <span class="metric-value success">${report.queries.optimized}</span>
                </div>
                <div class="metric">
                    <span>Issues Found:</span>
                    <span class="metric-value ${report.queries.issues > 0 ? 'warning' : 'success'}">${report.queries.issues}</span>
                </div>
            </div>
        </div>
        
        <div class="card" style="margin-top: 20px;">
            <h3>Collection Details</h3>
            <table>
                <thead>
                    <tr>
                        <th>Collection</th>
                        <th>Documents</th>
                        <th>Size</th>
                        <th>Avg Doc Size</th>
                        <th>Indexes</th>
                        <th>Index Size</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(report.collections).map(([name, stats]) => `
                    <tr>
                        <td>${name}</td>
                        <td>${stats.count.toLocaleString()}</td>
                        <td>${Math.round(stats.size / 1024)}KB</td>
                        <td>${Math.round(stats.avgObjSize)}B</td>
                        <td>${stats.indexes}</td>
                        <td>${Math.round(stats.indexSize / 1024)}KB</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        ${report.queryIssues.length > 0 ? `
        <div class="card" style="margin-top: 20px;">
            <h3>Query Issues</h3>
            <table>
                <thead>
                    <tr>
                        <th>Type</th>
                        <th>Collection</th>
                        <th>Issue</th>
                        <th>Recommendation</th>
                    </tr>
                </thead>
                <tbody>
                    ${report.queryIssues.map(issue => `
                    <tr>
                        <td class="${issue.type.includes('slow') ? 'error' : 'warning'}">${issue.type}</td>
                        <td>${issue.collection}</td>
                        <td>${issue.executionTime ? `${issue.executionTime}ms` : issue.efficiency ? `${(issue.efficiency * 100).toFixed(1)}% efficiency` : 'Performance issue'}</td>
                        <td>${issue.recommendation}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}
        
        <div class="card" style="margin-top: 20px;">
            <h3>Recommendations</h3>
            <table>
                <thead>
                    <tr>
                        <th>Priority</th>
                        <th>Category</th>
                        <th>Title</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${report.recommendations.map(rec => `
                    <tr>
                        <td class="priority-${rec.priority}">${rec.priority.toUpperCase()}</td>
                        <td>${rec.category}</td>
                        <td>${rec.title}</td>
                        <td>${rec.action}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>
</body>
</html>`;
  }
}

/**
 * Run database optimization
 */
async function optimizeDatabaseQueries() {
  try {
    const optimizer = new DatabaseQueryOptimizer();
    await optimizer.run();
    
    const summary = {
      success: optimizer.results.success,
      duration: optimizer.results.endTime - optimizer.results.startTime,
      collections: Object.keys(optimizer.results.collections).length,
      indexesCreated: optimizer.results.indexes.created.length,
      queriesAnalyzed: optimizer.results.queries.analyzed,
      issuesFound: optimizer.results.queries.issues.length
    };

    console.log('\n📊 Database Optimization Summary:');
    console.log('=================================');
    console.log(`Success: ${summary.success ? 'YES' : 'NO'}`);
    console.log(`Duration: ${Math.round(summary.duration / 1000)}s`);
    console.log(`Collections: ${summary.collections}`);
    console.log(`Indexes Created: ${summary.indexesCreated}`);
    console.log(`Queries Analyzed: ${summary.queriesAnalyzed}`);
    console.log(`Issues Found: ${summary.issuesFound}`);

    return optimizer.results;
  } catch (error) {
    console.error('❌ Database optimization failed:', error);
    throw error;
  }
}

// Run optimization if called directly
if (require.main === module) {
  optimizeDatabaseQueries()
    .then(() => {
      console.log('\n🎉 Database optimization completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Database optimization failed:', error.message);
      process.exit(1);
    });
}

module.exports = {
  DatabaseQueryOptimizer,
  optimizeDatabaseQueries,
  OPTIMIZATION_CONFIG
};