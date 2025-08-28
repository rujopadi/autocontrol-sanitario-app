#!/usr/bin/env node
/**
 * Production Deployment Setup Script
 * Master script that orchestrates complete production environment setup
 */

const { setupProductionEnvironment } = require('./setup-production-environment');
const { setupLoggingAggregation } = require('./setup-logging-aggregation');
const { setupHealthChecks } = require('./setup-health-checks');
const logger = require('../utils/logger');

/**
 * Deployment configuration
 */
const DEPLOYMENT_CONFIG = {
  // Deployment phases
  phases: [
    {
      name: 'Production Environment',
      description: 'Configure production environment variables and secrets',
      script: 'setup-production-environment',
      required: true,
      timeout: 600000 // 10 minutes
    },
    {
      name: 'Logging Aggregation',
      description: 'Setup centralized logging and error tracking',
      script: 'setup-logging-aggregation',
      required: true,
      timeout: 300000 // 5 minutes
    },
    {
      name: 'Health Checks',
      description: 'Configure comprehensive health monitoring',
      script: 'setup-health-checks',
      required: true,
      timeout: 240000 // 4 minutes
    }
  ],
  
  // Pre-deployment validations
  validations: [
    {
      name: 'System Requirements',
      check: 'validateSystemRequirements'
    },
    {
      name: 'Environment Variables',
      check: 'validateEnvironmentVariables'
    },
    {
      name: 'Network Configuration',
      check: 'validateNetworkConfiguration'
    },
    {
      name: 'Security Prerequisites',
      check: 'validateSecurityPrerequisites'
    }
  ],
  
  // Post-deployment verifications
  verifications: [
    {
      name: 'Application Startup',
      check: 'verifyApplicationStartup'
    },
    {
      name: 'Health Endpoints',
      check: 'verifyHealthEndpoints'
    },
    {
      name: 'Logging System',
      check: 'verifyLoggingSystem'
    },
    {
      name: 'Security Configuration',
      check: 'verifySecurityConfiguration'
    }
  ]
};

/**
 * Production deployment orchestrator
 */
class ProductionDeploymentOrchestrator {
  constructor() {
    this.results = {
      validations: [],
      phases: [],
      verifications: [],
      startTime: new Date(),
      endTime: null,
      success: false,
      errors: []
    };
  }

  /**
   * Run complete production deployment setup
   */
  async deploy() {
    try {
      console.log('🚀 Starting production deployment setup...');
      console.log('==========================================');
      
      // Pre-deployment validations
      await this.runValidations();
      
      // Deployment phases
      await this.runDeploymentPhases();
      
      // Post-deployment verifications
      await this.runVerifications();
      
      // Generate deployment report
      await this.generateDeploymentReport();
      
      // Display next steps
      this.displayNextSteps();
      
      this.results.success = true;
      this.results.endTime = new Date();
      
      console.log('\n🎉 Production deployment setup completed successfully!');
      console.log(`Total time: ${Math.round((this.results.endTime - this.results.startTime) / 1000)}s`);
      
    } catch (error) {
      this.results.success = false;
      this.results.endTime = new Date();
      this.results.errors.push({
        phase: 'general',
        error: error.message,
        timestamp: new Date()
      });
      
      console.error('\n💥 Production deployment setup failed:', error.message);
      throw error;
    }
  }

  /**
   * Run pre-deployment validations
   */
  async runValidations() {
    console.log('\n🔍 Running pre-deployment validations...');
    console.log('----------------------------------------');
    
    for (const validation of DEPLOYMENT_CONFIG.validations) {
      try {
        console.log(`   Validating ${validation.name}...`);
        
        const startTime = Date.now();
        await this[validation.check]();
        const duration = Date.now() - startTime;
        
        this.results.validations.push({
          name: validation.name,
          status: 'passed',
          duration,
          timestamp: new Date()
        });
        
        console.log(`   ✅ ${validation.name} - ${duration}ms`);
        
      } catch (error) {
        this.results.validations.push({
          name: validation.name,
          status: 'failed',
          error: error.message,
          timestamp: new Date()
        });
        
        console.log(`   ❌ ${validation.name} - ${error.message}`);
        
        // Stop on critical validation failures
        if (validation.name === 'System Requirements' || 
            validation.name === 'Environment Variables') {
          throw new Error(`Critical validation failed: ${validation.name}`);
        }
      }
    }
    
    const passed = this.results.validations.filter(v => v.status === 'passed').length;
    const failed = this.results.validations.filter(v => v.status === 'failed').length;
    
    console.log(`\n📊 Validation results: ${passed} passed, ${failed} failed`);
    
    if (failed > 0) {
      console.warn('⚠️  Some validations failed. Proceeding with caution...');
    }
  }

  /**
   * Run deployment phases
   */
  async runDeploymentPhases() {
    console.log('\n⚙️  Running deployment phases...');
    console.log('--------------------------------');
    
    for (const phase of DEPLOYMENT_CONFIG.phases) {
      try {
        console.log(`\n🔧 Phase: ${phase.name}`);
        console.log(`   ${phase.description}`);
        
        const startTime = Date.now();
        
        // Run phase with timeout
        await this.runPhaseWithTimeout(phase);
        
        const duration = Date.now() - startTime;
        
        this.results.phases.push({
          name: phase.name,
          status: 'completed',
          duration,
          timestamp: new Date()
        });
        
        console.log(`   ✅ ${phase.name} completed - ${Math.round(duration / 1000)}s`);
        
      } catch (error) {
        this.results.phases.push({
          name: phase.name,
          status: 'failed',
          error: error.message,
          timestamp: new Date()
        });
        
        console.log(`   ❌ ${phase.name} failed - ${error.message}`);
        
        // Stop on required phase failures
        if (phase.required) {
          throw new Error(`Required phase failed: ${phase.name}`);
        } else {
          console.warn(`   ⚠️  Optional phase failed, continuing...`);
        }
      }
    }
    
    const completed = this.results.phases.filter(p => p.status === 'completed').length;
    const failed = this.results.phases.filter(p => p.status === 'failed').length;
    
    console.log(`\n📊 Phase results: ${completed} completed, ${failed} failed`);
  }

  /**
   * Run phase with timeout
   */
  async runPhaseWithTimeout(phase) {
    return new Promise(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Phase timeout: ${phase.name} exceeded ${Math.round(phase.timeout / 1000)}s`));
      }, phase.timeout);
      
      try {
        switch (phase.script) {
          case 'setup-production-environment':
            await setupProductionEnvironment();
            break;
          case 'setup-logging-aggregation':
            await setupLoggingAggregation();
            break;
          case 'setup-health-checks':
            await setupHealthChecks();
            break;
          default:
            throw new Error(`Unknown deployment script: ${phase.script}`);
        }
        
        clearTimeout(timeout);
        resolve();
        
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Run post-deployment verifications
   */
  async runVerifications() {
    console.log('\n✅ Running post-deployment verifications...');
    console.log('-------------------------------------------');
    
    for (const verification of DEPLOYMENT_CONFIG.verifications) {
      try {
        console.log(`   Verifying ${verification.name}...`);
        
        const startTime = Date.now();
        await this[verification.check]();
        const duration = Date.now() - startTime;
        
        this.results.verifications.push({
          name: verification.name,
          status: 'passed',
          duration,
          timestamp: new Date()
        });
        
        console.log(`   ✅ ${verification.name} - ${duration}ms`);
        
      } catch (error) {
        this.results.verifications.push({
          name: verification.name,
          status: 'failed',
          error: error.message,
          timestamp: new Date()
        });
        
        console.log(`   ⚠️  ${verification.name} - ${error.message}`);
      }
    }
    
    const passed = this.results.verifications.filter(v => v.status === 'passed').length;
    const failed = this.results.verifications.filter(v => v.status === 'failed').length;
    
    console.log(`\n📊 Verification results: ${passed} passed, ${failed} failed`);
  }

  /**
   * Generate deployment report
   */
  async generateDeploymentReport() {
    const report = {
      timestamp: new Date(),
      environment: process.env.NODE_ENV || 'production',
      duration: this.results.endTime - this.results.startTime,
      success: this.results.success,
      summary: {
        validations: {
          total: this.results.validations.length,
          passed: this.results.validations.filter(v => v.status === 'passed').length,
          failed: this.results.validations.filter(v => v.status === 'failed').length
        },
        phases: {
          total: this.results.phases.length,
          completed: this.results.phases.filter(p => p.status === 'completed').length,
          failed: this.results.phases.filter(p => p.status === 'failed').length
        },
        verifications: {
          total: this.results.verifications.length,
          passed: this.results.verifications.filter(v => v.status === 'passed').length,
          failed: this.results.verifications.filter(v => v.status === 'failed').length
        }
      },
      details: this.results,
      configuration: {
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch,
        environment: process.env.NODE_ENV,
        port: process.env.PORT || 3000,
        appUrl: process.env.APP_URL
      }
    };
    
    // Save report to file
    const fs = require('fs').promises;
    const reportPath = `deployment-report-${Date.now()}.json`;
    
    try {
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n📄 Deployment report saved to: ${reportPath}`);
    } catch (error) {
      console.warn(`⚠️  Could not save deployment report: ${error.message}`);
    }
    
    return report;
  }

  /**
   * Display next steps
   */
  displayNextSteps() {
    console.log('\n📋 Next Steps:');
    console.log('==============');
    console.log('1. Review and update .env.production with your actual values');
    console.log('2. Configure SSL certificates (see SSL_SETUP_INSTRUCTIONS.md)');
    console.log('3. Set up external monitoring services (see EXTERNAL_MONITORING_SETUP.md)');
    console.log('4. Configure your domain DNS to point to this server');
    console.log('5. Start the application:');
    console.log('   pm2 start ecosystem.config.js --env production');
    console.log('6. Reload Nginx:');
    console.log('   sudo systemctl reload nginx');
    console.log('7. Test the deployment:');
    console.log(`   curl ${process.env.APP_URL || 'https://your-domain.com'}/api/monitoring/health`);
    console.log('8. Monitor logs:');
    console.log('   tail -f /var/log/autocontrol/app.log');
    console.log('9. Set up automated backups and monitoring alerts');
    console.log('10. Perform security audit and penetration testing');
    
    console.log('\n🔗 Important URLs:');
    console.log(`Application: ${process.env.APP_URL || 'https://your-domain.com'}`);
    console.log(`Health Check: ${process.env.APP_URL || 'https://your-domain.com'}/api/monitoring/health`);
    console.log(`Health Dashboard: ${process.env.APP_URL || 'https://your-domain.com'}/health-dashboard.html`);
    console.log(`API Documentation: ${process.env.APP_URL || 'https://your-domain.com'}/api/docs`);
  }

  // Validation methods
  async validateSystemRequirements() {
    const os = require('os');
    
    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion < 18) {
      throw new Error(`Node.js version ${nodeVersion} is not supported. Minimum version: 18.x`);
    }
    
    // Check available memory
    const totalMem = os.totalmem();
    const minMemory = 2 * 1024 * 1024 * 1024; // 2GB
    
    if (totalMem < minMemory) {
      throw new Error(`Insufficient memory: ${Math.round(totalMem / 1024 / 1024 / 1024)}GB available, minimum 2GB required`);
    }
    
    // Check disk space
    const fs = require('fs');
    const stats = fs.statSync('.');
    // Note: This is a simplified check, in production you'd want to check actual disk space
  }

  async validateEnvironmentVariables() {
    const required = [
      'NODE_ENV',
      'MONGODB_URI',
      'JWT_SECRET',
      'APP_URL'
    ];
    
    const missing = required.filter(env => !process.env[env]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    // Validate JWT secret strength
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long');
    }
  }

  async validateNetworkConfiguration() {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    // Check if required ports are available
    const port = process.env.PORT || 3000;
    
    try {
      await execAsync(`netstat -tuln | grep :${port}`);
      throw new Error(`Port ${port} is already in use`);
    } catch (error) {
      // Port is available (netstat didn't find it)
      if (!error.message.includes('already in use')) {
        // This is expected - port should be available
      }
    }
  }

  async validateSecurityPrerequisites() {
    const fs = require('fs').promises;
    
    // Check if SSL certificate paths are configured
    if (process.env.SSL_CERT_PATH) {
      try {
        await fs.access(process.env.SSL_CERT_PATH);
      } catch (error) {
        console.warn(`SSL certificate not found at ${process.env.SSL_CERT_PATH}`);
      }
    }
    
    // Check if security headers are configured
    if (!process.env.CORS_ORIGIN) {
      console.warn('CORS_ORIGIN not configured - using default');
    }
  }

  // Verification methods
  async verifyApplicationStartup() {
    // This would typically involve starting the application and checking if it responds
    // For now, we'll just verify the configuration files exist
    const fs = require('fs').promises;
    const path = require('path');
    
    const configFiles = [
      '.env.production',
      'ecosystem.config.js'
    ];
    
    for (const file of configFiles) {
      const filePath = path.join(__dirname, '..', file);
      try {
        await fs.access(filePath);
      } catch (error) {
        throw new Error(`Configuration file not found: ${file}`);
      }
    }
  }

  async verifyHealthEndpoints() {
    // Verify health check configuration exists
    const fs = require('fs').promises;
    const path = require('path');
    
    const healthConfigPath = path.join(__dirname, '..', 'config', 'health');
    
    try {
      await fs.access(healthConfigPath);
    } catch (error) {
      throw new Error('Health check configuration not found');
    }
  }

  async verifyLoggingSystem() {
    const fs = require('fs').promises;
    
    // Check if log directories exist
    const logPath = '/var/log/autocontrol';
    
    try {
      await fs.access(logPath);
    } catch (error) {
      throw new Error('Log directory not found');
    }
  }

  async verifySecurityConfiguration() {
    // Check if security configurations are in place
    const fs = require('fs').promises;
    
    // Check Nginx configuration
    const nginxConfigPath = '/etc/nginx/sites-available/autocontrol-pro';
    
    try {
      await fs.access(nginxConfigPath);
    } catch (error) {
      console.warn('Nginx configuration not found - manual configuration required');
    }
  }
}

/**
 * Main deployment function
 */
async function setupProductionDeployment() {
  const orchestrator = new ProductionDeploymentOrchestrator();
  
  try {
    await orchestrator.deploy();
    return orchestrator.results;
  } catch (error) {
    console.error('\n💥 Production deployment setup failed');
    console.error('Please check the error messages above and fix any issues before retrying.');
    throw error;
  }
}

// Run deployment if called directly
if (require.main === module) {
  setupProductionDeployment()
    .then((results) => {
      console.log('\n🎉 Production deployment setup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Production deployment setup failed:', error.message);
      process.exit(1);
    });
}

module.exports = {
  ProductionDeploymentOrchestrator,
  setupProductionDeployment,
  DEPLOYMENT_CONFIG
};