# Phase 9: Visual Orchestration - Implementation Plan

## Executive Summary

This document outlines the implementation plan for integrating Agor's best visual and workflow features into AI-Orchestra while maintaining our production-grade infrastructure. The goal is to create a "best of both worlds" solution with an intuitive visual interface backed by enterprise-grade systems.

**Timeline**: 6-8 weeks
**Risk Level**: Medium
**ROI**: High - Combines Agor's innovative UX with AI-Orchestra's mature infrastructure

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Component Specifications](#component-specifications)
3. [Implementation Phases](#implementation-phases)
4. [Technical Requirements](#technical-requirements)
5. [Migration Strategy](#migration-strategy)
6. [Testing Strategy](#testing-strategy)
7. [Rollout Plan](#rollout-plan)

---

## Architecture Overview

### Current State

```
┌─ Next.js Dashboard (Monitoring Only) ────┐
│  - Static cards and lists                 │
│  - Read-only data visualization           │
│  - No interaction with workflows          │
└────────────────────────────────────────────┘
```

### Future State (Phase 9)

```
┌─ Next.js Dashboard with Visual Canvas ────────────────────┐
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │            Interactive Workflow Canvas                │ │
│  │                                                        │ │
│  │  ┌──────────┐      ┌──────────┐      ┌──────────┐   │ │
│  │  │Development│ ───> │  Testing │ ───> │  Review  │   │ │
│  │  │   Zone    │      │   Zone   │      │   Zone   │   │ │
│  │  └──────────┘      └──────────┘      └──────────┘   │ │
│  │                                                        │ │
│  │  Worktree Cards (Draggable):                          │ │
│  │  ┌─────────────────┐  ┌─────────────────┐            │ │
│  │  │ issue-123       │  │ feature-456     │            │ │
│  │  │ Frontend Agent  │  │ Backend Agent   │            │ │
│  │  │ Port: 3001      │  │ Port: 3002      │            │ │
│  │  └─────────────────┘  └─────────────────┘            │ │
│  │                                                        │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  Real-time Updates | Agent Status | GitHub Context       │
└────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              New Backend Services (Core System)             │
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────┐ │
│  │ WorktreeManager  │  │GitHubContext     │  │  Zone    │ │
│  │                  │  │Provider Enhanced │  │ Manager  │ │
│  │ - Create/delete  │  │                  │  │          │ │
│  │ - Port assignment│  │ - Parse issue    │  │ - Trigger│ │
│  │ - Git operations │  │ - Inject context │  │ - Execute│ │
│  └──────────────────┘  └──────────────────┘  └──────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │  Existing Systems   │
                   │                     │
                   │  - LLM Bridge       │
                   │  - Agents           │
                   │  - Monitoring       │
                   └─────────────────────┘
```

---

## Component Specifications

### 1. WorktreeManager

**Location**: `/core/worktree/worktree_manager.js`

**Responsibilities**:
- Create and manage Git worktrees
- Assign unique ports to avoid conflicts
- Link worktrees to GitHub issues/PRs
- Clean up abandoned worktrees
- Track worktree status and metadata

**API Design**:

```javascript
class WorktreeManager {
  constructor(config) {
    this.repoPath = config.repoPath || process.cwd();
    this.worktreeBasePath = config.worktreeBasePath || '.worktrees';
    this.portRange = config.portRange || { min: 3001, max: 3999 };
    this.activeWorktrees = new Map(); // worktreeId -> metadata
    this.portAllocations = new Map(); // port -> worktreeId
  }

  /**
   * Create a new worktree
   * @param {Object} options
   * @param {string} options.branchName - Branch name for worktree
   * @param {string} options.issueUrl - GitHub issue URL (optional)
   * @param {string} options.taskId - Unique task identifier
   * @returns {Promise<Worktree>}
   */
  async createWorktree(options) {
    const worktreeId = this._generateWorktreeId();
    const port = await this._allocatePort();
    const path = this._getWorktreePath(worktreeId);

    // Git operations
    await this._executeGitWorktreeAdd(path, options.branchName);

    // Store metadata
    const worktree = {
      id: worktreeId,
      path,
      port,
      branchName: options.branchName,
      issueUrl: options.issueUrl,
      taskId: options.taskId,
      createdAt: new Date().toISOString(),
      status: 'active'
    };

    this.activeWorktrees.set(worktreeId, worktree);
    this.portAllocations.set(port, worktreeId);

    return worktree;
  }

  /**
   * Get worktree by ID
   * @param {string} worktreeId
   * @returns {Worktree|null}
   */
  getWorktree(worktreeId) {
    return this.activeWorktrees.get(worktreeId) || null;
  }

  /**
   * List all active worktrees
   * @returns {Array<Worktree>}
   */
  listWorktrees() {
    return Array.from(this.activeWorktrees.values());
  }

  /**
   * Update worktree status
   * @param {string} worktreeId
   * @param {Object} updates
   * @returns {Worktree}
   */
  async updateWorktree(worktreeId, updates) {
    const worktree = this.activeWorktrees.get(worktreeId);
    if (!worktree) {
      throw new Error(`Worktree not found: ${worktreeId}`);
    }

    Object.assign(worktree, updates, { updatedAt: new Date().toISOString() });
    this.activeWorktrees.set(worktreeId, worktree);

    return worktree;
  }

  /**
   * Delete a worktree
   * @param {string} worktreeId
   * @returns {Promise<void>}
   */
  async deleteWorktree(worktreeId) {
    const worktree = this.activeWorktrees.get(worktreeId);
    if (!worktree) {
      throw new Error(`Worktree not found: ${worktreeId}`);
    }

    // Git cleanup
    await this._executeGitWorktreeRemove(worktree.path);

    // Release resources
    this.portAllocations.delete(worktree.port);
    this.activeWorktrees.delete(worktreeId);
  }

  /**
   * Assign unique port
   * @returns {Promise<number>}
   */
  async _allocatePort() {
    for (let port = this.portRange.min; port <= this.portRange.max; port++) {
      if (!this.portAllocations.has(port)) {
        const isAvailable = await this._isPortAvailable(port);
        if (isAvailable) {
          return port;
        }
      }
    }
    throw new Error('No available ports in range');
  }

  /**
   * Check if port is available
   * @param {number} port
   * @returns {Promise<boolean>}
   */
  async _isPortAvailable(port) {
    const net = await import('net');
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

  /**
   * Execute git worktree add
   * @param {string} path
   * @param {string} branchName
   * @returns {Promise<void>}
   */
  async _executeGitWorktreeAdd(path, branchName) {
    const { execSync } = await import('child_process');
    execSync(`git worktree add ${path} -b ${branchName}`, {
      cwd: this.repoPath,
      stdio: 'pipe'
    });
  }

  /**
   * Execute git worktree remove
   * @param {string} path
   * @returns {Promise<void>}
   */
  async _executeGitWorktreeRemove(path) {
    const { execSync } = await import('child_process');
    execSync(`git worktree remove ${path} --force`, {
      cwd: this.repoPath,
      stdio: 'pipe'
    });
  }

  /**
   * Generate unique worktree ID
   * @returns {string}
   */
  _generateWorktreeId() {
    return `wt-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Get worktree path
   * @param {string} worktreeId
   * @returns {string}
   */
  _getWorktreePath(worktreeId) {
    const path = await import('path');
    return path.join(this.repoPath, this.worktreeBasePath, worktreeId);
  }
}

export default WorktreeManager;
```

**Dependencies**: None (uses Node.js built-ins)

**Testing Requirements**:
- Unit tests for port allocation logic
- Integration tests for Git operations
- Edge case handling (concurrent creation, cleanup failures)

---

### 2. GitHubContextProvider (Enhanced)

**Location**: `/core/integrations/github_context_provider.js`

**Responsibilities**:
- Extend existing GitHubIntegration
- Parse GitHub issue/PR URLs and extract context
- Template variable injection ({{ worktree.issue_url }})
- Cache GitHub data to reduce API calls

**API Design**:

```javascript
import { GitHubIntegration } from './github_integration.js';
import logger from '../logger.js';

export class GitHubContextProvider extends GitHubIntegration {
  constructor(config) {
    super(config);
    this.contextCache = new Map(); // url -> context
    this.cacheTimeout = config.cacheTimeout || 300000; // 5 minutes
  }

  /**
   * Extract context from GitHub URL
   * @param {string} url - GitHub issue or PR URL
   * @returns {Promise<Object>} Context object
   */
  async getContextFromUrl(url) {
    // Check cache first
    const cached = this.contextCache.get(url);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      logger.info('[GitHubContext] Using cached context', { url });
      return cached.data;
    }

    const parsed = this._parseGitHubUrl(url);
    if (!parsed) {
      throw new Error(`Invalid GitHub URL: ${url}`);
    }

    let context;
    if (parsed.type === 'issue') {
      const issue = await this.getIssue(parsed.number, parsed.owner, parsed.repo);
      context = {
        type: 'issue',
        number: issue.number,
        title: issue.title,
        description: issue.body || '',
        labels: issue.labels.map(l => l.name),
        state: issue.state,
        author: issue.user.login,
        url: issue.html_url,
        createdAt: issue.created_at,
        updatedAt: issue.updated_at
      };
    } else if (parsed.type === 'pull') {
      const pr = await this.getPullRequest(parsed.number, parsed.owner, parsed.repo);
      context = {
        type: 'pull_request',
        number: pr.number,
        title: pr.title,
        description: pr.body || '',
        labels: pr.labels.map(l => l.name),
        state: pr.state,
        author: pr.user.login,
        url: pr.html_url,
        baseBranch: pr.base.ref,
        headBranch: pr.head.ref,
        createdAt: pr.created_at,
        updatedAt: pr.updated_at
      };
    }

    // Cache the result
    this.contextCache.set(url, {
      data: context,
      timestamp: Date.now()
    });

    return context;
  }

  /**
   * Inject context into prompt template
   * @param {string} template - Prompt template with {{ variables }}
   * @param {Object} context - Context object from getContextFromUrl
   * @param {Object} worktree - Worktree metadata
   * @returns {string} Rendered prompt
   */
  injectContext(template, context, worktree = {}) {
    let rendered = template;

    // Worktree variables
    const worktreeVars = {
      'worktree.id': worktree.id || '',
      'worktree.port': worktree.port || '',
      'worktree.path': worktree.path || '',
      'worktree.branch': worktree.branchName || '',
      'worktree.issue_url': worktree.issueUrl || ''
    };

    // GitHub context variables
    const contextVars = context ? {
      'github.type': context.type || '',
      'github.number': context.number || '',
      'github.title': context.title || '',
      'github.description': context.description || '',
      'github.labels': context.labels ? context.labels.join(', ') : '',
      'github.state': context.state || '',
      'github.author': context.author || '',
      'github.url': context.url || '',
      'github.branch': context.headBranch || context.baseBranch || ''
    } : {};

    // Combine all variables
    const allVars = { ...worktreeVars, ...contextVars };

    // Replace variables in template
    Object.entries(allVars).forEach(([key, value]) => {
      const pattern = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      rendered = rendered.replace(pattern, value);
    });

    return rendered;
  }

  /**
   * Parse GitHub URL
   * @param {string} url
   * @returns {Object|null} { type, owner, repo, number }
   */
  _parseGitHubUrl(url) {
    // Pattern: https://github.com/owner/repo/issues/123
    const issuePattern = /github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/;
    const issueMatch = url.match(issuePattern);
    if (issueMatch) {
      return {
        type: 'issue',
        owner: issueMatch[1],
        repo: issueMatch[2],
        number: parseInt(issueMatch[3])
      };
    }

    // Pattern: https://github.com/owner/repo/pull/123
    const prPattern = /github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/;
    const prMatch = url.match(prPattern);
    if (prMatch) {
      return {
        type: 'pull',
        owner: prMatch[1],
        repo: prMatch[2],
        number: parseInt(prMatch[3])
      };
    }

    return null;
  }

  /**
   * Clear context cache
   */
  clearCache() {
    this.contextCache.clear();
    logger.info('[GitHubContext] Cache cleared');
  }
}

export default GitHubContextProvider;
```

**Dependencies**: Extends existing `GitHubIntegration`

**Testing Requirements**:
- URL parsing tests (issue, PR, invalid URLs)
- Template injection tests (various variable combinations)
- Cache behavior tests (timeout, invalidation)
- API integration tests with GitHub

---

### 3. ZoneManager

**Location**: `/core/zones/zone_manager.js`

**Responsibilities**:
- Define workflow zones with triggers
- Execute templated prompts when worktrees enter zones
- Track zone state and worktree assignments
- Emit events for UI updates

**API Design**:

```javascript
import EventEmitter from 'events';
import logger from '../logger.js';

export class ZoneManager extends EventEmitter {
  constructor(config = {}) {
    super();
    this.zones = new Map(); // zoneId -> zone definition
    this.worktreeZones = new Map(); // worktreeId -> zoneId
    this.githubContextProvider = config.githubContextProvider;
    this.llmBridge = config.llmBridge;
  }

  /**
   * Create a new zone
   * @param {Object} zone
   * @returns {Zone}
   */
  createZone(zone) {
    const zoneId = zone.id || this._generateZoneId();
    const zoneData = {
      id: zoneId,
      name: zone.name,
      description: zone.description,
      trigger: zone.trigger || 'onDrop', // 'onDrop', 'manual', 'scheduled'
      agents: zone.agents || [],
      promptTemplate: zone.promptTemplate || '',
      actions: zone.actions || [], // Additional actions to run
      position: zone.position || { x: 0, y: 0 },
      size: zone.size || { width: 300, height: 200 },
      createdAt: new Date().toISOString()
    };

    this.zones.set(zoneId, zoneData);
    this.emit('zone:created', zoneData);

    return zoneData;
  }

  /**
   * Get zone by ID
   * @param {string} zoneId
   * @returns {Zone|null}
   */
  getZone(zoneId) {
    return this.zones.get(zoneId) || null;
  }

  /**
   * List all zones
   * @returns {Array<Zone>}
   */
  listZones() {
    return Array.from(this.zones.values());
  }

  /**
   * Update zone
   * @param {string} zoneId
   * @param {Object} updates
   * @returns {Zone}
   */
  updateZone(zoneId, updates) {
    const zone = this.zones.get(zoneId);
    if (!zone) {
      throw new Error(`Zone not found: ${zoneId}`);
    }

    Object.assign(zone, updates, { updatedAt: new Date().toISOString() });
    this.zones.set(zoneId, zone);
    this.emit('zone:updated', zone);

    return zone;
  }

  /**
   * Delete zone
   * @param {string} zoneId
   * @returns {void}
   */
  deleteZone(zoneId) {
    const zone = this.zones.get(zoneId);
    if (!zone) {
      throw new Error(`Zone not found: ${zoneId}`);
    }

    // Remove all worktree assignments
    for (const [worktreeId, assignedZoneId] of this.worktreeZones.entries()) {
      if (assignedZoneId === zoneId) {
        this.worktreeZones.delete(worktreeId);
      }
    }

    this.zones.delete(zoneId);
    this.emit('zone:deleted', { zoneId });
  }

  /**
   * Assign worktree to zone (drag-and-drop)
   * @param {string} worktreeId
   * @param {string} zoneId
   * @param {Object} worktree - Worktree metadata
   * @returns {Promise<Object>} Execution result
   */
  async assignWorktreeToZone(worktreeId, zoneId, worktree) {
    const zone = this.zones.get(zoneId);
    if (!zone) {
      throw new Error(`Zone not found: ${zoneId}`);
    }

    // Update assignment
    const previousZone = this.worktreeZones.get(worktreeId);
    this.worktreeZones.set(worktreeId, zoneId);

    this.emit('worktree:assigned', {
      worktreeId,
      zoneId,
      previousZone
    });

    // Execute zone trigger
    if (zone.trigger === 'onDrop') {
      logger.info('[ZoneManager] Executing zone trigger', { worktreeId, zoneId });
      return await this._executeTrigger(zone, worktree);
    }

    return { success: true, triggered: false };
  }

  /**
   * Remove worktree from zone
   * @param {string} worktreeId
   * @returns {void}
   */
  removeWorktreeFromZone(worktreeId) {
    const zoneId = this.worktreeZones.get(worktreeId);
    this.worktreeZones.delete(worktreeId);

    this.emit('worktree:removed', { worktreeId, zoneId });
  }

  /**
   * Execute zone trigger
   * @param {Zone} zone
   * @param {Object} worktree
   * @returns {Promise<Object>}
   */
  async _executeTrigger(zone, worktree) {
    try {
      // Get GitHub context if available
      let githubContext = null;
      if (worktree.issueUrl && this.githubContextProvider) {
        githubContext = await this.githubContextProvider.getContextFromUrl(worktree.issueUrl);
      }

      // Inject context into prompt template
      const prompt = this.githubContextProvider.injectContext(
        zone.promptTemplate,
        githubContext,
        worktree
      );

      // Execute for each agent in zone
      const results = [];
      for (const agentType of zone.agents) {
        logger.info('[ZoneManager] Executing agent', { agentType, worktreeId: worktree.id });

        const result = await this.llmBridge.query({
          prompt,
          provider: 'openai', // Use config or agent preference
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
      }

      // Execute additional actions
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
   * @param {Object} action
   * @param {Object} worktree
   * @param {Object} githubContext
   * @returns {Promise<void>}
   */
  async _executeAction(action, worktree, githubContext) {
    switch (action.type) {
      case 'runTests':
        // Execute test suite in worktree
        logger.info('[ZoneManager] Running tests', { worktreeId: worktree.id });
        // Implementation depends on project setup
        break;

      case 'createPR':
        // Create PR from worktree branch
        logger.info('[ZoneManager] Creating PR', { worktreeId: worktree.id });
        // Use GitHubIntegration
        break;

      case 'notify':
        // Send notification
        logger.info('[ZoneManager] Sending notification', { message: action.message });
        break;

      default:
        logger.warn('[ZoneManager] Unknown action type', { type: action.type });
    }
  }

  /**
   * Generate unique zone ID
   * @returns {string}
   */
  _generateZoneId() {
    return `zone-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }
}

export default ZoneManager;
```

**Dependencies**:
- `GitHubContextProvider`
- `LLMBridge`

**Testing Requirements**:
- Zone CRUD operations
- Worktree assignment logic
- Trigger execution with various agent types
- Template injection integration
- Event emission tests

---

### 4. Visual Canvas Component

**Location**: `/dashboard/components/workflow-canvas.tsx`

**Responsibilities**:
- Render interactive 2D canvas (Figma-like)
- Support drag-and-drop for worktree cards
- Display zones with visual boundaries
- Real-time updates via WebSocket
- Context menus and interactions

**Technology Stack**:
- **react-konva** or **react-flow** for canvas rendering
- **@dnd-kit** for drag-and-drop
- **zustand** for state management (already in use)

**API Design**:

```typescript
// dashboard/components/workflow-canvas.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  NodeTypes,
  useNodesState,
  useEdgesState,
  Connection,
  addEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useDashboardStore } from '@/lib/store';
import { api } from '@/lib/api';
import { WorktreeCard } from './worktree-card';
import { ZoneCard } from './zone-card';

const nodeTypes: NodeTypes = {
  worktree: WorktreeCard,
  zone: ZoneCard,
};

export function WorkflowCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { isConnected } = useDashboardStore();

  // Load initial data
  useEffect(() => {
    loadCanvasData();
  }, []);

  // Subscribe to WebSocket updates
  useEffect(() => {
    if (!isConnected) return;

    const handleWorktreeCreated = (worktree: any) => {
      const newNode: Node = {
        id: worktree.id,
        type: 'worktree',
        position: { x: 100, y: 100 },
        data: worktree,
      };
      setNodes((nds) => [...nds, newNode]);
    };

    const handleWorktreeDeleted = (data: any) => {
      setNodes((nds) => nds.filter((n) => n.id !== data.worktreeId));
    };

    const handleZoneCreated = (zone: any) => {
      const newNode: Node = {
        id: zone.id,
        type: 'zone',
        position: zone.position,
        data: zone,
        style: {
          width: zone.size.width,
          height: zone.size.height,
        },
      };
      setNodes((nds) => [...nds, newNode]);
    };

    // Subscribe to events (via WebSocket or polling)
    // This depends on your WebSocket implementation
    // For now, using placeholder event listeners

    return () => {
      // Cleanup subscriptions
    };
  }, [isConnected, setNodes]);

  const loadCanvasData = async () => {
    try {
      // Load worktrees
      const worktrees = await api.getWorktrees();
      const worktreeNodes: Node[] = worktrees.map((wt: any) => ({
        id: wt.id,
        type: 'worktree',
        position: wt.position || { x: 100, y: 100 },
        data: wt,
      }));

      // Load zones
      const zones = await api.getZones();
      const zoneNodes: Node[] = zones.map((zone: any) => ({
        id: zone.id,
        type: 'zone',
        position: zone.position,
        data: zone,
        style: {
          width: zone.size.width,
          height: zone.size.height,
        },
      }));

      setNodes([...zoneNodes, ...worktreeNodes]);
    } catch (error) {
      console.error('Failed to load canvas data:', error);
    }
  };

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeDragStop = useCallback(
    async (event: React.MouseEvent, node: Node) => {
      // Check if worktree was dropped on a zone
      if (node.type === 'worktree') {
        const droppedOnZone = nodes.find(
          (n) =>
            n.type === 'zone' &&
            isNodeInsideZone(node, n)
        );

        if (droppedOnZone) {
          // Assign worktree to zone
          await api.assignWorktreeToZone(node.id, droppedOnZone.id, node.data);
        }
      }

      // Save node position
      await api.updateNodePosition(node.id, node.position);
    },
    [nodes]
  );

  const isNodeInsideZone = (node: Node, zone: Node): boolean => {
    if (!zone.style?.width || !zone.style?.height) return false;

    const nodeX = node.position.x;
    const nodeY = node.position.y;
    const zoneX = zone.position.x;
    const zoneY = zone.position.y;
    const zoneWidth = zone.style.width as number;
    const zoneHeight = zone.style.height as number;

    return (
      nodeX >= zoneX &&
      nodeX <= zoneX + zoneWidth &&
      nodeY >= zoneY &&
      nodeY <= zoneY + zoneHeight
    );
  };

  return (
    <div style={{ width: '100%', height: '800px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
```

**Sub-components**:

1. **WorktreeCard** (`/dashboard/components/worktree-card.tsx`)
   - Display worktree metadata (branch, port, status)
   - Show linked GitHub issue/PR
   - Agent status indicator
   - Context menu for actions

2. **ZoneCard** (`/dashboard/components/zone-card.tsx`)
   - Zone name and description
   - Visual boundary
   - Trigger configuration display
   - Edit/delete actions

**Dependencies**:
- `reactflow` or `react-konva`
- `@dnd-kit` (if not using reactflow's built-in drag)
- Existing `useDashboardStore`

**Testing Requirements**:
- Component rendering tests
- Drag-and-drop interaction tests
- Zone detection logic tests
- WebSocket update handling tests

---

## Implementation Phases

### Week 1-2: Backend Foundation

**Goals**:
- Implement core backend services
- Set up database schema for worktrees/zones
- Create API endpoints

**Tasks**:
1. ✅ Implement `WorktreeManager` class
2. ✅ Implement `GitHubContextProvider` class
3. ✅ Implement `ZoneManager` class
4. ✅ Create REST API endpoints:
   - `POST /api/worktrees` - Create worktree
   - `GET /api/worktrees` - List worktrees
   - `GET /api/worktrees/:id` - Get worktree
   - `PUT /api/worktrees/:id` - Update worktree
   - `DELETE /api/worktrees/:id` - Delete worktree
   - `POST /api/zones` - Create zone
   - `GET /api/zones` - List zones
   - `PUT /api/zones/:id` - Update zone
   - `DELETE /api/zones/:id` - Delete zone
   - `POST /api/zones/:zoneId/assign/:worktreeId` - Assign worktree to zone
5. ✅ Add WebSocket events for real-time updates
6. ✅ Write unit tests for all classes (target: 80%+ coverage)

**Deliverables**:
- Working backend services
- API documentation
- Test suite with 80%+ coverage

---

### Week 3-4: Frontend Canvas

**Goals**:
- Build interactive visual canvas
- Implement drag-and-drop
- Connect to backend APIs

**Tasks**:
1. ✅ Install dependencies (`reactflow`, state management)
2. ✅ Create `WorkflowCanvas` component
3. ✅ Create `WorktreeCard` component
4. ✅ Create `ZoneCard` component
5. ✅ Implement drag-and-drop logic
6. ✅ Connect to WebSocket for real-time updates
7. ✅ Add context menus and interactions
8. ✅ Implement zone detection on drop
9. ✅ Add canvas toolbar (create zone, create worktree)
10. ✅ Write component tests (React Testing Library)

**Deliverables**:
- Functional visual canvas
- Interactive UI components
- Integration with backend

---

### Week 5: GitHub Integration

**Goals**:
- Deep GitHub context injection
- Template system
- UI for linking issues/PRs

**Tasks**:
1. ✅ Enhance `GitHubContextProvider` with caching
2. ✅ Implement template injection system
3. ✅ Create UI for linking worktree to GitHub issue
4. ✅ Add GitHub issue/PR picker component
5. ✅ Display GitHub context in worktree cards
6. ✅ Test template injection with various scenarios
7. ✅ Add GitHub context preview in zone configuration

**Deliverables**:
- GitHub context system
- Template injection working
- UI for GitHub integration

---

### Week 6: Zone Triggers & Automation

**Goals**:
- Implement zone trigger system
- Connect to existing LLM Bridge
- Test automation workflows

**Tasks**:
1. ✅ Implement trigger execution in `ZoneManager`
2. ✅ Connect zone triggers to LLM Bridge
3. ✅ Add support for multiple agent types
4. ✅ Implement zone actions (runTests, createPR, notify)
5. ✅ Create zone configuration UI
6. ✅ Add prompt template editor with syntax highlighting
7. ✅ Test end-to-end workflow (drag → trigger → execute)
8. ✅ Add execution logs and feedback

**Deliverables**:
- Working zone automation
- Integration with existing agents
- Execution monitoring

---

### Week 7: Testing & Refinement

**Goals**:
- Comprehensive testing
- Bug fixes
- Performance optimization

**Tasks**:
1. ✅ Integration tests for complete workflows
2. ✅ Performance testing (100+ worktrees, 50+ zones)
3. ✅ Memory leak detection and fixes
4. ✅ UI/UX refinements based on testing
5. ✅ Accessibility improvements
6. ✅ Documentation updates
7. ✅ Security review (input validation, CSRF, etc.)

**Deliverables**:
- Test suite covering all features
- Performance benchmarks
- Security audit report

---

### Week 8: Documentation & Rollout

**Goals**:
- Complete documentation
- Migration guide
- Gradual rollout

**Tasks**:
1. ✅ Write user guide for visual canvas
2. ✅ Create video tutorials
3. ✅ Update API documentation
4. ✅ Write migration guide from old dashboard
5. ✅ Prepare rollout plan (feature flag)
6. ✅ Beta testing with select users
7. ✅ Gather feedback and iterate
8. ✅ Full production rollout

**Deliverables**:
- Complete documentation
- Migration guide
- Production-ready feature

---

## Technical Requirements

### Dependencies to Add

**Backend**:
```json
{
  "dependencies": {
    // No new backend dependencies - using Node.js built-ins
  }
}
```

**Frontend** (`dashboard/package.json`):
```json
{
  "dependencies": {
    "reactflow": "^11.10.0",
    "@dnd-kit/core": "^6.0.8",
    "@dnd-kit/sortable": "^7.0.2",
    "@monaco-editor/react": "^4.6.0"
  }
}
```

### Environment Variables

Add to `.env`:
```bash
# Worktree Configuration
WORKTREE_BASE_PATH=.worktrees
WORKTREE_PORT_MIN=3001
WORKTREE_PORT_MAX=3999

# GitHub Context
GITHUB_CONTEXT_CACHE_TIMEOUT=300000  # 5 minutes

# Zone Configuration
ZONE_DEFAULT_TRIGGER=onDrop
```

### Database Schema

**SQLite Schema** (using better-sqlite3):

```sql
-- Worktrees table
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
);

-- Zones table
CREATE TABLE IF NOT EXISTS zones (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  trigger TEXT DEFAULT 'onDrop',
  agents TEXT, -- JSON array
  prompt_template TEXT,
  actions TEXT, -- JSON array
  position_x INTEGER DEFAULT 0,
  position_y INTEGER DEFAULT 0,
  size_width INTEGER DEFAULT 300,
  size_height INTEGER DEFAULT 200,
  created_at TEXT NOT NULL,
  updated_at TEXT
);

-- Worktree-Zone assignments
CREATE TABLE IF NOT EXISTS worktree_zones (
  worktree_id TEXT NOT NULL,
  zone_id TEXT NOT NULL,
  assigned_at TEXT NOT NULL,
  PRIMARY KEY (worktree_id),
  FOREIGN KEY (worktree_id) REFERENCES worktrees(id) ON DELETE CASCADE,
  FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE CASCADE
);

-- Execution history
CREATE TABLE IF NOT EXISTS zone_executions (
  id TEXT PRIMARY KEY,
  zone_id TEXT NOT NULL,
  worktree_id TEXT NOT NULL,
  agent_type TEXT NOT NULL,
  prompt TEXT NOT NULL,
  result TEXT,
  success BOOLEAN DEFAULT 1,
  executed_at TEXT NOT NULL,
  FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE CASCADE,
  FOREIGN KEY (worktree_id) REFERENCES worktrees(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_worktrees_status ON worktrees(status);
CREATE INDEX IF NOT EXISTS idx_zones_trigger ON zones(trigger);
CREATE INDEX IF NOT EXISTS idx_executions_zone ON zone_executions(zone_id);
CREATE INDEX IF NOT EXISTS idx_executions_worktree ON zone_executions(worktree_id);
```

**Database Manager** (`/core/database/visual_db.js`):

```javascript
import Database from 'better-sqlite3';
import path from 'path';
import logger from '../logger.js';

export class VisualDatabase {
  constructor(config = {}) {
    const dbPath = config.dbPath || path.join(process.cwd(), 'data', 'visual.db');
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this._initSchema();
  }

  _initSchema() {
    // Execute schema creation from above
    // ... (SQL statements)
  }

  // Worktree methods
  createWorktree(worktree) { /* ... */ }
  getWorktree(id) { /* ... */ }
  listWorktrees() { /* ... */ }
  updateWorktree(id, updates) { /* ... */ }
  deleteWorktree(id) { /* ... */ }

  // Zone methods
  createZone(zone) { /* ... */ }
  getZone(id) { /* ... */ }
  listZones() { /* ... */ }
  updateZone(id, updates) { /* ... */ }
  deleteZone(id) { /* ... */ }

  // Assignment methods
  assignWorktreeToZone(worktreeId, zoneId) { /* ... */ }
  getWorktreeZone(worktreeId) { /* ... */ }
  removeWorktreeFromZone(worktreeId) { /* ... */ }

  // Execution history
  recordExecution(execution) { /* ... */ }
  getExecutionHistory(zoneId, limit = 100) { /* ... */ }

  close() {
    this.db.close();
  }
}

export default VisualDatabase;
```

---

## Migration Strategy

### Feature Flag Approach

Implement feature flag to enable gradual rollout:

```javascript
// config/settings.json
{
  "features": {
    "visualCanvas": {
      "enabled": false,  // Toggle to enable
      "betaUsers": []    // Array of user IDs for beta testing
    }
  }
}
```

```typescript
// dashboard/lib/feature-flags.ts
export function useFeatureFlag(flagName: string): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // Fetch feature flag state from API or config
    api.getFeatureFlag(flagName).then(setEnabled);
  }, [flagName]);

  return enabled;
}

// Usage in components
export function DashboardPage() {
  const visualCanvasEnabled = useFeatureFlag('visualCanvas');

  if (visualCanvasEnabled) {
    return <WorkflowCanvas />;
  }

  return <TraditionalDashboard />;
}
```

### Data Migration

For existing deployments:

1. **Backup**: Automatically backup existing database
2. **Schema Update**: Run migration script to add new tables
3. **Default Zones**: Create default zones (Development, Testing, Review)
4. **No Breaking Changes**: Existing API endpoints remain functional

**Migration Script** (`scripts/migrate_to_phase9.js`):

```javascript
#!/usr/bin/env node

import { VisualDatabase } from '../core/database/visual_db.js';
import logger from '../core/logger.js';

async function migrate() {
  logger.info('[Migration] Starting Phase 9 migration...');

  const db = new VisualDatabase();

  // Create default zones
  const defaultZones = [
    {
      id: 'zone-development',
      name: 'Development',
      description: 'Active development work',
      trigger: 'onDrop',
      agents: ['frontend', 'backend'],
      promptTemplate: 'Implement the feature described in {{ github.title }}\n\n{{ github.description }}',
      position: { x: 50, y: 50 },
      size: { width: 300, height: 400 }
    },
    {
      id: 'zone-testing',
      name: 'Testing',
      description: 'QA and testing',
      trigger: 'onDrop',
      agents: ['qa'],
      promptTemplate: 'Test the implementation for {{ github.title }}',
      actions: [{ type: 'runTests' }],
      position: { x: 400, y: 50 },
      size: { width: 300, height: 400 }
    },
    {
      id: 'zone-review',
      name: 'Code Review',
      description: 'Ready for review',
      trigger: 'onDrop',
      agents: ['code-review'],
      promptTemplate: 'Review the code for {{ github.title }}',
      actions: [{ type: 'createPR' }],
      position: { x: 750, y: 50 },
      size: { width: 300, height: 400 }
    }
  ];

  for (const zone of defaultZones) {
    db.createZone(zone);
    logger.info(`[Migration] Created default zone: ${zone.name}`);
  }

  logger.info('[Migration] Phase 9 migration completed successfully');
  db.close();
}

migrate().catch((error) => {
  logger.error('[Migration] Failed:', error);
  process.exit(1);
});
```

---

## Testing Strategy

### Unit Tests

**Target Coverage**: 80%+

**Test Files**:
- `tests/unit/worktree_manager.test.js` - WorktreeManager tests
- `tests/unit/github_context_provider.test.js` - GitHub context tests
- `tests/unit/zone_manager.test.js` - ZoneManager tests

**Example Test** (`tests/unit/worktree_manager.test.js`):

```javascript
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import WorktreeManager from '../../core/worktree/worktree_manager.js';

describe('WorktreeManager', () => {
  let manager;

  before(() => {
    manager = new WorktreeManager({
      repoPath: '/tmp/test-repo',
      portRange: { min: 4000, max: 4999 }
    });
  });

  after(async () => {
    // Cleanup worktrees
    const worktrees = manager.listWorktrees();
    for (const wt of worktrees) {
      await manager.deleteWorktree(wt.id);
    }
  });

  it('should create a worktree with unique port', async () => {
    const worktree = await manager.createWorktree({
      branchName: 'feature-test',
      taskId: 'task-123'
    });

    assert.ok(worktree.id);
    assert.strictEqual(worktree.branchName, 'feature-test');
    assert.ok(worktree.port >= 4000 && worktree.port <= 4999);
  });

  it('should allocate unique ports for multiple worktrees', async () => {
    const wt1 = await manager.createWorktree({ branchName: 'feature-1', taskId: 't1' });
    const wt2 = await manager.createWorktree({ branchName: 'feature-2', taskId: 't2' });

    assert.notStrictEqual(wt1.port, wt2.port);
  });

  it('should delete worktree and release port', async () => {
    const worktree = await manager.createWorktree({ branchName: 'temp', taskId: 't-temp' });
    const port = worktree.port;

    await manager.deleteWorktree(worktree.id);

    assert.strictEqual(manager.getWorktree(worktree.id), null);
    assert.strictEqual(manager.portAllocations.has(port), false);
  });

  it('should throw error when port range is exhausted', async () => {
    // Create manager with small port range
    const smallManager = new WorktreeManager({
      repoPath: '/tmp/test-repo',
      portRange: { min: 5000, max: 5001 }
    });

    await smallManager.createWorktree({ branchName: 'f1', taskId: 't1' });
    await smallManager.createWorktree({ branchName: 'f2', taskId: 't2' });

    await assert.rejects(
      async () => await smallManager.createWorktree({ branchName: 'f3', taskId: 't3' }),
      /No available ports/
    );
  });
});
```

### Integration Tests

**Test Files**:
- `tests/integration/visual_canvas_workflow.test.js`
- `tests/integration/github_context_integration.test.js`
- `tests/integration/zone_trigger_execution.test.js`

**Example Test** (`tests/integration/zone_trigger_execution.test.js`):

```javascript
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import ZoneManager from '../../core/zones/zone_manager.js';
import GitHubContextProvider from '../../core/integrations/github_context_provider.js';
import LLMBridge from '../../core/llm_bridge.js';

describe('Zone Trigger Execution (Integration)', () => {
  let zoneManager, githubProvider, llmBridge;

  before(() => {
    githubProvider = new GitHubContextProvider({ token: process.env.GITHUB_TOKEN });
    llmBridge = new LLMBridge(/* config */);
    zoneManager = new ZoneManager({
      githubContextProvider: githubProvider,
      llmBridge
    });
  });

  it('should execute zone trigger when worktree is assigned', async () => {
    // Create zone
    const zone = zoneManager.createZone({
      name: 'Test Zone',
      trigger: 'onDrop',
      agents: ['frontend'],
      promptTemplate: 'Work on {{ github.title }}'
    });

    // Create worktree with GitHub issue
    const worktree = {
      id: 'wt-test',
      issueUrl: 'https://github.com/owner/repo/issues/123',
      branchName: 'feature-test',
      port: 3001
    };

    // Assign worktree to zone
    const result = await zoneManager.assignWorktreeToZone(
      worktree.id,
      zone.id,
      worktree
    );

    assert.strictEqual(result.success, true);
    assert.ok(result.results);
    assert.strictEqual(result.results.length, 1);
    assert.strictEqual(result.results[0].agentType, 'frontend');
  });

  it('should inject GitHub context into prompt', async () => {
    const zone = zoneManager.createZone({
      name: 'Context Zone',
      promptTemplate: 'Title: {{ github.title }}\nDescription: {{ github.description }}'
    });

    const worktree = {
      id: 'wt-context',
      issueUrl: 'https://github.com/owner/repo/issues/456',
      branchName: 'feature-context'
    };

    // Spy on LLM Bridge to capture prompt
    let capturedPrompt = '';
    const originalQuery = llmBridge.query.bind(llmBridge);
    llmBridge.query = async (options) => {
      capturedPrompt = options.prompt;
      return originalQuery(options);
    };

    await zoneManager.assignWorktreeToZone(worktree.id, zone.id, worktree);

    assert.ok(capturedPrompt.includes('Title:'));
    assert.ok(capturedPrompt.includes('Description:'));
  });
});
```

### Frontend Tests

**Test Files**:
- `dashboard/__tests__/workflow-canvas.test.tsx`
- `dashboard/__tests__/worktree-card.test.tsx`
- `dashboard/__tests__/zone-card.test.tsx`

**Example Test** (`dashboard/__tests__/workflow-canvas.test.tsx`):

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WorkflowCanvas } from '../components/workflow-canvas';
import { api } from '../lib/api';

// Mock API
jest.mock('../lib/api');

describe('WorkflowCanvas', () => {
  beforeEach(() => {
    (api.getWorktrees as jest.Mock).mockResolvedValue([]);
    (api.getZones as jest.Mock).mockResolvedValue([]);
  });

  it('should render canvas', () => {
    render(<WorkflowCanvas />);
    expect(screen.getByRole('application')).toBeInTheDocument();
  });

  it('should load and display worktrees', async () => {
    const mockWorktrees = [
      { id: 'wt-1', branchName: 'feature-1', port: 3001 }
    ];
    (api.getWorktrees as jest.Mock).mockResolvedValue(mockWorktrees);

    render(<WorkflowCanvas />);

    await waitFor(() => {
      expect(screen.getByText('feature-1')).toBeInTheDocument();
    });
  });

  it('should assign worktree to zone on drop', async () => {
    const mockWorktree = { id: 'wt-1', branchName: 'feature-1', port: 3001 };
    const mockZone = {
      id: 'zone-1',
      name: 'Development',
      position: { x: 100, y: 100 },
      size: { width: 300, height: 200 }
    };

    (api.getWorktrees as jest.Mock).mockResolvedValue([mockWorktree]);
    (api.getZones as jest.Mock).mockResolvedValue([mockZone]);
    (api.assignWorktreeToZone as jest.Mock).mockResolvedValue({ success: true });

    render(<WorkflowCanvas />);

    await waitFor(() => {
      expect(screen.getByText('feature-1')).toBeInTheDocument();
    });

    // Simulate drag-and-drop (ReactFlow has custom drag logic)
    // This is a simplified example - actual implementation depends on ReactFlow testing utilities
    const worktreeNode = screen.getByText('feature-1').closest('[data-id="wt-1"]');
    fireEvent.dragEnd(worktreeNode);

    await waitFor(() => {
      expect(api.assignWorktreeToZone).toHaveBeenCalledWith('wt-1', 'zone-1', mockWorktree);
    });
  });
});
```

---

## Rollout Plan

### Phase 1: Internal Testing (Week 8, Days 1-3)

1. Enable feature flag for core team only
2. Test all workflows manually
3. Gather feedback on UX/UI
4. Fix critical bugs

### Phase 2: Beta Testing (Week 8, Days 4-5)

1. Enable for beta users (5-10 users)
2. Provide documentation and tutorials
3. Monitor usage and errors
4. Collect feedback

### Phase 3: Gradual Rollout (Week 8, Days 6-7)

1. Enable for 25% of users (if multi-user system)
2. Monitor performance and stability
3. Adjust based on metrics

### Phase 4: Full Rollout (Post-Week 8)

1. Enable for all users
2. Announce new feature
3. Provide migration guide
4. Offer support and training

---

## Success Metrics

### Performance Metrics

- **Canvas Load Time**: < 2 seconds for 100 nodes
- **Drag-and-Drop Latency**: < 100ms
- **WebSocket Update Latency**: < 200ms
- **Zone Trigger Execution**: < 5 seconds (depends on LLM)

### Usage Metrics

- **Adoption Rate**: % of users using visual canvas vs. old dashboard
- **Worktrees Created**: Daily count
- **Zone Triggers Executed**: Daily count
- **GitHub Issues Linked**: % of worktrees linked to issues

### Quality Metrics

- **Test Coverage**: 80%+ (unit + integration)
- **Bug Rate**: < 5 bugs per week after rollout
- **User Satisfaction**: Survey score > 4/5

---

## Risk Mitigation

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Git worktree conflicts | Medium | High | Implement locking mechanism, cleanup orphaned worktrees |
| Port exhaustion | Low | Medium | Large port range (3001-3999), automatic cleanup |
| WebSocket connection issues | Medium | Medium | Reconnection logic, fallback to polling |
| ReactFlow performance with 100+ nodes | Medium | Medium | Implement virtualization, lazy loading |
| GitHub API rate limits | Medium | Low | Caching with 5-minute TTL, batch requests |

### Operational Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| User confusion during migration | High | Low | Clear documentation, feature flag, tutorials |
| Data migration failures | Low | High | Automated backups, rollback plan |
| Breaking changes to existing API | Low | High | Maintain backward compatibility, versioned API |

---

## Appendix

### A. API Endpoint Reference

See separate file: `API_REFERENCE_PHASE9.md`

### B. Database Schema

See [Technical Requirements > Database Schema](#database-schema)

### C. Component Hierarchy

```
WorkflowCanvas
├── ReactFlow
│   ├── Background
│   ├── Controls
│   ├── MiniMap
│   └── Nodes
│       ├── ZoneCard (multiple)
│       │   ├── ZoneHeader
│       │   ├── ZoneBody
│       │   └── ZoneActions
│       └── WorktreeCard (multiple)
│           ├── WorktreeHeader
│           ├── WorktreeStatus
│           ├── GitHubLink
│           └── WorktreeActions
└── CanvasToolbar
    ├── CreateZoneButton
    ├── CreateWorktreeButton
    └── CanvasSettings
```

### D. Event Flow Diagram

```
User drags WorktreeCard onto ZoneCard
            │
            ▼
onNodeDragStop handler triggered
            │
            ▼
isNodeInsideZone() checks position
            │
            ▼
api.assignWorktreeToZone(worktreeId, zoneId)
            │
            ▼
Backend: ZoneManager.assignWorktreeToZone()
            │
            ├─> Update worktree_zones table
            │
            └─> Execute trigger (if zone.trigger === 'onDrop')
                      │
                      ├─> GitHubContextProvider.getContextFromUrl()
                      │
                      ├─> GitHubContextProvider.injectContext()
                      │
                      ├─> LLMBridge.query() for each agent
                      │
                      └─> Execute zone actions
                                │
                                ▼
                      Emit WebSocket event: 'trigger:executed'
                                │
                                ▼
                      Frontend receives update
                                │
                                ▼
                      Update UI with execution results
```

---

## Conclusion

This implementation plan provides a comprehensive roadmap for integrating Agor's innovative visual orchestration features into AI-Orchestra. By following this plan, we will create a best-of-both-worlds solution that combines:

- **Agor's Strengths**: Visual canvas, spatial automation, Git worktree isolation, GitHub-native workflows
- **AI-Orchestra's Strengths**: Multi-provider LLM support, production-grade monitoring, extensive testing, security hardening

**Next Steps**:
1. Review and approve this plan
2. Set up project tracking (GitHub Project Board)
3. Assign tasks to team members
4. Begin Week 1 implementation

**Estimated Effort**: 6-8 weeks with 1-2 full-time engineers

**Expected ROI**: High - significant UX improvement while maintaining stability
