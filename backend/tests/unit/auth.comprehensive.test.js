/**
 * Comprehensive Authentication Unit Tests
 * Tests authentication and authorization logic with multi-tenant support
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Import models and services
const User = require('../../models/User');
const Organization = require('../../models/Organization');
const authService = require('../../services/authService');
const { generateToken, verifyToken } = require('../../utils/jwtUtils');

// Test setup
let mongoServer;
let app;

describe('Authentication Unit Tests', () => {
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
  });

  describe('Password Hashing', () => {
    test('should hash password with bcrypt', async () => {
      const password = 'testPassword123!';
      const hashedPassword = await bcrypt.hash(password, 10);
      
      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(50);
    });

    test('should verify password correctly', async () => {
      const password = 'testPassword123!';
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const isValid = await bcrypt.compare(password, hashedPassword);
      const isInvalid = await bcrypt.compare('wrongPassword', hashedPassword);
      
      expect(isValid).toBe(true);
      expect(isInvalid).toBe(false);
    });

    test('should use sufficient salt rounds', async () => {
      const password = 'testPassword123!';
      const startTime = Date.now();
      await bcrypt.hash(password, 10);
      const endTime = Date.now();
      
      // Hashing should take some time (indicating proper salt rounds)
      expect(endTime - startTime).toBeGreaterThan(50);
    });
  });

  describe('JWT Token Generation', () => {
    let testOrganization;
    let testUser;

    beforeEach(async () => {
      // Create test organization
      testOrganization = await Organization.create({
        name: 'Test Organization',
        subdomain: 'test-org',
        isActive: true,
        subscriptionStatus: 'active'
      });

      // Create test user
      testUser = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: await bcrypt.hash('password123', 10),
        organizationId: testOrganization._id,
        role: 'user',
        isActive: true,
        emailVerified: true
      });
    });

    test('should generate valid JWT token', () => {
      const payload = {
        userId: testUser._id,
        organizationId: testOrganization._id,
        role: testUser.role
      };

      const token = generateToken(payload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    test('should include organization context in token', () => {
      const payload = {
        userId: testUser._id,
        organizationId: testOrganization._id,
        role: testUser.role
      };

      const token = generateToken(payload);
      const decoded = jwt.decode(token);
      
      expect(decoded.organizationId).toBe(testOrganization._id.toString());
      expect(decoded.userId).toBe(testUser._id.toString());
      expect(decoded.role).toBe(testUser.role);
    });

    test('should set appropriate token expiration', () => {
      const payload = {
        userId: testUser._id,
        organizationId: testOrganization._id,
        role: testUser.role
      };

      const token = generateToken(payload);
      const decoded = jwt.decode(token);
      
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp - decoded.iat).toBe(86400); // 24 hours
    });

    test('should verify token correctly', () => {
      const payload = {
        userId: testUser._id,
        organizationId: testOrganization._id,
        role: testUser.role
      };

      const token = generateToken(payload);
      const verified = verifyToken(token);
      
      expect(verified).toBeDefined();
      expect(verified.userId).toBe(testUser._id.toString());
      expect(verified.organizationId).toBe(testOrganization._id.toString());
    });

    test('should reject invalid token', () => {
      const invalidToken = 'invalid.token.here';
      
      expect(() => {
        verifyToken(invalidToken);
      }).toThrow();
    });

    test('should reject expired token', () => {
      const payload = {
        userId: testUser._id,
        organizationId: testOrganization._id,
        role: testUser.role
      };

      // Generate token with immediate expiration
      const expiredToken = jwt.sign(payload, process.env.JWT_SECRET || 'test-secret', {
        expiresIn: '0s'
      });

      expect(() => {
        verifyToken(expiredToken);
      }).toThrow();
    });
  });

  describe('User Registration', () => {
    test('should create user with organization', async () => {
      const userData = {
        name: 'New User',
        email: 'newuser@example.com',
        password: 'password123',
        organizationName: 'New Organization'
      };

      const result = await authService.register(userData);
      
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.organization).toBeDefined();
      expect(result.token).toBeDefined();
    });

    test('should prevent duplicate email registration', async () => {
      const userData = {
        name: 'User One',
        email: 'duplicate@example.com',
        password: 'password123',
        organizationName: 'Organization One'
      };

      // First registration should succeed
      await authService.register(userData);

      // Second registration with same email should fail
      const duplicateData = {
        name: 'User Two',
        email: 'duplicate@example.com',
        password: 'password456',
        organizationName: 'Organization Two'
      };

      const result = await authService.register(duplicateData);
      expect(result.success).toBe(false);
      expect(result.error).toContain('email already exists');
    });

    test('should validate email format', async () => {
      const userData = {
        name: 'Test User',
        email: 'invalid-email',
        password: 'password123',
        organizationName: 'Test Organization'
      };

      const result = await authService.register(userData);
      expect(result.success).toBe(false);
      expect(result.error).toContain('valid email');
    });

    test('should enforce password strength', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: '123', // Weak password
        organizationName: 'Test Organization'
      };

      const result = await authService.register(userData);
      expect(result.success).toBe(false);
      expect(result.error).toContain('password');
    });

    test('should generate unique subdomain', async () => {
      const userData1 = {
        name: 'User One',
        email: 'user1@example.com',
        password: 'password123',
        organizationName: 'Test Company'
      };

      const userData2 = {
        name: 'User Two',
        email: 'user2@example.com',
        password: 'password123',
        organizationName: 'Test Company' // Same name
      };

      const result1 = await authService.register(userData1);
      const result2 = await authService.register(userData2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.organization.subdomain).not.toBe(result2.organization.subdomain);
    });
  });

  describe('User Login', () => {
    let testOrganization;
    let testUser;

    beforeEach(async () => {
      testOrganization = await Organization.create({
        name: 'Test Organization',
        subdomain: 'test-org',
        isActive: true,
        subscriptionStatus: 'active'
      });

      testUser = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: await bcrypt.hash('password123', 10),
        organizationId: testOrganization._id,
        role: 'user',
        isActive: true,
        emailVerified: true
      });
    });

    test('should login with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const result = await authService.login(loginData);
      
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.user.organizationId).toBe(testOrganization._id.toString());
    });

    test('should reject invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      const result = await authService.login(loginData);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid credentials');
    });

    test('should reject invalid password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const result = await authService.login(loginData);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid credentials');
    });

    test('should reject login for inactive user', async () => {
      await User.findByIdAndUpdate(testUser._id, { isActive: false });

      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const result = await authService.login(loginData);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Account is inactive');
    });

    test('should reject login for unverified email', async () => {
      await User.findByIdAndUpdate(testUser._id, { emailVerified: false });

      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const result = await authService.login(loginData);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Email not verified');
    });

    test('should reject login for inactive organization', async () => {
      await Organization.findByIdAndUpdate(testOrganization._id, { isActive: false });

      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const result = await authService.login(loginData);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Organization is inactive');
    });
  });

  describe('Role-Based Authorization', () => {
    let testOrganization;
    let adminUser;
    let regularUser;
    let viewerUser;

    beforeEach(async () => {
      testOrganization = await Organization.create({
        name: 'Test Organization',
        subdomain: 'test-org',
        isActive: true,
        subscriptionStatus: 'active'
      });

      adminUser = await User.create({
        name: 'Admin User',
        email: 'admin@example.com',
        password: await bcrypt.hash('password123', 10),
        organizationId: testOrganization._id,
        role: 'admin',
        isActive: true,
        emailVerified: true
      });

      regularUser = await User.create({
        name: 'Regular User',
        email: 'user@example.com',
        password: await bcrypt.hash('password123', 10),
        organizationId: testOrganization._id,
        role: 'user',
        isActive: true,
        emailVerified: true
      });

      viewerUser = await User.create({
        name: 'Viewer User',
        email: 'viewer@example.com',
        password: await bcrypt.hash('password123', 10),
        organizationId: testOrganization._id,
        role: 'viewer',
        isActive: true,
        emailVerified: true
      });
    });

    test('should authorize admin for all operations', () => {
      const adminToken = generateToken({
        userId: adminUser._id,
        organizationId: testOrganization._id,
        role: 'admin'
      });

      const permissions = authService.getUserPermissions(adminToken);
      
      expect(permissions.canCreate).toBe(true);
      expect(permissions.canRead).toBe(true);
      expect(permissions.canUpdate).toBe(true);
      expect(permissions.canDelete).toBe(true);
      expect(permissions.canManageUsers).toBe(true);
    });

    test('should authorize user for basic operations', () => {
      const userToken = generateToken({
        userId: regularUser._id,
        organizationId: testOrganization._id,
        role: 'user'
      });

      const permissions = authService.getUserPermissions(userToken);
      
      expect(permissions.canCreate).toBe(true);
      expect(permissions.canRead).toBe(true);
      expect(permissions.canUpdate).toBe(true);
      expect(permissions.canDelete).toBe(true);
      expect(permissions.canManageUsers).toBe(false);
    });

    test('should restrict viewer to read-only operations', () => {
      const viewerToken = generateToken({
        userId: viewerUser._id,
        organizationId: testOrganization._id,
        role: 'viewer'
      });

      const permissions = authService.getUserPermissions(viewerToken);
      
      expect(permissions.canCreate).toBe(false);
      expect(permissions.canRead).toBe(true);
      expect(permissions.canUpdate).toBe(false);
      expect(permissions.canDelete).toBe(false);
      expect(permissions.canManageUsers).toBe(false);
    });
  });

  describe('Multi-Tenant Isolation', () => {
    let organization1;
    let organization2;
    let user1;
    let user2;

    beforeEach(async () => {
      organization1 = await Organization.create({
        name: 'Organization 1',
        subdomain: 'org1',
        isActive: true,
        subscriptionStatus: 'active'
      });

      organization2 = await Organization.create({
        name: 'Organization 2',
        subdomain: 'org2',
        isActive: true,
        subscriptionStatus: 'active'
      });

      user1 = await User.create({
        name: 'User 1',
        email: 'user1@example.com',
        password: await bcrypt.hash('password123', 10),
        organizationId: organization1._id,
        role: 'admin',
        isActive: true,
        emailVerified: true
      });

      user2 = await User.create({
        name: 'User 2',
        email: 'user2@example.com',
        password: await bcrypt.hash('password123', 10),
        organizationId: organization2._id,
        role: 'admin',
        isActive: true,
        emailVerified: true
      });
    });

    test('should isolate users by organization', async () => {
      const token1 = generateToken({
        userId: user1._id,
        organizationId: organization1._id,
        role: 'admin'
      });

      const token2 = generateToken({
        userId: user2._id,
        organizationId: organization2._id,
        role: 'admin'
      });

      const decoded1 = verifyToken(token1);
      const decoded2 = verifyToken(token2);

      expect(decoded1.organizationId).toBe(organization1._id.toString());
      expect(decoded2.organizationId).toBe(organization2._id.toString());
      expect(decoded1.organizationId).not.toBe(decoded2.organizationId);
    });

    test('should prevent cross-tenant access', async () => {
      const user1Token = generateToken({
        userId: user1._id,
        organizationId: organization1._id,
        role: 'admin'
      });

      // Try to access organization2 data with organization1 token
      const hasAccess = authService.hasOrganizationAccess(user1Token, organization2._id);
      expect(hasAccess).toBe(false);
    });

    test('should allow same-tenant access', async () => {
      const user1Token = generateToken({
        userId: user1._id,
        organizationId: organization1._id,
        role: 'admin'
      });

      // Access organization1 data with organization1 token
      const hasAccess = authService.hasOrganizationAccess(user1Token, organization1._id);
      expect(hasAccess).toBe(true);
    });
  });

  describe('Email Verification', () => {
    let testOrganization;
    let testUser;

    beforeEach(async () => {
      testOrganization = await Organization.create({
        name: 'Test Organization',
        subdomain: 'test-org',
        isActive: true,
        subscriptionStatus: 'active'
      });

      testUser = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: await bcrypt.hash('password123', 10),
        organizationId: testOrganization._id,
        role: 'user',
        isActive: true,
        emailVerified: false,
        emailVerificationToken: 'test-verification-token'
      });
    });

    test('should generate email verification token', async () => {
      const token = authService.generateEmailVerificationToken();
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(20);
    });

    test('should verify email with valid token', async () => {
      const result = await authService.verifyEmail('test-verification-token');
      
      expect(result.success).toBe(true);
      
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.emailVerified).toBe(true);
      expect(updatedUser.emailVerificationToken).toBeNull();
    });

    test('should reject invalid verification token', async () => {
      const result = await authService.verifyEmail('invalid-token');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid verification token');
    });

    test('should handle already verified email', async () => {
      await User.findByIdAndUpdate(testUser._id, {
        emailVerified: true,
        emailVerificationToken: null
      });

      const result = await authService.verifyEmail('test-verification-token');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('already verified');
    });
  });

  describe('Password Reset', () => {
    let testOrganization;
    let testUser;

    beforeEach(async () => {
      testOrganization = await Organization.create({
        name: 'Test Organization',
        subdomain: 'test-org',
        isActive: true,
        subscriptionStatus: 'active'
      });

      testUser = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: await bcrypt.hash('password123', 10),
        organizationId: testOrganization._id,
        role: 'user',
        isActive: true,
        emailVerified: true
      });
    });

    test('should generate password reset token', async () => {
      const result = await authService.requestPasswordReset('test@example.com');
      
      expect(result.success).toBe(true);
      
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.passwordResetToken).toBeDefined();
      expect(updatedUser.passwordResetExpires).toBeDefined();
    });

    test('should reset password with valid token', async () => {
      const resetToken = 'test-reset-token';
      const resetExpires = new Date(Date.now() + 3600000); // 1 hour from now

      await User.findByIdAndUpdate(testUser._id, {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires
      });

      const result = await authService.resetPassword(resetToken, 'newPassword123');
      
      expect(result.success).toBe(true);
      
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.passwordResetToken).toBeNull();
      expect(updatedUser.passwordResetExpires).toBeNull();
      
      // Verify new password works
      const isValid = await bcrypt.compare('newPassword123', updatedUser.password);
      expect(isValid).toBe(true);
    });

    test('should reject expired reset token', async () => {
      const resetToken = 'expired-reset-token';
      const resetExpires = new Date(Date.now() - 3600000); // 1 hour ago

      await User.findByIdAndUpdate(testUser._id, {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires
      });

      const result = await authService.resetPassword(resetToken, 'newPassword123');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('expired');
    });

    test('should reject invalid reset token', async () => {
      const result = await authService.resetPassword('invalid-token', 'newPassword123');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid reset token');
    });
  });

  describe('Rate Limiting', () => {
    test('should track login attempts', async () => {
      const email = 'test@example.com';
      
      // Simulate multiple failed login attempts
      for (let i = 0; i < 3; i++) {
        await authService.recordFailedLogin(email);
      }
      
      const attempts = await authService.getFailedLoginAttempts(email);
      expect(attempts).toBe(3);
    });

    test('should block after max attempts', async () => {
      const email = 'blocked@example.com';
      
      // Simulate max failed attempts
      for (let i = 0; i < 5; i++) {
        await authService.recordFailedLogin(email);
      }
      
      const isBlocked = await authService.isLoginBlocked(email);
      expect(isBlocked).toBe(true);
    });

    test('should reset attempts after successful login', async () => {
      const email = 'reset@example.com';
      
      // Record some failed attempts
      await authService.recordFailedLogin(email);
      await authService.recordFailedLogin(email);
      
      // Reset after successful login
      await authService.resetFailedLoginAttempts(email);
      
      const attempts = await authService.getFailedLoginAttempts(email);
      expect(attempts).toBe(0);
    });
  });
});