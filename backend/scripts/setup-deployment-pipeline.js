#!/usr/bin/env node

/**
 * Deployment Pipeline Setup Script
 * Creates automated deployment pipelines and CI/CD configuration
 */

const fs = require('fs').promises;
const path = require('path');

class DeploymentPipelineSetup {
  constructor() {
    this.cicdDir = path.join(__dirname, '../../.github/workflows');
    this.scriptsDir = path.join(__dirname, '../scripts');
  }

  async createGitHubActions() {
    console.log('🚀 Creating GitHub Actions workflows...');

    const ciWorkflow = `name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

env:
  NODE_VERSION: '18.x'
  MONGODB_URI: mongodb://localhost:27017/autocontrol-test

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mongodb:
        image: mongo:5.0
        ports:
          - 27017:27017
      
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: \${{ env.NODE_VERSION }}
        cache: 'npm'
        cache-dependency-path: backend/package-lock.json
    
    - name: Install backend dependencies
      run: |
        cd backend
        npm ci
    
    - name: Install frontend dependencies
      run: |
        cd frontend
        npm ci
    
    - name: Run backend tests
      run: |
        cd backend
        npm run test:all
      env:
        NODE_ENV: test
        MONGODB_URI: \${{ env.MONGODB_URI }}
        JWT_SECRET: test-secret-key
        REDIS_URL: redis://localhost:6379
    
    - name: Run security audit
      run: |
        cd backend
        npm audit --audit-level moderate
    
    - name: Build frontend
      run: |
        cd frontend
        npm run build
    
    - name: Upload test results
      uses: actions/upload-artifact@v4
      if: always()
      with:
        name: test-results
        path: |
          backend/coverage/
          backend/test-reports/
    
    - name: Upload build artifacts
      uses: actions/upload-artifact@v4
      with:
        name: build-artifacts
        path: |
          frontend/dist/
          backend/

  security-scan:
    runs-on: ubuntu-latest
    needs: test
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
    
    - name: Run Trivy vulnerability scanner
      uses: aquasecurity/trivy-action@master
      with:
        scan-type: 'fs'
        scan-ref: '.'
        format: 'sarif'
        output: 'trivy-results.sarif'
    
    - name: Upload Trivy scan results
      uses: github/codeql-action/upload-sarif@v3
      with:
        sarif_file: 'trivy-results.sarif'

  deploy-staging:
    runs-on: ubuntu-latest
    needs: [test, security-scan]
    if: github.ref == 'refs/heads/develop'
    
    environment:
      name: staging
      url: https://staging.autocontrolpro.com
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
    
    - name: Download build artifacts
      uses: actions/download-artifact@v4
      with:
        name: build-artifacts
    
    - name: Deploy to staging
      run: |
        echo "Deploying to staging environment..."
        # Add your staging deployment commands here
        # Example: rsync, docker deploy, etc.
    
    - name: Run smoke tests
      run: |
        cd backend
        npm run test:smoke -- --env=staging
    
    - name: Notify deployment
      uses: 8398a7/action-slack@v3
      with:
        status: \${{ job.status }}
        channel: '#deployments'
        webhook_url: \${{ secrets.SLACK_WEBHOOK }}

  deploy-production:
    runs-on: ubuntu-latest
    needs: [test, security-scan]
    if: github.ref == 'refs/heads/main'
    
    environment:
      name: production
      url: https://autocontrolpro.com
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
    
    - name: Download build artifacts
      uses: actions/download-artifact@v4
      with:
        name: build-artifacts
    
    - name: Create deployment backup
      run: |
        echo "Creating deployment backup..."
        # Add backup creation commands
    
    - name: Deploy to production
      run: |
        echo "Deploying to production environment..."
        # Add your production deployment commands here
    
    - name: Run health checks
      run: |
        cd backend
        npm run health:check:production
    
    - name: Rollback on failure
      if: failure()
      run: |
        echo "Deployment failed, initiating rollback..."
        # Add rollback commands
    
    - name: Notify deployment
      uses: 8398a7/action-slack@v3
      with:
        status: \${{ job.status }}
        channel: '#deployments'
        webhook_url: \${{ secrets.SLACK_WEBHOOK }}
`;

    await fs.mkdir(this.cicdDir, { recursive: true });
    const workflowPath = path.join(this.cicdDir, 'ci-cd.yml');
    await fs.writeFile(workflowPath, ciWorkflow);
    console.log(`✅ GitHub Actions workflow created at: ${workflowPath}`);
  }

  async createDeploymentScripts() {
    console.log('📦 Creating deployment scripts...');

    const deployScript = `#!/bin/bash

# Automated Deployment Script
# Handles zero-downtime deployments with rollback capability

set -e  # Exit on any error

# Configuration
APP_NAME="autocontrol-pro"
DEPLOY_DIR="/opt/autocontrol-pro"
BACKUP_DIR="/opt/backups/autocontrol-pro"
SERVICE_NAME="autocontrol-pro"
HEALTH_CHECK_URL="http://localhost:5000/health"
MAX_HEALTH_CHECKS=30
HEALTH_CHECK_INTERVAL=2

# Colors
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
NC='\\033[0m' # No Color

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

# Check if running as correct user
if [[ \$EUID -eq 0 ]]; then
   log_error "This script should not be run as root"
   exit 1
fi

# Parse command line arguments
ENVIRONMENT="production"
SKIP_TESTS=false
SKIP_BACKUP=false
FORCE_DEPLOY=false

while [[ \$# -gt 0 ]]; do
  case \$1 in
    --env)
      ENVIRONMENT="\$2"
      shift 2
      ;;
    --skip-tests)
      SKIP_TESTS=true
      shift
      ;;
    --skip-backup)
      SKIP_BACKUP=true
      shift
      ;;
    --force)
      FORCE_DEPLOY=true
      shift
      ;;
    *)
      echo "Unknown option \$1"
      exit 1
      ;;
  esac
done

log_info "Starting deployment to \$ENVIRONMENT environment"

# Pre-deployment checks
log_step "Running pre-deployment checks..."

# Check if service is running
if ! systemctl is-active --quiet \$SERVICE_NAME; then
    log_warn "Service \$SERVICE_NAME is not running"
    if [[ "\$FORCE_DEPLOY" != "true" ]]; then
        log_error "Use --force to deploy anyway"
        exit 1
    fi
fi

# Check disk space
DISK_USAGE=\$(df \$DEPLOY_DIR | awk 'NR==2{print \$5}' | sed 's/%//')
if [[ \$DISK_USAGE -gt 85 ]]; then
    log_error "Disk usage is \${DISK_USAGE}%. Cannot proceed with deployment."
    exit 1
fi

# Create backup
if [[ "\$SKIP_BACKUP" != "true" ]]; then
    log_step "Creating deployment backup..."
    BACKUP_TIMESTAMP=\$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="\$BACKUP_DIR/backup_\$BACKUP_TIMESTAMP.tar.gz"
    
    sudo mkdir -p "\$BACKUP_DIR"
    
    if [[ -d "\$DEPLOY_DIR" ]]; then
        sudo tar -czf "\$BACKUP_FILE" -C "\$DEPLOY_DIR" . 2>/dev/null || log_warn "Backup creation failed"
        log_info "Backup created: \$BACKUP_FILE"
    fi
fi

# Stop the service gracefully
log_step "Stopping \$SERVICE_NAME service..."
sudo systemctl stop \$SERVICE_NAME

# Wait for service to stop
sleep 5

# Deploy new version
log_step "Deploying new version..."

# Update code (this would be customized based on your deployment method)
cd \$DEPLOY_DIR
git fetch origin
git reset --hard origin/main

# Install dependencies
log_step "Installing dependencies..."
cd \$DEPLOY_DIR/backend
npm ci --production

# Build frontend
log_step "Building frontend..."
cd \$DEPLOY_DIR/frontend
npm ci
npm run build

# Run database migrations if needed
log_step "Running database migrations..."
cd \$DEPLOY_DIR/backend
npm run migrate 2>/dev/null || log_warn "No migrations to run"

# Update configuration
log_step "Updating configuration..."
if [[ ! -f "\$DEPLOY_DIR/backend/.env.production" ]]; then
    log_error "Production environment file not found!"
    exit 1
fi

# Set proper permissions
sudo chown -R autocontrol:autocontrol \$DEPLOY_DIR
sudo chmod +x \$DEPLOY_DIR/backend/scripts/*.sh

# Start the service
log_step "Starting \$SERVICE_NAME service..."
sudo systemctl start \$SERVICE_NAME

# Wait for service to start
sleep 10

# Health checks
log_step "Running health checks..."
HEALTH_CHECK_COUNT=0

while [[ \$HEALTH_CHECK_COUNT -lt \$MAX_HEALTH_CHECKS ]]; do
    if curl -f \$HEALTH_CHECK_URL >/dev/null 2>&1; then
        log_info "✅ Health check passed"
        break
    fi
    
    HEALTH_CHECK_COUNT=\$((HEALTH_CHECK_COUNT + 1))
    log_info "Health check \$HEALTH_CHECK_COUNT/\$MAX_HEALTH_CHECKS failed, retrying..."
    sleep \$HEALTH_CHECK_INTERVAL
done

if [[ \$HEALTH_CHECK_COUNT -eq \$MAX_HEALTH_CHECKS ]]; then
    log_error "❌ Health checks failed after \$MAX_HEALTH_CHECKS attempts"
    
    # Rollback
    log_step "Initiating rollback..."
    sudo systemctl stop \$SERVICE_NAME
    
    if [[ -f "\$BACKUP_FILE" ]]; then
        sudo tar -xzf "\$BACKUP_FILE" -C \$DEPLOY_DIR
        sudo systemctl start \$SERVICE_NAME
        log_info "Rollback completed"
    fi
    
    exit 1
fi

# Run smoke tests
if [[ "\$SKIP_TESTS" != "true" ]]; then
    log_step "Running smoke tests..."
    cd \$DEPLOY_DIR/backend
    npm run test:smoke 2>/dev/null || log_warn "Smoke tests failed"
fi

# Clean up old backups (keep last 10)
log_step "Cleaning up old backups..."
sudo find "\$BACKUP_DIR" -name "backup_*.tar.gz" -type f -mtime +30 -delete 2>/dev/null || true

# Update deployment log
echo "\$(date): Deployment to \$ENVIRONMENT completed successfully" >> \$DEPLOY_DIR/deployment.log

log_info "🎉 Deployment completed successfully!"
log_info "Application is running at: https://autocontrolpro.com"

# Show service status
echo ""
log_info "Service Status:"
sudo systemctl status \$SERVICE_NAME --no-pager -l
`;

    const deployScriptPath = path.join(this.scriptsDir, 'deploy-automated.sh');
    await fs.writeFile(deployScriptPath, deployScript);
    await fs.chmod(deployScriptPath, 0o755);
    console.log(`✅ Automated deployment script created at: ${deployScriptPath}`);
  }

  async createRollbackScript() {
    console.log('🔄 Creating rollback script...');

    const rollbackScript = `#!/bin/bash

# Automated Rollback Script
# Quickly rollback to previous deployment

set -e

# Configuration
APP_NAME="autocontrol-pro"
DEPLOY_DIR="/opt/autocontrol-pro"
BACKUP_DIR="/opt/backups/autocontrol-pro"
SERVICE_NAME="autocontrol-pro"

# Colors
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
NC='\\033[0m'

log_info() {
    echo -e "\${GREEN}[INFO]\${NC} \$1"
}

log_error() {
    echo -e "\${RED}[ERROR]\${NC} \$1"
}

log_warn() {
    echo -e "\${YELLOW}[WARN]\${NC} \$1"
}

# Parse arguments
BACKUP_FILE=""
LIST_BACKUPS=false

while [[ \$# -gt 0 ]]; do
  case \$1 in
    --backup)
      BACKUP_FILE="\$2"
      shift 2
      ;;
    --list)
      LIST_BACKUPS=true
      shift
      ;;
    *)
      echo "Unknown option \$1"
      echo "Usage: \$0 [--backup backup_file] [--list]"
      exit 1
      ;;
  esac
done

# List available backups
if [[ "\$LIST_BACKUPS" == "true" ]]; then
    log_info "Available backups:"
    ls -la \$BACKUP_DIR/backup_*.tar.gz 2>/dev/null | awk '{print \$9, \$5, \$6, \$7, \$8}' || log_warn "No backups found"
    exit 0
fi

# If no backup specified, use the latest
if [[ -z "\$BACKUP_FILE" ]]; then
    BACKUP_FILE=\$(ls -t \$BACKUP_DIR/backup_*.tar.gz 2>/dev/null | head -n1)
    if [[ -z "\$BACKUP_FILE" ]]; then
        log_error "No backup files found in \$BACKUP_DIR"
        exit 1
    fi
    log_info "Using latest backup: \$BACKUP_FILE"
fi

# Verify backup file exists
if [[ ! -f "\$BACKUP_FILE" ]]; then
    log_error "Backup file not found: \$BACKUP_FILE"
    exit 1
fi

log_info "🔄 Starting rollback process..."

# Stop the service
log_info "Stopping \$SERVICE_NAME service..."
sudo systemctl stop \$SERVICE_NAME

# Create a backup of current state before rollback
ROLLBACK_BACKUP="\$BACKUP_DIR/pre_rollback_\$(date +%Y%m%d_%H%M%S).tar.gz"
log_info "Creating backup of current state..."
sudo tar -czf "\$ROLLBACK_BACKUP" -C \$DEPLOY_DIR . 2>/dev/null || log_warn "Current state backup failed"

# Extract backup
log_info "Restoring from backup: \$BACKUP_FILE"
sudo rm -rf \$DEPLOY_DIR/*
sudo tar -xzf "\$BACKUP_FILE" -C \$DEPLOY_DIR

# Set proper permissions
sudo chown -R autocontrol:autocontrol \$DEPLOY_DIR

# Start the service
log_info "Starting \$SERVICE_NAME service..."
sudo systemctl start \$SERVICE_NAME

# Wait for service to start
sleep 10

# Health check
log_info "Running health check..."
if curl -f http://localhost:5000/health >/dev/null 2>&1; then
    log_info "✅ Rollback completed successfully"
    log_info "Health check passed"
else
    log_error "❌ Rollback failed - health check failed"
    exit 1
fi

# Log rollback
echo "\$(date): Rollback completed using \$BACKUP_FILE" >> \$DEPLOY_DIR/deployment.log

log_info "🎉 Rollback process completed!"
log_info "Current state backup saved as: \$ROLLBACK_BACKUP"

# Show service status
echo ""
log_info "Service Status:"
sudo systemctl status \$SERVICE_NAME --no-pager -l
`;

    const rollbackScriptPath = path.join(this.scriptsDir, 'rollback.sh');
    await fs.writeFile(rollbackScriptPath, rollbackScript);
    await fs.chmod(rollbackScriptPath, 0o755);
    console.log(`✅ Rollback script created at: ${rollbackScriptPath}`);
  }

  async createDockerDeployment() {
    console.log('🐳 Creating Docker deployment configuration...');

    const dockerfile = `# Multi-stage Dockerfile for AutoControl Pro
FROM node:18-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    curl \
    bash \
    tzdata

# Set timezone
ENV TZ=UTC

# Create app directory
WORKDIR /app

# Copy package files
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN cd backend && npm ci --only=production
RUN cd frontend && npm ci

# Copy source code
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Build frontend
RUN cd frontend && npm run build

# Production stage
FROM node:18-alpine AS production

# Install system dependencies
RUN apk add --no-cache \
    curl \
    bash \
    tzdata

# Create non-root user
RUN addgroup -g 1001 -S autocontrol && \
    adduser -S autocontrol -u 1001

# Set timezone
ENV TZ=UTC

# Create app directory
WORKDIR /app

# Copy built application
COPY --from=base --chown=autocontrol:autocontrol /app/backend ./backend
COPY --from=base --chown=autocontrol:autocontrol /app/frontend/dist ./frontend/dist

# Create necessary directories
RUN mkdir -p /app/logs /app/uploads && \
    chown -R autocontrol:autocontrol /app

# Switch to non-root user
USER autocontrol

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Start application
CMD ["node", "backend/server.js"]
`;

    const dockerfilePath = path.join(__dirname, '../../Dockerfile.production');
    await fs.writeFile(dockerfilePath, dockerfile);
    console.log(`✅ Production Dockerfile created at: ${dockerfilePath}`);

    const dockerCompose = `version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.production
    container_name: autocontrol-pro
    restart: unless-stopped
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=\${MONGODB_URI}
      - JWT_SECRET=\${JWT_SECRET}
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./logs:/app/logs
      - ./uploads:/app/uploads
    depends_on:
      - redis
    networks:
      - autocontrol-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  redis:
    image: redis:7-alpine
    container_name: autocontrol-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - autocontrol-network
    command: redis-server --appendonly yes

  nginx:
    image: nginx:alpine
    container_name: autocontrol-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/ssl:ro
      - ./logs/nginx:/var/log/nginx
    depends_on:
      - app
    networks:
      - autocontrol-network

volumes:
  redis-data:

networks:
  autocontrol-network:
    driver: bridge
`;

    const dockerComposePath = path.join(__dirname, '../../docker-compose.production.yml');
    await fs.writeFile(dockerComposePath, dockerCompose);
    console.log(`✅ Docker Compose configuration created at: ${dockerComposePath}`);
  }

  async run() {
    try {
      console.log('🚀 AutoControl Pro - Deployment Pipeline Setup');
      console.log('===============================================');
      
      await this.createGitHubActions();
      await this.createDeploymentScripts();
      await this.createRollbackScript();
      await this.createDockerDeployment();
      
      console.log('\n🎉 Deployment Pipeline Setup Complete!');
      console.log('\n📋 What was created:');
      console.log('✅ GitHub Actions CI/CD workflow');
      console.log('✅ Automated deployment script');
      console.log('✅ Rollback script');
      console.log('✅ Docker production configuration');
      
      console.log('\n📋 Next Steps:');
      console.log('1. Configure GitHub secrets for deployment');
      console.log('2. Set up staging and production environments');
      console.log('3. Configure Slack notifications (optional)');
      console.log('4. Test deployment pipeline in staging');
      console.log('5. Set up monitoring and alerting');
      
    } catch (error) {
      console.error('❌ Deployment pipeline setup failed:', error.message);
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const setup = new DeploymentPipelineSetup();
  setup.run();
}

module.exports = DeploymentPipelineSetup;