const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');

// Import models
const User = require('../../models/User');
const Organization = require('../../models/Organization');
const DeliveryRecord = require('../../models/DeliveryRecord');

describe('Multi-Tenant Integration Tests', () => {
  let app;
  let org1, org2;
  let user1, user2;
  let token1, token2;

  beforeAll(async () => {
    // Setup test app
    app = express();
    app.use(express.json());
    
    // Add auth middleware
    const { auth } = require('../../middleware/auth-simple');
    
    // Create test routes
    app.get('/api/test/records', auth, async (req, res) => {
      try {
        const records = await DeliveryRecord.find({ organizationId: req.user.organizationId });
        res.json({ success: true, data: records });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });
    
    app.post('/api/test/records', auth, async (req, res) => {
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
  });

  beforeEach(async () => {
    // Create two separate organizations with unique subdomains
    const timestamp = Date.now();
    
    org1 = await global.testUtils.createTestOrganization({
      name: 'Organization 1',
      subdomain: `org1-${timestamp}`
    });
    
    org2 = await global.testUtils.createTestOrganization({
      name: 'Organization 2',
      subdomain: `org2-${timestamp}`
    });

    // Create users for each organization
    const userData1 = await global.testUtils.createTestUser({
      email: `user1-${timestamp}@org1.com`,
      organizationName: 'Organization 1',
      organizationData: { _id: org1._id }
    });
    user1 = userData1.user;
    
    const userData2 = await global.testUtils.createTestUser({
      email: `user2-${timestamp}@org2.com`,
      organizationName: 'Organization 2',
      organizationData: { _id: org2._id }
    });
    user2 = userData2.user;

    // Generate tokens
    token1 = global.testUtils.generateTestToken(user1, org1);
    token2 = global.testUtils.generateTestToken(user2, org2);
  });

  describe('Data Isolation', () => {
    test('should only return data for user organization', async () => {
      // Create records for both organizations
      const record1 = new DeliveryRecord({
        organizationId: org1._id,
        registeredBy: user1.name,
        registeredById: user1._id,
        userId: user1._id,
        supplierId: 'SUPPLIER-001',
        productTypeId: 'PRODUCT-001',
        temperature: '4°C',
        receptionDate: new Date(),
        docsOk: true
      });
      await record1.save();

      const record2 = new DeliveryRecord({
        organizationId: org2._id,
        registeredBy: user2.name,
        registeredById: user2._id,
        userId: user2._id,
        supplierId: 'SUPPLIER-002',
        productTypeId: 'PRODUCT-002',
        temperature: '2°C',
        receptionDate: new Date(),
        docsOk: true
      });
      await record2.save();

      // User 1 should only see their organization's records
      const response1 = await request(app)
        .get('/api/test/records')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(response1.body.success).toBe(true);
      expect(response1.body.data).toHaveLength(1);
      expect(response1.body.data[0].supplierId).toBe('SUPPLIER-001');
      expect(response1.body.data[0].organizationId.toString()).toBe(org1._id.toString());

      // User 2 should only see their organization's records
      const response2 = await request(app)
        .get('/api/test/records')
        .set('Authorization', `Bearer ${token2}`)
        .expect(200);

      expect(response2.body.success).toBe(true);
      expect(response2.body.data).toHaveLength(1);
      expect(response2.body.data[0].supplierId).toBe('SUPPLIER-002');
      expect(response2.body.data[0].organizationId.toString()).toBe(org2._id.toString());
    });

    test('should automatically add organization context to new records', async () => {
      const recordData = {
        registeredBy: user1.name,
        registeredById: user1._id,
        userId: user1._id,
        supplierId: 'TEST-SUPPLIER',
        productTypeId: 'TEST-PRODUCT',
        temperature: '4°C',
        receptionDate: new Date(),
        docsOk: true
      };

      // Create record as user 1
      const response = await request(app)
        .post('/api/test/records')
        .set('Authorization', `Bearer ${token1}`)
        .send(recordData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.organizationId.toString()).toBe(org1._id.toString());
      expect(response.body.data.registeredById.toString()).toBe(user1._id.toString());

      // Verify in database
      const record = await DeliveryRecord.findById(response.body.data._id);
      expect(record.organizationId.toString()).toBe(org1._id.toString());
      expect(record.registeredById.toString()).toBe(user1._id.toString());
    });

    test('should prevent cross-tenant data access', async () => {
      // Create record for org1
      const record = new DeliveryRecord({
        organizationId: org1._id,
        registeredBy: user1.name,
        registeredById: user1._id,
        userId: user1._id,
        supplierId: 'ORG1-SUPPLIER',
        productTypeId: 'ORG1-PRODUCT',
        temperature: '4°C',
        receptionDate: new Date(),
        docsOk: true
      });
      await record.save();

      // Try to access with org2 user token
      const response = await request(app)
        .get('/api/test/records')
        .set('Authorization', `Bearer ${token2}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0); // Should not see org1's records
    });

    test('should handle organization deletion gracefully', async () => {
      // Create record for org1
      const record = new DeliveryRecord({
        organizationId: org1._id,
        registeredBy: user1.name,
        registeredById: user1._id,
        userId: user1._id,
        supplierId: 'TEST-SUPPLIER',
        productTypeId: 'TEST-PRODUCT',
        temperature: '4°C',
        receptionDate: new Date(),
        docsOk: true
      });
      await record.save();

      // Delete organization
      await Organization.findByIdAndDelete(org1._id);

      // User should get appropriate error
      const response = await request(app)
        .get('/api/test/records')
        .set('Authorization', `Bearer ${token1}`)
        .expect(401); // Should fail authentication due to invalid org

      expect(response.body.success).toBe(false);
    });
  });

  describe('User Role Management', () => {
    test('should respect user roles within organization', async () => {
      const timestamp = Date.now();
      
      // Create admin user
      const adminData = await global.testUtils.createTestUser({
        email: `admin-${timestamp}@org1.com`,
        role: 'Admin',
        organizationData: { _id: org1._id }
      });
      const adminUser = adminData.user;
      const adminToken = global.testUtils.generateTestToken(adminUser, org1);

      // Create regular user
      const regularData = await global.testUtils.createTestUser({
        email: `regular-${timestamp}@org1.com`,
        role: 'User',
        organizationData: { _id: org1._id }
      });
      const regularUser = regularData.user;
      const regularToken = global.testUtils.generateTestToken(regularUser, org1);

      // Both should be able to access their organization's data
      const adminResponse = await request(app)
        .get('/api/test/records')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const regularResponse = await request(app)
        .get('/api/test/records')
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(200);

      expect(adminResponse.body.success).toBe(true);
      expect(regularResponse.body.success).toBe(true);
    });

    test('should prevent access for inactive users', async () => {
      const timestamp = Date.now();
      
      // Create inactive user
      const inactiveData = await global.testUtils.createTestUser({
        email: `inactive-${timestamp}@org1.com`,
        userData: { isActive: false },
        organizationData: { _id: org1._id }
      });
      const inactiveUser = inactiveData.user;
      const inactiveToken = global.testUtils.generateTestToken(inactiveUser, org1);

      const response = await request(app)
        .get('/api/test/records')
        .set('Authorization', `Bearer ${inactiveToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Organization Settings', () => {
    test('should isolate organization settings', async () => {
      // Update org1 settings
      org1.settings = {
        establishmentInfo: {
          name: 'Org1 Restaurant',
          address: '123 Main St'
        }
      };
      await org1.save();

      // Update org2 settings
      org2.settings = {
        establishmentInfo: {
          name: 'Org2 Restaurant',
          address: '456 Oak Ave'
        }
      };
      await org2.save();

      // Verify settings are isolated
      const updatedOrg1 = await Organization.findById(org1._id);
      const updatedOrg2 = await Organization.findById(org2._id);

      expect(updatedOrg1.settings.establishmentInfo.name).toBe('Org1 Restaurant');
      expect(updatedOrg2.settings.establishmentInfo.name).toBe('Org2 Restaurant');
      expect(updatedOrg1.settings.establishmentInfo.address).not.toBe(updatedOrg2.settings.establishmentInfo.address);
    });

    test('should handle organization subdomain uniqueness', async () => {
      // Try to create organization with existing subdomain
      const duplicateOrg = new Organization({
        name: 'Duplicate Org',
        subdomain: org1.subdomain // Same as org1
      });

      await expect(duplicateOrg.save()).rejects.toThrow();
    });
  });

  describe('Database Queries Performance', () => {
    test('should use organization index for efficient queries', async () => {
      // Create multiple records for different organizations
      const records = [];
      for (let i = 0; i < 100; i++) {
        const isOrg1 = i % 2 === 0;
        const user = isOrg1 ? user1 : user2;
        const org = isOrg1 ? org1 : org2;
        
        records.push({
          organizationId: org._id,
          registeredBy: user.name,
          registeredById: user._id,
          userId: user._id,
          supplierId: `SUPPLIER-${i.toString().padStart(3, '0')}`,
          productTypeId: `PRODUCT-${i.toString().padStart(3, '0')}`,
          temperature: '4°C',
          receptionDate: new Date(),
          docsOk: true
        });
      }
      await DeliveryRecord.insertMany(records);

      // Query should be fast due to organization index
      const startTime = Date.now();
      const org1Records = await DeliveryRecord.find({ organizationId: org1._id });
      const queryTime = Date.now() - startTime;

      expect(org1Records).toHaveLength(50);
      expect(queryTime).toBeLessThan(100); // Should be very fast with proper indexing
    });
  });

  describe('Data Migration Scenarios', () => {
    test('should handle organization data migration', async () => {
      // Simulate migrating data from one organization to another
      const sourceRecord = new DeliveryRecord({
        organizationId: org1._id,
        registeredBy: user1.name,
        registeredById: user1._id,
        userId: user1._id,
        supplierId: 'SOURCE-SUPPLIER',
        productTypeId: 'SOURCE-PRODUCT',
        temperature: '4°C',
        receptionDate: new Date(),
        docsOk: true
      });
      await sourceRecord.save();

      // Migrate to org2
      sourceRecord.organizationId = org2._id;
      sourceRecord.registeredBy = user2.name;
      sourceRecord.registeredById = user2._id;
      sourceRecord.userId = user2._id;
      await sourceRecord.save();

      // Verify migration
      const org1Records = await DeliveryRecord.find({ organizationId: org1._id });
      const org2Records = await DeliveryRecord.find({ organizationId: org2._id });

      expect(org1Records).toHaveLength(0);
      expect(org2Records).toHaveLength(1);
      expect(org2Records[0].supplierId).toBe('SOURCE-SUPPLIER');
    });
  });
});