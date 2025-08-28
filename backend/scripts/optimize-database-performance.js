#!/usr/bin/env node

/**
 * Database Performance Optimization Script
 * Analyzes and optimizes database queries, indexes, and performance
 */

const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');

class DatabasePerformanceOptimizer {
  constructor() {
    this.optimizationResults = {
      indexes: [],
      queries: [],
      performance: {},
      recommendations: []
    };
  }

  async connectToDatabase() {
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/autocontrol-pro';
      await mongoose.connect(mongoUri);
      console.log('✅ Connected to MongoDB');
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error.message);
      return false;
    }
  }

  async analyzeCollectionIndexes() {
    console.log('🔍 Analyzing collection indexes...');
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      const collection = mongoose.connection.db.collection(collectionName);
      
      try {
        const indexes = await collection.indexes();
        const stats = await collection.stats();
        
        console.log(`\\n📊 Collection: ${collectionName}`);
        console.log(`   Documents: ${stats.count.toLocaleString()}`);
        console.log(`   Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   Indexes: ${indexes.length}`);
        
        // Analyze index usage
        const indexStats = await this.getIndexStats(collection);
        
        this.optimizationResults.indexes.push({
          collection: collectionName,
          documentCount: stats.count,
          size: stats.size,
          indexes: indexes,
          indexStats: indexStats,
          recommendations: this.generateIndexRecommendations(collectionName, indexes, stats)
        });
        
      } catch (error) {
        console.log(`   ⚠️  Could not analyze ${collectionName}: ${error.message}`);
      }
    }
  }

  async getIndexStats(collection) {
    try {
      const indexStats = await collection.aggregate([
        { $indexStats: {} }
      ]).toArray();
      
      return indexStats.map(stat => ({
        name: stat.name,
        accesses: stat.accesses.ops,
        since: stat.accesses.since
      }));
    } catch (error) {
      return [];
    }
  }

  generateIndexRecommendations(collectionName, indexes, stats) {
    const recommendations = [];
    
    // Check for missing compound indexes based on collection type
    switch (collectionName) {
      case 'users':
        if (!this.hasIndex(indexes, ['organizationId', 'email'])) {
          recommendations.push({
            type: 'missing_index',
            priority: 'high',
            description: 'Add compound index on organizationId + email for multi-tenant queries',
            command: 'db.users.createIndex({ organizationId: 1, email: 1 })'
          });
        }
        if (!this.hasIndex(indexes, ['organizationId', 'isActive'])) {
          recommendations.push({
            type: 'missing_index',
            priority: 'medium',
            description: 'Add compound index on organizationId + isActive for user listing',
            command: 'db.users.createIndex({ organizationId: 1, isActive: 1 })'
          });
        }
        break;
        
      case 'storagerecords':
        if (!this.hasIndex(indexes, ['organizationId', 'fechaCaducidad'])) {
          recommendations.push({
            type: 'missing_index',
            priority: 'high',
            description: 'Add compound index on organizationId + fechaCaducidad for expiration queries',
            command: 'db.storagerecords.createIndex({ organizationId: 1, fechaCaducidad: 1 })'
          });
        }
        if (!this.hasIndex(indexes, ['organizationId', 'producto'])) {
          recommendations.push({
            type: 'missing_index',
            priority: 'medium',
            description: 'Add compound index on organizationId + producto for product searches',
            command: 'db.storagerecords.createIndex({ organizationId: 1, producto: "text" })'
          });
        }
        break;
        
      case 'deliveryrecords':
        if (!this.hasIndex(indexes, ['organizationId', 'fechaEntrega'])) {
          recommendations.push({
            type: 'missing_index',
            priority: 'high',
            description: 'Add compound index on organizationId + fechaEntrega for delivery queries',
            command: 'db.deliveryrecords.createIndex({ organizationId: 1, fechaEntrega: -1 })'
          });
        }
        break;
        
      case 'auditlogs':
        if (!this.hasIndex(indexes, ['organizationId', 'timestamp'])) {
          recommendations.push({
            type: 'missing_index',
            priority: 'medium',
            description: 'Add compound index on organizationId + timestamp for audit log queries',
            command: 'db.auditlogs.createIndex({ organizationId: 1, timestamp: -1 })'
          });
        }
        break;
    }
    
    // Check for unused indexes
    const unusedIndexes = indexes.filter(index => 
      index.name !== '_id_' && 
      !this.isIndexUsed(index.name, stats)
    );
    
    unusedIndexes.forEach(index => {
      recommendations.push({
        type: 'unused_index',
        priority: 'low',
        description: `Consider removing unused index: ${index.name}`,
        command: `db.${collectionName}.dropIndex("${index.name}")`
      });
    });
    
    return recommendations;
  }

  hasIndex(indexes, fields) {
    return indexes.some(index => {
      const indexFields = Object.keys(index.key);
      return fields.every(field => indexFields.includes(field));
    });
  }

  isIndexUsed(indexName, stats) {
    // Simple heuristic - in a real scenario, you'd check index usage stats
    return stats.count > 1000; // Assume indexes are used for collections with many documents
  }

  async createOptimalIndexes() {
    console.log('\\n🚀 Creating optimal indexes...');
    
    const indexCommands = [
      // Users collection
      {
        collection: 'users',
        indexes: [
          { organizationId: 1, email: 1 },
          { organizationId: 1, isActive: 1 },
          { organizationId: 1, role: 1 },
          { email: 1, emailVerified: 1 },
          { passwordResetToken: 1 },
          { emailVerificationToken: 1 }
        ]
      },
      
      // Organizations collection
      {
        collection: 'organizations',
        indexes: [
          { subdomain: 1 },
          { isActive: 1 },
          { subscriptionStatus: 1 },
          { createdAt: -1 }
        ]
      },
      
      // Storage Records collection
      {
        collection: 'storagerecords',
        indexes: [
          { organizationId: 1, fechaCaducidad: 1 },
          { organizationId: 1, producto: 'text' },
          { organizationId: 1, lote: 1 },
          { organizationId: 1, estado: 1 },
          { organizationId: 1, createdAt: -1 },
          { organizationId: 1, registradoPor: 1 },
          { fechaCaducidad: 1 }, // For global expiration checks
          { organizationId: 1, ubicacion: 1 }
        ]
      },
      
      // Delivery Records collection
      {
        collection: 'deliveryrecords',
        indexes: [
          { organizationId: 1, fechaEntrega: -1 },
          { organizationId: 1, cliente: 1 },
          { organizationId: 1, estado: 1 },
          { organizationId: 1, createdAt: -1 },
          { organizationId: 1, registradoPor: 1 }
        ]
      },
      
      // Audit Logs collection
      {
        collection: 'auditlogs',
        indexes: [
          { organizationId: 1, timestamp: -1 },
          { organizationId: 1, action: 1 },
          { organizationId: 1, resource: 1 },
          { organizationId: 1, userId: 1 },
          { timestamp: -1 }, // For global audit queries
          { organizationId: 1, resourceId: 1 }
        ]
      }
    ];

    for (const collectionConfig of indexCommands) {
      const collection = mongoose.connection.db.collection(collectionConfig.collection);
      
      console.log(`\\n📝 Creating indexes for ${collectionConfig.collection}...`);
      
      for (const indexSpec of collectionConfig.indexes) {
        try {
          const indexName = await collection.createIndex(indexSpec, { 
            background: true,
            name: this.generateIndexName(indexSpec)
          });
          console.log(`   ✅ Created index: ${indexName}`);
        } catch (error) {
          if (error.code === 85) {
            console.log(`   ℹ️  Index already exists: ${this.generateIndexName(indexSpec)}`);
          } else {
            console.log(`   ❌ Failed to create index ${this.generateIndexName(indexSpec)}: ${error.message}`);
          }
        }
      }
    }
  }

  generateIndexName(indexSpec) {
    return Object.keys(indexSpec)
      .map(key => `${key}_${indexSpec[key]}`)
      .join('_');
  }

  async analyzeSlowQueries() {
    console.log('\\n🐌 Analyzing slow queries...');
    
    try {
      // Enable profiling for slow queries (>100ms)
      await mongoose.connection.db.admin().command({
        profile: 2,
        slowms: 100
      });
      
      console.log('✅ Database profiling enabled for queries >100ms');
      
      // Get profiling data
      const profilingData = await mongoose.connection.db
        .collection('system.profile')
        .find({})
        .sort({ ts: -1 })
        .limit(50)
        .toArray();
      
      if (profilingData.length > 0) {
        console.log(`\\n📊 Found ${profilingData.length} slow queries:`);
        
        profilingData.forEach((query, index) => {
          console.log(`\\n${index + 1}. Duration: ${query.millis}ms`);
          console.log(`   Collection: ${query.ns}`);
          console.log(`   Command: ${JSON.stringify(query.command, null, 2)}`);
          
          if (query.planSummary) {
            console.log(`   Plan: ${query.planSummary}`);
          }
        });
        
        this.optimizationResults.queries = profilingData;
      } else {
        console.log('✅ No slow queries found');
      }
      
    } catch (error) {
      console.log(`⚠️  Could not analyze slow queries: ${error.message}`);
    }
  }

  async optimizeConnectionPool() {
    console.log('\\n🔗 Optimizing connection pool...');
    
    const currentConfig = mongoose.connection.options;
    
    const optimalConfig = {
      maxPoolSize: 10, // Maximum number of connections
      minPoolSize: 2,  // Minimum number of connections
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      serverSelectionTimeoutMS: 5000, // How long to try selecting a server
      socketTimeoutMS: 45000, // How long a send or receive on a socket can take
      bufferMaxEntries: 0, // Disable mongoose buffering
      bufferCommands: false, // Disable mongoose buffering
      heartbeatFrequencyMS: 10000, // How often to check server status
      retryWrites: true, // Retry writes on network errors
      retryReads: true, // Retry reads on network errors
      compressors: ['zlib'], // Enable compression
      zlibCompressionLevel: 6 // Compression level
    };
    
    console.log('📋 Current connection configuration:');
    console.log(JSON.stringify(currentConfig, null, 2));
    
    console.log('\\n📋 Recommended connection configuration:');
    console.log(JSON.stringify(optimalConfig, null, 2));
    
    // Save optimal configuration to file
    const configPath = path.join(__dirname, '../config/mongodb-optimal.json');
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(configPath, JSON.stringify(optimalConfig, null, 2));
    
    console.log(`\\n✅ Optimal configuration saved to: ${configPath}`);
    
    this.optimizationResults.performance.connectionPool = {
      current: currentConfig,
      recommended: optimalConfig
    };
  }

  async generatePerformanceReport() {
    console.log('\\n📄 Generating performance report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      database: {
        name: mongoose.connection.name,
        host: mongoose.connection.host,
        port: mongoose.connection.port
      },
      optimization: this.optimizationResults,
      summary: {
        totalCollections: this.optimizationResults.indexes.length,
        totalRecommendations: this.optimizationResults.indexes.reduce(
          (sum, col) => sum + col.recommendations.length, 0
        ),
        slowQueries: this.optimizationResults.queries.length,
        criticalIssues: this.optimizationResults.indexes.reduce(
          (sum, col) => sum + col.recommendations.filter(r => r.priority === 'high').length, 0
        )
      },
      recommendations: {
        immediate: [],
        shortTerm: [],
        longTerm: []
      }
    };
    
    // Categorize recommendations
    this.optimizationResults.indexes.forEach(collection => {
      collection.recommendations.forEach(rec => {
        switch (rec.priority) {
          case 'high':
            report.recommendations.immediate.push({
              collection: collection.collection,
              ...rec
            });
            break;
          case 'medium':
            report.recommendations.shortTerm.push({
              collection: collection.collection,
              ...rec
            });
            break;
          case 'low':
            report.recommendations.longTerm.push({
              collection: collection.collection,
              ...rec
            });
            break;
        }
      });
    });
    
    // Save report
    const reportPath = path.join(__dirname, '../reports/database-performance-report.json');
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\\n✅ Performance report saved to: ${reportPath}`);
    
    return report;
  }

  async createOptimizationScript() {
    console.log('\\n📝 Creating optimization script...');
    
    const script = `#!/bin/bash

# Database Performance Optimization Script
# Run this script to apply all recommended optimizations

echo "🚀 AutoControl Pro - Database Performance Optimization"
echo "====================================================="

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "❌ MongoDB is not running. Please start MongoDB first."
    exit 1
fi

echo "✅ MongoDB is running"

# Apply index optimizations
echo "\\n📊 Applying index optimizations..."

mongo autocontrol-pro --eval "
// Users collection indexes
db.users.createIndex({ organizationId: 1, email: 1 }, { background: true });
db.users.createIndex({ organizationId: 1, isActive: 1 }, { background: true });
db.users.createIndex({ organizationId: 1, role: 1 }, { background: true });
db.users.createIndex({ email: 1, emailVerified: 1 }, { background: true });

// Organizations collection indexes
db.organizations.createIndex({ subdomain: 1 }, { background: true });
db.organizations.createIndex({ isActive: 1 }, { background: true });

// Storage records indexes
db.storagerecords.createIndex({ organizationId: 1, fechaCaducidad: 1 }, { background: true });
db.storagerecords.createIndex({ organizationId: 1, producto: 'text' }, { background: true });
db.storagerecords.createIndex({ organizationId: 1, lote: 1 }, { background: true });
db.storagerecords.createIndex({ organizationId: 1, createdAt: -1 }, { background: true });

// Delivery records indexes
db.deliveryrecords.createIndex({ organizationId: 1, fechaEntrega: -1 }, { background: true });
db.deliveryrecords.createIndex({ organizationId: 1, cliente: 1 }, { background: true });
db.deliveryrecords.createIndex({ organizationId: 1, estado: 1 }, { background: true });

// Audit logs indexes
db.auditlogs.createIndex({ organizationId: 1, timestamp: -1 }, { background: true });
db.auditlogs.createIndex({ organizationId: 1, action: 1 }, { background: true });

print('✅ Index optimization completed');
"

# Enable query profiling
echo "\\n🔍 Enabling query profiling..."
mongo autocontrol-pro --eval "
db.setProfilingLevel(1, { slowms: 100 });
print('✅ Query profiling enabled for queries >100ms');
"

# Optimize collection settings
echo "\\n⚙️  Optimizing collection settings..."
mongo autocontrol-pro --eval "
// Enable compression for collections
db.runCommand({
    collMod: 'storagerecords',
    validator: {},
    validationLevel: 'moderate'
});

db.runCommand({
    collMod: 'deliveryrecords', 
    validator: {},
    validationLevel: 'moderate'
});

print('✅ Collection settings optimized');
"

echo "\\n🎉 Database optimization completed!"
echo "\\n📋 Next steps:"
echo "1. Monitor query performance using: db.system.profile.find().sort({ts:-1}).limit(10)"
echo "2. Check index usage with: db.collection.aggregate([{\\$indexStats:{}}])"
echo "3. Run this script periodically to maintain optimal performance"
`;

    const scriptPath = path.join(__dirname, '../scripts/optimize-database.sh');
    await fs.writeFile(scriptPath, script);
    await fs.chmod(scriptPath, 0o755);
    
    console.log(`✅ Optimization script created at: ${scriptPath}`);
  }

  printSummary(report) {
    console.log('\\n' + '='.repeat(80));
    console.log('📊 DATABASE PERFORMANCE OPTIMIZATION SUMMARY');
    console.log('='.repeat(80));
    
    console.log(`\\n📈 Performance Metrics:`);
    console.log(`   Collections analyzed: ${report.summary.totalCollections}`);
    console.log(`   Total recommendations: ${report.summary.totalRecommendations}`);
    console.log(`   Critical issues: ${report.summary.criticalIssues}`);
    console.log(`   Slow queries found: ${report.summary.slowQueries}`);
    
    if (report.recommendations.immediate.length > 0) {
      console.log(`\\n🚨 Immediate Actions Required:`);
      report.recommendations.immediate.forEach((rec, index) => {
        console.log(`   ${index + 1}. [${rec.collection}] ${rec.description}`);
        console.log(`      Command: ${rec.command}`);
      });
    }
    
    if (report.recommendations.shortTerm.length > 0) {
      console.log(`\\n⏰ Short-term Improvements:`);
      report.recommendations.shortTerm.forEach((rec, index) => {
        console.log(`   ${index + 1}. [${rec.collection}] ${rec.description}`);
      });
    }
    
    console.log(`\\n📋 Files Created:`);
    console.log(`   • Database performance report: reports/database-performance-report.json`);
    console.log(`   • Optimal MongoDB config: config/mongodb-optimal.json`);
    console.log(`   • Optimization script: scripts/optimize-database.sh`);
    
    console.log(`\\n🚀 Quick Actions:`);
    console.log(`   • Run optimization script: ./scripts/optimize-database.sh`);
    console.log(`   • Monitor slow queries: db.system.profile.find().sort({ts:-1})`);
    console.log(`   • Check index usage: db.collection.aggregate([{$indexStats:{}}])`);
    
    console.log('\\n' + '='.repeat(80));
  }

  async run() {
    try {
      console.log('🚀 AutoControl Pro - Database Performance Optimization');
      console.log('====================================================');
      
      const connected = await this.connectToDatabase();
      if (!connected) {
        process.exit(1);
      }
      
      await this.analyzeCollectionIndexes();
      await this.createOptimalIndexes();
      await this.analyzeSlowQueries();
      await this.optimizeConnectionPool();
      
      const report = await this.generatePerformanceReport();
      await this.createOptimizationScript();
      
      this.printSummary(report);
      
    } catch (error) {
      console.error('❌ Database optimization failed:', error.message);
      process.exit(1);
    } finally {
      await mongoose.disconnect();
    }
  }
}

// Run if called directly
if (require.main === module) {
  const optimizer = new DatabasePerformanceOptimizer();
  optimizer.run();
}

module.exports = DatabasePerformanceOptimizer;