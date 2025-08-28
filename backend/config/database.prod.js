const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // MongoDB Atlas connection with production settings
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      retryWrites: true, // Enable retryable writes
      w: 'majority', // Write concern
      readPreference: 'primary', // Read from primary
    });

    console.log(`✅ MongoDB Atlas Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    
    // Connection event handlers
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('🔒 MongoDB connection closed through app termination');
        process.exit(0);
      } catch (err) {
        console.error('❌ Error during MongoDB shutdown:', err);
        process.exit(1);
      }
    });

    return conn;
  } catch (error) {
    console.error('❌ MongoDB Atlas connection failed:', error.message);
    
    // Log specific connection errors
    if (error.name === 'MongoNetworkError') {
      console.error('🌐 Network error - check your internet connection and MongoDB Atlas whitelist');
    } else if (error.name === 'MongoAuthenticationError') {
      console.error('🔐 Authentication error - check your MongoDB credentials');
    } else if (error.name === 'MongoParseError') {
      console.error('🔗 Connection string error - check your MONGODB_URI format');
    }
    
    process.exit(1);
  }
};

// Health check function
const checkDBHealth = async () => {
  try {
    const adminDb = mongoose.connection.db.admin();
    const result = await adminDb.ping();
    return { status: 'healthy', ping: result };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
};

// Database statistics
const getDBStats = async () => {
  try {
    const stats = await mongoose.connection.db.stats();
    return {
      collections: stats.collections,
      dataSize: Math.round(stats.dataSize / 1024 / 1024 * 100) / 100, // MB
      indexSize: Math.round(stats.indexSize / 1024 / 1024 * 100) / 100, // MB
      objects: stats.objects
    };
  } catch (error) {
    return { error: error.message };
  }
};

module.exports = {
  connectDB,
  checkDBHealth,
  getDBStats
};