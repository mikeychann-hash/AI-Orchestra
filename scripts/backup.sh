#!/bin/bash

# ============================================
# AI Orchestra - Backup Script
# Backs up database, logs, and artifacts
# ============================================

set -e

# Configuration
BACKUP_DIR="./volumes/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="ai-orchestra-backup-${TIMESTAMP}"
RETENTION_DAYS=30

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   AI Orchestra Backup                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Create backup directory
mkdir -p "${BACKUP_DIR}/${BACKUP_NAME}"

# Backup database
echo -e "${BLUE}Backing up database...${NC}"
if [ -f "./volumes/database/memory.sqlite" ]; then
    cp -r ./volumes/database "${BACKUP_DIR}/${BACKUP_NAME}/"
    echo -e "${GREEN}✓ Database backed up${NC}"
else
    echo -e "${YELLOW}! Database not found, skipping${NC}"
fi

# Backup PostgreSQL (if using)
if docker ps | grep -q ai-orchestra-postgres; then
    echo -e "${BLUE}Backing up PostgreSQL...${NC}"
    docker exec ai-orchestra-postgres pg_dump -U postgres ai_orchestra > "${BACKUP_DIR}/${BACKUP_NAME}/postgres_dump.sql"
    echo -e "${GREEN}✓ PostgreSQL backed up${NC}"
fi

# Backup logs
echo -e "${BLUE}Backing up logs...${NC}"
if [ -d "./volumes/logs" ]; then
    cp -r ./volumes/logs "${BACKUP_DIR}/${BACKUP_NAME}/"
    echo -e "${GREEN}✓ Logs backed up${NC}"
fi

# Backup artifacts
echo -e "${BLUE}Backing up artifacts...${NC}"
if [ -d "./volumes/artifacts" ]; then
    cp -r ./volumes/artifacts "${BACKUP_DIR}/${BACKUP_NAME}/"
    echo -e "${GREEN}✓ Artifacts backed up${NC}"
fi

# Backup configuration
echo -e "${BLUE}Backing up configuration...${NC}"
cp -r ./config "${BACKUP_DIR}/${BACKUP_NAME}/"
cp .env "${BACKUP_DIR}/${BACKUP_NAME}/.env" 2>/dev/null || echo "No .env file found"
echo -e "${GREEN}✓ Configuration backed up${NC}"

# Create archive
echo -e "${BLUE}Creating archive...${NC}"
cd "${BACKUP_DIR}"
tar -czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}"
rm -rf "${BACKUP_NAME}"
cd - > /dev/null

# Create latest symlink
ln -sf "${BACKUP_NAME}.tar.gz" "${BACKUP_DIR}/latest.tar.gz"

echo -e "${GREEN}✓ Archive created: ${BACKUP_NAME}.tar.gz${NC}"

# Calculate size
BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" | cut -f1)
echo -e "${BLUE}Backup size: ${BACKUP_SIZE}${NC}"

# Clean old backups
echo -e "${BLUE}Cleaning old backups (older than ${RETENTION_DAYS} days)...${NC}"
find "${BACKUP_DIR}" -name "ai-orchestra-backup-*.tar.gz" -type f -mtime +${RETENTION_DAYS} -delete
echo -e "${GREEN}✓ Old backups cleaned${NC}"

# List backups
echo ""
echo -e "${BLUE}Available backups:${NC}"
ls -lh "${BACKUP_DIR}"/ai-orchestra-backup-*.tar.gz 2>/dev/null | tail -5 || echo "No backups found"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Backup Complete!                      ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Backup location: ${YELLOW}${BACKUP_DIR}/${BACKUP_NAME}.tar.gz${NC}"
echo ""

# Upload to S3 (if AWS CLI is configured)
if command -v aws &> /dev/null && [ -n "$AWS_BUCKET" ]; then
    echo -e "${BLUE}Uploading to S3...${NC}"
    aws s3 cp "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" "s3://${AWS_BUCKET}/backups/${BACKUP_NAME}.tar.gz"
    echo -e "${GREEN}✓ Backup uploaded to S3${NC}"
fi

exit 0
