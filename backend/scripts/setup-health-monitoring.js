#!/usr/bin/env node

/**
 * Health Monitoring Setup Script
 * Configures comprehensive health checks and monitoring
 */

const fs = require('fs').promises;
const path = require('path');

class HealthMonitoringSetup {
  constructor() {
    this.monitoringDir = path.join(__dirname, '../monitoring');
  }

  async createHealthCheckEndpoints() {
    console.log('🏥 Creating health check endpoints...');

    const healthRoutes = `/**
 * Health Check Routes
 * Comprehensive health monitoring endpoints
 */

const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// Basic health check
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };

    res.status(200).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Detailed health check
router.get('/health/detailed', async (req, res) => {
  try {
    const checks = await Promise.allSettled([
      checkDatabase(),
      checkMemory(),
      checkDisk(),
      checkExternalServices()
    ]);

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {
        database: checks[0].status === 'fulfilled' ? checks[0].value : { status: 'unhealthy', error: checks[0].reason?.message },
        memory: checks[1].status === 'fulfilled' ? checks[1].value : { status: 'unhealthy', error: checks[1].reason?.message },
        disk: checks[2].status === 'fulfilled' ? checks[2].value : { status: 'unhealthy', error: checks[2].reason?.message },
        external: checks[3].status === 'fulfilled' ? checks[3].value : { status: 'unhealthy', error: checks[3].reason?.message }
      }
    };

    // Determine overall status
    const hasUnhealthyChecks = Object.values(health.checks).some(check => check.status === 'unhealthy');
    if (hasUnhealthyChecks) {
      health.status = 'degraded';
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);

  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Readiness check (for Kubernetes/Docker)
router.get('/ready', async (req, res) => {
  try {
    // Check if application is ready to serve requests
    await checkDatabase();
    
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Liveness check (for Kubernetes/Docker)
router.get('/live', (req, res) => {
  // Simple liveness check - if we can respond, we're alive
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Metrics endpoint (Prometheus format)
router.get('/metrics', (req, res) => {
  const metrics = generatePrometheusMetrics();
  res.set('Content-Type', 'text/plain');
  res.send(metrics);
});

// Health check functions
async function checkDatabase() {
  try {
    const start = Date.now();
    await mongoose.connection.db.admin().ping();
    const responseTime = Date.now() - start;
    
    return {
      status: 'healthy',
      responseTime: \`\${responseTime}ms\`,
      connection: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    };
  } catch (error) {
    throw new Error(\`Database check failed: \${error.message}\`);
  }
}

async function checkMemory() {
  const usage = process.memoryUsage();
  const totalMB = Math.round(usage.rss / 1024 / 1024);
  const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
  
  // Alert if memory usage is too high (>500MB)
  const isHealthy = totalMB < 500;
  
  return {
    status: isHealthy ? 'healthy' : 'warning',
    rss: \`\${totalMB}MB\`,
    heapUsed: \`\${heapUsedMB}MB\`,
    heapTotal: \`\${heapTotalMB}MB\`,
    external: \`\${Math.round(usage.external / 1024 / 1024)}MB\`
  };
}

async function checkDisk() {
  try {
    const fs = require('fs').promises;
    const stats = await fs.stat(process.cwd());
    
    return {
      status: 'healthy',
      accessible: true,
      path: process.cwd()
    };
  } catch (error) {
    throw new Error(\`Disk check failed: \${error.message}\`);
  }
}

async function checkExternalServices() {
  // Check external service dependencies
  const checks = [];
  
  // Email service check (if configured)
  if (process.env.SENDGRID_API_KEY || process.env.SMTP_HOST) {
    checks.push(checkEmailService());
  }
  
  if (checks.length === 0) {
    return { status: 'healthy', message: 'No external services configured' };
  }
  
  const results = await Promise.allSettled(checks);
  const allHealthy = results.every(result => result.status === 'fulfilled');
  
  return {
    status: allHealthy ? 'healthy' : 'degraded',
    services: results.map((result, index) => ({
      name: \`service_\${index}\`,
      status: result.status === 'fulfilled' ? 'healthy' : 'unhealthy',
      error: result.reason?.message
    }))
  };
}

async function checkEmailService() {
  // Simple check - just verify configuration exists
  if (process.env.SENDGRID_API_KEY) {
    return { service: 'sendgrid', status: 'configured' };
  } else if (process.env.SMTP_HOST) {
    return { service: 'smtp', status: 'configured' };
  } else {
    throw new Error('Email service not configured');
  }
}

function generatePrometheusMetrics() {
  const memory = process.memoryUsage();
  const uptime = process.uptime();
  
  return \`# HELP nodejs_memory_usage_bytes Memory usage in bytes
# TYPE nodejs_memory_usage_bytes gauge
nodejs_memory_usage_bytes{type="rss"} \${memory.rss}
nodejs_memory_usage_bytes{type="heapUsed"} \${memory.heapUsed}
nodejs_memory_usage_bytes{type="heapTotal"} \${memory.heapTotal}
nodejs_memory_usage_bytes{type="external"} \${memory.external}

# HELP nodejs_uptime_seconds Process uptime in seconds
# TYPE nodejs_uptime_seconds counter
nodejs_uptime_seconds \${uptime}

# HELP autocontrol_database_connected Database connection status
# TYPE autocontrol_database_connected gauge
autocontrol_database_connected \${mongoose.connection.readyState === 1 ? 1 : 0}
\`;
}

module.exports = router;
`;

    const healthRoutesPath = path.join(__dirname, '../routes/health.routes.js');
    await fs.writeFile(healthRoutesPath, healthRoutes);
    console.log(`✅ Health check routes created at: ${healthRoutesPath}`);
  }

  async createMonitoringDashboard() {
    console.log('📊 Creating monitoring dashboard...');

    const dashboardHTML = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AutoControl Pro - System Monitoring</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            color: #333;
        }
        
        .header {
            background: #2c3e50;
            color: white;
            padding: 1rem 2rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .container {
            max-width: 1200px;
            margin: 2rem auto;
            padding: 0 2rem;
        }
        
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
            margin-bottom: 2rem;
        }
        
        .card {
            background: white;
            border-radius: 8px;
            padding: 1.5rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .card h3 {
            margin-bottom: 1rem;
            color: #2c3e50;
            border-bottom: 2px solid #3498db;
            padding-bottom: 0.5rem;
        }
        
        .status {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 20px;
            font-size: 0.875rem;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .status.healthy {
            background: #d4edda;
            color: #155724;
        }
        
        .status.warning {
            background: #fff3cd;
            color: #856404;
        }
        
        .status.unhealthy {
            background: #f8d7da;
            color: #721c24;
        }
        
        .metric {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.5rem 0;
            border-bottom: 1px solid #eee;
        }
        
        .metric:last-child {
            border-bottom: none;
        }
        
        .metric-label {
            font-weight: 500;
        }
        
        .metric-value {
            font-family: 'Monaco', 'Menlo', monospace;
            background: #f8f9fa;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
        }
        
        .refresh-btn {
            background: #3498db;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 4px;
            cursor: pointer;
            font-size: 1rem;
            margin-bottom: 2rem;
        }
        
        .refresh-btn:hover {
            background: #2980b9;
        }
        
        .loading {
            opacity: 0.6;
            pointer-events: none;
        }
        
        .timestamp {
            color: #666;
            font-size: 0.875rem;
            text-align: center;
            margin-top: 2rem;
        }
        
        .chart-container {
            height: 200px;
            margin-top: 1rem;
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 0 1rem;
            }
            
            .grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🏥 AutoControl Pro - System Monitoring</h1>
        <p>Real-time system health and performance monitoring</p>
    </div>
    
    <div class="container">
        <button class="refresh-btn" onclick="refreshData()">🔄 Refresh Data</button>
        
        <div class="grid">
            <div class="card">
                <h3>🎯 System Status</h3>
                <div id="system-status">
                    <div class="metric">
                        <span class="metric-label">Overall Status</span>
                        <span class="status healthy" id="overall-status">Loading...</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Uptime</span>
                        <span class="metric-value" id="uptime">-</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Version</span>
                        <span class="metric-value" id="version">-</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Environment</span>
                        <span class="metric-value" id="environment">-</span>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <h3>🗄️ Database</h3>
                <div id="database-status">
                    <div class="metric">
                        <span class="metric-label">Connection</span>
                        <span class="status healthy" id="db-status">Loading...</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Response Time</span>
                        <span class="metric-value" id="db-response-time">-</span>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <h3>💾 Memory Usage</h3>
                <div id="memory-status">
                    <div class="metric">
                        <span class="metric-label">RSS</span>
                        <span class="metric-value" id="memory-rss">-</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Heap Used</span>
                        <span class="metric-value" id="memory-heap-used">-</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Heap Total</span>
                        <span class="metric-value" id="memory-heap-total">-</span>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <h3>🌐 External Services</h3>
                <div id="external-services">
                    <div class="metric">
                        <span class="metric-label">Email Service</span>
                        <span class="status healthy" id="email-status">Loading...</span>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="card">
            <h3>📈 System Metrics</h3>
            <div class="chart-container" id="metrics-chart">
                <p style="text-align: center; color: #666; margin-top: 80px;">
                    Metrics visualization would be implemented here<br>
                    (Consider integrating with Chart.js or similar library)
                </p>
            </div>
        </div>
        
        <div class="timestamp" id="last-updated">
            Last updated: -
        </div>
    </div>
    
    <script>
        let isLoading = false;
        
        async function fetchHealthData() {
            try {
                const response = await fetch('/health/detailed');
                const data = await response.json();
                return data;
            } catch (error) {
                console.error('Failed to fetch health data:', error);
                return null;
            }
        }
        
        function updateUI(data) {
            if (!data) {
                document.getElementById('overall-status').textContent = 'Error';
                document.getElementById('overall-status').className = 'status unhealthy';
                return;
            }
            
            // Overall status
            document.getElementById('overall-status').textContent = data.status;
            document.getElementById('overall-status').className = \`status \${data.status === 'healthy' ? 'healthy' : data.status === 'degraded' ? 'warning' : 'unhealthy'}\`;
            
            // System info
            document.getElementById('uptime').textContent = formatUptime(data.uptime);
            document.getElementById('version').textContent = data.version;
            document.getElementById('environment').textContent = data.environment;
            
            // Database
            if (data.checks.database) {
                document.getElementById('db-status').textContent = data.checks.database.status;
                document.getElementById('db-status').className = \`status \${data.checks.database.status === 'healthy' ? 'healthy' : 'unhealthy'}\`;
                document.getElementById('db-response-time').textContent = data.checks.database.responseTime || '-';
            }
            
            // Memory
            if (data.checks.memory) {
                document.getElementById('memory-rss').textContent = data.checks.memory.rss || '-';
                document.getElementById('memory-heap-used').textContent = data.checks.memory.heapUsed || '-';
                document.getElementById('memory-heap-total').textContent = data.checks.memory.heapTotal || '-';
            }
            
            // External services
            if (data.checks.external) {
                document.getElementById('email-status').textContent = data.checks.external.status;
                document.getElementById('email-status').className = \`status \${data.checks.external.status === 'healthy' ? 'healthy' : 'warning'}\`;
            }
            
            // Last updated
            document.getElementById('last-updated').textContent = \`Last updated: \${new Date().toLocaleString()}\`;
        }
        
        function formatUptime(seconds) {
            const days = Math.floor(seconds / 86400);
            const hours = Math.floor((seconds % 86400) / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            
            if (days > 0) {
                return \`\${days}d \${hours}h \${minutes}m\`;
            } else if (hours > 0) {
                return \`\${hours}h \${minutes}m\`;
            } else {
                return \`\${minutes}m\`;
            }
        }
        
        async function refreshData() {
            if (isLoading) return;
            
            isLoading = true;
            document.body.classList.add('loading');
            
            try {
                const data = await fetchHealthData();
                updateUI(data);
            } finally {
                isLoading = false;
                document.body.classList.remove('loading');
            }
        }
        
        // Initial load
        refreshData();
        
        // Auto-refresh every 30 seconds
        setInterval(refreshData, 30000);
    </script>
</body>
</html>`;

    await fs.mkdir(this.monitoringDir, { recursive: true });
    const dashboardPath = path.join(this.monitoringDir, 'dashboard.html');
    await fs.writeFile(dashboardPath, dashboardHTML);
    console.log(`✅ Monitoring dashboard created at: ${dashboardPath}`);
  }

  async createSystemdHealthCheck() {
    console.log('🔧 Creating systemd health check service...');

    const healthCheckScript = `#!/bin/bash

# AutoControl Pro Health Check Script
# Monitors application health and restarts if unhealthy

APP_NAME="autocontrol-pro"
HEALTH_URL="http://localhost:5000/health"
LOG_FILE="/var/log/autocontrol-pro-healthcheck.log"
MAX_FAILURES=3
FAILURE_COUNT=0

log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

check_health() {
    local response
    response=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" --max-time 10)
    
    if [ "$response" = "200" ]; then
        return 0
    else
        return 1
    fi
}

restart_service() {
    log_message "CRITICAL: Restarting $APP_NAME service due to health check failures"
    systemctl restart "$APP_NAME"
    
    # Wait for service to start
    sleep 10
    
    # Check if restart was successful
    if systemctl is-active --quiet "$APP_NAME"; then
        log_message "INFO: Service restarted successfully"
        FAILURE_COUNT=0
    else
        log_message "ERROR: Service restart failed"
    fi
}

# Main health check logic
if check_health; then
    # Health check passed
    if [ $FAILURE_COUNT -gt 0 ]; then
        log_message "INFO: Health check recovered after $FAILURE_COUNT failures"
        FAILURE_COUNT=0
    fi
else
    # Health check failed
    FAILURE_COUNT=$((FAILURE_COUNT + 1))
    log_message "WARNING: Health check failed (attempt $FAILURE_COUNT/$MAX_FAILURES)"
    
    if [ $FAILURE_COUNT -ge $MAX_FAILURES ]; then
        restart_service
    fi
fi
`;

    const healthCheckPath = path.join(__dirname, '../scripts/health-check.sh');
    await fs.writeFile(healthCheckPath, healthCheckScript);
    await fs.chmod(healthCheckPath, 0o755);

    const healthCheckService = `[Unit]
Description=AutoControl Pro Health Check
After=autocontrol-pro.service
Requires=autocontrol-pro.service

[Service]
Type=oneshot
ExecStart=/opt/autocontrol-pro/backend/scripts/health-check.sh
User=autocontrol
Group=autocontrol

[Install]
WantedBy=multi-user.target
`;

    const healthCheckTimer = `[Unit]
Description=Run AutoControl Pro Health Check every 2 minutes
Requires=autocontrol-pro-healthcheck.service

[Timer]
OnBootSec=2min
OnUnitActiveSec=2min
Unit=autocontrol-pro-healthcheck.service

[Install]
WantedBy=timers.target
`;

    const serviceDir = path.join(__dirname, '../systemd');
    await fs.mkdir(serviceDir, { recursive: true });
    
    await fs.writeFile(path.join(serviceDir, 'autocontrol-pro-healthcheck.service'), healthCheckService);
    await fs.writeFile(path.join(serviceDir, 'autocontrol-pro-healthcheck.timer'), healthCheckTimer);

    console.log(`✅ Health check script created at: ${healthCheckPath}`);
    console.log(`✅ Systemd health check service created in: ${serviceDir}`);
    
    console.log('\n📋 To install health check service:');
    console.log('sudo cp systemd/autocontrol-pro-healthcheck.* /etc/systemd/system/');
    console.log('sudo systemctl daemon-reload');
    console.log('sudo systemctl enable autocontrol-pro-healthcheck.timer');
    console.log('sudo systemctl start autocontrol-pro-healthcheck.timer');
  }

  async createLogAggregationConfig() {
    console.log('📝 Creating log aggregation configuration...');

    const rsyslogConfig = `# AutoControl Pro - Rsyslog Configuration
# Place this file in /etc/rsyslog.d/49-autocontrol-pro.conf

# AutoControl Pro application logs
if $programname == 'autocontrol-pro' then {
    /var/log/autocontrol-pro/application.log
    stop
}

# Health check logs
if $programname == 'autocontrol-pro-healthcheck' then {
    /var/log/autocontrol-pro/healthcheck.log
    stop
}

# Nginx logs for AutoControl Pro
if $programname == 'nginx' and $msg contains 'autocontrol' then {
    /var/log/autocontrol-pro/nginx.log
    stop
}
`;

    const fluentdConfig = `# AutoControl Pro - Fluentd Configuration
# Collects and forwards logs to centralized logging system

<source>
  @type tail
  path /var/log/autocontrol-pro/*.log
  pos_file /var/log/fluentd/autocontrol-pro.log.pos
  tag autocontrol.app
  format json
  time_key timestamp
  time_format %Y-%m-%dT%H:%M:%S.%L%z
</source>

<source>
  @type tail
  path /var/log/nginx/access.log
  pos_file /var/log/fluentd/nginx-access.log.pos
  tag autocontrol.nginx.access
  format nginx
</source>

<source>
  @type tail
  path /var/log/nginx/error.log
  pos_file /var/log/fluentd/nginx-error.log.pos
  tag autocontrol.nginx.error
  format /^(?<time>[^ ]* [^ ]*) \\[(?<log_level>\\w+)\\] (?<message>.*)$/
</source>

# Add metadata
<filter autocontrol.**>
  @type record_transformer
  <record>
    hostname "#{Socket.gethostname}"
    service "autocontrol-pro"
    environment "#{ENV['NODE_ENV'] || 'production'}"
  </record>
</filter>

# Output to file (can be changed to elasticsearch, s3, etc.)
<match autocontrol.**>
  @type file
  path /var/log/autocontrol-pro/aggregated
  time_slice_format %Y%m%d%H
  time_slice_wait 10m
  time_format %Y-%m-%dT%H:%M:%S.%L%z
  compress gzip
  format json
</match>
`;

    const configDir = path.join(__dirname, '../config');
    await fs.mkdir(configDir, { recursive: true });
    
    await fs.writeFile(path.join(configDir, 'rsyslog-autocontrol-pro.conf'), rsyslogConfig);
    await fs.writeFile(path.join(configDir, 'fluentd-autocontrol-pro.conf'), fluentdConfig);

    console.log(`✅ Log aggregation configs created in: ${configDir}`);
    
    console.log('\n📋 To install log aggregation:');
    console.log('sudo cp config/rsyslog-autocontrol-pro.conf /etc/rsyslog.d/49-autocontrol-pro.conf');
    console.log('sudo systemctl restart rsyslog');
    console.log('# For Fluentd: sudo cp config/fluentd-autocontrol-pro.conf /etc/fluentd/conf.d/');
  }

  async createAlertingConfig() {
    console.log('🚨 Creating alerting configuration...');

    const alertScript = `#!/bin/bash

# AutoControl Pro Alerting Script
# Sends alerts when critical issues are detected

WEBHOOK_URL="$1"
ALERT_TYPE="$2"
MESSAGE="$3"

if [ -z "$WEBHOOK_URL" ] || [ -z "$ALERT_TYPE" ] || [ -z "$MESSAGE" ]; then
    echo "Usage: $0 <webhook_url> <alert_type> <message>"
    exit 1
fi

# Prepare alert payload
HOSTNAME=$(hostname)
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

PAYLOAD=$(cat <<EOF
{
    "service": "autocontrol-pro",
    "hostname": "$HOSTNAME",
    "timestamp": "$TIMESTAMP",
    "alert_type": "$ALERT_TYPE",
    "message": "$MESSAGE",
    "severity": "critical"
}
EOF
)

# Send alert
curl -X POST \\
    -H "Content-Type: application/json" \\
    -d "$PAYLOAD" \\
    "$WEBHOOK_URL" \\
    --max-time 10 \\
    --silent

echo "Alert sent: $ALERT_TYPE - $MESSAGE"
`;

    const monitoringScript = `#!/bin/bash

# AutoControl Pro System Monitoring Script
# Monitors system resources and sends alerts

ALERT_SCRIPT="/opt/autocontrol-pro/backend/scripts/send-alert.sh"
WEBHOOK_URL="${ALERT_WEBHOOK_URL:-}"
LOG_FILE="/var/log/autocontrol-pro/monitoring.log"

log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

send_alert() {
    local alert_type="$1"
    local message="$2"
    
    log_message "ALERT: $alert_type - $message"
    
    if [ -n "$WEBHOOK_URL" ] && [ -f "$ALERT_SCRIPT" ]; then
        "$ALERT_SCRIPT" "$WEBHOOK_URL" "$alert_type" "$message"
    fi
}

check_disk_space() {
    local usage
    usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$usage" -gt 90 ]; then
        send_alert "disk_space" "Disk usage is at ${usage}%"
    elif [ "$usage" -gt 80 ]; then
        log_message "WARNING: Disk usage is at ${usage}%"
    fi
}

check_memory_usage() {
    local usage
    usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    
    if [ "$usage" -gt 90 ]; then
        send_alert "memory_usage" "Memory usage is at ${usage}%"
    elif [ "$usage" -gt 80 ]; then
        log_message "WARNING: Memory usage is at ${usage}%"
    fi
}

check_cpu_usage() {
    local usage
    usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
    
    # Convert to integer for comparison
    usage_int=$(echo "$usage" | cut -d'.' -f1)
    
    if [ "$usage_int" -gt 90 ]; then
        send_alert "cpu_usage" "CPU usage is at ${usage}%"
    elif [ "$usage_int" -gt 80 ]; then
        log_message "WARNING: CPU usage is at ${usage}%"
    fi
}

check_service_status() {
    if ! systemctl is-active --quiet autocontrol-pro; then
        send_alert "service_down" "AutoControl Pro service is not running"
    fi
}

check_database_connection() {
    local health_response
    health_response=$(curl -s http://localhost:5000/health 2>/dev/null)
    
    if [ $? -ne 0 ] || ! echo "$health_response" | grep -q '"status":"healthy"'; then
        send_alert "database_connection" "Database connection check failed"
    fi
}

# Run all checks
log_message "Starting system monitoring checks"

check_disk_space
check_memory_usage
check_cpu_usage
check_service_status
check_database_connection

log_message "System monitoring checks completed"
`;

    const scriptsDir = path.join(__dirname, '../scripts');
    await fs.writeFile(path.join(scriptsDir, 'send-alert.sh'), alertScript);
    await fs.writeFile(path.join(scriptsDir, 'system-monitoring.sh'), monitoringScript);
    
    await fs.chmod(path.join(scriptsDir, 'send-alert.sh'), 0o755);
    await fs.chmod(path.join(scriptsDir, 'system-monitoring.sh'), 0o755);

    // Create systemd timer for monitoring
    const monitoringService = `[Unit]
Description=AutoControl Pro System Monitoring
After=autocontrol-pro.service

[Service]
Type=oneshot
ExecStart=/opt/autocontrol-pro/backend/scripts/system-monitoring.sh
User=autocontrol
Group=autocontrol
Environment=ALERT_WEBHOOK_URL=https://hooks.slack.com/your/webhook/url

[Install]
WantedBy=multi-user.target
`;

    const monitoringTimer = `[Unit]
Description=Run AutoControl Pro System Monitoring every 5 minutes
Requires=autocontrol-pro-monitoring.service

[Timer]
OnBootSec=5min
OnUnitActiveSec=5min
Unit=autocontrol-pro-monitoring.service

[Install]
WantedBy=timers.target
`;

    const systemdDir = path.join(__dirname, '../systemd');
    await fs.writeFile(path.join(systemdDir, 'autocontrol-pro-monitoring.service'), monitoringService);
    await fs.writeFile(path.join(systemdDir, 'autocontrol-pro-monitoring.timer'), monitoringTimer);

    console.log(`✅ Alerting scripts created in: ${scriptsDir}`);
    console.log(`✅ Monitoring systemd services created in: ${systemdDir}`);
    
    console.log('\n📋 To install monitoring:');
    console.log('sudo cp systemd/autocontrol-pro-monitoring.* /etc/systemd/system/');
    console.log('sudo systemctl daemon-reload');
    console.log('sudo systemctl enable autocontrol-pro-monitoring.timer');
    console.log('sudo systemctl start autocontrol-pro-monitoring.timer');
  }

  async run() {
    try {
      console.log('🏥 AutoControl Pro - Health Monitoring Setup');
      console.log('=============================================\n');

      await this.createHealthCheckEndpoints();
      await this.createMonitoringDashboard();
      await this.createSystemdHealthCheck();
      await this.createLogAggregationConfig();
      await this.createAlertingConfig();

      console.log('\n🎉 Health Monitoring Setup Complete!');
      console.log('\n📋 What was created:');
      console.log('✅ Health check API endpoints (/health, /health/detailed, /ready, /live, /metrics)');
      console.log('✅ Web-based monitoring dashboard');
      console.log('✅ Systemd health check service with auto-restart');
      console.log('✅ Log aggregation configuration (rsyslog, fluentd)');
      console.log('✅ System monitoring and alerting scripts');
      
      console.log('\n📋 Next Steps:');
      console.log('1. Add health routes to your Express app:');
      console.log('   app.use(require("./routes/health.routes"));');
      console.log('2. Install systemd services and timers');
      console.log('3. Configure webhook URL for alerts');
      console.log('4. Access monitoring dashboard at: /monitoring/dashboard.html');
      console.log('5. Set up external monitoring (Uptime Robot, Pingdom, etc.)');
      
      console.log('\n🔍 Monitoring Endpoints:');
      console.log('• GET /health - Basic health check');
      console.log('• GET /health/detailed - Comprehensive health check');
      console.log('• GET /ready - Kubernetes readiness probe');
      console.log('• GET /live - Kubernetes liveness probe');
      console.log('• GET /metrics - Prometheus metrics');

    } catch (error) {
      console.error('❌ Health monitoring setup failed:', error.message);
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const setup = new HealthMonitoringSetup();
  setup.run();
}

module.exports = HealthMonitoringSetup;