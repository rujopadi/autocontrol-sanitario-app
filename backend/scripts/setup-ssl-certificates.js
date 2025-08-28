#!/usr/bin/env node

/**
 * SSL Certificate Setup Script
 * Automates SSL certificate generation and configuration
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const readline = require('readline');

class SSLCertificateSetup {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async question(prompt) {
    return new Promise((resolve) => {
      this.rl.question(prompt, resolve);
    });
  }

  async runCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
      console.log(`🔧 Running: ${command} ${args.join(' ')}`);
      
      const process = spawn(command, args, {
        stdio: 'inherit',
        shell: true,
        ...options
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(code);
        } else {
          reject(new Error(`Command failed with exit code ${code}`));
        }
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  async checkCertbot() {
    try {
      await this.runCommand('certbot', ['--version'], { stdio: 'pipe' });
      return true;
    } catch (error) {
      return false;
    }
  }

  async installCertbot() {
    console.log('📦 Installing Certbot...');
    
    try {
      // Detect OS
      const osRelease = await fs.readFile('/etc/os-release', 'utf8');
      
      if (osRelease.includes('Ubuntu') || osRelease.includes('Debian')) {
        await this.runCommand('sudo', ['apt', 'update']);
        await this.runCommand('sudo', ['apt', 'install', '-y', 'certbot', 'python3-certbot-nginx']);
      } else if (osRelease.includes('CentOS') || osRelease.includes('RHEL') || osRelease.includes('Rocky')) {
        await this.runCommand('sudo', ['yum', 'install', '-y', 'epel-release']);
        await this.runCommand('sudo', ['yum', 'install', '-y', 'certbot', 'python3-certbot-nginx']);
      } else {
        console.log('⚠️  Unsupported OS. Please install Certbot manually.');
        console.log('Visit: https://certbot.eff.org/instructions');
        return false;
      }
      
      console.log('✅ Certbot installed successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to install Certbot:', error.message);
      return false;
    }
  }

  async generateLetsEncryptCertificate(domains, email) {
    console.log('🔒 Generating Let\\'s Encrypt certificate...');
    
    try {
      const domainArgs = domains.flatMap(domain => ['-d', domain]);
      
      await this.runCommand('sudo', [
        'certbot',
        'certonly',
        '--nginx',
        '--agree-tos',
        '--no-eff-email',
        '--email', email,
        ...domainArgs
      ]);
      
      console.log('✅ SSL certificate generated successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to generate certificate:', error.message);
      return false;
    }
  }

  async generateSelfSignedCertificate(domain) {
    console.log('🔒 Generating self-signed certificate for development...');
    
    try {
      const certDir = '/etc/ssl/certs';
      const keyDir = '/etc/ssl/private';
      const certPath = path.join(certDir, `${domain}.crt`);
      const keyPath = path.join(keyDir, `${domain}.key`);
      
      // Create directories
      await this.runCommand('sudo', ['mkdir', '-p', certDir, keyDir]);
      
      // Generate private key
      await this.runCommand('sudo', [
        'openssl', 'genrsa',
        '-out', keyPath,
        '2048'
      ]);
      
      // Generate certificate
      await this.runCommand('sudo', [
        'openssl', 'req',
        '-new', '-x509',
        '-key', keyPath,
        '-out', certPath,
        '-days', '365',
        '-subj', `/C=ES/ST=Madrid/L=Madrid/O=AutoControl Pro/CN=${domain}`
      ]);
      
      // Set permissions
      await this.runCommand('sudo', ['chmod', '600', keyPath]);
      await this.runCommand('sudo', ['chmod', '644', certPath]);
      
      console.log(`✅ Self-signed certificate generated:`);
      console.log(`   Certificate: ${certPath}`);
      console.log(`   Private Key: ${keyPath}`);
      
      return { certPath, keyPath };
    } catch (error) {
      console.error('❌ Failed to generate self-signed certificate:', error.message);
      return null;
    }
  }

  async setupCertificateRenewal() {
    console.log('🔄 Setting up automatic certificate renewal...');
    
    try {
      // Create renewal script
      const renewalScript = `#!/bin/bash
# AutoControl Pro - SSL Certificate Renewal Script

# Renew certificates
certbot renew --quiet

# Reload nginx if certificates were renewed
if [ $? -eq 0 ]; then
    systemctl reload nginx
    echo "$(date): SSL certificates renewed and nginx reloaded" >> /var/log/ssl-renewal.log
fi
`;

      const scriptPath = '/usr/local/bin/renew-ssl-autocontrol.sh';
      await fs.writeFile(scriptPath, renewalScript);
      await this.runCommand('sudo', ['chmod', '+x', scriptPath]);
      
      // Create cron job
      const cronJob = '0 2 * * * /usr/local/bin/renew-ssl-autocontrol.sh';
      
      await this.runCommand('sudo', ['bash', '-c', `echo "${cronJob}" >> /etc/crontab`]);
      
      console.log('✅ Automatic renewal configured');
      console.log('   Renewal script: /usr/local/bin/renew-ssl-autocontrol.sh');
      console.log('   Cron job: Daily at 2:00 AM');
      
    } catch (error) {
      console.error('❌ Failed to setup renewal:', error.message);
    }
  }

  async updateNginxSSLConfig(domains, certPath, keyPath) {
    console.log('🔧 Updating Nginx SSL configuration...');
    
    try {
      const nginxConfigPath = '/etc/nginx/sites-available/autocontrol-pro';
      
      // Check if config exists
      try {
        await fs.access(nginxConfigPath);
      } catch {
        console.log('⚠️  Nginx configuration not found. Please run setup-production-environment.js first.');
        return false;
      }
      
      // Read current config
      let config = await fs.readFile(nginxConfigPath, 'utf8');
      
      // Update SSL certificate paths
      config = config.replace(
        /ssl_certificate \/etc\/ssl\/certs\/yourdomain\.crt;/g,
        `ssl_certificate ${certPath};`
      );
      config = config.replace(
        /ssl_certificate_key \/etc\/ssl\/private\/yourdomain\.key;/g,
        `ssl_certificate_key ${keyPath};`
      );
      
      // Update server names
      const domainList = domains.join(' ');
      config = config.replace(
        /server_name yourdomain\.com www\.yourdomain\.com;/g,
        `server_name ${domainList};`
      );
      config = config.replace(
        /server_name api\.yourdomain\.com;/g,
        `server_name api.${domains[0]};`
      );
      
      // Write updated config
      await fs.writeFile(nginxConfigPath, config);
      
      // Test nginx configuration
      await this.runCommand('sudo', ['nginx', '-t']);
      
      // Reload nginx
      await this.runCommand('sudo', ['systemctl', 'reload', 'nginx']);
      
      console.log('✅ Nginx SSL configuration updated');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to update Nginx configuration:', error.message);
      return false;
    }
  }

  async setupSecurityHeaders() {
    console.log('🛡️  Setting up additional security headers...');
    
    const securityConfig = `# Additional Security Configuration for AutoControl Pro
# Include this in your nginx server block

# OCSP Stapling
ssl_stapling on;
ssl_stapling_verify on;
ssl_trusted_certificate /etc/ssl/certs/ca-certificates.crt;

# Security Headers
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header X-Frame-Options DENY always;
add_header X-Content-Type-Options nosniff always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

# Content Security Policy
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none';" always;

# Hide server information
server_tokens off;
more_clear_headers Server;
`;

    const configPath = path.join(__dirname, '../nginx/security-headers.conf');
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(configPath, securityConfig);
    
    console.log(`✅ Security headers configuration created at: ${configPath}`);
    console.log('   Include this in your nginx server blocks for enhanced security');
  }

  async createSSLTestScript() {
    const testScript = `#!/bin/bash

# SSL Configuration Test Script
# Tests SSL certificate and configuration

echo "🔒 SSL Configuration Test"
echo "========================"

DOMAIN="$1"
if [ -z "$DOMAIN" ]; then
    echo "Usage: $0 <domain>"
    exit 1
fi

echo "Testing domain: $DOMAIN"
echo ""

# Test SSL certificate
echo "📋 Certificate Information:"
echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -dates -subject -issuer

echo ""
echo "🔍 SSL Labs Test:"
echo "Visit: https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"

echo ""
echo "🌐 Testing HTTPS redirect:"
curl -I http://$DOMAIN 2>/dev/null | grep -i location

echo ""
echo "🛡️  Testing security headers:"
curl -I https://$DOMAIN 2>/dev/null | grep -i "strict-transport-security\\|x-frame-options\\|x-content-type-options"

echo ""
echo "✅ SSL test completed"
`;

    const testScriptPath = path.join(__dirname, '../test-ssl.sh');
    await fs.writeFile(testScriptPath, testScript);
    await fs.chmod(testScriptPath, 0o755);
    
    console.log(`✅ SSL test script created at: ${testScriptPath}`);
    console.log('   Usage: ./test-ssl.sh yourdomain.com');
  }

  async run() {
    try {
      console.log('🔒 AutoControl Pro - SSL Certificate Setup');
      console.log('==========================================\n');

      // Get domain information
      const primaryDomain = await this.question('Primary domain (e.g., yourdomain.com): ');
      if (!primaryDomain) {
        console.log('❌ Primary domain is required');
        process.exit(1);
      }

      const includeWWW = await this.question('Include www subdomain? [Y/n]: ');
      const includeAPI = await this.question('Include API subdomain? [Y/n]: ');
      
      const domains = [primaryDomain];
      if (includeWWW.toLowerCase() !== 'n') {
        domains.push(`www.${primaryDomain}`);
      }
      if (includeAPI.toLowerCase() !== 'n') {
        domains.push(`api.${primaryDomain}`);
      }

      console.log(`\\nDomains to secure: ${domains.join(', ')}`);

      // Choose certificate type
      const certType = await this.question('\\nCertificate type (letsencrypt/selfsigned) [letsencrypt]: ') || 'letsencrypt';

      if (certType === 'letsencrypt') {
        // Let's Encrypt certificate
        const email = await this.question('Email for Let\\'s Encrypt notifications: ');
        if (!email) {
          console.log('❌ Email is required for Let\\'s Encrypt');
          process.exit(1);
        }

        // Check if Certbot is installed
        const certbotInstalled = await this.checkCertbot();
        if (!certbotInstalled) {
          const installCertbot = await this.question('Certbot not found. Install it? [Y/n]: ');
          if (installCertbot.toLowerCase() !== 'n') {
            const installed = await this.installCertbot();
            if (!installed) {
              process.exit(1);
            }
          } else {
            console.log('❌ Certbot is required for Let\\'s Encrypt certificates');
            process.exit(1);
          }
        }

        // Generate certificate
        const success = await this.generateLetsEncryptCertificate(domains, email);
        if (success) {
          await this.setupCertificateRenewal();
          
          // Update Nginx configuration
          const certPath = `/etc/letsencrypt/live/${primaryDomain}/fullchain.pem`;
          const keyPath = `/etc/letsencrypt/live/${primaryDomain}/privkey.pem`;
          await this.updateNginxSSLConfig(domains, certPath, keyPath);
        }

      } else {
        // Self-signed certificate
        console.log('\\n⚠️  Self-signed certificates are only for development/testing!');
        const confirm = await this.question('Continue with self-signed certificate? [y/N]: ');
        
        if (confirm.toLowerCase() === 'y') {
          const result = await this.generateSelfSignedCertificate(primaryDomain);
          if (result) {
            await this.updateNginxSSLConfig(domains, result.certPath, result.keyPath);
          }
        } else {
          console.log('❌ SSL setup cancelled');
          process.exit(1);
        }
      }

      // Setup additional security
      await this.setupSecurityHeaders();
      await this.createSSLTestScript();

      console.log('\\n🎉 SSL Certificate Setup Complete!');
      console.log('\\n📋 Next Steps:');
      console.log('1. Test your SSL configuration with: ./test-ssl.sh ' + primaryDomain);
      console.log('2. Visit https://www.ssllabs.com/ssltest/ to verify your SSL grade');
      console.log('3. Consider adding your domain to HSTS preload list');
      console.log('4. Monitor certificate expiration dates');
      
      if (certType === 'letsencrypt') {
        console.log('\\n🔄 Automatic Renewal:');
        console.log('- Certificates will auto-renew via cron job');
        console.log('- Check renewal status: sudo certbot renew --dry-run');
        console.log('- View renewal logs: tail -f /var/log/ssl-renewal.log');
      }

    } catch (error) {
      console.error('❌ SSL setup failed:', error.message);
      process.exit(1);
    } finally {
      this.rl.close();
    }
  }
}

// Run if called directly
if (require.main === module) {
  const setup = new SSLCertificateSetup();
  setup.run();
}

module.exports = SSLCertificateSetup;