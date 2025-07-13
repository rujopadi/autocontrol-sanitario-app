
const mongoose = require('mongoose');

const DeliveryRecordSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  supplierId: { type: String, required: true }, // Simplificado a string por ahora
  productTypeId: { type: String, required: true }, // Simplificado a string por ahora
  temperature: { type: String, required: true },
  receptionDate: { type: Date, required: true },
  docsOk: { type: Boolean, required: true, default: true },
  albaranImage: { type: String, required: false }, // Base64 o URL
}, { timestamps: true });

module.exports = mongoose.model('DeliveryRecord', DeliveryRecordSchema);
