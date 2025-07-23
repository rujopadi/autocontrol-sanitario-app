// Simple CORS test script
const axios = require('axios');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

async function testCORS() {
  console.log('🧪 Testing CORS configuration...');
  console.log(`📡 Backend URL: ${BACKEND_URL}`);
  
  try {
    // Test basic health check
    console.log('\n1. Testing health endpoint...');
    const healthResponse = await axios.get(`${BACKEND_URL}/health`);
    console.log('✅ Health check:', healthResponse.data);
    
    // Test CORS endpoint
    console.log('\n2. Testing CORS endpoint...');
    const corsResponse = await axios.get(`${BACKEND_URL}/api/cors-test`);
    console.log('✅ CORS test:', corsResponse.data);
    
    // Test preflight request simulation
    console.log('\n3. Testing OPTIONS request...');
    const optionsResponse = await axios.options(`${BACKEND_URL}/api/auth/register`);
    console.log('✅ OPTIONS request:', optionsResponse.status, optionsResponse.statusText);
    
    console.log('\n🎉 All CORS tests passed!');
    
  } catch (error) {
    console.error('\n❌ CORS test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
      console.error('Data:', error.response.data);
    } else if (error.request) {
      console.error('No response received:', error.message);
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Run the test
testCORS();