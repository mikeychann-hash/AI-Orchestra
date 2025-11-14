/**
 * WorktreeManager Tests
 * Unit tests for Git worktree management
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { WorktreeManager } from '../../core/worktree/worktree_manager.js';

describe('WorktreeManager', () => {
  let manager;
  let testRepoPath;

  before(() => {
    // Create a temporary Git repository for testing
    testRepoPath = path.join(process.cwd(), '.test-repo-' + Date.now());
    fs.mkdirSync(testRepoPath, { recursive: true });

    // Initialize Git repo
    execSync('git init', { cwd: testRepoPath, stdio: 'pipe' });
    execSync('git config user.email "test@example.com"', { cwd: testRepoPath, stdio: 'pipe' });
    execSync('git config user.name "Test User"', { cwd: testRepoPath, stdio: 'pipe' });

    // Create initial commit
    fs.writeFileSync(path.join(testRepoPath, 'README.md'), '# Test Repository');
    execSync('git add .', { cwd: testRepoPath, stdio: 'pipe' });
    execSync('git commit -m "Initial commit"', { cwd: testRepoPath, stdio: 'pipe' });
  });

  after(() => {
    // Cleanup: Remove all worktrees and test repo
    try {
      if (manager) {
        const worktrees = manager.listWorktrees();
        for (const wt of worktrees) {
          try {
            manager.deleteWorktree(wt.id).catch(() => {});
          } catch (error) {
            // Ignore cleanup errors
          }
        }
      }

      // Remove test repository
      if (fs.existsSync(testRepoPath)) {
        execSync(`rm -rf "${testRepoPath}"`, { stdio: 'pipe' });
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  beforeEach(() => {
    // Create fresh manager for each test
    manager = new WorktreeManager({
      repoPath: testRepoPath,
      portRange: { min: 4000, max: 4999 },
    });
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      const defaultManager = new WorktreeManager({ repoPath: testRepoPath });
      assert.strictEqual(defaultManager.repoPath, testRepoPath);
      assert.strictEqual(defaultManager.worktreeBasePath, '.worktrees');
      assert.strictEqual(defaultManager.portRange.min, 3001);
      assert.strictEqual(defaultManager.portRange.max, 3999);
    });

    it('should create worktree base directory', () => {
      const worktreeDir = path.join(testRepoPath, '.worktrees');
      assert.ok(fs.existsSync(worktreeDir), 'Worktree directory should exist');
    });

    it('should initialize empty maps', () => {
      assert.strictEqual(manager.activeWorktrees.size, 0);
      assert.strictEqual(manager.portAllocations.size, 0);
    });
  });

  describe('Worktree Creation', () => {
    it('should create a worktree with unique port', async () => {
      const worktree = await manager.createWorktree({
        branchName: 'feature-test-1',
        taskId: 'task-123',
      });

      assert.ok(worktree.id, 'Should have ID');
      assert.strictEqual(worktree.branchName, 'feature-test-1');
      assert.ok(worktree.port >= 4000 && worktree.port <= 4999, 'Port should be in range');
      assert.strictEqual(worktree.status, 'active');
      assert.strictEqual(worktree.taskId, 'task-123');
      assert.ok(worktree.createdAt, 'Should have createdAt timestamp');
    });

    it('should create worktree with GitHub issue URL', async () => {
      const worktree = await manager.createWorktree({
        branchName: 'feature-test-2',
        issueUrl: 'https://github.com/owner/repo/issues/123',
      });

      assert.strictEqual(worktree.issueUrl, 'https://github.com/owner/repo/issues/123');
    });

    it('should allocate unique ports for multiple worktrees', async () => {
      const wt1 = await manager.createWorktree({ branchName: 'feature-1', taskId: 't1' });
      const wt2 = await manager.createWorktree({ branchName: 'feature-2', taskId: 't2' });
      const wt3 = await manager.createWorktree({ branchName: 'feature-3', taskId: 't3' });

      assert.notStrictEqual(wt1.port, wt2.port, 'Ports should be unique');
      assert.notStrictEqual(wt2.port, wt3.port, 'Ports should be unique');
      assert.notStrictEqual(wt1.port, wt3.port, 'Ports should be unique');
    });

    it('should throw error when branchName is missing', async () => {
      await assert.rejects(
        async () => await manager.createWorktree({ taskId: 'task-invalid' }),
        /branchName is required/
      );
    });

    it('should add worktree to activeWorktrees map', async () => {
      const worktree = await manager.createWorktree({
        branchName: 'feature-test-4',
      });

      assert.strictEqual(manager.activeWorktrees.size, 1);
      assert.ok(manager.activeWorktrees.has(worktree.id));
    });

    it('should register port allocation', async () => {
      const worktree = await manager.createWorktree({
        branchName: 'feature-test-5',
      });

      assert.ok(manager.portAllocations.has(worktree.port));
      assert.strictEqual(manager.portAllocations.get(worktree.port), worktree.id);
    });
  });

  describe('Worktree Retrieval', () => {
    it('should get worktree by ID', async () => {
      const created = await manager.createWorktree({ branchName: 'feature-get-1' });
      const retrieved = manager.getWorktree(created.id);

      assert.deepStrictEqual(retrieved, created);
    });

    it('should return null for non-existent worktree', () => {
      const result = manager.getWorktree('non-existent-id');
      assert.strictEqual(result, null);
    });

    it('should list all worktrees', async () => {
      await manager.createWorktree({ branchName: 'feature-list-1' });
      await manager.createWorktree({ branchName: 'feature-list-2' });

      const list = manager.listWorktrees();
      assert.strictEqual(list.length, 2);
    });

    it('should get worktree by port', async () => {
      const created = await manager.createWorktree({ branchName: 'feature-port-1' });
      const retrieved = manager.getWorktreeByPort(created.port);

      assert.strictEqual(retrieved.id, created.id);
    });

    it('should return null for non-existent port', () => {
      const result = manager.getWorktreeByPort(9999);
      assert.strictEqual(result, null);
    });
  });

  describe('Worktree Update', () => {
    it('should update worktree metadata', async () => {
      const worktree = await manager.createWorktree({ branchName: 'feature-update-1' });

      const updated = await manager.updateWorktree(worktree.id, {
        status: 'completed',
        notes: 'Test complete',
      });

      assert.strictEqual(updated.status, 'completed');
      assert.strictEqual(updated.notes, 'Test complete');
      assert.ok(updated.updatedAt, 'Should have updatedAt timestamp');
    });

    it('should throw error when updating non-existent worktree', async () => {
      await assert.rejects(
        async () => await manager.updateWorktree('non-existent', { status: 'done' }),
        /Worktree not found/
      );
    });

    it('should preserve original fields when updating', async () => {
      const worktree = await manager.createWorktree({
        branchName: 'feature-preserve',
        taskId: 'task-preserve',
      });

      const updated = await manager.updateWorktree(worktree.id, { status: 'done' });

      assert.strictEqual(updated.branchName, 'feature-preserve');
      assert.strictEqual(updated.taskId, 'task-preserve');
      assert.strictEqual(updated.port, worktree.port);
    });
  });

  describe('Worktree Deletion', () => {
    it('should delete worktree and release port', async () => {
      const worktree = await manager.createWorktree({ branchName: 'feature-delete-1' });
      const port = worktree.port;

      await manager.deleteWorktree(worktree.id);

      assert.strictEqual(manager.getWorktree(worktree.id), null);
      assert.strictEqual(manager.portAllocations.has(port), false);
    });

    it('should throw error when deleting non-existent worktree', async () => {
      await assert.rejects(
        async () => await manager.deleteWorktree('non-existent'),
        /Worktree not found/
      );
    });

    it('should remove from activeWorktrees map', async () => {
      const worktree = await manager.createWorktree({ branchName: 'feature-delete-2' });
      const initialSize = manager.activeWorktrees.size;

      await manager.deleteWorktree(worktree.id);

      assert.strictEqual(manager.activeWorktrees.size, initialSize - 1);
    });
  });

  describe('Port Allocation', () => {
    it('should allocate port from configured range', async () => {
      const worktree = await manager.createWorktree({ branchName: 'feature-port-range' });
      assert.ok(worktree.port >= 4000 && worktree.port <= 4999);
    });

    it('should check port availability', async () => {
      const port = 4500;
      const isAvailable = await manager._isPortAvailable(port);
      assert.strictEqual(typeof isAvailable, 'boolean');
    });

    it('should not allocate already-used port', async () => {
      const wt1 = await manager.createWorktree({ branchName: 'feature-p1' });
      const wt2 = await manager.createWorktree({ branchName: 'feature-p2' });
      const wt3 = await manager.createWorktree({ branchName: 'feature-p3' });

      const ports = new Set([wt1.port, wt2.port, wt3.port]);
      assert.strictEqual(ports.size, 3, 'All ports should be unique');
    });

    it('should throw error when port range is exhausted', async () => {
      const smallManager = new WorktreeManager({
        repoPath: testRepoPath,
        portRange: { min: 5000, max: 5001 },
      });

      await smallManager.createWorktree({ branchName: 'f1' });
      await smallManager.createWorktree({ branchName: 'f2' });

      // Third worktree should fail
      await assert.rejects(
        async () => await smallManager.createWorktree({ branchName: 'f3' }),
        /No available ports/
      );

      // Cleanup
      const worktrees = smallManager.listWorktrees();
      for (const wt of worktrees) {
        await smallManager.deleteWorktree(wt.id).catch(() => {});
      }
    });
  });

  describe('ID Generation', () => {
    it('should generate unique IDs', () => {
      const id1 = manager._generateWorktreeId();
      const id2 = manager._generateWorktreeId();

      assert.ok(id1.startsWith('wt-'));
      assert.ok(id2.startsWith('wt-'));
      assert.notStrictEqual(id1, id2);
    });
  });

  describe('Path Generation', () => {
    it('should generate correct worktree path', () => {
      const worktreeId = 'test-id-123';
      const worktreePath = manager._getWorktreePath(worktreeId);

      assert.ok(worktreePath.includes('.worktrees'));
      assert.ok(worktreePath.includes('test-id-123'));
    });
  });

  describe('Statistics', () => {
    it('should return accurate statistics', async () => {
      await manager.createWorktree({ branchName: 'stats-1' });
      await manager.createWorktree({ branchName: 'stats-2' });

      const stats = manager.getStats();

      assert.strictEqual(stats.activeWorktrees, 2);
      assert.strictEqual(stats.allocatedPorts, 2);
      assert.ok(stats.portRange);
      assert.ok(stats.availablePorts >= 0);
    });

    it('should calculate available ports correctly', async () => {
      const stats1 = manager.getStats();
      const availableBefore = stats1.availablePorts;

      await manager.createWorktree({ branchName: 'avail-test' });

      const stats2 = manager.getStats();
      const availableAfter = stats2.availablePorts;

      assert.strictEqual(availableAfter, availableBefore - 1);
    });
  });

  describe('Error Handling', () => {
    it('should handle Git errors gracefully', async () => {
      const invalidManager = new WorktreeManager({
        repoPath: '/non/existent/path',
        portRange: { min: 6000, max: 6001 },
      });

      await assert.rejects(
        async () => await invalidManager.createWorktree({ branchName: 'test' }),
        /Failed to create git worktree/
      );
    });

    it('should handle deletion of already-deleted worktree', async () => {
      const worktree = await manager.createWorktree({ branchName: 'delete-twice' });

      await manager.deleteWorktree(worktree.id);

      await assert.rejects(
        async () => await manager.deleteWorktree(worktree.id),
        /Worktree not found/
      );
    });
  });
});
