/**
 * Worktree Manager
 * Manages Git worktrees for isolated development environments
 */

import { execSync, exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import net from 'net';
import logger from '../logger.js';
import { VisualDatabase } from '../database/visual_db.js';

const execAsync = promisify(exec);

export class WorktreeManager {
  constructor(config = {}) {
    this.repoPath = config.repoPath || process.cwd();
    this.worktreeBasePath = config.worktreeBasePath || '.worktrees';
    this.portRange = config.portRange || { min: 3001, max: 3999 };
    this.db = config.database || new VisualDatabase();

    // Ensure worktree base directory exists
    const basePath = path.join(this.repoPath, this.worktreeBasePath);
    if (!fs.existsSync(basePath)) {
      fs.mkdirSync(basePath, { recursive: true });
    }

    logger.info('[WorktreeManager] Initialized', {
      repoPath: this.repoPath,
      basePath: this.worktreeBasePath,
      portRange: this.portRange
    });
  }

  /**
   * Create a new worktree
   */
  async createWorktree(options) {
    try {
      const worktreeId = this._generateWorktreeId();
      const port = await this._allocatePort();
      const worktreePath = this._getWorktreePath(worktreeId);

      logger.info('[WorktreeManager] Creating worktree', {
        id: worktreeId,
        branch: options.branchName,
        port
      });

      const branchExists = await this._branchExists(options.branchName);

      if (branchExists) {
        await this._executeGitWorktreeAdd(worktreePath, options.branchName, false);
      } else {
        await this._executeGitWorktreeAdd(worktreePath, options.branchName, true);
      }

      const worktree = {
        id: worktreeId,
        path: worktreePath,
        port,
        branchName: options.branchName,
        issueUrl: options.issueUrl,
        taskId: options.taskId,
        createdAt: new Date().toISOString(),
        status: 'active',
        position: options.position || { x: 100, y: 100 }
      };

      this.db.createWorktree(worktree);
      return worktree;
    } catch (error) {
      logger.error('[WorktreeManager] Failed to create worktree', {
        error: error.message,
        branch: options.branchName
      });
      throw error;
    }
  }

  getWorktree(worktreeId) {
    return this.db.getWorktree(worktreeId);
  }

  listWorktrees(filters = {}) {
    return this.db.listWorktrees(filters);
  }

  async updateWorktree(worktreeId, updates) {
    const worktree = this.db.getWorktree(worktreeId);
    if (!worktree) {
      throw new Error(`Worktree not found: ${worktreeId}`);
    }
    return this.db.updateWorktree(worktreeId, updates);
  }

  async deleteWorktree(worktreeId) {
    const worktree = this.db.getWorktree(worktreeId);
    if (!worktree) {
      throw new Error(`Worktree not found: ${worktreeId}`);
    }

    await this._executeGitWorktreeRemove(worktree.path);
    this.db.deleteWorktree(worktreeId);
    this.db.removeWorktreeFromZone(worktreeId);
  }

  async _allocatePort() {
    const worktrees = this.listWorktrees({ status: 'active' });
    const allocatedPorts = new Set(worktrees.map(wt => wt.port));

    for (let port = this.portRange.min; port <= this.portRange.max; port++) {
      if (!allocatedPorts.has(port)) {
        const isAvailable = await this._isPortAvailable(port);
        if (isAvailable) {
          return port;
        }
      }
    }
    throw new Error('No available ports in range');
  }

  async _isPortAvailable(port) {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => {
        server.close();
        resolve(true);
      });
      server.listen(port);
    });
  }

  async _branchExists(branchName) {
    try {
      await execAsync(`git rev-parse --verify ${branchName}`, { cwd: this.repoPath });
      return true;
    } catch (error) {
      return false;
    }
  }

  async _executeGitWorktreeAdd(path, branchName, createNew) {
    const cmd = createNew ? 
      `git worktree add "${path}" -b ${branchName}` :
      `git worktree add "${path}" ${branchName}`;
    await execAsync(cmd, { cwd: this.repoPath });
  }

  async _executeGitWorktreeRemove(path) {
    await execAsync(`git worktree remove "${path}" --force`, { cwd: this.repoPath });
  }

  _generateWorktreeId() {
    return `wt-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  _getWorktreePath(worktreeId) {
    return path.join(this.repoPath, this.worktreeBasePath, worktreeId);
  }
}

export default WorktreeManager;
