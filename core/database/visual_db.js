/**
 * Visual Orchestration Database
 * SQLite-based storage for worktrees, zones, and execution history
 * Provides comprehensive CRUD operations with transaction support
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import logger from '../logger.js';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class VisualDatabase {
  constructor(config = {}) {
    const dbPath = config.dbPath || path.join(process.cwd(), 'data', 'visual.db');

    // Ensure data directory exists
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this._initSchema();

    logger.info('[VisualDB] Database initialized', { path: dbPath });
  }

  /**
   * Initialize database schema
   */
  _initSchema() {
    // Worktrees table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS worktrees (
        id TEXT PRIMARY KEY,
        path TEXT NOT NULL,
        port INTEGER NOT NULL,
        branch_name TEXT NOT NULL,
        issue_url TEXT,
        task_id TEXT,
        status TEXT DEFAULT 'active',
        position_x INTEGER DEFAULT 0,
        position_y INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT,
        UNIQUE(port)
      )
    `);

    // Zones table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS zones (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        trigger TEXT DEFAULT 'onDrop',
        agents TEXT,
        prompt_template TEXT,
        actions TEXT,
        position_x INTEGER DEFAULT 0,
        position_y INTEGER DEFAULT 0,
        size_width INTEGER DEFAULT 300,
        size_height INTEGER DEFAULT 200,
        created_at TEXT NOT NULL,
        updated_at TEXT
      )
    `);

    // Worktree-Zone assignments
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS worktree_zones (
        worktree_id TEXT NOT NULL,
        zone_id TEXT NOT NULL,
        assigned_at TEXT NOT NULL,
        PRIMARY KEY (worktree_id),
        FOREIGN KEY (worktree_id) REFERENCES worktrees(id) ON DELETE CASCADE,
        FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE CASCADE
      )
    `);

    // Execution history
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS zone_executions (
        id TEXT PRIMARY KEY,
        zone_id TEXT NOT NULL,
        worktree_id TEXT NOT NULL,
        agent_type TEXT NOT NULL,
        prompt TEXT NOT NULL,
        result TEXT,
        success INTEGER DEFAULT 1,
        executed_at TEXT NOT NULL,
        FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE CASCADE,
        FOREIGN KEY (worktree_id) REFERENCES worktrees(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_worktrees_status ON worktrees(status);
      CREATE INDEX IF NOT EXISTS idx_zones_trigger ON zones(trigger);
      CREATE INDEX IF NOT EXISTS idx_executions_zone ON zone_executions(zone_id);
      CREATE INDEX IF NOT EXISTS idx_executions_worktree ON zone_executions(worktree_id);
    `);
  }

  // ========== Worktree Methods ==========

  /**
   * Create a new worktree
   */
  createWorktree(worktree) {
    const stmt = this.db.prepare(`
      INSERT INTO worktrees (id, path, port, branch_name, issue_url, task_id, status, position_x, position_y, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      stmt.run(
        worktree.id,
        worktree.path,
        worktree.port,
        worktree.branchName,
        worktree.issueUrl || null,
        worktree.taskId || null,
        worktree.status || 'active',
        worktree.position?.x || 0,
        worktree.position?.y || 0,
        worktree.createdAt || new Date().toISOString()
      );

      logger.info('[VisualDB] Worktree created', { id: worktree.id });
      return this.getWorktree(worktree.id);
    } catch (error) {
      logger.error('[VisualDB] Failed to create worktree', {
        error: error.message,
        worktree: worktree.id
      });
      throw error;
    }
  }

  /**
   * Get worktree by ID
   */
  getWorktree(id) {
    const stmt = this.db.prepare('SELECT * FROM worktrees WHERE id = ?');
    const row = stmt.get(id);

    if (!row) return null;

    return this._rowToWorktree(row);
  }

  /**
   * List all worktrees
   */
  listWorktrees(filters = {}) {
    let query = 'SELECT * FROM worktrees WHERE 1=1';
    const params = [];

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    query += ' ORDER BY created_at DESC';

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params);

    return rows.map(row => this._rowToWorktree(row));
  }

  /**
   * Update worktree
   */
  updateWorktree(id, updates) {
    const allowedFields = ['status', 'position_x', 'position_y', 'issue_url', 'task_id'];
    const fields = [];
    const values = [];

    Object.keys(updates).forEach(key => {
      const dbKey = key === 'position' ? null :
                    key === 'issueUrl' ? 'issue_url' :
                    key === 'taskId' ? 'task_id' :
                    key;

      if (dbKey && allowedFields.includes(dbKey)) {
        fields.push(`${dbKey} = ?`);
        values.push(updates[key]);
      }
    });

    if (updates.position) {
      if (updates.position.x !== undefined) {
        fields.push('position_x = ?');
        values.push(updates.position.x);
      }
      if (updates.position.y !== undefined) {
        fields.push('position_y = ?');
        values.push(updates.position.y);
      }
    }

    if (fields.length === 0) return this.getWorktree(id);

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    const query = `UPDATE worktrees SET ${fields.join(', ')} WHERE id = ?`;
    const stmt = this.db.prepare(query);
    stmt.run(...values);

    return this.getWorktree(id);
  }

  /**
   * Delete worktree
   */
  deleteWorktree(id) {
    const stmt = this.db.prepare('DELETE FROM worktrees WHERE id = ?');

    try {
      const result = stmt.run(id);
      if (result.changes === 0) {
        throw new Error(`Worktree not found: ${id}`);
      }
      logger.info('[VisualDB] Worktree deleted', { id });
      return true;
    } catch (error) {
      logger.error('[VisualDB] Failed to delete worktree', {
        error: error.message,
        id
      });
      throw error;
    }
  }

  // ========== Zone Methods ==========

  /**
   * Create a new zone
   */
  createZone(zone) {
    const stmt = this.db.prepare(`
      INSERT INTO zones (id, name, description, trigger, agents, prompt_template, actions, position_x, position_y, size_width, size_height, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      zone.id,
      zone.name,
      zone.description || null,
      zone.trigger || 'onDrop',
      JSON.stringify(zone.agents || []),
      zone.promptTemplate || '',
      JSON.stringify(zone.actions || []),
      zone.position?.x || 0,
      zone.position?.y || 0,
      zone.size?.width || 300,
      zone.size?.height || 200,
      zone.createdAt
    );

    return this.getZone(zone.id);
  }

  /**
   * Get zone by ID
   */
  getZone(id) {
    const stmt = this.db.prepare('SELECT * FROM zones WHERE id = ?');
    const row = stmt.get(id);

    if (!row) return null;

    return this._rowToZone(row);
  }

  /**
   * List all zones
   */
  listZones() {
    const stmt = this.db.prepare('SELECT * FROM zones ORDER BY created_at DESC');
    const rows = stmt.all();

    return rows.map(row => this._rowToZone(row));
  }

  /**
   * Update zone
   */
  updateZone(id, updates) {
    const allowedFields = ['name', 'description', 'trigger', 'agents', 'prompt_template', 'actions', 'position_x', 'position_y', 'size_width', 'size_height'];
    const fields = [];
    const values = [];

    Object.keys(updates).forEach(key => {
      const dbKey = key === 'promptTemplate' ? 'prompt_template' :
                    key === 'position' ? null :
                    key === 'size' ? null :
                    key;

      if (dbKey && allowedFields.includes(dbKey)) {
        if (dbKey === 'agents' || dbKey === 'actions') {
          fields.push(`${dbKey} = ?`);
          values.push(JSON.stringify(updates[key]));
        } else {
          fields.push(`${dbKey} = ?`);
          values.push(updates[key]);
        }
      }
    });

    if (updates.position) {
      if (updates.position.x !== undefined) {
        fields.push('position_x = ?');
        values.push(updates.position.x);
      }
      if (updates.position.y !== undefined) {
        fields.push('position_y = ?');
        values.push(updates.position.y);
      }
    }

    if (updates.size) {
      if (updates.size.width !== undefined) {
        fields.push('size_width = ?');
        values.push(updates.size.width);
      }
      if (updates.size.height !== undefined) {
        fields.push('size_height = ?');
        values.push(updates.size.height);
      }
    }

    if (fields.length === 0) return this.getZone(id);

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    const query = `UPDATE zones SET ${fields.join(', ')} WHERE id = ?`;
    const stmt = this.db.prepare(query);
    stmt.run(...values);

    return this.getZone(id);
  }

  /**
   * Delete zone
   */
  deleteZone(id) {
    const stmt = this.db.prepare('DELETE FROM zones WHERE id = ?');

    try {
      const result = stmt.run(id);
      if (result.changes === 0) {
        throw new Error(`Zone not found: ${id}`);
      }
      logger.info('[VisualDB] Zone deleted', { id });
      return true;
    } catch (error) {
      logger.error('[VisualDB] Failed to delete zone', {
        error: error.message,
        id
      });
      throw error;
    }
  }

  // ========== Assignment Methods ==========

  /**
   * Assign worktree to zone
   */
  assignWorktreeToZone(worktreeId, zoneId) {
    // Remove previous assignment if exists
    this.removeWorktreeFromZone(worktreeId);

    const stmt = this.db.prepare(`
      INSERT INTO worktree_zones (worktree_id, zone_id, assigned_at)
      VALUES (?, ?, ?)
    `);

    stmt.run(worktreeId, zoneId, new Date().toISOString());
    return true;
  }

  /**
   * Get worktree's zone assignment
   */
  getWorktreeZone(worktreeId) {
    const stmt = this.db.prepare('SELECT zone_id FROM worktree_zones WHERE worktree_id = ?');
    const row = stmt.get(worktreeId);
    return row ? row.zone_id : null;
  }

  /**
   * Remove worktree from zone
   */
  removeWorktreeFromZone(worktreeId) {
    const stmt = this.db.prepare('DELETE FROM worktree_zones WHERE worktree_id = ?');
    stmt.run(worktreeId);
    return true;
  }

  /**
   * Get all worktrees in a zone
   */
  getWorktreesInZone(zoneId) {
    const stmt = this.db.prepare(`
      SELECT w.* FROM worktrees w
      JOIN worktree_zones wz ON w.id = wz.worktree_id
      WHERE wz.zone_id = ?
    `);
    const rows = stmt.all(zoneId);
    return rows.map(row => this._rowToWorktree(row));
  }

  // ========== Execution History Methods ==========

  /**
   * Record zone execution
   */
  recordExecution(execution) {
    const stmt = this.db.prepare(`
      INSERT INTO zone_executions (id, zone_id, worktree_id, agent_type, prompt, result, success, executed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const id = `exec-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    stmt.run(
      id,
      execution.zoneId,
      execution.worktreeId,
      execution.agentType,
      execution.prompt,
      JSON.stringify(execution.result),
      execution.success ? 1 : 0,
      new Date().toISOString()
    );

    return id;
  }

  /**
   * Get execution history for a zone
   */
  getExecutionHistory(zoneId, limit = 100) {
    const stmt = this.db.prepare(`
      SELECT * FROM zone_executions
      WHERE zone_id = ?
      ORDER BY executed_at DESC
      LIMIT ?
    `);

    const rows = stmt.all(zoneId, limit);
    return rows.map(row => ({
      id: row.id,
      zoneId: row.zone_id,
      worktreeId: row.worktree_id,
      agentType: row.agent_type,
      prompt: row.prompt,
      result: JSON.parse(row.result || '{}'),
      success: Boolean(row.success),
      executedAt: row.executed_at
    }));
  }

  /**
   * Get execution history for a worktree
   */
  getWorktreeExecutions(worktreeId, limit = 100) {
    const stmt = this.db.prepare(`
      SELECT * FROM zone_executions
      WHERE worktree_id = ?
      ORDER BY executed_at DESC
      LIMIT ?
    `);

    const rows = stmt.all(worktreeId, limit);
    return rows.map(row => ({
      id: row.id,
      zoneId: row.zone_id,
      worktreeId: row.worktree_id,
      agentType: row.agent_type,
      prompt: row.prompt,
      result: JSON.parse(row.result || '{}'),
      success: Boolean(row.success),
      executedAt: row.executed_at
    }));
  }

  /**
   * Get execution statistics
   */
  getExecutionStats(filters = {}) {
    let query = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful,
        SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed,
        COUNT(DISTINCT agent_type) as unique_agents
      FROM zone_executions
    `;

    const params = [];
    const conditions = [];

    if (filters.zoneId) {
      conditions.push('zone_id = ?');
      params.push(filters.zoneId);
    }

    if (filters.worktreeId) {
      conditions.push('worktree_id = ?');
      params.push(filters.worktreeId);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    const stmt = this.db.prepare(query);
    const row = stmt.get(...params);

    return {
      total: row.total || 0,
      successful: row.successful || 0,
      failed: row.failed || 0,
      uniqueAgents: row.unique_agents || 0,
      successRate: row.total > 0 ? (row.successful / row.total) * 100 : 0
    };
  }

  // ========== Transaction Support ==========

  /**
   * Execute operations in a transaction
   */
  transaction(callback) {
    const transaction = this.db.transaction(callback);
    try {
      return transaction();
    } catch (error) {
      logger.error('[VisualDB] Transaction failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get database statistics
   */
  getStats() {
    const worktreeCount = this.db.prepare('SELECT COUNT(*) as count FROM worktrees').get();
    const zoneCount = this.db.prepare('SELECT COUNT(*) as count FROM zones').get();
    const assignmentCount = this.db.prepare('SELECT COUNT(*) as count FROM worktree_zones').get();
    const executionCount = this.db.prepare('SELECT COUNT(*) as count FROM zone_executions').get();

    return {
      worktrees: worktreeCount.count,
      zones: zoneCount.count,
      assignments: assignmentCount.count,
      executions: executionCount.count
    };
  }

  // ========== Helper Methods ==========

  /**
   * Convert database row to worktree object
   */
  _rowToWorktree(row) {
    return {
      id: row.id,
      path: row.path,
      port: row.port,
      branchName: row.branch_name,
      issueUrl: row.issue_url,
      taskId: row.task_id,
      status: row.status,
      position: {
        x: row.position_x,
        y: row.position_y
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Convert database row to zone object
   */
  _rowToZone(row) {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      trigger: row.trigger,
      agents: JSON.parse(row.agents || '[]'),
      promptTemplate: row.prompt_template,
      actions: JSON.parse(row.actions || '[]'),
      position: {
        x: row.position_x,
        y: row.position_y
      },
      size: {
        width: row.size_width,
        height: row.size_height
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Close database connection
   */
  close() {
    this.db.close();
    logger.info('[VisualDB] Database connection closed');
  }
}

export default VisualDatabase;
