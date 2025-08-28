# Multi-stage build for production optimization
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Production stage
FROM node:18-alpine AS production

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S autocontrol -u 1001

# Install runtime dependencies
RUN apk add --no-cache \
    mongodb-tools \
    curl \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Copy node_modules from builder stage
COPY --from=builder --chown=autocontrol:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=autocontrol:nodejs . ./

# Create necessary directories
RUN mkdir -p logs backups uploads temp && \
    chown -R autocontrol:nodejs logs backups uploads temp

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Switch to non-root user
USER autocontrol

# Expose port
EXPOSE 5000

# Start application
CMD ["node", "server.js"]