/**
 * Analytics Service
 * Handles user analytics, usage tracking, and business metrics
 */

const mongoose = require('mongoose');
const winston = require('winston');

// Analytics Event Schema
const AnalyticsEventSchema = new mongoose.Schema({
  organizationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Organization', 
    required: true,
    index: true 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  eventType: { 
    type: String, 
    required: true,
    enum: [
      'user_login', 'user_logout', 'user_register',
      'record_create', 'record_update', 'record_delete', 'record_view',
      'organization_create', 'organization_update',
      'user_invite', 'user_activate', 'user_deactivate',
      'api_call', 'error_occurred', 'feature_used'
    ],
    index: true
  },
  eventData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  metadata: {
    userAgent: String,
    ipAddress: String,
    sessionId: String,
    referrer: String,
    timestamp: { type: Date, default: Date.now, index: true }
  },
  metrics: {
    duration: Number, // milliseconds
    responseSize: Number, // bytes
    statusCode: Number
  }
}, { 
  timestamps: true,
  // TTL index to automatically delete old events after 90 days
  expireAfterSeconds: 90 * 24 * 60 * 60
});

// Compound indexes for efficient queries
AnalyticsEventSchema.index({ organizationId: 1, eventType: 1, createdAt: -1 });
AnalyticsEventSchema.index({ userId: 1, eventType: 1, createdAt: -1 });
AnalyticsEventSchema.index({ createdAt: -1, eventType: 1 });

const AnalyticsEvent = mongoose.model('AnalyticsEvent', AnalyticsEventSchema);

class AnalyticsService {
  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'logs/analytics.log' }),
        new winston.transports.Console({ level: 'debug' })
      ]
    });
  }

  /**
   * Track an analytics event
   */
  async trackEvent(eventData) {
    try {
      const {
        organizationId,
        userId,
        eventType,
        data = {},
        metadata = {},
        metrics = {}
      } = eventData;

      const event = new AnalyticsEvent({
        organizationId,
        userId,
        eventType,
        eventData: data,
        metadata: {
          ...metadata,
          timestamp: new Date()
        },
        metrics
      });

      await event.save();
      
      this.logger.info('Analytics event tracked', {
        organizationId,
        userId,
        eventType,
        timestamp: event.metadata.timestamp
      });

      return event;
    } catch (error) {
      this.logger.error('Failed to track analytics event', {
        error: error.message,
        eventData
      });
      throw error;
    }
  }

  /**
   * Get usage analytics for an organization
   */
  async getOrganizationAnalytics(organizationId, timeRange = '30d') {
    try {
      const startDate = this.getStartDate(timeRange);
      
      const pipeline = [
        {
          $match: {
            organizationId: new mongoose.Types.ObjectId(organizationId),
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              eventType: '$eventType',
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
            },
            count: { $sum: 1 },
            avgDuration: { $avg: '$metrics.duration' },
            totalUsers: { $addToSet: '$userId' }
          }
        },
        {
          $group: {
            _id: '$_id.eventType',
            dailyStats: {
              $push: {
                date: '$_id.date',
                count: '$count',
                avgDuration: '$avgDuration',
                uniqueUsers: { $size: '$totalUsers' }
              }
            },
            totalEvents: { $sum: '$count' },
            avgDuration: { $avg: '$avgDuration' }
          }
        }
      ];

      const results = await AnalyticsEvent.aggregate(pipeline);
      
      return {
        organizationId,
        timeRange,
        analytics: results,
        generatedAt: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to get organization analytics', {
        error: error.message,
        organizationId,
        timeRange
      });
      throw error;
    }
  }

  /**
   * Get user activity analytics
   */
  async getUserAnalytics(userId, timeRange = '30d') {
    try {
      const startDate = this.getStartDate(timeRange);
      
      const pipeline = [
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              eventType: '$eventType',
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
            },
            count: { $sum: 1 },
            avgDuration: { $avg: '$metrics.duration' }
          }
        },
        {
          $group: {
            _id: '$_id.eventType',
            dailyActivity: {
              $push: {
                date: '$_id.date',
                count: '$count',
                avgDuration: '$avgDuration'
              }
            },
            totalEvents: { $sum: '$count' }
          }
        }
      ];

      const results = await AnalyticsEvent.aggregate(pipeline);
      
      return {
        userId,
        timeRange,
        activity: results,
        generatedAt: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to get user analytics', {
        error: error.message,
        userId,
        timeRange
      });
      throw error;
    }
  }

  /**
   * Get system-wide analytics
   */
  async getSystemAnalytics(timeRange = '30d') {
    try {
      const startDate = this.getStartDate(timeRange);
      
      const [
        eventStats,
        organizationStats,
        userStats,
        errorStats
      ] = await Promise.all([
        // Event statistics
        AnalyticsEvent.aggregate([
          { $match: { createdAt: { $gte: startDate } } },
          {
            $group: {
              _id: '$eventType',
              count: { $sum: 1 },
              avgDuration: { $avg: '$metrics.duration' },
              uniqueOrganizations: { $addToSet: '$organizationId' },
              uniqueUsers: { $addToSet: '$userId' }
            }
          },
          {
            $project: {
              eventType: '$_id',
              count: 1,
              avgDuration: 1,
              uniqueOrganizations: { $size: '$uniqueOrganizations' },
              uniqueUsers: { $size: '$uniqueUsers' }
            }
          }
        ]),
        
        // Organization statistics
        AnalyticsEvent.aggregate([
          { $match: { createdAt: { $gte: startDate } } },
          {
            $group: {
              _id: '$organizationId',
              totalEvents: { $sum: 1 },
              uniqueUsers: { $addToSet: '$userId' },
              eventTypes: { $addToSet: '$eventType' }
            }
          },
          {
            $group: {
              _id: null,
              totalOrganizations: { $sum: 1 },
              avgEventsPerOrg: { $avg: '$totalEvents' },
              avgUsersPerOrg: { $avg: { $size: '$uniqueUsers' } }
            }
          }
        ]),
        
        // User statistics
        AnalyticsEvent.aggregate([
          { $match: { createdAt: { $gte: startDate } } },
          {
            $group: {
              _id: '$userId',
              totalEvents: { $sum: 1 },
              eventTypes: { $addToSet: '$eventType' },
              lastActivity: { $max: '$createdAt' }
            }
          },
          {
            $group: {
              _id: null,
              totalActiveUsers: { $sum: 1 },
              avgEventsPerUser: { $avg: '$totalEvents' }
            }
          }
        ]),
        
        // Error statistics
        AnalyticsEvent.aggregate([
          { 
            $match: { 
              createdAt: { $gte: startDate },
              eventType: 'error_occurred'
            } 
          },
          {
            $group: {
              _id: '$eventData.errorType',
              count: { $sum: 1 },
              organizations: { $addToSet: '$organizationId' }
            }
          }
        ])
      ]);

      return {
        timeRange,
        events: eventStats,
        organizations: organizationStats[0] || {},
        users: userStats[0] || {},
        errors: errorStats,
        generatedAt: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to get system analytics', {
        error: error.message,
        timeRange
      });
      throw error;
    }
  }

  /**
   * Get real-time metrics
   */
  async getRealTimeMetrics() {
    try {
      const last5Minutes = new Date(Date.now() - 5 * 60 * 1000);
      const last1Hour = new Date(Date.now() - 60 * 60 * 1000);
      
      const [
        recentActivity,
        activeUsers,
        systemHealth
      ] = await Promise.all([
        // Recent activity (last 5 minutes)
        AnalyticsEvent.aggregate([
          { $match: { createdAt: { $gte: last5Minutes } } },
          {
            $group: {
              _id: '$eventType',
              count: { $sum: 1 },
              avgResponseTime: { $avg: '$metrics.duration' }
            }
          }
        ]),
        
        // Active users (last hour)
        AnalyticsEvent.aggregate([
          { $match: { createdAt: { $gte: last1Hour } } },
          {
            $group: {
              _id: null,
              uniqueUsers: { $addToSet: '$userId' },
              uniqueOrganizations: { $addToSet: '$organizationId' }
            }
          },
          {
            $project: {
              activeUsers: { $size: '$uniqueUsers' },
              activeOrganizations: { $size: '$uniqueOrganizations' }
            }
          }
        ]),
        
        // System health indicators
        AnalyticsEvent.aggregate([
          { $match: { createdAt: { $gte: last1Hour } } },
          {
            $group: {
              _id: null,
              totalRequests: { $sum: 1 },
              errors: {
                $sum: {
                  $cond: [{ $eq: ['$eventType', 'error_occurred'] }, 1, 0]
                }
              },
              avgResponseTime: { $avg: '$metrics.duration' }
            }
          },
          {
            $project: {
              totalRequests: 1,
              errors: 1,
              errorRate: { 
                $multiply: [
                  { $divide: ['$errors', '$totalRequests'] }, 
                  100
                ] 
              },
              avgResponseTime: 1
            }
          }
        ])
      ]);

      return {
        timestamp: new Date(),
        recentActivity,
        activeUsers: activeUsers[0] || { activeUsers: 0, activeOrganizations: 0 },
        systemHealth: systemHealth[0] || { 
          totalRequests: 0, 
          errors: 0, 
          errorRate: 0, 
          avgResponseTime: 0 
        }
      };
    } catch (error) {
      this.logger.error('Failed to get real-time metrics', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Helper method to get start date based on time range
   */
  getStartDate(timeRange) {
    const now = new Date();
    const ranges = {
      '1d': 1,
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    };
    
    const days = ranges[timeRange] || 30;
    return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  }

  /**
   * Clean up old analytics data
   */
  async cleanupOldData(daysToKeep = 90) {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
      
      const result = await AnalyticsEvent.deleteMany({
        createdAt: { $lt: cutoffDate }
      });

      this.logger.info('Analytics cleanup completed', {
        deletedCount: result.deletedCount,
        cutoffDate
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to cleanup analytics data', {
        error: error.message,
        daysToKeep
      });
      throw error;
    }
  }
}

module.exports = {
  AnalyticsService: new AnalyticsService(),
  AnalyticsEvent
};