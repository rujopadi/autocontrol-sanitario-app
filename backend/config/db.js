
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Check if MONGO_URI is configured
    if (!process.env.MONGO_URI) {
      console.warn('⚠️ MONGO_URI no está configurado. Usando modo sin base de datos para desarrollo.');
      return;
    }

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10, // Mantener hasta 10 conexiones socket
      serverSelectionTimeoutMS: 5000, // Mantener intentando enviar operaciones por 5 segundos
      socketTimeoutMS: 45000, // Cerrar sockets después de 45 segundos de inactividad
    });

    console.log(`🍃 MongoDB Conectado: ${conn.connection.host}`);
    console.log(`📊 Base de datos: ${conn.connection.name}`);
    
    // Manejar eventos de conexión
    mongoose.connection.on('error', (err) => {
      console.error('❌ Error de MongoDB:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB desconectado');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconectado');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('🔒 Conexión a MongoDB cerrada por terminación de la aplicación');
        process.exit(0);
      } catch (err) {
        console.error('❌ Error cerrando conexión a MongoDB:', err);
        process.exit(1);
      }
    });

  } catch (err) {
    console.error('❌ Error de conexión a MongoDB:', err.message);
    
    // En desarrollo, mostrar más detalles del error y continuar sin base de datos
    if (process.env.NODE_ENV === 'development') {
      console.error('Detalles del error:', err);
      console.warn('⚠️ Continuando en modo desarrollo sin base de datos.');
      console.warn('💡 Para usar la base de datos, configura MONGO_URI en el archivo .env');
      console.warn('💡 Puedes usar MongoDB Atlas (gratuito) o instalar MongoDB localmente');
      return; // No salir del proceso en desarrollo
    }
    
    // En producción, salir del proceso con fallo
    process.exit(1);
  }
};

module.exports = connectDB;
