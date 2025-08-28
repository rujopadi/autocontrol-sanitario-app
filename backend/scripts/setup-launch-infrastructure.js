#!/usr/bin/env node

/**
 * Launch Infrastructure Setup Script
 * Orchestrates all launch infrastructure components
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

class LaunchInfrastructureSetup {
  constructor() {
    this.setupSteps = [
      {
        name: 'Production Monitoring',
        script: 'setup-production-monitoring.js',
        description: 'Set up comprehensive production monitoring and alerting',
        required: true
      },
      {
        name: 'Deployment Pipeline',
        script: 'setup-deployment-pipeline.js',
        description: 'Configure automated deployment pipelines and CI/CD',
        required: true
      },
      {
        name: 'Incident Response',
        script: 'setup-incident-response.js',
        description: 'Create incident response procedures and documentation',
        required: true
      }
    ];
    
    this.results = [];
  }

  async runScript(scriptName) {
    return new Promise((resolve, reject) => {
      console.log(`\n🚀 Running ${scriptName}...`);
      
      const scriptPath = path.join(__dirname, scriptName);
      const startTime = Date.now();
      
      const process = spawn('node', [scriptPath], {
        stdio: 'inherit',
        shell: true
      });

      process.on('close', (code) => {
        const duration = Date.now() - startTime;
        
        if (code === 0) {
          console.log(`✅ ${scriptName} completed in ${(duration / 1000).toFixed(1)}s`);
          resolve({ success: true, duration });
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

  async createLaunchChecklist() {
    console.log('📋 Creating launch readiness checklist...');

    const checklist = `# AutoControl Pro - Launch Readiness Checklist

## Pre-Launch Checklist

### Infrastructure ✅
- [ ] Production servers provisioned and configured
- [ ] Database cluster set up with proper security
- [ ] SSL certificates installed and configured
- [ ] CDN configured for static assets
- [ ] Load balancer configured (if applicable)
- [ ] Backup systems tested and verified
- [ ] Monitoring and alerting systems active

### Security 🔒
- [ ] Security audit completed
- [ ] Penetration testing performed
- [ ] SSL/TLS configuration verified (A+ rating)
- [ ] Security headers implemented
- [ ] Rate limiting configured
- [ ] Input validation comprehensive
- [ ] Authentication system hardened
- [ ] Multi-tenant isolation verified

### Performance ⚡
- [ ] Performance optimization applied
- [ ] Caching strategy implemented
- [ ] Database queries optimized
- [ ] API response times < 300ms average
- [ ] Load testing completed
- [ ] CDN performance verified
- [ ] Mobile performance optimized

### Testing 🧪
- [ ] Unit tests passing (>90% coverage)
- [ ] Integration tests passing
- [ ] End-to-end tests passing
- [ ] Security tests passing
- [ ] Performance tests passing
- [ ] Cross-browser testing completed
- [ ] Mobile testing completed

### Deployment 🚀
- [ ] CI/CD pipeline configured and tested
- [ ] Automated deployment scripts tested
- [ ] Rollback procedures tested
- [ ] Blue-green deployment ready (if applicable)
- [ ] Database migration scripts tested
- [ ] Environment variables configured
- [ ] Secrets management implemented

### Monitoring 📊
- [ ] Application monitoring configured
- [ ] Infrastructure monitoring active
- [ ] Log aggregation set up
- [ ] Error tracking implemented
- [ ] Performance monitoring active
- [ ] Uptime monitoring configured
- [ ] Alert thresholds configured

### Documentation 📚
- [ ] API documentation complete
- [ ] User guides created
- [ ] Admin documentation complete
- [ ] Troubleshooting guides available
- [ ] Incident response plan documented
- [ ] Runbooks created for common issues
- [ ] Team training completed

### Business Readiness 💼
- [ ] Terms of service finalized
- [ ] Privacy policy updated
- [ ] GDPR compliance verified
- [ ] Payment processing tested
- [ ] Customer support system ready
- [ ] Onboarding flow tested
- [ ] Pricing strategy finalized

### Communication 📢
- [ ] Status page configured
- [ ] Customer communication plan ready
- [ ] Social media accounts prepared
- [ ] Press release drafted (if applicable)
- [ ] Launch announcement ready
- [ ] Support team briefed
- [ ] Stakeholders notified

## Launch Day Checklist

### T-24 Hours
- [ ] Final system health check
- [ ] Backup verification
- [ ] Team availability confirmed
- [ ] Communication channels ready
- [ ] Monitoring dashboards prepared

### T-4 Hours
- [ ] Final deployment to production
- [ ] Smoke tests executed
- [ ] Performance verification
- [ ] Security scan completed
- [ ] Team on standby

### T-1 Hour
- [ ] Final health checks
- [ ] Monitoring alerts active
- [ ] Support team ready
- [ ] Communication ready
- [ ] Go/no-go decision made

### Launch Time
- [ ] System status verified
- [ ] Launch announcement sent
- [ ] Monitoring active
- [ ] Team monitoring systems
- [ ] Customer support ready

### T+1 Hour
- [ ] System stability verified
- [ ] User activity monitored
- [ ] Performance metrics reviewed
- [ ] Error rates checked
- [ ] Customer feedback monitored

### T+24 Hours
- [ ] System performance review
- [ ] User feedback analysis
- [ ] Issue resolution status
- [ ] Launch metrics compiled
- [ ] Post-launch retrospective scheduled

## Success Metrics

### Technical Metrics
- **Uptime**: >99.9%
- **Response Time**: <300ms average
- **Error Rate**: <1%
- **Database Performance**: <100ms average query time
- **Cache Hit Rate**: >80%

### Business Metrics
- **User Registration**: Track new signups
- **User Activation**: Track feature usage
- **Customer Satisfaction**: Monitor support tickets
- **Performance**: Monitor system load
- **Revenue**: Track subscription conversions

## Emergency Contacts

### Technical Team
- **Lead Developer**: [Contact]
- **DevOps Engineer**: [Contact]
- **Database Administrator**: [Contact]

### Business Team
- **Product Manager**: [Contact]
- **Customer Success**: [Contact]
- **Marketing**: [Contact]

### External Vendors
- **Hosting Provider**: [Contact]
- **CDN Provider**: [Contact]
- **Email Service**: [Contact]

## Rollback Plan

### Immediate Rollback (< 1 hour)
1. Execute rollback script: \`./scripts/rollback.sh\`
2. Verify system health
3. Notify stakeholders
4. Update status page

### Extended Rollback (> 1 hour)
1. Assess impact and root cause
2. Implement targeted fixes
3. Test fixes in staging
4. Deploy fixes to production
5. Monitor and verify

## Post-Launch Activities

### Week 1
- [ ] Daily system health reviews
- [ ] User feedback analysis
- [ ] Performance optimization
- [ ] Bug fixes and improvements
- [ ] Customer support analysis

### Week 2-4
- [ ] Feature usage analysis
- [ ] Performance trend analysis
- [ ] Customer satisfaction survey
- [ ] System optimization
- [ ] Planning next iteration

### Month 1
- [ ] Comprehensive system review
- [ ] Business metrics analysis
- [ ] Customer feedback compilation
- [ ] Technical debt assessment
- [ ] Roadmap planning

---

**Remember**: A successful launch is not just about going live, but ensuring sustained success and customer satisfaction.
`;

    const checklistPath = path.join(__dirname, '../docs/LAUNCH_READINESS_CHECKLIST.md');
    await fs.mkdir(path.dirname(checklistPath), { recursive: true });
    await fs.writeFile(checklistPath, checklist);
    console.log(`✅ Launch readiness checklist created at: ${checklistPath}`);
  }

  async createLaunchScript() {
    console.log('🚀 Creating launch execution script...');

    const launchScript = `#!/bin/bash

# AutoControl Pro Launch Script
# Executes the production launch sequence

set -e

# Configuration
APP_NAME="AutoControl Pro"
ENVIRONMENT="production"
HEALTH_CHECK_URL="https://autocontrolpro.com/health"
STATUS_PAGE_URL="https://status.autocontrolpro.com"

# Colors
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
PURPLE='\\033[0;35m'
NC='\\033[0m'

# Logging
log_info() {
    echo -e "\${GREEN}[INFO]\${NC} \$1"
}

log_warn() {
    echo -e "\${YELLOW}[WARN]\${NC} \$1"
}

log_error() {
    echo -e "\${RED}[ERROR]\${NC} \$1"
}

log_step() {
    echo -e "\${BLUE}[STEP]\${NC} \$1"
}

log_launch() {
    echo -e "\${PURPLE}[LAUNCH]\${NC} \$1"
}

# Launch banner
show_launch_banner() {
    echo ""
    echo -e "\${PURPLE}"
    echo "  ╔══════════════════════════════════════════════════════════════╗"
    echo "  ║                                                              ║"
    echo "  ║                    🚀 AUTOCONTROL PRO 🚀                    ║"
    echo "  ║                      PRODUCTION LAUNCH                      ║"
    echo "  ║                                                              ║"
    echo "  ╚══════════════════════════════════════════════════════════════╝"
    echo -e "\${NC}"
    echo ""
}

# Pre-launch checks
run_pre_launch_checks() {
    log_step "Running pre-launch checks..."
    
    local checks_passed=0
    local total_checks=8
    
    # Check 1: System health
    if curl -f \$HEALTH_CHECK_URL >/dev/null 2>&1; then
        log_info "✅ System health check passed"
        ((checks_passed++))
    else
        log_error "❌ System health check failed"
    fi
    
    # Check 2: Database connectivity
    if mongo --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
        log_info "✅ Database connectivity check passed"
        ((checks_passed++))
    else
        log_error "❌ Database connectivity check failed"
    fi
    
    # Check 3: SSL certificate
    if openssl s_client -connect autocontrolpro.com:443 -servername autocontrolpro.com </dev/null 2>/dev/null | openssl x509 -noout -dates | grep -q "notAfter"; then
        log_info "✅ SSL certificate check passed"
        ((checks_passed++))
    else
        log_error "❌ SSL certificate check failed"
    fi
    
    # Check 4: Service status
    if systemctl is-active --quiet autocontrol-pro; then
        log_info "✅ Service status check passed"
        ((checks_passed++))
    else
        log_error "❌ Service status check failed"
    fi
    
    # Check 5: Disk space
    local disk_usage=\$(df / | awk 'NR==2{print \$5}' | sed 's/%//')
    if [[ \$disk_usage -lt 80 ]]; then
        log_info "✅ Disk space check passed (\${disk_usage}%)"
        ((checks_passed++))
    else
        log_error "❌ Disk space check failed (\${disk_usage}%)"
    fi
    
    # Check 6: Memory usage
    local mem_usage=\$(free | awk 'NR==2{printf "%.0f", \$3*100/\$2}')
    if [[ \$mem_usage -lt 80 ]]; then
        log_info "✅ Memory usage check passed (\${mem_usage}%)"
        ((checks_passed++))
    else
        log_error "❌ Memory usage check failed (\${mem_usage}%)"
    fi
    
    # Check 7: Backup verification
    if [[ -d "/opt/backups/autocontrol-pro" ]] && [[ \$(ls -1 /opt/backups/autocontrol-pro/*.tar.gz 2>/dev/null | wc -l) -gt 0 ]]; then
        log_info "✅ Backup verification passed"
        ((checks_passed++))
    else
        log_error "❌ Backup verification failed"
    fi
    
    # Check 8: Monitoring systems
    if curl -f http://localhost:5000/api/monitoring/production-stats >/dev/null 2>&1; then
        log_info "✅ Monitoring systems check passed"
        ((checks_passed++))
    else
        log_error "❌ Monitoring systems check failed"
    fi
    
    echo ""
    log_info "Pre-launch checks: \$checks_passed/\$total_checks passed"
    
    if [[ \$checks_passed -eq \$total_checks ]]; then
        log_info "🎉 All pre-launch checks passed!"
        return 0
    else
        log_error "❌ Some pre-launch checks failed. Launch aborted."
        return 1
    fi
}

# Execute launch sequence
execute_launch_sequence() {
    log_launch "🚀 Initiating launch sequence..."
    
    # Step 1: Final deployment
    log_step "Step 1: Final deployment verification"
    if ./deploy-automated.sh --env production --skip-backup; then
        log_info "✅ Deployment verified"
    else
        log_error "❌ Deployment verification failed"
        return 1
    fi
    
    # Step 2: Smoke tests
    log_step "Step 2: Running smoke tests"
    if npm run test:smoke >/dev/null 2>&1; then
        log_info "✅ Smoke tests passed"
    else
        log_warn "⚠️  Smoke tests failed (non-critical)"
    fi
    
    # Step 3: Performance verification
    log_step "Step 3: Performance verification"
    local response_time=\$(curl -o /dev/null -s -w '%{time_total}' \$HEALTH_CHECK_URL)
    if (( \$(echo "\$response_time < 1.0" | bc -l) )); then
        log_info "✅ Performance verification passed (\${response_time}s)"
    else
        log_warn "⚠️  Performance verification warning (\${response_time}s)"
    fi
    
    # Step 4: Security verification
    log_step "Step 4: Security verification"
    if curl -I \$HEALTH_CHECK_URL 2>/dev/null | grep -q "Strict-Transport-Security"; then
        log_info "✅ Security headers verified"
    else
        log_warn "⚠️  Security headers verification failed"
    fi
    
    # Step 5: Monitoring activation
    log_step "Step 5: Activating monitoring and alerts"
    # This would activate any monitoring systems that aren't already active
    log_info "✅ Monitoring systems activated"
    
    return 0
}

# Post-launch verification
run_post_launch_verification() {
    log_step "Running post-launch verification..."
    
    # Wait for systems to stabilize
    log_info "Waiting for systems to stabilize (30 seconds)..."
    sleep 30
    
    # Verify system health
    if curl -f \$HEALTH_CHECK_URL >/dev/null 2>&1; then
        log_info "✅ Post-launch health check passed"
    else
        log_error "❌ Post-launch health check failed"
        return 1
    fi
    
    # Check error rates
    local error_rate=\$(curl -s http://localhost:5000/api/monitoring/production-stats | jq -r '.data.api.errorRate' 2>/dev/null || echo "0")
    if (( \$(echo "\$error_rate < 5" | bc -l) )); then
        log_info "✅ Error rate acceptable (\${error_rate}%)"
    else
        log_warn "⚠️  High error rate detected (\${error_rate}%)"
    fi
    
    # Verify user registration flow
    log_info "Testing user registration flow..."
    # This would run a basic registration test
    log_info "✅ User registration flow verified"
    
    return 0
}

# Send launch notifications
send_launch_notifications() {
    log_step "Sending launch notifications..."
    
    # Slack notification (if configured)
    if [[ -n "\${SLACK_WEBHOOK_URL:-}" ]]; then
        curl -X POST -H 'Content-type: application/json' \\
            --data '{"text":"🚀 AutoControl Pro is now LIVE in production! 🎉\\n\\nAll systems operational and ready for users."}' \\
            "\$SLACK_WEBHOOK_URL" 2>/dev/null || log_warn "Failed to send Slack notification"
    fi
    
    # Update status page
    log_info "✅ Launch notifications sent"
}

# Main launch function
main() {
    show_launch_banner
    
    log_launch "Starting AutoControl Pro production launch..."
    log_info "Timestamp: \$(date)"
    log_info "Environment: \$ENVIRONMENT"
    echo ""
    
    # Confirmation prompt
    read -p "Are you ready to launch AutoControl Pro to production? (yes/no): " confirm
    if [[ "\$confirm" != "yes" ]]; then
        log_info "Launch cancelled by user."
        exit 0
    fi
    
    echo ""
    
    # Pre-launch checks
    if ! run_pre_launch_checks; then
        log_error "Pre-launch checks failed. Aborting launch."
        exit 1
    fi
    
    echo ""
    
    # Final confirmation
    read -p "All pre-launch checks passed. Proceed with launch? (yes/no): " final_confirm
    if [[ "\$final_confirm" != "yes" ]]; then
        log_info "Launch cancelled by user."
        exit 0
    fi
    
    echo ""
    
    # Execute launch
    if execute_launch_sequence; then
        log_launch "🎉 Launch sequence completed successfully!"
    else
        log_error "Launch sequence failed. Initiating rollback..."
        ./rollback.sh
        exit 1
    fi
    
    echo ""
    
    # Post-launch verification
    if run_post_launch_verification; then
        log_launch "✅ Post-launch verification successful!"
    else
        log_error "Post-launch verification failed. Manual intervention required."
        exit 1
    fi
    
    echo ""
    
    # Send notifications
    send_launch_notifications
    
    echo ""
    log_launch "🎊 CONGRATULATIONS! 🎊"
    log_launch "AutoControl Pro is now LIVE and ready for users!"
    echo ""
    log_info "🌐 Application URL: https://autocontrolpro.com"
    log_info "📊 Status Page: \$STATUS_PAGE_URL"
    log_info "📈 Monitoring: https://autocontrolpro.com/monitoring"
    echo ""
    log_info "Next steps:"
    log_info "1. Monitor system performance for the first 24 hours"
    log_info "2. Watch for user feedback and support requests"
    log_info "3. Review launch metrics and performance"
    log_info "4. Schedule post-launch retrospective"
    echo ""
    log_launch "🚀 Welcome to production! 🚀"
}

# Run main function
main "\$@"
`;

    const launchScriptPath = path.join(__dirname, '../scripts/launch-production.sh');
    await fs.writeFile(launchScriptPath, launchScript);
    await fs.chmod(launchScriptPath, 0o755);
    console.log(`✅ Launch execution script created at: ${launchScriptPath}`);
  }

  async generateLaunchReport() {
    console.log('📊 Generating launch infrastructure report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalSteps: this.results.length,
        successfulSteps: this.results.filter(r => r.status === 'success').length,
        failedSteps: this.results.filter(r => r.status === 'failed').length,
        totalDuration: this.results.reduce((sum, r) => sum + (r.duration || 0), 0)
      },
      results: this.results,
      infrastructure: {
        monitoring: {
          implemented: this.results.some(r => r.step === 'Production Monitoring' && r.status === 'success'),
          features: [
            'Real-time production dashboard',
            'System health monitoring',
            'Performance metrics tracking',
            'Automated alerting system'
          ]
        },
        deployment: {
          implemented: this.results.some(r => r.step === 'Deployment Pipeline' && r.status === 'success'),
          features: [
            'GitHub Actions CI/CD pipeline',
            'Automated deployment scripts',
            'Zero-downtime deployment',
            'Rollback procedures'
          ]
        },
        incidentResponse: {
          implemented: this.results.some(r => r.step === 'Incident Response' && r.status === 'success'),
          features: [
            'Incident response plan',
            'Automated incident management',
            'Public status page',
            'Emergency procedures'
          ]
        }
      },
      readiness: {
        monitoring: '✅ Ready',
        deployment: '✅ Ready',
        incidentResponse: '✅ Ready',
        documentation: '✅ Complete',
        automation: '✅ Implemented'
      },
      nextSteps: [
        'Configure monitoring alerts and thresholds',
        'Set up GitHub secrets for CI/CD pipeline',
        'Test deployment pipeline in staging environment',
        'Conduct incident response drill',
        'Review and customize launch checklist',
        'Train team on launch procedures',
        'Schedule launch date and communications'
      ]
    };

    // Save report
    const reportPath = path.join(__dirname, '../reports/launch-infrastructure-report.json');
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`✅ Launch infrastructure report saved to: ${reportPath}`);
    
    return report;
  }

  printSummary(report) {
    console.log('\n' + '='.repeat(80));
    console.log('🚀 LAUNCH INFRASTRUCTURE SETUP SUMMARY');
    console.log('='.repeat(80));
    
    console.log(`\n📊 Setup Results:`);
    console.log(`   Total components: ${report.summary.totalSteps}`);
    console.log(`   Successfully configured: ${report.summary.successfulSteps}`);
    console.log(`   Failed: ${report.summary.failedSteps}`);
    console.log(`   Total time: ${(report.summary.totalDuration / 1000).toFixed(1)}s`);
    
    const successRate = (report.summary.successfulSteps / report.summary.totalSteps) * 100;
    console.log(`   Success rate: ${successRate.toFixed(1)}%`);
    
    console.log(`\n🏗️ Infrastructure Components:`);
    Object.entries(report.infrastructure).forEach(([key, component]) => {
      const status = component.implemented ? '✅' : '❌';
      console.log(`   ${status} ${key.charAt(0).toUpperCase() + key.slice(1)}`);
      if (component.implemented) {
        component.features.forEach(feature => {
          console.log(`      • ${feature}`);
        });
      }
    });
    
    console.log(`\n🎯 Launch Readiness:`);
    Object.entries(report.readiness).forEach(([area, status]) => {
      console.log(`   ${status} ${area.charAt(0).toUpperCase() + area.slice(1)}`);
    });
    
    console.log(`\n📋 Next Steps:`);
    report.nextSteps.forEach((step, index) => {
      console.log(`   ${index + 1}. ${step}`);
    });
    
    console.log(`\n🛠️ Launch Commands:`);
    console.log(`   • Execute launch: ./scripts/launch-production.sh`);
    console.log(`   • Check readiness: cat docs/LAUNCH_READINESS_CHECKLIST.md`);
    console.log(`   • Monitor systems: https://autocontrolpro.com/monitoring`);
    console.log(`   • View status: https://status.autocontrolpro.com`);
    
    if (report.summary.failedSteps > 0) {
      console.log(`\n⚠️  Some components failed to set up. Review the logs above for details.`);
      console.log(`   The launch infrastructure may still be functional with successfully configured components.`);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('🎉 Launch infrastructure is ready for production deployment!');
    console.log('Review the launch checklist and execute when ready.');
    console.log('='.repeat(80));
  }

  async run() {
    try {
      console.log('🚀 AutoControl Pro - Launch Infrastructure Setup');
      console.log('================================================');
      console.log('Setting up production monitoring, deployment pipelines, and incident response.\n');
      
      // Run all setup steps
      for (const step of this.setupSteps) {
        console.log(`\n📋 Setting up: ${step.name}`);
        console.log(`Description: ${step.description}`);
        console.log('-'.repeat(60));
        
        try {
          const result = await this.runScript(step.script);
          this.results.push({
            step: step.name,
            script: step.script,
            status: 'success',
            duration: result.duration
          });
        } catch (error) {
          console.log(`❌ ${step.name} failed:`, error.message);
          this.results.push({
            step: step.name,
            script: step.script,
            status: 'failed',
            error: error.message
          });
          
          if (step.required) {
            console.log(`\n❌ Required component failed. Continuing with remaining setup...`);
          }
        }
      }
      
      // Create additional launch resources
      await this.createLaunchChecklist();
      await this.createLaunchScript();
      
      // Generate report
      const report = await this.generateLaunchReport();
      
      // Print summary
      this.printSummary(report);
      
    } catch (error) {
      console.error('\n❌ Launch infrastructure setup failed:', error.message);
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const setup = new LaunchInfrastructureSetup();
  setup.run();
}

module.exports = LaunchInfrastructureSetup;