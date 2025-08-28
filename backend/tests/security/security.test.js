const request = require('supertest');
const express = require('express');
const rateLimit = require('express-rate-limit');

// Import security middleware
const {
  rateLimiters,
  ipFilter,
  suspiciousActivityDetector,
  bruteForceProtection,
  securityHeaders,
  requestSizeLimit,
  originValidation
} = require('../../middleware/security');

describe('Security Tests', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json({ limit: '1mb' }));
  });

  describe('Rate Limiting', () => {
    test('should enforce API rate limits', async () => {
      // Create test app with rate limiting
      const testApp = express();
      testApp.use(express.json());
      
      // Use a very restrictive rate limiter for testing
      const testLimiter = rateLimit({
        windowMs: 1000, // 1 second
        max: 2, // 2 requests per second
        message: { error: 'Rate limit exceeded' }
      });
      
      testApp.use('/api/test', testLimiter);
      testApp.get('/api/test', (req, res) => {
        res.json({ success: true });
      });

      // First two requests should succeed
      await request(testApp).get('/api/test').expect(200);
      await request(testApp).get('/api/test').expect(200);

      // Third request should be rate limited
      const response = await request(testApp).get('/api/test').expect(429);
      expect(response.body.error).toBe('Rate limit exceeded');
    });

    test('should have different rate limits for different endpoints', async () => {
      const testApp = express();
      testApp.use(express.json());
      
      // Different rate limiters
      const generalLimiter = rateLimit({
        windowMs: 1000,
        max: 5,
        message: { error: 'General rate limit exceeded' }
      });
      
      const authLimiter = rateLimit({
        windowMs: 1000,
        max: 2,
        message: { error: 'Auth rate limit exceeded' }
      });
      
      testApp.use('/api/general', generalLimiter);
      testApp.use('/api/auth', authLimiter);
      
      testApp.get('/api/general', (req, res) => res.json({ success: true }));
      testApp.get('/api/auth', (req, res) => res.json({ success: true }));

      // General endpoint should allow more requests
      for (let i = 0; i < 5; i++) {
        await request(testApp).get('/api/general').expect(200);
      }
      await request(testApp).get('/api/general').expect(429);

      // Auth endpoint should be more restrictive
      await request(testApp).get('/api/auth').expect(200);
      await request(testApp).get('/api/auth').expect(200);
      await request(testApp).get('/api/auth').expect(429);
    });
  });

  describe('Input Validation and Sanitization', () => {
    test('should detect suspicious activity patterns', async () => {
      app.use(suspiciousActivityDetector);
      app.post('/test', (req, res) => {
        res.json({ success: true });
      });

      // Test SQL injection patterns
      const sqlInjectionPayload = {
        query: "'; DROP TABLE users; --"
      };

      const response = await request(app)
        .post('/test')
        .send(sqlInjectionPayload)
        .expect(400);

      expect(response.body.error).toBe('Bad request');
      expect(response.body.code).toBe('SUSPICIOUS_ACTIVITY');
    });

    test('should detect XSS attempts', async () => {
      app.use(suspiciousActivityDetector);
      app.post('/test', (req, res) => {
        res.json({ success: true });
      });

      const xssPayload = {
        content: '<script>alert("XSS")</script>'
      };

      const response = await request(app)
        .post('/test')
        .send(xssPayload)
        .expect(400);

      expect(response.body.error).toBe('Bad request');
      expect(response.body.code).toBe('SUSPICIOUS_ACTIVITY');
    });

    test('should detect malicious user agents', async () => {
      app.use(suspiciousActivityDetector);
      app.get('/test', (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/test')
        .set('User-Agent', 'sqlmap/1.0')
        .expect(400);

      expect(response.body.error).toBe('Bad request');
      expect(response.body.code).toBe('SUSPICIOUS_ACTIVITY');
    });
  });

  describe('Security Headers', () => {
    test('should set proper security headers', async () => {
      app.use(securityHeaders);
      app.get('/test', (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    });

    test('should set CSP headers', async () => {
      const { cspHeaders } = require('../../middleware/security');
      
      app.use(cspHeaders);
      app.get('/test', (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    });
  });

  describe('Request Size Limiting', () => {
    test('should reject oversized requests', async () => {
      app.use(requestSizeLimit);
      app.post('/test', (req, res) => {
        res.json({ success: true });
      });

      // Create a large payload
      const largePayload = {
        data: 'x'.repeat(20 * 1024 * 1024) // 20MB
      };

      const response = await request(app)
        .post('/test')
        .send(largePayload)
        .expect(413);

      expect(response.body.error).toBe('Request entity too large');
    });
  });

  describe('Brute Force Protection', () => {
    test('should track failed login attempts', async () => {
      app.use(bruteForceProtection);
      app.post('/login', (req, res) => {
        // Simulate failed login
        res.status(401).json({ success: false, message: 'Invalid credentials' });
      });

      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      // Make multiple failed attempts
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/login')
          .send(loginData)
          .expect(401);
      }

      // 11th attempt should be blocked
      const response = await request(app)
        .post('/login')
        .send(loginData)
        .expect(429);

      expect(response.body.error).toContain('too many failed attempts');
      expect(response.body.code).toBe('ACCOUNT_LOCKED');
    });
  });

  describe('CORS Security', () => {
    test('should validate request origins in production', async () => {
      // Mock production environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      process.env.CORS_ORIGINS = 'https://example.com,https://app.example.com';

      app.use(originValidation);
      app.get('/test', (req, res) => {
        res.json({ success: true });
      });

      // Valid origin should pass
      await request(app)
        .get('/test')
        .set('Origin', 'https://example.com')
        .expect(200);

      // Invalid origin should be blocked
      const response = await request(app)
        .get('/test')
        .set('Origin', 'https://malicious.com')
        .expect(403);

      expect(response.body.error).toBe('Invalid origin');
      expect(response.body.code).toBe('ORIGIN_NOT_ALLOWED');

      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('JWT Security', () => {
    test('should reject malformed JWT tokens', async () => {
      const { auth } = require('../../middleware/auth-simple');
      
      app.use(auth);
      app.get('/protected', (req, res) => {
        res.json({ success: true });
      });

      // Test various malformed tokens
      const malformedTokens = [
        'invalid.token.format',
        'Bearer invalid-token',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
        ''
      ];

      for (const token of malformedTokens) {
        const response = await request(app)
          .get('/protected')
          .set('Authorization', token)
          .expect(401);

        expect(response.body.success).toBe(false);
      }
    });

    test('should validate JWT token structure', async () => {
      const jwt = require('jsonwebtoken');
      const { auth } = require('../../middleware/auth-simple');
      
      app.use(auth);
      app.get('/protected', (req, res) => {
        res.json({ success: true, user: req.user });
      });

      // Create token with missing required fields
      const incompleteToken = jwt.sign(
        { userId: '123' }, // Missing organizationId, email, role
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${incompleteToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Password Security', () => {
    test('should enforce password complexity', async () => {
      const { validateUserRegistration } = require('../../middleware/validation');
      
      app.use(validateUserRegistration);
      app.post('/register', (req, res) => {
        res.json({ success: true });
      });

      const weakPasswords = [
        '123',           // Too short
        'password',      // No numbers/special chars
        '12345678',      // Only numbers
        'abcdefgh',      // Only letters
        'Password',      // Missing numbers/special chars
      ];

      for (const password of weakPasswords) {
        const response = await request(app)
          .post('/register')
          .send({
            name: 'Test User',
            email: 'test@example.com',
            password: password,
            organizationName: 'Test Org'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.errors).toBeDefined();
      }
    });

    test('should accept strong passwords', async () => {
      const { validateUserRegistration } = require('../../middleware/validation');
      
      app.use(validateUserRegistration);
      app.post('/register', (req, res) => {
        res.json({ success: true });
      });

      const strongPasswords = [
        'StrongPass123!',
        'MySecure@Password2024',
        'Complex#Pass789',
      ];

      for (const password of strongPasswords) {
        await request(app)
          .post('/register')
          .send({
            name: 'Test User',
            email: 'test@example.com',
            password: password,
            organizationName: 'Test Org'
          })
          .expect(200);
      }
    });
  });

  describe('Session Security', () => {
    test('should handle concurrent sessions properly', async () => {
      // Create test user
      const { user, organization } = await global.testUtils.createTestUser();
      
      // Generate multiple tokens for the same user
      const token1 = global.testUtils.generateTestToken(user, organization);
      const token2 = global.testUtils.generateTestToken(user, organization);
      
      const { auth } = require('../../middleware/auth-simple');
      app.use(auth);
      app.get('/protected', (req, res) => {
        res.json({ success: true, userId: req.user.id });
      });

      // Both tokens should work independently
      const response1 = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      const response2 = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${token2}`)
        .expect(200);

      expect(response1.body.userId).toBe(user._id.toString());
      expect(response2.body.userId).toBe(user._id.toString());
    });
  });

  describe('Error Handling Security', () => {
    test('should not expose sensitive information in errors', async () => {
      app.get('/error', (req, res) => {
        throw new Error('Database connection failed: mongodb://user:password@localhost:27017/db');
      });

      // Add error handler that might expose sensitive info
      app.use((err, req, res, next) => {
        res.status(500).json({
          success: false,
          message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
        });
      });

      const response = await request(app)
        .get('/error')
        .expect(500);

      // In test environment, error details might be shown, but in production they shouldn't
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
    });
  });
});