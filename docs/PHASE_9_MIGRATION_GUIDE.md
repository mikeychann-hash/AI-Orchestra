# Phase 9: Migration Guide

**Complete guide for migrating from Phase 8 to Phase 9 with Visual Orchestration.**

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Pre-Migration Checklist](#pre-migration-checklist)
4. [Migration Steps](#migration-steps)
5. [Database Migration](#database-migration)
6. [Feature Flag Configuration](#feature-flag-configuration)
7. [Verification](#verification)
8. [Rollback Procedure](#rollback-procedure)
9. [Common Migration Issues](#common-migration-issues)
10. [Post-Migration Tasks](#post-migration-tasks)

---

## Overview

### What's New in Phase 9?

Phase 9 introduces **Visual Orchestration**, transforming AI Orchestra from a CLI-based system into a visual workflow platform:

**New Capabilities:**
- Interactive 2D canvas for workflow visualization
- Git worktree management with automatic port allocation
- Drag-and-drop workflow automation
- GitHub issue/PR integration with context injection
- Real-time WebSocket updates
- Zone-based AI agent orchestration

**Breaking Changes:**
- None! Phase 9 is fully backward compatible
- Existing Phase 8 functionality remains unchanged
- Visual Canvas is opt-in via feature flag

### Migration Timeline

**Estimated Time:** 15-30 minutes

**Steps:**
1. Backup current system (5 min)
2. Update code (2 min)
3. Install dependencies (3 min)
4. Run database migration (2 min)
5. Configure environment (5 min)
6. Verify installation (5 min)
7. Enable feature flag (2 min)
8. Test functionality (10 min)

---

## Prerequisites

### System Requirements

**Minimum:**
- AI Orchestra Phase 8 installed and running
- Node.js 18+ and npm 9+
- Git 2.30+
- SQLite 3.35+
- 2 GB available disk space (for worktrees)

**Recommended:**
- 4 CPU cores
- 8 GB RAM
- 10 GB disk space
- Linux or macOS (Windows via WSL)

### Required Knowledge

**For Migration:**
- Basic command line usage
- Understanding of environment variables
- Familiarity with Git

**For Usage:**
- Basic Git workflows (branches, commits)
- Understanding of AI Orchestra agents

### Access Requirements

**Credentials:**
- GitHub token (optional, for issue integration)
  - Scopes: `repo`, `read:org`
  - Generate at: https://github.com/settings/tokens

**Permissions:**
- Write access to AI Orchestra installation directory
- Ability to restart services

---

## Pre-Migration Checklist

### 1. Backup Current System

**Database Backup:**
```bash
# Backup main database
cp data/database.db data/database.db.backup-$(date +%Y%m%d)

# Backup entire data directory
tar -czf data-backup-$(date +%Y%m%d).tar.gz data/
```

**Configuration Backup:**
```bash
# Backup environment file
cp .env .env.backup

# Backup settings
cp config/settings.json config/settings.json.backup
```

**Git Repository:**
```bash
# Ensure clean working directory
git status

# Commit any pending changes
git add .
git commit -m "Pre-Phase 9 migration checkpoint"

# Create backup branch
git branch pre-phase9-backup
```

---

### 2. Verify Current Installation

**Check Phase 8 Status:**
```bash
# Server should be running
curl http://localhost:3000/health
# Expected: {"status": "healthy", "phase": 8}

# Dashboard accessible
curl http://localhost:3001
# Expected: HTML response

# Check logs for errors
docker-compose logs --tail=50 app
```

**Verify Dependencies:**
```bash
# Node version
node --version
# Expected: v18.0.0 or higher

# npm version
npm --version
# Expected: 9.0.0 or higher

# Git version
git --version
# Expected: 2.30.0 or higher

# SQLite version
sqlite3 --version
# Expected: 3.35.0 or higher
```

---

### 3. Review Current Configuration

**Check Environment Variables:**
```bash
# Required variables present
cat .env | grep -E "OPENAI_API_KEY|GROK_API_KEY|GITHUB_TOKEN"

# Verify values (don't print sensitive keys)
echo "OPENAI configured: $([ -n "$OPENAI_API_KEY" ] && echo 'Yes' || echo 'No')"
echo "GITHUB configured: $([ -n "$GITHUB_TOKEN" ] && echo 'Yes' || echo 'No')"
```

**Disk Space:**
```bash
# Check available space (need 2-10 GB)
df -h .
```

---

### 4. Stop Running Services

```bash
# Stop via Docker Compose
docker-compose down

# Or stop server if running natively
# Ctrl+C in terminal running npm start
```

---

## Migration Steps

### Step 1: Update Codebase

**Option A: Pull from Git (Recommended)**
```bash
# Pull latest code
git fetch origin
git checkout main
git pull origin main

# Or specific Phase 9 branch
git checkout phase-9
```

**Option B: Clone Fresh**
```bash
# Backup current installation
mv AI-Orchestra AI-Orchestra-phase8-backup

# Clone new version
git clone https://github.com/your-org/AI-Orchestra.git
cd AI-Orchestra
git checkout phase-9

# Restore configuration
cp ../AI-Orchestra-phase8-backup/.env .
cp ../AI-Orchestra-phase8-backup/data/database.db data/
```

---

### Step 2: Install Dependencies

**Backend Dependencies:**
```bash
# Install/update Node packages
npm install

# Verify installation
npm list --depth=0
# Should show: better-sqlite3, ws, @octokit/rest, etc.
```

**Frontend Dependencies:**
```bash
# Navigate to dashboard
cd dashboard

# Install packages (includes reactflow)
npm install

# Verify ReactFlow installed
npm list reactflow
# Expected: reactflow@11.10.0

# Return to root
cd ..
```

**Verify No Vulnerabilities:**
```bash
npm audit
# Fix if needed
npm audit fix
```

---

### Step 3: Update Environment Variables

**Add Phase 9 Variables:**

Edit `.env` and add:

```bash
# Phase 9: Visual Orchestration

# Worktree Configuration
WORKTREE_BASE_PATH=.worktrees
WORKTREE_PORT_MIN=3001
WORKTREE_PORT_MAX=3999

# Visual Database
VISUAL_DB_PATH=./data/visual.db

# GitHub Context (optional but recommended)
GITHUB_TOKEN=ghp_your_token_here
GITHUB_CONTEXT_CACHE_TIMEOUT=300000  # 5 minutes

# Feature Flags
FEATURE_VISUAL_CANVAS=false  # Will enable after verification

# WebSocket (should already exist)
WEBSOCKET_ENABLED=true
WEBSOCKET_PORT=8080
```

**Verify Configuration:**
```bash
# Check syntax
node -e "require('dotenv').config(); console.log('✓ .env valid')"

# Verify new variables
grep -E "WORKTREE_|VISUAL_DB|FEATURE_VISUAL" .env
```

---

## Database Migration

### Automatic Migration (Recommended)

**Run Migration Script:**

```bash
# Execute migration
node scripts/migrate_to_phase9.js
```

**Expected Output:**
```
[Migration] ========================================
[Migration] Starting Phase 9 Migration
[Migration] ========================================
[Migration] Step 1: Creating backup...
[Migration] Database backup created { backupPath: './data/backups/visual-2025-11-14T12-00-00.db' }
[Migration] Step 2: Initializing database...
[Migration] Step 3: Creating default zones...
[Migration] Created default zone: Development { id: 'zone-development' }
[Migration] Created default zone: Testing { id: 'zone-testing' }
[Migration] Created default zone: Code Review { id: 'zone-review' }
[Migration] Created default zone: Deployment { id: 'zone-deployment' }
[Migration] Zone creation results: { created: 4, skipped: 0, total: 4 }
[Migration] Step 4: Verifying migration...
[Migration] ✓ worktrees table verified
[Migration] ✓ zones table verified
[Migration] ✓ assignments table verified
[Migration] ✓ executions table verified
[Migration] ========================================
[Migration] Migration completed successfully!
[Migration] ========================================
[Migration] Summary:
[Migration]   - Zones created: 4
[Migration]   - Zones skipped: 0
[Migration]   - Total zones: 4
[Migration]   - Backup saved: ./data/backups/visual-2025-11-14T12-00-00.db
[Migration] ========================================
```

**Migration Features:**
- Creates backup before migration
- Idempotent (safe to run multiple times)
- Creates 4 default zones
- Verifies schema after creation
- Automatic rollback on failure

---

### Manual Migration (Alternative)

**If automatic migration fails:**

```bash
# 1. Create backup manually
cp data/visual.db data/visual.db.backup

# 2. Run SQL schema
sqlite3 data/visual.db < core/database/visual_schema.sql

# 3. Verify tables created
sqlite3 data/visual.db "SELECT name FROM sqlite_master WHERE type='table';"
# Expected: worktrees, zones, worktree_zones, zone_executions

# 4. Create default zones (optional)
sqlite3 data/visual.db <<EOF
INSERT INTO zones (id, name, description, trigger, agents, prompt_template, position_x, position_y, size_width, size_height, created_at)
VALUES (
  'zone-development',
  'Development',
  'Active development work - implement features and write code',
  'onDrop',
  '["frontend","backend"]',
  'You are working on: {{ github.title }}\n\nIssue Description:\n{{ github.description }}\n\nPlease implement the feature described above.',
  50, 50, 350, 450,
  datetime('now')
);
EOF
```

---

### Verify Migration

**Check Database:**
```bash
# Verify tables exist
sqlite3 data/visual.db <<EOF
.tables
EOF
# Expected: worktrees  zones  worktree_zones  zone_executions

# Check default zones
sqlite3 data/visual.db "SELECT id, name FROM zones;"
# Expected: zone-development, zone-testing, zone-review, zone-deployment

# Check indexes
sqlite3 data/visual.db ".indexes"
# Expected: idx_worktrees_status, idx_zones_trigger, etc.
```

**Verify via Script:**
```bash
node scripts/migrate_to_phase9.js verify
```

---

## Feature Flag Configuration

### Understanding Feature Flags

Phase 9 uses feature flags for gradual rollout:

**Flags:**
- `FEATURE_VISUAL_CANVAS` - Enable/disable visual canvas UI
- Backend APIs are always available (for future mobile apps)

### Enable Phase 9 (Production)

**Step 1: Update .env**
```bash
# Change from false to true
FEATURE_VISUAL_CANVAS=true
```

**Step 2: Restart Services**
```bash
# Docker Compose
docker-compose restart

# Or native Node.js
npm start
```

**Step 3: Verify Flag Status**
```bash
# Check API
curl http://localhost:3000/api/features/visualCanvas
# Expected: {"enabled": true}
```

### Gradual Rollout Strategy

**Development/Staging:**
```bash
# Enable immediately for testing
FEATURE_VISUAL_CANVAS=true
```

**Production (Recommended Approach):**

**Week 1: Internal Testing**
```bash
# Enable for specific users via IP whitelist (future)
FEATURE_VISUAL_CANVAS=true
VISUAL_CANVAS_ALLOWED_IPS=192.168.1.100,192.168.1.101
```

**Week 2: Beta Users**
```bash
# Enable for beta testers
FEATURE_VISUAL_CANVAS=true
BETA_USERS=user1@example.com,user2@example.com
```

**Week 3+: Full Rollout**
```bash
# Enable for all users
FEATURE_VISUAL_CANVAS=true
```

---

## Verification

### Post-Migration Checks

**1. Health Check**
```bash
curl http://localhost:3000/health
```
Expected response:
```json
{
  "status": "healthy",
  "phase": 9,
  "features": {
    "visualCanvas": true
  }
}
```

---

**2. API Endpoints**
```bash
# List zones (should return default zones)
curl http://localhost:3000/api/zones

# Expected: Array with 4 zones
[
  {
    "id": "zone-development",
    "name": "Development",
    ...
  },
  ...
]

# List worktrees (should be empty)
curl http://localhost:3000/api/worktrees
# Expected: []
```

---

**3. Dashboard Access**
```bash
# Open in browser
open http://localhost:3001

# Or test with curl
curl -I http://localhost:3001
# Expected: HTTP/1.1 200 OK
```

**Visual Verification:**
- Navigate to "Canvas" or "Visual Orchestration" menu
- Should see empty canvas with toolbar
- Four default zones should appear
- No errors in browser console (F12)

---

**4. WebSocket Connection**
```bash
# Check WebSocket server
curl http://localhost:8080
# Expected: HTTP 400 (WebSocket endpoint, not HTTP)

# Or use wscat
npm install -g wscat
wscat -c ws://localhost:8080
# Should connect successfully
# Ctrl+C to disconnect
```

---

**5. Database Integrity**
```bash
# Run integrity check
sqlite3 data/visual.db "PRAGMA integrity_check;"
# Expected: ok

# Check foreign keys
sqlite3 data/visual.db "PRAGMA foreign_keys;"
# Expected: 1 (enabled)

# Count records
sqlite3 data/visual.db <<EOF
SELECT 'Zones:' as table_name, COUNT(*) as count FROM zones
UNION ALL
SELECT 'Worktrees:', COUNT(*) FROM worktrees
UNION ALL
SELECT 'Assignments:', COUNT(*) FROM worktree_zones
UNION ALL
SELECT 'Executions:', COUNT(*) FROM zone_executions;
EOF
# Expected:
# Zones: 4
# Worktrees: 0
# Assignments: 0
# Executions: 0
```

---

### Functional Testing

**Test 1: Create Worktree**

```bash
# Get CSRF token
CSRF_TOKEN=$(curl -s http://localhost:3000/api/csrf-token | jq -r .csrfToken)

# Create worktree
curl -X POST http://localhost:3000/api/worktrees \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -d '{
    "branchName": "test/migration",
    "position": { "x": 100, "y": 100 }
  }'
```

Expected response:
```json
{
  "id": "wt-1731603000-abc123",
  "branchName": "test/migration",
  "port": 3001,
  "status": "active",
  "path": ".worktrees/test-migration",
  "createdAt": "2025-11-14T12:00:00.000Z"
}
```

Verify:
```bash
# Check worktree created on filesystem
ls -la .worktrees/test-migration

# Check database
sqlite3 data/visual.db "SELECT id, branch_name, port FROM worktrees;"

# Check in dashboard
open http://localhost:3001/canvas
# Should see worktree card on canvas
```

---

**Test 2: Create Zone**

```bash
curl -X POST http://localhost:3000/api/zones \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -d '{
    "name": "Test Zone",
    "description": "Migration test zone",
    "trigger": "manual",
    "position": { "x": 500, "y": 200 },
    "size": { "width": 300, "height": 200 }
  }'
```

Expected: Zone created, appears on canvas

---

**Test 3: Assign Worktree to Zone**

```bash
# Get worktree and zone IDs from previous tests
WORKTREE_ID="wt-1731603000-abc123"
ZONE_ID="zone-development"

# Assign
curl -X POST "http://localhost:3000/api/zones/$ZONE_ID/assign/$WORKTREE_ID" \
  -H "X-CSRF-Token: $CSRF_TOKEN"
```

Expected:
- Assignment created
- If zone has `onDrop` trigger, agents execute
- WebSocket event emitted
- Dashboard updates in real-time

---

**Test 4: WebSocket Events**

```bash
# Use wscat to monitor events
wscat -c ws://localhost:8080
```

Then in another terminal:
```bash
# Create a worktree
curl -X POST http://localhost:3000/api/worktrees \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -d '{"branchName": "test/ws-event"}'
```

Expected in wscat terminal:
```json
{
  "type": "worktree:created",
  "data": {
    "id": "wt-...",
    "branchName": "test/ws-event",
    ...
  }
}
```

---

### Cleanup Test Data

```bash
# Delete test worktree
curl -X DELETE "http://localhost:3000/api/worktrees/$WORKTREE_ID" \
  -H "X-CSRF-Token: $CSRF_TOKEN"

# Verify deletion
ls .worktrees/  # Should not contain test worktree
sqlite3 data/visual.db "SELECT COUNT(*) FROM worktrees;"  # Should be 0
```

---

## Rollback Procedure

### When to Rollback

Consider rollback if:
- Migration fails with unrecoverable errors
- Critical bugs discovered in Phase 9
- Performance degradation
- Data corruption

### Automatic Rollback

**If migration script fails:**
```bash
# Automatic rollback is attempted
# Check logs for:
[Migration] Attempting rollback...
[Migration] Rollback successful
```

**Manual trigger:**
```bash
# Rollback to most recent backup
node scripts/migrate_to_phase9.js rollback
```

---

### Manual Rollback

**Step 1: Stop Services**
```bash
docker-compose down
# Or Ctrl+C for native Node.js
```

**Step 2: Restore Database**
```bash
# Find backup
ls -lt data/backups/
# Choose most recent

# Restore
cp data/backups/visual-2025-11-14T12-00-00.db data/visual.db

# Verify
sqlite3 data/visual.db "SELECT COUNT(*) FROM zones;"
```

**Step 3: Restore Code**
```bash
# If using Git
git checkout pre-phase9-backup

# Or restore from backup directory
rm -rf AI-Orchestra
mv AI-Orchestra-phase8-backup AI-Orchestra
cd AI-Orchestra
```

**Step 4: Restore Configuration**
```bash
cp .env.backup .env
cp config/settings.json.backup config/settings.json
```

**Step 5: Restart Services**
```bash
docker-compose up -d
# Or npm start
```

**Step 6: Verify Phase 8**
```bash
curl http://localhost:3000/health
# Expected: {"status": "healthy", "phase": 8}
```

---

### Partial Rollback (Keep Code, Disable Feature)

**If Phase 9 code is fine but want to disable visual canvas:**

```bash
# In .env
FEATURE_VISUAL_CANVAS=false

# Restart
docker-compose restart
```

**Benefits:**
- Keep Phase 9 APIs available
- Revert UI to Phase 8 dashboard
- Easy to re-enable later

---

## Common Migration Issues

### Issue 1: "npm install failed"

**Symptoms:**
```
npm ERR! peer dep missing: react@^18.0.0
```

**Cause:** Incompatible or missing dependencies

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json
rm -rf dashboard/node_modules dashboard/package-lock.json

# Reinstall
npm install
cd dashboard && npm install && cd ..
```

---

### Issue 2: "Database locked"

**Symptoms:**
```
Error: SQLITE_BUSY: database is locked
```

**Cause:** Another process is using the database

**Solution:**
```bash
# Find process using database
lsof data/visual.db

# Kill process (if safe)
kill -9 <PID>

# Or stop all services
docker-compose down
killall node

# Then retry migration
node scripts/migrate_to_phase9.js
```

---

### Issue 3: "Port 3001 already in use"

**Symptoms:**
```
Error: Port 3001 is already allocated
```

**Cause:** Port conflict with existing process

**Solution:**
```bash
# Find process using port
lsof -i :3001

# Option 1: Kill process
kill -9 <PID>

# Option 2: Change port range
# In .env
WORKTREE_PORT_MIN=4001
WORKTREE_PORT_MAX=4999
```

---

### Issue 4: "Git worktree add failed"

**Symptoms:**
```
Error: Command failed: git worktree add ...
fatal: '.worktrees/test' already exists
```

**Cause:** Leftover worktree directory

**Solution:**
```bash
# List git worktrees
git worktree list

# Remove orphaned worktree
git worktree remove .worktrees/test --force

# Or clean up manually
rm -rf .worktrees/test

# Retry operation
```

---

### Issue 5: "GitHub API rate limit exceeded"

**Symptoms:**
```
Error: API rate limit exceeded
```

**Cause:** Too many GitHub API requests without token

**Solution:**
```bash
# Add GitHub token to .env
GITHUB_TOKEN=ghp_your_token_here

# Restart server
docker-compose restart

# Verify token
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/user
```

---

### Issue 6: "WebSocket connection failed"

**Symptoms:**
- Browser console: `WebSocket connection to 'ws://localhost:8080' failed`
- Connection indicator shows red

**Cause:** WebSocket server not running or port blocked

**Solution:**
```bash
# Verify WebSocket enabled
grep WEBSOCKET_ENABLED .env
# Should be: WEBSOCKET_ENABLED=true

# Check WebSocket port
curl http://localhost:8080
# Should get HTTP 400 (expected for WS endpoint)

# Check firewall
sudo ufw allow 8080/tcp

# Restart services
docker-compose restart
```

---

### Issue 7: "Feature flag not working"

**Symptoms:**
- Visual canvas not appearing in dashboard
- API returns `{"enabled": false}`

**Cause:** Environment variable not loaded

**Solution:**
```bash
# Verify .env
grep FEATURE_VISUAL_CANVAS .env
# Should be: FEATURE_VISUAL_CANVAS=true

# Check if server loaded it
curl http://localhost:3000/api/features/visualCanvas
# Should return: {"enabled": true}

# If not, restart server
docker-compose down
docker-compose up -d

# Clear browser cache
# Chrome: Ctrl+Shift+Delete > Clear browsing data
```

---

## Post-Migration Tasks

### 1. Configure GitHub Integration

```bash
# Add GitHub token for higher rate limits
# In .env
GITHUB_TOKEN=ghp_your_personal_access_token

# Required scopes: repo, read:org
# Generate at: https://github.com/settings/tokens
```

### 2. Customize Default Zones

**Edit zones via API or database:**

```bash
# Update zone prompt template
sqlite3 data/visual.db <<EOF
UPDATE zones
SET prompt_template = 'Your custom template here\n\n{{ github.title }}'
WHERE id = 'zone-development';
EOF
```

**Or via dashboard:**
1. Navigate to Canvas
2. Click ⋮ menu on zone card
3. Select "Edit"
4. Modify fields
5. Save changes

### 3. Set Up Monitoring

**Monitor disk usage:**
```bash
# Create cron job to clean old worktrees
crontab -e

# Add line:
0 2 * * * cd /path/to/AI-Orchestra && node scripts/cleanup_worktrees.js
```

**Monitor database size:**
```bash
# Check size
du -h data/visual.db

# Set up alerts if > 1GB
```

### 4. Configure Backup Schedule

```bash
# Create backup script
cat > scripts/backup_phase9.sh <<'EOF'
#!/bin/bash
BACKUP_DIR="data/backups"
mkdir -p "$BACKUP_DIR"
DATE=$(date +%Y%m%d-%H%M%S)
cp data/visual.db "$BACKUP_DIR/visual-$DATE.db"
# Keep only last 7 days
find "$BACKUP_DIR" -name "visual-*.db" -mtime +7 -delete
EOF

chmod +x scripts/backup_phase9.sh

# Add to cron (daily at 3 AM)
crontab -e
0 3 * * * /path/to/AI-Orchestra/scripts/backup_phase9.sh
```

### 5. Train Your Team

**User Training:**
- Share [User Guide](./PHASE_9_USER_GUIDE.md)
- Conduct demo session
- Create video tutorial
- Set up sandbox environment for practice

**Developer Training:**
- Review [Developer Guide](./PHASE_9_DEVELOPER_GUIDE.md)
- Walkthrough of architecture
- Code review session
- Pair programming on customizations

### 6. Update Documentation

**Internal Docs:**
- Update deployment runbooks
- Add Phase 9 to incident response plan
- Document custom zones and workflows
- Create troubleshooting guide

**External Docs:**
- Update README with Phase 9 features
- Add screenshots to documentation
- Create getting started video
- Update API documentation

### 7. Performance Tuning

**Optimize Database:**
```bash
# Run VACUUM to reclaim space
sqlite3 data/visual.db "VACUUM;"

# Analyze query performance
sqlite3 data/visual.db "ANALYZE;"
```

**Configure Resource Limits:**
```bash
# In .env
WORKTREE_PORT_MAX=3100  # Limit concurrent worktrees to 100

# In docker-compose.yml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
```

### 8. Set Up Alerts

**Create health check script:**
```bash
cat > scripts/health_check.sh <<'EOF'
#!/bin/bash
HEALTH=$(curl -s http://localhost:3000/health | jq -r .status)

if [ "$HEALTH" != "healthy" ]; then
  echo "ALERT: AI Orchestra is unhealthy" | mail -s "AI Orchestra Alert" admin@example.com
fi
EOF

chmod +x scripts/health_check.sh

# Add to cron (every 5 minutes)
*/5 * * * * /path/to/AI-Orchestra/scripts/health_check.sh
```

---

## Summary

**Migration Checklist:**

- [ ] Backups created (database, config, code)
- [ ] Prerequisites verified
- [ ] Dependencies installed
- [ ] Environment variables configured
- [ ] Database migration completed
- [ ] Migration verified
- [ ] Feature flag enabled
- [ ] Functional tests passed
- [ ] WebSocket working
- [ ] Dashboard accessible
- [ ] Team trained
- [ ] Monitoring configured
- [ ] Documentation updated

**Success Criteria:**

✅ Health check returns Phase 9
✅ Visual canvas loads in dashboard
✅ Can create worktrees and zones
✅ Drag-and-drop triggers execution
✅ WebSocket events received
✅ No errors in logs
✅ GitHub integration working (if configured)

**Next Steps:**

1. **Read Documentation:**
   - [User Guide](./PHASE_9_USER_GUIDE.md)
   - [Developer Guide](./PHASE_9_DEVELOPER_GUIDE.md)
   - [API Reference](./PHASE_9_API_REFERENCE.md)

2. **Create First Workflow:**
   - Create a test worktree
   - Link to GitHub issue
   - Drag through zones (Development → Testing → Review)
   - Monitor execution

3. **Customize:**
   - Modify zone configurations
   - Add custom prompt templates
   - Configure zone actions
   - Set up team workflows

4. **Monitor:**
   - Watch resource usage
   - Review execution history
   - Track token consumption
   - Optimize as needed

---

**Migration Support:**

If you encounter issues not covered in this guide:
1. Check [Common Issues](#common-migration-issues)
2. Review server logs: `docker-compose logs -f app`
3. Check GitHub Issues: [AI-Orchestra/issues](https://github.com/your-org/AI-Orchestra/issues)
4. Contact support: support@ai-orchestra.example.com

---

**Document Version:** 1.0
**Last Updated:** November 14, 2025
**Migration Tested:** Phase 8.0 → Phase 9.0
