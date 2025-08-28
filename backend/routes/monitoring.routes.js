/**
 * Monitoring Routes
 * Provides endpoints for system health and performance monitoring
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth-simple');
const { MonitoringService } = require('../services/monitoringService');
const { trackFeatureUsage } = require('../middleware/analytics');

// Middleware to ensure user has admin access for monitoring
const requireMonitoringAccess = (req, res, next) => {
  if (!req.user || (req.user.role !== 'Admin' && !req.user.isAdmin)) {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requieren permisos de administrador.'
    });
  }
  next();
};

/**
 * @route   GET /api/monitoring/health
 * @desc    Get current system health status
 * @access  Private (Admin only)
 */
router.get('/health', 
  auth, 
  requireMonitoringAccess,
  trackFeatureUsage('monitoring_health'),
  async (req, res) => {
    try {
      const healthStatus = await MonitoringService.getHealthStatus();

      res.json({
        success: true,
        data: healthStatus
      });
    } catch (error) {
      console.error('Health status error:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estado de salud del sistema'
      });
    }
  }
);

/**
 * @route   GET /api/monitoring/metrics
 * @desc    Get historical system metrics
 * @access  Private (Admin only)
 */
router.get('/metrics', 
  auth, 
  requireMonitoringAccess,
  trackFeatureUsage('monitoring_metrics'),
  async (req, res) => {
    try {
      const { timeRange = '24h' } = req.query;
      
      const metrics = await MonitoringService.getHistoricalMetrics(timeRange);

      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error('Historical metrics error:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener métricas históricas'
      });
    }
  }
);

/**
 * @route   GET /api/monitoring/alerts
 * @desc    Get recent system alerts
 * @access  Private (Admin only)
 */
router.get('/alerts', 
  auth, 
  requireMonitoringAccess,
  trackFeatureUsage('monitoring_alerts'),
  async (req, res) => {
    try {
      const { limit = 50, severity } = req.query;
      const { SystemMetrics } = require('../services/monitoringService');

      // Build query
      const query = {};
      if (severity) {
        query['alerts.severity'] = severity;
      }

      const recentMetrics = await SystemMetrics.find(query)
        .sort({ timestamp: -1 })
        .limit(parseInt(limit));

      // Extract and flatten alerts
      const alerts = [];
      recentMetrics.forEach(metric => {
        metric.alerts.forEach(alert => {
          alerts.push({
            ...alert.toObject(),
            timestamp: metric.timestamp,
            metricId: metric._id
          });
        });
      });

      // Sort alerts by timestamp (most recent first)
      alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      res.json({
        success: true,
        data: {
          alerts: alerts.slice(0, parseInt(limit)),
          totalCount: alerts.length,
          generatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Alerts retrieval error:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener alertas del sistema'
      });
    }
  }
);

/**
 * @route   GET /api/monitoring/dashboard
 * @desc    Get monitoring dashboard data
 * @access  Private (Admin only)
 */
router.get('/dashboard', 
  auth, 
  requireMonitoringAccess,
  trackFeatureUsage('monitoring_dashboard'),
  async (req, res) => {
    try {
      const [
        healthStatus,
        recentMetrics
      ] = await Promise.all([
        MonitoringService.getHealthStatus(),
        MonitoringService.getHistoricalMetrics('6h')
      ]);

      // Calculate summary statistics
      const metrics = recentMetrics.metrics;
      const summary = {
        totalDataPoints: metrics.length,
        timeRange: '6h',
        averages: {
          cpuUsage: 0,
          memoryUsage: 0,
          responseTime: 0,
          errorRate: 0
        },
        trends: {
          cpu: 'stable',
          memory: 'stable',
          responseTime: 'stable',
          errors: 'stable'
        }
      };

      if (metrics.length > 0) {
        // Calculate averages
        const totals = metrics.reduce((acc, metric) => {
          acc.cpu += metric.metrics.cpu?.usage || 0;
          acc.memory += metric.metrics.memory?.usage || 0;
          acc.responseTime += metric.metrics.database?.responseTime || 0;
          acc.errorRate += metric.metrics.api?.errorRate || 0;
          return acc;
        }, { cpu: 0, memory: 0, responseTime: 0, errorRate: 0 });

        summary.averages = {
          cpuUsage: (totals.cpu / metrics.length).toFixed(1),
          memoryUsage: (totals.memory / metrics.length).toFixed(1),
          responseTime: (totals.responseTime / metrics.length).toFixed(0),
          errorRate: (totals.errorRate / metrics.length).toFixed(2)
        };

        // Calculate trends (simplified)
        if (metrics.length >= 2) {
          const recent = metrics.slice(-5); // Last 5 data points
          const older = metrics.slice(-10, -5); // Previous 5 data points
          
          if (recent.length > 0 && older.length > 0) {
            const recentAvg = recent.reduce((sum, m) => sum + (m.metrics.cpu?.usage || 0), 0) / recent.length;
            const olderAvg = older.reduce((sum, m) => sum + (m.metrics.cpu?.usage || 0), 0) / older.length;
            
            summary.trends.cpu = recentAvg > olderAvg + 5 ? 'increasing' : 
                                recentAvg < olderAvg - 5 ? 'decreasing' : 'stable';
          }
        }
      }

      res.json({
        success: true,
        data: {
          healthStatus,
          summary,
          recentMetrics: metrics.slice(-20), // Last 20 data points for charts
          generatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Monitoring dashboard error:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener dashboard de monitoreo'
      });
    }
  }
);

/**
 * @route   POST /api/monitoring/start
 * @desc    Start system monitoring
 * @access  Private (Admin only)
 */
router.post('/start', 
  auth, 
  requireMonitoringAccess,
  trackFeatureUsage('monitoring_start'),
  async (req, res) => {
    try {
      const { interval = 60000 } = req.body; // Default: 1 minute

      MonitoringService.startMonitoring(interval);

      res.json({
        success: true,
        message: 'Monitoreo del sistema iniciado',
        data: {
          interval,
          startedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Start monitoring error:', error);
      res.status(500).json({
        success: false,
        message: 'Error al iniciar monitoreo del sistema'
      });
    }
  }
);

/**
 * @route   POST /api/monitoring/stop
 * @desc    Stop system monitoring
 * @access  Private (Admin only)
 */
router.post('/stop', 
  auth, 
  requireMonitoringAccess,
  trackFeatureUsage('monitoring_stop'),
  async (req, res) => {
    try {
      MonitoringService.stopMonitoring();

      res.json({
        success: true,
        message: 'Monitoreo del sistema detenido',
        data: {
          stoppedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Stop monitoring error:', error);
      res.status(500).json({
        success: false,
        message: 'Error al detener monitoreo del sistema'
      });
    }
  }
);

/**
 * @route   GET /api/monitoring/status
 * @desc    Get monitoring service status
 * @access  Private (Admin only)
 */
router.get('/status', 
  auth, 
  requireMonitoringAccess,
  async (req, res) => {
    try {
      res.json({
        success: true,
        data: {
          isCollecting: MonitoringService.isCollecting,
          status: MonitoringService.isCollecting ? 'running' : 'stopped',
          checkedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Monitoring status error:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estado del monitoreo'
      });
    }
  }
);

module.exports = router;