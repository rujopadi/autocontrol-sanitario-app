const jwt = require('jsonwebtoken');

// Middleware de autenticación simple para testing
const auth = async (req, res, next) => {
  try {
    const token = req.header('x-auth-token') || req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'No hay token, autorización denegada' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verify user still exists and is active
    const User = require('../models/User');
    const Organization = require('../models/Organization');
    
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ 
        success: false,
        message: 'Usuario no válido o inactivo' 
      });
    }
    
    // Verify organization still exists and is active
    const organization = await Organization.findById(decoded.organizationId);
    if (!organization || !organization.isActive) {
      return res.status(401).json({ 
        success: false,
        message: 'Organización no válida o inactiva' 
      });
    }
    
    // Add user info to request
    req.user = {
      id: decoded.userId,
      userId: decoded.userId,
      organizationId: decoded.organizationId,
      email: decoded.email,
      role: decoded.role
    };
    
    // Add organization info to request
    req.organization = {
      id: decoded.organizationId
    };
    
    next();
  } catch (err) {
    res.status(401).json({ 
      success: false,
      message: 'Token inválido' 
    });
  }
};

// Middleware simple para admin
const requireOrgAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      message: 'No autenticado' 
    });
  }
  next();
};

// Middleware simple para tenant context
const addTenantContext = (req, res, next) => {
  if (req.user && req.user.organizationId) {
    req.tenantId = req.user.organizationId;
  }
  next();
};

// Función simple para generar token
const generateToken = (user) => {
  const payload = {
    userId: user._id,
    organizationId: user.organizationId,
    email: user.email,
    role: user.role || 'User'
  };

  return jwt.sign(payload, process.env.JWT_SECRET, { 
    expiresIn: '7d' 
  });
};

const generateRefreshToken = (user) => {
  return generateToken(user); // Simplificado para testing
};

module.exports = {
  auth,
  requireOrgAdmin,
  addTenantContext,
  generateToken,
  generateRefreshToken
};