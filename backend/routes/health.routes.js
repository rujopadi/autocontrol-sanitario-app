const express = require('express');
const mongoose = require('mongoose');
const { checkDBHealth, getDBStats } = require('../config/database.prod');

const router = express.Router();

// Basic health check
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: process.env.APP_VERSION || '1.0.0',
      services: {}
    };

    // Check database connection
    const dbHealth = await checkDBHealth();
    health.services.database = dbHealth;

    // Check memory usage
    const memUsage = process.memoryUsage();
    health.services.memory = {
      status: 'healthy',
      usage: {
        rss: Math.round(memUsage.rss / 1024 / 1024 * 100) / 100, // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100, // MB
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100, // MB
        external: Math.round(memUsage.external / 1024 / 1024 * 100) / 100 // MB
      }
    };

    // Check if any service is unhealthy
    const isUnhealthy = Object.values(health.services).some(
      service => service.status === 'unhealthy'
    );

    if (isUnhealthy) {
      health.status = 'unhealthy';
      return res.status(503).json(health);
    }

    res.json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Detailed health check (requires authentication)
router.get('/health/detailed', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: process.env.APP_VERSION || '1.0.0',
      services: {},
      system: {}
    };

    // Database health and statistics
    const dbHealth = await checkDBHealth();
    const dbStats = await getDBStats();
    health.services.database = {
      ...dbHealth,
      statistics: dbStats
    };

    // System information
    health.system = {
      platform: process.platform,
      nodeVersion: process.version,
      cpuUsage: process.cpuUsage(),
      memoryUsage: process.memoryUsage(),
      loadAverage: require('os').loadavg(),
      freeMemory: require('os').freemem(),
      totalMemory: require('os').totalmem()
    };

    // Connection pool information
    if (mongoose.connection.readyState === 1) {
      health.services.database.connectionPool = {
        maxPoolSize: mongoose.connection.options?.maxPoolSize || 'default',
        currentConnections: mongoose.connection.db?.serverConfig?.connections?.length || 'unknown'
      };
    }

    // Environment variables check (without exposing sensitive data)
    health.configuration = {
      requiredEnvVars: {
        MONGODB_URI: !!process.env.MONGODB_URI,
        JWT_SECRET: !!process.env.JWT_SECRET,
        EMAIL_API_KEY: !!process.env.EMAIL_API_KEY,
        FRONTEND_URL: !!process.env.FRONTEND_URL
      }
    };

    // Check if any service is unhealthy
    const isUnhealthy = Object.values(health.services).some(
      service => service.status === 'unhealthy'
    );

    if (isUnhealthy) {
      health.status = 'unhealthy';
      return res.status(503).json(health);
    }

    res.json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Readiness check (for Kubernetes/Docker)
router.get('/ready', async (req, res) => {
  try {
    // Check if database is ready
    const dbHealth = await checkDBHealth();
    
    if (dbHealth.status === 'healthy') {
      res.json({
        status: 'ready',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        reason: 'Database not available'
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Liveness check (for Kubernetes/Docker)
router.get('/live', (req, res) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Database statistics endpoint
router.get('/stats/database', async (req, res) => {
  try {
    const stats = await getDBStats();
    
    // Additional collection-specific stats
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionStats = {};
    
    for (const collection of collections) {
      try {
        const collStats = await mongoose.connection.db.collection(collection.name).stats();
        collectionStats[collection.name] = {
          documents: collStats.count,
          avgObjSize: Math.round(collStats.avgObjSize || 0),
          dataSize: Math.round((collStats.size || 0) / 1024), // KB
          indexSize: Math.round((collStats.totalIndexSize || 0) / 1024) // KB
        };
      } catch (err) {
        collectionStats[collection.name] = { error: 'Unable to get stats' };
      }
    }
    
    res.json({
      database: stats,
      collections: collectionStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Performance metrics endpoint
router.get('/metrics', (req, res) => {
  const metrics = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    system: {
      platform: process.platform,
      nodeVersion: process.version,
      loadAverage: require('os').loadavg(),
      freeMemory: require('os').freemem(),
      totalMemory: require('os').totalmem(),
      cpuCount: require('os').cpus().length
    }
  };
  
  res.json(metrics);
});

module.exports = router;