#!/usr/bin/env node
/**
 * Connection Pooling Optimization Script
 * Optimizes MongoDB connection pooling for production environments
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Connection pooling configuration
 */
const POOLING_CONFIG = {
  // Production optimized settings
  production: {
    maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE) || 10,
    minPoolSize: parseInt(process.env.DB_MIN_POOL_SIZE) || 2,
    maxIdleTimeMS: parseInt(process.env.DB_MAX_IDLE_TIME) || 30000,
    waitQueueTimeoutMS: parseInt(process.env.DB_WAIT_QUEUE_TIMEOUT) || 10000,
    serverSelectionTimeoutMS: parseInt(process.env.DB_SERVER_SELECTION_TIMEOUT) || 5000,
    socketTimeoutMS: parseInt(process.env.DB_SOCKET_TIMEOUT) || 45000,
    connectTimeoutMS: parseInt(process.env.DB_CONNECT_TIMEOUT) || 10000,
    heartbeatFrequencyMS: parseInt(process.env.DB_HEARTBEAT_FREQUENCY) || 10000,
    bufferMaxEntries: 0, // Disable buffering in production
    bufferCommands: false,
    retryWrites: true,
    retryReads: true,
    readPreference: 'primaryPreferred',
    readConcern: { level: 'majority' },
    writeConcern: { w: 'majority', j: true, wtimeout: 10000 }
  },
  
  // Development settings
  development: {
    maxPoolSize: 5,
    minPoolSize: 1,
    maxIdleTimeMS: 60000,
    waitQueueTimeoutMS: 5000,
    serverSelectionTimeoutMS: 3000,
    socketTimeoutMS: 30000,
    connectTimeoutMS: 5000,
    heartbeatFrequencyMS: 30000,
    bufferMaxEntries: 0,
    bufferCommands: false,
    retryWrites: true,
    retryReads: true
  },
  
  // Test environment settings
  test: {
    maxPoolSize: 2,
    minPoolSize: 1,
    maxIdleTimeMS: 10000,
    waitQueueTimeoutMS: 2000,
    serverSelectionTimeoutMS: 1000,
    socketTimeoutMS: 10000,
    connectTimeoutMS: 2000,
    bufferMaxEntries: 0,
    bufferCommands: false
  }
};

/**
 * Connection pool optimizer
 */
class ConnectionPoolOptimizer {
  constructor() {
    this.environment = process.env.NODE_ENV || 'development';
    this.config = POOLING_CONFIG[this.environment] || POOLING_CONFIG.development;
    this.metrics = {
      connections: new Map(),
      operations: new Map(),
      errors: []
    };
  }

  /**
   * Initialize optimized connection
   */
  async initialize() {
    try {
      console.log(`🚀 Initializing optimized connection pool for ${this.environment}...`);
      
      // Validate configuration
      this.validateConfiguration();
      
      // Setup connection with optimized settings
      await this.setupOptimizedConnection();
      
      // Setup connection monitoring
      this.setupConnectionMonitoring();
      
      // Test connection performance
      await this.testConnectionPerformance();
      
      console.log('✅ Connection pool optimization completed');
      
    } catch (error) {
      console.error('❌ Error initializing connection pool:', error);
      throw error;
    }
  }

  /**
   * Validate configuration
   */
  validateConfiguration() {
    console.log('🔍 Validating connection pool configuration...');
    
    // Check required environment variables
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is required');
    }
    
    // Validate pool size settings
    if (this.config.maxPoolSize < this.config.minPoolSize) {
      throw new Error('maxPoolSize must be greater than or equal to minPoolSize');
    }
    
    // Validate timeout settings
    if (this.config.connectTimeoutMS > this.config.socketTimeoutMS) {
      console.warn('⚠️  connectTimeoutMS is greater than socketTimeoutMS');
    }
    
    // Log configuration
    console.log('📊 Connection pool configuration:');
    console.log(`   Environment: ${this.environment}`);
    console.log(`   Max Pool Size: ${this.config.maxPoolSize}`);
    console.log(`   Min Pool Size: ${this.config.minPoolSize}`);
    console.log(`   Max Idle Time: ${this.config.maxIdleTimeMS}ms`);
    console.log(`   Socket Timeout: ${this.config.socketTimeoutMS}ms`);
    console.log(`   Connect Timeout: ${this.config.connectTimeoutMS}ms`);
    
    console.log('✅ Configuration validated');
  }

  /**
   * Setup optimized connection
   */
  async setupOptimizedConnection() {
    console.log('🔗 Setting up optimized MongoDB connection...');
    
    // Close existing connection if any
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    
    // Connect with optimized settings
    await mongoose.connect(process.env.MONGODB_URI, this.config);
    
    console.log('✅ Optimized connection established');
  }

  /**
   * Setup connection monitoring
   */
  setupConnectionMonitoring() {
    console.log('📊 Setting up connection monitoring...');
    
    const db = mongoose.connection;
    
    // Connection events
    db.on('connected', () => {
      logger.info('MongoDB connected');
      this.recordMetric('connection', 'connected', new Date());
    });
    
    db.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
      this.recordMetric('connection', 'disconnected', new Date());
    });
    
    db.on('reconnected', () => {
      logger.info('MongoDB reconnected');
      this.recordMetric('connection', 'reconnected', new Date());
    });
    
    db.on('error', (error) => {
      logger.error('MongoDB connection error:', error);
      this.recordError('connection', error);
    });
    
    // Pool events (if available)
    if (db.db && db.db.serverConfig) {
      const pool = db.db.serverConfig.s?.pool;
      if (pool) {
        pool.on('connectionCreated', (event) => {
          logger.debug('Connection created:', event.connectionId);
          this.recordMetric('pool', 'connectionCreated', new Date());
        });
        
        pool.on('connectionClosed', (event) => {
          logger.debug('Connection closed:', event.connectionId);
          this.recordMetric('pool', 'connectionClosed', new Date());
        });
        
        pool.on('connectionCheckOutStarted', (event) => {
          this.recordMetric('pool', 'checkOutStarted', new Date());
        });
        
        pool.on('connectionCheckOutFailed', (event) => {
          logger.warn('Connection checkout failed:', event.reason);
          this.recordError('pool', new Error(event.reason));
        });
      }
    }
    
    // Setup periodic monitoring
    setInterval(() => {
      this.collectConnectionMetrics();
    }, 30000); // Every 30 seconds
    
    console.log('✅ Connection monitoring configured');
  }

  /**
   * Test connection performance
   */
  async testConnectionPerformance() {
    console.log('🧪 Testing connection performance...');
    
    const tests = [
      { name: 'Simple Query', test: () => this.testSimpleQuery() },
      { name: 'Concurrent Queries', test: () => this.testConcurrentQueries() },
      { name: 'Connection Pool Stress', test: () => this.testConnectionPoolStress() },
      { name: 'Long Running Query', test: () => this.testLongRunningQuery() }
    ];
    
    const results = [];
    
    for (const test of tests) {
      try {
        console.log(`   Running ${test.name}...`);
        const startTime = Date.now();
        await test.test();
        const duration = Date.now() - startTime;
        results.push({ name: test.name, duration, status: 'passed' });
        console.log(`   ✅ ${test.name}: ${duration}ms`);
      } catch (error) {
        results.push({ name: test.name, error: error.message, status: 'failed' });
        console.log(`   ❌ ${test.name}: ${error.message}`);
      }
    }
    
    // Log summary
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    
    console.log(`📊 Performance test results: ${passed} passed, ${failed} failed`);
    
    if (failed > 0) {
      console.warn('⚠️  Some performance tests failed. Check configuration.');
    }
    
    return results;
  }

  /**
   * Test simple query performance
   */
  async testSimpleQuery() {
    const db = mongoose.connection.db;
    await db.collection('users').findOne({});
  }

  /**
   * Test concurrent queries
   */
  async testConcurrentQueries() {
    const db = mongoose.connection.db;
    const queries = [];
    
    for (let i = 0; i < 10; i++) {
      queries.push(db.collection('users').findOne({}));
    }
    
    await Promise.all(queries);
  }

  /**
   * Test connection pool stress
   */
  async testConnectionPoolStress() {
    const db = mongoose.connection.db;
    const operations = [];
    
    // Create more operations than pool size to test queuing
    const operationCount = this.config.maxPoolSize * 2;
    
    for (let i = 0; i < operationCount; i++) {
      operations.push(
        db.collection('users').findOne({}).then(() => {
          // Simulate some processing time
          return new Promise(resolve => setTimeout(resolve, 100));
        })
      );
    }
    
    await Promise.all(operations);
  }

  /**
   * Test long running query
   */
  async testLongRunningQuery() {
    const db = mongoose.connection.db;
    
    // Use a query that takes some time but doesn't timeout
    await db.collection('users').aggregate([
      { $match: {} },
      { $group: { _id: null, count: { $sum: 1 } } }
    ]).toArray();
  }

  /**
   * Collect connection metrics
   */
  async collectConnectionMetrics() {
    try {
      const db = mongoose.connection.db;
      
      if (!db) return;
      
      // Get server status
      const serverStatus = await db.admin().serverStatus();
      
      const metrics = {
        timestamp: new Date(),
        connections: {
          current: serverStatus.connections.current,
          available: serverStatus.connections.available,
          totalCreated: serverStatus.connections.totalCreated
        },
        network: {
          bytesIn: serverStatus.network.bytesIn,
          bytesOut: serverStatus.network.bytesOut,
          numRequests: serverStatus.network.numRequests
        },
        opcounters: serverStatus.opcounters,
        uptime: serverStatus.uptime
      };
      
      this.recordMetric('server', 'status', metrics);
      
      // Log connection pool status
      const poolUsage = (metrics.connections.current / (metrics.connections.current + metrics.connections.available)) * 100;
      
      if (poolUsage > 80) {
        logger.warn(`High connection pool usage: ${poolUsage.toFixed(1)}%`);
      }
      
    } catch (error) {
      logger.error('Error collecting connection metrics:', error);
    }
  }

  /**
   * Record metric
   */
  recordMetric(category, type, data) {
    const key = `${category}_${type}`;
    
    if (!this.metrics.operations.has(key)) {
      this.metrics.operations.set(key, []);
    }
    
    const operations = this.metrics.operations.get(key);
    operations.push({
      timestamp: new Date(),
      data
    });
    
    // Keep only last 100 entries per metric
    if (operations.length > 100) {
      operations.splice(0, operations.length - 100);
    }
  }

  /**
   * Record error
   */
  recordError(category, error) {
    this.metrics.errors.push({
      timestamp: new Date(),
      category,
      message: error.message,
      stack: error.stack
    });
    
    // Keep only last 50 errors
    if (this.metrics.errors.length > 50) {
      this.metrics.errors = this.metrics.errors.slice(-50);
    }
  }

  /**
   * Get connection statistics
   */
  async getConnectionStats() {
    try {
      const db = mongoose.connection.db;
      
      if (!db) {
        return { error: 'No database connection' };
      }
      
      const serverStatus = await db.admin().serverStatus();
      
      return {
        readyState: mongoose.connection.readyState,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        name: mongoose.connection.name,
        connections: serverStatus.connections,
        network: serverStatus.network,
        uptime: serverStatus.uptime,
        poolConfig: this.config,
        metrics: {
          operations: Object.fromEntries(this.metrics.operations),
          errors: this.metrics.errors.slice(-10) // Last 10 errors
        }
      };
      
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Optimize pool size based on usage patterns
   */
  async optimizePoolSize() {
    console.log('🔧 Analyzing connection usage patterns...');
    
    try {
      const stats = await this.getConnectionStats();
      
      if (stats.error) {
        throw new Error(stats.error);
      }
      
      const currentUsage = stats.connections.current;
      const maxPoolSize = this.config.maxPoolSize;
      const usagePercentage = (currentUsage / maxPoolSize) * 100;
      
      let recommendation = null;
      
      if (usagePercentage > 90) {
        recommendation = {
          action: 'increase',
          currentMax: maxPoolSize,
          suggestedMax: Math.min(maxPoolSize + 5, 20),
          reason: 'High pool utilization detected'
        };
      } else if (usagePercentage < 30 && maxPoolSize > 5) {
        recommendation = {
          action: 'decrease',
          currentMax: maxPoolSize,
          suggestedMax: Math.max(maxPoolSize - 2, 5),
          reason: 'Low pool utilization detected'
        };
      }
      
      if (recommendation) {
        console.log(`💡 Pool size optimization recommendation:`);
        console.log(`   Action: ${recommendation.action} pool size`);
        console.log(`   Current: ${recommendation.currentMax}`);
        console.log(`   Suggested: ${recommendation.suggestedMax}`);
        console.log(`   Reason: ${recommendation.reason}`);
      } else {
        console.log('✅ Current pool size appears optimal');
      }
      
      return recommendation;
      
    } catch (error) {
      console.error('Error analyzing connection patterns:', error);
      return null;
    }
  }

  /**
   * Generate connection pool report
   */
  async generateReport() {
    const stats = await this.getConnectionStats();
    const optimization = await this.optimizePoolSize();
    
    const report = {
      timestamp: new Date(),
      environment: this.environment,
      configuration: this.config,
      statistics: stats,
      optimization,
      recommendations: this.generateRecommendations(stats, optimization)
    };
    
    return report;
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(stats, optimization) {
    const recommendations = [];
    
    if (stats.error) {
      recommendations.push({
        type: 'error',
        message: 'Unable to collect connection statistics',
        priority: 'high'
      });
      return recommendations;
    }
    
    // Pool utilization recommendations
    const utilization = (stats.connections.current / this.config.maxPoolSize) * 100;
    
    if (utilization > 80) {
      recommendations.push({
        type: 'performance',
        message: 'Consider increasing maxPoolSize to handle high connection demand',
        priority: 'medium'
      });
    }
    
    // Timeout recommendations
    if (this.metrics.errors.some(e => e.message.includes('timeout'))) {
      recommendations.push({
        type: 'timeout',
        message: 'Consider increasing timeout values due to detected timeout errors',
        priority: 'high'
      });
    }
    
    // Environment-specific recommendations
    if (this.environment === 'production') {
      if (this.config.bufferCommands) {
        recommendations.push({
          type: 'configuration',
          message: 'Disable bufferCommands in production for better error handling',
          priority: 'medium'
        });
      }
      
      if (!this.config.retryWrites) {
        recommendations.push({
          type: 'configuration',
          message: 'Enable retryWrites for better resilience in production',
          priority: 'low'
        });
      }
    }
    
    return recommendations;
  }
}

/**
 * Optimize connection pooling
 */
async function optimizeConnectionPooling() {
  try {
    console.log('🔧 Starting connection pool optimization...');
    
    // Create optimizer
    const optimizer = new ConnectionPoolOptimizer();
    
    // Initialize optimization
    await optimizer.initialize();
    
    // Generate and display report
    const report = await optimizer.generateReport();
    
    console.log('\n📊 Connection Pool Optimization Report');
    console.log('=====================================');
    console.log(`Environment: ${report.environment}`);
    console.log(`Timestamp: ${report.timestamp}`);
    
    if (report.statistics.error) {
      console.log(`❌ Statistics Error: ${report.statistics.error}`);
    } else {
      console.log(`Current Connections: ${report.statistics.connections.current}`);
      console.log(`Available Connections: ${report.statistics.connections.available}`);
      console.log(`Max Pool Size: ${report.configuration.maxPoolSize}`);
      console.log(`Min Pool Size: ${report.configuration.minPoolSize}`);
    }
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. [${rec.priority.toUpperCase()}] ${rec.message}`);
      });
    } else {
      console.log('\n✅ No recommendations - configuration appears optimal');
    }
    
    console.log('\n✅ Connection pool optimization completed');
    
    return report;
    
  } catch (error) {
    console.error('❌ Error optimizing connection pooling:', error);
    throw error;
  }
}

// Run optimization if called directly
if (require.main === module) {
  optimizeConnectionPooling()
    .then(() => {
      console.log('🎉 Optimization completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Optimization failed:', error);
      process.exit(1);
    });
}

module.exports = {
  ConnectionPoolOptimizer,
  optimizeConnectionPooling,
  POOLING_CONFIG
};