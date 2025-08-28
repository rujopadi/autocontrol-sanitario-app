#!/usr/bin/env node

/**
 * Complete Production Setup Script
 * Orchestrates all production configuration steps
 */

const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');
const { spawn } = require('child_process');

class CompleteProductionSetup {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    this.setupSteps = [
      {
        name: 'Environment Configuration',
        script: 'setup-production-environment.js',
        description: 'Configure environment variables and secrets',
        required: true
      },
      {
        name: 'SSL Certificates',
        script: 'setup-ssl-certificates.js',
        description: 'Generate and configure SSL certificates',
        required: true
      },
      {
        name: 'Health Monitoring',
        script: 'setup-health-monitoring.js',
        description: 'Set up health checks and monitoring',
        required: true
      },
      {
        name: 'Database Setup',
        script: 'setup-production-database.js',
        description: 'Configure production database',
        required: false
      },
      {
        name: 'Security Hardening',
        script: 'setup-security-hardening.js',
        description: 'Apply security hardening measures',
        required: true
      },
      {
        name: 'Backup Configuration',
        script: 'setup-automated-backups.js',
        description: 'Configure automated backups',
        required: false
      }
    ];
  }

  async question(prompt) {
    return new Promise((resolve) => {
      this.rl.question(prompt, resolve);
    });
  }

  async runScript(scriptName) {
    return new Promise((resolve, reject) => {
      console.log(`\\n🚀 Running ${scriptName}...`);
      
      const scriptPath = path.join(__dirname, scriptName);
      const process = spawn('node', [scriptPath], {
        stdio: 'inherit',
        shell: true
      });

      process.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ ${scriptName} completed successfully`);
          resolve(code);
        } else {
          console.log(`❌ ${scriptName} failed with exit code ${code}`);
          reject(new Error(`Script failed with exit code ${code}`));
        }
      });

      process.on('error', (error) => {
        console.log(`❌ ${scriptName} failed:`, error.message);
        reject(error);
      });
    });
  }

  async checkPrerequisites() {
    console.log('🔍 Checking prerequisites...');
    
    const checks = [
      { command: 'node', args: ['--version'], name: 'Node.js' },
      { command: 'npm', args: ['--version'], name: 'npm' },
      { command: 'git', args: ['--version'], name: 'Git' },
      { command: 'nginx', args: ['-v'], name: 'Nginx' },
      { command: 'systemctl', args: ['--version'], name: 'systemd' }
    ];

    const results = [];
    
    for (const check of checks) {
      try {
        await new Promise((resolve, reject) => {
          const proc = spawn(check.command, check.args, { stdio: 'pipe' });
          proc.on('close', (code) => {
            if (code === 0) {
              resolve();
            } else {
              reject(new Error(`Command failed`));
            }
          });
          proc.on('error', reject);
        });
        
        results.push({ name: check.name, status: '✅ Available' });
      } catch (error) {
        results.push({ name: check.name, status: '❌ Missing' });
      }
    }

    console.log('\\n📋 Prerequisites Check:');
    results.forEach(result => {
      console.log(`   ${result.name}: ${result.status}`);
    });

    const missing = results.filter(r => r.status.includes('❌'));
    if (missing.length > 0) {
      console.log('\\n⚠️  Some prerequisites are missing. Please install them before continuing.');
      return false;
    }

    console.log('\\n✅ All prerequisites are available');
    return true;
  }

  async createSystemUser() {
    console.log('\\n👤 Creating system user...');
    
    try {
      // Check if user already exists
      await new Promise((resolve, reject) => {
        const proc = spawn('id', ['autocontrol'], { stdio: 'pipe' });
        proc.on('close', (code) => {
          if (code === 0) {
            console.log('✅ User "autocontrol" already exists');
            resolve();
          } else {
            reject(new Error('User does not exist'));
          }
        });
      });
    } catch (error) {
      // User doesn't exist, create it
      try {
        await new Promise((resolve, reject) => {
          const proc = spawn('sudo', [
            'useradd',
            '-r',
            '-s', '/bin/false',
            '-d', '/opt/autocontrol-pro',
            '-c', 'AutoControl Pro System User',
            'autocontrol'
          ], { stdio: 'inherit' });
          
          proc.on('close', (code) => {
            if (code === 0) {
              console.log('✅ System user "autocontrol" created');
              resolve();
            } else {
              reject(new Error('Failed to create user'));
            }
          });
        });
      } catch (createError) {
        console.log('❌ Failed to create system user. Please create manually:');
        console.log('sudo useradd -r -s /bin/false -d /opt/autocontrol-pro -c "AutoControl Pro System User" autocontrol');
        return false;
      }
    }
    
    return true;
  }

  async setupDirectories() {
    console.log('\\n📁 Setting up directories...');
    
    const directories = [
      '/opt/autocontrol-pro',
      '/var/log/autocontrol-pro',
      '/var/uploads/autocontrol-pro',
      '/etc/autocontrol-pro'
    ];

    for (const dir of directories) {
      try {
        await new Promise((resolve, reject) => {
          const proc = spawn('sudo', ['mkdir', '-p', dir], { stdio: 'pipe' });
          proc.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Failed to create ${dir}`));
          });
        });

        await new Promise((resolve, reject) => {
          const proc = spawn('sudo', ['chown', 'autocontrol:autocontrol', dir], { stdio: 'pipe' });
          proc.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Failed to set ownership for ${dir}`));
          });
        });

        console.log(`✅ Created and configured: ${dir}`);
      } catch (error) {
        console.log(`❌ Failed to setup ${dir}:`, error.message);
        return false;
      }
    }

    return true;
  }

  async selectSetupSteps() {
    console.log('\\n📋 Setup Steps Selection:');
    console.log('==========================');
    
    const selectedSteps = [];
    
    for (const step of this.setupSteps) {
      const status = step.required ? '[REQUIRED]' : '[OPTIONAL]';
      console.log(`\\n${step.name} ${status}`);
      console.log(`Description: ${step.description}`);
      
      if (step.required) {
        selectedSteps.push(step);
        console.log('✅ Added (required)');
      } else {
        const include = await this.question('Include this step? [Y/n]: ');
        if (include.toLowerCase() !== 'n') {
          selectedSteps.push(step);
          console.log('✅ Added');
        } else {
          console.log('⏭️  Skipped');
        }
      }
    }

    return selectedSteps;
  }

  async executeSetupSteps(steps) {
    console.log('\\n🚀 Executing Setup Steps...');
    console.log('============================');
    
    const results = [];
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      console.log(`\\n[${i + 1}/${steps.length}] ${step.name}`);
      console.log('-'.repeat(50));
      
      try {
        await this.runScript(step.script);
        results.push({ step: step.name, status: 'success' });
      } catch (error) {
        console.log(`❌ ${step.name} failed:`, error.message);
        results.push({ step: step.name, status: 'failed', error: error.message });
        
        if (step.required) {
          const continueSetup = await this.question('\\nThis is a required step. Continue anyway? [y/N]: ');
          if (continueSetup.toLowerCase() !== 'y') {
            console.log('\\n❌ Setup aborted due to required step failure');
            return results;
          }
        }
      }
    }

    return results;
  }

  async createDeploymentSummary(results) {
    const summary = {
      timestamp: new Date().toISOString(),
      hostname: require('os').hostname(),
      setupResults: results,
      nextSteps: [
        'Review and test all configurations',
        'Update domain names in configuration files',
        'Configure DNS records to point to your server',
        'Test SSL certificates and HTTPS',
        'Run deployment script: ./deploy.sh',
        'Monitor application logs and health checks',
        'Set up external monitoring (Uptime Robot, etc.)',
        'Configure backup verification and testing',
        'Document any custom configurations',
        'Train team on monitoring and maintenance procedures'
      ],
      importantFiles: [
        '.env.production - Environment configuration (DO NOT COMMIT)',
        'nginx/autocontrol-pro.conf - Nginx configuration',
        'systemd/ - Systemd service files',
        'scripts/deploy.sh - Deployment script',
        'monitoring/dashboard.html - Monitoring dashboard'
      ],
      securityReminders: [
        'Never commit .env.production to version control',
        'Regularly update SSL certificates',
        'Monitor security logs for suspicious activity',
        'Keep system and dependencies updated',
        'Use strong passwords and enable 2FA where possible',
        'Regularly backup and test restore procedures',
        'Review and update firewall rules',
        'Monitor for security vulnerabilities'
      ]
    };

    const summaryPath = path.join(__dirname, '../PRODUCTION_SETUP_SUMMARY.json');
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
    
    console.log(`\\n📄 Setup summary saved to: ${summaryPath}`);
    return summary;
  }

  async printFinalSummary(summary) {
    console.log('\\n' + '='.repeat(80));
    console.log('🎉 AUTOCONTROL PRO - PRODUCTION SETUP COMPLETE');
    console.log('='.repeat(80));
    
    console.log('\\n📊 Setup Results:');
    summary.setupResults.forEach(result => {
      const status = result.status === 'success' ? '✅' : '❌';
      console.log(`   ${status} ${result.step}`);
      if (result.error) {
        console.log(`      Error: ${result.error}`);
      }
    });

    const successCount = summary.setupResults.filter(r => r.status === 'success').length;
    const totalCount = summary.setupResults.length;
    
    console.log(`\\n📈 Success Rate: ${successCount}/${totalCount} (${Math.round(successCount/totalCount*100)}%)`);

    console.log('\\n📋 Next Steps:');
    summary.nextSteps.forEach((step, index) => {
      console.log(`   ${index + 1}. ${step}`);
    });

    console.log('\\n📁 Important Files Created:');
    summary.importantFiles.forEach(file => {
      console.log(`   • ${file}`);
    });

    console.log('\\n🛡️  Security Reminders:');
    summary.securityReminders.forEach(reminder => {
      console.log(`   ⚠️  ${reminder}`);
    });

    console.log('\\n🔗 Useful Commands:');
    console.log('   • Check service status: sudo systemctl status autocontrol-pro');
    console.log('   • View logs: sudo journalctl -u autocontrol-pro -f');
    console.log('   • Test SSL: ./test-ssl.sh yourdomain.com');
    console.log('   • Deploy updates: ./deploy.sh');
    console.log('   • Monitor health: curl http://localhost:5000/health');

    console.log('\\n' + '='.repeat(80));
    console.log('🚀 Your AutoControl Pro instance is ready for production!');
    console.log('📧 For support, visit: https://github.com/yourusername/autocontrol-pro');
    console.log('='.repeat(80));
  }

  async run() {
    try {
      console.log('🚀 AutoControl Pro - Complete Production Setup');
      console.log('===============================================');
      console.log('This script will guide you through the complete production setup process.\\n');

      // Check prerequisites
      const prereqsOk = await this.checkPrerequisites();
      if (!prereqsOk) {
        process.exit(1);
      }

      // Create system user
      const userOk = await this.createSystemUser();
      if (!userOk) {
        console.log('⚠️  Please create the system user manually and run this script again.');
        process.exit(1);
      }

      // Setup directories
      const dirsOk = await this.setupDirectories();
      if (!dirsOk) {
        console.log('⚠️  Please create the required directories manually and run this script again.');
        process.exit(1);
      }

      // Select setup steps
      const selectedSteps = await this.selectSetupSteps();
      
      if (selectedSteps.length === 0) {
        console.log('\\n❌ No setup steps selected. Exiting.');
        process.exit(0);
      }

      console.log(`\\n📋 Selected ${selectedSteps.length} setup steps:`);
      selectedSteps.forEach((step, index) => {
        console.log(`   ${index + 1}. ${step.name}`);
      });

      const confirm = await this.question('\\nProceed with setup? [Y/n]: ');
      if (confirm.toLowerCase() === 'n') {
        console.log('\\n❌ Setup cancelled by user.');
        process.exit(0);
      }

      // Execute setup steps
      const results = await this.executeSetupSteps(selectedSteps);

      // Create summary
      const summary = await this.createDeploymentSummary(results);

      // Print final summary
      await this.printFinalSummary(summary);

    } catch (error) {
      console.error('\\n❌ Production setup failed:', error.message);
      process.exit(1);
    } finally {
      this.rl.close();
    }
  }
}

// Run if called directly
if (require.main === module) {
  const setup = new CompleteProductionSetup();
  setup.run();
}

module.exports = CompleteProductionSetup;