/**
 * Phase 9 API Routes
 * REST API endpoints for worktrees, zones, and assignments
 */

import express from 'express';
import logger from '../logger.js';
import { WorktreeManager } from '../worktree/worktree_manager.js';
import { ZoneManager } from '../zones/zone_manager.js';
import { GitHubContextProvider } from '../integrations/github_context_provider.js';
import { VisualDatabase } from '../database/visual_db.js';

export function createPhase9Routes(config = {}) {
  const router = express.Router();

  // Initialize shared database
  const database = new VisualDatabase(config.database);

  // Initialize managers
  const worktreeManager = new WorktreeManager({
    repoPath: config.repoPath || process.cwd(),
    worktreeBasePath: config.worktreeBasePath || '.worktrees',
    portRange: config.portRange || { min: 3001, max: 3999 },
    database
  });

  let githubContextProvider = null;
  if (config.github?.enabled && config.github?.token) {
    githubContextProvider = new GitHubContextProvider(config.github);
  }

  const zoneManager = new ZoneManager({
    database,
    githubContextProvider,
    llmBridge: config.llmBridge
  });

  // WebSocket event emitter for real-time updates
  let wss = null;

  const broadcastEvent = (event, data) => {
    if (wss && wss.clients) {
      const message = JSON.stringify({ type: event, data });
      wss.clients.forEach(client => {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(message);
        }
      });
    }
  };

  // Attach WebSocket server
  router.attachWebSocket = (websocketServer) => {
    wss = websocketServer;

    // Forward zone manager events to WebSocket
    zoneManager.on('zone:created', (data) => broadcastEvent('zone:created', data));
    zoneManager.on('zone:updated', (data) => broadcastEvent('zone:updated', data));
    zoneManager.on('zone:deleted', (data) => broadcastEvent('zone:deleted', data));
    zoneManager.on('worktree:assigned', (data) => broadcastEvent('worktree:assigned', data));
    zoneManager.on('worktree:removed', (data) => broadcastEvent('worktree:removed', data));
    zoneManager.on('trigger:executed', (data) => broadcastEvent('trigger:executed', data));
    zoneManager.on('trigger:failed', (data) => broadcastEvent('trigger:failed', data));
  };

  // ========== Worktree Endpoints ==========

  /**
   * POST /api/worktrees
   * Create a new worktree
   */
  router.post('/worktrees', async (req, res) => {
    try {
      const { branchName, issueUrl, taskId, position } = req.body;

      if (!branchName) {
        return res.status(400).json({ error: 'branchName is required' });
      }

      // Validate branchName format
      if (!/^[a-zA-Z0-9/_-]+$/.test(branchName)) {
        return res.status(400).json({
          error: 'branchName contains invalid characters. Use only letters, numbers, -, _, and /'
        });
      }

      const worktree = await worktreeManager.createWorktree({
        branchName,
        issueUrl,
        taskId,
        position
      });

      broadcastEvent('worktree:created', worktree);

      res.status(201).json(worktree);
    } catch (error) {
      logger.error('[API] Failed to create worktree', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/worktrees
   * List all worktrees
   */
  router.get('/worktrees', (req, res) => {
    try {
      const { status } = req.query;
      const worktrees = worktreeManager.listWorktrees(status ? { status } : {});
      res.json(worktrees);
    } catch (error) {
      logger.error('[API] Failed to list worktrees', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/worktrees/:id
   * Get specific worktree
   */
  router.get('/worktrees/:id', (req, res) => {
    try {
      const worktree = worktreeManager.getWorktree(req.params.id);
      if (!worktree) {
        return res.status(404).json({ error: 'Worktree not found' });
      }
      res.json(worktree);
    } catch (error) {
      logger.error('[API] Failed to get worktree', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * PUT /api/worktrees/:id
   * Update worktree
   */
  router.put('/worktrees/:id', async (req, res) => {
    try {
      const { status, position, issueUrl, taskId } = req.body;
      const updates = {};

      if (status) updates.status = status;
      if (position) updates.position = position;
      if (issueUrl !== undefined) updates.issueUrl = issueUrl;
      if (taskId !== undefined) updates.taskId = taskId;

      const worktree = await worktreeManager.updateWorktree(req.params.id, updates);

      broadcastEvent('worktree:updated', worktree);

      res.json(worktree);
    } catch (error) {
      logger.error('[API] Failed to update worktree', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * DELETE /api/worktrees/:id
   * Delete worktree
   */
  router.delete('/worktrees/:id', async (req, res) => {
    try {
      await worktreeManager.deleteWorktree(req.params.id);

      broadcastEvent('worktree:deleted', { worktreeId: req.params.id });

      res.status(204).send();
    } catch (error) {
      logger.error('[API] Failed to delete worktree', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // ========== Zone Endpoints ==========

  /**
   * POST /api/zones
   * Create a new zone
   */
  router.post('/zones', (req, res) => {
    try {
      const { name, description, trigger, agents, promptTemplate, actions, position, size } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'name is required' });
      }

      const zone = zoneManager.createZone({
        name,
        description,
        trigger,
        agents,
        promptTemplate,
        actions,
        position,
        size
      });

      res.status(201).json(zone);
    } catch (error) {
      logger.error('[API] Failed to create zone', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/zones
   * List all zones
   */
  router.get('/zones', (req, res) => {
    try {
      const zones = zoneManager.listZones();
      res.json(zones);
    } catch (error) {
      logger.error('[API] Failed to list zones', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/zones/:id
   * Get specific zone
   */
  router.get('/zones/:id', (req, res) => {
    try {
      const zone = zoneManager.getZone(req.params.id);
      if (!zone) {
        return res.status(404).json({ error: 'Zone not found' });
      }
      res.json(zone);
    } catch (error) {
      logger.error('[API] Failed to get zone', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * PUT /api/zones/:id
   * Update zone
   */
  router.put('/zones/:id', (req, res) => {
    try {
      const { name, description, trigger, agents, promptTemplate, actions, position, size } = req.body;
      const updates = {};

      if (name) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (trigger) updates.trigger = trigger;
      if (agents) updates.agents = agents;
      if (promptTemplate !== undefined) updates.promptTemplate = promptTemplate;
      if (actions) updates.actions = actions;
      if (position) updates.position = position;
      if (size) updates.size = size;

      const zone = zoneManager.updateZone(req.params.id, updates);
      res.json(zone);
    } catch (error) {
      logger.error('[API] Failed to update zone', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * DELETE /api/zones/:id
   * Delete zone
   */
  router.delete('/zones/:id', (req, res) => {
    try {
      zoneManager.deleteZone(req.params.id);
      res.status(204).send();
    } catch (error) {
      logger.error('[API] Failed to delete zone', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // ========== Assignment Endpoint ==========

  /**
   * POST /api/zones/:zoneId/assign/:worktreeId
   * Assign worktree to zone
   */
  router.post('/zones/:zoneId/assign/:worktreeId', async (req, res) => {
    try {
      const { zoneId, worktreeId } = req.params;

      // Get worktree details
      const worktree = worktreeManager.getWorktree(worktreeId);
      if (!worktree) {
        return res.status(404).json({ error: 'Worktree not found' });
      }

      // Assign to zone (this will trigger execution if zone has onDrop trigger)
      const result = await zoneManager.assignWorktreeToZone(worktreeId, zoneId, worktree);

      res.json(result);
    } catch (error) {
      logger.error('[API] Failed to assign worktree to zone', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * DELETE /api/zones/assign/:worktreeId
   * Remove worktree from zone
   */
  router.delete('/zones/assign/:worktreeId', (req, res) => {
    try {
      zoneManager.removeWorktreeFromZone(req.params.worktreeId);
      res.status(204).send();
    } catch (error) {
      logger.error('[API] Failed to remove worktree from zone', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/zones/:zoneId/worktrees
   * Get all worktrees in a zone
   */
  router.get('/zones/:zoneId/worktrees', (req, res) => {
    try {
      const worktrees = database.getWorktreesInZone(req.params.zoneId);
      res.json(worktrees);
    } catch (error) {
      logger.error('[API] Failed to get worktrees in zone', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/zones/:zoneId/executions
   * Get execution history for a zone
   */
  router.get('/zones/:zoneId/executions', (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 100;
      const executions = database.getExecutionHistory(req.params.zoneId, limit);
      res.json(executions);
    } catch (error) {
      logger.error('[API] Failed to get execution history', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/worktrees/ports/status
   * Get port allocation status
   */
  router.get('/worktrees/ports/status', (req, res) => {
    try {
      const status = worktreeManager.getPortAllocationStatus();
      res.json(status);
    } catch (error) {
      logger.error('[API] Failed to get port status', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

export default createPhase9Routes;
