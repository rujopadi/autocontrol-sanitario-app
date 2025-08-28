/**
 * Jest Global Teardown
 * Runs once after all test suites
 */

module.exports = async () => {
  // Stop the in-memory MongoDB instance
  if (global.__MONGOD__) {
    await global.__MONGOD__.stop();
    console.log('🛑 MongoDB test instance stopped');
  }
  
  console.log('✅ Global test teardown completed');
};