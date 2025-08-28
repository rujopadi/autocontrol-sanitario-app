const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Import test middleware
const { mockRateLimit, mockSecurity } = require('../../middleware/test-middleware');

// Mock the app setup
const app = express();
app.use(express.json());
app.use(mockSecurity);
app.use(mockRateLimit);

// Import routes and models
const authRoutes = require('../../routes/auth.test.routes');
const User = require('../../models/User');
const Organization = require('../../models/Organization');

app.use('/api/auth', authRoutes);

describe('Authentication Unit Tests', () => {
  describe('User Registration', () => {
    test('should register a new user with organization', async () => {
      const timestamp = Date.now();
      const userData = {
        name: 'John Doe',
        email: `john-${timestamp}@example.com`,
        password: 'password123',
        organizationName: `Test Company ${timestamp}`
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Usuario registrado exitosamente');
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.name).toBe(userData.name);
      expect(response.body.data.organization.name).toBe(userData.organizationName);

      // Verify user was created in database
      const user = await User.findOne({ email: userData.email });
      expect(user).toBeTruthy();
      expect(user.name).toBe(userData.name);
      expect(user.isEmailVerified).toBe(true); // In test environment, email is auto-verified

      // Verify organization was created
      const organization = await Organization.findById(user.organizationId);
      expect(organization).toBeTruthy();
      expect(organization.name).toBe(userData.organizationName);
    });

    test('should not register user with existing email', async () => {
      const timestamp = Date.now();
      const existingEmail = `existing-${timestamp}@example.com`;
      
      // Create existing user
      await global.testUtils.createTestUser({
        email: existingEmail
      });

      const userData = {
        name: 'Jane Doe',
        email: existingEmail,
        password: 'password123',
        organizationName: `Another Company ${timestamp}`
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('ya existe');
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    test('should validate email format', async () => {
      const timestamp = Date.now();
      const userData = {
        name: 'John Doe',
        email: 'invalid-email',
        password: 'password123',
        organizationName: `Test Company ${timestamp}`
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    test('should validate password strength', async () => {
      const timestamp = Date.now();
      const userData = {
        name: 'John Doe',
        email: `john-${timestamp}@example.com`,
        password: '123', // Too short
        organizationName: `Test Company ${timestamp}`
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('User Login', () => {
    test('should login with valid credentials', async () => {
      const timestamp = Date.now();
      const email = `login-${timestamp}@example.com`;
      
      // Create test user
      const { user, organization } = await global.testUtils.createTestUser({
        email: email,
        password: 'password123', // Don't pre-hash, let the model handle it
        isEmailVerified: true
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: email,
          password: 'password123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.user.email).toBe(email);
      expect(response.body.data.organization.name).toBe(organization.name);

      // Verify JWT token
      const decoded = jwt.verify(response.body.data.token, process.env.JWT_SECRET || 'test-secret');
      expect(decoded.userId).toBe(user._id.toString());
      expect(decoded.organizationId).toBe(organization._id.toString());
    });

    test('should not login with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Credenciales inválidas');
    });

    test('should not login with invalid password', async () => {
      const timestamp = Date.now();
      const email = `login-${timestamp}@example.com`;
      
      // Create test user
      await global.testUtils.createTestUser({
        email: email,
        password: 'password123', // Don't pre-hash, let the model handle it
        isEmailVerified: true
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: email,
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Credenciales inválidas');
    });

    test('should not login with unverified email', async () => {
      const timestamp = Date.now();
      const email = `unverified-${timestamp}@example.com`;
      
      // Create test user with unverified email
      await global.testUtils.createTestUser({
        email: email,
        password: 'password123', // Don't pre-hash, let the model handle it
        isEmailVerified: false
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: email,
          password: 'password123'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('verificar tu email');
    });

    test('should not login with inactive user', async () => {
      const timestamp = Date.now();
      const email = `inactive-${timestamp}@example.com`;
      
      // Create inactive test user
      await global.testUtils.createTestUser({
        email: email,
        password: 'password123', // Don't pre-hash, let the model handle it
        isEmailVerified: true,
        userData: { isActive: false }
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: email,
          password: 'password123'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('desactivada');
    });
  });

  describe('Password Reset', () => {
    test('should initiate password reset for valid email', async () => {
      const timestamp = Date.now();
      const email = `reset-${timestamp}@example.com`;
      
      // Create test user
      await global.testUtils.createTestUser({
        email: email
      });

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: email
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('instrucciones');

      // Verify reset token was set
      const user = await User.findOne({ email: email });
      expect(user.passwordResetToken).toBeDefined();
      expect(user.passwordResetExpires).toBeDefined();
    });

    test('should not reveal if email does not exist', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'nonexistent@example.com'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('instrucciones');
    });

    test('should reset password with valid token', async () => {
      const timestamp = Date.now();
      const email = `reset-${timestamp}@example.com`;
      
      // Create test user with reset token
      const resetToken = `valid-reset-token-${timestamp}`;
      const { user } = await global.testUtils.createTestUser({
        email: email,
        userData: {
          passwordResetToken: resetToken,
          passwordResetExpires: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
        }
      });

      const newPassword = 'newpassword123';
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          password: newPassword
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('restablecida');

      // Verify password was changed
      const updatedUser = await User.findById(user._id);
      const isValidPassword = await bcrypt.compare(newPassword, updatedUser.password);
      expect(isValidPassword).toBe(true);

      // Verify reset token was cleared
      expect(updatedUser.passwordResetToken).toBeUndefined();
      expect(updatedUser.passwordResetExpires).toBeUndefined();
    });

    test('should not reset password with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-token',
          password: 'newpassword123'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('inválido o expirado');
    });

    test('should not reset password with expired token', async () => {
      const timestamp = Date.now();
      const email = `reset-${timestamp}@example.com`;
      
      // Create test user with expired reset token
      const resetToken = `expired-reset-token-${timestamp}`;
      await global.testUtils.createTestUser({
        email: email,
        userData: {
          passwordResetToken: resetToken,
          passwordResetExpires: new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago
        }
      });

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          password: 'newpassword123'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('inválido o expirado');
    });
  });

  describe('JWT Token Validation', () => {
    test('should validate valid JWT token', async () => {
      const { user, organization } = await global.testUtils.createTestUser();
      const token = global.testUtils.generateTestToken(user, organization);

      // Test with a protected route (we'll need to create a test route)
      const testApp = express();
      testApp.use(express.json());
      
      const { auth } = require('../../middleware/auth-simple');
      testApp.get('/test-protected', auth, (req, res) => {
        res.json({ 
          success: true, 
          user: req.user,
          organization: req.organization 
        });
      });

      const response = await request(testApp)
        .get('/test-protected')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.id).toBe(user._id.toString());
      expect(response.body.organization.id).toBe(organization._id.toString());
    });

    test('should reject invalid JWT token', async () => {
      const testApp = express();
      testApp.use(express.json());
      
      const { auth } = require('../../middleware/auth-simple');
      testApp.get('/test-protected', auth, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(testApp)
        .get('/test-protected')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should reject expired JWT token', async () => {
      const { user, organization } = await global.testUtils.createTestUser();
      
      // Create expired token
      const expiredToken = jwt.sign(
        {
          userId: user._id,
          organizationId: organization._id,
          email: user.email,
          role: user.role
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      const testApp = express();
      testApp.use(express.json());
      
      const { auth } = require('../../middleware/auth-simple');
      testApp.get('/test-protected', auth, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(testApp)
        .get('/test-protected')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});