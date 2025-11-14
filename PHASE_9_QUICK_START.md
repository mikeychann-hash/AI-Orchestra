# Phase 9 API - Quick Start Guide

## What Was Built

✅ **Backend Classes** (4 files, 1,549 lines of code)
- `VisualDatabase` - SQLite persistence for worktrees, zones, executions
- `WorktreeManager` - Git worktree lifecycle & port allocation
- `ZoneManager` - Zone orchestration & trigger execution
- `GitHubContextProvider` - GitHub context extraction & template injection

✅ **REST API Endpoints** (20+ endpoints)
- Worktrees: POST, GET, PUT, DELETE
- Zones: POST, GET, PUT, DELETE
- Assignments: POST, DELETE, GET worktrees in zone
- Utilities: Port status, execution history

✅ **WebSocket Events** (8 event types)
- `worktree:created`, `worktree:updated`, `worktree:deleted`
- `zone:created`, `zone:updated`, `zone:deleted`
- `worktree:assigned`, `worktree:removed`
- `trigger:executed`, `trigger:failed`

✅ **Integration Tests** (25 tests)
- API endpoint tests
- WebSocket event tests

✅ **Security**
- CSRF protection on all endpoints
- Input validation
- Rate limiting
- SQL injection prevention

---

## Quick Test

### 1. Start the server
```bash
npm start
```

### 2. Get CSRF token
```bash
CSRF_TOKEN=$(curl -s http://localhost:3000/api/csrf-token | jq -r .csrfToken)
```

### 3. Create a zone
```bash
curl -X POST http://localhost:3000/api/zones \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -d '{
    "name": "Development Zone",
    "trigger": "onDrop",
    "agents": ["frontend"],
    "promptTemplate": "Implement {{ github.title }}"
  }'
```

### 4. Create a worktree
```bash
curl -X POST http://localhost:3000/api/worktrees \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -d '{
    "branchName": "feature-test",
    "issueUrl": "https://github.com/test/repo/issues/1"
  }'
```

### 5. List resources
```bash
# List all zones
curl http://localhost:3000/api/zones

# List all worktrees
curl http://localhost:3000/api/worktrees

# Get port status
curl http://localhost:3000/api/worktrees/ports/status
```

---

## API Endpoints Reference

### Worktrees
- `POST /api/worktrees` - Create worktree
- `GET /api/worktrees` - List all worktrees
- `GET /api/worktrees/:id` - Get worktree
- `PUT /api/worktrees/:id` - Update worktree
- `DELETE /api/worktrees/:id` - Delete worktree

### Zones
- `POST /api/zones` - Create zone
- `GET /api/zones` - List all zones
- `GET /api/zones/:id` - Get zone
- `PUT /api/zones/:id` - Update zone
- `DELETE /api/zones/:id` - Delete zone

### Assignments
- `POST /api/zones/:zoneId/assign/:worktreeId` - Assign worktree to zone
- `DELETE /api/zones/assign/:worktreeId` - Remove worktree from zone
- `GET /api/zones/:zoneId/worktrees` - Get worktrees in zone
- `GET /api/zones/:zoneId/executions` - Get execution history

---

## WebSocket Example

```javascript
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:8080');

ws.on('message', (data) => {
  const event = JSON.parse(data);
  console.log(`[${event.type}]`, event.data);
});
```

---

## Environment Variables

Add to `.env`:
```bash
WORKTREE_BASE_PATH=.worktrees
WORKTREE_PORT_MIN=3001
WORKTREE_PORT_MAX=3999
VISUAL_DB_PATH=./data/visual.db
```

---

## Run Tests

```bash
# All Phase 9 tests
npm test -- tests/integration/phase9*.test.js

# API tests only
npm test -- tests/integration/phase9_api.test.js

# WebSocket tests only
npm test -- tests/integration/phase9_websocket.test.js
```

---

## File Locations

```
core/
├── api/phase9_routes.js
├── database/visual_db.js
├── worktree/worktree_manager.js
├── zones/zone_manager.js
└── integrations/github_context_provider.js

tests/integration/
├── phase9_api.test.js
└── phase9_websocket.test.js
```

---

## Next Steps

1. ✅ Backend API - **COMPLETE**
2. ⏭️ Frontend Canvas (Week 3-4)
3. ⏭️ GitHub Integration UI (Week 5)
4. ⏭️ Zone Triggers UI (Week 6)

**Status**: Ready for frontend integration!
