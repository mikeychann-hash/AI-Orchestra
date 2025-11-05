#!/bin/bash

# ============================================
# AI Orchestra - Deployment Script
# Production deployment with zero-downtime
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   AI Orchestra Deployment              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check if running in project directory
if [ ! -f "docker-compose.prod.yml" ]; then
    echo -e "${RED}✗ Must run from project root directory${NC}"
    exit 1
fi

# Pre-deployment backup
echo -e "${BLUE}Creating pre-deployment backup...${NC}"
./scripts/backup.sh
echo -e "${GREEN}✓ Backup complete${NC}"
echo ""

# Pull latest code (if git repo)
if [ -d ".git" ]; then
    echo -e "${BLUE}Pulling latest code...${NC}"
    git pull origin main
    echo -e "${GREEN}✓ Code updated${NC}"
fi

# Pull latest images
echo -e "${BLUE}Pulling latest Docker images...${NC}"
docker-compose -f docker-compose.prod.yml pull
echo -e "${GREEN}✓ Images pulled${NC}"

# Build images
echo -e "${BLUE}Building Docker images...${NC}"
docker-compose -f docker-compose.prod.yml build --no-cache
echo -e "${GREEN}✓ Images built${NC}"

# Run database migrations (if any)
# Uncomment and customize as needed
# echo -e "${BLUE}Running database migrations...${NC}"
# docker-compose -f docker-compose.prod.yml run --rm ai-orchestra npm run migrate
# echo -e "${GREEN}✓ Migrations complete${NC}"

# Deploy with zero-downtime
echo -e "${BLUE}Deploying services...${NC}"

# Deploy backend and dashboard with rolling update
docker-compose -f docker-compose.prod.yml up -d --no-deps --build ai-orchestra dashboard

# Wait for health check
echo -e "${BLUE}Waiting for services to be healthy...${NC}"
sleep 10

MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend is healthy${NC}"
        break
    fi

    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo -e "${YELLOW}Waiting for backend... (${RETRY_COUNT}/${MAX_RETRIES})${NC}"
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}✗ Backend health check failed${NC}"
    echo -e "${YELLOW}Rolling back...${NC}"
    docker-compose -f docker-compose.prod.yml down
    ./scripts/restore.sh ./volumes/backups/latest.tar.gz
    exit 1
fi

# Restart nginx to pick up any config changes
echo -e "${BLUE}Reloading Nginx...${NC}"
docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload
echo -e "${GREEN}✓ Nginx reloaded${NC}"

# Clean up old images
echo -e "${BLUE}Cleaning up old images...${NC}"
docker image prune -f
echo -e "${GREEN}✓ Cleanup complete${NC}"

# Final health check
echo -e "${BLUE}Running final health checks...${NC}"

# Check backend
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend: OK${NC}"
else
    echo -e "${RED}✗ Backend: FAILED${NC}"
fi

# Check dashboard
if curl -f http://localhost:3001 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Dashboard: OK${NC}"
else
    echo -e "${RED}✗ Dashboard: FAILED${NC}"
fi

# Display service status
echo ""
echo -e "${BLUE}Service Status:${NC}"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Deployment Complete!                  ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "1. Monitor logs: ${YELLOW}docker-compose -f docker-compose.prod.yml logs -f${NC}"
echo -e "2. Check metrics: ${YELLOW}https://yourdomain.com/grafana${NC}"
echo -e "3. Test application: ${YELLOW}https://yourdomain.com${NC}"
echo ""
