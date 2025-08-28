// Load test environment variables
require('dotenv').config({ path: '.env.test' });

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

// Setup before all tests
beforeAll(async () => {
  // Start in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Connect to the in-memory database
  await mongoose.connect(mongoUri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
  
  console.log('🧪 Test database connected');
});

// Cleanup after each test
afterEach(async () => {
  // Clear all collections
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Cleanup after all tests
afterAll(async () => {
  // Close database connection
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  
  // Stop the in-memory MongoDB instance
  if (mongoServer) {
    await mongoServer.stop();
  }
  
  console.log('🧪 Test database disconnected');
});

// Global test utilities
global.testUtils = {
  // Create a test user
  createTestUser: async (userData = {}) => {
    const User = require('../models/User');
    const Organization = require('../models/Organization');
    
    // Create or use existing organization
    let organization;
    if (userData.organizationData && userData.organizationData._id) {
      organization = await Organization.findById(userData.organizationData._id);
      if (!organization) {
        throw new Error('Organization not found');
      }
    } else {
      // Generate unique subdomain to avoid conflicts
      const timestamp = Date.now();
      const subdomain = userData.subdomain || `test-org-${timestamp}`;
      
      organization = new Organization({
        name: userData.organizationName || 'Test Organization',
        subdomain: subdomain,
        ...userData.organizationData
      });
      await organization.save();
    }
    
    // Generate unique email to avoid conflicts
    const timestamp = Date.now();
    const email = userData.email || `test-${timestamp}@example.com`;
    
    // Create test user
    const user = new User({
      name: userData.name || 'Test User',
      email: email,
      password: userData.password || 'password123',
      organizationId: organization._id,
      role: userData.role || 'User',
      isEmailVerified: userData.isEmailVerified !== false,
      ...userData.userData
    });
    await user.save();
    
    return { user, organization };
  },
  
  // Create test organization
  createTestOrganization: async (orgData = {}) => {
    const Organization = require('../models/Organization');
    
    // Generate unique subdomain to avoid conflicts
    const timestamp = Date.now();
    const subdomain = orgData.subdomain || `test-org-${timestamp}`;
    
    const organization = new Organization({
      name: orgData.name || 'Test Organization',
      subdomain: subdomain,
      isActive: orgData.isActive !== false,
      ...orgData
    });
    await organization.save();
    
    return organization;
  },

  // Create test delivery record
  createTestDeliveryRecord: async (recordData = {}) => {
    const DeliveryRecord = require('../models/DeliveryRecord');
    const User = require('../models/User');
    
    // Ensure we have required user and organization
    let user, organization;
    if (recordData.user && recordData.organization) {
      user = recordData.user;
      organization = recordData.organization;
    } else {
      const userData = await global.testUtils.createTestUser();
      user = userData.user;
      organization = userData.organization;
    }
    
    const record = new DeliveryRecord({
      organizationId: organization._id,
      registeredBy: user.name,
      registeredById: user._id,
      userId: user._id,
      supplierId: recordData.supplierId || 'TEST-SUPPLIER-001',
      productTypeId: recordData.productTypeId || 'TEST-PRODUCT-001',
      temperature: recordData.temperature || '4°C',
      receptionDate: recordData.receptionDate || new Date(),
      docsOk: recordData.docsOk !== false,
      ...recordData.recordData
    });
    await record.save();
    
    return { record, user, organization };
  },
  
  // Generate JWT token for testing
  generateTestToken: (user, organization) => {
    const jwt = require('jsonwebtoken');
    
    return jwt.sign(
      {
        userId: user._id,
        organizationId: organization._id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  },
  
  // Wait for a specified time
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};