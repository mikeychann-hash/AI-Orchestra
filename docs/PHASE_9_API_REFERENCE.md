# Phase 9: API Reference

**Complete REST API and WebSocket documentation for Phase 9 Visual Orchestration.**

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Rate Limiting](#rate-limiting)
4. [Error Handling](#error-handling)
5. [Worktree Endpoints](#worktree-endpoints)
6. [Zone Endpoints](#zone-endpoints)
7. [Assignment Endpoints](#assignment-endpoints)
8. [Utility Endpoints](#utility-endpoints)
9. [WebSocket API](#websocket-api)
10. [Code Examples](#code-examples)

---

## Overview

### Base URL

```
http://localhost:3000/api
```

### API Versioning

Phase 9 uses URL path versioning. Current version: **v1** (implicit)

Future versions will use `/api/v2/` prefix.

### Content Type

All requests and responses use JSON:

```
Content-Type: application/json
```

### HTTP Methods

- `GET` - Retrieve resources
- `POST` - Create resources
- `PUT` - Update resources
- `DELETE` - Delete resources

---

## Authentication

### CSRF Protection

All state-changing endpoints (POST, PUT, DELETE) require CSRF token.

**Get CSRF Token:**

```http
GET /api/csrf-token
```

**Response:**
```json
{
  "csrfToken": "abc123def456"
}
```

**Using the Token:**

Include token in request header:

```http
POST /api/worktrees
X-CSRF-Token: abc123def456
Content-Type: application/json

{
  "branchName": "feature/new"
}
```

### API Keys

Phase 9 does not use API keys. Authentication will be added in Phase 10.

**Current Security:**
- CSRF protection
- Origin validation
- Rate limiting
- Input validation

---

## Rate Limiting

### Limits

**Default Limits:**
- 100 requests per 15 minutes per IP
- Burst: 10 requests per second

**Headers:**

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1731603900
```

### Rate Limit Exceeded

**Response (429 Too Many Requests):**

```json
{
  "error": "Too many requests, please try again later",
  "retryAfter": 900
}
```

**Retry-After Header:**

```http
Retry-After: 900
```

---

## Error Handling

### Error Response Format

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "branchName",
    "message": "Invalid characters"
  }
}
```

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request succeeded |
| 201 | Created | Resource created successfully |
| 204 | No Content | Request succeeded, no response body |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Authentication required (Phase 10) |
| 403 | Forbidden | CSRF token invalid |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource conflict (e.g., port in use) |
| 422 | Unprocessable Entity | Validation failed |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### Common Error Codes

| Code | Description |
|------|-------------|
| `INVALID_BRANCH_NAME` | Branch name contains invalid characters |
| `PORT_EXHAUSTED` | No available ports in range |
| `WORKTREE_EXISTS` | Worktree already exists |
| `WORKTREE_NOT_FOUND` | Worktree ID not found |
| `ZONE_NOT_FOUND` | Zone ID not found |
| `GITHUB_RATE_LIMIT` | GitHub API rate limit exceeded |
| `GIT_ERROR` | Git operation failed |
| `DATABASE_ERROR` | Database operation failed |

---

## Worktree Endpoints

### Create Worktree

Creates a new Git worktree with automatic port allocation.

**Endpoint:**
```http
POST /api/worktrees
```

**Headers:**
```http
Content-Type: application/json
X-CSRF-Token: {token}
```

**Request Body:**
```json
{
  "branchName": "feature/new-ui",
  "issueUrl": "https://github.com/owner/repo/issues/123",
  "taskId": "TASK-456",
  "position": {
    "x": 100,
    "y": 200
  }
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `branchName` | string | Yes | Git branch name (letters, numbers, -, _, /) |
| `issueUrl` | string | No | GitHub issue or PR URL |
| `taskId` | string | No | Custom task identifier |
| `position` | object | No | Canvas position {x, y} |

**Response (201 Created):**
```json
{
  "id": "wt-1731603000-abc123",
  "branchName": "feature/new-ui",
  "port": 3001,
  "path": ".worktrees/feature-new-ui",
  "status": "active",
  "issueUrl": "https://github.com/owner/repo/issues/123",
  "taskId": "TASK-456",
  "position": {
    "x": 100,
    "y": 200
  },
  "createdAt": "2025-11-14T12:00:00.000Z",
  "updatedAt": null
}
```

**Errors:**
- `400` - Invalid branch name
- `409` - Branch already has worktree
- `500` - Port exhaustion or Git error

**Example:**
```bash
curl -X POST http://localhost:3000/api/worktrees \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: abc123" \
  -d '{
    "branchName": "feature/new-ui",
    "issueUrl": "https://github.com/owner/repo/issues/123"
  }'
```

---

### List Worktrees

Retrieves all worktrees with optional filtering.

**Endpoint:**
```http
GET /api/worktrees
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status (active, idle, error) |

**Response (200 OK):**
```json
[
  {
    "id": "wt-1731603000-abc123",
    "branchName": "feature/new-ui",
    "port": 3001,
    "status": "active",
    ...
  },
  {
    "id": "wt-1731603100-def456",
    "branchName": "fix/bug-123",
    "port": 3002,
    "status": "idle",
    ...
  }
]
```

**Example:**
```bash
# All worktrees
curl http://localhost:3000/api/worktrees

# Active only
curl http://localhost:3000/api/worktrees?status=active
```

---

### Get Worktree

Retrieves a specific worktree by ID.

**Endpoint:**
```http
GET /api/worktrees/:id
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Worktree ID |

**Response (200 OK):**
```json
{
  "id": "wt-1731603000-abc123",
  "branchName": "feature/new-ui",
  "port": 3001,
  "path": ".worktrees/feature-new-ui",
  "status": "active",
  "issueUrl": "https://github.com/owner/repo/issues/123",
  "taskId": "TASK-456",
  "position": {
    "x": 100,
    "y": 200
  },
  "createdAt": "2025-11-14T12:00:00.000Z",
  "updatedAt": null
}
```

**Errors:**
- `404` - Worktree not found

**Example:**
```bash
curl http://localhost:3000/api/worktrees/wt-1731603000-abc123
```

---

### Update Worktree

Updates worktree metadata.

**Endpoint:**
```http
PUT /api/worktrees/:id
```

**Headers:**
```http
Content-Type: application/json
X-CSRF-Token: {token}
```

**Request Body:**
```json
{
  "status": "completed",
  "position": {
    "x": 300,
    "y": 400
  },
  "taskId": "TASK-789"
}
```

**Allowed Fields:**
- `status` (active, idle, error, completed)
- `position` ({x, y})
- `taskId` (string)

**Response (200 OK):**
```json
{
  "id": "wt-1731603000-abc123",
  "status": "completed",
  "position": {
    "x": 300,
    "y": 400
  },
  "updatedAt": "2025-11-14T12:05:00.000Z",
  ...
}
```

**Errors:**
- `404` - Worktree not found
- `400` - Invalid field

**Example:**
```bash
curl -X PUT http://localhost:3000/api/worktrees/wt-1731603000-abc123 \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: abc123" \
  -d '{
    "status": "completed"
  }'
```

---

### Delete Worktree

Deletes a worktree (removes Git worktree and database entry).

**Endpoint:**
```http
DELETE /api/worktrees/:id
```

**Headers:**
```http
X-CSRF-Token: {token}
```

**Response (204 No Content)**

No response body.

**Errors:**
- `404` - Worktree not found
- `500` - Git removal failed

**Example:**
```bash
curl -X DELETE http://localhost:3000/api/worktrees/wt-1731603000-abc123 \
  -H "X-CSRF-Token: abc123"
```

**Side Effects:**
- Git worktree removed from filesystem
- Port released for reuse
- Assignment to zone removed (if any)
- Database entry deleted

---

## Zone Endpoints

### Create Zone

Creates a new workflow zone.

**Endpoint:**
```http
POST /api/zones
```

**Headers:**
```http
Content-Type: application/json
X-CSRF-Token: {token}
```

**Request Body:**
```json
{
  "name": "Development",
  "description": "Active development work",
  "trigger": "onDrop",
  "agents": ["frontend", "backend"],
  "promptTemplate": "Implement {{ github.title }}\n\n{{ github.description }}",
  "actions": [
    { "type": "runTests" }
  ],
  "position": {
    "x": 50,
    "y": 50
  },
  "size": {
    "width": 350,
    "height": 450
  }
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Zone name |
| `description` | string | No | Zone purpose |
| `trigger` | string | No | onDrop, manual, scheduled (default: onDrop) |
| `agents` | array | No | List of agent names |
| `promptTemplate` | string | No | Prompt with template variables |
| `actions` | array | No | Post-execution actions |
| `position` | object | No | Canvas position {x, y} |
| `size` | object | No | Zone dimensions {width, height} |

**Response (201 Created):**
```json
{
  "id": "zone-1731603000-xyz789",
  "name": "Development",
  "description": "Active development work",
  "trigger": "onDrop",
  "agents": ["frontend", "backend"],
  "promptTemplate": "Implement {{ github.title }}\n\n{{ github.description }}",
  "actions": [
    { "type": "runTests" }
  ],
  "position": {
    "x": 50,
    "y": 50
  },
  "size": {
    "width": 350,
    "height": 450
  },
  "createdAt": "2025-11-14T12:00:00.000Z",
  "updatedAt": null
}
```

**Errors:**
- `400` - Name is required
- `500` - Database error

**Example:**
```bash
curl -X POST http://localhost:3000/api/zones \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: abc123" \
  -d '{
    "name": "Development",
    "trigger": "onDrop",
    "agents": ["frontend", "backend"]
  }'
```

---

### List Zones

Retrieves all zones.

**Endpoint:**
```http
GET /api/zones
```

**Response (200 OK):**
```json
[
  {
    "id": "zone-development",
    "name": "Development",
    "trigger": "onDrop",
    ...
  },
  {
    "id": "zone-testing",
    "name": "Testing",
    "trigger": "onDrop",
    ...
  }
]
```

**Example:**
```bash
curl http://localhost:3000/api/zones
```

---

### Get Zone

Retrieves a specific zone by ID.

**Endpoint:**
```http
GET /api/zones/:id
```

**Response (200 OK):**
```json
{
  "id": "zone-development",
  "name": "Development",
  "description": "Active development work",
  "trigger": "onDrop",
  "agents": ["frontend", "backend"],
  "promptTemplate": "...",
  "actions": [],
  "position": { "x": 50, "y": 50 },
  "size": { "width": 350, "height": 450 },
  "createdAt": "2025-11-14T12:00:00.000Z"
}
```

**Errors:**
- `404` - Zone not found

**Example:**
```bash
curl http://localhost:3000/api/zones/zone-development
```

---

### Update Zone

Updates zone configuration.

**Endpoint:**
```http
PUT /api/zones/:id
```

**Headers:**
```http
Content-Type: application/json
X-CSRF-Token: {token}
```

**Request Body:**
```json
{
  "name": "Testing & QA",
  "agents": ["qa", "test-engineer"],
  "promptTemplate": "New template..."
}
```

**Response (200 OK):**
```json
{
  "id": "zone-testing",
  "name": "Testing & QA",
  "agents": ["qa", "test-engineer"],
  "updatedAt": "2025-11-14T12:05:00.000Z",
  ...
}
```

**Errors:**
- `404` - Zone not found

**Example:**
```bash
curl -X PUT http://localhost:3000/api/zones/zone-testing \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: abc123" \
  -d '{
    "name": "Testing & QA"
  }'
```

---

### Delete Zone

Deletes a zone (does not delete worktrees inside).

**Endpoint:**
```http
DELETE /api/zones/:id
```

**Headers:**
```http
X-CSRF-Token: {token}
```

**Response (204 No Content)**

**Errors:**
- `404` - Zone not found

**Example:**
```bash
curl -X DELETE http://localhost:3000/api/zones/zone-development \
  -H "X-CSRF-Token: abc123"
```

**Side Effects:**
- Zone removed from database
- Worktree assignments to this zone removed
- Worktrees themselves are NOT deleted

---

## Assignment Endpoints

### Assign Worktree to Zone

Assigns a worktree to a zone, potentially triggering execution.

**Endpoint:**
```http
POST /api/zones/:zoneId/assign/:worktreeId
```

**Headers:**
```http
X-CSRF-Token: {token}
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `zoneId` | string | Zone ID |
| `worktreeId` | string | Worktree ID |

**Response (200 OK):**

**If trigger executes (onDrop):**
```json
{
  "success": true,
  "triggered": true,
  "results": [
    {
      "agentType": "frontend",
      "success": true,
      "result": {
        "text": "Implementation completed...",
        "usage": {
          "promptTokens": 1000,
          "completionTokens": 234,
          "totalTokens": 1234
        }
      }
    },
    {
      "agentType": "backend",
      "success": true,
      "result": {
        "text": "API endpoints created...",
        "usage": {
          "totalTokens": 2345
        }
      }
    }
  ]
}
```

**If no trigger (manual):**
```json
{
  "success": true,
  "triggered": false
}
```

**Errors:**
- `404` - Zone or worktree not found
- `500` - Execution failed

**Example:**
```bash
curl -X POST http://localhost:3000/api/zones/zone-development/assign/wt-1731603000-abc123 \
  -H "X-CSRF-Token: abc123"
```

**Side Effects:**
- Worktree assigned to zone
- If zone trigger is `onDrop`, agents execute
- WebSocket events emitted
- Execution recorded in database

---

### Remove Worktree from Zone

Removes worktree assignment.

**Endpoint:**
```http
DELETE /api/zones/assign/:worktreeId
```

**Headers:**
```http
X-CSRF-Token: {token}
```

**Response (204 No Content)**

**Errors:**
- `404` - Assignment not found

**Example:**
```bash
curl -X DELETE http://localhost:3000/api/zones/assign/wt-1731603000-abc123 \
  -H "X-CSRF-Token: abc123"
```

---

### Get Worktrees in Zone

Lists all worktrees assigned to a zone.

**Endpoint:**
```http
GET /api/zones/:zoneId/worktrees
```

**Response (200 OK):**
```json
[
  {
    "id": "wt-1731603000-abc123",
    "branchName": "feature/new-ui",
    "port": 3001,
    ...
  },
  {
    "id": "wt-1731603100-def456",
    "branchName": "fix/bug-123",
    "port": 3002,
    ...
  }
]
```

**Example:**
```bash
curl http://localhost:3000/api/zones/zone-development/worktrees
```

---

### Get Execution History

Retrieves execution history for a zone.

**Endpoint:**
```http
GET /api/zones/:zoneId/executions
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 100 | Max results to return |

**Response (200 OK):**
```json
[
  {
    "id": "exec-1731603000-abc",
    "zoneId": "zone-development",
    "worktreeId": "wt-1731603000-xyz",
    "agentType": "frontend",
    "prompt": "Implement {{ github.title }}...",
    "result": "{ \"text\": \"...\", \"usage\": {...} }",
    "success": 1,
    "executedAt": "2025-11-14T12:00:00.000Z"
  },
  ...
]
```

**Example:**
```bash
# Last 100 executions
curl http://localhost:3000/api/zones/zone-development/executions

# Last 10 executions
curl http://localhost:3000/api/zones/zone-development/executions?limit=10
```

---

## Utility Endpoints

### Get Port Allocation Status

Returns current port allocation statistics.

**Endpoint:**
```http
GET /api/worktrees/ports/status
```

**Response (200 OK):**
```json
{
  "total": 999,
  "allocated": 5,
  "available": 994,
  "allocatedPorts": [3001, 3002, 3003, 3004, 3005],
  "range": {
    "min": 3001,
    "max": 3999
  }
}
```

**Example:**
```bash
curl http://localhost:3000/api/worktrees/ports/status
```

---

### Update Node Position

Updates canvas position for a worktree or zone.

**Endpoint:**
```http
PUT /api/nodes/:nodeId/position
```

**Headers:**
```http
Content-Type: application/json
X-CSRF-Token: {token}
```

**Request Body:**
```json
{
  "x": 200,
  "y": 300
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "nodeId": "wt-1731603000-abc123",
  "position": {
    "x": 200,
    "y": 300
  }
}
```

**Example:**
```bash
curl -X PUT http://localhost:3000/api/nodes/wt-1731603000-abc123/position \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: abc123" \
  -d '{
    "x": 200,
    "y": 300
  }'
```

---

### Get Feature Flag Status

Checks if a feature flag is enabled.

**Endpoint:**
```http
GET /api/features/:flagName
```

**Response (200 OK):**
```json
{
  "enabled": true,
  "flag": "visualCanvas"
}
```

**Example:**
```bash
curl http://localhost:3000/api/features/visualCanvas
```

---

## WebSocket API

### Connection

**WebSocket URL:**
```
ws://localhost:8080
```

**Connection Example:**
```javascript
const ws = new WebSocket('ws://localhost:8080');

ws.addEventListener('open', () => {
  console.log('WebSocket connected');
});

ws.addEventListener('message', (event) => {
  const { type, data } = JSON.parse(event.data);
  console.log('Event:', type, data);
});

ws.addEventListener('close', () => {
  console.log('WebSocket disconnected');
});
```

---

### Event Format

All events follow this structure:

```json
{
  "type": "event_name",
  "data": {
    // Event-specific payload
  }
}
```

---

### Worktree Events

**worktree:created**

Emitted when a worktree is created.

```json
{
  "type": "worktree:created",
  "data": {
    "id": "wt-1731603000-abc123",
    "branchName": "feature/new-ui",
    "port": 3001,
    "status": "active",
    "createdAt": "2025-11-14T12:00:00.000Z"
  }
}
```

**worktree:updated**

Emitted when a worktree is updated.

```json
{
  "type": "worktree:updated",
  "data": {
    "id": "wt-1731603000-abc123",
    "status": "completed",
    "updatedAt": "2025-11-14T12:05:00.000Z"
  }
}
```

**worktree:deleted**

Emitted when a worktree is deleted.

```json
{
  "type": "worktree:deleted",
  "data": {
    "worktreeId": "wt-1731603000-abc123"
  }
}
```

---

### Zone Events

**zone:created**

```json
{
  "type": "zone:created",
  "data": {
    "id": "zone-1731603000-xyz789",
    "name": "Development",
    "trigger": "onDrop",
    "createdAt": "2025-11-14T12:00:00.000Z"
  }
}
```

**zone:updated**

```json
{
  "type": "zone:updated",
  "data": {
    "id": "zone-development",
    "name": "Testing & QA",
    "updatedAt": "2025-11-14T12:05:00.000Z"
  }
}
```

**zone:deleted**

```json
{
  "type": "zone:deleted",
  "data": {
    "zoneId": "zone-development"
  }
}
```

---

### Assignment Events

**worktree:assigned**

Emitted when a worktree is assigned to a zone.

```json
{
  "type": "worktree:assigned",
  "data": {
    "worktreeId": "wt-1731603000-abc123",
    "zoneId": "zone-development"
  }
}
```

**worktree:removed**

Emitted when a worktree is removed from a zone.

```json
{
  "type": "worktree:removed",
  "data": {
    "worktreeId": "wt-1731603000-abc123",
    "zoneId": "zone-development"
  }
}
```

---

### Trigger Events

**trigger:executed**

Emitted when a zone trigger executes successfully.

```json
{
  "type": "trigger:executed",
  "data": {
    "zoneId": "zone-development",
    "worktreeId": "wt-1731603000-abc123",
    "results": [
      {
        "agentType": "frontend",
        "success": true,
        "result": {
          "text": "Implementation completed...",
          "usage": {
            "totalTokens": 1234
          }
        }
      }
    ]
  }
}
```

**trigger:failed**

Emitted when a zone trigger fails.

```json
{
  "type": "trigger:failed",
  "data": {
    "zoneId": "zone-development",
    "worktreeId": "wt-1731603000-abc123",
    "error": "LLM request failed: Rate limit exceeded"
  }
}
```

---

### Action Events

**action:runTests**

```json
{
  "type": "action:runTests",
  "data": {
    "zoneId": "zone-testing",
    "worktreeId": "wt-1731603000-abc123",
    "result": {
      "passed": 45,
      "failed": 0,
      "duration": 5.2
    }
  }
}
```

**action:createPR**

```json
{
  "type": "action:createPR",
  "data": {
    "zoneId": "zone-review",
    "worktreeId": "wt-1731603000-abc123",
    "prUrl": "https://github.com/owner/repo/pull/456"
  }
}
```

**action:notify**

```json
{
  "type": "action:notify",
  "data": {
    "zoneId": "zone-deployment",
    "worktreeId": "wt-1731603000-abc123",
    "message": "Ready for deployment"
  }
}
```

**action:webhook**

```json
{
  "type": "action:webhook",
  "data": {
    "zoneId": "zone-custom",
    "worktreeId": "wt-1731603000-abc123",
    "response": {
      "status": 200,
      "body": "Webhook received"
    }
  }
}
```

---

## Code Examples

### JavaScript/Node.js

**Complete Workflow:**

```javascript
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000/api';
let csrfToken;

// 1. Get CSRF token
async function getCsrfToken() {
  const res = await fetch(`${BASE_URL}/csrf-token`);
  const data = await res.json();
  csrfToken = data.csrfToken;
}

// 2. Create a worktree
async function createWorktree(branchName, issueUrl) {
  const res = await fetch(`${BASE_URL}/worktrees`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken
    },
    body: JSON.stringify({
      branchName,
      issueUrl,
      position: { x: 100, y: 100 }
    })
  });

  return await res.json();
}

// 3. Create a zone
async function createZone(name, agents) {
  const res = await fetch(`${BASE_URL}/zones`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken
    },
    body: JSON.stringify({
      name,
      trigger: 'onDrop',
      agents,
      position: { x: 50, y: 50 },
      size: { width: 350, height: 450 }
    })
  });

  return await res.json();
}

// 4. Assign worktree to zone
async function assignToZone(worktreeId, zoneId) {
  const res = await fetch(
    `${BASE_URL}/zones/${zoneId}/assign/${worktreeId}`,
    {
      method: 'POST',
      headers: {
        'X-CSRF-Token': csrfToken
      }
    }
  );

  return await res.json();
}

// Usage
async function main() {
  await getCsrfToken();

  const worktree = await createWorktree(
    'feature/new-ui',
    'https://github.com/owner/repo/issues/123'
  );
  console.log('Worktree created:', worktree.id);

  const zone = await createZone('Development', ['frontend', 'backend']);
  console.log('Zone created:', zone.id);

  const result = await assignToZone(worktree.id, zone.id);
  console.log('Assigned, results:', result.results);
}

main();
```

---

### Python

**Using requests library:**

```python
import requests

BASE_URL = 'http://localhost:3000/api'

# Get CSRF token
res = requests.get(f'{BASE_URL}/csrf-token')
csrf_token = res.json()['csrfToken']

# Create worktree
res = requests.post(
    f'{BASE_URL}/worktrees',
    headers={
        'X-CSRF-Token': csrf_token
    },
    json={
        'branchName': 'feature/new-ui',
        'issueUrl': 'https://github.com/owner/repo/issues/123',
        'position': {'x': 100, 'y': 100}
    }
)

worktree = res.json()
print(f"Worktree created: {worktree['id']}")

# Assign to zone
res = requests.post(
    f"{BASE_URL}/zones/zone-development/assign/{worktree['id']}",
    headers={
        'X-CSRF-Token': csrf_token
    }
)

result = res.json()
print(f"Execution results: {result['results']}")
```

---

### TypeScript/React

**React Hook:**

```typescript
import { useState, useEffect } from 'react';

interface Worktree {
  id: string;
  branchName: string;
  port: number;
  status: string;
}

export function useWorktrees() {
  const [worktrees, setWorktrees] = useState<Worktree[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorktrees();
  }, []);

  async function fetchWorktrees() {
    try {
      const res = await fetch('http://localhost:3000/api/worktrees');
      const data = await res.json();
      setWorktrees(data);
    } catch (error) {
      console.error('Failed to fetch worktrees:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createWorktree(branchName: string, issueUrl?: string) {
    const tokenRes = await fetch('http://localhost:3000/api/csrf-token');
    const { csrfToken } = await tokenRes.json();

    const res = await fetch('http://localhost:3000/api/worktrees', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify({ branchName, issueUrl })
    });

    const newWorktree = await res.json();
    setWorktrees([...worktrees, newWorktree]);
    return newWorktree;
  }

  async function deleteWorktree(id: string) {
    const tokenRes = await fetch('http://localhost:3000/api/csrf-token');
    const { csrfToken } = await tokenRes.json();

    await fetch(`http://localhost:3000/api/worktrees/${id}`, {
      method: 'DELETE',
      headers: {
        'X-CSRF-Token': csrfToken
      }
    });

    setWorktrees(worktrees.filter(w => w.id !== id));
  }

  return {
    worktrees,
    loading,
    createWorktree,
    deleteWorktree,
    refresh: fetchWorktrees
  };
}
```

---

### cURL Scripts

**Complete workflow script:**

```bash
#!/bin/bash

BASE_URL="http://localhost:3000/api"

# Get CSRF token
CSRF_TOKEN=$(curl -s $BASE_URL/csrf-token | jq -r .csrfToken)

# Create worktree
WORKTREE=$(curl -s -X POST $BASE_URL/worktrees \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -d '{
    "branchName": "feature/new-ui",
    "issueUrl": "https://github.com/owner/repo/issues/123"
  }')

WORKTREE_ID=$(echo $WORKTREE | jq -r .id)
echo "Worktree created: $WORKTREE_ID"

# Assign to Development zone
RESULT=$(curl -s -X POST "$BASE_URL/zones/zone-development/assign/$WORKTREE_ID" \
  -H "X-CSRF-Token: $CSRF_TOKEN")

echo "Execution results:"
echo $RESULT | jq .results

# Get execution history
curl -s "$BASE_URL/zones/zone-development/executions?limit=5" | jq .
```

---

## Additional Resources

### Related Documentation

- [User Guide](./PHASE_9_USER_GUIDE.md) - End-user documentation
- [Developer Guide](./PHASE_9_DEVELOPER_GUIDE.md) - Architecture and integration
- [Migration Guide](./PHASE_9_MIGRATION_GUIDE.md) - Upgrade instructions

### API Testing

**Postman Collection:**
- Import from `/docs/postman/phase9-api.json` (to be created)

**OpenAPI Spec:**
- Available at `/api/openapi.json` (future)

### Support

**Issues:**
- GitHub Issues: [AI-Orchestra/issues](https://github.com/your-org/AI-Orchestra/issues)

**Questions:**
- GitHub Discussions
- Email: support@ai-orchestra.example.com

---

**Document Version:** 1.0
**API Version:** v1
**Last Updated:** November 14, 2025
**Status:** Production Ready
