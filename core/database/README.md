# Visual Orchestration Database Layer

## Overview

The Visual Orchestration database layer provides persistent storage for Phase 9's visual workflow system using SQLite with better-sqlite3.

## Architecture

```
core/database/
├── visual_schema.sql    # Database schema (4 tables + indexes)
├── visual_db.js         # VisualDatabase class with CRUD operations
└── README.md           # This file

scripts/
└── migrate_to_phase9.js # Migration script with default zones
```

## Database Schema

### Tables

1. **worktrees** - Git worktree metadata
   - Tracks path, port, branch, GitHub issue URL
   - Stores canvas position (x, y)
   - Enforces unique port constraint

2. **zones** - Workflow zones/stages
   - Stores zone configuration (name, description, trigger)
   - Agent assignments (JSON array)
   - Prompt templates and actions (JSON)
   - Canvas position and size

3. **worktree_zones** - Assignments
   - Links worktrees to zones
   - One worktree can be in one zone at a time
   - Cascade deletes on worktree/zone deletion

4. **zone_executions** - Execution history
   - Records every zone trigger execution
   - Stores prompt, result, success status
   - Enables audit trail and analytics

### Performance Features

- **WAL mode** - Better concurrent access
- **Foreign keys** - Data integrity
- **Indexes** - Fast queries on status, trigger, timestamps
- **Transactions** - Atomic multi-operation updates

## Usage Examples

### Basic CRUD Operations

```javascript
import { VisualDatabase } from './core/database/visual_db.js';

const db = new VisualDatabase();

// Create a worktree
const worktree = db.createWorktree({
  id: 'wt-feature-123',
  path: '/tmp/worktrees/feature-123',
  port: 3001,
  branchName: 'feature/user-auth',
  issueUrl: 'https://github.com/owner/repo/issues/123',
  taskId: 'TASK-123',
  position: { x: 100, y: 200 }
});

// Create a zone
const zone = db.createZone({
  id: 'zone-dev',
  name: 'Development',
  description: 'Active development work',
  trigger: 'onDrop',
  agents: ['frontend', 'backend'],
  promptTemplate: 'Implement: {{ github.title }}',
  position: { x: 50, y: 50 },
  size: { width: 350, height: 450 }
});

// Assign worktree to zone
db.assignWorktreeToZone('wt-feature-123', 'zone-dev');

// Record execution
db.recordExecution({
  zoneId: 'zone-dev',
  worktreeId: 'wt-feature-123',
  agentType: 'frontend',
  prompt: 'Implement user authentication',
  result: { output: 'Success', files: ['auth.js'] },
  success: true
});
```

### Querying and Analytics

```javascript
// List all active worktrees
const activeWorktrees = db.listWorktrees({ status: 'active' });

// Get worktrees in a zone
const zoneWorktrees = db.getWorktreesInZone('zone-dev');

// Get execution history
const history = db.getExecutionHistory('zone-dev', 50);

// Get execution statistics
const stats = db.getExecutionStats({ zoneId: 'zone-dev' });
console.log(stats);
// { total: 100, successful: 95, failed: 5, uniqueAgents: 3, successRate: 95 }

// Get overall database stats
const dbStats = db.getStats();
// { worktrees: 10, zones: 4, assignments: 8, executions: 100 }
```

### Transaction Support

```javascript
// Execute multiple operations atomically
db.transaction(() => {
  const wt = db.createWorktree({ /* ... */ });
  db.assignWorktreeToZone(wt.id, 'zone-dev');
  db.recordExecution({ /* ... */ });
  // If any operation fails, all are rolled back
});
```

### Update Operations

```javascript
// Update worktree status
db.updateWorktree('wt-feature-123', {
  status: 'completed',
  position: { x: 500, y: 300 }
});

// Update zone configuration
db.updateZone('zone-dev', {
  agents: ['frontend', 'backend', 'qa'],
  promptTemplate: 'Updated template: {{ github.title }}'
});
```

### Cleanup

```javascript
// Delete worktree (also removes assignments and executions)
db.deleteWorktree('wt-feature-123');

// Delete zone (also removes assignments and executions)
db.deleteZone('zone-dev');

// Close database connection
db.close();
```

## Migration

Run the Phase 9 migration to set up the database and create default zones:

```bash
node scripts/migrate_to_phase9.js
```

### Migration Features

- **Idempotent** - Safe to run multiple times
- **Automatic Backup** - Creates backup before migration
- **Rollback Support** - Can restore from backup if needed
- **Verification** - Tests all tables after migration
- **Default Zones** - Creates 4 pre-configured zones

### Default Zones Created

1. **Development** - Active development work
   - Agents: frontend, backend
   - Trigger: onDrop
   - Position: (50, 50)

2. **Testing** - QA and testing
   - Agents: qa, test-engineer
   - Trigger: onDrop
   - Actions: runTests
   - Position: (450, 50)

3. **Code Review** - Ready for review
   - Agents: code-reviewer
   - Trigger: onDrop
   - Actions: runTests, createPR
   - Position: (850, 50)

4. **Deployment** - Production deployment
   - Agents: devops
   - Trigger: manual
   - Actions: runTests, notify
   - Position: (1250, 50)

### Migration Commands

```bash
# Run migration
node scripts/migrate_to_phase9.js

# Verify migration without running
node scripts/migrate_to_phase9.js verify

# Rollback to most recent backup
node scripts/migrate_to_phase9.js rollback
```

## Testing

Comprehensive test suite with 34 tests covering:

- CRUD operations for all entities
- Foreign key constraints
- Transaction rollbacks
- Concurrent operations
- Cascade deletions
- Statistics and analytics

```bash
# Run tests
npm run test:unit -- tests/unit/visual_db.test.js

# Run with coverage
npm run test:coverage
```

### Test Coverage

- **Initialization**: Schema creation, WAL mode, foreign keys
- **Worktree Operations**: Create, read, update, delete, unique ports
- **Zone Operations**: Full CRUD, default values, JSON fields
- **Assignments**: Create, update, remove, cascade deletes
- **Execution History**: Record, query, statistics, limits
- **Transactions**: Success, rollback on error
- **Concurrent Operations**: Parallel worktree creation
- **Database Statistics**: Accurate counts

## Schema Design Decisions

### 1. SQLite vs PostgreSQL
- **Choice**: SQLite with better-sqlite3
- **Reasoning**:
  - No external dependencies (embedded)
  - Perfect for single-server deployments
  - Excellent performance for this use case
  - Synchronous API (simpler code)
  - WAL mode for concurrency

### 2. JSON Fields
- **Fields**: agents, actions in zones table
- **Reasoning**:
  - Flexible agent lists
  - Complex action configurations
  - SQLite has built-in JSON support
  - Easier to extend without migrations

### 3. Cascade Deletes
- **Applied to**: worktree_zones, zone_executions
- **Reasoning**:
  - Automatic cleanup
  - Maintains referential integrity
  - Prevents orphaned records

### 4. Position Storage
- **Choice**: Separate position_x, position_y columns
- **Reasoning**:
  - Easier to query and index
  - Better performance than JSON
  - Simple updates

### 5. Timestamps
- **Format**: ISO 8601 strings
- **Reasoning**:
  - SQLite doesn't have native date type
  - Human-readable
  - JSON-compatible
  - Easy to parse

## Integration with Other Components

### WorktreeManager Integration

```javascript
import { WorktreeManager } from './core/worktree/worktree_manager.js';
import { VisualDatabase } from './core/database/visual_db.js';

const db = new VisualDatabase();
const manager = new WorktreeManager();

// Create worktree and persist to database
const worktree = await manager.createWorktree({
  branchName: 'feature-123',
  issueUrl: 'https://github.com/owner/repo/issues/123'
});

db.createWorktree(worktree);
```

### ZoneManager Integration

```javascript
import { ZoneManager } from './core/zones/zone_manager.js';
import { VisualDatabase } from './core/database/visual_db.js';

const db = new VisualDatabase();
const zoneManager = new ZoneManager({ db });

// Zone manager can use db for persistence
zoneManager.on('worktree:assigned', ({ worktreeId, zoneId }) => {
  db.assignWorktreeToZone(worktreeId, zoneId);
});

zoneManager.on('trigger:executed', (result) => {
  db.recordExecution(result);
});
```

## Performance Considerations

### Read Performance
- Indexes on frequently queried columns
- WAL mode enables concurrent reads
- Prepared statements (cached by better-sqlite3)

### Write Performance
- Transactions for batch operations
- WAL mode better write performance
- Synchronous API (no async overhead)

### Scaling
- Current design supports:
  - 100+ worktrees
  - 50+ zones
  - 10,000+ executions
- For larger scale, consider PostgreSQL migration

## Security

- **SQL Injection**: Prevented by parameterized queries
- **Foreign Keys**: Enforced for data integrity
- **Constraints**: Unique ports, primary keys
- **Error Handling**: Safe error messages (no stack traces to clients)

## Future Enhancements

1. **Database Migrations System**
   - Version tracking
   - Up/down migrations
   - Schema evolution

2. **Query Builder**
   - More complex filters
   - Sorting options
   - Pagination

3. **Caching Layer**
   - In-memory cache for hot data
   - TTL-based invalidation

4. **Backup Automation**
   - Scheduled backups
   - Retention policies
   - Point-in-time recovery

5. **Analytics Views**
   - Materialized views for common queries
   - Performance dashboards
   - Execution trends

## Troubleshooting

### Database Locked
```javascript
// Increase busy timeout
db.db.pragma('busy_timeout = 5000');
```

### Foreign Key Violations
```javascript
// Check foreign key constraints
db.db.pragma('foreign_key_check');
```

### Performance Issues
```javascript
// Analyze query performance
db.db.prepare('EXPLAIN QUERY PLAN SELECT ...').all();

// Optimize database
db.db.exec('VACUUM');
db.db.exec('ANALYZE');
```

## License

MIT - Part of AI-Orchestra Phase 9 Implementation
