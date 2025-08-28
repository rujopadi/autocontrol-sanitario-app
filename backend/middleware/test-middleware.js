/**
 * Test-specific middleware
 * Provides simplified middleware for testing environment
 */

// Mock rate limiting for tests
const mockRateLimit = (req, res, next) => {
  // Skip rate limiting in test environment
  if (process.env.NODE_ENV === 'test') {
    return next();
  }
  
  // In non-test environments, use actual rate limiting
  const rateLimit = require('express-rate-limit');
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
      success: false,
      message: 'Demasiadas solicitudes, intenta de nuevo más tarde'
    }
  });
  
  return limiter(req, res, next);
};

// Mock security middleware for tests
const mockSecurity = (req, res, next) => {
  // Skip complex security checks in test environment
  if (process.env.NODE_ENV === 'test') {
    return next();
  }
  
  // In non-test environments, use actual security middleware
  const helmet = require('helmet');
  return helmet()(req, res, next);
};

// Mock audit middleware for tests
const mockAudit = (req, res, next) => {
  // Skip audit logging in test environment
  if (process.env.NODE_ENV === 'test') {
    return next();
  }
  
  // In non-test environments, use actual audit middleware
  const { auditLog } = require('./audit');
  return auditLog(req, res, next);
};

// Mock email service for tests
const mockEmailService = {
  sendEmail: async (options) => {
    if (process.env.NODE_ENV === 'test') {
      // Mock successful email sending
      return {
        success: true,
        messageId: 'test-message-id',
        message: 'Email sent successfully (mocked)'
      };
    }
    
    // In non-test environments, use actual email service
    const emailService = require('../services/emailService');
    return emailService.sendEmail(options);
  }
};

module.exports = {
  mockRateLimit,
  mockSecurity,
  mockAudit,
  mockEmailService
};