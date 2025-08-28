#!/usr/bin/env node
/**
 * Database Monitoring Setup Script
 * Configures monitoring and alerting for database performance
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Database monitoring configuration
 */
const MONITORING_CONFIG = {
  // Performance thresholds
  thresholds: {
    connectionCount: 80, // Max connections percentage
    responseTime: 1000, // Max response time in ms
    diskUsage: 85, // Max disk usage percentage
    memoryUsage: 90, // Max memory usage percentage
    cpuUsage: 80, // Max CPU usage percentage
    replicationLag: 5000 // Max replication lag in ms
  },
  
  // Monitoring intervals
  intervals: {
    performance: 30000, // 30 seconds
    connections: 60000, // 1 minute
    diskSpace: 300000, // 5 minutes
    slowQueries: 60000 // 1 minute
  },
  
  // Alert configuration
  alerts: {
    email: {
      enabled: process.env.DB_ALERTS_EMAIL_ENABLED === 'true',
      recipients: process.env.DB_ALERTS_EMAIL_RECIPIENTS?.split(',') || [],
      smtp: {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      }
    },
    webhook: {
      enabled: process.env.DB_ALERTS_WEBHOOK_ENABLED === 'true',
      url: process.env.DB_ALERTS_WEBHOOK_URL,
      timeout: 5000
    }
  }
};

/**
 * Database monitoring service
 */
class DatabaseMonitor {
  constructor() {
    this.isRunning = false;
    this.intervals = {};
    this.metrics = new Map();
    this.alerts = [];
  }

  /**
   * Start monitoring
   */
  async start() {
    if (this.isRunning) {
      console.log('Database monitoring is already running');
      return;
    }

    console.log('🚀 Starting database monitoring...');
    
    try {
      // Connect to database
      await this.connectToDatabase();
      
      // Setup monitoring intervals
      this.setupMonitoringIntervals();
      
      // Setup alert handlers
      this.setupAlertHandlers();
      
      this.isRunning = true;
      console.log('✅ Database monitoring started successfully');
      
    } catch (error) {
      console.error('❌ Error starting database monitoring:', error);
      throw error;
    }
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('🛑 Stopping database monitoring...');
    
    // Clear all intervals
    Object.values(this.intervals).forEach(interval => {
      clearInterval(interval);
    });
    
    this.intervals = {};
    this.isRunning = false;
    
    console.log('✅ Database monitoring stopped');
  }

  /**
   * Connect to database
   */
  async connectToDatabase() {
    if (mongoose.connection.readyState === 1) {
      return; // Already connected
    }

    const options = {
      maxPoolSize: 5, // Smaller pool for monitoring
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferMaxEntries: 0
    };

    await mongoose.connect(process.env.MONGODB_URI, options);
    console.log('✅ Connected to database for monitoring');
  }

  /**
   * Setup monitoring intervals
   */
  setupMonitoringIntervals() {
    // Performance monitoring
    this.intervals.performance = setInterval(
      () => this.collectPerformanceMetrics(),
      MONITORING_CONFIG.intervals.performance
    );

    // Connection monitoring
    this.intervals.connections = setInterval(
      () => this.collectConnectionMetrics(),
      MONITORING_CONFIG.intervals.connections
    );

    // Disk space monitoring
    this.intervals.diskSpace = setInterval(
      () => this.collectDiskMetrics(),
      MONITORING_CONFIG.intervals.diskSpace
    );

    // Slow query monitoring
    this.intervals.slowQueries = setInterval(
      () => this.collectSlowQueryMetrics(),
      MONITORING_CONFIG.intervals.slowQueries
    );

    console.log('✅ Monitoring intervals configured');
  }

  /**
   * Collect performance metrics
   */
  async collectPerformanceMetrics() {
    try {
      const db = mongoose.connection.db;
      const admin = db.admin();
      
      // Get server status
      const serverStatus = await admin.serverStatus();
      
      const metrics = {
        timestamp: new Date(),
        type: 'performance',
        data: {
          connections: {
            current: serverStatus.connections.current,
            available: serverStatus.connections.available,
            totalCreated: serverStatus.connections.totalCreated
          },
          memory: {
            resident: serverStatus.mem.resident,
            virtual: serverStatus.mem.virtual,
            mapped: serverStatus.mem.mapped || 0
          },
          network: {
            bytesIn: serverStatus.network.bytesIn,
            bytesOut: serverStatus.network.bytesOut,
            numRequests: serverStatus.network.numRequests
          },
          opcounters: serverStatus.opcounters,
          uptime: serverStatus.uptime
        }
      };

      // Store metrics
      await this.storeMetrics(metrics);
      
      // Check thresholds
      await this.checkPerformanceThresholds(metrics.data);
      
    } catch (error) {
      logger.error('Error collecting performance metrics:', error);
    }
  }

  /**
   * Collect connection metrics
   */
  async collectConnectionMetrics() {
    try {
      const db = mongoose.connection.db;
      
      // Get current connections
      const result = await db.admin().command({ currentOp: 1 });
      const activeConnections = result.inprog.length;
      
      const metrics = {
        timestamp: new Date(),
        type: 'connections',
        data: {
          active: activeConnections,
          poolSize: mongoose.connection.db.serverConfig?.s?.pool?.size || 0
        }
      };

      await this.storeMetrics(metrics);
      
      // Check connection thresholds
      const connectionUsage = (activeConnections / 100) * 100; // Assuming max 100 connections
      if (connectionUsage > MONITORING_CONFIG.thresholds.connectionCount) {
        await this.triggerAlert('high_connection_usage', {
          current: activeConnections,
          threshold: MONITORING_CONFIG.thresholds.connectionCount,
          usage: connectionUsage
        });
      }
      
    } catch (error) {
      logger.error('Error collecting connection metrics:', error);
    }
  }

  /**
   * Collect disk metrics
   */
  async collectDiskMetrics() {
    try {
      const db = mongoose.connection.db;
      
      // Get database stats
      const stats = await db.stats();
      
      const metrics = {
        timestamp: new Date(),
        type: 'disk',
        data: {
          dataSize: stats.dataSize,
          storageSize: stats.storageSize,
          indexSize: stats.indexSize,
          totalSize: stats.dataSize + stats.indexSize,
          collections: stats.collections,
          objects: stats.objects
        }
      };

      await this.storeMetrics(metrics);
      
    } catch (error) {
      logger.error('Error collecting disk metrics:', error);
    }
  }

  /**
   * Collect slow query metrics
   */
  async collectSlowQueryMetrics() {
    try {
      const db = mongoose.connection.db;
      
      // Get profiling data (if enabled)
      const profilingData = await db.collection('system.profile')
        .find({ ts: { $gte: new Date(Date.now() - 60000) } }) // Last minute
        .sort({ ts: -1 })
        .limit(100)
        .toArray();

      if (profilingData.length > 0) {
        const slowQueries = profilingData.filter(
          query => query.millis > MONITORING_CONFIG.thresholds.responseTime
        );

        if (slowQueries.length > 0) {
          const metrics = {
            timestamp: new Date(),
            type: 'slow_queries',
            data: {
              count: slowQueries.length,
              queries: slowQueries.map(q => ({
                duration: q.millis,
                namespace: q.ns,
                command: q.command,
                timestamp: q.ts
              }))
            }
          };

          await this.storeMetrics(metrics);
          
          // Alert on slow queries
          await this.triggerAlert('slow_queries_detected', {
            count: slowQueries.length,
            threshold: MONITORING_CONFIG.thresholds.responseTime
          });
        }
      }
      
    } catch (error) {
      // Profiling might not be enabled, which is normal
      if (!error.message.includes('not found')) {
        logger.error('Error collecting slow query metrics:', error);
      }
    }
  }

  /**
   * Store metrics in database
   */
  async storeMetrics(metrics) {
    try {
      const db = mongoose.connection.db;
      await db.collection('db_metrics').insertOne(metrics);
      
      // Keep only recent metrics (last 24 hours)
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      await db.collection('db_metrics').deleteMany({
        timestamp: { $lt: cutoff }
      });
      
    } catch (error) {
      logger.error('Error storing metrics:', error);
    }
  }

  /**
   * Check performance thresholds
   */
  async checkPerformanceThresholds(data) {
    const alerts = [];

    // Check memory usage
    if (data.memory.resident > MONITORING_CONFIG.thresholds.memoryUsage) {
      alerts.push({
        type: 'high_memory_usage',
        data: {
          current: data.memory.resident,
          threshold: MONITORING_CONFIG.thresholds.memoryUsage
        }
      });
    }

    // Trigger alerts
    for (const alert of alerts) {
      await this.triggerAlert(alert.type, alert.data);
    }
  }

  /**
   * Trigger alert
   */
  async triggerAlert(type, data) {
    const alert = {
      id: `${type}_${Date.now()}`,
      type,
      timestamp: new Date(),
      data,
      severity: this.getAlertSeverity(type)
    };

    this.alerts.push(alert);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    logger.warn(`Database alert triggered: ${type}`, alert);

    // Send notifications
    await this.sendAlertNotifications(alert);
  }

  /**
   * Get alert severity
   */
  getAlertSeverity(type) {
    const severityMap = {
      high_connection_usage: 'warning',
      high_memory_usage: 'warning',
      slow_queries_detected: 'warning',
      database_down: 'critical',
      replication_lag: 'warning'
    };

    return severityMap[type] || 'info';
  }

  /**
   * Send alert notifications
   */
  async sendAlertNotifications(alert) {
    // Email notifications
    if (MONITORING_CONFIG.alerts.email.enabled) {
      await this.sendEmailAlert(alert);
    }

    // Webhook notifications
    if (MONITORING_CONFIG.alerts.webhook.enabled) {
      await this.sendWebhookAlert(alert);
    }
  }

  /**
   * Send email alert
   */
  async sendEmailAlert(alert) {
    try {
      const nodemailer = require('nodemailer');
      
      const transporter = nodemailer.createTransporter(
        MONITORING_CONFIG.alerts.email.smtp
      );

      const subject = `Database Alert: ${alert.type}`;
      const text = `
Database Alert Triggered

Type: ${alert.type}
Severity: ${alert.severity}
Timestamp: ${alert.timestamp}
Data: ${JSON.stringify(alert.data, null, 2)}

Please check the database monitoring dashboard for more details.
      `;

      await transporter.sendMail({
        from: MONITORING_CONFIG.alerts.email.smtp.auth.user,
        to: MONITORING_CONFIG.alerts.email.recipients.join(','),
        subject,
        text
      });

      logger.info(`Email alert sent for ${alert.type}`);
      
    } catch (error) {
      logger.error('Error sending email alert:', error);
    }
  }

  /**
   * Send webhook alert
   */
  async sendWebhookAlert(alert) {
    try {
      const axios = require('axios');
      
      await axios.post(
        MONITORING_CONFIG.alerts.webhook.url,
        {
          alert_type: alert.type,
          severity: alert.severity,
          timestamp: alert.timestamp,
          data: alert.data
        },
        {
          timeout: MONITORING_CONFIG.alerts.webhook.timeout,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'AutoControl-DB-Monitor/1.0'
          }
        }
      );

      logger.info(`Webhook alert sent for ${alert.type}`);
      
    } catch (error) {
      logger.error('Error sending webhook alert:', error);
    }
  }

  /**
   * Get monitoring status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      intervals: Object.keys(this.intervals),
      recentAlerts: this.alerts.slice(-10),
      config: MONITORING_CONFIG
    };
  }

  /**
   * Get recent metrics
   */
  async getRecentMetrics(type = null, limit = 50) {
    try {
      const db = mongoose.connection.db;
      const query = type ? { type } : {};
      
      const metrics = await db.collection('db_metrics')
        .find(query)
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();

      return metrics;
      
    } catch (error) {
      logger.error('Error getting recent metrics:', error);
      return [];
    }
  }
}

/**
 * Setup database monitoring
 */
async function setupDatabaseMonitoring() {
  try {
    console.log('🔧 Setting up database monitoring...');
    
    // Create monitoring instance
    const monitor = new DatabaseMonitor();
    
    // Start monitoring
    await monitor.start();
    
    // Setup graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down database monitoring...');
      monitor.stop();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 Shutting down database monitoring...');
      monitor.stop();
      process.exit(0);
    });

    console.log('✅ Database monitoring setup completed');
    
    // Keep process running
    setInterval(() => {
      const status = monitor.getStatus();
      console.log(`📊 Monitoring status: ${status.isRunning ? 'Running' : 'Stopped'} - Recent alerts: ${status.recentAlerts.length}`);
    }, 300000); // Log status every 5 minutes
    
  } catch (error) {
    console.error('❌ Error setting up database monitoring:', error);
    process.exit(1);
  }
}

// Run setup if called directly
if (require.main === module) {
  setupDatabaseMonitoring();
}

module.exports = {
  DatabaseMonitor,
  setupDatabaseMonitoring,
  MONITORING_CONFIG
};