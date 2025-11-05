#!/bin/bash

# ============================================
# AI Orchestra - Restore Script
# Restores from backup
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   AI Orchestra Restore                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check for backup file
if [ -z "$1" ]; then
    echo -e "${YELLOW}Available backups:${NC}"
    ls -lh ./volumes/backups/ai-orchestra-backup-*.tar.gz 2>/dev/null || echo "No backups found"
    echo ""
    echo -e "${RED}Usage: $0 <backup-file>${NC}"
    echo -e "${BLUE}Example: $0 ./volumes/backups/ai-orchestra-backup-20240101_120000.tar.gz${NC}"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}✗ Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

echo -e "${BLUE}Backup file: ${YELLOW}$BACKUP_FILE${NC}"
echo ""

# Warning
echo -e "${RED}WARNING: This will overwrite existing data!${NC}"
echo -e "${YELLOW}Press Enter to continue or Ctrl+C to cancel...${NC}"
read

# Stop services
echo -e "${BLUE}Stopping services...${NC}"
docker-compose -f docker-compose.prod.yml down
echo -e "${GREEN}✓ Services stopped${NC}"

# Extract backup
TEMP_DIR=$(mktemp -d)
echo -e "${BLUE}Extracting backup...${NC}"
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"
BACKUP_NAME=$(basename "$BACKUP_FILE" .tar.gz)
echo -e "${GREEN}✓ Backup extracted${NC}"

# Restore database
if [ -d "$TEMP_DIR/$BACKUP_NAME/database" ]; then
    echo -e "${BLUE}Restoring database...${NC}"
    rm -rf ./volumes/database/*
    cp -r "$TEMP_DIR/$BACKUP_NAME/database/"* ./volumes/database/
    echo -e "${GREEN}✓ Database restored${NC}"
fi

# Restore PostgreSQL
if [ -f "$TEMP_DIR/$BACKUP_NAME/postgres_dump.sql" ]; then
    echo -e "${BLUE}Restoring PostgreSQL...${NC}"
    docker-compose -f docker-compose.prod.yml up -d postgres
    sleep 5
    docker exec -i ai-orchestra-postgres psql -U postgres ai_orchestra < "$TEMP_DIR/$BACKUP_NAME/postgres_dump.sql"
    echo -e "${GREEN}✓ PostgreSQL restored${NC}"
fi

# Restore logs
if [ -d "$TEMP_DIR/$BACKUP_NAME/logs" ]; then
    echo -e "${BLUE}Restoring logs...${NC}"
    rm -rf ./volumes/logs/*
    cp -r "$TEMP_DIR/$BACKUP_NAME/logs/"* ./volumes/logs/
    echo -e "${GREEN}✓ Logs restored${NC}"
fi

# Restore artifacts
if [ -d "$TEMP_DIR/$BACKUP_NAME/artifacts" ]; then
    echo -e "${BLUE}Restoring artifacts...${NC}"
    rm -rf ./volumes/artifacts/*
    cp -r "$TEMP_DIR/$BACKUP_NAME/artifacts/"* ./volumes/artifacts/
    echo -e "${GREEN}✓ Artifacts restored${NC}"
fi

# Restore configuration (optional)
if [ -d "$TEMP_DIR/$BACKUP_NAME/config" ]; then
    echo -e "${YELLOW}Restore configuration? (y/n):${NC}"
    read -r REPLY
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cp -r "$TEMP_DIR/$BACKUP_NAME/config/"* ./config/
        [ -f "$TEMP_DIR/$BACKUP_NAME/.env" ] && cp "$TEMP_DIR/$BACKUP_NAME/.env" ./.env
        echo -e "${GREEN}✓ Configuration restored${NC}"
    fi
fi

# Cleanup
rm -rf "$TEMP_DIR"

# Start services
echo -e "${BLUE}Starting services...${NC}"
docker-compose -f docker-compose.prod.yml up -d
echo -e "${GREEN}✓ Services started${NC}"

# Health check
echo -e "${BLUE}Running health check...${NC}"
sleep 10
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Health check passed${NC}"
else
    echo -e "${YELLOW}! Health check failed, check logs${NC}"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Restore Complete!                     ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
