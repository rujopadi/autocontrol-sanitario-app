/**
 * Application Performance Monitoring (APM) Service
 * Monitors system health, performance, and alerts
 */

const winston = require('winston');
const mongoose = require('mongoose');
const os = require('os');
const { AnalyticsService } = require('./analyticsService');

// System Metrics Schema
const SystemMetricsSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now, index: true },
  metrics: {
    // System metrics
    cpu: {
      usage: Number, // percentage
      loadAverage: [Number] // 1, 5, 15 minute averages
    },
    memory: {
      total: Number, // bytes
      used: Number, // bytes
      free: Number, // bytes
      usage: Number // percentage
    },
    disk: {
      total: Number, // bytes
      used: Number, // bytes
      free: Number, // bytes
      usage: Number // percentage
    },
    // Application metrics
    database: {
      connections: Number,
      responseTime: Number, // milliseconds
      activeQueries: Number
    },
    api: {
      requestsPerMinute: Number,
      averageResponseTime: Number, // milliseconds
      errorRate: Number, // percentage
      activeConnections: Number
    },
    // Business metrics
    business: {
      activeUsers: Number,
      activeOrganizations: Number,
      totalRecords: Number,
      recordsCreatedToday: Number
    }
  },
  alerts: [{
    type: String,
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
    message: String,
    value: Number,
    threshold: Number
  }]
}, { 
  timestamps: true,
  // TTL index to automatically delete old metrics after 30 days
  expireAfterSeconds: 30 * 24 * 60 * 60
});

SystemMetricsSchema.index({ timestamp: -1 });
const SystemMetrics = mongoose.model('SystemMetrics', SystemMetricsSchema);

class MonitoringService {
  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'logs/monitoring.log' }),
        new winston.transports.Console({ level: 'debug' })
      ]
    });

    this.thresholds = {
      cpu: { warning: 70, critical: 90 },
      memory: { warning: 80, critical: 95 },
      disk: { warning: 85, critical: 95 },
      responseTime: { warning: 1000, critical: 3000 }, // milliseconds
      errorRate: { warning: 5, critical: 10 }, // percentage
      dbResponseTime: { warning: 500, critical: 1000 } // milliseconds
    };

    this.isCollecting = false;
    this.collectionInterval = null;
  }

  /**
   * Start collecting system metrics
   */
  startMonitoring(intervalMs = 60000) { // Default: every minute
    if (this.isCollecting) {
      this.logger.warn('Monitoring already started');
      return;
    }

    this.isCollecting = true;
    this.logger.info('Starting system monitoring', { intervalMs });

    this.collectionInterval = setInterval(async () => {
      try {
        await this.collectMetrics();
      } catch (error) {
        this.logger.error('Error collecting metrics', { error: error.message });
      }
    }, intervalMs);

    // Collect initial metrics
    this.collectMetrics();
  }

  /**
   * Stop collecting system metrics
   */
  stopMonitoring() {
    if (!this.isCollecting) {
      return;
    }

    this.isCollecting = false;
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }

    this.logger.info('System monitoring stopped');
  }

  /**
   * Collect comprehensive system metrics
   */
  async collectMetrics() {
    try {
      const timestamp = new Date();
      const alerts = [];

      // Collect system metrics
      const systemMetrics = await this.getSystemMetrics();
      
      // Collect database metrics
      const databaseMetrics = await this.getDatabaseMetrics();
      
      // Collect API metrics
      const apiMetrics = await this.getAPIMetrics();
      
      // Collect business metrics
      const businessMetrics = await this.getBusinessMetrics();

      // Check thresholds and generate alerts
      this.checkThresholds(systemMetrics, alerts);
      this.checkThresholds(databaseMetrics, alerts);
      this.checkThresholds(apiMetrics, alerts);

      // Save metrics to database
      const metricsDoc = new SystemMetrics({
        timestamp,
        metrics: {
          cpu: systemMetrics.cpu,
          memory: systemMetrics.memory,
          disk: systemMetrics.disk,
          database: databaseMetrics,
          api: apiMetrics,
          business: businessMetrics
        },
        alerts
      });

      await metricsDoc.save();

      // Log critical alerts
      alerts.forEach(alert => {
        if (alert.severity === 'critical') {
          this.logger.error('Critical alert', alert);
        } else if (alert.severity === 'high') {
          this.logger.warn('High severity alert', alert);
        }
      });

      this.logger.debug('Metrics collected successfully', {
        timestamp,
        alertCount: alerts.length
      });

    } catch (error) {
      this.logger.error('Failed to collect metrics', { error: error.message });
      throw error;
    }
  }

  /**
   * Get system-level metrics (CPU, Memory, Disk)
   */
  async getSystemMetrics() {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    // Calculate CPU usage (simplified)
    const cpuUsage = await this.getCPUUsage();

    return {
      cpu: {
        usage: cpuUsage,
        loadAverage: os.loadavg()
      },
      memory: {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        usage: (usedMem / totalMem) * 100
      },
      disk: await this.getDiskUsage()
    };
  }

  /**
   * Get database performance metrics
   */
  async getDatabaseMetrics() {
    try {
      const startTime = Date.now();
      
      // Test database response time
      await mongoose.connection.db.admin().ping();
      const responseTime = Date.now() - startTime;

      // Get connection stats
      const stats = mongoose.connection.readyState;
      const connections = mongoose.connections.length;

      return {
        connections,
        responseTime,
        activeQueries: 0, // Would need to implement query tracking
        status: stats === 1 ? 'connected' : 'disconnected'
      };
    } catch (error) {
      this.logger.error('Database metrics collection failed', { error: error.message });
      return {
        connections: 0,
        responseTime: -1,
        activeQueries: 0,
        status: 'error'
      };
    }
  }

  /**
   * Get API performance metrics
   */
  async getAPIMetrics() {
    try {
      // Get recent API metrics from analytics
      const realtimeMetrics = await AnalyticsService.getRealTimeMetrics();
      
      return {
        requestsPerMinute: realtimeMetrics.systemHealth.totalRequests || 0,
        averageResponseTime: realtimeMetrics.systemHealth.avgResponseTime || 0,
        errorRate: realtimeMetrics.systemHealth.errorRate || 0,
        activeConnections: realtimeMetrics.activeUsers.activeUsers || 0
      };
    } catch (error) {
      this.logger.error('API metrics collection failed', { error: error.message });
      return {
        requestsPerMinute: 0,
        averageResponseTime: 0,
        errorRate: 0,
        activeConnections: 0
      };
    }
  }

  /**
   * Get business-level metrics
   */
  async getBusinessMetrics() {
    try {
      const User = require('../models/User');
      const Organization = require('../models/Organization');
      const DeliveryRecord = require('../models/DeliveryRecord');

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [
        activeUsers,
        activeOrganizations,
        totalRecords,
        recordsCreatedToday
      ] = await Promise.all([
        User.countDocuments({ isActive: true }),
        Organization.countDocuments({ isActive: true }),
        DeliveryRecord.countDocuments(),
        DeliveryRecord.countDocuments({ createdAt: { $gte: today } })
      ]);

      return {
        activeUsers,
        activeOrganizations,
        totalRecords,
        recordsCreatedToday
      };
    } catch (error) {
      this.logger.error('Business metrics collection failed', { error: error.message });
      return {
        activeUsers: 0,
        activeOrganizations: 0,
        totalRecords: 0,
        recordsCreatedToday: 0
      };
    }
  }

  /**
   * Check metrics against thresholds and generate alerts
   */
  checkThresholds(metrics, alerts) {
    // CPU usage check
    if (metrics.cpu && metrics.cpu.usage) {
      if (metrics.cpu.usage > this.thresholds.cpu.critical) {
        alerts.push({
          type: 'cpu_usage',
          severity: 'critical',
          message: `CPU usage is critically high: ${metrics.cpu.usage.toFixed(1)}%`,
          value: metrics.cpu.usage,
          threshold: this.thresholds.cpu.critical
        });
      } else if (metrics.cpu.usage > this.thresholds.cpu.warning) {
        alerts.push({
          type: 'cpu_usage',
          severity: 'high',
          message: `CPU usage is high: ${metrics.cpu.usage.toFixed(1)}%`,
          value: metrics.cpu.usage,
          threshold: this.thresholds.cpu.warning
        });
      }
    }

    // Memory usage check
    if (metrics.memory && metrics.memory.usage) {
      if (metrics.memory.usage > this.thresholds.memory.critical) {
        alerts.push({
          type: 'memory_usage',
          severity: 'critical',
          message: `Memory usage is critically high: ${metrics.memory.usage.toFixed(1)}%`,
          value: metrics.memory.usage,
          threshold: this.thresholds.memory.critical
        });
      } else if (metrics.memory.usage > this.thresholds.memory.warning) {
        alerts.push({
          type: 'memory_usage',
          severity: 'high',
          message: `Memory usage is high: ${metrics.memory.usage.toFixed(1)}%`,
          value: metrics.memory.usage,
          threshold: this.thresholds.memory.warning
        });
      }
    }

    // Database response time check
    if (metrics.responseTime !== undefined) {
      if (metrics.responseTime > this.thresholds.dbResponseTime.critical) {
        alerts.push({
          type: 'db_response_time',
          severity: 'critical',
          message: `Database response time is critically slow: ${metrics.responseTime}ms`,
          value: metrics.responseTime,
          threshold: this.thresholds.dbResponseTime.critical
        });
      } else if (metrics.responseTime > this.thresholds.dbResponseTime.warning) {
        alerts.push({
          type: 'db_response_time',
          severity: 'medium',
          message: `Database response time is slow: ${metrics.responseTime}ms`,
          value: metrics.responseTime,
          threshold: this.thresholds.dbResponseTime.warning
        });
      }
    }

    // API error rate check
    if (metrics.errorRate !== undefined) {
      if (metrics.errorRate > this.thresholds.errorRate.critical) {
        alerts.push({
          type: 'api_error_rate',
          severity: 'critical',
          message: `API error rate is critically high: ${metrics.errorRate.toFixed(1)}%`,
          value: metrics.errorRate,
          threshold: this.thresholds.errorRate.critical
        });
      } else if (metrics.errorRate > this.thresholds.errorRate.warning) {
        alerts.push({
          type: 'api_error_rate',
          severity: 'high',
          message: `API error rate is high: ${metrics.errorRate.toFixed(1)}%`,
          value: metrics.errorRate,
          threshold: this.thresholds.errorRate.warning
        });
      }
    }
  }

  /**
   * Get recent system health status
   */
  async getHealthStatus() {
    try {
      const recentMetrics = await SystemMetrics.findOne()
        .sort({ timestamp: -1 })
        .limit(1);

      if (!recentMetrics) {
        return {
          status: 'unknown',
          message: 'No metrics available',
          timestamp: new Date()
        };
      }

      const criticalAlerts = recentMetrics.alerts.filter(a => a.severity === 'critical');
      const highAlerts = recentMetrics.alerts.filter(a => a.severity === 'high');

      let status = 'healthy';
      let message = 'All systems operational';

      if (criticalAlerts.length > 0) {
        status = 'critical';
        message = `${criticalAlerts.length} critical issue(s) detected`;
      } else if (highAlerts.length > 0) {
        status = 'warning';
        message = `${highAlerts.length} warning(s) detected`;
      }

      return {
        status,
        message,
        timestamp: recentMetrics.timestamp,
        metrics: recentMetrics.metrics,
        alerts: recentMetrics.alerts
      };
    } catch (error) {
      this.logger.error('Failed to get health status', { error: error.message });
      return {
        status: 'error',
        message: 'Unable to determine system health',
        timestamp: new Date()
      };
    }
  }

  /**
   * Get historical metrics
   */
  async getHistoricalMetrics(timeRange = '24h') {
    try {
      const startDate = this.getStartDate(timeRange);
      
      const metrics = await SystemMetrics.find({
        timestamp: { $gte: startDate }
      }).sort({ timestamp: 1 });

      return {
        timeRange,
        dataPoints: metrics.length,
        metrics,
        generatedAt: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to get historical metrics', { error: error.message });
      throw error;
    }
  }

  /**
   * Helper methods
   */
  async getCPUUsage() {
    return new Promise((resolve) => {
      const startMeasure = this.cpuAverage();
      
      setTimeout(() => {
        const endMeasure = this.cpuAverage();
        const idleDifference = endMeasure.idle - startMeasure.idle;
        const totalDifference = endMeasure.total - startMeasure.total;
        const percentageCPU = 100 - ~~(100 * idleDifference / totalDifference);
        resolve(percentageCPU);
      }, 100);
    });
  }

  cpuAverage() {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (let type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });

    return {
      idle: totalIdle / cpus.length,
      total: totalTick / cpus.length
    };
  }

  async getDiskUsage() {
    // Simplified disk usage - in production, use a proper disk usage library
    return {
      total: 100 * 1024 * 1024 * 1024, // 100GB placeholder
      used: 50 * 1024 * 1024 * 1024,   // 50GB placeholder
      free: 50 * 1024 * 1024 * 1024,   // 50GB placeholder
      usage: 50 // 50% placeholder
    };
  }

  getStartDate(timeRange) {
    const now = new Date();
    const ranges = {
      '1h': 1 * 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };
    
    const ms = ranges[timeRange] || ranges['24h'];
    return new Date(now.getTime() - ms);
  }
}

module.exports = {
  MonitoringService: new MonitoringService(),
  SystemMetrics
};