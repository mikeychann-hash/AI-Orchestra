/**
 * Phase 9 API Integration Tests
 * Tests for worktrees, zones, and assignment endpoints
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TEST_DB_PATH = path.join(process.cwd(), 'data', 'visual-test.db');

describe('Phase 9 API Integration Tests', () => {
  let serverProcess;
  let csrfToken;

  before(async () => {
    // Clean up test database if exists
    try {
      await fs.unlink(TEST_DB_PATH);
    } catch (error) {
      // File doesn't exist, ignore
    }

    // Set test environment
    process.env.VISUAL_DB_PATH = TEST_DB_PATH;
    process.env.NODE_ENV = 'test';

    // Start server (if not already running)
    // In real scenario, you might use a test server instance
  });

  after(async () => {
    // Clean up test database
    try {
      await fs.unlink(TEST_DB_PATH);
    } catch (error) {
      // Ignore
    }
  });

  // Helper function to get CSRF token
  async function getCsrfToken() {
    const response = await fetch(`${BASE_URL}/api/csrf-token`);
    const data = await response.json();
    return data.csrfToken;
  }

  // Helper function to make authenticated requests
  async function makeRequest(url, options = {}) {
    if (!csrfToken) {
      csrfToken = await getCsrfToken();
    }

    const headers = {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
      ...options.headers
    };

    return fetch(url, { ...options, headers });
  }

  describe('Worktree Endpoints', () => {
    let testWorktreeId;

    it('should create a new worktree', async () => {
      const response = await makeRequest(`${BASE_URL}/api/worktrees`, {
        method: 'POST',
        body: JSON.stringify({
          branchName: 'test-feature-branch',
          issueUrl: 'https://github.com/test/repo/issues/123',
          taskId: 'task-123',
          position: { x: 100, y: 100 }
        })
      });

      assert.strictEqual(response.status, 201);
      const worktree = await response.json();

      assert.ok(worktree.id);
      assert.strictEqual(worktree.branchName, 'test-feature-branch');
      assert.strictEqual(worktree.issueUrl, 'https://github.com/test/repo/issues/123');
      assert.ok(worktree.port >= 3001 && worktree.port <= 3999);

      testWorktreeId = worktree.id;
    });

    it('should reject invalid branch names', async () => {
      const response = await makeRequest(`${BASE_URL}/api/worktrees`, {
        method: 'POST',
        body: JSON.stringify({
          branchName: 'invalid@branch#name'
        })
      });

      assert.strictEqual(response.status, 400);
      const error = await response.json();
      assert.ok(error.error.includes('invalid characters'));
    });

    it('should list all worktrees', async () => {
      const response = await makeRequest(`${BASE_URL}/api/worktrees`);

      assert.strictEqual(response.status, 200);
      const worktrees = await response.json();

      assert.ok(Array.isArray(worktrees));
      assert.ok(worktrees.length > 0);
    });

    it('should get a specific worktree', async () => {
      const response = await makeRequest(`${BASE_URL}/api/worktrees/${testWorktreeId}`);

      assert.strictEqual(response.status, 200);
      const worktree = await response.json();

      assert.strictEqual(worktree.id, testWorktreeId);
      assert.strictEqual(worktree.branchName, 'test-feature-branch');
    });

    it('should update a worktree', async () => {
      const response = await makeRequest(`${BASE_URL}/api/worktrees/${testWorktreeId}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: 'completed',
          position: { x: 200, y: 200 }
        })
      });

      assert.strictEqual(response.status, 200);
      const worktree = await response.json();

      assert.strictEqual(worktree.status, 'completed');
      assert.strictEqual(worktree.position.x, 200);
      assert.strictEqual(worktree.position.y, 200);
    });

    it('should delete a worktree', async () => {
      const response = await makeRequest(`${BASE_URL}/api/worktrees/${testWorktreeId}`, {
        method: 'DELETE'
      });

      assert.strictEqual(response.status, 204);

      // Verify deletion
      const getResponse = await makeRequest(`${BASE_URL}/api/worktrees/${testWorktreeId}`);
      assert.strictEqual(getResponse.status, 404);
    });
  });

  describe('Zone Endpoints', () => {
    let testZoneId;

    it('should create a new zone', async () => {
      const response = await makeRequest(`${BASE_URL}/api/zones`, {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Development Zone',
          description: 'Zone for testing',
          trigger: 'onDrop',
          agents: ['frontend', 'backend'],
          promptTemplate: 'Implement {{ github.title }}',
          actions: [],
          position: { x: 50, y: 50 },
          size: { width: 300, height: 200 }
        })
      });

      assert.strictEqual(response.status, 201);
      const zone = await response.json();

      assert.ok(zone.id);
      assert.strictEqual(zone.name, 'Test Development Zone');
      assert.strictEqual(zone.trigger, 'onDrop');
      assert.deepStrictEqual(zone.agents, ['frontend', 'backend']);

      testZoneId = zone.id;
    });

    it('should reject zone creation without name', async () => {
      const response = await makeRequest(`${BASE_URL}/api/zones`, {
        method: 'POST',
        body: JSON.stringify({
          description: 'Zone without name'
        })
      });

      assert.strictEqual(response.status, 400);
    });

    it('should list all zones', async () => {
      const response = await makeRequest(`${BASE_URL}/api/zones`);

      assert.strictEqual(response.status, 200);
      const zones = await response.json();

      assert.ok(Array.isArray(zones));
      assert.ok(zones.length > 0);
    });

    it('should get a specific zone', async () => {
      const response = await makeRequest(`${BASE_URL}/api/zones/${testZoneId}`);

      assert.strictEqual(response.status, 200);
      const zone = await response.json();

      assert.strictEqual(zone.id, testZoneId);
      assert.strictEqual(zone.name, 'Test Development Zone');
    });

    it('should update a zone', async () => {
      const response = await makeRequest(`${BASE_URL}/api/zones/${testZoneId}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: 'Updated Test Zone',
          description: 'Updated description'
        })
      });

      assert.strictEqual(response.status, 200);
      const zone = await response.json();

      assert.strictEqual(zone.name, 'Updated Test Zone');
      assert.strictEqual(zone.description, 'Updated description');
    });

    it('should delete a zone', async () => {
      const response = await makeRequest(`${BASE_URL}/api/zones/${testZoneId}`, {
        method: 'DELETE'
      });

      assert.strictEqual(response.status, 204);

      // Verify deletion
      const getResponse = await makeRequest(`${BASE_URL}/api/zones/${testZoneId}`);
      assert.strictEqual(getResponse.status, 404);
    });
  });

  describe('Assignment Endpoints', () => {
    let worktreeId, zoneId;

    before(async () => {
      // Create a worktree
      const wtResponse = await makeRequest(`${BASE_URL}/api/worktrees`, {
        method: 'POST',
        body: JSON.stringify({
          branchName: 'assignment-test-branch'
        })
      });
      const worktree = await wtResponse.json();
      worktreeId = worktree.id;

      // Create a zone
      const zoneResponse = await makeRequest(`${BASE_URL}/api/zones`, {
        method: 'POST',
        body: JSON.stringify({
          name: 'Assignment Test Zone',
          trigger: 'manual'
        })
      });
      const zone = await zoneResponse.json();
      zoneId = zone.id;
    });

    it('should assign worktree to zone', async () => {
      const response = await makeRequest(
        `${BASE_URL}/api/zones/${zoneId}/assign/${worktreeId}`,
        { method: 'POST' }
      );

      assert.strictEqual(response.status, 200);
      const result = await response.json();

      assert.ok(result.success);
    });

    it('should get worktrees in a zone', async () => {
      const response = await makeRequest(`${BASE_URL}/api/zones/${zoneId}/worktrees`);

      assert.strictEqual(response.status, 200);
      const worktrees = await response.json();

      assert.ok(Array.isArray(worktrees));
      assert.strictEqual(worktrees.length, 1);
      assert.strictEqual(worktrees[0].id, worktreeId);
    });

    it('should remove worktree from zone', async () => {
      const response = await makeRequest(
        `${BASE_URL}/api/zones/assign/${worktreeId}`,
        { method: 'DELETE' }
      );

      assert.strictEqual(response.status, 204);

      // Verify removal
      const getResponse = await makeRequest(`${BASE_URL}/api/zones/${zoneId}/worktrees`);
      const worktrees = await getResponse.json();
      assert.strictEqual(worktrees.length, 0);
    });

    after(async () => {
      // Clean up
      await makeRequest(`${BASE_URL}/api/worktrees/${worktreeId}`, { method: 'DELETE' });
      await makeRequest(`${BASE_URL}/api/zones/${zoneId}`, { method: 'DELETE' });
    });
  });

  describe('Port Allocation', () => {
    it('should get port allocation status', async () => {
      const response = await makeRequest(`${BASE_URL}/api/worktrees/ports/status`);

      assert.strictEqual(response.status, 200);
      const status = await response.json();

      assert.ok(typeof status.total === 'number');
      assert.ok(typeof status.allocated === 'number');
      assert.ok(typeof status.available === 'number');
      assert.ok(Array.isArray(status.allocatedPorts));
    });
  });
});
