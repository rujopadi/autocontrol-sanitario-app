const mongoose = require('mongoose');

const OrganizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre de la organización es requerido'],
    trim: true,
    maxlength: [100, 'El nombre no puede exceder 100 caracteres']
  },
  subdomain: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-z0-9-]+$/, 'El subdominio solo puede contener letras minúsculas, números y guiones']
  },
  settings: {
    establishmentInfo: {
      name: { type: String, trim: true },
      address: { type: String, trim: true },
      city: { type: String, trim: true },
      postalCode: { type: String, trim: true },
      phone: { type: String, trim: true },
      email: { 
        type: String, 
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido']
      },
      cif: { type: String, trim: true },
      sanitaryRegistry: { type: String, trim: true },
      technicalResponsible: { type: String, trim: true }
    },
    branding: {
      logo: String,
      primaryColor: { type: String, default: '#2563eb' },
      secondaryColor: { type: String, default: '#64748b' }
    },
    features: {
      maxUsers: { type: Number, default: 10, min: 1, max: 1000 },
      storageLimit: { type: Number, default: 1000, min: 100 }, // MB
      apiCallsLimit: { type: Number, default: 10000, min: 1000 }
    }
  },
  subscription: {
    plan: { 
      type: String, 
      enum: ['free', 'basic', 'premium'], 
      default: 'free' 
    },
    status: { 
      type: String, 
      enum: ['active', 'suspended', 'cancelled'], 
      default: 'active' 
    },
    expiresAt: Date,
    trialEndsAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días
    }
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Índices para optimización
OrganizationSchema.index({ subdomain: 1 });
OrganizationSchema.index({ 'subscription.status': 1 });
OrganizationSchema.index({ isActive: 1 });

// Middleware para generar subdomain automáticamente si no se proporciona
OrganizationSchema.pre('save', function(next) {
  if (!this.subdomain && this.name) {
    // Generar subdomain basado en el nombre
    this.subdomain = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remover caracteres especiales
      .replace(/\s+/g, '-') // Reemplazar espacios con guiones
      .substring(0, 30); // Limitar longitud
    
    // Añadir timestamp si es muy corto
    if (this.subdomain.length < 3) {
      this.subdomain += '-' + Date.now().toString().slice(-6);
    }
  }
  next();
});

// Método para verificar si la organización está activa y no suspendida
OrganizationSchema.methods.isOperational = function() {
  return this.isActive && 
         this.subscription.status === 'active' && 
         (!this.subscription.expiresAt || this.subscription.expiresAt > new Date());
};

// Método para obtener límites actuales
OrganizationSchema.methods.getLimits = function() {
  const planLimits = {
    free: { maxUsers: 5, storageLimit: 500, apiCallsLimit: 5000 },
    basic: { maxUsers: 25, storageLimit: 5000, apiCallsLimit: 50000 },
    premium: { maxUsers: 100, storageLimit: 20000, apiCallsLimit: 200000 }
  };
  
  return planLimits[this.subscription.plan] || planLimits.free;
};

module.exports = mongoose.model('Organization', OrganizationSchema);