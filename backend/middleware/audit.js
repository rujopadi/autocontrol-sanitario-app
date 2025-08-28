const mongoose = require('mongoose');

// Schema para logs de auditoría
const AuditLogSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'LOGIN', 'LOGOUT', 'REGISTER', 'PASSWORD_RESET',
      'CREATE', 'UPDATE', 'DELETE', 'VIEW',
      'INVITE_USER', 'REMOVE_USER', 'CHANGE_ROLE',
      'UPDATE_ORGANIZATION', 'EXPORT_DATA'
    ]
  },
  resource: {
    type: String,
    required: true // e.g., 'DeliveryRecord', 'User', 'Organization'
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false // ID del recurso afectado
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    required: false // Detalles adicionales de la acción
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  success: {
    type: Boolean,
    default: true
  },
  errorMessage: {
    type: String,
    required: false
  }
}, {
  timestamps: false // Usamos nuestro propio timestamp
});

// Índices para consultas eficientes
AuditLogSchema.index({ organizationId: 1, timestamp: -1 });
AuditLogSchema.index({ organizationId: 1, userId: 1, timestamp: -1 });
AuditLogSchema.index({ organizationId: 1, action: 1, timestamp: -1 });

const AuditLog = mongoose.model('AuditLog', AuditLogSchema);

// Middleware para logging automático
const auditLogger = (action, resource) => {
  return async (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Capturar la respuesta para determinar si fue exitosa
      const success = res.statusCode < 400;
      
      // Crear log de auditoría
      const auditData = {
        organizationId: req.tenantId || req.user?.organizationId,
        userId: req.user?.id,
        action,
        resource,
        resourceId: req.params.id || req.body._id,
        details: {
          method: req.method,
          url: req.originalUrl,
          body: sanitizeBody(req.body),
          query: req.query,
          statusCode: res.statusCode
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent') || 'Unknown',
        success,
        errorMessage: success ? undefined : extractErrorMessage(data)
      };

      // Guardar log de forma asíncrona (no bloquear respuesta)
      saveAuditLog(auditData).catch(err => {
        console.error('Error guardando log de auditoría:', err);
      });

      return originalSend.call(this, data);
    };

    next();
  };
};

// Función para sanitizar datos sensibles del body
const sanitizeBody = (body) => {
  if (!body || typeof body !== 'object') return body;
  
  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'secret', 'key'];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return sanitized;
};

// Extraer mensaje de error de la respuesta
const extractErrorMessage = (data) => {
  try {
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    return parsed.message || parsed.error || 'Unknown error';
  } catch {
    return 'Error parsing response';
  }
};

// Guardar log de auditoría
const saveAuditLog = async (auditData) => {
  try {
    const log = new AuditLog(auditData);
    await log.save();
  } catch (error) {
    console.error('Error saving audit log:', error);
  }
};

// Middleware para logging de autenticación
const authAuditLogger = async (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    const success = res.statusCode < 400;
    let action = 'LOGIN';
    
    // Determinar acción basada en la ruta
    if (req.path.includes('register')) action = 'REGISTER';
    else if (req.path.includes('logout')) action = 'LOGOUT';
    else if (req.path.includes('reset')) action = 'PASSWORD_RESET';
    
    const auditData = {
      organizationId: req.body.organizationId || req.user?.organizationId,
      userId: req.user?.id || null,
      action,
      resource: 'Authentication',
      details: {
        method: req.method,
        url: req.originalUrl,
        email: req.body.email,
        statusCode: res.statusCode
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent') || 'Unknown',
      success,
      errorMessage: success ? undefined : extractErrorMessage(data)
    };

    saveAuditLog(auditData).catch(err => {
      console.error('Error guardando log de autenticación:', err);
    });

    return originalSend.call(this, data);
  };

  next();
};

// Función para obtener logs de auditoría por organización
const getAuditLogs = async (organizationId, filters = {}) => {
  const query = { organizationId };
  
  if (filters.userId) query.userId = filters.userId;
  if (filters.action) query.action = filters.action;
  if (filters.resource) query.resource = filters.resource;
  if (filters.dateFrom || filters.dateTo) {
    query.timestamp = {};
    if (filters.dateFrom) query.timestamp.$gte = new Date(filters.dateFrom);
    if (filters.dateTo) query.timestamp.$lte = new Date(filters.dateTo);
  }
  
  return await AuditLog.find(query)
    .populate('userId', 'name email')
    .sort({ timestamp: -1 })
    .limit(filters.limit || 100);
};

// Función para obtener estadísticas de auditoría
const getAuditStats = async (organizationId, dateRange = {}) => {
  const matchStage = { organizationId };
  
  if (dateRange.start || dateRange.end) {
    matchStage.timestamp = {};
    if (dateRange.start) matchStage.timestamp.$gte = dateRange.start;
    if (dateRange.end) matchStage.timestamp.$lte = dateRange.end;
  }
  
  return await AuditLog.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalActions: { $sum: 1 },
        successfulActions: {
          $sum: { $cond: [{ $eq: ['$success', true] }, 1, 0] }
        },
        failedActions: {
          $sum: { $cond: [{ $eq: ['$success', false] }, 1, 0] }
        },
        uniqueUsers: { $addToSet: '$userId' },
        actionsByType: {
          $push: {
            action: '$action',
            success: '$success'
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalActions: 1,
        successfulActions: 1,
        failedActions: 1,
        uniqueUsersCount: { $size: '$uniqueUsers' },
        successRate: {
          $multiply: [
            { $divide: ['$successfulActions', '$totalActions'] },
            100
          ]
        }
      }
    }
  ]);
};

module.exports = {
  auditLogger,
  authAuditLogger,
  getAuditLogs,
  getAuditStats,
  AuditLog
};