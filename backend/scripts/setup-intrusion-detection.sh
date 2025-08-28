#!/bin/bash
# Intrusion Detection System Setup Script

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

# Install Fail2ban
install_fail2ban() {
    log "Installing Fail2ban..."
    
    apt-get update
    apt-get install -y fail2ban
    
    log "Fail2ban installed successfully"
}

# Configure Fail2ban
configure_fail2ban() {
    log "Configuring Fail2ban..."
    
    # Create local configuration file
    cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
# Ban time in seconds (1 hour)
bantime = 3600

# Find time window (10 minutes)
findtime = 600

# Number of failures before ban
maxretry = 5

# Email notifications
destemail = admin@autocontrol.com
sender = fail2ban@autocontrol.com
mta = sendmail
action = %(action_mwl)s

# Ignore local IPs
ignoreip = 127.0.0.1/8 ::1 10.0.0.0/8 172.16.0.0/12 192.168.0.0/16

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 7200

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 3

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10

[nginx-botsearch]
enabled = true
filter = nginx-botsearch
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2

[autocontrol-auth]
enabled = true
filter = autocontrol-auth
port = http,https
logpath = /var/log/autocontrol/app.log
maxretry = 5
findtime = 300
bantime = 1800
EOF

    log "Fail2ban configuration created"
}

# Create custom filters
create_custom_filters() {
    log "Creating custom Fail2ban filters..."
    
    # AutoControl authentication filter
    cat > /etc/fail2ban/filter.d/autocontrol-auth.conf << EOF
[Definition]
failregex = ^.*"level":"error".*"message":"Authentication failed".*"ip":"<HOST>".*$
            ^.*"level":"warn".*"message":"Too many login attempts".*"ip":"<HOST>".*$
            ^.*"level":"error".*"message":"Invalid token".*"ip":"<HOST>".*$

ignoreregex =
EOF

    # Nginx bot search filter
    cat > /etc/fail2ban/filter.d/nginx-botsearch.conf << EOF
[Definition]
failregex = ^<HOST> -.*"(GET|POST).*/(admin|wp-admin|phpmyadmin|xmlrpc\.php|wp-login\.php).*" (404|403) .*$
            ^<HOST> -.*"(GET|POST).*/\.env.*" (404|403) .*$
            ^<HOST> -.*"(GET|POST).*\.(php|asp|aspx|jsp).*" (404|403) .*$

ignoreregex =
EOF

    log "Custom filters created"
}

# Configure log monitoring
configure_log_monitoring() {
    log "Configuring log monitoring..."
    
    # Ensure log directories exist
    mkdir -p /var/log/autocontrol
    mkdir -p /var/log/nginx
    
    # Set proper permissions
    chown -R autocontrol:autocontrol /var/log/autocontrol
    chmod 755 /var/log/autocontrol
    
    # Configure logrotate for application logs
    cat > /etc/logrotate.d/autocontrol << EOF
/var/log/autocontrol/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 autocontrol autocontrol
    postrotate
        systemctl reload fail2ban
    endscript
}
EOF

    log "Log monitoring configured"
}

# Setup email notifications
setup_email_notifications() {
    log "Setting up email notifications..."
    
    # Install mail utilities
    apt-get install -y mailutils
    
    # Create notification script
    cat > /usr/local/bin/fail2ban-notify << 'EOF'
#!/bin/bash
# Fail2ban notification script

JAIL="$1"
ACTION="$2"
IP="$3"
TIMESTAMP=$(date)

case "$ACTION" in
    ban)
        SUBJECT="🚨 SECURITY ALERT: IP $IP banned by Fail2ban"
        MESSAGE="Security Alert from AutoControl Pro

IP Address: $IP
Action: BANNED
Jail: $JAIL
Timestamp: $TIMESTAMP
Server: $(hostname)

This IP has been automatically banned due to suspicious activity.

Please investigate if this was a legitimate user or a security threat.

AutoControl Pro Security System"
        ;;
    unban)
        SUBJECT="🔓 SECURITY INFO: IP $IP unbanned by Fail2ban"
        MESSAGE="Security Information from AutoControl Pro

IP Address: $IP
Action: UNBANNED
Jail: $JAIL
Timestamp: $TIMESTAMP
Server: $(hostname)

This IP has been automatically unbanned.

AutoControl Pro Security System"
        ;;
esac

echo "$MESSAGE" | mail -s "$SUBJECT" admin@autocontrol.com
EOF

    chmod +x /usr/local/bin/fail2ban-notify
    
    log "Email notifications configured"
}

# Start and enable services
start_services() {
    log "Starting and enabling services..."
    
    # Enable and start Fail2ban
    systemctl enable fail2ban
    systemctl start fail2ban
    
    # Check status
    if systemctl is-active --quiet fail2ban; then
        log "Fail2ban is running successfully"
    else
        error "Failed to start Fail2ban"
    fi
}

# Create management script
create_management_script() {
    log "Creating intrusion detection management script..."
    
    cat > /usr/local/bin/autocontrol-ids << 'EOF'
#!/bin/bash
# AutoControl Intrusion Detection System Management

case "${1:-status}" in
    status)
        echo "=== Fail2ban Status ==="
        fail2ban-client status
        echo
        echo "=== Active Jails ==="
        fail2ban-client status | grep "Jail list:" | sed 's/.*Jail list://' | tr ',' '\n' | while read jail; do
            if [ -n "$jail" ]; then
                jail=$(echo $jail | xargs)
                echo "--- $jail ---"
                fail2ban-client status "$jail"
                echo
            fi
        done
        ;;
    ban)
        if [ -z "$2" ] || [ -z "$3" ]; then
            echo "Usage: $0 ban <jail> <ip>"
            exit 1
        fi
        fail2ban-client set "$2" banip "$3"
        echo "IP $3 banned in jail $2"
        ;;
    unban)
        if [ -z "$2" ] || [ -z "$3" ]; then
            echo "Usage: $0 unban <jail> <ip>"
            exit 1
        fi
        fail2ban-client set "$2" unbanip "$3"
        echo "IP $3 unbanned from jail $2"
        ;;
    reload)
        fail2ban-client reload
        echo "Fail2ban configuration reloaded"
        ;;
    logs)
        tail -f /var/log/fail2ban.log
        ;;
    banned)
        echo "=== Currently Banned IPs ==="
        fail2ban-client status | grep "Jail list:" | sed 's/.*Jail list://' | tr ',' '\n' | while read jail; do
            if [ -n "$jail" ]; then
                jail=$(echo $jail | xargs)
                banned=$(fail2ban-client status "$jail" | grep "Banned IP list:" | sed 's/.*Banned IP list://')
                if [ -n "$banned" ] && [ "$banned" != "" ]; then
                    echo "$jail: $banned"
                fi
            fi
        done
        ;;
    *)
        echo "AutoControl Intrusion Detection System Management"
        echo "Usage: $0 {status|ban|unban|reload|logs|banned}"
        echo
        echo "Commands:"
        echo "  status              - Show IDS status"
        echo "  ban <jail> <ip>     - Manually ban IP"
        echo "  unban <jail> <ip>   - Manually unban IP"
        echo "  reload              - Reload configuration"
        echo "  logs                - Show IDS logs"
        echo "  banned              - Show banned IPs"
        ;;
esac
EOF
    
    chmod +x /usr/local/bin/autocontrol-ids
    log "IDS management script created at /usr/local/bin/autocontrol-ids"
}

# Show status
show_status() {
    log "Current intrusion detection status:"
    fail2ban-client status
}

# Main execution
main() {
    log "Starting intrusion detection system setup..."
    
    check_root
    install_fail2ban
    configure_fail2ban
    create_custom_filters
    configure_log_monitoring
    setup_email_notifications
    start_services
    create_management_script
    show_status
    
    log "🎉 Intrusion detection system setup completed successfully!"
    log "Use 'autocontrol-ids status' to check the system status"
}

# Run main function
main "$@"