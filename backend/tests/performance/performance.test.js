const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');

// Import models
const User = require('../../models/User');
const Organization = require('../../models/Organization');
const DeliveryRecord = require('../../models/DeliveryRecord');

describe('Performance Tests', () => {
  let app;
  let token, userId, organizationId;

  beforeAll(async () => {
    // Setup test app
    app = express();
    app.use(express.json());
    
    const { auth } = require('../../middleware/auth-simple');
    
    // Create test routes
    app.get('/api/records', auth, async (req, res) => {
      try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        const records = await DeliveryRecord.find({ 
          organizationId: req.user.organizationId 
        })
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit);
        
        const total = await DeliveryRecord.countDocuments({ 
          organizationId: req.user.organizationId 
        });
        
        res.json({ 
          success: true, 
          data: records,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });
    
    app.post('/api/records', auth, async (req, res) => {
      try {
        const record = new DeliveryRecord({
          ...req.body,
          organizationId: req.user.organizationId,
          createdBy: req.user.id
        });
        await record.save();
        res.status(201).json({ success: true, data: record });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });
    
    app.get('/api/records/search', auth, async (req, res) => {
      try {
        const { q, supplier, product, dateFrom, dateTo } = req.query;
        const query = { organizationId: req.user.organizationId };
        
        if (q) {
          query.$or = [
            { supplier: { $regex: q, $options: 'i' } },
            { product: { $regex: q, $options: 'i' } },
            { notes: { $regex: q, $options: 'i' } }
          ];
        }
        
        if (supplier) {
          query.supplier = { $regex: supplier, $options: 'i' };
        }
        
        if (product) {
          query.product = { $regex: product, $options: 'i' };
        }
        
        if (dateFrom || dateTo) {
          query.date = {};
          if (dateFrom) query.date.$gte = new Date(dateFrom);
          if (dateTo) query.date.$lte = new Date(dateTo);
        }
        
        const records = await DeliveryRecord.find(query)
          .sort({ date: -1 })
          .limit(100);
        
        res.json({ success: true, data: records });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });
  });

  beforeEach(async () => {
    // Create test user and organization
    const { user, organization } = await global.testUtils.createTestUser({
      isEmailVerified: true
    });
    
    userId = user._id.toString();
    organizationId = organization._id.toString();
    token = global.testUtils.generateTestToken(user, organization);
  });

  describe('Database Query Performance', () => {
    test('should handle large dataset queries efficiently', async () => {
      // Create a large dataset
      const records = [];
      const batchSize = 1000;
      
      console.log('Creating test dataset...');
      for (let i = 0; i < batchSize; i++) {
        records.push({
          date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
          supplier: `Supplier ${i % 50}`, // 50 different suppliers
          product: `Product ${i % 100}`, // 100 different products
          quantity: Math.floor(Math.random() * 1000),
          temperature: Math.random() * 20 - 5,
          organizationId: new mongoose.Types.ObjectId(organizationId),
          createdBy: new mongoose.Types.ObjectId(userId),
          notes: `Test record ${i}`
        });
      }
      
      await DeliveryRecord.insertMany(records);
      console.log(`Created ${batchSize} test records`);

      // Test query performance
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/records?page=1&limit=50')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      const queryTime = Date.now() - startTime;
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(50);
      expect(response.body.pagination.total).toBe(batchSize);
      expect(queryTime).toBeLessThan(1000); // Should complete within 1 second
      
      console.log(`Query completed in ${queryTime}ms`);
    });

    test('should handle complex search queries efficiently', async () => {
      // Create test data with specific patterns
      const testRecords = [];
      for (let i = 0; i < 500; i++) {
        testRecords.push({
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
          supplier: i % 2 === 0 ? 'Fresh Foods Ltd' : 'Quality Supplies Inc',
          product: i % 3 === 0 ? 'Organic Vegetables' : 'Fresh Meat',
          quantity: Math.floor(Math.random() * 100),
          organizationId: new mongoose.Types.ObjectId(organizationId),
          createdBy: new mongoose.Types.ObjectId(userId),
          notes: i % 5 === 0 ? 'Special delivery instructions' : 'Standard delivery'
        });
      }
      
      await DeliveryRecord.insertMany(testRecords);

      // Test various search scenarios
      const searchTests = [
        { q: 'Fresh', expectedMin: 100 },
        { supplier: 'Fresh Foods', expectedMin: 200 },
        { product: 'Vegetables', expectedMin: 150 },
        { q: 'Special', expectedMin: 90 }
      ];

      for (const test of searchTests) {
        const startTime = Date.now();
        
        const response = await request(app)
          .get('/api/records/search')
          .query(test)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
        
        const queryTime = Date.now() - startTime;
        
        expect(response.body.success).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(test.expectedMin);
        expect(queryTime).toBeLessThan(500); // Should complete within 500ms
        
        console.log(`Search query "${JSON.stringify(test)}" completed in ${queryTime}ms, found ${response.body.data.length} records`);
      }
    });

    test('should handle date range queries efficiently', async () => {
      // Create records across different date ranges
      const records = [];
      const now = new Date();
      
      for (let i = 0; i < 1000; i++) {
        const daysAgo = Math.floor(Math.random() * 365);
        records.push({
          date: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000),
          supplier: `Supplier ${i % 20}`,
          product: `Product ${i % 30}`,
          quantity: Math.random() * 100,
          organizationId: new mongoose.Types.ObjectId(organizationId),
          createdBy: new mongoose.Types.ObjectId(userId)
        });
      }
      
      await DeliveryRecord.insertMany(records);

      // Test date range queries
      const dateRanges = [
        { days: 7, label: 'Last 7 days' },
        { days: 30, label: 'Last 30 days' },
        { days: 90, label: 'Last 90 days' }
      ];

      for (const range of dateRanges) {
        const dateFrom = new Date(now.getTime() - range.days * 24 * 60 * 60 * 1000);
        
        const startTime = Date.now();
        
        const response = await request(app)
          .get('/api/records/search')
          .query({
            dateFrom: dateFrom.toISOString(),
            dateTo: now.toISOString()
          })
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
        
        const queryTime = Date.now() - startTime;
        
        expect(response.body.success).toBe(true);
        expect(queryTime).toBeLessThan(300); // Should complete within 300ms
        
        console.log(`Date range query (${range.label}) completed in ${queryTime}ms, found ${response.body.data.length} records`);
      }
    });
  });

  describe('API Response Time Performance', () => {
    test('should handle concurrent requests efficiently', async () => {
      // Create some test data
      const records = [];
      for (let i = 0; i < 100; i++) {
        records.push({
          date: new Date(),
          supplier: `Supplier ${i}`,
          product: `Product ${i}`,
          quantity: i,
          organizationId: new mongoose.Types.ObjectId(organizationId),
          createdBy: new mongoose.Types.ObjectId(userId)
        });
      }
      await DeliveryRecord.insertMany(records);

      // Make concurrent requests
      const concurrentRequests = 10;
      const promises = [];
      
      const startTime = Date.now();
      
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .get('/api/records?page=1&limit=20')
            .set('Authorization', `Bearer ${token}`)
        );
      }
      
      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(20);
      });
      
      const avgResponseTime = totalTime / concurrentRequests;
      expect(avgResponseTime).toBeLessThan(1000); // Average response time should be under 1 second
      
      console.log(`${concurrentRequests} concurrent requests completed in ${totalTime}ms (avg: ${avgResponseTime}ms per request)`);
    });

    test('should handle bulk create operations efficiently', async () => {
      const bulkSize = 100;
      const promises = [];
      
      const startTime = Date.now();
      
      // Create multiple records concurrently
      for (let i = 0; i < bulkSize; i++) {
        promises.push(
          request(app)
            .post('/api/records')
            .set('Authorization', `Bearer ${token}`)
            .send({
              date: new Date().toISOString(),
              supplier: `Bulk Supplier ${i}`,
              product: `Bulk Product ${i}`,
              quantity: i
            })
        );
      }
      
      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      
      // All creates should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });
      
      const avgCreateTime = totalTime / bulkSize;
      expect(avgCreateTime).toBeLessThan(500); // Average create time should be under 500ms
      
      console.log(`${bulkSize} bulk create operations completed in ${totalTime}ms (avg: ${avgCreateTime}ms per create)`);
      
      // Verify all records were created
      const verifyResponse = await request(app)
        .get('/api/records?limit=200')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(verifyResponse.body.data.length).toBeGreaterThanOrEqual(bulkSize);
    });
  });

  describe('Memory Usage Performance', () => {
    test('should handle large result sets without memory issues', async () => {
      // Create a large dataset
      const largeDataset = [];
      for (let i = 0; i < 5000; i++) {
        largeDataset.push({
          date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
          supplier: `Supplier ${i % 100}`,
          product: `Product ${i % 200}`,
          quantity: Math.random() * 1000,
          organizationId: new mongoose.Types.ObjectId(organizationId),
          createdBy: new mongoose.Types.ObjectId(userId),
          notes: `Large dataset record ${i} with some additional text to increase memory usage`
        });
      }
      
      console.log('Creating large dataset...');
      await DeliveryRecord.insertMany(largeDataset);
      
      // Monitor memory usage
      const initialMemory = process.memoryUsage();
      
      // Perform paginated queries to avoid loading everything at once
      const pageSize = 100;
      const totalPages = Math.ceil(largeDataset.length / pageSize);
      
      for (let page = 1; page <= Math.min(totalPages, 10); page++) {
        const response = await request(app)
          .get(`/api/records?page=${page}&limit=${pageSize}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
        
        expect(response.body.success).toBe(true);
        expect(response.body.data.length).toBeLessThanOrEqual(pageSize);
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
      
      console.log(`Memory usage increased by ${Math.round(memoryIncrease / 1024 / 1024)}MB during large dataset processing`);
    });
  });

  describe('Database Connection Performance', () => {
    test('should handle connection pooling efficiently', async () => {
      // Test multiple simultaneous database operations
      const operations = [];
      
      // Mix of read and write operations
      for (let i = 0; i < 20; i++) {
        if (i % 2 === 0) {
          // Read operation
          operations.push(
            request(app)
              .get('/api/records?limit=10')
              .set('Authorization', `Bearer ${token}`)
          );
        } else {
          // Write operation
          operations.push(
            request(app)
              .post('/api/records')
              .set('Authorization', `Bearer ${token}`)
              .send({
                date: new Date().toISOString(),
                supplier: `Pool Test Supplier ${i}`,
                product: `Pool Test Product ${i}`,
                quantity: i
              })
          );
        }
      }
      
      const startTime = Date.now();
      const results = await Promise.all(operations);
      const totalTime = Date.now() - startTime;
      
      // All operations should succeed
      results.forEach((result, index) => {
        if (index % 2 === 0) {
          expect(result.status).toBe(200); // Read operations
        } else {
          expect(result.status).toBe(201); // Write operations
        }
      });
      
      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      console.log(`${operations.length} mixed database operations completed in ${totalTime}ms`);
    });
  });

  describe('Index Performance', () => {
    test('should verify database indexes are working effectively', async () => {
      // Create data that will benefit from indexes
      const records = [];
      for (let i = 0; i < 1000; i++) {
        records.push({
          date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
          supplier: `Supplier ${i % 50}`,
          product: `Product ${i % 100}`,
          quantity: Math.random() * 1000,
          organizationId: new mongoose.Types.ObjectId(organizationId),
          createdBy: new mongoose.Types.ObjectId(userId)
        });
      }
      
      await DeliveryRecord.insertMany(records);
      
      // Test queries that should use indexes
      const indexTests = [
        {
          name: 'Organization ID index',
          query: { organizationId: new mongoose.Types.ObjectId(organizationId) }
        },
        {
          name: 'Date index',
          query: { 
            organizationId: new mongoose.Types.ObjectId(organizationId),
            date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          name: 'Supplier index',
          query: { 
            organizationId: new mongoose.Types.ObjectId(organizationId),
            supplier: 'Supplier 1'
          }
        }
      ];
      
      for (const test of indexTests) {
        const startTime = Date.now();
        
        const result = await DeliveryRecord.find(test.query).limit(100);
        
        const queryTime = Date.now() - startTime;
        
        expect(result.length).toBeGreaterThan(0);
        expect(queryTime).toBeLessThan(100); // Should be very fast with proper indexing
        
        console.log(`${test.name} query completed in ${queryTime}ms, found ${result.length} records`);
      }
    });
  });
});