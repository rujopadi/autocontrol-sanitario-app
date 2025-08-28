/**
 * Jest Global Setup
 * Runs once before all test suites
 */

const { MongoMemoryServer } = require('mongodb-memory-server');

module.exports = async () => {
  // Start in-memory MongoDB instance for testing
  const mongod = new MongoMemoryServer({
    instance: {
      port: 27017,
      dbName: 'autocontrol-test'
    }
  });
  
  await mongod.start();
  
  // Store the instance globally so it can be stopped in teardown
  global.__MONGOD__ = mongod;
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.MONGODB_TEST_URI = mongod.getUri();
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
  process.env.PORT = '5001'; // Different port for testing
  
  console.log('🚀 Global test setup completed');
  console.log(`📊 MongoDB Test URI: ${process.env.MONGODB_TEST_URI}`);
};