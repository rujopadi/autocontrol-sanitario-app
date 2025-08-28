#!/bin/bash
# Firewall Configuration Script for Production Security

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        error "This script must be run as root"
    fi
}

# Install UFW if not present
install_ufw() {
    log "Installing UFW firewall..."
    
    if ! command -v ufw &> /dev/null; then
        apt-get update
        apt-get install -y ufw
        log "UFW installed successfully"
    else
        log "UFW already installed"
    fi
}

# Configure basic firewall rules
configure_basic_rules() {
    log "Configuring basic firewall rules..."
    
    # Reset UFW to defaults
    ufw --force reset
    
    # Set default policies
    ufw default deny incoming
    ufw default allow outgoing
    
    # Allow SSH (be careful not to lock yourself out)
    ufw allow 22/tcp comment 'SSH'
    
    # Allow HTTP and HTTPS
    ufw allow 80/tcp comment 'HTTP'
    ufw allow 443/tcp comment 'HTTPS'
    
    # Allow application port
    ufw allow 3000/tcp comment 'AutoControl App'
    
    # Allow monitoring ports (restrict to specific IPs in production)
    ufw allow from 10.0.0.0/8 to any port 9090 comment 'Prometheus'
    ufw allow from 10.0.0.0/8 to any port 3001 comment 'Grafana'
    
    log "Basic firewall rules configured"
}

# Configure advanced security rules
configure_advanced_rules() {
    log "Configuring advanced security rules..."
    
    # Rate limiting for SSH
    ufw limit ssh comment 'Rate limit SSH'
    
    # Block common attack ports
    ufw deny 23 comment 'Block Telnet'
    ufw deny 135 comment 'Block RPC'
    ufw deny 139 comment 'Block NetBIOS'
    ufw deny 445 comment 'Block SMB'
    
    # Allow ping but limit it
    ufw allow in on eth0 to any port 22 proto tcp
    
    log "Advanced security rules configured"
}

# Configure logging
configure_logging() {
    log "Configuring firewall logging..."
    
    # Enable logging
    ufw logging on
    
    # Configure log rotation
    cat > /etc/logrotate.d/ufw << EOF
/var/log/ufw.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    postrotate
        /usr/lib/rsyslog/rsyslog-rotate
    endscript
}
EOF
    
    log "Firewall logging configured"
}

# Enable firewall
enable_firewall() {
    log "Enabling UFW firewall..."
    
    # Enable UFW
    ufw --force enable
    
    # Enable UFW service
    systemctl enable ufw
    systemctl start ufw
    
    log "UFW firewall enabled and started"
}

# Show firewall status
show_status() {
    log "Current firewall status:"
    ufw status verbose
}

# Create firewall management script
create_management_script() {
    log "Creating firewall management script..."
    
    cat > /usr/local/bin/autocontrol-firewall << 'EOF'
#!/bin/bash
# AutoControl Firewall Management Script

case "${1:-status}" in
    status)
        ufw status verbose
        ;;
    allow)
        if [ -z "$2" ]; then
            echo "Usage: $0 allow <port/service>"
            exit 1
        fi
        ufw allow "$2"
        ;;
    deny)
        if [ -z "$2" ]; then
            echo "Usage: $0 deny <port/service>"
            exit 1
        fi
        ufw deny "$2"
        ;;
    reload)
        ufw reload
        ;;
    reset)
        echo "This will reset all firewall rules. Are you sure? (y/N)"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            ufw --force reset
            echo "Firewall rules reset. Remember to reconfigure!"
        fi
        ;;
    logs)
        tail -f /var/log/ufw.log
        ;;
    *)
        echo "AutoControl Firewall Management"
        echo "Usage: $0 {status|allow|deny|reload|reset|logs}"
        echo
        echo "Commands:"
        echo "  status          - Show firewall status"
        echo "  allow <port>    - Allow traffic on port"
        echo "  deny <port>     - Deny traffic on port"
        echo "  reload          - Reload firewall rules"
        echo "  reset           - Reset all rules (dangerous!)"
        echo "  logs            - Show firewall logs"
        ;;
esac
EOF
    
    chmod +x /usr/local/bin/autocontrol-firewall
    log "Firewall management script created at /usr/local/bin/autocontrol-firewall"
}

# Main execution
main() {
    log "Starting firewall configuration..."
    
    check_root
    install_ufw
    configure_basic_rules
    configure_advanced_rules
    configure_logging
    enable_firewall
    create_management_script
    show_status
    
    log "🎉 Firewall configuration completed successfully!"
    warn "Make sure you can still access the server via SSH before disconnecting!"
}

# Run main function
main "$@"