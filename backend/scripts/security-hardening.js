#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class SecurityHardening {
  constructor() {
    this.projectRoot = path.join(__dirname, '..');
    this.securityChecks = [];
    this.warnings = [];
    this.errors = [];
  }

  async checkNodeSecurity() {
    console.log('🔍 Checking Node.js security...');
    
    try {
      // Check for known vulnerabilities
      const { stdout, stderr } = await execAsync('npm audit --audit-level moderate --json');
      const auditResult = JSON.parse(stdout);
      
      if (auditResult.metadata.vulnerabilities.total > 0) {
        this.warnings.push(`Found ${auditResult.metadata.vulnerabilities.total} security vulnerabilities`);
        console.log('⚠️ Security vulnerabilities found. Run "npm audit fix" to resolve.');
      } else {
        console.log('✅ No security vulnerabilities found');
      }
    } catch (error) {
      if (error.stdout) {
        try {
          const auditResult = JSON.parse(error.stdout);
          if (auditResult.metadata.vulnerabilities.total > 0) {
            this.errors.push(`Critical security vulnerabilities found: ${auditResult.metadata.vulnerabilities.total}`);
          }
        } catch (parseError) {
          this.warnings.push('Could not parse npm audit results');
        }
      }
    }
  }

  async checkEnvironmentVariables() {
    console.log('🔧 Checking environment variables security...');
    
    const requiredSecureVars = [
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'MONGODB_URI',
      'EMAIL_API_KEY'
    ];
    
    const missingVars = [];
    const weakVars = [];
    
    for (const varName of requiredSecureVars) {
      const value = process.env[varName];
      
      if (!value) {
        missingVars.push(varName);
      } else {
        // Check for weak secrets
        if (varName.includes('SECRET') && value.length < 32) {
          weakVars.push(`${varName} is too short (minimum 32 characters)`);
        }
        
        // Check for default/example values
        if (value.includes('change_me') || value.includes('example') || value.includes('your-')) {
          weakVars.push(`${varName} appears to contain default/example value`);
        }
      }
    }
    
    if (missingVars.length > 0) {
      this.errors.push(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
    
    if (weakVars.length > 0) {
      this.warnings.push(`Weak environment variables: ${weakVars.join(', ')}`);
    }
    
    if (missingVars.length === 0 && weakVars.length === 0) {
      console.log('✅ Environment variables security check passed');
    }
  }

  async checkFilePermissions() {
    console.log('📁 Checking file permissions...');
    
    const sensitiveFiles = [
      '.env',
      '.env.production',
      'config/database.prod.js',
      'logs/',
      'backups/'
    ];
    
    for (const file of sensitiveFiles) {
      const filePath = path.join(this.projectRoot, file);
      
      try {
        const stats = await fs.stat(filePath);
        const mode = stats.mode & parseInt('777', 8);
        
        // Check if file is readable by others
        if (mode & parseInt('044', 8)) {
          this.warnings.push(`File ${file} is readable by others (permissions: ${mode.toString(8)})`);
        }
        
        // Check if file is writable by others
        if (mode & parseInt('022', 8)) {
          this.warnings.push(`File ${file} is writable by others (permissions: ${mode.toString(8)})`);
        }
        
      } catch (error) {
        // File doesn't exist, which is fine for optional files
        if (file.includes('.env')) {
          this.warnings.push(`Environment file ${file} not found`);
        }
      }
    }
    
    console.log('✅ File permissions check completed');
  }

  async checkDatabaseSecurity() {
    console.log('🗄️ Checking database security...');
    
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      this.errors.push('MONGODB_URI not configured');
      return;
    }
    
    // Check if using authentication
    if (!mongoUri.includes('@')) {
      this.errors.push('MongoDB URI does not include authentication credentials');
    }
    
    // Check if using SSL/TLS
    if (mongoUri.startsWith('mongodb://') && !mongoUri.includes('ssl=true')) {
      this.warnings.push('MongoDB connection is not using SSL/TLS');
    }
    
    // Check if using localhost in production
    if (process.env.NODE_ENV === 'production' && mongoUri.includes('localhost')) {
      this.warnings.push('Using localhost MongoDB in production environment');
    }
    
    console.log('✅ Database security check completed');
  }

  async checkSSLConfiguration() {
    console.log('🔒 Checking SSL/HTTPS configuration...');
    
    if (process.env.NODE_ENV === 'production') {
      // Check if HTTPS is enforced
      if (!process.env.FRONTEND_URL || !process.env.FRONTEND_URL.startsWith('https://')) {
        this.errors.push('FRONTEND_URL should use HTTPS in production');
      }
      
      // Check CORS origins
      const corsOrigins = process.env.CORS_ORIGINS;
      if (corsOrigins) {
        const origins = corsOrigins.split(',');
        const httpOrigins = origins.filter(origin => origin.trim().startsWith('http://'));
        
        if (httpOrigins.length > 0) {
          this.warnings.push(`CORS origins include HTTP (insecure): ${httpOrigins.join(', ')}`);
        }
      }
    }
    
    console.log('✅ SSL configuration check completed');
  }

  async checkRateLimiting() {
    console.log('⏱️ Checking rate limiting configuration...');
    
    const rateLimitConfig = {
      RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS || '900000',
      RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS || '100',
      AUTH_RATE_LIMIT_WINDOW_MS: process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000',
      AUTH_RATE_LIMIT_MAX_REQUESTS: process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '5'
    };
    
    // Check if rate limiting is too permissive
    if (parseInt(rateLimitConfig.RATE_LIMIT_MAX_REQUESTS) > 1000) {
      this.warnings.push('General rate limit is very high (>1000 requests per window)');
    }
    
    if (parseInt(rateLimitConfig.AUTH_RATE_LIMIT_MAX_REQUESTS) > 10) {
      this.warnings.push('Auth rate limit is high (>10 attempts per window)');
    }
    
    console.log('✅ Rate limiting configuration check completed');
  }

  async checkLoggingConfiguration() {
    console.log('📋 Checking logging configuration...');
    
    // Check if sensitive data might be logged
    const logLevel = process.env.LOG_LEVEL || 'info';
    
    if (logLevel === 'debug' && process.env.NODE_ENV === 'production') {
      this.warnings.push('Debug logging enabled in production (may expose sensitive data)');
    }
    
    // Check if logs directory exists and is writable
    const logsDir = path.join(this.projectRoot, 'logs');
    try {
      await fs.access(logsDir, fs.constants.W_OK);
      console.log('✅ Logs directory is writable');
    } catch (error) {
      this.warnings.push('Logs directory is not writable or does not exist');
    }
    
    console.log('✅ Logging configuration check completed');
  }

  async checkDependencySecurity() {
    console.log('📦 Checking dependency security...');
    
    try {
      const packageJson = JSON.parse(
        await fs.readFile(path.join(this.projectRoot, 'package.json'), 'utf8')
      );
      
      // Check for outdated dependencies
      const { stdout } = await execAsync('npm outdated --json');
      if (stdout.trim()) {
        const outdated = JSON.parse(stdout);
        const outdatedCount = Object.keys(outdated).length;
        
        if (outdatedCount > 0) {
          this.warnings.push(`${outdatedCount} dependencies are outdated`);
        }
      }
      
      // Check for development dependencies in production
      if (process.env.NODE_ENV === 'production' && packageJson.devDependencies) {
        this.warnings.push('Development dependencies should not be installed in production');
      }
      
    } catch (error) {
      this.warnings.push('Could not check dependency status');
    }
    
    console.log('✅ Dependency security check completed');
  }

  async generateSecurityReport() {
    console.log('📊 Generating security report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      summary: {
        errors: this.errors.length,
        warnings: this.warnings.length,
        status: this.errors.length === 0 ? 'PASS' : 'FAIL'
      },
      errors: this.errors,
      warnings: this.warnings,
      recommendations: [
        'Regularly update dependencies with "npm audit fix"',
        'Use strong, unique passwords for all accounts',
        'Enable two-factor authentication where possible',
        'Regularly backup your database',
        'Monitor application logs for suspicious activity',
        'Keep SSL certificates up to date',
        'Use environment variables for all sensitive configuration',
        'Implement proper error handling to avoid information disclosure',
        'Regular security audits and penetration testing',
        'Keep the operating system and all software up to date'
      ]
    };
    
    // Save report to file
    const reportPath = path.join(this.projectRoot, 'security-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📄 Security report saved to: ${reportPath}`);
    
    return report;
  }

  async applySecurityHardening() {
    console.log('🔧 Applying security hardening...');
    
    // Create .security directory for security-related files
    const securityDir = path.join(this.projectRoot, '.security');
    try {
      await fs.mkdir(securityDir, { recursive: true });
    } catch (error) {
      // Directory already exists
    }
    
    // Create security policy file
    const securityPolicy = {
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      policies: {
        passwordPolicy: {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: true
        },
        sessionPolicy: {
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
          secure: process.env.NODE_ENV === 'production',
          httpOnly: true,
          sameSite: 'strict'
        },
        rateLimiting: {
          general: {
            windowMs: 15 * 60 * 1000,
            max: 100
          },
          auth: {
            windowMs: 15 * 60 * 1000,
            max: 5
          }
        }
      }
    };
    
    await fs.writeFile(
      path.join(securityDir, 'security-policy.json'),
      JSON.stringify(securityPolicy, null, 2)
    );
    
    // Create security headers configuration
    const securityHeaders = {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; media-src 'self'; object-src 'none'; child-src 'none'; worker-src 'none'; frame-ancestors 'none'; form-action 'self'; base-uri 'self';"
    };
    
    await fs.writeFile(
      path.join(securityDir, 'security-headers.json'),
      JSON.stringify(securityHeaders, null, 2)
    );
    
    console.log('✅ Security hardening applied');
  }

  async runSecurityScan() {
    console.log('🚀 Starting comprehensive security scan...\n');
    
    try {
      await this.checkNodeSecurity();
      await this.checkEnvironmentVariables();
      await this.checkFilePermissions();
      await this.checkDatabaseSecurity();
      await this.checkSSLConfiguration();
      await this.checkRateLimiting();
      await this.checkLoggingConfiguration();
      await this.checkDependencySecurity();
      
      const report = await this.generateSecurityReport();
      await this.applySecurityHardening();
      
      console.log('\n📊 Security Scan Summary:');
      console.log(`Status: ${report.summary.status}`);
      console.log(`Errors: ${report.summary.errors}`);
      console.log(`Warnings: ${report.summary.warnings}`);
      
      if (report.summary.errors > 0) {
        console.log('\n❌ Critical Issues:');
        report.errors.forEach(error => console.log(`  - ${error}`));
      }
      
      if (report.summary.warnings > 0) {
        console.log('\n⚠️ Warnings:');
        report.warnings.forEach(warning => console.log(`  - ${warning}`));
      }
      
      console.log('\n🎉 Security scan completed!');
      
      return report.summary.status === 'PASS';
      
    } catch (error) {
      console.error('❌ Security scan failed:', error.message);
      return false;
    }
  }
}

// CLI interface
const main = async () => {
  const scanner = new SecurityHardening();
  const success = await scanner.runSecurityScan();
  
  process.exit(success ? 0 : 1);
};

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Security hardening failed:', error);
    process.exit(1);
  });
}

module.exports = SecurityHardening;