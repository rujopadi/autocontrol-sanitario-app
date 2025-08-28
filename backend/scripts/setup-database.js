const mongoose = require('mongoose');
const { connectDB } = require('../config/database.prod');

// Import all models to ensure schemas are registered
require('../models/User');
require('../models/Organization');
require('../models/DeliveryRecord');
require('../models/StorageRecord');
require('../models/Escandallo');
require('../models/TechnicalSheet');
require('../models/Incident');
require('../models/AuditLog');

const setupDatabase = async () => {
  try {
    console.log('🚀 Starting database setup...');
    
    // Connect to database
    await connectDB();
    
    console.log('📋 Creating database indexes...');
    
    // Create indexes for better performance
    const db = mongoose.connection.db;
    
    // User indexes
    await db.collection('users').createIndex({ organizationId: 1, email: 1 }, { unique: true });
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ organizationId: 1, role: 1 });
    await db.collection('users').createIndex({ emailVerificationToken: 1 }, { sparse: true });
    await db.collection('users').createIndex({ passwordResetToken: 1 }, { sparse: true });
    await db.collection('users').createIndex({ lastLogin: 1 });
    console.log('✅ User indexes created');
    
    // Organization indexes
    await db.collection('organizations').createIndex({ subdomain: 1 }, { unique: true });
    await db.collection('organizations').createIndex({ 'subscription.status': 1 });
    await db.collection('organizations').createIndex({ 'subscription.expiresAt': 1 });
    await db.collection('organizations').createIndex({ isActive: 1 });
    console.log('✅ Organization indexes created');
    
    // DeliveryRecord indexes
    await db.collection('deliveryrecords').createIndex({ organizationId: 1, date: -1 });
    await db.collection('deliveryrecords').createIndex({ organizationId: 1, supplier: 1 });
    await db.collection('deliveryrecords').createIndex({ organizationId: 1, product: 1 });
    await db.collection('deliveryrecords').createIndex({ organizationId: 1, createdBy: 1 });
    console.log('✅ DeliveryRecord indexes created');
    
    // StorageRecord indexes
    await db.collection('storagerecords').createIndex({ organizationId: 1, date: -1 });
    await db.collection('storagerecords').createIndex({ organizationId: 1, location: 1 });
    await db.collection('storagerecords').createIndex({ organizationId: 1, product: 1 });
    await db.collection('storagerecords').createIndex({ organizationId: 1, createdBy: 1 });
    console.log('✅ StorageRecord indexes created');
    
    // Escandallo indexes
    await db.collection('escandallos').createIndex({ organizationId: 1, name: 1 });
    await db.collection('escandallos').createIndex({ organizationId: 1, category: 1 });
    await db.collection('escandallos').createIndex({ organizationId: 1, createdBy: 1 });
    await db.collection('escandallos').createIndex({ organizationId: 1, updatedAt: -1 });
    console.log('✅ Escandallo indexes created');
    
    // TechnicalSheet indexes
    await db.collection('technicalsheets').createIndex({ organizationId: 1, product: 1 });
    await db.collection('technicalsheets').createIndex({ organizationId: 1, category: 1 });
    await db.collection('technicalsheets').createIndex({ organizationId: 1, createdBy: 1 });
    console.log('✅ TechnicalSheet indexes created');
    
    // Incident indexes
    await db.collection('incidents').createIndex({ organizationId: 1, date: -1 });
    await db.collection('incidents').createIndex({ organizationId: 1, type: 1 });
    await db.collection('incidents').createIndex({ organizationId: 1, severity: 1 });
    await db.collection('incidents').createIndex({ organizationId: 1, status: 1 });
    await db.collection('incidents').createIndex({ organizationId: 1, assignedTo: 1 });
    console.log('✅ Incident indexes created');
    
    // AuditLog indexes
    await db.collection('auditlogs').createIndex({ organizationId: 1, timestamp: -1 });
    await db.collection('auditlogs').createIndex({ organizationId: 1, action: 1 });
    await db.collection('auditlogs').createIndex({ organizationId: 1, userId: 1 });
    await db.collection('auditlogs').createIndex({ organizationId: 1, resourceType: 1 });
    console.log('✅ AuditLog indexes created');
    
    // Compound indexes for common queries
    await db.collection('deliveryrecords').createIndex({ 
      organizationId: 1, 
      date: -1, 
      supplier: 1 
    });
    
    await db.collection('storagerecords').createIndex({ 
      organizationId: 1, 
      date: -1, 
      location: 1 
    });
    
    await db.collection('incidents').createIndex({ 
      organizationId: 1, 
      status: 1, 
      severity: 1 
    });
    
    console.log('✅ Compound indexes created');
    
    // Set up database-level configurations
    console.log('⚙️ Configuring database settings...');
    
    // Enable profiling for slow queries (optional, for monitoring)
    if (process.env.ENABLE_DB_PROFILING === 'true') {
      await db.admin().command({ profile: 2, slowms: 100 });
      console.log('✅ Database profiling enabled for queries > 100ms');
    }
    
    // Create database statistics
    const stats = await db.stats();
    console.log('📊 Database Statistics:');
    console.log(`   Collections: ${stats.collections}`);
    console.log(`   Data Size: ${Math.round(stats.dataSize / 1024 / 1024 * 100) / 100} MB`);
    console.log(`   Index Size: ${Math.round(stats.indexSize / 1024 / 1024 * 100) / 100} MB`);
    console.log(`   Objects: ${stats.objects}`);
    
    console.log('🎉 Database setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('🔒 Database connection closed');
  }
};

// Run setup if called directly
if (require.main === module) {
  setupDatabase()
    .then(() => {
      console.log('✅ Setup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupDatabase };