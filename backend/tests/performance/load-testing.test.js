/**
 * Load Testing Suite
 * Tests system performance under various load conditions
 */
const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../../server');
const User = require('../../models/User');
const Organization = require('../../models/Organization');

describe('Load Testing Suite', () => {
  let testOrg;
  let testUser;
  let authToken;
  let testData = [];

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/autocontrol-test');
    
    // Create test organization and user
    testOrg = await Organization.create({
      name: 'Load Test Organization',
      subdomain: 'loadtest',
      isActive: true,
      subscriptionStatus: 'active'
    });

    const bcrypt = require('bcrypt');
    testUser = await User.create({
      name: 'Load Test User',
      email: 'loadtest@test.com',
      password: await bcrypt.hash('password123', 10),
      organizationId: testOrg._id,
      role: 'admin',
      isActive: true,
      emailVerified: true
    });

    authToken = jwt.sign(
      { 
        userId: testUser._id, 
        organizationId: testOrg._id,
        role: 'admin'
      },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Pre-populate test data
    for (let i = 0; i < 1000; i++) {
      testData.push({
        producto: `Load Test Product ${i}`,
        lote: `LOAD-${String(i).padStart(4, '0')}`,
        cantidad: Math.floor(Math.random() * 1000) + 1,
        fechaCaducidad: new Date(Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
    }
  });

  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({});
    await Organization.deleteMany({});
    await mongoose.connection.close();
  });

  describe('Authentication Load Tests', () => {
    test('should handle concurrent login requests', async () => {
      const concurrentLogins = 50;
      const loginData = {
        email: testUser.email,
        password: 'password123'
      };

      const startTime = Date.now();
      
      const promises = Array(concurrentLogins).fill().map(() =>
        request(app)
          .post('/api/auth/login')
          .send(loginData)
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All requests should succeed
      const successfulLogins = responses.filter(r => r.status === 200).length;
      expect(successfulLogins).toBe(concurrentLogins);

      // Should complete within reasonable time
      expect(duration).toBeLessThan(10000); // 10 seconds
      
      // Average response time should be reasonable
      const avgResponseTime = duration / concurrentLogins;
      expect(avgResponseTime).toBeLessThan(200); // 200ms average

      console.log(`Concurrent logins: ${concurrentLogins}, Duration: ${duration}ms, Avg: ${avgResponseTime}ms`);
    });

    test('should handle token validation under load', async () => {
      const concurrentRequests = 100;
      
      const startTime = Date.now();
      
      const promises = Array(concurrentRequests).fill().map(() =>
        request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All requests should succeed
      const successfulRequests = responses.filter(r => r.status === 200).length;
      expect(successfulRequests).toBe(concurrentRequests);

      // Performance metrics
      expect(duration).toBeLessThan(5000); // 5 seconds
      const avgResponseTime = duration / concurrentRequests;
      expect(avgResponseTime).toBeLessThan(50); // 50ms average

      console.log(`Token validations: ${concurrentRequests}, Duration: ${duration}ms, Avg: ${avgResponseTime}ms`);
    });
  });

  describe('Storage Operations Load Tests', () => {
    test('should handle bulk storage creation efficiently', async () => {
      const batchSize = 100;
      const batches = 5;
      
      const results = [];
      
      for (let batch = 0; batch < batches; batch++) {
        const batchData = testData.slice(batch * batchSize, (batch + 1) * batchSize);
        
        const startTime = Date.now();
        
        const response = await request(app)
          .post('/api/storage/bulk')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ records: batchData })
          .expect(201);
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        results.push({
          batch: batch + 1,
          records: batchSize,
          duration,
          recordsPerSecond: (batchSize / duration) * 1000
        });
        
        expect(response.body.success).toBe(true);
        expect(response.body.data.created).toBe(batchSize);
        expect(duration).toBeLessThan(3000); // 3 seconds per batch
      }
      
      const totalRecords = batches * batchSize;
      const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
      const avgRecordsPerSecond = (totalRecords / totalDuration) * 1000;
      
      console.log(`Bulk creation: ${totalRecords} records, Total: ${totalDuration}ms, Rate: ${avgRecordsPerSecond.toFixed(2)} records/sec`);
      
      // Should process at least 50 records per second
      expect(avgRecordsPerSecond).toBeGreaterThan(50);
    });

    test('should handle concurrent storage queries', async () => {
      const concurrentQueries = 50;
      const queryTypes = [
        () => request(app).get('/api/storage').set('Authorization', `Bearer ${authToken}`),
        () => request(app).get('/api/storage/search').query({ q: 'Product' }).set('Authorization', `Bearer ${authToken}`),
        () => request(app).get('/api/storage').query({ limit: 20, page: 1 }).set('Authorization', `Bearer ${authToken}`),
        () => request(app).get('/api/storage').query({ sortBy: 'fechaCreacion' }).set('Authorization', `Bearer ${authToken}`)
      ];
      
      const startTime = Date.now();
      
      const promises = Array(concurrentQueries).fill().map((_, index) => {
        const queryType = queryTypes[index % queryTypes.length];
        return queryType();
      });
      
      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // All queries should succeed
      const successfulQueries = responses.filter(r => r.status === 200).length;
      expect(successfulQueries).toBe(concurrentQueries);
      
      // Performance metrics
      expect(duration).toBeLessThan(8000); // 8 seconds
      const avgResponseTime = duration / concurrentQueries;
      expect(avgResponseTime).toBeLessThan(160); // 160ms average
      
      console.log(`Concurrent queries: ${concurrentQueries}, Duration: ${duration}ms, Avg: ${avgResponseTime}ms`);
    });

    test('should handle large dataset pagination efficiently', async () => {
      const pageSize = 50;
      const pagesToTest = 10;
      const results = [];
      
      for (let page = 1; page <= pagesToTest; page++) {
        const startTime = Date.now();
        
        const response = await request(app)
          .get('/api/storage')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ 
            limit: pageSize,
            page: page,
            sortBy: 'fechaCreacion',
            sortOrder: 'desc'
          })
          .expect(200);
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        results.push({
          page,
          duration,
          recordsReturned: response.body.data.records.length
        });
        
        expect(response.body.success).toBe(true);
        expect(duration).toBeLessThan(1000); // 1 second per page
      }
      
      const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      console.log(`Pagination test: ${pagesToTest} pages, Avg duration: ${avgDuration.toFixed(2)}ms`);
      
      // Average page load should be under 500ms
      expect(avgDuration).toBeLessThan(500);
    });
  });

  describe('Delivery Operations Load Tests', () => {
    test('should handle concurrent delivery creation', async () => {
      const concurrentDeliveries = 25;
      
      const deliveryData = {
        cliente: 'Load Test Client',
        fechaEntrega: new Date().toISOString(),
        productos: [
          {
            producto: 'Load Test Product 1',
            cantidad: 10,
            lote: 'LOAD-0001'
          }
        ]
      };
      
      const startTime = Date.now();
      
      const promises = Array(concurrentDeliveries).fill().map((_, index) => 
        request(app)
          .post('/api/deliveries')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            ...deliveryData,
            cliente: `${deliveryData.cliente} ${index + 1}`
          })
      );
      
      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // All deliveries should be created successfully
      const successfulDeliveries = responses.filter(r => r.status === 201).length;
      expect(successfulDeliveries).toBe(concurrentDeliveries);
      
      // Performance metrics
      expect(duration).toBeLessThan(6000); // 6 seconds
      const avgResponseTime = duration / concurrentDeliveries;
      expect(avgResponseTime).toBeLessThan(240); // 240ms average
      
      console.log(`Concurrent deliveries: ${concurrentDeliveries}, Duration: ${duration}ms, Avg: ${avgResponseTime}ms`);
    });
  });

  describe('Analytics Load Tests', () => {
    test('should handle analytics queries under load', async () => {
      const concurrentAnalytics = 20;
      const analyticsEndpoints = [
        '/api/analytics/dashboard',
        '/api/analytics/inventory',
        '/api/analytics/deliveries',
        '/api/analytics/summary'
      ];
      
      const startTime = Date.now();
      
      const promises = Array(concurrentAnalytics).fill().map((_, index) => {
        const endpoint = analyticsEndpoints[index % analyticsEndpoints.length];
        return request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${authToken}`)
          .query({ 
            fechaDesde: '2024-01-01',
            fechaHasta: '2024-12-31'
          });
      });
      
      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // All analytics queries should succeed
      const successfulQueries = responses.filter(r => r.status === 200).length;
      expect(successfulQueries).toBe(concurrentAnalytics);
      
      // Performance metrics
      expect(duration).toBeLessThan(10000); // 10 seconds
      const avgResponseTime = duration / concurrentAnalytics;
      expect(avgResponseTime).toBeLessThan(500); // 500ms average
      
      console.log(`Analytics queries: ${concurrentAnalytics}, Duration: ${duration}ms, Avg: ${avgResponseTime}ms`);
    });
  });

  describe('Database Performance Tests', () => {
    test('should handle complex aggregation queries efficiently', async () => {
      const complexQueries = [
        () => request(app).get('/api/analytics/inventory-trends').set('Authorization', `Bearer ${authToken}`),
        () => request(app).get('/api/analytics/expiration-report').set('Authorization', `Bearer ${authToken}`),
        () => request(app).get('/api/analytics/delivery-performance').set('Authorization', `Bearer ${authToken}`),
        () => request(app).get('/api/analytics/product-movement').set('Authorization', `Bearer ${authToken}`)
      ];
      
      const results = [];
      
      for (const query of complexQueries) {
        const startTime = Date.now();
        const response = await query();
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        results.push({
          endpoint: response.request.path,
          duration,
          success: response.status === 200
        });
        
        expect(response.status).toBe(200);
        expect(duration).toBeLessThan(3000); // 3 seconds max
      }
      
      const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      console.log(`Complex queries avg duration: ${avgDuration.toFixed(2)}ms`);
      
      // Average complex query should complete under 2 seconds
      expect(avgDuration).toBeLessThan(2000);
    });

    test('should maintain performance with large datasets', async () => {
      // Test with different dataset sizes
      const testSizes = [100, 500, 1000];
      const results = [];
      
      for (const size of testSizes) {
        const startTime = Date.now();
        
        const response = await request(app)
          .get('/api/storage')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ 
            limit: size,
            includeAnalytics: true
          });
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        results.push({
          size,
          duration,
          recordsPerMs: size / duration
        });
        
        expect(response.status).toBe(200);
        expect(response.body.data.records.length).toBeLessThanOrEqual(size);
      }
      
      // Performance should not degrade significantly with larger datasets
      const smallDatasetRate = results[0].recordsPerMs;
      const largeDatasetRate = results[results.length - 1].recordsPerMs;
      const performanceDegradation = (smallDatasetRate - largeDatasetRate) / smallDatasetRate;
      
      console.log('Dataset performance:', results);
      
      // Performance degradation should be less than 50%
      expect(performanceDegradation).toBeLessThan(0.5);
    });
  });

  describe('Memory and Resource Usage Tests', () => {
    test('should not have memory leaks during sustained load', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform sustained operations
      for (let i = 0; i < 10; i++) {
        const promises = Array(20).fill().map(() =>
          request(app)
            .get('/api/storage')
            .set('Authorization', `Bearer ${authToken}`)
        );
        
        await Promise.all(promises);
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreasePercent = (memoryIncrease / initialMemory.heapUsed) * 100;
      
      console.log(`Memory usage - Initial: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB, Final: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB, Increase: ${memoryIncreasePercent.toFixed(2)}%`);
      
      // Memory increase should be reasonable (less than 50%)
      expect(memoryIncreasePercent).toBeLessThan(50);
    });
  });

  describe('Error Handling Under Load', () => {
    test('should handle errors gracefully under load', async () => {
      const concurrentRequests = 30;
      const invalidRequests = 10;
      
      const promises = [];
      
      // Add valid requests
      for (let i = 0; i < concurrentRequests - invalidRequests; i++) {
        promises.push(
          request(app)
            .get('/api/storage')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }
      
      // Add invalid requests
      for (let i = 0; i < invalidRequests; i++) {
        promises.push(
          request(app)
            .post('/api/storage')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ invalid: 'data' }) // Invalid data
        );
      }
      
      const responses = await Promise.all(promises);
      
      const successfulResponses = responses.filter(r => r.status === 200).length;
      const errorResponses = responses.filter(r => r.status >= 400).length;
      
      expect(successfulResponses).toBe(concurrentRequests - invalidRequests);
      expect(errorResponses).toBe(invalidRequests);
      
      // All error responses should have proper error structure
      responses.filter(r => r.status >= 400).forEach(response => {
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBeDefined();
      });
    });
  });
});