const rateLimit = require('express-rate-limit');
const { logSecurityEvent } = require('./monitoring');

// Advanced rate limiting configurations
const createRateLimiter = (windowMs, max, message, skipSuccessfulRequests = false) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    skipSuccessfulRequests,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
      logSecurityEvent('rate_limit_exceeded', {
        ip: req.ip,
        endpoint: req.url,
        method: req.method,
        userAgent: req.get('User-Agent'),
        limit: options.max,
        windowMs: options.windowMs
      }, req);
      
      res.status(429).json(options.message);
    }
  });
};

// Different rate limiters for different endpoints
const rateLimiters = {
  // General API rate limiting
  api: createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    100, // 100 requests per window
    'Too many API requests, please try again later'
  ),

  // Strict rate limiting for authentication endpoints
  auth: createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    5, // 5 attempts per window
    'Too many authentication attempts, please try again later',
    true // Skip successful requests
  ),

  // Password reset rate limiting
  passwordReset: createRateLimiter(
    60 * 60 * 1000, // 1 hour
    3, // 3 attempts per hour
    'Too many password reset attempts, please try again later'
  ),

  // Registration rate limiting
  registration: createRateLimiter(
    60 * 60 * 1000, // 1 hour
    3, // 3 registrations per hour per IP
    'Too many registration attempts, please try again later'
  ),

  // File upload rate limiting
  upload: createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    10, // 10 uploads per window
    'Too many file uploads, please try again later'
  )
};

// IP whitelist/blacklist middleware
const ipFilter = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  
  // Check if IP is blacklisted
  const blacklistedIPs = process.env.BLACKLISTED_IPS 
    ? process.env.BLACKLISTED_IPS.split(',').map(ip => ip.trim())
    : [];
  
  if (blacklistedIPs.includes(clientIP)) {
    logSecurityEvent('blocked_ip_access', {
      ip: clientIP,
      endpoint: req.url,
      method: req.method,
      reason: 'IP blacklisted'
    }, req);
    
    return res.status(403).json({
      error: 'Access denied',
      code: 'IP_BLOCKED'
    });
  }
  
  // Check if IP is whitelisted (for admin endpoints)
  const whitelistedIPs = process.env.WHITELISTED_IPS 
    ? process.env.WHITELISTED_IPS.split(',').map(ip => ip.trim())
    : [];
  
  // If whitelist is configured and this is an admin endpoint
  if (whitelistedIPs.length > 0 && req.url.includes('/admin/')) {
    if (!whitelistedIPs.includes(clientIP)) {
      logSecurityEvent('unauthorized_admin_access', {
        ip: clientIP,
        endpoint: req.url,
        method: req.method,
        reason: 'IP not whitelisted for admin access'
      }, req);
      
      return res.status(403).json({
        error: 'Access denied',
        code: 'ADMIN_ACCESS_RESTRICTED'
      });
    }
  }
  
  next();
};

// Suspicious activity detection
const suspiciousActivityDetector = (req, res, next) => {
  const userAgent = req.get('User-Agent') || '';
  const clientIP = req.ip;
  
  // Detect common attack patterns
  const suspiciousPatterns = [
    /sqlmap/i,
    /nikto/i,
    /nmap/i,
    /masscan/i,
    /zap/i,
    /burp/i,
    /acunetix/i,
    /nessus/i,
    /<script/i,
    /javascript:/i,
    /vbscript:/i,
    /onload=/i,
    /onerror=/i,
    /eval\(/i,
    /union.*select/i,
    /drop.*table/i,
    /insert.*into/i,
    /update.*set/i,
    /delete.*from/i
  ];
  
  // Check User-Agent for suspicious patterns
  const suspiciousUA = suspiciousPatterns.some(pattern => pattern.test(userAgent));
  
  // Check URL for suspicious patterns
  const suspiciousURL = suspiciousPatterns.some(pattern => pattern.test(req.url));
  
  // Check request body for suspicious patterns (if exists)
  let suspiciousBody = false;
  if (req.body && typeof req.body === 'object') {
    const bodyString = JSON.stringify(req.body);
    suspiciousBody = suspiciousPatterns.some(pattern => pattern.test(bodyString));
  }
  
  if (suspiciousUA || suspiciousURL || suspiciousBody) {
    logSecurityEvent('suspicious_activity_detected', {
      ip: clientIP,
      userAgent: userAgent,
      endpoint: req.url,
      method: req.method,
      suspiciousUA,
      suspiciousURL,
      suspiciousBody,
      body: req.body
    }, req);
    
    // Block the request
    return res.status(400).json({
      error: 'Bad request',
      code: 'SUSPICIOUS_ACTIVITY'
    });
  }
  
  next();
};

// Brute force protection for specific users
const bruteForceProtection = (req, res, next) => {
  // This would typically use Redis or a database to track attempts
  // For now, we'll use in-memory storage (not suitable for production clusters)
  if (!global.loginAttempts) {
    global.loginAttempts = new Map();
  }
  
  const identifier = req.body.email || req.ip;
  const attempts = global.loginAttempts.get(identifier) || { count: 0, lastAttempt: Date.now() };
  
  // Reset attempts if more than 1 hour has passed
  if (Date.now() - attempts.lastAttempt > 60 * 60 * 1000) {
    attempts.count = 0;
  }
  
  // Block if too many attempts
  if (attempts.count >= 10) {
    logSecurityEvent('brute_force_detected', {
      identifier,
      attempts: attempts.count,
      ip: req.ip,
      endpoint: req.url
    }, req);
    
    return res.status(429).json({
      error: 'Too many failed attempts. Account temporarily locked.',
      code: 'ACCOUNT_LOCKED',
      retryAfter: 3600 // 1 hour
    });
  }
  
  // Store attempt info for failed logins (handled in auth controller)
  req.bruteForceData = { identifier, attempts };
  
  next();
};

// Content Security Policy headers
const cspHeaders = (req, res, next) => {
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "media-src 'self'",
    "object-src 'none'",
    "child-src 'none'",
    "worker-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "manifest-src 'self'"
  ].join('; ');
  
  res.setHeader('Content-Security-Policy', csp);
  next();
};

// Additional security headers
const securityHeaders = (req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Expect-CT header for certificate transparency
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Expect-CT', 'max-age=86400, enforce');
  }
  
  next();
};

// Request size limiting
const requestSizeLimit = (req, res, next) => {
  const maxSize = parseInt(process.env.MAX_REQUEST_SIZE) || 10 * 1024 * 1024; // 10MB default
  
  if (req.headers['content-length'] && parseInt(req.headers['content-length']) > maxSize) {
    logSecurityEvent('request_size_exceeded', {
      ip: req.ip,
      endpoint: req.url,
      contentLength: req.headers['content-length'],
      maxSize
    }, req);
    
    return res.status(413).json({
      error: 'Request entity too large',
      maxSize: maxSize
    });
  }
  
  next();
};

// Validate request origin
const originValidation = (req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }
  
  const origin = req.get('Origin') || req.get('Referer');
  const allowedOrigins = process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
    : [process.env.FRONTEND_URL];
  
  // Skip validation for certain endpoints
  const skipValidation = ['/health', '/ready', '/live', '/metrics'].some(path => 
    req.url.startsWith(path)
  );
  
  if (!skipValidation && origin) {
    const isAllowed = allowedOrigins.some(allowed => 
      origin.startsWith(allowed)
    );
    
    if (!isAllowed) {
      logSecurityEvent('invalid_origin', {
        origin,
        allowedOrigins,
        ip: req.ip,
        endpoint: req.url
      }, req);
      
      return res.status(403).json({
        error: 'Invalid origin',
        code: 'ORIGIN_NOT_ALLOWED'
      });
    }
  }
  
  next();
};

// Security audit logging
const securityAuditLogger = (req, res, next) => {
  // Log sensitive operations
  const sensitiveEndpoints = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/reset-password',
    '/api/organization',
    '/api/users'
  ];
  
  const isSensitive = sensitiveEndpoints.some(endpoint => 
    req.url.startsWith(endpoint)
  );
  
  if (isSensitive) {
    const originalSend = res.send;
    res.send = function(data) {
      // Log the security event
      logSecurityEvent('sensitive_endpoint_access', {
        endpoint: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        statusCode: res.statusCode,
        user: req.user ? {
          id: req.user.id,
          email: req.user.email,
          organizationId: req.user.organizationId
        } : null
      }, req);
      
      originalSend.call(this, data);
    };
  }
  
  next();
};

module.exports = {
  rateLimiters,
  ipFilter,
  suspiciousActivityDetector,
  bruteForceProtection,
  cspHeaders,
  securityHeaders,
  requestSizeLimit,
  originValidation,
  securityAuditLogger
};