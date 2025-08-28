#!/bin/bash

# SSL/TLS setup script for Autocontrol Sanitario Pro
# This script helps set up SSL certificates using Let's Encrypt

echo "🔒 Setting up SSL/TLS for Autocontrol Sanitario Pro..."

# Check if domain is provided
if [ -z "$1" ]; then
    echo "❌ Error: Domain name is required"
    echo "Usage: $0 <domain> [additional-domains...]"
    echo "Example: $0 autocontrolpro.com www.autocontrolpro.com api.autocontrolpro.com"
    exit 1
fi

DOMAIN=$1
ADDITIONAL_DOMAINS=""

# Collect additional domains
shift
for domain in "$@"; do
    ADDITIONAL_DOMAINS="$ADDITIONAL_DOMAINS -d $domain"
done

echo "Primary domain: $DOMAIN"
echo "Additional domains: $ADDITIONAL_DOMAINS"

# Check if Certbot is installed
if ! command -v certbot &> /dev/null; then
    echo "Installing Certbot..."
    
    # Detect OS and install accordingly
    if [ -f /etc/debian_version ]; then
        # Debian/Ubuntu
        sudo apt update
        sudo apt install -y certbot python3-certbot-nginx
    elif [ -f /etc/redhat-release ]; then
        # CentOS/RHEL/Fedora
        sudo yum install -y certbot python3-certbot-nginx
    else
        echo "❌ Unsupported operating system. Please install Certbot manually."
        exit 1
    fi
fi

# Check if Nginx is installed and running
if ! command -v nginx &> /dev/null; then
    echo "❌ Nginx is not installed. Please install Nginx first."
    exit 1
fi

if ! systemctl is-active --quiet nginx; then
    echo "Starting Nginx..."
    sudo systemctl start nginx
fi

# Create basic Nginx configuration if it doesn't exist
NGINX_CONFIG="/etc/nginx/sites-available/$DOMAIN"
if [ ! -f "$NGINX_CONFIG" ]; then
    echo "Creating basic Nginx configuration..."
    
    sudo tee "$NGINX_CONFIG" > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN${ADDITIONAL_DOMAINS// -d / };
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}
EOF
    
    # Enable the site
    sudo ln -sf "$NGINX_CONFIG" "/etc/nginx/sites-enabled/$DOMAIN"
    
    # Test Nginx configuration
    sudo nginx -t
    if [ $? -ne 0 ]; then
        echo "❌ Nginx configuration test failed"
        exit 1
    fi
    
    # Reload Nginx
    sudo systemctl reload nginx
fi

# Create web root directory
sudo mkdir -p /var/www/html
sudo chown -R www-data:www-data /var/www/html

# Obtain SSL certificate
echo "Obtaining SSL certificate from Let's Encrypt..."
sudo certbot certonly \
    --webroot \
    --webroot-path=/var/www/html \
    --email admin@$DOMAIN \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN \
    $ADDITIONAL_DOMAINS

if [ $? -eq 0 ]; then
    echo "✅ SSL certificate obtained successfully!"
    
    # Update Nginx configuration with SSL
    echo "Updating Nginx configuration with SSL..."
    
    sudo tee "$NGINX_CONFIG" > /dev/null <<EOF
# HTTP redirect to HTTPS
server {
    listen 80;
    server_name $DOMAIN${ADDITIONAL_DOMAINS// -d / };
    return 301 https://\$server_name\$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name $DOMAIN${ADDITIONAL_DOMAINS// -d / };

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # SSL security settings
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    
    # Modern configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;
    
    # Security headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # OCSP stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/letsencrypt/live/$DOMAIN/chain.pem;
    
    # Application proxy
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Health check
    location /health {
        proxy_pass http://localhost:5000/health;
        access_log off;
    }
}
EOF
    
    # Test and reload Nginx
    sudo nginx -t
    if [ $? -eq 0 ]; then
        sudo systemctl reload nginx
        echo "✅ Nginx configuration updated successfully!"
    else
        echo "❌ Nginx configuration test failed"
        exit 1
    fi
    
    # Set up automatic renewal
    echo "Setting up automatic certificate renewal..."
    
    # Create renewal script
    sudo tee /etc/cron.d/certbot-renew > /dev/null <<EOF
# Renew Let's Encrypt certificates twice daily
0 */12 * * * root certbot renew --quiet --post-hook "systemctl reload nginx"
EOF
    
    echo "✅ Automatic renewal configured!"
    
    # Test SSL configuration
    echo "Testing SSL configuration..."
    sleep 5
    
    if curl -s -I "https://$DOMAIN" | grep -q "HTTP/2 200"; then
        echo "✅ SSL is working correctly!"
    else
        echo "⚠️ SSL test failed. Please check the configuration manually."
    fi
    
    echo ""
    echo "🎉 SSL setup completed successfully!"
    echo ""
    echo "📋 Certificate information:"
    sudo certbot certificates
    
    echo ""
    echo "🔧 Useful commands:"
    echo "  - Test renewal: sudo certbot renew --dry-run"
    echo "  - View certificates: sudo certbot certificates"
    echo "  - Revoke certificate: sudo certbot revoke --cert-path /etc/letsencrypt/live/$DOMAIN/cert.pem"
    echo "  - Check SSL rating: https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"
    
else
    echo "❌ Failed to obtain SSL certificate"
    echo "Please check:"
    echo "  - Domain DNS is pointing to this server"
    echo "  - Port 80 is accessible from the internet"
    echo "  - No other web server is running on port 80"
    exit 1
fi