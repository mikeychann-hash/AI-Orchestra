/**
 * ZoneManager Tests
 * Unit tests for zone management and trigger execution
 */

import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert';
import { ZoneManager } from '../../core/zones/zone_manager.js';
import EventEmitter from 'events';

describe('ZoneManager', () => {
  let zoneManager;
  let mockDatabase;
  let mockGithubProvider;
  let mockLlmBridge;

  beforeEach(() => {
    // Mock database
    mockDatabase = {
      zones: new Map(),
      worktreeZones: new Map(),
      executions: [],

      createZone(zone) {
        this.zones.set(zone.id, zone);
        return zone;
      },

      getZone(zoneId) {
        return this.zones.get(zoneId) || null;
      },

      listZones() {
        return Array.from(this.zones.values());
      },

      updateZone(zoneId, updates) {
        const zone = this.zones.get(zoneId);
        if (!zone) return null;
        Object.assign(zone, updates, { updatedAt: new Date().toISOString() });
        this.zones.set(zoneId, zone);
        return zone;
      },

      deleteZone(zoneId) {
        this.zones.delete(zoneId);
        // Remove worktree assignments
        for (const [wtId, zId] of this.worktreeZones.entries()) {
          if (zId === zoneId) {
            this.worktreeZones.delete(wtId);
          }
        }
      },

      assignWorktreeToZone(worktreeId, zoneId) {
        this.worktreeZones.set(worktreeId, zoneId);
      },

      getWorktreeZone(worktreeId) {
        return this.worktreeZones.get(worktreeId) || null;
      },

      removeWorktreeFromZone(worktreeId) {
        this.worktreeZones.delete(worktreeId);
      },

      recordExecution(execution) {
        this.executions.push({
          id: `exec-${Date.now()}`,
          ...execution,
          executedAt: new Date().toISOString(),
        });
      },
    };

    // Mock GitHub provider
    mockGithubProvider = {
      async getContextFromUrl(url) {
        return {
          type: 'issue',
          number: 123,
          title: 'Test Issue',
          description: 'Test description',
          labels: ['bug', 'frontend'],
          state: 'open',
          author: 'testuser',
        };
      },

      injectContext(template, context, worktree) {
        let result = template;
        if (context) {
          result = result.replace(/{{ *github\.title *}}/g, context.title || '');
          result = result.replace(/{{ *github\.description *}}/g, context.description || '');
        }
        if (worktree) {
          result = result.replace(/{{ *worktree\.id *}}/g, worktree.id || '');
          result = result.replace(/{{ *worktree\.port *}}/g, worktree.port || '');
        }
        return result;
      },
    };

    // Mock LLM Bridge
    mockLlmBridge = {
      async query(options) {
        return {
          success: true,
          response: `Response for: ${options.prompt}`,
          metadata: options.metadata,
        };
      },
    };

    // Create zone manager with mocks
    zoneManager = new ZoneManager({
      database: mockDatabase,
      githubContextProvider: mockGithubProvider,
      llmBridge: mockLlmBridge,
    });
  });

  describe('Initialization', () => {
    it('should initialize as EventEmitter', () => {
      assert.ok(zoneManager instanceof EventEmitter);
    });

    it('should initialize with database', () => {
      assert.ok(zoneManager.db);
    });

    it('should initialize with GitHub provider', () => {
      assert.strictEqual(zoneManager.githubContextProvider, mockGithubProvider);
    });

    it('should initialize with LLM bridge', () => {
      assert.strictEqual(zoneManager.llmBridge, mockLlmBridge);
    });
  });

  describe('Zone Creation', () => {
    it('should create a zone with required fields', () => {
      const zone = zoneManager.createZone({
        name: 'Development Zone',
        description: 'Zone for active development',
      });

      assert.ok(zone.id);
      assert.strictEqual(zone.name, 'Development Zone');
      assert.strictEqual(zone.description, 'Zone for active development');
      assert.strictEqual(zone.trigger, 'onDrop');
      assert.ok(Array.isArray(zone.agents));
      assert.ok(zone.createdAt);
    });

    it('should create zone with custom trigger', () => {
      const zone = zoneManager.createZone({
        name: 'Manual Zone',
        trigger: 'manual',
      });

      assert.strictEqual(zone.trigger, 'manual');
    });

    it('should create zone with agents', () => {
      const zone = zoneManager.createZone({
        name: 'Multi-Agent Zone',
        agents: ['frontend', 'backend', 'qa'],
      });

      assert.deepStrictEqual(zone.agents, ['frontend', 'backend', 'qa']);
    });

    it('should create zone with prompt template', () => {
      const template = 'Work on {{ github.title }}';
      const zone = zoneManager.createZone({
        name: 'Template Zone',
        promptTemplate: template,
      });

      assert.strictEqual(zone.promptTemplate, template);
    });

    it('should create zone with actions', () => {
      const zone = zoneManager.createZone({
        name: 'Action Zone',
        actions: [{ type: 'runTests' }, { type: 'createPR' }],
      });

      assert.strictEqual(zone.actions.length, 2);
      assert.strictEqual(zone.actions[0].type, 'runTests');
    });

    it('should create zone with position and size', () => {
      const zone = zoneManager.createZone({
        name: 'Positioned Zone',
        position: { x: 100, y: 200 },
        size: { width: 400, height: 300 },
      });

      assert.deepStrictEqual(zone.position, { x: 100, y: 200 });
      assert.deepStrictEqual(zone.size, { width: 400, height: 300 });
    });

    it('should generate unique IDs', () => {
      const zone1 = zoneManager.createZone({ name: 'Zone 1' });
      const zone2 = zoneManager.createZone({ name: 'Zone 2' });

      assert.notStrictEqual(zone1.id, zone2.id);
    });

    it('should emit zone:created event', (t, done) => {
      zoneManager.once('zone:created', (zone) => {
        assert.strictEqual(zone.name, 'Event Zone');
        done();
      });

      zoneManager.createZone({ name: 'Event Zone' });
    });
  });

  describe('Zone Retrieval', () => {
    it('should get zone by ID', () => {
      const created = zoneManager.createZone({ name: 'Test Zone' });
      const retrieved = zoneManager.getZone(created.id);

      assert.deepStrictEqual(retrieved, created);
    });

    it('should return null for non-existent zone', () => {
      const zone = zoneManager.getZone('non-existent-id');
      assert.strictEqual(zone, null);
    });

    it('should list all zones', () => {
      zoneManager.createZone({ name: 'Zone 1' });
      zoneManager.createZone({ name: 'Zone 2' });
      zoneManager.createZone({ name: 'Zone 3' });

      const zones = zoneManager.listZones();
      assert.strictEqual(zones.length, 3);
    });

    it('should return empty array when no zones', () => {
      const zones = zoneManager.listZones();
      assert.strictEqual(zones.length, 0);
    });
  });

  describe('Zone Update', () => {
    it('should update zone fields', () => {
      const zone = zoneManager.createZone({ name: 'Original Name' });

      const updated = zoneManager.updateZone(zone.id, {
        name: 'Updated Name',
        description: 'New description',
      });

      assert.strictEqual(updated.name, 'Updated Name');
      assert.strictEqual(updated.description, 'New description');
      assert.ok(updated.updatedAt);
    });

    it('should throw error for non-existent zone', () => {
      assert.throws(
        () => zoneManager.updateZone('non-existent', { name: 'New' }),
        /Zone not found/
      );
    });

    it('should emit zone:updated event', (t, done) => {
      const zone = zoneManager.createZone({ name: 'Original' });

      zoneManager.once('zone:updated', (updated) => {
        assert.strictEqual(updated.name, 'Modified');
        done();
      });

      zoneManager.updateZone(zone.id, { name: 'Modified' });
    });
  });

  describe('Zone Deletion', () => {
    it('should delete zone', () => {
      const zone = zoneManager.createZone({ name: 'To Delete' });

      zoneManager.deleteZone(zone.id);

      assert.strictEqual(zoneManager.getZone(zone.id), null);
    });

    it('should throw error when deleting non-existent zone', () => {
      assert.throws(() => zoneManager.deleteZone('non-existent'), /Zone not found/);
    });

    it('should remove worktree assignments when deleting zone', () => {
      const zone = zoneManager.createZone({ name: 'Zone with Assignments' });

      mockDatabase.assignWorktreeToZone('wt-1', zone.id);
      mockDatabase.assignWorktreeToZone('wt-2', zone.id);

      zoneManager.deleteZone(zone.id);

      assert.strictEqual(mockDatabase.getWorktreeZone('wt-1'), null);
      assert.strictEqual(mockDatabase.getWorktreeZone('wt-2'), null);
    });

    it('should emit zone:deleted event', (t, done) => {
      const zone = zoneManager.createZone({ name: 'Delete Event' });

      zoneManager.once('zone:deleted', (data) => {
        assert.strictEqual(data.zoneId, zone.id);
        done();
      });

      zoneManager.deleteZone(zone.id);
    });
  });

  describe('Worktree Assignment', () => {
    it('should assign worktree to zone', async () => {
      const zone = zoneManager.createZone({
        name: 'Test Zone',
        trigger: 'manual',
      });

      const worktree = { id: 'wt-1', port: 3001 };

      await zoneManager.assignWorktreeToZone('wt-1', zone.id, worktree);

      assert.strictEqual(mockDatabase.getWorktreeZone('wt-1'), zone.id);
    });

    it('should throw error when zone not found', async () => {
      await assert.rejects(
        async () => await zoneManager.assignWorktreeToZone('wt-1', 'invalid-zone', {}),
        /Zone not found/
      );
    });

    it('should emit worktree:assigned event', (t, done) => {
      const zone = zoneManager.createZone({ name: 'Zone', trigger: 'manual' });
      const worktree = { id: 'wt-1', port: 3001 };

      zoneManager.once('worktree:assigned', (data) => {
        assert.strictEqual(data.worktreeId, 'wt-1');
        assert.strictEqual(data.zoneId, zone.id);
        done();
      });

      zoneManager.assignWorktreeToZone('wt-1', zone.id, worktree);
    });

    it('should track previous zone on reassignment', async () => {
      const zone1 = zoneManager.createZone({ name: 'Zone 1', trigger: 'manual' });
      const zone2 = zoneManager.createZone({ name: 'Zone 2', trigger: 'manual' });
      const worktree = { id: 'wt-1', port: 3001 };

      await zoneManager.assignWorktreeToZone('wt-1', zone1.id, worktree);

      let previousZone;
      zoneManager.once('worktree:assigned', (data) => {
        previousZone = data.previousZone;
      });

      await zoneManager.assignWorktreeToZone('wt-1', zone2.id, worktree);

      assert.strictEqual(previousZone, zone1.id);
    });
  });

  describe('Trigger Execution', () => {
    it('should execute trigger on assignment with onDrop trigger', async () => {
      const zone = zoneManager.createZone({
        name: 'OnDrop Zone',
        trigger: 'onDrop',
        agents: ['frontend'],
        promptTemplate: 'Work on task',
      });

      const worktree = {
        id: 'wt-1',
        port: 3001,
      };

      const result = await zoneManager.assignWorktreeToZone('wt-1', zone.id, worktree);

      assert.strictEqual(result.success, true);
      assert.ok(Array.isArray(result.results));
    });

    it('should not execute trigger for manual zones', async () => {
      const zone = zoneManager.createZone({
        name: 'Manual Zone',
        trigger: 'manual',
        agents: ['frontend'],
      });

      const worktree = { id: 'wt-1', port: 3001 };

      const result = await zoneManager.assignWorktreeToZone('wt-1', zone.id, worktree);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.triggered, false);
    });

    it('should execute multiple agents', async () => {
      const zone = zoneManager.createZone({
        name: 'Multi-Agent Zone',
        trigger: 'onDrop',
        agents: ['frontend', 'backend', 'qa'],
        promptTemplate: 'Execute task',
      });

      const worktree = { id: 'wt-multi', port: 3002 };

      const result = await zoneManager.assignWorktreeToZone('wt-multi', zone.id, worktree);

      assert.strictEqual(result.results.length, 3);
      assert.strictEqual(result.results[0].agentType, 'frontend');
      assert.strictEqual(result.results[1].agentType, 'backend');
      assert.strictEqual(result.results[2].agentType, 'qa');
    });

    it('should inject GitHub context into prompt', async () => {
      const zone = zoneManager.createZone({
        name: 'Context Zone',
        trigger: 'onDrop',
        agents: ['frontend'],
        promptTemplate: 'Work on {{ github.title }}',
      });

      const worktree = {
        id: 'wt-context',
        port: 3003,
        issueUrl: 'https://github.com/owner/repo/issues/123',
      };

      await zoneManager.assignWorktreeToZone('wt-context', zone.id, worktree);

      // Check that GitHub context was fetched
      assert.ok(mockDatabase.executions.length > 0);
      const execution = mockDatabase.executions[0];
      assert.ok(execution.prompt.includes('Test Issue'));
    });

    it('should emit trigger:executed event', (t, done) => {
      const zone = zoneManager.createZone({
        name: 'Event Zone',
        trigger: 'onDrop',
        agents: ['frontend'],
        promptTemplate: 'Task',
      });

      zoneManager.once('trigger:executed', (data) => {
        assert.strictEqual(data.zoneId, zone.id);
        assert.strictEqual(data.worktreeId, 'wt-event');
        assert.ok(Array.isArray(data.results));
        done();
      });

      const worktree = { id: 'wt-event', port: 3004 };
      zoneManager.assignWorktreeToZone('wt-event', zone.id, worktree);
    });

    it('should record execution in database', async () => {
      const zone = zoneManager.createZone({
        name: 'Recorded Zone',
        trigger: 'onDrop',
        agents: ['frontend'],
        promptTemplate: 'Execute',
      });

      const worktree = { id: 'wt-record', port: 3005 };

      await zoneManager.assignWorktreeToZone('wt-record', zone.id, worktree);

      assert.strictEqual(mockDatabase.executions.length, 1);
      assert.strictEqual(mockDatabase.executions[0].agentType, 'frontend');
      assert.strictEqual(mockDatabase.executions[0].zoneId, zone.id);
    });
  });

  describe('Worktree Removal', () => {
    it('should remove worktree from zone', () => {
      const zone = zoneManager.createZone({ name: 'Zone', trigger: 'manual' });
      mockDatabase.assignWorktreeToZone('wt-remove', zone.id);

      zoneManager.removeWorktreeFromZone('wt-remove');

      assert.strictEqual(mockDatabase.getWorktreeZone('wt-remove'), null);
    });

    it('should emit worktree:removed event', (t, done) => {
      const zone = zoneManager.createZone({ name: 'Zone', trigger: 'manual' });
      mockDatabase.assignWorktreeToZone('wt-rem', zone.id);

      zoneManager.once('worktree:removed', (data) => {
        assert.strictEqual(data.worktreeId, 'wt-rem');
        done();
      });

      zoneManager.removeWorktreeFromZone('wt-rem');
    });
  });

  describe('Action Execution', () => {
    it('should execute runTests action', async () => {
      const zone = zoneManager.createZone({
        name: 'Test Action Zone',
        trigger: 'onDrop',
        agents: [],
        actions: [{ type: 'runTests' }],
      });

      const worktree = { id: 'wt-action', port: 3006 };

      // Should not throw
      await zoneManager.assignWorktreeToZone('wt-action', zone.id, worktree);
    });

    it('should execute createPR action', async () => {
      const zone = zoneManager.createZone({
        name: 'PR Action Zone',
        trigger: 'onDrop',
        agents: [],
        actions: [{ type: 'createPR' }],
      });

      const worktree = { id: 'wt-pr', port: 3007 };

      await zoneManager.assignWorktreeToZone('wt-pr', zone.id, worktree);
    });

    it('should execute notify action', async () => {
      const zone = zoneManager.createZone({
        name: 'Notify Zone',
        trigger: 'onDrop',
        agents: [],
        actions: [{ type: 'notify', message: 'Test notification' }],
      });

      const worktree = { id: 'wt-notify', port: 3008 };

      await zoneManager.assignWorktreeToZone('wt-notify', zone.id, worktree);
    });
  });

  describe('ID Generation', () => {
    it('should generate unique zone IDs', () => {
      const id1 = zoneManager._generateZoneId();
      const id2 = zoneManager._generateZoneId();

      assert.ok(id1.startsWith('zone-'));
      assert.ok(id2.startsWith('zone-'));
      assert.notStrictEqual(id1, id2);
    });
  });

  describe('Error Handling', () => {
    it('should handle LLM bridge errors gracefully', async () => {
      const failingBridge = {
        async query() {
          throw new Error('LLM query failed');
        },
      };

      const failManager = new ZoneManager({
        database: mockDatabase,
        githubContextProvider: mockGithubProvider,
        llmBridge: failingBridge,
      });

      const zone = failManager.createZone({
        name: 'Failing Zone',
        trigger: 'onDrop',
        agents: ['frontend'],
        promptTemplate: 'Task',
      });

      const worktree = { id: 'wt-fail', port: 3009 };

      await assert.rejects(
        async () => await failManager.assignWorktreeToZone('wt-fail', zone.id, worktree),
        /LLM query failed/
      );
    });

    it('should emit trigger:failed event on error', (t, done) => {
      const failingBridge = {
        async query() {
          throw new Error('Query error');
        },
      };

      const failManager = new ZoneManager({
        database: mockDatabase,
        githubContextProvider: mockGithubProvider,
        llmBridge: failingBridge,
      });

      const zone = failManager.createZone({
        name: 'Error Zone',
        trigger: 'onDrop',
        agents: ['frontend'],
        promptTemplate: 'Task',
      });

      failManager.once('trigger:failed', (data) => {
        assert.strictEqual(data.zoneId, zone.id);
        assert.ok(data.error);
        done();
      });

      const worktree = { id: 'wt-error', port: 3010 };
      failManager.assignWorktreeToZone('wt-error', zone.id, worktree).catch(() => {});
    });

    it('should handle missing GitHub provider gracefully', async () => {
      const noProviderManager = new ZoneManager({
        database: mockDatabase,
        llmBridge: mockLlmBridge,
        // No GitHub provider
      });

      const zone = noProviderManager.createZone({
        name: 'No Provider Zone',
        trigger: 'onDrop',
        agents: ['frontend'],
        promptTemplate: 'Work on {{ github.title }}',
      });

      const worktree = {
        id: 'wt-no-provider',
        port: 3011,
        issueUrl: 'https://github.com/owner/repo/issues/123',
      };

      // Should not throw, just use template as-is
      const result = await noProviderManager.assignWorktreeToZone('wt-no-provider', zone.id, worktree);
      assert.strictEqual(result.success, true);
    });
  });
});
