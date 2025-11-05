#!/bin/bash

# ============================================
# AI Orchestra - SSL/TLS Setup Script
# Uses Let's Encrypt with Certbot
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   AI Orchestra SSL/TLS Setup          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}✗ This script must be run as root${NC}"
   exit 1
fi

# Check for required variables
if [ -z "$DOMAIN" ]; then
    echo -e "${YELLOW}Enter your domain name:${NC}"
    read -r DOMAIN
fi

if [ -z "$EMAIL" ]; then
    echo -e "${YELLOW}Enter your email for Let's Encrypt:${NC}"
    read -r EMAIL
fi

echo -e "${GREEN}✓ Domain: $DOMAIN${NC}"
echo -e "${GREEN}✓ Email: $EMAIL${NC}"
echo ""

# Install certbot if not present
if ! command -v certbot &> /dev/null; then
    echo -e "${BLUE}Installing Certbot...${NC}"

    if command -v apt-get &> /dev/null; then
        apt-get update
        apt-get install -y certbot
    elif command -v yum &> /dev/null; then
        yum install -y certbot
    else
        echo -e "${RED}✗ Could not install certbot. Please install manually.${NC}"
        exit 1
    fi

    echo -e "${GREEN}✓ Certbot installed${NC}"
fi

# Create directories
mkdir -p nginx/ssl
mkdir -p /var/www/certbot

# Option 1: Standalone mode (requires port 80 to be free)
echo -e "${BLUE}Obtaining SSL certificate...${NC}"
echo -e "${YELLOW}Note: Nginx must be stopped or use webroot mode${NC}"
echo ""

read -p "Use standalone mode? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Stop nginx if running
    docker-compose -f docker-compose.prod.yml down nginx 2>/dev/null || true

    # Obtain certificate
    certbot certonly --standalone \
        --non-interactive \
        --agree-tos \
        --email "$EMAIL" \
        -d "$DOMAIN" \
        -d "www.$DOMAIN"

    # Copy certificates
    cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem nginx/ssl/
    cp /etc/letsencrypt/live/$DOMAIN/privkey.pem nginx/ssl/
    cp /etc/letsencrypt/live/$DOMAIN/chain.pem nginx/ssl/
else
    # Webroot mode
    echo -e "${BLUE}Using webroot mode...${NC}"

    certbot certonly --webroot \
        -w /var/www/certbot \
        --non-interactive \
        --agree-tos \
        --email "$EMAIL" \
        -d "$DOMAIN" \
        -d "www.$DOMAIN"

    # Copy certificates
    cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem nginx/ssl/
    cp /etc/letsencrypt/live/$DOMAIN/privkey.pem nginx/ssl/
    cp /etc/letsencrypt/live/$DOMAIN/chain.pem nginx/ssl/
fi

# Set permissions
chmod 600 nginx/ssl/privkey.pem
chmod 644 nginx/ssl/fullchain.pem nginx/ssl/chain.pem

echo -e "${GREEN}✓ SSL certificates installed${NC}"
echo ""

# Setup auto-renewal
echo -e "${BLUE}Setting up auto-renewal...${NC}"

# Create renewal script
cat > /usr/local/bin/renew-ai-orchestra-ssl.sh << 'RENEWAL_SCRIPT'
#!/bin/bash
set -e

DOMAIN="__DOMAIN__"
PROJECT_DIR="__PROJECT_DIR__"

# Renew certificate
certbot renew --quiet

# Copy renewed certificates
cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $PROJECT_DIR/nginx/ssl/
cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $PROJECT_DIR/nginx/ssl/
cp /etc/letsencrypt/live/$DOMAIN/chain.pem $PROJECT_DIR/nginx/ssl/

# Set permissions
chmod 600 $PROJECT_DIR/nginx/ssl/privkey.pem
chmod 644 $PROJECT_DIR/nginx/ssl/fullchain.pem $PROJECT_DIR/nginx/ssl/chain.pem

# Reload nginx
cd $PROJECT_DIR
docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload

echo "SSL certificates renewed and nginx reloaded"
RENEWAL_SCRIPT

# Replace placeholders
sed -i "s|__DOMAIN__|$DOMAIN|g" /usr/local/bin/renew-ai-orchestra-ssl.sh
sed -i "s|__PROJECT_DIR__|$(pwd)|g" /usr/local/bin/renew-ai-orchestra-ssl.sh

chmod +x /usr/local/bin/renew-ai-orchestra-ssl.sh

# Add to crontab
(crontab -l 2>/dev/null; echo "0 3 * * * /usr/local/bin/renew-ai-orchestra-ssl.sh >> /var/log/ssl-renewal.log 2>&1") | crontab -

echo -e "${GREEN}✓ Auto-renewal configured (runs daily at 3 AM)${NC}"
echo ""

# Update nginx config with domain
echo -e "${BLUE}Updating Nginx configuration...${NC}"
sed -i "s/server_name _;/server_name $DOMAIN www.$DOMAIN;/g" nginx/conf.d/ai-orchestra.conf

echo -e "${GREEN}✓ Configuration updated${NC}"
echo ""

# Test nginx config
echo -e "${BLUE}Testing Nginx configuration...${NC}"
docker-compose -f docker-compose.prod.yml run --rm nginx nginx -t

echo -e "${GREEN}✓ Nginx configuration is valid${NC}"
echo ""

echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  SSL/TLS Setup Complete!               ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "1. Start services: ${YELLOW}docker-compose -f docker-compose.prod.yml up -d${NC}"
echo -e "2. Check status: ${YELLOW}docker-compose -f docker-compose.prod.yml ps${NC}"
echo -e "3. View logs: ${YELLOW}docker-compose -f docker-compose.prod.yml logs -f${NC}"
echo ""
echo -e "${BLUE}Your site will be available at: ${GREEN}https://$DOMAIN${NC}"
echo ""
