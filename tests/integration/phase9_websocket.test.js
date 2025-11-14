/**
 * Phase 9 WebSocket Integration Tests
 * Tests for real-time event broadcasting
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import WebSocket from 'ws';
import { setTimeout } from 'timers/promises';

const WS_URL = 'ws://localhost:8080';
const API_URL = 'http://localhost:3000';

describe('Phase 9 WebSocket Integration Tests', () => {
  let ws;
  let csrfToken;

  before(async () => {
    // Get CSRF token
    const response = await fetch(`${API_URL}/api/csrf-token`);
    const data = await response.json();
    csrfToken = data.csrfToken;
  });

  afterEach(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  });

  // Helper function to make authenticated API requests
  async function makeRequest(url, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
      ...options.headers
    };

    return fetch(url, { ...options, headers });
  }

  // Helper function to wait for WebSocket message
  function waitForMessage(ws, eventType, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for ${eventType} event`));
      }, timeout);

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.type === eventType) {
            clearTimeout(timer);
            resolve(message.data);
          }
        } catch (error) {
          // Ignore parse errors
        }
      });
    });
  }

  describe('Worktree Events', () => {
    it('should receive worktree:created event', async () => {
      ws = new WebSocket(WS_URL);

      await new Promise((resolve) => {
        ws.on('open', resolve);
      });

      // Listen for the event
      const eventPromise = waitForMessage(ws, 'worktree:created');

      // Create worktree via API
      const response = await makeRequest(`${API_URL}/api/worktrees`, {
        method: 'POST',
        body: JSON.stringify({
          branchName: 'ws-test-branch-1'
        })
      });

      const worktree = await response.json();

      // Wait for WebSocket event
      const eventData = await eventPromise;

      assert.strictEqual(eventData.id, worktree.id);
      assert.strictEqual(eventData.branchName, 'ws-test-branch-1');

      // Clean up
      await makeRequest(`${API_URL}/api/worktrees/${worktree.id}`, {
        method: 'DELETE'
      });
    });

    it('should receive worktree:updated event', async () => {
      // Create a worktree first
      const createResponse = await makeRequest(`${API_URL}/api/worktrees`, {
        method: 'POST',
        body: JSON.stringify({
          branchName: 'ws-test-branch-2'
        })
      });
      const worktree = await createResponse.json();

      // Connect WebSocket
      ws = new WebSocket(WS_URL);
      await new Promise((resolve) => {
        ws.on('open', resolve);
      });

      // Listen for update event
      const eventPromise = waitForMessage(ws, 'worktree:updated');

      // Update worktree
      await makeRequest(`${API_URL}/api/worktrees/${worktree.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: 'completed'
        })
      });

      // Wait for WebSocket event
      const eventData = await eventPromise;

      assert.strictEqual(eventData.id, worktree.id);
      assert.strictEqual(eventData.status, 'completed');

      // Clean up
      await makeRequest(`${API_URL}/api/worktrees/${worktree.id}`, {
        method: 'DELETE'
      });
    });

    it('should receive worktree:deleted event', async () => {
      // Create a worktree first
      const createResponse = await makeRequest(`${API_URL}/api/worktrees`, {
        method: 'POST',
        body: JSON.stringify({
          branchName: 'ws-test-branch-3'
        })
      });
      const worktree = await createResponse.json();

      // Connect WebSocket
      ws = new WebSocket(WS_URL);
      await new Promise((resolve) => {
        ws.on('open', resolve);
      });

      // Listen for delete event
      const eventPromise = waitForMessage(ws, 'worktree:deleted');

      // Delete worktree
      await makeRequest(`${API_URL}/api/worktrees/${worktree.id}`, {
        method: 'DELETE'
      });

      // Wait for WebSocket event
      const eventData = await eventPromise;

      assert.strictEqual(eventData.worktreeId, worktree.id);
    });
  });

  describe('Zone Events', () => {
    it('should receive zone:created event', async () => {
      ws = new WebSocket(WS_URL);

      await new Promise((resolve) => {
        ws.on('open', resolve);
      });

      // Listen for the event
      const eventPromise = waitForMessage(ws, 'zone:created');

      // Create zone via API
      const response = await makeRequest(`${API_URL}/api/zones`, {
        method: 'POST',
        body: JSON.stringify({
          name: 'WebSocket Test Zone'
        })
      });

      const zone = await response.json();

      // Wait for WebSocket event
      const eventData = await eventPromise;

      assert.strictEqual(eventData.id, zone.id);
      assert.strictEqual(eventData.name, 'WebSocket Test Zone');

      // Clean up
      await makeRequest(`${API_URL}/api/zones/${zone.id}`, {
        method: 'DELETE'
      });
    });

    it('should receive zone:updated event', async () => {
      // Create a zone first
      const createResponse = await makeRequest(`${API_URL}/api/zones`, {
        method: 'POST',
        body: JSON.stringify({
          name: 'Initial Zone Name'
        })
      });
      const zone = await createResponse.json();

      // Connect WebSocket
      ws = new WebSocket(WS_URL);
      await new Promise((resolve) => {
        ws.on('open', resolve);
      });

      // Listen for update event
      const eventPromise = waitForMessage(ws, 'zone:updated');

      // Update zone
      await makeRequest(`${API_URL}/api/zones/${zone.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: 'Updated Zone Name'
        })
      });

      // Wait for WebSocket event
      const eventData = await eventPromise;

      assert.strictEqual(eventData.id, zone.id);
      assert.strictEqual(eventData.name, 'Updated Zone Name');

      // Clean up
      await makeRequest(`${API_URL}/api/zones/${zone.id}`, {
        method: 'DELETE'
      });
    });

    it('should receive zone:deleted event', async () => {
      // Create a zone first
      const createResponse = await makeRequest(`${API_URL}/api/zones`, {
        method: 'POST',
        body: JSON.stringify({
          name: 'To Be Deleted Zone'
        })
      });
      const zone = await createResponse.json();

      // Connect WebSocket
      ws = new WebSocket(WS_URL);
      await new Promise((resolve) => {
        ws.on('open', resolve);
      });

      // Listen for delete event
      const eventPromise = waitForMessage(ws, 'zone:deleted');

      // Delete zone
      await makeRequest(`${API_URL}/api/zones/${zone.id}`, {
        method: 'DELETE'
      });

      // Wait for WebSocket event
      const eventData = await eventPromise;

      assert.strictEqual(eventData.zoneId, zone.id);
    });
  });

  describe('Assignment Events', () => {
    it('should receive worktree:assigned event', async () => {
      // Create worktree and zone
      const wtResponse = await makeRequest(`${API_URL}/api/worktrees`, {
        method: 'POST',
        body: JSON.stringify({
          branchName: 'assignment-ws-test'
        })
      });
      const worktree = await wtResponse.json();

      const zoneResponse = await makeRequest(`${API_URL}/api/zones`, {
        method: 'POST',
        body: JSON.stringify({
          name: 'Assignment WS Test Zone',
          trigger: 'manual'
        })
      });
      const zone = await zoneResponse.json();

      // Connect WebSocket
      ws = new WebSocket(WS_URL);
      await new Promise((resolve) => {
        ws.on('open', resolve);
      });

      // Listen for assignment event
      const eventPromise = waitForMessage(ws, 'worktree:assigned');

      // Assign worktree to zone
      await makeRequest(`${API_URL}/api/zones/${zone.id}/assign/${worktree.id}`, {
        method: 'POST'
      });

      // Wait for WebSocket event
      const eventData = await eventPromise;

      assert.strictEqual(eventData.worktreeId, worktree.id);
      assert.strictEqual(eventData.zoneId, zone.id);

      // Clean up
      await makeRequest(`${API_URL}/api/worktrees/${worktree.id}`, {
        method: 'DELETE'
      });
      await makeRequest(`${API_URL}/api/zones/${zone.id}`, {
        method: 'DELETE'
      });
    });

    it('should receive worktree:removed event', async () => {
      // Create worktree and zone, and assign
      const wtResponse = await makeRequest(`${API_URL}/api/worktrees`, {
        method: 'POST',
        body: JSON.stringify({
          branchName: 'removal-ws-test'
        })
      });
      const worktree = await wtResponse.json();

      const zoneResponse = await makeRequest(`${API_URL}/api/zones`, {
        method: 'POST',
        body: JSON.stringify({
          name: 'Removal WS Test Zone'
        })
      });
      const zone = await zoneResponse.json();

      await makeRequest(`${API_URL}/api/zones/${zone.id}/assign/${worktree.id}`, {
        method: 'POST'
      });

      // Connect WebSocket
      ws = new WebSocket(WS_URL);
      await new Promise((resolve) => {
        ws.on('open', resolve);
      });

      // Listen for removal event
      const eventPromise = waitForMessage(ws, 'worktree:removed');

      // Remove worktree from zone
      await makeRequest(`${API_URL}/api/zones/assign/${worktree.id}`, {
        method: 'DELETE'
      });

      // Wait for WebSocket event
      const eventData = await eventPromise;

      assert.strictEqual(eventData.worktreeId, worktree.id);

      // Clean up
      await makeRequest(`${API_URL}/api/worktrees/${worktree.id}`, {
        method: 'DELETE'
      });
      await makeRequest(`${API_URL}/api/zones/${zone.id}`, {
        method: 'DELETE'
      });
    });
  });

  describe('Trigger Events', () => {
    it('should receive trigger:executed event when worktree is assigned to onDrop zone', async () => {
      // Create zone with onDrop trigger
      const zoneResponse = await makeRequest(`${API_URL}/api/zones`, {
        method: 'POST',
        body: JSON.stringify({
          name: 'OnDrop Trigger Zone',
          trigger: 'onDrop',
          agents: ['test-agent'],
          promptTemplate: 'Test prompt'
        })
      });
      const zone = await zoneResponse.json();

      // Create worktree
      const wtResponse = await makeRequest(`${API_URL}/api/worktrees`, {
        method: 'POST',
        body: JSON.stringify({
          branchName: 'trigger-test-branch'
        })
      });
      const worktree = await wtResponse.json();

      // Connect WebSocket
      ws = new WebSocket(WS_URL);
      await new Promise((resolve) => {
        ws.on('open', resolve);
      });

      // Listen for trigger executed event
      const eventPromise = waitForMessage(ws, 'trigger:executed', 10000);

      // Assign worktree to zone (this should trigger execution)
      await makeRequest(`${API_URL}/api/zones/${zone.id}/assign/${worktree.id}`, {
        method: 'POST'
      });

      // Wait for WebSocket event
      const eventData = await eventPromise;

      assert.strictEqual(eventData.zoneId, zone.id);
      assert.strictEqual(eventData.worktreeId, worktree.id);
      assert.ok(Array.isArray(eventData.results));

      // Clean up
      await makeRequest(`${API_URL}/api/worktrees/${worktree.id}`, {
        method: 'DELETE'
      });
      await makeRequest(`${API_URL}/api/zones/${zone.id}`, {
        method: 'DELETE'
      });
    });
  });
});
