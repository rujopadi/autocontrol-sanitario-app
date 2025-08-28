/**
 * Complete User Workflows End-to-End Tests
 * Tests complete user journeys from registration to daily operations
 */
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const nodemailer = require('nodemailer');

// Import models
const User = require('../../models/User');
const Organization = require('../../models/Organization');
const StorageRecord = require('../../models/StorageRecord');
const DeliveryRecord = require('../../models/DeliveryRecord');

// Test setup
let mongoServer;
let app;

// Mock email service
jest.mock('nodemailer');

describe('Complete User Workflows E2E Tests', () => {
  beforeAll(async () => {
    // Setup in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Setup test app
    app = require('../../server');

    // Mock email transporter
    const mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' })
    };
    nodemailer.createTransporter = jest.fn().mockReturnValue(mockTransporter);
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
    
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Complete Registration and Onboarding Flow', () => {
    test('should complete full user registration and organization setup', async () => {
      // Step 1: User registration
      const registrationData = {
        name: 'John Doe',
        email: 'john@newcompany.com',
        password: 'SecurePassword123!',
        organizationName: 'New Company Inc'
      };

      const registrationResponse = await request(app)
        .post('/api/auth/register')
        .send(registrationData)
        .expect(201);

      expect(registrationResponse.body.success).toBe(true);
      expect(registrationResponse.body.data.user.name).toBe('John Doe');
      expect(registrationResponse.body.data.organization.name).toBe('New Company Inc');
      expect(registrationResponse.body.data.token).toBeDefined();

      const { token, user, organization } = registrationResponse.body.data;

      // Step 2: Email verification
      const createdUser = await User.findById(user.id);
      expect(createdUser.emailVerified).toBe(false);
      expect(createdUser.emailVerificationToken).toBeDefined();

      const verificationResponse = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: createdUser.emailVerificationToken })
        .expect(200);

      expect(verificationResponse.body.success).toBe(true);

      // Step 3: Complete organization setup
      const organizationSetup = {
        settings: {
          timezone: 'America/New_York',
          currency: 'USD',
          language: 'en'
        },
        branding: {
          primaryColor: '#007bff',
          logo: 'https://example.com/logo.png'
        }
      };

      const setupResponse = await request(app)
        .put(`/api/organizations/${organization.id}/setup`)
        .set('Authorization', `Bearer ${token}`)
        .send(organizationSetup)
        .expect(200);

      expect(setupResponse.body.success).toBe(true);
      expect(setupResponse.body.data.settings.timezone).toBe('America/New_York');

      // Step 4: First login after verification
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john@newcompany.com',
          password: 'SecurePassword123!'
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data.user.emailVerified).toBe(true);
    });

    test('should handle registration with existing email gracefully', async () => {
      // First registration
      const firstUser = {
        name: 'First User',
        email: 'duplicate@example.com',
        password: 'Password123!',
        organizationName: 'First Company'
      };

      await request(app)
        .post('/api/auth/register')
        .send(firstUser)
        .expect(201);

      // Second registration with same email
      const secondUser = {
        name: 'Second User',
        email: 'duplicate@example.com',
        password: 'Password456!',
        organizationName: 'Second Company'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(secondUser)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('email already exists');
    });
  });

  describe('Daily Operations Workflow', () => {
    let userToken;
    let organizationId;
    let userId;

    beforeEach(async () => {
      // Setup authenticated user
      const org = await Organization.create({
        name: 'Test Company',
        subdomain: 'test-company',
        isActive: true,
        subscriptionStatus: 'active'
      });

      const user = await User.create({
        name: 'Test User',
        email: 'test@testcompany.com',
        password: '$2b$10$hashedpassword',
        organizationId: org._id,
        role: 'admin',
        isActive: true,
        emailVerified: true
      });

      organizationId = org._id;
      userId = user._id;

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@testcompany.com',
          password: 'password123'
        })
        .expect(200);

      userToken = loginResponse.body.data.token;
    });

    test('should complete inventory management workflow', async () => {
      // Step 1: Add new storage record
      const newProduct = {
        producto: 'Premium Coffee Beans',
        lote: 'PCB001',
        cantidad: 500,
        fechaCaducidad: '2024-12-31',
        ubicacion: 'Warehouse A',
        proveedor: 'Coffee Suppliers Inc'
      };

      const createResponse = await request(app)
        .post('/api/storage')
        .set('Authorization', `Bearer ${userToken}`)
        .send(newProduct)
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      const storageId = createResponse.body.data.id;

      // Step 2: Update inventory quantity
      const updateData = {
        cantidad: 450,
        observaciones: 'Sold 50 units to local cafe'
      };

      const updateResponse = await request(app)
        .put(`/api/storage/${createdStorageId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.record.cantidad).toBe(480);
      expect(updateResponse.body.data.record.observaciones).toContain('quality check');

      // Step 4: Verify audit trail was created
      const auditResponse = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ resourceId: createdStorageId })
        .expect(200);

      expect(auditResponse.body.success).toBe(true);
      const createLog = auditResponse.body.data.logs.find(log => log.action === 'CREATE');
      const updateLog = auditResponse.body.data.logs.find(log => log.action === 'UPDATE');
      expect(createLog).toBeDefined();
      expect(updateLog).toBeDefined();
    });

    test('should complete inventory search and filtering workflow', async () => {
      // Step 1: Search by product name
      const searchResponse = await request(app)
        .get('/api/storage/search')
        .set('Authorization', `Bearer ${userToken}`)
        .query({ q: 'Tomatoes' })
        .expect(200);

      expect(searchResponse.body.success).toBe(true);
      expect(searchResponse.body.data.results.length).toBeGreaterThan(0);
      
      const tomatoRecord = searchResponse.body.data.results.find(r => r.producto.includes('Tomatoes'));
      expect(tomatoRecord).toBeDefined();

      // Step 2: Filter by expiration date
      const filterResponse = await request(app)
        .get('/api/storage')
        .set('Authorization', `Bearer ${userToken}`)
        .query({ 
          fechaCaducidadDesde: '2024-01-01',
          fechaCaducidadHasta: '2024-12-31'
        })
        .expect(200);

      expect(filterResponse.body.success).toBe(true);
      expect(filterResponse.body.data.records.length).toBeGreaterThan(0);

      // Step 3: Filter by location
      const locationResponse = await request(app)
        .get('/api/storage')
        .set('Authorization', `Bearer ${userToken}`)
        .query({ ubicacion: 'Warehouse A' })
        .expect(200);

      expect(locationResponse.body.success).toBe(true);
    });
  });

  describe('Daily Operations Workflow - Delivery Management', () => {
    test('should complete delivery creation workflow', async () => {
      // Step 1: Create delivery record
      const deliveryData = {
        cliente: 'Restaurant El Buen Sabor',
        fechaEntrega: new Date().toISOString(),
        productos: [
          {
            producto: 'Organic Tomatoes',
            cantidad: 50,
            lote: 'TOM-2024-001'
          }
        ],
        direccionEntrega: 'Calle Principal 123, Ciudad',
        observaciones: 'Delivery for lunch service'
      };

      const deliveryResponse = await request(app)
        .post('/api/deliveries')
        .set('Authorization', `Bearer ${userToken}`)
        .send(deliveryData)
        .expect(201);

      expect(deliveryResponse.body.success).toBe(true);
      expect(deliveryResponse.body.data.delivery.cliente).toBe(deliveryData.cliente);
      expect(deliveryResponse.body.data.delivery.productos).toHaveLength(1);
      expect(deliveryResponse.body.data.delivery.registradoPor).toBe(regularUser.id);

      createdDeliveryId = deliveryResponse.body.data.delivery.id;

      // Step 2: Verify storage was updated (quantity reduced)
      const storageResponse = await request(app)
        .get(`/api/storage/${createdStorageId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(storageResponse.body.success).toBe(true);
      expect(storageResponse.body.data.record.cantidad).toBe(430); // 480 - 50

      // Step 3: Update delivery status
      const statusUpdate = {
        estado: 'entregado',
        fechaEntregaReal: new Date().toISOString(),
        observaciones: 'Delivered successfully to kitchen staff'
      };

      const updateResponse = await request(app)
        .put(`/api/deliveries/${createdDeliveryId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(statusUpdate)
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.delivery.estado).toBe('entregado');
    });

    test('should handle delivery cancellation workflow', async () => {
      // Step 1: Create delivery
      const deliveryData = {
        cliente: 'Cancelled Client',
        fechaEntrega: new Date().toISOString(),
        productos: [
          {
            producto: 'Organic Tomatoes',
            cantidad: 25,
            lote: 'TOM-2024-001'
          }
        ]
      };

      const deliveryResponse = await request(app)
        .post('/api/deliveries')
        .set('Authorization', `Bearer ${userToken}`)
        .send(deliveryData)
        .expect(201);

      const deliveryId = deliveryResponse.body.data.delivery.id;

      // Step 2: Cancel delivery
      const cancelResponse = await request(app)
        .put(`/api/deliveries/${deliveryId}/cancel`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ motivo: 'Client requested cancellation' })
        .expect(200);

      expect(cancelResponse.body.success).toBe(true);
      expect(cancelResponse.body.data.delivery.estado).toBe('cancelado');

      // Step 3: Verify storage quantity was restored
      const storageResponse = await request(app)
        .get(`/api/storage/${createdStorageId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(storageResponse.body.success).toBe(true);
      expect(storageResponse.body.data.record.cantidad).toBe(455); // 430 + 25
    });
  });

  describe('Analytics and Reporting Workflow', () => {
    test('should complete analytics dashboard workflow', async () => {
      // Step 1: Get general analytics
      const analyticsResponse = await request(app)
        .get('/api/analytics/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(analyticsResponse.body.success).toBe(true);
      expect(analyticsResponse.body.data.summary).toBeDefined();
      expect(analyticsResponse.body.data.summary.totalProducts).toBeGreaterThan(0);
      expect(analyticsResponse.body.data.summary.totalDeliveries).toBeGreaterThan(0);

      // Step 2: Get inventory analytics
      const inventoryResponse = await request(app)
        .get('/api/analytics/inventory')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ 
          fechaDesde: '2024-01-01',
          fechaHasta: '2024-12-31'
        })
        .expect(200);

      expect(inventoryResponse.body.success).toBe(true);
      expect(inventoryResponse.body.data.lowStock).toBeDefined();
      expect(inventoryResponse.body.data.expiringProducts).toBeDefined();

      // Step 3: Get delivery analytics
      const deliveryAnalytics = await request(app)
        .get('/api/analytics/deliveries')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ periodo: 'month' })
        .expect(200);

      expect(deliveryAnalytics.body.success).toBe(true);
      expect(deliveryAnalytics.body.data.totalDeliveries).toBeDefined();
      expect(deliveryAnalytics.body.data.deliveryTrends).toBeDefined();
    });

    test('should generate and download reports', async () => {
      // Step 1: Generate inventory report
      const reportResponse = await request(app)
        .post('/api/reports/inventory')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          formato: 'pdf',
          fechaDesde: '2024-01-01',
          fechaHasta: '2024-12-31',
          incluirDetalles: true
        })
        .expect(200);

      expect(reportResponse.body.success).toBe(true);
      expect(reportResponse.body.data.reportId).toBeDefined();

      // Step 2: Check report status
      const statusResponse = await request(app)
        .get(`/api/reports/${reportResponse.body.data.reportId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(statusResponse.body.success).toBe(true);
      expect(['pending', 'processing', 'completed']).toContain(statusResponse.body.data.status);

      // Step 3: Download report (if completed)
      if (statusResponse.body.data.status === 'completed') {
        const downloadResponse = await request(app)
          .get(`/api/reports/${reportResponse.body.data.reportId}/download`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(downloadResponse.headers['content-type']).toContain('application/pdf');
      }
    });
  });

  describe('User Management Workflow', () => {
    test('should complete user role management workflow', async () => {
      // Step 1: Admin views all users
      const usersResponse = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(usersResponse.body.success).toBe(true);
      expect(usersResponse.body.data.users.length).toBeGreaterThanOrEqual(2);

      // Step 2: Admin updates user role
      const roleUpdate = {
        role: 'manager'
      };

      const updateResponse = await request(app)
        .put(`/api/users/${regularUser.id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(roleUpdate)
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.user.role).toBe('manager');

      // Step 3: Verify user has new permissions
      const newToken = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@testfoodco.com',
          password: 'UserPassword123!'
        })
        .expect(200);

      const managerToken = newToken.body.data.token;

      // Manager should now have access to user management
      const managerUsersResponse = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(managerUsersResponse.body.success).toBe(true);
    });

    test('should complete user deactivation workflow', async () => {
      // Step 1: Create temporary user
      const tempUserData = {
        email: 'temp@testfoodco.com',
        name: 'Temporary User',
        role: 'user'
      };

      const inviteResponse = await request(app)
        .post('/api/users/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(tempUserData)
        .expect(201);

      const tempUserId = inviteResponse.body.data.user.id;

      // Step 2: Deactivate user
      const deactivateResponse = await request(app)
        .put(`/api/users/${tempUserId}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ motivo: 'User left company' })
        .expect(200);

      expect(deactivateResponse.body.success).toBe(true);
      expect(deactivateResponse.body.data.user.isActive).toBe(false);

      // Step 3: Verify user cannot login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: tempUserData.email,
          password: 'TempPassword123!'
        })
        .expect(401);

      expect(loginResponse.body.success).toBe(false);
      expect(loginResponse.body.message).toContain('inactive');
    });
  });

  describe('Organization Settings Workflow', () => {
    test('should complete organization configuration workflow', async () => {
      // Step 1: Update organization settings
      const settingsUpdate = {
        configuracion: {
          notificaciones: {
            emailAlerts: true,
            lowStockThreshold: 10,
            expirationWarningDays: 7
          },
          inventario: {
            autoUpdateStock: true,
            requireLotNumbers: true,
            trackTemperature: true
          },
          entregas: {
            requireSignature: true,
            autoGenerateInvoice: false,
            defaultDeliveryTime: '09:00'
          }
        }
      };

      const updateResponse = await request(app)
        .put('/api/organizations/current/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(settingsUpdate)
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.organization.configuracion.notificaciones.emailAlerts).toBe(true);

      // Step 2: Verify settings are applied
      const settingsResponse = await request(app)
        .get('/api/organizations/current/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(settingsResponse.body.success).toBe(true);
      expect(settingsResponse.body.data.settings.notificaciones.lowStockThreshold).toBe(10);
    });

    test('should complete subscription management workflow', async () => {
      // Step 1: View current subscription
      const subscriptionResponse = await request(app)
        .get('/api/organizations/current/subscription')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(subscriptionResponse.body.success).toBe(true);
      expect(subscriptionResponse.body.data.subscription.status).toBe('trial');

      // Step 2: Upgrade subscription (mock)
      const upgradeResponse = await request(app)
        .post('/api/organizations/current/subscription/upgrade')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          plan: 'professional',
          paymentMethod: 'credit_card'
        })
        .expect(200);

      expect(upgradeResponse.body.success).toBe(true);
      expect(upgradeResponse.body.data.subscription.plan).toBe('professional');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle network errors gracefully', async () => {
      // Simulate network timeout
      const response = await request(app)
        .get('/api/storage')
        .set('Authorization', `Bearer ${userToken}`)
        .timeout(1) // Very short timeout
        .expect(408);

      expect(response.body.success).toBe(false);
    });

    test('should handle invalid data gracefully', async () => {
      // Try to create storage with invalid data
      const invalidData = {
        producto: '', // Empty product name
        cantidad: -10, // Negative quantity
        fechaCaducidad: 'invalid-date'
      };

      const response = await request(app)
        .post('/api/storage')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.length).toBeGreaterThan(0);
    });

    test('should handle concurrent operations', async () => {
      // Create multiple storage records simultaneously
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .post('/api/storage')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
              producto: `Concurrent Product ${i}`,
              lote: `CONC-${i}`,
              cantidad: 100,
              fechaCaducidad: '2024-12-31'
            })
        );
      }

      const responses = await Promise.all(promises);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Performance and Load Testing', () => {
    test('should handle bulk operations efficiently', async () => {
      const startTime = Date.now();
      
      // Create 50 storage records in bulk
      const bulkData = {
        records: []
      };

      for (let i = 0; i < 50; i++) {
        bulkData.records.push({
          producto: `Bulk Product ${i}`,
          lote: `BULK-${i}`,
          cantidad: Math.floor(Math.random() * 100) + 1,
          fechaCaducidad: '2024-12-31'
        });
      }

      const response = await request(app)
        .post('/api/storage/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(bulkData)
        .expect(201);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(response.body.data.created).toBe(50);
      expect(duration).toBeLessThan(5000); // Should complete in less than 5 seconds
    });

    test('should handle large dataset queries efficiently', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/storage')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ 
          limit: 100,
          page: 1,
          sortBy: 'fechaCreacion',
          sortOrder: 'desc'
        })
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(response.body.data.records.length).toBeLessThanOrEqual(100);
      expect(duration).toBeLessThan(2000); // Should complete in less than 2 seconds
    });
  });
});storage/${storageId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.data.cantidad).toBe(450);

      // Step 3: Search inventory
      const searchResponse = await request(app)
        .get('/api/storage?search=Coffee')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(searchResponse.body.data).toHaveLength(1);
      expect(searchResponse.body.data[0].producto).toBe('Premium Coffee Beans');

      // Step 4: Generate inventory report
      const reportResponse = await request(app)
        .get('/api/storage/reports/inventory')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(reportResponse.body.success).toBe(true);
      expect(reportResponse.body.data.totalProducts).toBe(1);
      expect(reportResponse.body.data.totalQuantity).toBe(450);
    });

    test('should complete delivery management workflow', async () => {
      // Step 1: Create storage records for delivery
      const product1 = await StorageRecord.create({
        organizationId,
        producto: 'Product A',
        lote: 'PA001',
        cantidad: 100,
        fechaCaducidad: new Date('2024-12-31'),
        registradoPor: userId
      });

      const product2 = await StorageRecord.create({
        organizationId,
        producto: 'Product B',
        lote: 'PB001',
        cantidad: 200,
        fechaCaducidad: new Date('2024-12-31'),
        registradoPor: userId
      });

      // Step 2: Create delivery record
      const deliveryData = {
        cliente: 'ABC Restaurant',
        fechaEntrega: new Date().toISOString(),
        productos: [
          { producto: 'Product A', cantidad: 20, lote: 'PA001' },
          { producto: 'Product B', cantidad: 30, lote: 'PB001' }
        ],
        observaciones: 'Delivery to main entrance'
      };

      const deliveryResponse = await request(app)
        .post('/api/deliveries')
        .set('Authorization', `Bearer ${userToken}`)
        .send(deliveryData)
        .expect(201);

      expect(deliveryResponse.body.success).toBe(true);
      const deliveryId = deliveryResponse.body.data.id;

      // Step 3: Update delivery status
      const statusUpdate = {
        estado: 'entregado',
        fechaEntregaReal: new Date().toISOString(),
        observaciones: 'Delivered successfully to manager'
      };

      const statusResponse = await request(app)
        .put(`/api/deliveries/${deliveryId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(statusUpdate)
        .expect(200);

      expect(statusResponse.body.data.estado).toBe('entregado');

      // Step 4: Verify inventory was updated
      const updatedProduct1 = await StorageRecord.findById(product1._id);
      const updatedProduct2 = await StorageRecord.findById(product2._id);

      expect(updatedProduct1.cantidad).toBe(80); // 100 - 20
      expect(updatedProduct2.cantidad).toBe(170); // 200 - 30

      // Step 5: Generate delivery report
      const reportResponse = await request(app)
        .get('/api/deliveries/reports/monthly')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(reportResponse.body.success).toBe(true);
      expect(reportResponse.body.data.totalDeliveries).toBe(1);
    });

    test('should complete user management workflow', async () => {
      // Step 1: Admin invites new user
      const inviteData = {
        email: 'newuser@testcompany.com',
        name: 'New User',
        role: 'user'
      };

      const inviteResponse = await request(app)
        .post('/api/organizations/users/invite')
        .set('Authorization', `Bearer ${userToken}`)
        .send(inviteData)
        .expect(201);

      expect(inviteResponse.body.success).toBe(true);

      // Step 2: New user accepts invitation and sets password
      const newUser = await User.findOne({ email: 'newuser@testcompany.com' });
      expect(newUser).toBeTruthy();
      expect(newUser.invitationToken).toBeDefined();

      const acceptInviteData = {
        token: newUser.invitationToken,
        password: 'NewUserPassword123!'
      };

      const acceptResponse = await request(app)
        .post('/api/auth/accept-invitation')
        .send(acceptInviteData)
        .expect(200);

      expect(acceptResponse.body.success).toBe(true);

      // Step 3: New user logs in
      const newUserLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'newuser@testcompany.com',
          password: 'NewUserPassword123!'
        })
        .expect(200);

      expect(newUserLoginResponse.body.success).toBe(true);
      const newUserToken = newUserLoginResponse.body.data.token;

      // Step 4: Admin updates user role
      const roleUpdateData = {
        role: 'admin'
      };

      const roleUpdateResponse = await request(app)
        .put(`/api/organizations/users/${newUser._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(roleUpdateData)
        .expect(200);

      expect(roleUpdateResponse.body.data.role).toBe('admin');

      // Step 5: List organization users
      const usersResponse = await request(app)
        .get('/api/organizations/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(usersResponse.body.data).toHaveLength(2);
    });
  });

  describe('Error Recovery Workflows', () => {
    let userToken;
    let organizationId;

    beforeEach(async () => {
      const org = await Organization.create({
        name: 'Test Company',
        subdomain: 'test-company',
        isActive: true,
        subscriptionStatus: 'active'
      });

      const user = await User.create({
        name: 'Test User',
        email: 'test@testcompany.com',
        password: '$2b$10$hashedpassword',
        organizationId: org._id,
        role: 'admin',
        isActive: true,
        emailVerified: true
      });

      organizationId = org._id;

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@testcompany.com',
          password: 'password123'
        })
        .expect(200);

      userToken = loginResponse.body.data.token;
    });

    test('should complete password reset workflow', async () => {
      // Step 1: Request password reset
      const resetRequestResponse = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'test@testcompany.com' })
        .expect(200);

      expect(resetRequestResponse.body.success).toBe(true);

      // Step 2: Get reset token from database
      const user = await User.findOne({ email: 'test@testcompany.com' });
      expect(user.passwordResetToken).toBeDefined();
      expect(user.passwordResetExpires).toBeDefined();

      // Step 3: Reset password with token
      const newPassword = 'NewSecurePassword123!';
      const resetResponse = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: user.passwordResetToken,
          password: newPassword
        })
        .expect(200);

      expect(resetResponse.body.success).toBe(true);

      // Step 4: Login with new password
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@testcompany.com',
          password: newPassword
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);

      // Step 5: Verify old password no longer works
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@testcompany.com',
          password: 'password123'
        })
        .expect(401);
    });

    test('should handle data validation errors gracefully', async () => {
      // Attempt to create storage record with invalid data
      const invalidProduct = {
        producto: '', // Empty product name
        lote: 'TEST001',
        cantidad: -10, // Negative quantity
        fechaCaducidad: 'invalid-date' // Invalid date
      };

      const response = await request(app)
        .post('/api/storage')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidProduct)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.length).toBeGreaterThan(0);
    });

    test('should handle concurrent operations correctly', async () => {
      // Create initial storage record
      const product = await StorageRecord.create({
        organizationId,
        producto: 'Concurrent Test Product',
        lote: 'CTP001',
        cantidad: 100,
        fechaCaducidad: new Date('2024-12-31'),
        registradoPor: new mongoose.Types.ObjectId()
      });

      // Simulate concurrent updates
      const update1Promise = request(app)
        .put(`/api/storage/${product._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ cantidad: 90 });

      const update2Promise = request(app)
        .put(`/api/storage/${product._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ cantidad: 80 });

      const [response1, response2] = await Promise.all([update1Promise, update2Promise]);

      // Both requests should succeed (last one wins)
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      // Verify final state
      const finalProduct = await StorageRecord.findById(product._id);
      expect([80, 90]).toContain(finalProduct.cantidad);
    });
  });

  describe('Multi-User Collaboration Workflows', () => {
    let adminToken;
    let userToken;
    let viewerToken;
    let organizationId;

    beforeEach(async () => {
      const org = await Organization.create({
        name: 'Collaborative Company',
        subdomain: 'collab-company',
        isActive: true,
        subscriptionStatus: 'active'
      });

      organizationId = org._id;

      // Create users with different roles
      const admin = await User.create({
        name: 'Admin User',
        email: 'admin@collab.com',
        password: '$2b$10$hashedpassword',
        organizationId: org._id,
        role: 'admin',
        isActive: true,
        emailVerified: true
      });

      const user = await User.create({
        name: 'Regular User',
        email: 'user@collab.com',
        password: '$2b$10$hashedpassword',
        organizationId: org._id,
        role: 'user',
        isActive: true,
        emailVerified: true
      });

      const viewer = await User.create({
        name: 'Viewer User',
        email: 'viewer@collab.com',
        password: '$2b$10$hashedpassword',
        organizationId: org._id,
        role: 'viewer',
        isActive: true,
        emailVerified: true
      });

      // Get tokens for each user
      const adminLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@collab.com', password: 'password123' });
      adminToken = adminLogin.body.data.token;

      const userLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@collab.com', password: 'password123' });
      userToken = userLogin.body.data.token;

      const viewerLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'viewer@collab.com', password: 'password123' });
      viewerToken = viewerLogin.body.data.token;
    });

    test('should enforce role-based permissions in collaborative workflow', async () => {
      // Admin creates initial data
      const productResponse = await request(app)
        .post('/api/storage')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          producto: 'Collaborative Product',
          lote: 'COLLAB001',
          cantidad: 100,
          fechaCaducidad: '2024-12-31'
        })
        .expect(201);

      const productId = productResponse.body.data.id;

      // Regular user can read and update
      const userReadResponse = await request(app)
        .get(`/api/storage/${productId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(userReadResponse.body.data.producto).toBe('Collaborative Product');

      const userUpdateResponse = await request(app)
        .put(`/api/storage/${productId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ cantidad: 95 })
        .expect(200);

      expect(userUpdateResponse.body.data.cantidad).toBe(95);

      // Viewer can only read
      const viewerReadResponse = await request(app)
        .get(`/api/storage/${productId}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(200);

      expect(viewerReadResponse.body.data.producto).toBe('Collaborative Product');

      // Viewer cannot update
      await request(app)
        .put(`/api/storage/${productId}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ cantidad: 90 })
        .expect(403);

      // Viewer cannot delete
      await request(app)
        .delete(`/api/storage/${productId}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(403);

      // Admin can delete
      await request(app)
        .delete(`/api/storage/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    test('should track user actions in audit log', async () => {
      // Create product with admin
      const productResponse = await request(app)
        .post('/api/storage')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          producto: 'Audited Product',
          lote: 'AUDIT001',
          cantidad: 50,
          fechaCaducidad: '2024-12-31'
        })
        .expect(201);

      const productId = productResponse.body.data.id;

      // Update with regular user
      await request(app)
        .put(`/api/storage/${productId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ cantidad: 45 })
        .expect(200);

      // Check audit logs
      const auditResponse = await request(app)
        .get('/api/audit/logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(auditResponse.body.data.length).toBeGreaterThanOrEqual(2);
      
      const createLog = auditResponse.body.data.find(log => log.action === 'CREATE');
      const updateLog = auditResponse.body.data.find(log => log.action === 'UPDATE');
      
      expect(createLog).toBeDefined();
      expect(updateLog).toBeDefined();
      expect(createLog.userId).not.toBe(updateLog.userId);
    });
  });
});