
const mongoose = require('mongoose');

const EstablishmentInfoSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  postalCode: { type: String, required: true },
  sanitaryRegistry: { type: String, required: true },
});

// Usamos un solo documento para esta colección
module.exports = mongoose.model('EstablishmentInfo', EstablishmentInfoSchema);
