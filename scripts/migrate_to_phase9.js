#!/usr/bin/env node

/**
 * Phase 9 Migration Script
 * Sets up visual orchestration database with default zones
 * Safe to run multiple times (idempotent)
 */

import { VisualDatabase } from '../core/database/visual_db.js';
import logger from '../core/logger.js';
import path from 'path';
import fs from 'fs';

const BACKUP_DIR = path.join(process.cwd(), 'data', 'backups');

/**
 * Create backup of existing database
 */
function createBackup() {
  const dbPath = path.join(process.cwd(), 'data', 'visual.db');

  if (!fs.existsSync(dbPath)) {
    logger.info('[Migration] No existing database to backup');
    return null;
  }

  // Ensure backup directory exists
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, `visual-${timestamp}.db`);

  try {
    fs.copyFileSync(dbPath, backupPath);
    logger.info('[Migration] Database backup created', { backupPath });
    return backupPath;
  } catch (error) {
    logger.error('[Migration] Failed to create backup', { error: error.message });
    throw error;
  }
}

/**
 * Restore database from backup
 */
function restoreBackup(backupPath) {
  if (!backupPath || !fs.existsSync(backupPath)) {
    logger.warn('[Migration] No backup to restore');
    return false;
  }

  const dbPath = path.join(process.cwd(), 'data', 'visual.db');

  try {
    fs.copyFileSync(backupPath, dbPath);
    logger.info('[Migration] Database restored from backup', { backupPath });
    return true;
  } catch (error) {
    logger.error('[Migration] Failed to restore backup', { error: error.message });
    return false;
  }
}

/**
 * Create default zones
 */
function createDefaultZones(db) {
  const defaultZones = [
    {
      id: 'zone-development',
      name: 'Development',
      description: 'Active development work - implement features and write code',
      trigger: 'onDrop',
      agents: ['frontend', 'backend'],
      promptTemplate: `You are working on: {{ github.title }}

Issue Description:
{{ github.description }}

Repository: {{ github.url }}
Branch: {{ worktree.branch }}
Worktree Path: {{ worktree.path }}
Port: {{ worktree.port }}

Please implement the feature described above. Follow best practices and write clean, maintainable code.`,
      actions: [],
      position: { x: 50, y: 50 },
      size: { width: 350, height: 450 },
      createdAt: new Date().toISOString()
    },
    {
      id: 'zone-testing',
      name: 'Testing',
      description: 'QA and testing - run tests and verify functionality',
      trigger: 'onDrop',
      agents: ['qa', 'test-engineer'],
      promptTemplate: `Test the implementation for: {{ github.title }}

Description:
{{ github.description }}

Branch: {{ worktree.branch }}
Path: {{ worktree.path }}

Please:
1. Run all existing tests
2. Write new tests for the changes
3. Verify edge cases
4. Check for regression issues`,
      actions: [{ type: 'runTests' }],
      position: { x: 450, y: 50 },
      size: { width: 350, height: 450 },
      createdAt: new Date().toISOString()
    },
    {
      id: 'zone-review',
      name: 'Code Review',
      description: 'Ready for review - review code and create pull request',
      trigger: 'onDrop',
      agents: ['code-reviewer'],
      promptTemplate: `Review the code for: {{ github.title }}

Description:
{{ github.description }}

Branch: {{ worktree.branch }}
URL: {{ github.url }}

Please review:
1. Code quality and style
2. Security considerations
3. Performance implications
4. Test coverage
5. Documentation completeness`,
      actions: [
        { type: 'runTests' },
        { type: 'createPR', title: '{{ github.title }}' }
      ],
      position: { x: 850, y: 50 },
      size: { width: 350, height: 450 },
      createdAt: new Date().toISOString()
    },
    {
      id: 'zone-deployment',
      name: 'Deployment',
      description: 'Production deployment - deploy to staging or production',
      trigger: 'manual',
      agents: ['devops'],
      promptTemplate: `Prepare deployment for: {{ github.title }}

Branch: {{ worktree.branch }}
Path: {{ worktree.path }}

Please:
1. Verify all tests pass
2. Check deployment configuration
3. Create deployment artifacts
4. Update deployment documentation`,
      actions: [
        { type: 'runTests' },
        { type: 'notify', message: 'Ready for deployment' }
      ],
      position: { x: 1250, y: 50 },
      size: { width: 350, height: 450 },
      createdAt: new Date().toISOString()
    }
  ];

  let created = 0;
  let skipped = 0;

  for (const zone of defaultZones) {
    try {
      // Check if zone already exists
      const existing = db.getZone(zone.id);
      if (existing) {
        logger.info(`[Migration] Zone already exists: ${zone.name}`, { id: zone.id });
        skipped++;
        continue;
      }

      // Create the zone
      db.createZone(zone);
      logger.info(`[Migration] Created default zone: ${zone.name}`, { id: zone.id });
      created++;
    } catch (error) {
      logger.error(`[Migration] Failed to create zone: ${zone.name}`, {
        error: error.message
      });
      throw error;
    }
  }

  return { created, skipped, total: defaultZones.length };
}

/**
 * Verify migration success
 */
function verifyMigration(db) {
  const stats = db.getStats();

  logger.info('[Migration] Database statistics', stats);

  // Verify tables exist and are accessible
  const checks = [
    { name: 'worktrees table', test: () => db.listWorktrees() },
    { name: 'zones table', test: () => db.listZones() },
    { name: 'assignments table', test: () => db.getStats().assignments >= 0 },
    { name: 'executions table', test: () => db.getStats().executions >= 0 }
  ];

  for (const check of checks) {
    try {
      check.test();
      logger.info(`[Migration] ✓ ${check.name} verified`);
    } catch (error) {
      logger.error(`[Migration] ✗ ${check.name} failed`, { error: error.message });
      throw new Error(`Migration verification failed: ${check.name}`);
    }
  }

  return true;
}

/**
 * Main migration function
 */
async function migrate() {
  logger.info('[Migration] ========================================');
  logger.info('[Migration] Starting Phase 9 Migration');
  logger.info('[Migration] ========================================');

  let backupPath = null;
  let db = null;

  try {
    // Step 1: Create backup
    logger.info('[Migration] Step 1: Creating backup...');
    backupPath = createBackup();

    // Step 2: Initialize database
    logger.info('[Migration] Step 2: Initializing database...');
    db = new VisualDatabase();

    // Step 3: Create default zones
    logger.info('[Migration] Step 3: Creating default zones...');
    const zoneResult = createDefaultZones(db);
    logger.info('[Migration] Zone creation results:', zoneResult);

    // Step 4: Verify migration
    logger.info('[Migration] Step 4: Verifying migration...');
    verifyMigration(db);

    // Success!
    logger.info('[Migration] ========================================');
    logger.info('[Migration] Migration completed successfully!');
    logger.info('[Migration] ========================================');
    logger.info('[Migration] Summary:');
    logger.info(`[Migration]   - Zones created: ${zoneResult.created}`);
    logger.info(`[Migration]   - Zones skipped: ${zoneResult.skipped}`);
    logger.info(`[Migration]   - Total zones: ${zoneResult.total}`);
    if (backupPath) {
      logger.info(`[Migration]   - Backup saved: ${backupPath}`);
    }
    logger.info('[Migration] ========================================');

    // Close database
    db.close();

    process.exit(0);
  } catch (error) {
    logger.error('[Migration] ========================================');
    logger.error('[Migration] Migration FAILED!');
    logger.error('[Migration] ========================================');
    logger.error('[Migration] Error:', { error: error.message, stack: error.stack });

    // Attempt rollback
    if (backupPath) {
      logger.info('[Migration] Attempting rollback...');
      if (db) {
        db.close();
      }

      if (restoreBackup(backupPath)) {
        logger.info('[Migration] Rollback successful');
      } else {
        logger.error('[Migration] Rollback failed - manual intervention required');
        logger.error(`[Migration] Backup location: ${backupPath}`);
      }
    }

    logger.error('[Migration] ========================================');
    process.exit(1);
  }
}

/**
 * Rollback function (can be called separately)
 */
async function rollback() {
  logger.info('[Migration] Starting rollback...');

  // Find most recent backup
  if (!fs.existsSync(BACKUP_DIR)) {
    logger.error('[Migration] No backup directory found');
    process.exit(1);
  }

  const backups = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('visual-') && f.endsWith('.db'))
    .sort()
    .reverse();

  if (backups.length === 0) {
    logger.error('[Migration] No backups found');
    process.exit(1);
  }

  const latestBackup = path.join(BACKUP_DIR, backups[0]);
  logger.info(`[Migration] Rolling back to: ${latestBackup}`);

  if (restoreBackup(latestBackup)) {
    logger.info('[Migration] Rollback successful');
    process.exit(0);
  } else {
    logger.error('[Migration] Rollback failed');
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

if (command === 'rollback') {
  rollback().catch(error => {
    logger.error('[Migration] Rollback error:', error);
    process.exit(1);
  });
} else if (command === 'verify') {
  // Verify without migrating
  const db = new VisualDatabase();
  verifyMigration(db);
  db.close();
  logger.info('[Migration] Verification complete');
  process.exit(0);
} else {
  // Default: run migration
  migrate().catch(error => {
    logger.error('[Migration] Unexpected error:', error);
    process.exit(1);
  });
}
