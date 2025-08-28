/**
 * Analytics Routes
 * Provides endpoints for accessing analytics data and metrics
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth-simple');
const { AnalyticsService } = require('../services/analyticsService');
const { trackFeatureUsage } = require('../middleware/analytics');

// Middleware to ensure user has admin access for analytics
const requireAnalyticsAccess = (req, res, next) => {
  if (!req.user || (req.user.role !== 'Admin' && !req.user.isAdmin)) {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requieren permisos de administrador.'
    });
  }
  next();
};

/**
 * @route   GET /api/analytics/organization
 * @desc    Get analytics for the current organization
 * @access  Private (Admin only)
 */
router.get('/organization', 
  auth, 
  requireAnalyticsAccess,
  trackFeatureUsage('analytics_view', { data: { type: 'organization' } }),
  async (req, res) => {
    try {
      const { timeRange = '30d' } = req.query;
      const organizationId = req.user.organizationId;

      const analytics = await AnalyticsService.getOrganizationAnalytics(
        organizationId, 
        timeRange
      );

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('Organization analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener análisis de la organización'
      });
    }
  }
);

/**
 * @route   GET /api/analytics/user/:userId?
 * @desc    Get analytics for a specific user or current user
 * @access  Private (Admin or own user)
 */
router.get('/user/:userId?', 
  auth,
  trackFeatureUsage('analytics_view', { data: { type: 'user' } }),
  async (req, res) => {
    try {
      const { timeRange = '30d' } = req.query;
      const targetUserId = req.params.userId || req.user.id;

      // Check if user can access this data
      if (targetUserId !== req.user.id && req.user.role !== 'Admin' && !req.user.isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Acceso denegado. Solo puedes ver tus propios análisis.'
        });
      }

      const analytics = await AnalyticsService.getUserAnalytics(
        targetUserId, 
        timeRange
      );

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('User analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener análisis del usuario'
      });
    }
  }
);

/**
 * @route   GET /api/analytics/dashboard
 * @desc    Get dashboard metrics for organization
 * @access  Private (Admin only)
 */
router.get('/dashboard', 
  auth, 
  requireAnalyticsAccess,
  trackFeatureUsage('analytics_dashboard'),
  async (req, res) => {
    try {
      const { timeRange = '30d' } = req.query;
      const organizationId = req.user.organizationId;

      // Get multiple analytics in parallel
      const [
        organizationAnalytics,
        realTimeMetrics
      ] = await Promise.all([
        AnalyticsService.getOrganizationAnalytics(organizationId, timeRange),
        AnalyticsService.getRealTimeMetrics()
      ]);

      // Calculate key metrics
      const totalEvents = organizationAnalytics.analytics.reduce(
        (sum, item) => sum + item.totalEvents, 0
      );

      const activeFeatures = organizationAnalytics.analytics.length;

      res.json({
        success: true,
        data: {
          summary: {
            totalEvents,
            activeFeatures,
            timeRange
          },
          organizationAnalytics,
          realTimeMetrics,
          generatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Dashboard analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener métricas del dashboard'
      });
    }
  }
);

/**
 * @route   GET /api/analytics/realtime
 * @desc    Get real-time system metrics
 * @access  Private (Admin only)
 */
router.get('/realtime', 
  auth, 
  requireAnalyticsAccess,
  async (req, res) => {
    try {
      const metrics = await AnalyticsService.getRealTimeMetrics();

      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error('Real-time metrics error:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener métricas en tiempo real'
      });
    }
  }
);

/**
 * @route   GET /api/analytics/export
 * @desc    Export analytics data
 * @access  Private (Admin only)
 */
router.get('/export', 
  auth, 
  requireAnalyticsAccess,
  trackFeatureUsage('analytics_export'),
  async (req, res) => {
    try {
      const { timeRange = '30d', format = 'json' } = req.query;
      const organizationId = req.user.organizationId;

      const analytics = await AnalyticsService.getOrganizationAnalytics(
        organizationId, 
        timeRange
      );

      if (format === 'csv') {
        // Convert to CSV format
        const csvData = this.convertToCSV(analytics);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="analytics-${timeRange}.csv"`);
        res.send(csvData);
      } else {
        // JSON format
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="analytics-${timeRange}.json"`);
        res.json({
          success: true,
          data: analytics,
          exportedAt: new Date()
        });
      }
    } catch (error) {
      console.error('Analytics export error:', error);
      res.status(500).json({
        success: false,
        message: 'Error al exportar análisis'
      });
    }
  }
);

/**
 * @route   POST /api/analytics/track
 * @desc    Manually track a custom event
 * @access  Private
 */
router.post('/track', 
  auth,
  async (req, res) => {
    try {
      const { eventType, data = {} } = req.body;

      if (!eventType) {
        return res.status(400).json({
          success: false,
          message: 'Tipo de evento requerido'
        });
      }

      const eventData = {
        organizationId: req.user.organizationId,
        userId: req.user.id || req.user.userId,
        eventType,
        data,
        metadata: {
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip || req.connection.remoteAddress,
          endpoint: req.originalUrl,
          method: req.method
        }
      };

      const event = await AnalyticsService.trackEvent(eventData);

      res.json({
        success: true,
        message: 'Evento registrado exitosamente',
        data: {
          eventId: event._id,
          timestamp: event.createdAt
        }
      });
    } catch (error) {
      console.error('Manual event tracking error:', error);
      res.status(500).json({
        success: false,
        message: 'Error al registrar evento'
      });
    }
  }
);

/**
 * Helper method to convert analytics data to CSV
 */
function convertToCSV(analytics) {
  const headers = ['Event Type', 'Date', 'Count', 'Avg Duration', 'Unique Users'];
  const rows = [headers.join(',')];

  analytics.analytics.forEach(eventGroup => {
    eventGroup.dailyStats.forEach(stat => {
      const row = [
        eventGroup._id,
        stat.date,
        stat.count,
        Math.round(stat.avgDuration || 0),
        stat.uniqueUsers
      ];
      rows.push(row.join(','));
    });
  });

  return rows.join('\n');
}

module.exports = router;