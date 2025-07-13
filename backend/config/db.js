
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Conectado...');
  } catch (err) {
    console.error('Error de conexión a MongoDB:', err.message);
    // Salir del proceso con fallo
    process.exit(1);
  }
};

module.exports = connectDB;
