# Phase 9: Visual Orchestration - Developer Guide

**Technical documentation for developers working on or extending Phase 9 of AI Orchestra.**

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Component Descriptions](#component-descriptions)
3. [Database Schema](#database-schema)
4. [API Reference](#api-reference)
5. [WebSocket Events](#websocket-events)
6. [Integration Patterns](#integration-patterns)
7. [Testing Guidelines](#testing-guidelines)
8. [Extending the System](#extending-the-system)
9. [Performance Optimization](#performance-optimization)
10. [Debugging and Logging](#debugging-and-logging)

---

## Architecture Overview

### System Architecture

Phase 9 follows a three-tier architecture:

```
┌──────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  - WorkflowCanvas (ReactFlow)                            │
│  - Worktree/Zone Cards                                   │
│  - Zustand State Management                              │
│  - WebSocket Client                                      │
└────────────────┬─────────────────────────────────────────┘
                 │ HTTP/WS
┌────────────────▼─────────────────────────────────────────┐
│                    API Layer (Express)                   │
│  - REST Endpoints (/api/worktrees, /api/zones)          │
│  - CSRF Protection                                       │
│  - Input Validation                                      │
│  - WebSocket Server                                      │
└────────────────┬─────────────────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────────────────┐
│                   Backend Services                       │
│  - WorktreeManager    (Git operations)                   │
│  - ZoneManager        (Workflow automation)              │
│  - GitHubContextProvider (Context extraction)            │
│  - VisualDatabase     (SQLite persistence)               │
└────────────────┬─────────────────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────────────────┐
│              External Integrations                       │
│  - LLMBridge          (Multi-provider LLM)               │
│  - GitHub API         (Issue/PR data)                    │
│  - Git CLI            (Worktree operations)              │
└──────────────────────────────────────────────────────────┘
```

### Data Flow

**Worktree Creation Flow:**
```
User → WorkflowCanvas → POST /api/worktrees
  → WorktreeManager.createWorktree()
    → Git worktree add
    → VisualDatabase.createWorktree()
    → WorktreeManager emits 'worktree:created'
      → WebSocket broadcast
        → All clients update Zustand store
```

**Zone Trigger Execution Flow:**
```
User drags worktree → POST /api/zones/:zoneId/assign/:worktreeId
  → ZoneManager.assignWorktreeToZone()
    → VisualDatabase.assignWorktreeToZone()
    → ZoneManager._executeTrigger()
      → GitHubContextProvider.getContextFromUrl()
      → GitHubContextProvider.injectContext()
      → LLMBridge.query() for each agent
      → ZoneManager._executeActions()
    → VisualDatabase.recordExecution()
    → ZoneManager emits 'trigger:executed'
      → WebSocket broadcast
```

### Design Patterns

**Event-Driven Architecture:**
- `ZoneManager` extends `EventEmitter`
- Components emit events on state changes
- WebSocket server listens and broadcasts to clients

**Repository Pattern:**
- `VisualDatabase` encapsulates data access
- Business logic in managers (Worktree/Zone)
- Clean separation of concerns

**Strategy Pattern:**
- `GitHubContextProvider` extends `GitHubIntegration`
- Multiple trigger types (onDrop, manual, scheduled)
- Pluggable action executors

**Template Method Pattern:**
- `_executeTrigger()` defines workflow skeleton
- Subclasses can override specific steps
- Consistent execution flow

---

## Component Descriptions

### Backend Components

#### 1. WorktreeManager

**Location:** `/core/worktree/worktree_manager.js`

**Purpose:** Manages Git worktree lifecycle and port allocation

**Key Methods:**

```javascript
async createWorktree({ branchName, issueUrl, taskId, position })
```
- Creates Git worktree in `.worktrees/[branch-name]/`
- Allocates unique port from 3001-3999 range
- Checks port availability on network
- Stores metadata in database
- Returns worktree object

```javascript
getWorktree(worktreeId)
```
- Retrieves worktree by ID from database
- Returns null if not found

```javascript
listWorktrees(filters = {})
```
- Lists all worktrees with optional filtering
- Filters: `{ status: 'active' }`
- Returns array of worktrees

```javascript
async updateWorktree(worktreeId, updates)
```
- Updates worktree metadata
- Allowed fields: status, position, taskId
- Returns updated worktree

```javascript
async deleteWorktree(worktreeId)
```
- Removes Git worktree from filesystem
- Deletes database entry (cascades to assignments)
- Releases port for reuse

```javascript
async cleanupOrphanedWorktrees()
```
- Finds database entries for deleted worktrees
- Removes orphaned entries
- Returns count of cleaned entries

**Port Allocation Algorithm:**

```javascript
async _findAvailablePort() {
  const { min, max } = this.portRange;
  const allocatedPorts = this.listWorktrees().map(w => w.port);

  for (let port = min; port <= max; port++) {
    if (!allocatedPorts.includes(port)) {
      // Check actual network availability
      const available = await this._isPortAvailable(port);
      if (available) return port;
    }
  }

  throw new Error('No available ports');
}
```

**Integration Points:**
- `VisualDatabase` - Persistence
- Git CLI - Worktree operations
- `logger` - Structured logging

---

#### 2. ZoneManager

**Location:** `/core/zones/zone_manager.js`

**Purpose:** Zone lifecycle and workflow automation

**Key Methods:**

```javascript
createZone(zone)
```
- Creates new zone in database
- Generates unique ID: `zone-[timestamp]-[random]`
- Emits `zone:created` event
- Returns zone object

```javascript
async assignWorktreeToZone(worktreeId, zoneId, worktree)
```
- Assigns worktree to zone
- Executes trigger if zone.trigger === 'onDrop'
- Emits `worktree:assigned` event
- Returns execution results

```javascript
async _executeTrigger(zone, worktree)
```
- Fetches GitHub context if worktree has issueUrl
- Injects template variables into prompt
- Executes all configured agents in parallel
- Runs configured actions sequentially
- Records execution in database
- Emits `trigger:executed` or `trigger:failed`

```javascript
async _executeActions(zone, worktree, results)
```
- Executes post-trigger actions
- Supported actions: runTests, createPR, notify, webhook
- Emits action-specific events

**Events Emitted:**

```javascript
// Zone lifecycle
'zone:created'    // { zone }
'zone:updated'    // { zone }
'zone:deleted'    // { zoneId }

// Worktree assignment
'worktree:assigned'  // { worktreeId, zoneId }
'worktree:removed'   // { worktreeId, zoneId }

// Trigger execution
'trigger:executed'   // { zoneId, worktreeId, results }
'trigger:failed'     // { zoneId, worktreeId, error }

// Actions
'action:runTests'    // { zoneId, worktreeId, result }
'action:createPR'    // { zoneId, worktreeId, prUrl }
'action:notify'      // { zoneId, worktreeId, message }
'action:webhook'     // { zoneId, worktreeId, response }
```

**Integration Points:**
- `VisualDatabase` - Persistence
- `GitHubContextProvider` - Context extraction
- `LLMBridge` - Agent execution
- `logger` - Structured logging

---

#### 3. GitHubContextProvider

**Location:** `/core/integrations/github_context_provider.js`

**Purpose:** GitHub issue/PR context extraction and template injection

**Extends:** `GitHubIntegration`

**Key Methods:**

```javascript
async getContextFromUrl(url)
```
- Parses GitHub URL (issue or PR)
- Fetches data via GitHub API (Octokit)
- Caches for 5 minutes
- Returns context object

```javascript
injectContext(template, context, worktree)
```
- Replaces template variables with actual values
- Escapes regex special characters
- Supports github.* and worktree.* variables
- Returns processed string

```javascript
clearCache(url)
```
- Clears cached context for specific URL
- Useful for testing or forcing refresh

**Context Object Structure:**

```javascript
{
  type: 'issue' | 'pull_request',
  number: 123,
  title: 'Add dark mode support',
  description: 'Full issue body...',
  labels: 'enhancement, ui',
  state: 'open',
  author: 'username',
  url: 'https://github.com/owner/repo/issues/123',
  branch: 'feature/dark-mode'  // PR only
}
```

**Caching Strategy:**

```javascript
// Cache structure
this.contextCache = new Map();
// Entry: { context, timestamp }

// TTL check
const age = Date.now() - cached.timestamp;
if (age < this.cacheTimeout) {
  return cached.context;  // Cache hit
}
```

**Integration Points:**
- `GitHubIntegration` (parent class) - Octokit client
- `logger` - Structured logging

---

#### 4. VisualDatabase

**Location:** `/core/database/visual_db.js`

**Purpose:** SQLite persistence layer for Phase 9

**Key Methods:**

**Worktree Operations:**
```javascript
createWorktree(worktree)   // Insert worktree
getWorktree(id)            // Get by ID
listWorktrees(filters)     // List with optional filters
updateWorktree(id, data)   // Update fields
deleteWorktree(id)         // Delete (cascades)
```

**Zone Operations:**
```javascript
createZone(zone)           // Insert zone
getZone(id)                // Get by ID
listZones()                // List all zones
updateZone(id, data)       // Update fields
deleteZone(id)             // Delete (cascades)
```

**Assignment Operations:**
```javascript
assignWorktreeToZone(worktreeId, zoneId)
getWorktreeZone(worktreeId)
removeWorktreeFromZone(worktreeId)
```

**Execution History:**
```javascript
recordExecution(execution)
getExecutionHistory(zoneId, limit)
```

**Database Configuration:**

```javascript
const db = new Database('./data/visual.db', {
  fileMustExist: false  // Creates if missing
});

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
```

**Integration Points:**
- `better-sqlite3` - SQLite driver
- `logger` - Error logging

---

### Frontend Components

#### 1. WorkflowCanvas

**Location:** `/dashboard/components/workflow-canvas.tsx`

**Purpose:** Main interactive canvas for workflow orchestration

**Key Features:**
- ReactFlow integration for 2D visualization
- WebSocket for real-time updates
- Zustand store for state management
- Drag-and-drop with zone detection

**State Management:**

```typescript
const {
  worktrees,
  zones,
  setWorktrees,
  setZones,
  addWorktree,
  updateWorktree,
  removeWorktree,
  addZone,
  updateZone,
  removeZone
} = useDashboardStore();
```

**WebSocket Integration:**

```typescript
useEffect(() => {
  if (!ws) return;

  ws.addEventListener('message', (event) => {
    const { type, data } = JSON.parse(event.data);

    switch(type) {
      case 'worktree:created':
        addWorktree(data);
        break;
      case 'zone:created':
        addZone(data);
        break;
      // ... more event handlers
    }
  });
}, [ws]);
```

**Drag-and-Drop Logic:**

```typescript
const onNodeDragStop = (event, node) => {
  // Check if node is inside any zone
  for (const zone of zones) {
    if (isNodeInsideZone(node, zone)) {
      // Assign to zone
      assignWorktreeToZone(node.id, zone.id);
      break;
    }
  }

  // Save position
  updateNodePosition(node.id, node.position);
};
```

---

#### 2. WorktreeCard

**Location:** `/dashboard/components/worktree-card.tsx`

**Purpose:** Draggable card representing a Git worktree

**Props Interface:**

```typescript
interface WorktreeCardProps {
  id: string;
  branchName: string;
  port?: number;
  status?: 'active' | 'idle' | 'error';
  issueUrl?: string;
  issueTitle?: string;
  taskId?: string;
  agentStatus?: 'running' | 'idle';
  onDelete?: (id: string) => void;
}
```

**ReactFlow Integration:**

```typescript
const nodeTypes = {
  worktree: WorktreeCard,
  zone: ZoneCard
};

<ReactFlow
  nodes={nodes}
  nodeTypes={nodeTypes}
  // ...
/>
```

---

#### 3. ZoneCard

**Location:** `/dashboard/components/zone-card.tsx`

**Purpose:** Visual boundary for workflow zones

**Props Interface:**

```typescript
interface ZoneCardProps {
  id: string;
  name: string;
  description?: string;
  trigger?: 'onDrop' | 'manual' | 'scheduled';
  agents?: string[];
  promptTemplate?: string;
  actions?: Array<{ type: string }>;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}
```

**Styling:**

```typescript
// Dashed border for zone boundary
className="border-2 border-dashed border-gray-300"

// Trigger badge colors
const triggerColors = {
  onDrop: 'bg-blue-100 text-blue-800',
  manual: 'bg-purple-100 text-purple-800',
  scheduled: 'bg-orange-100 text-orange-800'
};
```

---

#### 4. CanvasToolbar

**Location:** `/dashboard/components/canvas-toolbar.tsx`

**Purpose:** Control panel for canvas operations

**Key Features:**
- Create Zone dialog
- Create Worktree dialog
- Form validation
- Error handling

**Form Validation:**

```typescript
const validateBranchName = (name: string) => {
  const valid = /^[a-zA-Z0-9/_-]+$/.test(name);
  if (!valid) {
    setError('Branch name can only contain letters, numbers, -, _, and /');
    return false;
  }
  return true;
};
```

---

## Database Schema

### Schema Overview

Phase 9 uses SQLite with four main tables:

**File:** `/core/database/visual_schema.sql`

### Tables

#### worktrees

```sql
CREATE TABLE worktrees (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL,
  port INTEGER NOT NULL UNIQUE,
  branch_name TEXT NOT NULL,
  issue_url TEXT,
  task_id TEXT,
  status TEXT DEFAULT 'active',
  position_x INTEGER DEFAULT 0,
  position_y INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT
);

CREATE INDEX idx_worktrees_status ON worktrees(status);
CREATE INDEX idx_worktrees_port ON worktrees(port);
```

**Columns:**
- `id` - Unique worktree ID (wt-[timestamp]-[random])
- `path` - Filesystem path to worktree
- `port` - Allocated port (3001-3999)
- `branch_name` - Git branch name
- `issue_url` - Linked GitHub issue/PR URL
- `task_id` - Custom task identifier
- `status` - active, idle, error
- `position_x`, `position_y` - Canvas position
- `created_at`, `updated_at` - Timestamps

---

#### zones

```sql
CREATE TABLE zones (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  trigger TEXT DEFAULT 'onDrop',
  agents TEXT,              -- JSON array
  prompt_template TEXT,
  actions TEXT,             -- JSON array
  position_x INTEGER DEFAULT 0,
  position_y INTEGER DEFAULT 0,
  size_width INTEGER DEFAULT 300,
  size_height INTEGER DEFAULT 200,
  created_at TEXT NOT NULL,
  updated_at TEXT
);

CREATE INDEX idx_zones_trigger ON zones(trigger);
```

**Columns:**
- `id` - Unique zone ID (zone-[timestamp]-[random])
- `name` - Zone name (e.g., "Development")
- `description` - Zone purpose
- `trigger` - onDrop, manual, scheduled
- `agents` - JSON array of agent names
- `prompt_template` - Template with variables
- `actions` - JSON array of action configs
- `position_x`, `position_y` - Canvas position
- `size_width`, `size_height` - Zone dimensions
- `created_at`, `updated_at` - Timestamps

---

#### worktree_zones

```sql
CREATE TABLE worktree_zones (
  worktree_id TEXT PRIMARY KEY,
  zone_id TEXT NOT NULL,
  assigned_at TEXT NOT NULL,
  FOREIGN KEY (worktree_id) REFERENCES worktrees(id) ON DELETE CASCADE,
  FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE CASCADE
);

CREATE INDEX idx_worktree_zones_zone ON worktree_zones(zone_id);
```

**Purpose:** Many-to-one relationship (worktree belongs to one zone)

**Constraints:**
- One worktree can only be in one zone
- Deleting worktree or zone cascades deletion

---

#### zone_executions

```sql
CREATE TABLE zone_executions (
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
);

CREATE INDEX idx_executions_zone ON zone_executions(zone_id);
CREATE INDEX idx_executions_worktree ON zone_executions(worktree_id);
CREATE INDEX idx_executions_timestamp ON zone_executions(executed_at);
```

**Purpose:** Execution history and audit log

**Columns:**
- `id` - Unique execution ID
- `zone_id` - Zone that executed
- `worktree_id` - Worktree involved
- `agent_type` - Agent that ran (frontend, backend, etc.)
- `prompt` - Full prompt sent to LLM
- `result` - JSON result from LLM
- `success` - 1 for success, 0 for failure
- `executed_at` - Execution timestamp

---

### Database Migrations

Phase 9 uses an idempotent migration script:

**File:** `/scripts/migrate_to_phase9.js`

**Features:**
- Creates tables if they don't exist (`CREATE TABLE IF NOT EXISTS`)
- Creates default zones (Development, Testing, Review, Deployment)
- Skips zones that already exist
- Creates backup before migration
- Rollback support on failure
- Verification after migration

**Usage:**

```bash
# Run migration
node scripts/migrate_to_phase9.js

# Verify migration
node scripts/migrate_to_phase9.js verify

# Rollback to backup
node scripts/migrate_to_phase9.js rollback
```

---

## API Reference

See [PHASE_9_API_REFERENCE.md](./PHASE_9_API_REFERENCE.md) for complete REST API documentation.

**Quick Reference:**

**Worktrees:**
- `POST /api/worktrees` - Create
- `GET /api/worktrees` - List
- `GET /api/worktrees/:id` - Get
- `PUT /api/worktrees/:id` - Update
- `DELETE /api/worktrees/:id` - Delete

**Zones:**
- `POST /api/zones` - Create
- `GET /api/zones` - List
- `GET /api/zones/:id` - Get
- `PUT /api/zones/:id` - Update
- `DELETE /api/zones/:id` - Delete

**Assignments:**
- `POST /api/zones/:zoneId/assign/:worktreeId` - Assign
- `DELETE /api/zones/assign/:worktreeId` - Remove
- `GET /api/zones/:zoneId/worktrees` - List worktrees in zone

---

## WebSocket Events

### Event Format

All events follow this structure:

```json
{
  "type": "event_name",
  "data": { /* event-specific data */ }
}
```

### Event Types

**Worktree Events:**

```javascript
// Worktree created
{
  "type": "worktree:created",
  "data": {
    "id": "wt-123",
    "branchName": "feature/new-ui",
    "port": 3001,
    "status": "active",
    ...
  }
}

// Worktree updated
{
  "type": "worktree:updated",
  "data": {
    "id": "wt-123",
    "status": "completed",
    ...
  }
}

// Worktree deleted
{
  "type": "worktree:deleted",
  "data": {
    "worktreeId": "wt-123"
  }
}
```

**Zone Events:**

```javascript
// Zone created
{
  "type": "zone:created",
  "data": {
    "id": "zone-456",
    "name": "Development",
    "trigger": "onDrop",
    ...
  }
}

// Zone updated
{
  "type": "zone:updated",
  "data": {
    "id": "zone-456",
    "name": "Testing",
    ...
  }
}

// Zone deleted
{
  "type": "zone:deleted",
  "data": {
    "zoneId": "zone-456"
  }
}
```

**Assignment Events:**

```javascript
// Worktree assigned to zone
{
  "type": "worktree:assigned",
  "data": {
    "worktreeId": "wt-123",
    "zoneId": "zone-456"
  }
}

// Worktree removed from zone
{
  "type": "worktree:removed",
  "data": {
    "worktreeId": "wt-123",
    "zoneId": "zone-456"
  }
}
```

**Trigger Events:**

```javascript
// Trigger executed successfully
{
  "type": "trigger:executed",
  "data": {
    "zoneId": "zone-456",
    "worktreeId": "wt-123",
    "results": [
      {
        "agentType": "frontend",
        "success": true,
        "result": { ... }
      }
    ]
  }
}

// Trigger failed
{
  "type": "trigger:failed",
  "data": {
    "zoneId": "zone-456",
    "worktreeId": "wt-123",
    "error": "LLM request failed"
  }
}
```

### Client Integration

**React/TypeScript:**

```typescript
useEffect(() => {
  const ws = new WebSocket('ws://localhost:8080');

  ws.addEventListener('open', () => {
    console.log('WebSocket connected');
  });

  ws.addEventListener('message', (event) => {
    const { type, data } = JSON.parse(event.data);

    switch(type) {
      case 'worktree:created':
        addWorktree(data);
        break;
      case 'zone:created':
        addZone(data);
        break;
      case 'trigger:executed':
        showNotification('Trigger executed successfully');
        break;
      // ... more handlers
    }
  });

  ws.addEventListener('close', () => {
    console.log('WebSocket disconnected');
    // Implement reconnection logic
  });

  return () => ws.close();
}, []);
```

---

## Integration Patterns

### Integrating with LLMBridge

**Example: Custom Agent Execution**

```javascript
import { LLMBridge } from './core/llm_bridge.js';
import { ZoneManager } from './core/zones/zone_manager.js';

const llmBridge = new LLMBridge(config);
const zoneManager = new ZoneManager({ llmBridge });

// Listen for trigger events
zoneManager.on('trigger:executed', async ({ results }) => {
  for (const result of results) {
    if (result.success) {
      console.log(`${result.agentType} completed:`, result.result.text);
    }
  }
});
```

### Integrating with GitHub API

**Example: Custom Context Extraction**

```javascript
import { GitHubContextProvider } from './core/integrations/github_context_provider.js';

const github = new GitHubContextProvider({
  token: process.env.GITHUB_TOKEN
});

// Get context from URL
const context = await github.getContextFromUrl(
  'https://github.com/owner/repo/issues/123'
);

// Inject into template
const template = 'Implement: {{ github.title }}\n{{ github.description }}';
const prompt = github.injectContext(template, context);
```

### Integrating Custom Actions

**Example: Add Custom Action Executor**

```javascript
// In ZoneManager
async _executeActions(zone, worktree, results) {
  for (const action of zone.actions || []) {
    if (action.type === 'myCustomAction') {
      await this._executeMyCustomAction(action, worktree, results);
    }
  }
}

async _executeMyCustomAction(action, worktree, results) {
  // Custom logic here
  const result = await myService.doSomething(action.params);

  this.emit('action:myCustomAction', {
    zoneId: worktree.zoneId,
    worktreeId: worktree.id,
    result
  });
}
```

---

## Testing Guidelines

### Testing Strategy

Phase 9 uses a comprehensive testing approach:

**Unit Tests (80%+ coverage):**
- Business logic in managers
- Database operations
- Template injection
- Port allocation

**Integration Tests:**
- API endpoints
- WebSocket events
- End-to-end workflows

**Frontend Tests:**
- Component rendering
- User interactions
- State management

### Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Writing Unit Tests

**Example: WorktreeManager Test**

```javascript
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { WorktreeManager } from '../core/worktree/worktree_manager.js';

describe('WorktreeManager', () => {
  let manager;

  before(() => {
    manager = new WorktreeManager({
      repoPath: '/tmp/test-repo',
      portRange: { min: 3001, max: 3010 }
    });
  });

  it('should create a worktree with unique port', async () => {
    const worktree = await manager.createWorktree({
      branchName: 'test-branch'
    });

    assert.ok(worktree.id);
    assert.ok(worktree.port >= 3001 && worktree.port <= 3010);
    assert.strictEqual(worktree.branchName, 'test-branch');
  });

  after(async () => {
    // Cleanup
    const worktrees = manager.listWorktrees();
    for (const wt of worktrees) {
      await manager.deleteWorktree(wt.id);
    }
  });
});
```

### Writing Integration Tests

**Example: API Endpoint Test**

```javascript
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../server.js';

describe('POST /api/worktrees', () => {
  let csrfToken;

  before(async () => {
    // Get CSRF token
    const res = await request(app).get('/api/csrf-token');
    csrfToken = res.body.csrfToken;
  });

  it('should create a worktree', async () => {
    const res = await request(app)
      .post('/api/worktrees')
      .set('X-CSRF-Token', csrfToken)
      .send({
        branchName: 'feature/test',
        issueUrl: 'https://github.com/owner/repo/issues/1'
      });

    assert.strictEqual(res.status, 201);
    assert.ok(res.body.id);
    assert.strictEqual(res.body.branchName, 'feature/test');
  });
});
```

### Frontend Testing

**Example: Component Test**

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { WorktreeCard } from './worktree-card';

describe('WorktreeCard', () => {
  it('should render branch name', () => {
    render(<WorktreeCard branchName="feature/test" />);
    expect(screen.getByText('feature/test')).toBeInTheDocument();
  });

  it('should call onDelete when delete clicked', () => {
    const onDelete = vi.fn();
    render(<WorktreeCard id="wt-1" onDelete={onDelete} />);

    fireEvent.click(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalledWith('wt-1');
  });
});
```

---

## Extending the System

### Adding a New Trigger Type

**Step 1: Update Database Schema**

```sql
-- Add new trigger type to zones table
-- (Already supports any TEXT value)
```

**Step 2: Update ZoneManager**

```javascript
// In zone_manager.js
async assignWorktreeToZone(worktreeId, zoneId, worktree) {
  // ... existing code ...

  // Add custom trigger logic
  if (zone.trigger === 'onCommit') {
    await this._executeOnCommitTrigger(zone, worktree);
  }
}

async _executeOnCommitTrigger(zone, worktree) {
  // Custom trigger logic
  // Listen for git commits in worktree
  // Execute when commit detected
}
```

**Step 3: Update Frontend**

```typescript
// In zone-card.tsx
const triggerColors = {
  onDrop: 'bg-blue-100',
  manual: 'bg-purple-100',
  scheduled: 'bg-orange-100',
  onCommit: 'bg-green-100'  // New trigger
};
```

### Adding a New Action Type

**Step 1: Implement Action Executor**

```javascript
// In zone_manager.js
async _executeActions(zone, worktree, results) {
  for (const action of zone.actions || []) {
    switch(action.type) {
      case 'deployToStaging':
        await this._executeDeployToStaging(action, worktree);
        break;
      // ... other actions
    }
  }
}

async _executeDeployToStaging(action, worktree) {
  logger.info('[ZoneManager] Deploying to staging', { worktree: worktree.id });

  try {
    // Deploy logic
    const result = await deployService.deploy({
      branch: worktree.branchName,
      environment: 'staging'
    });

    this.emit('action:deployToStaging', {
      zoneId: worktree.zoneId,
      worktreeId: worktree.id,
      result
    });
  } catch (error) {
    logger.error('[ZoneManager] Deploy failed', { error: error.message });
  }
}
```

**Step 2: Update Frontend**

```typescript
// In zone-card.tsx
const actionIcons = {
  runTests: '🧪',
  createPR: '🔀',
  notify: '🔔',
  webhook: '🪝',
  deployToStaging: '🚀'  // New action
};
```

### Adding Custom Canvas Features

**Example: Canvas Export**

```typescript
// In workflow-canvas.tsx
const exportCanvasToJSON = () => {
  const data = {
    worktrees,
    zones,
    timestamp: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json'
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'canvas-export.json';
  a.click();
};
```

---

## Performance Optimization

### Database Optimization

**Use Indexes:**
```sql
-- Already created in schema
CREATE INDEX idx_worktrees_status ON worktrees(status);
CREATE INDEX idx_executions_timestamp ON zone_executions(executed_at);
```

**Use Prepared Statements:**
```javascript
// In visual_db.js
const stmt = this.db.prepare(
  'SELECT * FROM worktrees WHERE status = ?'
);
const worktrees = stmt.all('active');
```

**Enable WAL Mode:**
```javascript
db.pragma('journal_mode = WAL');  // Better concurrency
```

### Frontend Optimization

**Memoize Components:**
```typescript
import React from 'react';

export const WorktreeCard = React.memo(({ id, branchName }) => {
  // Component logic
});
```

**Virtualize Large Lists:**
```typescript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={worktrees.length}
  itemSize={120}
>
  {({ index, style }) => (
    <div style={style}>
      <WorktreeCard {...worktrees[index]} />
    </div>
  )}
</FixedSizeList>
```

**Debounce Updates:**
```typescript
import { debounce } from 'lodash';

const debouncedUpdate = debounce((position) => {
  updateNodePosition(nodeId, position);
}, 500);
```

### Caching Strategy

**GitHub Context:**
- 5-minute TTL (configurable)
- LRU eviction
- Automatic cleanup

**LLM Results:**
- Not cached (each execution is unique)
- Consider caching for identical prompts

---

## Debugging and Logging

### Logging Levels

```bash
# In .env
LOG_LEVEL=debug    # debug, info, warn, error
```

**Log Output:**

```javascript
[2025-11-14T12:00:00.000Z] [info] [WorktreeManager] Creating worktree {
  branchName: "feature/new-ui",
  issueUrl: "https://github.com/owner/repo/issues/123"
}

[2025-11-14T12:00:01.234Z] [debug] [WorktreeManager] Allocated port { port: 3001 }

[2025-11-14T12:00:02.456Z] [info] [WorktreeManager] Worktree created {
  id: "wt-1731603002-abc123",
  port: 3001
}
```

### Debug Tools

**Browser DevTools:**
```javascript
// In browser console
window.debugPhase9 = {
  worktrees: () => console.table(useDashboardStore.getState().worktrees),
  zones: () => console.table(useDashboardStore.getState().zones),
  ws: () => console.log(ws.readyState)
};

// Usage
window.debugPhase9.worktrees();
```

**Server Debugging:**

```bash
# Enable debug logs
DEBUG=phase9:* npm start

# Or specific components
DEBUG=phase9:worktree,phase9:zone npm start
```

**Database Inspection:**

```bash
# Open SQLite database
sqlite3 data/visual.db

# Queries
SELECT * FROM worktrees;
SELECT * FROM zones;
SELECT * FROM zone_executions ORDER BY executed_at DESC LIMIT 10;
```

### Common Debug Scenarios

**Worktree not appearing:**
1. Check WebSocket connection: `ws.readyState === 1`
2. Check database: `SELECT * FROM worktrees`
3. Check server logs: `docker-compose logs -f app`

**Zone trigger not executing:**
1. Verify zone trigger type: `SELECT trigger FROM zones WHERE id = ?`
2. Check LLM provider status: `GET /api/providers`
3. Review execution history: `SELECT * FROM zone_executions WHERE zone_id = ?`

**Port conflicts:**
1. Check allocated ports: `GET /api/worktrees/ports/status`
2. Verify port availability: `lsof -i :3001`
3. Clean up orphaned worktrees: `node scripts/cleanup.js`

---

## Best Practices

### Code Quality

**Linting:**
```bash
npm run lint         # Run ESLint
npm run lint:fix     # Auto-fix issues
```

**Type Safety:**
- Use TypeScript for all new frontend code
- Add JSDoc comments for JavaScript
- Define interfaces for all data structures

**Error Handling:**
```javascript
// Always wrap async operations
try {
  const result = await operation();
  return result;
} catch (error) {
  logger.error('Operation failed', {
    error: error.message,
    context: { ... }
  });
  throw error;  // Re-throw or handle gracefully
}
```

### Security

**Input Validation:**
```javascript
// Validate branch names
const BRANCH_NAME_REGEX = /^[a-zA-Z0-9/_-]+$/;
if (!BRANCH_NAME_REGEX.test(branchName)) {
  throw new Error('Invalid branch name');
}

// Sanitize user input
import xss from 'xss';
const safeName = xss(userInput);
```

**CSRF Protection:**
```javascript
// All POST/PUT/DELETE require CSRF token
app.use('/api', csrfProtection);

// Client must include token
fetch('/api/worktrees', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': csrfToken
  }
});
```

**SQL Injection Prevention:**
```javascript
// Use prepared statements (better-sqlite3)
const stmt = db.prepare('SELECT * FROM worktrees WHERE id = ?');
const worktree = stmt.get(id);  // Safe
```

### Documentation

**Code Comments:**
```javascript
/**
 * Creates a new Git worktree
 *
 * @param {Object} params - Worktree parameters
 * @param {string} params.branchName - Branch name (required)
 * @param {string} [params.issueUrl] - GitHub issue URL
 * @returns {Promise<Object>} Created worktree
 * @throws {Error} If branch name is invalid or port allocation fails
 */
async createWorktree({ branchName, issueUrl }) {
  // Implementation
}
```

**API Documentation:**
- Use JSDoc or TypeDoc
- Document all public methods
- Include usage examples

---

**Document Version:** 1.0
**Last Updated:** November 14, 2025
**Status:** Production Ready

For user-facing documentation, see [PHASE_9_USER_GUIDE.md](./PHASE_9_USER_GUIDE.md).
