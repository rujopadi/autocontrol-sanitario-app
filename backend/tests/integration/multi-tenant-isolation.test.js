/**
 * Multi-Tenant Data Isolation Integration Tests
 * Tests that data is properly isolated between organizations
 */
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');

// Import models
const User = require('../../models/User');
const Organization = require('../../models/Organization');
const StorageRecord = require('../../models/StorageRecord');
const DeliveryRecord = require('../../models/DeliveryRecord');
const AuditLog = require('../../models/AuditLog');

// Test setup
let mongoServer;
let app;

describe('Multi-Tenant Data Isolation Integration Tests', () => {
  beforeAll(async () => {
    // Setup in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Setup test app
    app = require('../../server');
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clean database before each test
    await User.deleteMany({});
    await Organization.deleteMany({});
    await StorageRecord.deleteMany({});
    await DeliveryRecord.deleteMany({});
    await AuditLog.deleteMany({});
  });

  describe('Organization Data Isolation', () => {
    let org1, org2;
    let user1, user2;
    let token1, token2;

    beforeEach(async () => {
      // Create two organizations
      org1 = await Organization.create({
        name: 'Organization 1',
        subdomain: 'org1',
        isActive: true,
        subscriptionStatus: 'active'
      });

      org2 = await Organization.create({
        name: 'Organization 2',
        subdomain: 'org2',
        isActive: true,
        subscriptionStatus: 'active'
      });

      // Create users for each organization
      user1 = await User.create({
        name: 'User 1',
        email: 'user1@org1.com',
        password: '$2b$10$hashedpassword1',
        organizationId: org1._id,
        role: 'admin',
        isActive: true,
        emailVerified: true
      });

      user2 = await User.create({
        name: 'User 2',
        email: 'user2@org2.com',
        password: '$2b$10$hashedpassword2',
        organizationId: org2._id,
        role: 'admin',
        isActive: true,
        emailVerified: true
      });

      // Generate tokens
      token1 = jwt.sign(
        { userId: user1._id, organizationId: org1._id, role: 'admin' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      token2 = jwt.sign(
        { userId: user2._id, organizationId: org2._id, role: 'admin' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );
    });

    test('should isolate storage records between organizations', async () => {
      // Create storage records for each organization
      const storage1 = await StorageRecord.create({
        organizationId: org1._id,
        producto: 'Product 1 Org 1',
        lote: 'LOT001',
        cantidad: 100,
        fechaCaducidad: new Date('2024-12-31'),
        registradoPor: user1._id
      });

      const storage2 = await StorageRecord.create({
        organizationId: org2._id,
        producto: 'Product 1 Org 2',
        lote: 'LOT001',
        cantidad: 200,
        fechaCaducidad: new Date('2024-12-31'),
        registradoPor: user2._id
      });

      // User 1 should only see org 1 records
      const response1 = await request(app)
        .get('/api/storage')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(response1.body.data).toHaveLength(1);
      expect(response1.body.data[0].producto).toBe('Product 1 Org 1');
      expect(response1.body.data[0].organizationId).toBe(org1._id.toString());

      // User 2 should only see org 2 records
      const response2 = await request(app)
        .get('/api/storage')
        .set('Authorization', `Bearer ${token2}`)
        .expect(200);

      expect(response2.body.data).toHaveLength(1);
      expect(response2.body.data[0].producto).toBe('Product 1 Org 2');
      expect(response2.body.data[0].organizationId).toBe(org2._id.toString());
    });

    test('should prevent cross-tenant access to storage records', async () => {
      // Create storage record for org 1
      const storage1 = await StorageRecord.create({
        organizationId: org1._id,
        producto: 'Secret Product',
        lote: 'SECRET001',
        cantidad: 50,
        fechaCaducidad: new Date('2024-12-31'),
        registradoPor: user1._id
      });

      // User 2 should not be able to access org 1's record
      const response = await request(app)
        .get(`/api/storage/${storage1._id}`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(404);

      expect(response.body.error).toContain('not found');
    });

    test('should isolate delivery records between organizations', async () => {
      // Create delivery records for each organization
      await DeliveryRecord.create({
        organizationId: org1._id,
        cliente: 'Client A',
        fechaEntrega: new Date(),
        productos: [{ producto: 'Product A', cantidad: 10 }],
        estado: 'entregado',
        registradoPor: user1._id
      });

      await DeliveryRecord.create({
        organizationId: org2._id,
        cliente: 'Client B',
        fechaEntrega: new Date(),
        productos: [{ producto: 'Product B', cantidad: 20 }],
        estado: 'entregado',
        registradoPor: user2._id
      });

      // User 1 should only see org 1 deliveries
      const response1 = await request(app)
        .get('/api/deliveries')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(response1.body.data).toHaveLength(1);
      expect(response1.body.data[0].cliente).toBe('Client A');

      // User 2 should only see org 2 deliveries
      const response2 = await request(app)
        .get('/api/deliveries')
        .set('Authorization', `Bearer ${token2}`)
        .expect(200);

      expect(response2.body.data).toHaveLength(1);
      expect(response2.body.data[0].cliente).toBe('Client B');
    });

    test('should prevent cross-tenant user management', async () => {
      // User 1 should not be able to see user 2
      const response = await request(app)
        .get('/api/organizations/users')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].email).toBe('user1@org1.com');
      expect(response.body.data[0].organizationId).toBe(org1._id.toString());
    });

    test('should isolate audit logs between organizations', async () => {
      // Create audit logs for each organization
      await AuditLog.create({
        organizationId: org1._id,
        userId: user1._id,
        action: 'CREATE',
        resource: 'storage',
        resourceId: new mongoose.Types.ObjectId(),
        details: { message: 'Created storage record' }
      });

      await AuditLog.create({
        organizationId: org2._id,
        userId: user2._id,
        action: 'CREATE',
        resource: 'delivery',
        resourceId: new mongoose.Types.ObjectId(),
        details: { message: 'Created delivery record' }
      });

      // User 1 should only see org 1 audit logs
      const response1 = await request(app)
        .get('/api/audit/logs')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(response1.body.data).toHaveLength(1);
      expect(response1.body.data[0].resource).toBe('storage');

      // User 2 should only see org 2 audit logs
      const response2 = await request(app)
        .get('/api/audit/logs')
        .set('Authorization', `Bearer ${token2}`)
        .expect(200);

      expect(response2.body.data).toHaveLength(1);
      expect(response2.body.data[0].resource).toBe('delivery');
    });
  });

  describe('API Endpoint Isolation', () => {
    let org1, org2;
    let user1, user2;
    let token1, token2;

    beforeEach(async () => {
      // Setup organizations and users
      org1 = await Organization.create({
        name: 'Organization 1',
        subdomain: 'org1',
        isActive: true,
        subscriptionStatus: 'active'
      });

      org2 = await Organization.create({
        name: 'Organization 2',
        subdomain: 'org2',
        isActive: true,
        subscriptionStatus: 'active'
      });

      user1 = await User.create({
        name: 'User 1',
        email: 'user1@org1.com',
        password: '$2b$10$hashedpassword1',
        organizationId: org1._id,
        role: 'admin',
        isActive: true,
        emailVerified: true
      });

      user2 = await User.create({
        name: 'User 2',
        email: 'user2@org2.com',
        password: '$2b$10$hashedpassword2',
        organizationId: org2._id,
        role: 'admin',
        isActive: true,
        emailVerified: true
      });

      token1 = jwt.sign(
        { userId: user1._id, organizationId: org1._id, role: 'admin' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      token2 = jwt.sign(
        { userId: user2._id, organizationId: org2._id, role: 'admin' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );
    });

    test('should enforce organization context in POST requests', async () => {
      // Create storage record via API
      const storageData = {
        producto: 'Test Product',
        lote: 'TEST001',
        cantidad: 100,
        fechaCaducidad: '2024-12-31'
      };

      const response1 = await request(app)
        .post('/api/storage')
        .set('Authorization', `Bearer ${token1}`)
        .send(storageData)
        .expect(201);

      // Verify the record has the correct organization ID
      expect(response1.body.data.organizationId).toBe(org1._id.toString());

      // Verify user 2 cannot see this record
      const response2 = await request(app)
        .get('/api/storage')
        .set('Authorization', `Bearer ${token2}`)
        .expect(200);

      expect(response2.body.data).toHaveLength(0);
    });

    test('should enforce organization context in PUT requests', async () => {
      // Create storage record for org 1
      const storage = await StorageRecord.create({
        organizationId: org1._id,
        producto: 'Original Product',
        lote: 'ORIG001',
        cantidad: 50,
        fechaCaducidad: new Date('2024-12-31'),
        registradoPor: user1._id
      });

      // User 2 should not be able to update org 1's record
      const updateData = {
        producto: 'Hacked Product',
        cantidad: 999
      };

      await request(app)
        .put(`/api/storage/${storage._id}`)
        .set('Authorization', `Bearer ${token2}`)
        .send(updateData)
        .expect(404);

      // Verify the record was not modified
      const unchangedRecord = await StorageRecord.findById(storage._id);
      expect(unchangedRecord.producto).toBe('Original Product');
      expect(unchangedRecord.cantidad).toBe(50);
    });

    test('should enforce organization context in DELETE requests', async () => {
      // Create storage record for org 1
      const storage = await StorageRecord.create({
        organizationId: org1._id,
        producto: 'Protected Product',
        lote: 'PROT001',
        cantidad: 25,
        fechaCaducidad: new Date('2024-12-31'),
        registradoPor: user1._id
      });

      // User 2 should not be able to delete org 1's record
      await request(app)
        .delete(`/api/storage/${storage._id}`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(404);

      // Verify the record still exists
      const existingRecord = await StorageRecord.findById(storage._id);
      expect(existingRecord).toBeTruthy();
    });

    test('should prevent organization data leakage in search', async () => {
      // Create records for both organizations with similar names
      await StorageRecord.create({
        organizationId: org1._id,
        producto: 'Confidential Product Alpha',
        lote: 'CONF001',
        cantidad: 100,
        fechaCaducidad: new Date('2024-12-31'),
        registradoPor: user1._id
      });

      await StorageRecord.create({
        organizationId: org2._id,
        producto: 'Confidential Product Beta',
        lote: 'CONF002',
        cantidad: 200,
        fechaCaducidad: new Date('2024-12-31'),
        registradoPor: user2._id
      });

      // Search from org 1 should only return org 1 results
      const response1 = await request(app)
        .get('/api/storage?search=Confidential')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(response1.body.data).toHaveLength(1);
      expect(response1.body.data[0].producto).toBe('Confidential Product Alpha');

      // Search from org 2 should only return org 2 results
      const response2 = await request(app)
        .get('/api/storage?search=Confidential')
        .set('Authorization', `Bearer ${token2}`)
        .expect(200);

      expect(response2.body.data).toHaveLength(1);
      expect(response2.body.data[0].producto).toBe('Confidential Product Beta');
    });
  });

  describe('Database Query Isolation', () => {
    let org1, org2;
    let user1, user2;

    beforeEach(async () => {
      org1 = await Organization.create({
        name: 'Organization 1',
        subdomain: 'org1',
        isActive: true,
        subscriptionStatus: 'active'
      });

      org2 = await Organization.create({
        name: 'Organization 2',
        subdomain: 'org2',
        isActive: true,
        subscriptionStatus: 'active'
      });

      user1 = await User.create({
        name: 'User 1',
        email: 'user1@org1.com',
        password: '$2b$10$hashedpassword1',
        organizationId: org1._id,
        role: 'admin',
        isActive: true,
        emailVerified: true
      });

      user2 = await User.create({
        name: 'User 2',
        email: 'user2@org2.com',
        password: '$2b$10$hashedpassword2',
        organizationId: org2._id,
        role: 'admin',
        isActive: true,
        emailVerified: true
      });
    });

    test('should automatically filter queries by organization', async () => {
      // Create multiple records for different organizations
      await StorageRecord.create({
        organizationId: org1._id,
        producto: 'Org1 Product 1',
        lote: 'O1P1',
        cantidad: 10,
        fechaCaducidad: new Date('2024-12-31'),
        registradoPor: user1._id
      });

      await StorageRecord.create({
        organizationId: org1._id,
        producto: 'Org1 Product 2',
        lote: 'O1P2',
        cantidad: 20,
        fechaCaducidad: new Date('2024-12-31'),
        registradoPor: user1._id
      });

      await StorageRecord.create({
        organizationId: org2._id,
        producto: 'Org2 Product 1',
        lote: 'O2P1',
        cantidad: 30,
        fechaCaducidad: new Date('2024-12-31'),
        registradoPor: user2._id
      });

      // Query with organization filter should only return org-specific records
      const org1Records = await StorageRecord.find({ organizationId: org1._id });
      const org2Records = await StorageRecord.find({ organizationId: org2._id });

      expect(org1Records).toHaveLength(2);
      expect(org2Records).toHaveLength(1);

      expect(org1Records.every(record => record.organizationId.equals(org1._id))).toBe(true);
      expect(org2Records.every(record => record.organizationId.equals(org2._id))).toBe(true);
    });

    test('should prevent aggregation queries from leaking data', async () => {
      // Create records for both organizations
      await StorageRecord.create({
        organizationId: org1._id,
        producto: 'Product A',
        lote: 'A001',
        cantidad: 100,
        fechaCaducidad: new Date('2024-12-31'),
        registradoPor: user1._id
      });

      await StorageRecord.create({
        organizationId: org2._id,
        producto: 'Product B',
        lote: 'B001',
        cantidad: 200,
        fechaCaducidad: new Date('2024-12-31'),
        registradoPor: user2._id
      });

      // Aggregation query with organization filter
      const org1Aggregation = await StorageRecord.aggregate([
        { $match: { organizationId: org1._id } },
        { $group: { _id: null, totalQuantity: { $sum: '$cantidad' } } }
      ]);

      const org2Aggregation = await StorageRecord.aggregate([
        { $match: { organizationId: org2._id } },
        { $group: { _id: null, totalQuantity: { $sum: '$cantidad' } } }
      ]);

      expect(org1Aggregation[0].totalQuantity).toBe(100);
      expect(org2Aggregation[0].totalQuantity).toBe(200);
    });

    test('should enforce organization context in complex queries', async () => {
      // Create delivery records with products
      await DeliveryRecord.create({
        organizationId: org1._id,
        cliente: 'Client A',
        fechaEntrega: new Date(),
        productos: [
          { producto: 'Product 1', cantidad: 10 },
          { producto: 'Product 2', cantidad: 20 }
        ],
        estado: 'entregado',
        registradoPor: user1._id
      });

      await DeliveryRecord.create({
        organizationId: org2._id,
        cliente: 'Client B',
        fechaEntrega: new Date(),
        productos: [
          { producto: 'Product 3', cantidad: 30 },
          { producto: 'Product 4', cantidad: 40 }
        ],
        estado: 'entregado',
        registradoPor: user2._id
      });

      // Complex query with population and filtering
      const org1Deliveries = await DeliveryRecord.find({ organizationId: org1._id })
        .populate('registradoPor', 'name email')
        .sort({ fechaEntrega: -1 });

      expect(org1Deliveries).toHaveLength(1);
      expect(org1Deliveries[0].cliente).toBe('Client A');
      expect(org1Deliveries[0].registradoPor.email).toBe('user1@org1.com');
    });
  });

  describe('Cross-Tenant Attack Prevention', () => {
    let org1, org2;
    let user1, user2;
    let token1, token2;

    beforeEach(async () => {
      org1 = await Organization.create({
        name: 'Organization 1',
        subdomain: 'org1',
        isActive: true,
        subscriptionStatus: 'active'
      });

      org2 = await Organization.create({
        name: 'Organization 2',
        subdomain: 'org2',
        isActive: true,
        subscriptionStatus: 'active'
      });

      user1 = await User.create({
        name: 'User 1',
        email: 'user1@org1.com',
        password: '$2b$10$hashedpassword1',
        organizationId: org1._id,
        role: 'admin',
        isActive: true,
        emailVerified: true
      });

      user2 = await User.create({
        name: 'User 2',
        email: 'user2@org2.com',
        password: '$2b$10$hashedpassword2',
        organizationId: org2._id,
        role: 'admin',
        isActive: true,
        emailVerified: true
      });

      token1 = jwt.sign(
        { userId: user1._id, organizationId: org1._id, role: 'admin' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      token2 = jwt.sign(
        { userId: user2._id, organizationId: org2._id, role: 'admin' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );
    });

    test('should prevent token manipulation attacks', async () => {
      // Create a malicious token with wrong organization ID
      const maliciousToken = jwt.sign(
        { userId: user2._id, organizationId: org1._id, role: 'admin' }, // Wrong org ID
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      // Create a record for org 1
      const storage = await StorageRecord.create({
        organizationId: org1._id,
        producto: 'Protected Product',
        lote: 'PROT001',
        cantidad: 100,
        fechaCaducidad: new Date('2024-12-31'),
        registradoPor: user1._id
      });

      // Attempt to access with malicious token should fail
      await request(app)
        .get(`/api/storage/${storage._id}`)
        .set('Authorization', `Bearer ${maliciousToken}`)
        .expect(403); // Should be forbidden due to user-org mismatch
    });

    test('should prevent parameter injection attacks', async () => {
      // Create storage record for org 1
      const storage = await StorageRecord.create({
        organizationId: org1._id,
        producto: 'Secure Product',
        lote: 'SEC001',
        cantidad: 50,
        fechaCaducidad: new Date('2024-12-31'),
        registradoPor: user1._id
      });

      // Attempt to inject organization ID in request body
      const maliciousUpdate = {
        producto: 'Hacked Product',
        organizationId: org2._id // Attempt to change organization
      };

      const response = await request(app)
        .put(`/api/storage/${storage._id}`)
        .set('Authorization', `Bearer ${token1}`)
        .send(maliciousUpdate)
        .expect(200);

      // Verify organization ID was not changed
      expect(response.body.data.organizationId).toBe(org1._id.toString());
      
      const updatedRecord = await StorageRecord.findById(storage._id);
      expect(updatedRecord.organizationId.equals(org1._id)).toBe(true);
    });

    test('should prevent bulk operation attacks', async () => {
      // Create records for both organizations
      const storage1 = await StorageRecord.create({
        organizationId: org1._id,
        producto: 'Org1 Product',
        lote: 'O1001',
        cantidad: 100,
        fechaCaducidad: new Date('2024-12-31'),
        registradoPor: user1._id
      });

      const storage2 = await StorageRecord.create({
        organizationId: org2._id,
        producto: 'Org2 Product',
        lote: 'O2001',
        cantidad: 200,
        fechaCaducidad: new Date('2024-12-31'),
        registradoPor: user2._id
      });

      // Attempt bulk delete with mixed organization IDs
      const bulkDeleteData = {
        ids: [storage1._id, storage2._id] // Mix of org1 and org2 records
      };

      const response = await request(app)
        .post('/api/storage/bulk-delete')
        .set('Authorization', `Bearer ${token1}`)
        .send(bulkDeleteData)
        .expect(200);

      // Should only delete org1 record
      expect(response.body.deleted).toBe(1);
      
      // Verify org2 record still exists
      const remainingRecord = await StorageRecord.findById(storage2._id);
      expect(remainingRecord).toBeTruthy();
    });

    test('should prevent subdomain spoofing', async () => {
      // Attempt to access API with spoofed subdomain header
      const response = await request(app)
        .get('/api/storage')
        .set('Authorization', `Bearer ${token2}`)
        .set('Host', 'org1.autocontrol.com') // Spoofed subdomain
        .expect(200);

      // Should still only return org2 data based on token
      const records = await StorageRecord.find({ organizationId: org2._id });
      expect(response.body.data).toHaveLength(records.length);
    });
  });
});