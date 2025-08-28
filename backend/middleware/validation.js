const { body, param, query, validationResult } = require('express-validator');

// Middleware para manejar errores de validación
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));
    
    return res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errors: errorMessages
    });
  }
  
  next();
};

// Validaciones para registro de usuario
const validateUserRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .withMessage('El nombre solo puede contener letras y espacios'),
    
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Debe proporcionar un email válido')
    .isLength({ max: 255 })
    .withMessage('El email no puede exceder 255 caracteres'),
    
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('La contraseña debe tener entre 8 y 128 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('La contraseña debe contener al menos una minúscula, una mayúscula y un número'),
    
  body('organizationName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre de la organización debe tener entre 2 y 100 caracteres'),
    
  handleValidationErrors
];

// Validaciones para login
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Debe proporcionar un email válido'),
    
  body('password')
    .notEmpty()
    .withMessage('La contraseña es requerida')
    .isLength({ min: 1, max: 128 })
    .withMessage('Contraseña inválida'),
    
  handleValidationErrors
];

// Validaciones para reset de contraseña
const validatePasswordReset = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Debe proporcionar un email válido'),
    
  handleValidationErrors
];

// Validaciones para confirmar reset de contraseña
const validatePasswordResetConfirm = [
  body('token')
    .notEmpty()
    .withMessage('Token es requerido')
    .isLength({ min: 32, max: 128 })
    .withMessage('Token inválido'),
    
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('La contraseña debe tener entre 8 y 128 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('La contraseña debe contener al menos una minúscula, una mayúscula y un número'),
    
  handleValidationErrors
];

// Validaciones para actualización de organización
const validateOrganizationUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
    
  body('settings.establishmentInfo.email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Email de establecimiento inválido'),
    
  body('settings.establishmentInfo.phone')
    .optional()
    .matches(/^[+]?[\d\s\-\(\)]+$/)
    .withMessage('Número de teléfono inválido'),
    
  body('settings.branding.primaryColor')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Color primario debe ser un código hexadecimal válido'),
    
  body('settings.branding.secondaryColor')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Color secundario debe ser un código hexadecimal válido'),
    
  handleValidationErrors
];

// Validaciones para invitación de usuario
const validateUserInvitation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Debe proporcionar un email válido'),
    
  body('role')
    .isIn(['Admin', 'User', 'ReadOnly'])
    .withMessage('Rol inválido. Debe ser Admin, User o ReadOnly'),
    
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
    
  handleValidationErrors
];

// Validaciones para actualización de usuario
const validateUserUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
    
  body('role')
    .optional()
    .isIn(['Admin', 'User', 'ReadOnly'])
    .withMessage('Rol inválido'),
    
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive debe ser un valor booleano'),
    
  handleValidationErrors
];

// Validaciones para parámetros de ID
const validateObjectId = (paramName = 'id') => [
  param(paramName)
    .isMongoId()
    .withMessage(`${paramName} debe ser un ID válido`),
    
  handleValidationErrors
];

// Validaciones para paginación
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('La página debe ser un número entre 1 y 1000'),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El límite debe ser un número entre 1 y 100'),
    
  query('sort')
    .optional()
    .isIn(['createdAt', '-createdAt', 'name', '-name', 'email', '-email'])
    .withMessage('Ordenamiento inválido'),
    
  handleValidationErrors
];

// Sanitización de entrada para prevenir XSS
const sanitizeInput = (req, res, next) => {
  const sanitizeValue = (value) => {
    if (typeof value === 'string') {
      // Remover scripts y tags HTML peligrosos
      return value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<[^>]*>/g, '')
        .trim();
    }
    return value;
  };

  const sanitizeObject = (obj) => {
    for (let key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key]);
        } else {
          obj[key] = sanitizeValue(obj[key]);
        }
      }
    }
  };

  if (req.body) sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  if (req.params) sanitizeObject(req.params);

  next();
};

module.exports = {
  validateUserRegistration,
  validateLogin,
  validatePasswordReset,
  validatePasswordResetConfirm,
  validateOrganizationUpdate,
  validateUserInvitation,
  validateUserUpdate,
  validateObjectId,
  validatePagination,
  sanitizeInput,
  handleValidationErrors
};