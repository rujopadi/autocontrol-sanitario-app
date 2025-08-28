/**
 * Analytics Middleware
 * Automatically tracks user actions and API calls
 */

const { AnalyticsService } = require('../services/analyticsService');

/**
 * Middleware to track API calls and user actions
 */
const trackAnalytics = (eventType, options = {}) => {
  return async (req, res, next) => {
    const startTime = Date.now();
    
    // Store original res.json to capture response
    const originalJson = res.json;
    let responseData = null;
    
    res.json = function(data) {
      responseData = data;
      return originalJson.call(this, data);
    };

    // Continue with the request
    next();

    // Track the event after response is sent
    res.on('finish', async () => {
      try {
        const duration = Date.now() - startTime;
        
        // Extract user and organization info from request
        const userId = req.user?.id || req.user?.userId;
        const organizationId = req.user?.organizationId || req.organization?.id;
        
        // Skip tracking if no user context (public endpoints)
        if (!userId || !organizationId) {
          return;
        }

        // Prepare event data
        const eventData = {
          organizationId,
          userId,
          eventType: eventType || 'api_call',
          data: {
            endpoint: req.originalUrl,
            method: req.method,
            userAgent: req.get('User-Agent'),
            success: res.statusCode < 400,
            ...options.data
          },
          metadata: {
            userAgent: req.get('User-Agent'),
            ipAddress: req.ip || req.connection.remoteAddress,
            sessionId: req.sessionID,
            referrer: req.get('Referrer'),
            endpoint: req.originalUrl,
            method: req.method
          },
          metrics: {
            duration,
            responseSize: JSON.stringify(responseData || {}).length,
            statusCode: res.statusCode
          }
        };

        // Track the event
        await AnalyticsService.trackEvent(eventData);
      } catch (error) {
        console.error('Analytics tracking error:', error);
        // Don't throw error to avoid affecting the main request
      }
    });
  };
};

/**
 * Middleware to track user authentication events
 */
const trackAuthEvent = (eventType) => {
  return async (req, res, next) => {
    // Store original res.json to capture response
    const originalJson = res.json;
    
    res.json = function(data) {
      // Track authentication event after successful response
      if (data.success && req.body.email) {
        setImmediate(async () => {
          try {
            const eventData = {
              organizationId: data.data?.organization?.id || data.data?.user?.organizationId,
              userId: data.data?.user?.id,
              eventType,
              data: {
                email: req.body.email,
                success: true,
                method: 'email_password'
              },
              metadata: {
                userAgent: req.get('User-Agent'),
                ipAddress: req.ip || req.connection.remoteAddress,
                endpoint: req.originalUrl
              }
            };

            if (eventData.organizationId && eventData.userId) {
              await AnalyticsService.trackEvent(eventData);
            }
          } catch (error) {
            console.error('Auth analytics tracking error:', error);
          }
        });
      }
      
      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Middleware to track business record operations
 */
const trackRecordEvent = (eventType) => {
  return async (req, res, next) => {
    const originalJson = res.json;
    
    res.json = function(data) {
      // Track record event after successful response
      if (data.success && req.user) {
        setImmediate(async () => {
          try {
            const eventData = {
              organizationId: req.user.organizationId,
              userId: req.user.id || req.user.userId,
              eventType,
              data: {
                recordType: 'delivery_record', // or extract from request
                recordId: data.data?._id || req.params.id,
                action: eventType.split('_')[1], // create, update, delete, view
                success: true
              },
              metadata: {
                userAgent: req.get('User-Agent'),
                ipAddress: req.ip || req.connection.remoteAddress,
                endpoint: req.originalUrl,
                method: req.method
              }
            };

            await AnalyticsService.trackEvent(eventData);
          } catch (error) {
            console.error('Record analytics tracking error:', error);
          }
        });
      }
      
      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Middleware to track errors
 */
const trackError = async (error, req, res, next) => {
  try {
    // Track error event if user context is available
    if (req.user?.id && req.user?.organizationId) {
      const eventData = {
        organizationId: req.user.organizationId,
        userId: req.user.id || req.user.userId,
        eventType: 'error_occurred',
        data: {
          errorMessage: error.message,
          errorType: error.name || 'UnknownError',
          statusCode: error.statusCode || 500,
          endpoint: req.originalUrl,
          method: req.method,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        },
        metadata: {
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip || req.connection.remoteAddress,
          endpoint: req.originalUrl,
          method: req.method
        }
      };

      await AnalyticsService.trackEvent(eventData);
    }
  } catch (analyticsError) {
    console.error('Error analytics tracking failed:', analyticsError);
  }

  // Continue with error handling
  next(error);
};

/**
 * Middleware to track feature usage
 */
const trackFeatureUsage = (featureName, options = {}) => {
  return async (req, res, next) => {
    try {
      if (req.user?.id && req.user?.organizationId) {
        const eventData = {
          organizationId: req.user.organizationId,
          userId: req.user.id || req.user.userId,
          eventType: 'feature_used',
          data: {
            featureName,
            ...options.data
          },
          metadata: {
            userAgent: req.get('User-Agent'),
            ipAddress: req.ip || req.connection.remoteAddress,
            endpoint: req.originalUrl,
            method: req.method
          }
        };

        await AnalyticsService.trackEvent(eventData);
      }
    } catch (error) {
      console.error('Feature usage tracking error:', error);
    }

    next();
  };
};

module.exports = {
  trackAnalytics,
  trackAuthEvent,
  trackRecordEvent,
  trackError,
  trackFeatureUsage
};