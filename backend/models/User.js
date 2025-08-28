
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  organizationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Organization', 
    required: [true, 'La organización es requerida'],
    index: true 
  },
  email: { 
    type: String, 
    required: [true, 'El email es requerido'], 
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido']
  },
  password: { 
    type: String, 
    required: [true, 'La contraseña es requerida'],
    minlength: [8, 'La contraseña debe tener al menos 8 caracteres']
  },
  name: { 
    type: String, 
    required: [true, 'El nombre es requerido'],
    trim: true,
    maxlength: [100, 'El nombre no puede exceder 100 caracteres']
  },
  role: { 
    type: String, 
    enum: ['Admin', 'User', 'ReadOnly'], 
    default: 'User' 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  isEmailVerified: { 
    type: Boolean, 
    default: false 
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  lastLogin: Date,
  loginAttempts: { 
    type: Number, 
    default: 0 
  },
  lockUntil: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Mantener compatibilidad con el sistema anterior
  isAdmin: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Índices compuestos para optimización
UserSchema.index({ organizationId: 1, email: 1 });
UserSchema.index({ organizationId: 1, role: 1 });
UserSchema.index({ emailVerificationToken: 1 });
UserSchema.index({ passwordResetToken: 1 });

// Virtual para verificar si la cuenta está bloqueada
UserSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Middleware para hashear contraseña antes de guardar
UserSchema.pre('save', async function(next) {
  // Solo hashear si la contraseña fue modificada
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Método para comparar contraseñas
UserSchema.methods.comparePassword = async function(candidatePassword) {
  if (this.isLocked) {
    throw new Error('Cuenta temporalmente bloqueada por múltiples intentos fallidos');
  }
  
  const isMatch = await bcrypt.compare(candidatePassword, this.password);
  
  if (!isMatch) {
    this.loginAttempts += 1;
    
    // Bloquear cuenta después de 5 intentos fallidos
    if (this.loginAttempts >= 5) {
      this.lockUntil = Date.now() + 30 * 60 * 1000; // 30 minutos
    }
    
    await this.save();
    return false;
  }
  
  // Reset intentos si el login es exitoso
  if (this.loginAttempts > 0) {
    this.loginAttempts = 0;
    this.lockUntil = undefined;
    this.lastLogin = new Date();
    await this.save();
  }
  
  return true;
};

// Método para generar token de verificación de email
UserSchema.methods.generateEmailVerificationToken = function() {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  
  this.emailVerificationToken = token;
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 horas
  
  return token;
};

// Método para generar token de reset de contraseña
UserSchema.methods.generatePasswordResetToken = function() {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  
  this.passwordResetToken = token;
  this.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hora
  
  return token;
};

// Método para verificar si el usuario es admin de su organización
UserSchema.methods.isOrgAdmin = function() {
  return this.role === 'Admin' || this.isAdmin;
};

// Método para verificar permisos
UserSchema.methods.hasPermission = function(permission) {
  const permissions = {
    'Admin': ['read', 'write', 'delete', 'manage_users', 'manage_org'],
    'User': ['read', 'write'],
    'ReadOnly': ['read']
  };
  
  return permissions[this.role]?.includes(permission) || false;
};

module.exports = mongoose.model('User', UserSchema);
