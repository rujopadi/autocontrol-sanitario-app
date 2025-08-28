#!/usr/bin/env node

/**
 * Incident Response Setup Script
 * Creates incident response procedures and documentation
 */

const fs = require('fs').promises;
const path = require('path');

class IncidentResponseSetup {
  constructor() {
    this.docsDir = path.join(__dirname, '../docs');
    this.scriptsDir = path.join(__dirname, '../scripts');
  }

  async createIncidentResponsePlan() {
    console.log('📋 Creating incident response plan...');

    const incidentPlan = `# AutoControl Pro - Incident Response Plan

## Overview

This document outlines the incident response procedures for AutoControl Pro production environment. It provides step-by-step guidance for identifying, responding to, and resolving production incidents.

## Incident Classification

### Severity Levels

#### P0 - Critical (Response: Immediate)
- Complete system outage
- Data loss or corruption
- Security breach
- Payment system failure

#### P1 - High (Response: 1 hour)
- Partial system outage affecting multiple users
- Performance degradation >50%
- Authentication system issues
- Database connectivity problems

#### P2 - Medium (Response: 4 hours)
- Single feature outage
- Performance degradation 20-50%
- Non-critical API failures
- Monitoring system issues

#### P3 - Low (Response: 24 hours)
- Minor UI issues
- Performance degradation <20%
- Non-critical feature bugs
- Documentation issues

## Incident Response Team

### Primary Contacts
- **Incident Commander**: [Primary Contact]
- **Technical Lead**: [Technical Contact]
- **DevOps Engineer**: [DevOps Contact]
- **Customer Success**: [Customer Contact]

### Escalation Matrix
1. **Level 1**: On-call engineer
2. **Level 2**: Technical lead + DevOps
3. **Level 3**: Incident commander + Management
4. **Level 4**: Executive team

## Incident Response Process

### 1. Detection and Alert
- Monitor alerts from monitoring systems
- Customer reports via support channels
- Internal team discovery

### 2. Initial Response (0-15 minutes)
1. **Acknowledge the incident**
   - Update incident status in monitoring system
   - Notify incident response team
   
2. **Assess severity**
   - Determine impact and affected users
   - Classify incident severity
   
3. **Create incident channel**
   - Create dedicated Slack channel: #incident-YYYY-MM-DD-HH
   - Invite relevant team members

### 3. Investigation and Diagnosis (15-60 minutes)
1. **Gather information**
   - Check system health dashboard
   - Review recent deployments
   - Analyze error logs and metrics
   
2. **Identify root cause**
   - Use debugging tools and logs
   - Check external dependencies
   - Review recent changes

### 4. Resolution and Recovery
1. **Implement fix**
   - Apply immediate workaround if available
   - Deploy permanent fix
   - Verify resolution
   
2. **Monitor recovery**
   - Watch system metrics
   - Confirm user functionality
   - Validate data integrity

### 5. Communication
1. **Internal communication**
   - Regular updates in incident channel
   - Notify stakeholders of progress
   
2. **External communication**
   - Update status page
   - Notify affected customers
   - Provide ETAs when possible

### 6. Post-Incident Review
1. **Document timeline**
   - Record all actions taken
   - Note decision points
   
2. **Conduct retrospective**
   - Identify what went well
   - Determine improvement areas
   - Create action items

## Quick Response Commands

### System Health Checks
\`\`\`bash
# Check application health
curl -f https://autocontrolpro.com/health

# Check service status
sudo systemctl status autocontrol-pro

# Check recent logs
sudo journalctl -u autocontrol-pro -n 100 --no-pager

# Check system resources
./scripts/monitor-performance.sh
\`\`\`

### Database Issues
\`\`\`bash
# Check database connection
mongo --eval "db.adminCommand('ping')"

# Check database performance
mongo --eval "db.serverStatus().connections"

# Check slow queries
mongo --eval "db.system.profile.find().sort({ts:-1}).limit(5)"
\`\`\`

### Application Issues
\`\`\`bash
# Restart application
sudo systemctl restart autocontrol-pro

# Check application logs
tail -f /var/log/autocontrol-pro/application.log

# Check error rates
curl -s http://localhost:5000/api/monitoring/production-stats | jq '.data.api.errorRate'
\`\`\`

### Rollback Procedures
\`\`\`bash
# List available backups
./scripts/rollback.sh --list

# Rollback to previous version
./scripts/rollback.sh --backup backup_YYYYMMDD_HHMMSS.tar.gz

# Emergency rollback (latest backup)
./scripts/rollback.sh
\`\`\`

## Incident Communication Templates

### Initial Alert
\`\`\`
🚨 INCIDENT ALERT - P[SEVERITY]

Issue: [Brief description]
Impact: [User impact description]
Started: [Timestamp]
Status: Investigating

Team is investigating and will provide updates every 15 minutes.
Status page: https://status.autocontrolpro.com
\`\`\`

### Progress Update
\`\`\`
📊 INCIDENT UPDATE - P[SEVERITY]

Issue: [Brief description]
Status: [Current status]
Progress: [What has been done]
Next steps: [What's being done next]
ETA: [Estimated resolution time]

Next update in 15 minutes.
\`\`\`

### Resolution Notice
\`\`\`
✅ INCIDENT RESOLVED - P[SEVERITY]

Issue: [Brief description]
Resolution: [What was fixed]
Duration: [Total incident duration]
Impact: [Final impact assessment]

Post-incident review will be conducted within 24 hours.
\`\`\`

## Runbooks

### Database Connection Issues
1. Check MongoDB service status
2. Verify connection string and credentials
3. Check network connectivity
4. Review connection pool settings
5. Restart application if needed

### High Memory Usage
1. Check memory usage: \`free -h\`
2. Identify memory-consuming processes: \`top\`
3. Check for memory leaks in application
4. Restart application if necessary
5. Scale resources if persistent

### SSL Certificate Issues
1. Check certificate expiration: \`openssl x509 -in cert.pem -text -noout\`
2. Verify certificate chain
3. Renew certificate if expired
4. Update nginx configuration
5. Reload nginx: \`sudo systemctl reload nginx\`

### High Error Rates
1. Check application logs for errors
2. Identify error patterns and frequency
3. Check recent deployments
4. Verify external service dependencies
5. Implement fix or rollback if needed

## Contact Information

### Emergency Contacts
- **Primary On-call**: [Phone number]
- **Secondary On-call**: [Phone number]
- **Escalation Manager**: [Phone number]

### External Vendors
- **Hosting Provider**: [Contact info]
- **Database Provider**: [Contact info]
- **CDN Provider**: [Contact info]
- **Email Service**: [Contact info]

### Communication Channels
- **Slack**: #incidents
- **Email**: incidents@autocontrolpro.com
- **Status Page**: https://status.autocontrolpro.com

## Tools and Resources

### Monitoring and Alerting
- Production Dashboard: https://autocontrolpro.com/monitoring
- Log Aggregation: [Log system URL]
- APM Tool: [APM URL]
- Uptime Monitoring: [Uptime service URL]

### Documentation
- System Architecture: [Link]
- API Documentation: [Link]
- Deployment Guide: [Link]
- Troubleshooting Guide: [Link]

## Training and Preparedness

### Regular Activities
- Monthly incident response drills
- Quarterly runbook reviews
- Annual disaster recovery testing
- Continuous monitoring improvements

### Knowledge Base
- Common issues and solutions
- Historical incident reports
- System dependencies map
- Recovery procedures

---

**Remember**: Stay calm, communicate clearly, and focus on resolution. Document everything for post-incident analysis.
`;

    const planPath = path.join(this.docsDir, 'INCIDENT_RESPONSE_PLAN.md');
    await fs.mkdir(this.docsDir, { recursive: true });
    await fs.writeFile(planPath, incidentPlan);
    console.log(`✅ Incident response plan created at: ${planPath}`);
  }

  async createIncidentScript() {
    console.log('🚨 Creating incident management script...');

    const incidentScript = `#!/bin/bash

# Incident Management Script
# Helps manage production incidents with automated responses

set -e

# Configuration
INCIDENT_LOG="/var/log/autocontrol-pro/incidents.log"
SLACK_WEBHOOK_URL="\${SLACK_WEBHOOK_URL:-}"
STATUS_PAGE_API="\${STATUS_PAGE_API:-}"

# Colors
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
NC='\\033[0m'

log_info() {
    echo -e "\${GREEN}[INFO]\${NC} \$1"
    echo "\$(date): [INFO] \$1" >> "\$INCIDENT_LOG"
}

log_warn() {
    echo -e "\${YELLOW}[WARN]\${NC} \$1"
    echo "\$(date): [WARN] \$1" >> "\$INCIDENT_LOG"
}

log_error() {
    echo -e "\${RED}[ERROR]\${NC} \$1"
    echo "\$(date): [ERROR] \$1" >> "\$INCIDENT_LOG"
}

log_step() {
    echo -e "\${BLUE}[STEP]\${NC} \$1"
    echo "\$(date): [STEP] \$1" >> "\$INCIDENT_LOG"
}

# Send Slack notification
send_slack_notification() {
    local message="\$1"
    local severity="\$2"
    
    if [[ -n "\$SLACK_WEBHOOK_URL" ]]; then
        local color="good"
        case "\$severity" in
            "critical") color="danger" ;;
            "warning") color="warning" ;;
        esac
        
        curl -X POST -H 'Content-type: application/json' \\
            --data "{\\"attachments\\":[{\\"color\\":\\"\$color\\",\\"text\\":\\"\$message\\"}]}" \\
            "\$SLACK_WEBHOOK_URL" 2>/dev/null || log_warn "Failed to send Slack notification"
    fi
}

# Update status page
update_status_page() {
    local status="\$1"
    local message="\$2"
    
    if [[ -n "\$STATUS_PAGE_API" ]]; then
        # This would be customized based on your status page provider
        log_info "Status page update: \$status - \$message"
    fi
}

# Quick health check
quick_health_check() {
    log_step "Running quick health check..."
    
    local issues=()
    
    # Check application health
    if ! curl -f http://localhost:5000/health >/dev/null 2>&1; then
        issues+=("Application health check failed")
    fi
    
    # Check service status
    if ! systemctl is-active --quiet autocontrol-pro; then
        issues+=("AutoControl Pro service is not running")
    fi
    
    # Check database connection
    if ! mongo --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
        issues+=("Database connection failed")
    fi
    
    # Check disk space
    local disk_usage=\$(df / | awk 'NR==2{print \$5}' | sed 's/%//')
    if [[ \$disk_usage -gt 90 ]]; then
        issues+=("Disk usage critical: \${disk_usage}%")
    fi
    
    # Check memory usage
    local mem_usage=\$(free | awk 'NR==2{printf "%.0f", \$3*100/\$2}')
    if [[ \$mem_usage -gt 90 ]]; then
        issues+=("Memory usage critical: \${mem_usage}%")
    fi
    
    if [[ \${#issues[@]} -eq 0 ]]; then
        log_info "✅ All health checks passed"
        return 0
    else
        log_error "❌ Health check issues found:"
        for issue in "\${issues[@]}"; do
            log_error "  - \$issue"
        done
        return 1
    fi
}

# Automated recovery attempt
attempt_recovery() {
    log_step "Attempting automated recovery..."
    
    # Restart application service
    log_info "Restarting AutoControl Pro service..."
    sudo systemctl restart autocontrol-pro
    
    # Wait for service to start
    sleep 10
    
    # Check if recovery was successful
    if quick_health_check; then
        log_info "✅ Automated recovery successful"
        send_slack_notification "🔄 Automated recovery successful for AutoControl Pro" "good"
        return 0
    else
        log_error "❌ Automated recovery failed"
        send_slack_notification "🚨 Automated recovery failed for AutoControl Pro - manual intervention required" "critical"
        return 1
    fi
}

# Collect diagnostic information
collect_diagnostics() {
    log_step "Collecting diagnostic information..."
    
    local diag_dir="/tmp/autocontrol-diagnostics-\$(date +%Y%m%d_%H%M%S)"
    mkdir -p "\$diag_dir"
    
    # System information
    uname -a > "\$diag_dir/system_info.txt"
    uptime > "\$diag_dir/uptime.txt"
    free -h > "\$diag_dir/memory.txt"
    df -h > "\$diag_dir/disk.txt"
    
    # Service status
    systemctl status autocontrol-pro > "\$diag_dir/service_status.txt" 2>&1
    
    # Application logs
    journalctl -u autocontrol-pro -n 1000 > "\$diag_dir/application_logs.txt" 2>&1
    
    # System logs
    tail -n 1000 /var/log/syslog > "\$diag_dir/system_logs.txt" 2>/dev/null || true
    
    # Network information
    netstat -tulpn > "\$diag_dir/network.txt" 2>/dev/null || true
    
    # Process information
    ps aux > "\$diag_dir/processes.txt"
    
    # Database status (if accessible)
    mongo --eval "db.serverStatus()" > "\$diag_dir/database_status.txt" 2>/dev/null || echo "Database not accessible" > "\$diag_dir/database_status.txt"
    
    # Create archive
    tar -czf "\$diag_dir.tar.gz" -C "\$(dirname \$diag_dir)" "\$(basename \$diag_dir)"
    rm -rf "\$diag_dir"
    
    log_info "Diagnostics collected: \$diag_dir.tar.gz"
    echo "\$diag_dir.tar.gz"
}

# Main incident response function
handle_incident() {
    local severity="\$1"
    local description="\$2"
    
    log_info "🚨 INCIDENT DETECTED - Severity: \$severity"
    log_info "Description: \$description"
    
    # Send initial alert
    send_slack_notification "🚨 INCIDENT ALERT - P\$severity\\n\\nIssue: \$description\\nStarted: \$(date)\\nStatus: Investigating" "critical"
    update_status_page "investigating" "\$description"
    
    # Run health check
    if ! quick_health_check; then
        log_warn "Health check failed, attempting recovery..."
        
        # Attempt automated recovery for non-critical incidents
        if [[ "\$severity" != "0" ]]; then
            if attempt_recovery; then
                send_slack_notification "✅ INCIDENT RESOLVED - P\$severity\\n\\nIssue: \$description\\nResolution: Automated recovery successful\\nDuration: \$(date)" "good"
                update_status_page "operational" "Issue resolved"
                return 0
            fi
        fi
    fi
    
    # Collect diagnostics
    local diag_file=\$(collect_diagnostics)
    
    log_error "Manual intervention required"
    log_info "Diagnostic file: \$diag_file"
    
    # Send escalation alert
    send_slack_notification "🚨 ESCALATION REQUIRED - P\$severity\\n\\nIssue: \$description\\nStatus: Automated recovery failed\\nDiagnostics: \$diag_file\\n\\nManual intervention required immediately!" "critical"
    
    return 1
}

# Command line interface
case "\${1:-}" in
    "check")
        quick_health_check
        ;;
    "recover")
        attempt_recovery
        ;;
    "diagnostics")
        collect_diagnostics
        ;;
    "incident")
        if [[ \$# -lt 3 ]]; then
            echo "Usage: \$0 incident <severity> <description>"
            echo "Severity: 0 (critical), 1 (high), 2 (medium), 3 (low)"
            exit 1
        fi
        handle_incident "\$2" "\$3"
        ;;
    *)
        echo "AutoControl Pro - Incident Management Script"
        echo ""
        echo "Usage: \$0 <command> [options]"
        echo ""
        echo "Commands:"
        echo "  check                    - Run quick health check"
        echo "  recover                  - Attempt automated recovery"
        echo "  diagnostics              - Collect diagnostic information"
        echo "  incident <sev> <desc>    - Handle incident with severity and description"
        echo ""
        echo "Examples:"
        echo "  \$0 check"
        echo "  \$0 incident 1 'Database connection timeout'"
        echo "  \$0 recover"
        ;;
esac
`;

    const scriptPath = path.join(this.scriptsDir, 'incident-manager.sh');
    await fs.writeFile(scriptPath, incidentScript);
    await fs.chmod(scriptPath, 0o755);
    console.log(`✅ Incident management script created at: ${scriptPath}`);
  }

  async createStatusPageConfig() {
    console.log('📊 Creating status page configuration...');

    const statusPageHTML = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AutoControl Pro - System Status</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f8fafc; color: #334155; line-height: 1.6;
        }
        .header { 
            background: white; padding: 2rem; text-align: center;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 2rem;
        }
        .container { max-width: 800px; margin: 0 auto; padding: 0 2rem; }
        .status-overview { 
            background: white; border-radius: 8px; padding: 2rem;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 2rem;
        }
        .status-indicator { 
            display: flex; align-items: center; justify-content: center;
            margin-bottom: 1rem;
        }
        .status-dot { 
            width: 12px; height: 12px; border-radius: 50%;
            margin-right: 0.5rem;
        }
        .status-operational { background: #10b981; }
        .status-degraded { background: #f59e0b; }
        .status-outage { background: #ef4444; }
        .services { background: white; border-radius: 8px; padding: 2rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .service { 
            display: flex; justify-content: space-between; align-items: center;
            padding: 1rem 0; border-bottom: 1px solid #e2e8f0;
        }
        .service:last-child { border-bottom: none; }
        .service-name { font-weight: 500; }
        .service-status { 
            display: flex; align-items: center; font-size: 0.875rem;
        }
        .incidents { 
            background: white; border-radius: 8px; padding: 2rem;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-top: 2rem;
        }
        .incident { 
            padding: 1rem; border-left: 4px solid #ef4444;
            background: #fef2f2; margin-bottom: 1rem; border-radius: 0 4px 4px 0;
        }
        .incident-title { font-weight: 600; color: #991b1b; }
        .incident-time { font-size: 0.875rem; color: #6b7280; }
        .footer { text-align: center; padding: 2rem; color: #6b7280; font-size: 0.875rem; }
    </style>
</head>
<body>
    <div class="header">
        <h1>AutoControl Pro</h1>
        <p>System Status</p>
    </div>
    
    <div class="container">
        <div class="status-overview">
            <div class="status-indicator">
                <div class="status-dot status-operational" id="overall-status-dot"></div>
                <h2 id="overall-status-text">All Systems Operational</h2>
            </div>
            <p id="status-description">All systems are running normally.</p>
        </div>
        
        <div class="services">
            <h3 style="margin-bottom: 1rem;">Services</h3>
            
            <div class="service">
                <div class="service-name">Web Application</div>
                <div class="service-status">
                    <div class="status-dot status-operational"></div>
                    Operational
                </div>
            </div>
            
            <div class="service">
                <div class="service-name">API Services</div>
                <div class="service-status">
                    <div class="status-dot status-operational"></div>
                    Operational
                </div>
            </div>
            
            <div class="service">
                <div class="service-name">Database</div>
                <div class="service-status">
                    <div class="status-dot status-operational"></div>
                    Operational
                </div>
            </div>
            
            <div class="service">
                <div class="service-name">Authentication</div>
                <div class="service-status">
                    <div class="status-dot status-operational"></div>
                    Operational
                </div>
            </div>
            
            <div class="service">
                <div class="service-name">Email Services</div>
                <div class="service-status">
                    <div class="status-dot status-operational"></div>
                    Operational
                </div>
            </div>
        </div>
        
        <div class="incidents">
            <h3 style="margin-bottom: 1rem;">Recent Incidents</h3>
            <div id="incidents-list">
                <p style="color: #6b7280;">No recent incidents to report.</p>
            </div>
        </div>
    </div>
    
    <div class="footer">
        <p>Last updated: <span id="last-updated">-</span></p>
        <p>If you're experiencing issues, please contact support at support@autocontrolpro.com</p>
    </div>
    
    <script>
        async function updateStatus() {
            try {
                const response = await fetch('/api/status');
                const data = await response.json();
                
                if (data.success) {
                    updateStatusDisplay(data.data);
                }
            } catch (error) {
                console.error('Failed to fetch status:', error);
            }
            
            document.getElementById('last-updated').textContent = new Date().toLocaleString();
        }
        
        function updateStatusDisplay(status) {
            const overallDot = document.getElementById('overall-status-dot');
            const overallText = document.getElementById('overall-status-text');
            const description = document.getElementById('status-description');
            
            switch (status.overall) {
                case 'operational':
                    overallDot.className = 'status-dot status-operational';
                    overallText.textContent = 'All Systems Operational';
                    description.textContent = 'All systems are running normally.';
                    break;
                case 'degraded':
                    overallDot.className = 'status-dot status-degraded';
                    overallText.textContent = 'Degraded Performance';
                    description.textContent = 'Some systems are experiencing issues.';
                    break;
                case 'outage':
                    overallDot.className = 'status-dot status-outage';
                    overallText.textContent = 'Service Outage';
                    description.textContent = 'We are experiencing service disruptions.';
                    break;
            }
            
            // Update incidents if any
            if (status.incidents && status.incidents.length > 0) {
                const incidentsList = document.getElementById('incidents-list');
                incidentsList.innerHTML = status.incidents.map(incident => \`
                    <div class="incident">
                        <div class="incident-title">\${incident.title}</div>
                        <div class="incident-time">\${new Date(incident.timestamp).toLocaleString()}</div>
                        <p>\${incident.description}</p>
                    </div>
                \`).join('');
            }
        }
        
        // Initial load
        updateStatus();
        
        // Update every 30 seconds
        setInterval(updateStatus, 30000);
    </script>
</body>
</html>`;

    const statusPagePath = path.join(__dirname, '../public/status.html');
    await fs.mkdir(path.dirname(statusPagePath), { recursive: true });
    await fs.writeFile(statusPagePath, statusPageHTML);
    console.log(`✅ Status page created at: ${statusPagePath}`);
  }

  async run() {
    try {
      console.log('🚨 AutoControl Pro - Incident Response Setup');
      console.log('=============================================');
      
      await this.createIncidentResponsePlan();
      await this.createIncidentScript();
      await this.createStatusPageConfig();
      
      console.log('\n🎉 Incident Response Setup Complete!');
      console.log('\n📋 What was created:');
      console.log('✅ Comprehensive incident response plan');
      console.log('✅ Automated incident management script');
      console.log('✅ Public status page');
      
      console.log('\n📋 Next Steps:');
      console.log('1. Review and customize incident response plan');
      console.log('2. Configure Slack webhook for notifications');
      console.log('3. Set up status page API integration');
      console.log('4. Train team on incident procedures');
      console.log('5. Conduct incident response drills');
      
    } catch (error) {
      console.error('❌ Incident response setup failed:', error.message);
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const setup = new IncidentResponseSetup();
  setup.run();
}

module.exports = IncidentResponseSetup;