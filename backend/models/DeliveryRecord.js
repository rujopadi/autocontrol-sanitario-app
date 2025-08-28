
const mongoose = require('mongoose');

const DeliveryRecordSchema = new mongoose.Schema({
  // Multi-tenant field
  organizationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Organization', 
    required: true,
    index: true 
  },
  
  // Campos de trazabilidad
  registeredBy: { 
    type: String, 
    required: true,
    trim: true 
  },
  registeredById: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  registeredAt: { 
    type: Date, 
    required: true,
    default: Date.now 
  },
  
  // Campos del registro (mantener compatibilidad)
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  supplierId: { 
    type: String, 
    required: true,
    trim: true 
  },
  productTypeId: { 
    type: String, 
    required: true,
    trim: true 
  },
  temperature: { 
    type: String, 
    required: true,
    trim: true 
  },
  receptionDate: { 
    type: Date, 
    required: true 
  },
  docsOk: { 
    type: Boolean, 
    required: true, 
    default: true 
  },
  albaranImage: { 
    type: String, 
    required: false 
  }
}, { 
  timestamps: true 
});

// Índices para optimización
DeliveryRecordSchema.index({ organizationId: 1, createdAt: -1 });
DeliveryRecordSchema.index({ organizationId: 1, registeredById: 1 });
DeliveryRecordSchema.index({ organizationId: 1, receptionDate: -1 });

module.exports = mongoose.model('DeliveryRecord', DeliveryRecordSchema);
