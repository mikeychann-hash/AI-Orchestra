/**
 * Zone Manager
 * Manages workflow zones with triggers and automation
 */

import EventEmitter from 'events';
import logger from '../logger.js';
import { VisualDatabase } from '../database/visual_db.js';

export class ZoneManager extends EventEmitter {
  constructor(config = {}) {
    super();
    this.db = config.database || new VisualDatabase();
    this.githubContextProvider = config.githubContextProvider;
    this.llmBridge = config.llmBridge;
  }

  /**
   * Create a new zone
   */
  createZone(zone) {
    const zoneId = zone.id || this._generateZoneId();
    const zoneData = {
      id: zoneId,
      name: zone.name,
      description: zone.description,
      trigger: zone.trigger || 'onDrop',
      agents: zone.agents || [],
      promptTemplate: zone.promptTemplate || '',
      actions: zone.actions || [],
      position: zone.position || { x: 0, y: 0 },
      size: zone.size || { width: 300, height: 200 },
      createdAt: new Date().toISOString()
    };

    this.db.createZone(zoneData);
    this.emit('zone:created', zoneData);

    logger.info('[ZoneManager] Zone created', { id: zoneId, name: zone.name });
    return zoneData;
  }

  /**
   * Get zone by ID
   */
  getZone(zoneId) {
    return this.db.getZone(zoneId);
  }

  /**
   * List all zones
   */
  listZones() {
    return this.db.listZones();
  }

  /**
   * Update zone
   */
  updateZone(zoneId, updates) {
    const zone = this.db.getZone(zoneId);
    if (!zone) {
      throw new Error(`Zone not found: ${zoneId}`);
    }

    const updated = this.db.updateZone(zoneId, updates);
    this.emit('zone:updated', updated);

    logger.info('[ZoneManager] Zone updated', { id: zoneId });
    return updated;
  }

  /**
   * Delete zone
   */
  deleteZone(zoneId) {
    const zone = this.db.getZone(zoneId);
    if (!zone) {
      throw new Error(`Zone not found: ${zoneId}`);
    }

    this.db.deleteZone(zoneId);
    this.emit('zone:deleted', { zoneId });

    logger.info('[ZoneManager] Zone deleted', { id: zoneId });
  }

  /**
   * Assign worktree to zone (drag-and-drop)
   */
  async assignWorktreeToZone(worktreeId, zoneId, worktree) {
    const zone = this.db.getZone(zoneId);
    if (!zone) {
      throw new Error(`Zone not found: ${zoneId}`);
    }

    const previousZone = this.db.getWorktreeZone(worktreeId);
    this.db.assignWorktreeToZone(worktreeId, zoneId);

    this.emit('worktree:assigned', {
      worktreeId,
      zoneId,
      previousZone
    });

    logger.info('[ZoneManager] Worktree assigned to zone', {
      worktreeId,
      zoneId
    });

    if (zone.trigger === 'onDrop') {
      logger.info('[ZoneManager] Executing zone trigger', { worktreeId, zoneId });
      return await this._executeTrigger(zone, worktree);
    }

    return { success: true, triggered: false };
  }

  /**
   * Remove worktree from zone
   */
  removeWorktreeFromZone(worktreeId) {
    const zoneId = this.db.getWorktreeZone(worktreeId);
    this.db.removeWorktreeFromZone(worktreeId);

    this.emit('worktree:removed', { worktreeId, zoneId });

    logger.info('[ZoneManager] Worktree removed from zone', { worktreeId });
  }

  /**
   * Execute zone trigger
   */
  async _executeTrigger(zone, worktree) {
    try {
      let githubContext = null;
      if (worktree.issueUrl && this.githubContextProvider) {
        githubContext = await this.githubContextProvider.getContextFromUrl(worktree.issueUrl);
      }

      const prompt = this.githubContextProvider ?
        this.githubContextProvider.injectContext(zone.promptTemplate, githubContext, worktree) :
        zone.promptTemplate;

      const results = [];
      for (const agentType of zone.agents) {
        logger.info('[ZoneManager] Executing agent', {
          agentType,
          worktreeId: worktree.id
        });

        if (!this.llmBridge) {
          logger.warn('[ZoneManager] LLM Bridge not configured, skipping execution');
          continue;
        }

        const result = await this.llmBridge.query({
          prompt,
          metadata: {
            agentType,
            worktreeId: worktree.id,
            zoneId: zone.id,
            githubContext
          }
        });

        results.push({
          agentType,
          result,
          success: true
        });

        this.db.recordExecution({
          zoneId: zone.id,
          worktreeId: worktree.id,
          agentType,
          prompt,
          result,
          success: true
        });
      }

      for (const action of zone.actions) {
        await this._executeAction(action, worktree, githubContext);
      }

      this.emit('trigger:executed', {
        zoneId: zone.id,
        worktreeId: worktree.id,
        results
      });

      return { success: true, results };
    } catch (error) {
      logger.error('[ZoneManager] Trigger execution failed', {
        error: error.message,
        zoneId: zone.id,
        worktreeId: worktree.id
      });

      this.emit('trigger:failed', {
        zoneId: zone.id,
        worktreeId: worktree.id,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Execute zone action
   */
  async _executeAction(action, worktree, githubContext) {
    switch (action.type) {
      case 'runTests':
        logger.info('[ZoneManager] Running tests', { worktreeId: worktree.id });
        break;
      case 'createPR':
        logger.info('[ZoneManager] Creating PR', { worktreeId: worktree.id });
        break;
      case 'notify':
        logger.info('[ZoneManager] Sending notification', { message: action.message });
        break;
      default:
        logger.warn('[ZoneManager] Unknown action type', { type: action.type });
    }
  }

  /**
   * Generate unique zone ID
   */
  _generateZoneId() {
    return `zone-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }
}

export default ZoneManager;
