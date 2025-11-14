/**
 * Visual Database Tests
 * Comprehensive test suite for VisualDatabase class
 */

import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { VisualDatabase } from '../../core/database/visual_db.js';
import fs from 'fs';
import path from 'path';

const TEST_DB_PATH = path.join(process.cwd(), 'data', 'test-visual.db');

describe('VisualDatabase', () => {
  let db;

  beforeEach(() => {
    // Clean up any existing test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    db = new VisualDatabase({ dbPath: TEST_DB_PATH });
  });

  afterEach(() => {
    if (db) {
      db.close();
    }

    // Clean up test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  describe('Initialization', () => {
    it('should create database with correct schema', () => {
      const stats = db.getStats();
      assert.strictEqual(stats.worktrees, 0);
      assert.strictEqual(stats.zones, 0);
      assert.strictEqual(stats.assignments, 0);
      assert.strictEqual(stats.executions, 0);
    });

    it('should enable WAL mode', () => {
      const result = db.db.pragma('journal_mode', { simple: true });
      assert.strictEqual(result, 'wal');
    });

    it('should enable foreign keys', () => {
      const result = db.db.pragma('foreign_keys', { simple: true });
      assert.strictEqual(result, 1);
    });
  });

  describe('Worktree CRUD Operations', () => {
    it('should create a worktree', () => {
      const worktree = {
        id: 'wt-test-1',
        path: '/tmp/worktrees/wt-test-1',
        port: 3001,
        branchName: 'feature-test',
        issueUrl: 'https://github.com/owner/repo/issues/123',
        taskId: 'task-123',
        status: 'active',
        position: { x: 100, y: 200 },
        createdAt: new Date().toISOString()
      };

      const created = db.createWorktree(worktree);

      assert.strictEqual(created.id, worktree.id);
      assert.strictEqual(created.path, worktree.path);
      assert.strictEqual(created.port, worktree.port);
      assert.strictEqual(created.branchName, worktree.branchName);
      assert.strictEqual(created.issueUrl, worktree.issueUrl);
      assert.strictEqual(created.position.x, 100);
      assert.strictEqual(created.position.y, 200);
    });

    it('should get worktree by id', () => {
      const worktree = {
        id: 'wt-test-2',
        path: '/tmp/worktrees/wt-test-2',
        port: 3002,
        branchName: 'feature-test-2',
        createdAt: new Date().toISOString()
      };

      db.createWorktree(worktree);
      const retrieved = db.getWorktree('wt-test-2');

      assert.strictEqual(retrieved.id, worktree.id);
      assert.strictEqual(retrieved.branchName, worktree.branchName);
    });

    it('should return null for non-existent worktree', () => {
      const result = db.getWorktree('non-existent');
      assert.strictEqual(result, null);
    });

    it('should list all worktrees', () => {
      db.createWorktree({
        id: 'wt-1',
        path: '/tmp/wt-1',
        port: 3001,
        branchName: 'branch-1',
        createdAt: new Date().toISOString()
      });

      db.createWorktree({
        id: 'wt-2',
        path: '/tmp/wt-2',
        port: 3002,
        branchName: 'branch-2',
        createdAt: new Date().toISOString()
      });

      const worktrees = db.listWorktrees();
      assert.strictEqual(worktrees.length, 2);
    });

    it('should list worktrees with status filter', () => {
      db.createWorktree({
        id: 'wt-active',
        path: '/tmp/wt-active',
        port: 3001,
        branchName: 'branch-active',
        status: 'active',
        createdAt: new Date().toISOString()
      });

      db.createWorktree({
        id: 'wt-inactive',
        path: '/tmp/wt-inactive',
        port: 3002,
        branchName: 'branch-inactive',
        status: 'inactive',
        createdAt: new Date().toISOString()
      });

      const activeWorktrees = db.listWorktrees({ status: 'active' });
      assert.strictEqual(activeWorktrees.length, 1);
      assert.strictEqual(activeWorktrees[0].id, 'wt-active');
    });

    it('should update worktree', () => {
      db.createWorktree({
        id: 'wt-update',
        path: '/tmp/wt-update',
        port: 3001,
        branchName: 'branch-original',
        status: 'active',
        createdAt: new Date().toISOString()
      });

      const updated = db.updateWorktree('wt-update', {
        status: 'completed',
        position: { x: 500, y: 600 }
      });

      assert.strictEqual(updated.status, 'completed');
      assert.strictEqual(updated.position.x, 500);
      assert.strictEqual(updated.position.y, 600);
      assert.ok(updated.updatedAt);
    });

    it('should delete worktree', () => {
      db.createWorktree({
        id: 'wt-delete',
        path: '/tmp/wt-delete',
        port: 3001,
        branchName: 'branch-delete',
        createdAt: new Date().toISOString()
      });

      const result = db.deleteWorktree('wt-delete');
      assert.strictEqual(result, true);

      const retrieved = db.getWorktree('wt-delete');
      assert.strictEqual(retrieved, null);
    });

    it('should throw error when deleting non-existent worktree', () => {
      assert.throws(
        () => db.deleteWorktree('non-existent'),
        /Worktree not found/
      );
    });

    it('should enforce unique port constraint', () => {
      db.createWorktree({
        id: 'wt-port-1',
        path: '/tmp/wt-port-1',
        port: 3001,
        branchName: 'branch-1',
        createdAt: new Date().toISOString()
      });

      assert.throws(() => {
        db.createWorktree({
          id: 'wt-port-2',
          path: '/tmp/wt-port-2',
          port: 3001, // Same port
          branchName: 'branch-2',
          createdAt: new Date().toISOString()
        });
      }, /UNIQUE constraint failed/);
    });
  });

  describe('Zone CRUD Operations', () => {
    it('should create a zone', () => {
      const zone = {
        id: 'zone-test-1',
        name: 'Test Zone',
        description: 'A test zone',
        trigger: 'onDrop',
        agents: ['frontend', 'backend'],
        promptTemplate: 'Test prompt: {{ github.title }}',
        actions: [{ type: 'runTests' }],
        position: { x: 100, y: 200 },
        size: { width: 300, height: 400 },
        createdAt: new Date().toISOString()
      };

      const created = db.createZone(zone);

      assert.strictEqual(created.id, zone.id);
      assert.strictEqual(created.name, zone.name);
      assert.strictEqual(created.trigger, zone.trigger);
      assert.deepStrictEqual(created.agents, zone.agents);
      assert.deepStrictEqual(created.actions, zone.actions);
      assert.strictEqual(created.position.x, 100);
      assert.strictEqual(created.size.width, 300);
    });

    it('should get zone by id', () => {
      const zone = {
        id: 'zone-get',
        name: 'Get Zone',
        createdAt: new Date().toISOString()
      };

      db.createZone(zone);
      const retrieved = db.getZone('zone-get');

      assert.strictEqual(retrieved.id, zone.id);
      assert.strictEqual(retrieved.name, zone.name);
    });

    it('should list all zones', () => {
      db.createZone({
        id: 'zone-1',
        name: 'Zone 1',
        createdAt: new Date().toISOString()
      });

      db.createZone({
        id: 'zone-2',
        name: 'Zone 2',
        createdAt: new Date().toISOString()
      });

      const zones = db.listZones();
      assert.strictEqual(zones.length, 2);
    });

    it('should update zone', () => {
      db.createZone({
        id: 'zone-update',
        name: 'Original Name',
        agents: ['frontend'],
        createdAt: new Date().toISOString()
      });

      const updated = db.updateZone('zone-update', {
        name: 'Updated Name',
        agents: ['frontend', 'backend'],
        position: { x: 100, y: 200 }
      });

      assert.strictEqual(updated.name, 'Updated Name');
      assert.strictEqual(updated.agents.length, 2);
      assert.strictEqual(updated.position.x, 100);
      assert.ok(updated.updatedAt);
    });

    it('should delete zone', () => {
      db.createZone({
        id: 'zone-delete',
        name: 'Delete Zone',
        createdAt: new Date().toISOString()
      });

      const result = db.deleteZone('zone-delete');
      assert.strictEqual(result, true);

      const retrieved = db.getZone('zone-delete');
      assert.strictEqual(retrieved, null);
    });

    it('should handle default values for optional fields', () => {
      const zone = {
        id: 'zone-defaults',
        name: 'Default Zone',
        createdAt: new Date().toISOString()
      };

      const created = db.createZone(zone);

      assert.strictEqual(created.trigger, 'onDrop');
      assert.deepStrictEqual(created.agents, []);
      assert.deepStrictEqual(created.actions, []);
      assert.strictEqual(created.position.x, 0);
      assert.strictEqual(created.size.width, 300);
    });
  });

  describe('Assignment Operations', () => {
    beforeEach(() => {
      // Create test worktree and zone
      db.createWorktree({
        id: 'wt-assign',
        path: '/tmp/wt-assign',
        port: 3001,
        branchName: 'branch-assign',
        createdAt: new Date().toISOString()
      });

      db.createZone({
        id: 'zone-assign',
        name: 'Assign Zone',
        createdAt: new Date().toISOString()
      });
    });

    it('should assign worktree to zone', () => {
      const result = db.assignWorktreeToZone('wt-assign', 'zone-assign');
      assert.strictEqual(result, true);

      const zoneId = db.getWorktreeZone('wt-assign');
      assert.strictEqual(zoneId, 'zone-assign');
    });

    it('should reassign worktree to different zone', () => {
      db.createZone({
        id: 'zone-assign-2',
        name: 'Assign Zone 2',
        createdAt: new Date().toISOString()
      });

      db.assignWorktreeToZone('wt-assign', 'zone-assign');
      db.assignWorktreeToZone('wt-assign', 'zone-assign-2');

      const zoneId = db.getWorktreeZone('wt-assign');
      assert.strictEqual(zoneId, 'zone-assign-2');
    });

    it('should get worktrees in zone', () => {
      db.createWorktree({
        id: 'wt-in-zone-1',
        path: '/tmp/wt-1',
        port: 3002,
        branchName: 'branch-1',
        createdAt: new Date().toISOString()
      });

      db.createWorktree({
        id: 'wt-in-zone-2',
        path: '/tmp/wt-2',
        port: 3003,
        branchName: 'branch-2',
        createdAt: new Date().toISOString()
      });

      db.assignWorktreeToZone('wt-in-zone-1', 'zone-assign');
      db.assignWorktreeToZone('wt-in-zone-2', 'zone-assign');

      const worktrees = db.getWorktreesInZone('zone-assign');
      assert.strictEqual(worktrees.length, 2);
    });

    it('should remove worktree from zone', () => {
      db.assignWorktreeToZone('wt-assign', 'zone-assign');

      const result = db.removeWorktreeFromZone('wt-assign');
      assert.strictEqual(result, true);

      const zoneId = db.getWorktreeZone('wt-assign');
      assert.strictEqual(zoneId, null);
    });

    it('should cascade delete assignments when worktree is deleted', () => {
      db.assignWorktreeToZone('wt-assign', 'zone-assign');
      db.deleteWorktree('wt-assign');

      const stats = db.getStats();
      assert.strictEqual(stats.assignments, 0);
    });

    it('should cascade delete assignments when zone is deleted', () => {
      db.assignWorktreeToZone('wt-assign', 'zone-assign');
      db.deleteZone('zone-assign');

      const stats = db.getStats();
      assert.strictEqual(stats.assignments, 0);
    });
  });

  describe('Execution History Operations', () => {
    beforeEach(() => {
      // Create test data
      db.createWorktree({
        id: 'wt-exec',
        path: '/tmp/wt-exec',
        port: 3001,
        branchName: 'branch-exec',
        createdAt: new Date().toISOString()
      });

      db.createZone({
        id: 'zone-exec',
        name: 'Exec Zone',
        createdAt: new Date().toISOString()
      });
    });

    it('should record execution', () => {
      const execution = {
        zoneId: 'zone-exec',
        worktreeId: 'wt-exec',
        agentType: 'frontend',
        prompt: 'Test prompt',
        result: { output: 'Success' },
        success: true
      };

      const id = db.recordExecution(execution);
      assert.ok(id);
      assert.ok(id.startsWith('exec-'));
    });

    it('should get execution history for zone', () => {
      db.recordExecution({
        zoneId: 'zone-exec',
        worktreeId: 'wt-exec',
        agentType: 'frontend',
        prompt: 'Test 1',
        result: { output: 'Success' },
        success: true
      });

      db.recordExecution({
        zoneId: 'zone-exec',
        worktreeId: 'wt-exec',
        agentType: 'backend',
        prompt: 'Test 2',
        result: { output: 'Success' },
        success: true
      });

      const history = db.getExecutionHistory('zone-exec');
      assert.strictEqual(history.length, 2);
      // Verify we got both agent types
      const agentTypes = history.map(h => h.agentType).sort();
      assert.deepStrictEqual(agentTypes, ['backend', 'frontend']);
    });

    it('should get execution history for worktree', () => {
      db.recordExecution({
        zoneId: 'zone-exec',
        worktreeId: 'wt-exec',
        agentType: 'frontend',
        prompt: 'Test',
        result: { output: 'Success' },
        success: true
      });

      const history = db.getWorktreeExecutions('wt-exec');
      assert.strictEqual(history.length, 1);
      assert.strictEqual(history[0].worktreeId, 'wt-exec');
    });

    it('should limit execution history', () => {
      // Create 10 executions
      for (let i = 0; i < 10; i++) {
        db.recordExecution({
          zoneId: 'zone-exec',
          worktreeId: 'wt-exec',
          agentType: 'frontend',
          prompt: `Test ${i}`,
          result: { output: 'Success' },
          success: true
        });
      }

      const history = db.getExecutionHistory('zone-exec', 5);
      assert.strictEqual(history.length, 5);
    });

    it('should get execution statistics', () => {
      db.recordExecution({
        zoneId: 'zone-exec',
        worktreeId: 'wt-exec',
        agentType: 'frontend',
        prompt: 'Test 1',
        result: { output: 'Success' },
        success: true
      });

      db.recordExecution({
        zoneId: 'zone-exec',
        worktreeId: 'wt-exec',
        agentType: 'backend',
        prompt: 'Test 2',
        result: { output: 'Failed' },
        success: false
      });

      db.recordExecution({
        zoneId: 'zone-exec',
        worktreeId: 'wt-exec',
        agentType: 'frontend',
        prompt: 'Test 3',
        result: { output: 'Success' },
        success: true
      });

      const stats = db.getExecutionStats({ zoneId: 'zone-exec' });

      assert.strictEqual(stats.total, 3);
      assert.strictEqual(stats.successful, 2);
      assert.strictEqual(stats.failed, 1);
      assert.strictEqual(stats.uniqueAgents, 2);
      assert.ok(Math.abs(stats.successRate - 66.67) < 0.1);
    });

    it('should cascade delete executions when worktree is deleted', () => {
      db.recordExecution({
        zoneId: 'zone-exec',
        worktreeId: 'wt-exec',
        agentType: 'frontend',
        prompt: 'Test',
        result: { output: 'Success' },
        success: true
      });

      db.deleteWorktree('wt-exec');

      const stats = db.getStats();
      assert.strictEqual(stats.executions, 0);
    });
  });

  describe('Transaction Support', () => {
    it('should execute operations in a transaction', () => {
      const result = db.transaction(() => {
        db.createWorktree({
          id: 'wt-tx-1',
          path: '/tmp/wt-tx-1',
          port: 3001,
          branchName: 'branch-1',
          createdAt: new Date().toISOString()
        });

        db.createWorktree({
          id: 'wt-tx-2',
          path: '/tmp/wt-tx-2',
          port: 3002,
          branchName: 'branch-2',
          createdAt: new Date().toISOString()
        });

        return 'success';
      });

      assert.strictEqual(result, 'success');

      const stats = db.getStats();
      assert.strictEqual(stats.worktrees, 2);
    });

    it('should rollback transaction on error', () => {
      try {
        db.transaction(() => {
          db.createWorktree({
            id: 'wt-rollback-1',
            path: '/tmp/wt-rollback-1',
            port: 3001,
            branchName: 'branch-1',
            createdAt: new Date().toISOString()
          });

          // This will fail due to duplicate port
          db.createWorktree({
            id: 'wt-rollback-2',
            path: '/tmp/wt-rollback-2',
            port: 3001, // Same port
            branchName: 'branch-2',
            createdAt: new Date().toISOString()
          });
        });
      } catch (error) {
        // Expected error
      }

      const stats = db.getStats();
      assert.strictEqual(stats.worktrees, 0); // Both should be rolled back
    });
  });

  describe('Database Statistics', () => {
    it('should return accurate statistics', () => {
      // Create test data
      db.createWorktree({
        id: 'wt-stats',
        path: '/tmp/wt-stats',
        port: 3001,
        branchName: 'branch-stats',
        createdAt: new Date().toISOString()
      });

      db.createZone({
        id: 'zone-stats',
        name: 'Stats Zone',
        createdAt: new Date().toISOString()
      });

      db.assignWorktreeToZone('wt-stats', 'zone-stats');

      db.recordExecution({
        zoneId: 'zone-stats',
        worktreeId: 'wt-stats',
        agentType: 'frontend',
        prompt: 'Test',
        result: { output: 'Success' },
        success: true
      });

      const stats = db.getStats();

      assert.strictEqual(stats.worktrees, 1);
      assert.strictEqual(stats.zones, 1);
      assert.strictEqual(stats.assignments, 1);
      assert.strictEqual(stats.executions, 1);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent worktree creation', async () => {
      const promises = [];

      for (let i = 0; i < 10; i++) {
        promises.push(
          Promise.resolve().then(() => {
            db.createWorktree({
              id: `wt-concurrent-${i}`,
              path: `/tmp/wt-${i}`,
              port: 3001 + i,
              branchName: `branch-${i}`,
              createdAt: new Date().toISOString()
            });
          })
        );
      }

      await Promise.all(promises);

      const worktrees = db.listWorktrees();
      assert.strictEqual(worktrees.length, 10);
    });
  });
});
