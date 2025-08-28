
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Organization = require('../models/Organization');

// Middleware de autenticación principal
const auth = async (req, res, next) => {
  try {
    // Obtener el token de la cabecera
    const token = req.header('x-auth-token') || req.header('Authorization')?.replace('Bearer ', '');

    // Comprobar si no hay token
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'No hay token, autorización denegada' 
      });
    }

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verificar que el token tenga la estructura correcta
    if (!decoded.userId || !decoded.organizationId) {
      return res.status(401).json({ 
        success: false,
        message: 'Token inválido - estructura incorrecta' 
      });
    }

    // Buscar el usuario y verificar que esté activo
    const user = await User.findById(decoded.userId)
      .populate('organizationId', 'name subdomain isActive subscription')
      .select('-password');

    if (!user || !user.isActive) {
      return res.status(401).json({ 
        success: false,
        message: 'Usuario no encontrado o inactivo' 
      });
    }

    // Verificar que la organización esté activa
    if (!user.organizationId || !user.organizationId.isActive) {
      return res.status(401).json({ 
        success: false,
        message: 'Organización no encontrada o inactiva' 
      });
    }

    // Verificar que la organización no esté suspendida
    if (user.organizationId.subscription.status !== 'active') {
      return res.status(403).json({ 
        success: false,
        message: 'Organización suspendida. Contacte con soporte.' 
      });
    }

    // Añadir información del usuario y organización al request
    req.user = {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      isAdmin: user.isAdmin,
      organizationId: user.organizationId._id,
      organization: user.organizationId
    };

    next();
  } catch (err) {
    console.error('Error en middleware de autenticación:', err);
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: 'Token inválido' 
      });
    }
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Token expirado' 
      });
    }

    res.status(500).json({ 
      success: false,
      message: 'Error del servidor en autenticación' 
    });
  }
};

// Middleware para verificar roles específicos
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'No autenticado' 
      });
    }

    const userRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!userRoles.includes(req.user.role) && !req.user.isAdmin) {
      return res.status(403).json({ 
        success: false,
        message: 'No tienes permisos para realizar esta acción' 
      });
    }

    next();
  };
};

// Middleware para verificar que el usuario sea admin de su organización
const requireOrgAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      message: 'No autenticado' 
    });
  }

  if (req.user.role !== 'Admin' && !req.user.isAdmin) {
    return res.status(403).json({ 
      success: false,
      message: 'Se requieren permisos de administrador' 
    });
  }

  next();
};

// Middleware para añadir contexto de tenant a las consultas
const addTenantContext = (req, res, next) => {
  if (!req.user || !req.user.organizationId) {
    return res.status(401).json({ 
      success: false,
      message: 'Contexto de organización requerido' 
    });
  }

  // Añadir organizationId a los parámetros de consulta
  req.tenantId = req.user.organizationId;
  
  next();
};

// Función para generar JWT con contexto de organización
const generateToken = (user) => {
  const payload = {
    userId: user._id,
    organizationId: user.organizationId,
    email: user.email,
    role: user.role,
    iat: Math.floor(Date.now() / 1000)
  };

  return jwt.sign(payload, process.env.JWT_SECRET, { 
    expiresIn: process.env.JWT_EXPIRE || '7d' 
  });
};

// Función para generar refresh token
const generateRefreshToken = (user) => {
  const payload = {
    userId: user._id,
    organizationId: user.organizationId,
    type: 'refresh'
  };

  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, { 
    expiresIn: '30d' 
  });
};

module.exports = {
  auth,
  requireRole,
  requireOrgAdmin,
  addTenantContext,
  generateToken,
  generateRefreshToken
};
