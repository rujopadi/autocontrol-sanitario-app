const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');

// Import the full app setup
const User = require('../../models/User');
const Organization = require('../../models/Organization');
const DeliveryRecord = require('../../models/DeliveryRecord');

describe('End-to-End User Workflow Tests', () => {
  let app;

  beforeAll(() => {
    // Setup full app with all middleware
    app = express();
    app.use(express.json());
    
    // Add security middleware
    const { securityHeaders, requestSizeLimit } = require('../../middleware/security');
    app.use(securityHeaders);
    app.use(requestSizeLimit);
    
    // Add routes
    app.use('/api/auth', require('../../routes/auth.routes'));
    app.use('/api/organization', require('../../routes/organization.routes'));
    
    // Add test routes for business data
    const { auth } = require('../../middleware/auth-simple');
    
    app.get('/api/records', auth, async (req, res) => {
      try {
        const records = await DeliveryRecord.find({ 
          organizationId: req.user.organizationId 
        }).sort({ date: -1 });
        res.json({ success: true, data: records });
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
    
    app.put('/api/records/:id', auth, async (req, res) => {
      try {
        const record = await DeliveryRecord.findOneAndUpdate(
          { 
            _id: req.params.id, 
            organizationId: req.user.organizationId 
          },
          { ...req.body, updatedBy: req.user.id },
          { new: true }
        );
        
        if (!record) {
          return res.status(404).json({ success: false, message: 'Record not found' });
        }
        
        res.json({ success: true, data: record });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });
    
    app.delete('/api/records/:id', auth, async (req, res) => {
      try {
        const record = await DeliveryRecord.findOneAndDelete({
          _id: req.params.id,
          organizationId: req.user.organizationId
        });
        
        if (!record) {
          return res.status(404).json({ success: false, message: 'Record not found' });
        }
        
        res.json({ success: true, message: 'Record deleted' });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });
  });

  describe('Complete User Registration and Login Flow', () => {
    test('should complete full user onboarding workflow', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@testcompany.com',
        password: 'SecurePass123!',
        organizationName: 'Test Company Inc'
      };

      // Step 1: Register new user and organization
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.data.user.email).toBe(userData.email);
      expect(registerResponse.body.data.organization.name).toBe(userData.organizationName);

      const userId = registerResponse.body.data.user.id;
      const organizationId = registerResponse.body.data.organization.id;

      // Step 2: Verify email (simulate email verification)
      const user = await User.findById(userId);
      user.isEmailVerified = true;
      await user.save();

      // Step 3: Login with verified account
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data.token).toBeDefined();
      expect(loginResponse.body.data.user.email).toBe(userData.email);
      expect(loginResponse.body.data.organization.name).toBe(userData.organizationName);

      const token = loginResponse.body.data.token;

      // Step 4: Access protected resources
      const profileResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(profileResponse.body.success).toBe(true);
      expect(profileResponse.body.data.user.id).toBe(userId);
      expect(profileResponse.body.data.organization.id).toBe(organizationId);
    });

    test('should handle password reset workflow', async () => {
      // Create verified user
      const { user } = await global.testUtils.createTestUser({
        email: 'reset@example.com',
        isEmailVerified: true
      });

      // Step 1: Request password reset
      const resetRequestResponse = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'reset@example.com' })
        .expect(200);

      expect(resetRequestResponse.body.success).toBe(true);

      // Step 2: Get reset token from database (simulate email)
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.passwordResetToken).toBeDefined();
      expect(updatedUser.passwordResetExpires).toBeDefined();

      const resetToken = updatedUser.passwordResetToken;

      // Step 3: Reset password with token
      const newPassword = 'NewSecurePass456!';
      const resetResponse = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          password: newPassword
        })
        .expect(200);

      expect(resetResponse.body.success).toBe(true);

      // Step 4: Login with new password
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'reset@example.com',
          password: newPassword
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data.token).toBeDefined();

      // Step 5: Verify old password no longer works
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'reset@example.com',
          password: 'password123' // Old password
        })
        .expect(401);
    });
  });

  describe('Complete Business Data Management Workflow', () => {
    let token, userId, organizationId;

    beforeEach(async () => {
      // Create authenticated user
      const { user, organization } = await global.testUtils.createTestUser({
        isEmailVerified: true
      });
      
      userId = user._id.toString();
      organizationId = organization._id.toString();
      token = global.testUtils.generateTestToken(user, organization);
    });

    test('should complete CRUD operations for business records', async () => {
      // Step 1: Create new record
      const recordData = {
        date: new Date().toISOString(),
        supplier: 'Test Supplier Ltd',
        product: 'Fresh Vegetables',
        quantity: 50,
        temperature: 4.5,
        notes: 'Good quality delivery'
      };

      const createResponse = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${token}`)
        .send(recordData)
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data.supplier).toBe(recordData.supplier);
      expect(createResponse.body.data.organizationId).toBe(organizationId);
      expect(createResponse.body.data.createdBy).toBe(userId);

      const recordId = createResponse.body.data._id;

      // Step 2: Read records
      const readResponse = await request(app)
        .get('/api/records')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(readResponse.body.success).toBe(true);
      expect(readResponse.body.data).toHaveLength(1);
      expect(readResponse.body.data[0]._id).toBe(recordId);

      // Step 3: Update record
      const updateData = {
        supplier: 'Updated Supplier Name',
        notes: 'Updated notes'
      };

      const updateResponse = await request(app)
        .put(`/api/records/${recordId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.supplier).toBe(updateData.supplier);
      expect(updateResponse.body.data.notes).toBe(updateData.notes);
      expect(updateResponse.body.data.updatedBy).toBe(userId);

      // Step 4: Delete record
      const deleteResponse = await request(app)
        .delete(`/api/records/${recordId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);

      // Step 5: Verify deletion
      const verifyResponse = await request(app)
        .get('/api/records')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(verifyResponse.body.data).toHaveLength(0);
    });

    test('should handle bulk operations', async () => {
      // Create multiple records
      const records = [];
      for (let i = 0; i < 5; i++) {
        const recordData = {
          date: new Date().toISOString(),
          supplier: `Supplier ${i}`,
          product: `Product ${i}`,
          quantity: i * 10
        };

        const response = await request(app)
          .post('/api/records')
          .set('Authorization', `Bearer ${token}`)
          .send(recordData)
          .expect(201);

        records.push(response.body.data);
      }

      // Verify all records were created
      const listResponse = await request(app)
        .get('/api/records')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(listResponse.body.data).toHaveLength(5);

      // Verify records are sorted by date (newest first)
      const dates = listResponse.body.data.map(r => new Date(r.date));
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i-1].getTime()).toBeGreaterThanOrEqual(dates[i].getTime());
      }
    });
  });

  describe('Multi-User Organization Workflow', () => {
    let adminToken, userToken, organizationId;
    let adminUser, regularUser, organization;

    beforeEach(async () => {
      // Create organization with admin user
      const adminData = await global.testUtils.createTestUser({
        email: 'admin@company.com',
        role: 'Admin',
        isEmailVerified: true
      });
      adminUser = adminData.user;
      organization = adminData.organization;
      organizationId = organization._id.toString();
      adminToken = global.testUtils.generateTestToken(adminUser, organization);

      // Create regular user in same organization
      const userData = await global.testUtils.createTestUser({
        email: 'user@company.com',
        role: 'User',
        isEmailVerified: true,
        organizationData: { _id: organization._id }
      });
      regularUser = userData.user;
      userToken = global.testUtils.generateTestToken(regularUser, organization);
    });

    test('should handle multi-user data access', async () => {
      // Admin creates a record
      const adminRecordData = {
        date: new Date().toISOString(),
        supplier: 'Admin Supplier',
        product: 'Admin Product',
        quantity: 100
      };

      const adminCreateResponse = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(adminRecordData)
        .expect(201);

      expect(adminCreateResponse.body.data.createdBy).toBe(adminUser._id.toString());

      // Regular user creates a record
      const userRecordData = {
        date: new Date().toISOString(),
        supplier: 'User Supplier',
        product: 'User Product',
        quantity: 50
      };

      const userCreateResponse = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${userToken}`)
        .send(userRecordData)
        .expect(201);

      expect(userCreateResponse.body.data.createdBy).toBe(regularUser._id.toString());

      // Both users should see both records (same organization)
      const adminListResponse = await request(app)
        .get('/api/records')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const userListResponse = await request(app)
        .get('/api/records')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(adminListResponse.body.data).toHaveLength(2);
      expect(userListResponse.body.data).toHaveLength(2);

      // Verify both users see the same data
      expect(adminListResponse.body.data.map(r => r._id).sort())
        .toEqual(userListResponse.body.data.map(r => r._id).sort());
    });

    test('should maintain data isolation between organizations', async () => {
      // Create second organization with user
      const org2Data = await global.testUtils.createTestUser({
        email: 'user@company2.com',
        organizationName: 'Company 2',
        isEmailVerified: true
      });
      const org2User = org2Data.user;
      const org2Token = global.testUtils.generateTestToken(org2User, org2Data.organization);

      // Create records in both organizations
      await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          date: new Date().toISOString(),
          supplier: 'Org1 Supplier',
          product: 'Org1 Product',
          quantity: 100
        })
        .expect(201);

      await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${org2Token}`)
        .send({
          date: new Date().toISOString(),
          supplier: 'Org2 Supplier',
          product: 'Org2 Product',
          quantity: 200
        })
        .expect(201);

      // Each organization should only see their own records
      const org1Response = await request(app)
        .get('/api/records')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const org2Response = await request(app)
        .get('/api/records')
        .set('Authorization', `Bearer ${org2Token}`)
        .expect(200);

      expect(org1Response.body.data).toHaveLength(1);
      expect(org2Response.body.data).toHaveLength(1);
      expect(org1Response.body.data[0].supplier).toBe('Org1 Supplier');
      expect(org2Response.body.data[0].supplier).toBe('Org2 Supplier');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    let token, userId, organizationId;

    beforeEach(async () => {
      const { user, organization } = await global.testUtils.createTestUser({
        isEmailVerified: true
      });
      
      userId = user._id.toString();
      organizationId = organization._id.toString();
      token = global.testUtils.generateTestToken(user, organization);
    });

    test('should handle invalid record operations gracefully', async () => {
      // Try to update non-existent record
      const fakeId = new require('mongoose').Types.ObjectId();
      const updateResponse = await request(app)
        .put(`/api/records/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ supplier: 'Updated' })
        .expect(404);

      expect(updateResponse.body.success).toBe(false);
      expect(updateResponse.body.message).toBe('Record not found');

      // Try to delete non-existent record
      const deleteResponse = await request(app)
        .delete(`/api/records/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(deleteResponse.body.success).toBe(false);
      expect(deleteResponse.body.message).toBe('Record not found');
    });

    test('should handle malformed requests', async () => {
      // Invalid JSON
      const response = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${token}`)
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should handle concurrent operations', async () => {
      // Create a record
      const recordData = {
        date: new Date().toISOString(),
        supplier: 'Concurrent Test',
        product: 'Test Product',
        quantity: 100
      };

      const createResponse = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${token}`)
        .send(recordData)
        .expect(201);

      const recordId = createResponse.body.data._id;

      // Perform concurrent updates
      const updatePromises = [];
      for (let i = 0; i < 5; i++) {
        updatePromises.push(
          request(app)
            .put(`/api/records/${recordId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ quantity: i * 10 })
        );
      }

      const results = await Promise.all(updatePromises);
      
      // All updates should succeed (last one wins)
      results.forEach(result => {
        expect(result.status).toBe(200);
        expect(result.body.success).toBe(true);
      });

      // Verify final state
      const finalResponse = await request(app)
        .get('/api/records')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(finalResponse.body.data).toHaveLength(1);
      expect(finalResponse.body.data[0].updatedBy).toBe(userId);
    });
  });
});