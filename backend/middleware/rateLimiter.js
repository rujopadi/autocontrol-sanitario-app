const rateLimit = require('express-rate-limit');

// Rate limiter para autenticación (más restrictivo)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 intentos por ventana de tiempo
  message: {
    success: false,
    message: 'Demasiados intentos de inicio de sesión. Intente de nuevo en 15 minutos.',
    retryAfter: 15 * 60 // segundos
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Usar IP y email para el rate limiting
  keyGenerator: (req) => {
    return req.ip + ':' + (req.body.email || 'unknown');
  },
  // Saltar rate limiting para IPs de confianza (opcional)
  skip: (req) => {
    const trustedIPs = process.env.TRUSTED_IPS?.split(',') || [];
    return trustedIPs.includes(req.ip);
  }
});

// Rate limiter para registro (moderado)
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // 3 registros por hora por IP
  message: {
    success: false,
    message: 'Demasiados intentos de registro. Intente de nuevo en 1 hora.',
    retryAfter: 60 * 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter para reset de contraseña
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // 3 intentos por hora
  message: {
    success: false,
    message: 'Demasiados intentos de recuperación de contraseña. Intente de nuevo en 1 hora.',
    retryAfter: 60 * 60
  },
  keyGenerator: (req) => {
    return req.ip + ':' + (req.body.email || 'unknown');
  }
});

// Rate limiter general para API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requests por ventana
  message: {
    success: false,
    message: 'Demasiadas solicitudes. Intente de nuevo más tarde.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Rate limiting más flexible para usuarios autenticados
  keyGenerator: (req) => {
    if (req.user && req.user.organizationId) {
      return `org:${req.user.organizationId}:${req.ip}`;
    }
    return req.ip;
  }
});

// Rate limiter específico por organización
const createOrgLimiter = (maxRequests = 1000, windowMs = 15 * 60 * 1000) => {
  return rateLimit({
    windowMs,
    max: maxRequests,
    message: {
      success: false,
      message: 'Límite de solicitudes de la organización excedido.',
      retryAfter: Math.ceil(windowMs / 1000)
    },
    keyGenerator: (req) => {
      return req.user?.organizationId?.toString() || req.ip;
    },
    // Aplicar límites basados en el plan de suscripción
    max: (req) => {
      if (!req.user?.organization) return maxRequests;
      
      const planLimits = {
        free: 500,
        basic: 2000,
        premium: 10000
      };
      
      return planLimits[req.user.organization.subscription.plan] || maxRequests;
    }
  });
};

module.exports = {
  authLimiter,
  registerLimiter,
  passwordResetLimiter,
  apiLimiter,
  createOrgLimiter
};