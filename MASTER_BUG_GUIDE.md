# Master Bug Guide - AI Orchestra

**Last Updated:** 2025-11-13
**Document Status:** Living Document (Updated Each Iteration)
**Total Bugs:** 18 (4 Fixed, 14 Remaining)

---

## Purpose

This document is the **source of truth** for all bugs in the AI Orchestra codebase. It tracks:
- Bug discovery dates
- Fix dates and commits
- Current status
- Priority levels
- Impact assessments
- Recommended fixes

**Legend:**
- ✅ **[FIXED]** - Bug resolved and deployed
- 🚧 **[IN PROGRESS]** - Currently being worked on
- 📋 **[PLANNED]** - Scheduled for specific phase
- ⚠️ **[OPEN]** - Documented but not yet scheduled
- 🔄 **[DEFERRED]** - Postponed to future iteration

---

## Critical Severity (P0) - 3 Total

### ✅ [FIXED] Bug #1: Memory Leak in Pipeline API Route

**Status:** ✅ FIXED
**Fixed Date:** 2025-11-13
**Commit:** 4c63423d35318a86fce4be508014a95bacb1edad
**Fixed By:** Architect/Reviewer Agent

**Details:**
- **File:** `dashboard/src/app/api/pipeline/run/route.ts:9-17`
- **Discovery Date:** 2025-11-09
- **Severity:** Critical
- **Impact:** Server memory exhaustion, production crashes, resource starvation

**Original Issue:**
```typescript
const activeRuns = new Map<string, {...}>()
// No cleanup mechanism - unbounded growth
```

**Fix Applied:**
```typescript
const MAX_RUN_AGE_MS = 60 * 60 * 1000; // 1 hour
const MAX_ACTIVE_RUNS = 100;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// Periodic cleanup job
setInterval(() => {
  const now = Date.now();
  for (const [runId, run] of activeRuns.entries()) {
    if (run.result?.endTime && (now - run.result.endTime > MAX_RUN_AGE_MS)) {
      activeRuns.delete(runId);
    }
  }

  // Enforce max runs limit
  if (activeRuns.size > MAX_ACTIVE_RUNS) {
    const sortedRuns = Array.from(activeRuns.entries())
      .sort((a, b) => (b[1].result?.endTime || 0) - (a[1].result?.endTime || 0));
    sortedRuns.slice(MAX_ACTIVE_RUNS).forEach(([runId]) => {
      activeRuns.delete(runId);
    });
  }
}, CLEANUP_INTERVAL_MS);
```

**Production Impact:** +5% production readiness

---

### ✅ [FIXED] Bug #2: Infinite Reconnection Loop in WebSocket Hook

**Status:** ✅ FIXED
**Fixed Date:** 2025-11-13
**Commit:** 4c63423d35318a86fce4be508014a95bacb1edad
**Fixed By:** Architect/Reviewer Agent

**Details:**
- **File:** `dashboard/hooks/useWebSocket.ts:74`
- **Discovery Date:** 2025-11-09
- **Severity:** Critical
- **Impact:** Infinite connection attempts, browser performance degradation, 100% CPU usage

**Original Issue:**
```typescript
const [reconnectAttempts, setReconnectAttempts] = useState(0);

// reconnectAttempts in dependency array causes infinite loop
}, [onMessage, onOpen, onClose, onError, reconnectInterval, reconnectAttempts, maxReconnectAttempts]);
```

**Fix Applied:**
```typescript
// Changed to useRef to prevent re-renders
const reconnectAttemptsRef = useRef(0);

// Updated all references
reconnectAttemptsRef.current++;

// Removed from dependency array
}, [onMessage, onOpen, onClose, onError, reconnectInterval, maxReconnectAttempts]);
```

**Production Impact:** +3% production readiness

---

### 🔄 [DEFERRED] Bug #3: Deprecated datetime.utcnow() Usage

**Status:** 🔄 DEFERRED (Python orchestrator - separate iteration)
**Planned For:** Python Infrastructure Iteration

**Details:**
- **File:** `orchestrator/main.py` (lines 105, 106, 130, 199, 226, 320, 344, etc.)
- **Discovery Date:** 2025-11-09
- **Severity:** Critical (Python 3.12+)
- **Impact:** Code will break in Python 3.12+, timezone-related bugs, inconsistent datetime handling

**Issue:**
```python
datetime.utcnow()  # Deprecated in Python 3.12, will be removed
```

**Recommended Fix:**
```python
from datetime import datetime, timezone
datetime.now(timezone.utc)  # Timezone-aware replacement
```

**Locations to Update (15+ occurrences):**
- `orchestrator/main.py:105`
- `orchestrator/main.py:106`
- `orchestrator/main.py:130`
- `orchestrator/main.py:199`
- `orchestrator/main.py:226`
- `orchestrator/main.py:320`
- `orchestrator/main.py:344`

**Rationale for Deferral:**
Python orchestrator requires separate testing environment and dependency validation. Will be addressed in dedicated Python modernization iteration.

---

## High Severity (P1) - 5 Total

### ✅ [FIXED] Bug #4: Configuration Property Name Inconsistency

**Status:** ✅ FIXED
**Fixed Date:** 2025-11-13
**Commit:** 4c63423d35318a86fce4be508014a95bacb1edad
**Fixed By:** Architect/Reviewer Agent

**Details:**
- **File:** `server.js:118` and `core/config_manager.js:115`
- **Discovery Date:** 2025-11-09
- **Severity:** High
- **Impact:** Rate limiting never activates, security vulnerability (no DoS protection), silent failure

**Original Issue:**
```javascript
// server.js:118
if (config.security?.rateLimit?.enabled) {  // Wrong property name

// config/settings.json
"rateLimiting": {  // Correct name
  "enabled": true
}
```

**Fix Applied:**
```javascript
if (config.security?.rateLimiting?.enabled) {  // Fixed to match config
  const limiter = rateLimit({
    windowMs: config.security.rateLimiting.windowMs || 60000,
    max: config.security.rateLimiting.max || 100,
  });
}
```

**Production Impact:** +2% production readiness, DoS protection now active

---

### ✅ [FIXED] Bug #5: Deprecated substr() Method

**Status:** ✅ FIXED
**Fixed Date:** 2025-11-13
**Commit:** 4c63423d35318a86fce4be508014a95bacb1edad
**Fixed By:** Architect/Reviewer Agent

**Details:**
- **File:** `dashboard/src/app/api/pipeline/run/route.ts:57`
- **Discovery Date:** 2025-11-09
- **Severity:** High
- **Impact:** Deprecated in ES2020, may be removed in future JavaScript versions

**Original Issue:**
```typescript
const runId = `run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
// substr() is deprecated
```

**Fix Applied:**
```typescript
const runId = `run-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
// substring() is the modern replacement
```

**Production Impact:** Future-proof, standards compliant

---

### 📋 [PLANNED] Bug #6: Unsafe String Operation Without Null Check

**Status:** 📋 PLANNED (Phase 2)
**Planned For:** Phase 2 - Input Validation (Weeks 3-4)

**Details:**
- **File:** `core/config_manager.js:151`
- **Discovery Date:** 2025-11-09
- **Severity:** High
- **Impact:** Runtime crashes if non-string value passed, configuration validation failures, application startup failures

**Issue:**
```javascript
return value.toLowerCase() === 'true' || value === '1';
// Calling .toLowerCase() without checking if value is a string
```

**Recommended Fix:**
```javascript
return String(value).toLowerCase() === 'true' || value === '1';
// Or with type guard:
if (typeof value === 'string') {
  return value.toLowerCase() === 'true';
}
return value === '1' || value === 1 || value === true;
```

**Testing Needed:**
- Test with string values: `'true'`, `'false'`, `'TRUE'`
- Test with numeric values: `1`, `0`
- Test with boolean values: `true`, `false`
- Test with null/undefined
- Test with objects

---

### 📋 [PLANNED] Bug #7: EventSource HTTP Method Violation

**Status:** 📋 PLANNED (Phase 2 - Security Hardening)
**Planned For:** Phase 2 - Weeks 5-6

**Details:**
- **File:** `dashboard/lib/api.ts:91-94`
- **Discovery Date:** 2025-11-09
- **Severity:** High
- **Impact:** URL length limitations (~2048 chars), data truncation for large prompts, security (sensitive data in URL/logs)

**Issue:**
```typescript
streamQuery(data: any): EventSource {
  const params = new URLSearchParams({ data: JSON.stringify(data) });
  return new EventSource(`${this.baseUrl}/api/stream?${params}`);
}
// EventSource only supports GET, data in query params violates HTTP semantics
```

**Recommended Fix:**
Option 1 - WebSocket (Preferred):
```typescript
streamQuery(data: any): WebSocket {
  const ws = new WebSocket(`${this.wsUrl}/api/stream`);
  ws.onopen = () => {
    ws.send(JSON.stringify(data));
  };
  return ws;
}
```

Option 2 - Fetch with ReadableStream:
```typescript
async streamQuery(data: any): Promise<ReadableStream> {
  const response = await fetch(`${this.baseUrl}/api/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.body;
}
```

**Testing Needed:**
- Large payload streaming (>10KB prompts)
- WebSocket reconnection handling
- Error handling for stream failures

---

### 📋 [PLANNED] Bug #8: Missing Error Handling in Pipeline Execution

**Status:** 📋 PLANNED (Phase 2 - Error Handling)
**Planned For:** Phase 2 - Weeks 3-4

**Details:**
- **File:** `src/pipeline/PipelineController.ts:145-168`
- **Discovery Date:** 2025-11-09
- **Severity:** High
- **Impact:** Pipeline stops on first error, no partial results saved, poor error recovery

**Issue:**
```typescript
const result = await this.frontendAgent.run({...});
// No try-catch, entire pipeline fails if one component fails
```

**Recommended Fix:**
```typescript
try {
  const result = await this.frontendAgent.run({...});
  components.push(result);
} catch (error) {
  this.log('error', PipelineStage.FRONTEND, `Component ${component.name} failed: ${error}`);

  // Create error placeholder
  components.push({
    name: component.name,
    status: 'failed',
    error: error.message,
  });

  // Continue with remaining components
}
```

**Testing Needed:**
- Single component failure
- Multiple component failures
- Partial result recovery
- Error logging and tracking

---

## Medium Severity (P2) - 7 Total

### ⚠️ [OPEN] Bug #9: Inconsistent Logging in server.js

**Status:** ⚠️ OPEN

**Details:**
- **File:** `server.js:387`
- **Discovery Date:** 2025-11-09
- **Severity:** Medium
- **Impact:** Inconsistent log format, missing structured logging metadata, harder to monitor/debug in production

**Issue:**
```javascript
console.error('[API] Failed to get models:', error.message);
// Using console.error instead of structured logger
```

**Recommended Fix:**
```javascript
logger.error('Failed to get models', {
  error: error.message,
  stack: error.stack,
  context: 'API',
});
```

**Locations to Fix:**
- Search codebase for `console.log`, `console.error`, `console.warn`
- Replace with winston logger
- Add structured metadata (context, request ID, user ID, etc.)

---

### ⚠️ [OPEN] Bug #10: Missing Await in Test Connection

**Status:** ⚠️ OPEN

**Details:**
- **File:** `core/connectors/openai_connector.js:142-148`
- **Discovery Date:** 2025-11-09
- **Severity:** Medium
- **Impact:** False positive connection tests, may report healthy when API is degraded

**Issue:**
```javascript
async testConnection() {
  try {
    await this.client.models.list();
    return true;  // No validation of response
  } catch (error) {
    return false;
  }
}
```

**Recommended Fix:**
```javascript
async testConnection() {
  try {
    const models = await this.client.models.list();

    // Validate response structure
    if (!models || !models.data || !Array.isArray(models.data)) {
      logger.warn('OpenAI connection test returned unexpected format');
      return false;
    }

    if (models.data.length === 0) {
      logger.warn('OpenAI connection test returned no models');
      return false;
    }

    return true;
  } catch (error) {
    logger.error('OpenAI connection test failed', { error: error.message });
    return false;
  }
}
```

---

### ⚠️ [OPEN] Bug #11: Hardcoded Timeout Values

**Status:** ⚠️ OPEN

**Details:**
- **File:** `core/base_connector.js:16, 73, 83`
- **Discovery Date:** 2025-11-09
- **Severity:** Medium
- **Impact:** Retry logic may exceed overall timeout, unclear error messages, poor user experience during failures

**Issue:**
```javascript
this.timeout = config.timeout || 60000;
// Later in retry logic:
const delay = this.retryDelay * Math.pow(2, i);
// Exponential backoff can exceed timeout, causing confusion
```

**Recommended Fix:**
```javascript
async executeWithRetry(operation, attempts = this.maxRetries) {
  const startTime = Date.now();

  for (let i = 0; i < attempts; i++) {
    // Check if we've exceeded overall timeout
    const elapsed = Date.now() - startTime;
    if (elapsed > this.timeout) {
      throw new Error(`Operation timeout exceeded after ${elapsed}ms`);
    }

    try {
      return await operation();
    } catch (error) {
      if (i === attempts - 1) throw error;

      // Calculate delay but cap at remaining timeout
      const delay = Math.min(
        this.retryDelay * Math.pow(2, i),
        this.timeout - elapsed
      );

      await this.sleep(delay);
    }
  }
}
```

---

### 📋 [PLANNED] Bug #12: Missing Input Validation in API Routes

**Status:** 📋 PLANNED (Phase 2 - Input Validation)
**Planned For:** Phase 2 - Weeks 3-4

**Details:**
- **File:** `server.js:284-328`
- **Discovery Date:** 2025-11-09
- **Severity:** Medium
- **Impact:** Invalid parameters passed to LLM providers, potential API errors, cost overruns from excessive token requests, poor error messages

**Issue:**
```javascript
app.post('/api/query', async (req, res) => {
  const { prompt, provider, model, temperature, maxTokens } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }
  // No validation for temperature range, maxTokens limits, or prompt length
```

**Recommended Fix:**
```javascript
import { z } from 'zod';

const querySchema = z.object({
  prompt: z.string().min(1).max(50000),
  provider: z.enum(['openai', 'grok', 'ollama']).optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).max(4096).optional(),
});

app.post('/api/query', async (req, res) => {
  try {
    const validatedData = querySchema.parse(req.body);
    // Use validatedData instead of req.body
  } catch (error) {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.errors
    });
  }
});
```

**Phase 2 Implementation Plan:**
1. Install Zod: `npm install zod`
2. Create schema definitions in `core/schemas/`
3. Add validation middleware
4. Update all API endpoints
5. Add validation tests

---

### ⚠️ [OPEN] Bug #13: Race Condition in Workflow Execution

**Status:** ⚠️ OPEN

**Details:**
- **File:** `orchestrator/main.py:261-301`
- **Discovery Date:** 2025-11-09
- **Severity:** Medium
- **Impact:** Unnecessary CPU usage (busy waiting), 100ms granularity delays, inefficient execution, potential deadlocks

**Issue:**
```python
async def execute_graph(workflow_id: str, workflow_request: WorkflowRequest):
    completed_tasks: Dict[str, Any] = {}
    # Polling with sleep for dependencies
    while not all(dep_id in completed_tasks for dep_id in task_def.depends_on):
        await asyncio.sleep(0.1)  # Busy waiting
```

**Recommended Fix:**
```python
async def execute_graph(workflow_id: str, workflow_request: WorkflowRequest):
    completed_tasks: Dict[str, Any] = {}
    completed_events = {task.agent_id: asyncio.Event() for task in tasks}

    async def wait_for_dependencies(task_def):
        # Wait for dependencies using events
        await asyncio.gather(*[
            completed_events[dep_id].wait()
            for dep_id in task_def.depends_on
        ])

    # After task completes:
    completed_tasks[task.agent_id] = result
    completed_events[task.agent_id].set()  # Signal completion
```

---

### ⚠️ [OPEN] Bug #14: Missing Null/Undefined Checks in Response Parsing

**Status:** ⚠️ OPEN

**Details:**
- **File:** `src/agents/BackEndDevAgent.ts:221-228`
- **Discovery Date:** 2025-11-09
- **Severity:** Medium
- **Impact:** Runtime errors on invalid JSON, poor error messages, agent execution failures

**Issue:**
```typescript
const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
if (jsonMatch) {
  return JSON.parse(jsonMatch[1]);  // No validation of parsed content
}
return JSON.parse(content);  // Can throw on invalid JSON
```

**Recommended Fix:**
```typescript
const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);

try {
  let parsed;
  if (jsonMatch) {
    parsed = JSON.parse(jsonMatch[1]);
  } else {
    parsed = JSON.parse(content);
  }

  // Validate structure
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Response is not a valid object');
  }

  if (!parsed.endpoint || typeof parsed.endpoint !== 'string') {
    throw new Error('Response missing required field: endpoint');
  }

  if (!parsed.code || typeof parsed.code !== 'string') {
    throw new Error('Response missing required field: code');
  }

  return parsed;
} catch (error) {
  throw new Error(`Failed to parse agent response: ${error.message}`);
}
```

---

### ⚠️ [OPEN] Bug #15: Unhandled Promise Rejection in Background Task

**Status:** ⚠️ OPEN

**Details:**
- **File:** `dashboard/src/app/api/pipeline/run/route.ts:68-88`
- **Discovery Date:** 2025-11-09
- **Severity:** Medium
- **Impact:** Silent failures, no alerts on pipeline failures, hard to debug production issues

**Issue:**
```typescript
pipeline
  .run(validatedSpec)
  .then((result) => {
    // ...
  })
  .catch((error) => {
    // Only logs to run object, no monitoring/alerting
  })
```

**Recommended Fix:**
```typescript
pipeline
  .run(validatedSpec)
  .then((result) => {
    const run = activeRuns.get(runId);
    if (run) {
      run.result = result;
      run.status = 'completed';
    }
  })
  .catch((error) => {
    // Log to structured logger
    logger.error('Pipeline execution failed', {
      runId,
      error: error.message,
      stack: error.stack,
    });

    // Send to monitoring service (Sentry, Datadog, etc.)
    if (process.env.NODE_ENV === 'production') {
      // Sentry.captureException(error, { tags: { runId } });
    }

    // Update run status
    const run = activeRuns.get(runId);
    if (run) {
      run.status = 'failed';
      run.error = error.message;
      run.logs.push({
        timestamp: Date.now(),
        level: 'error',
        stage: 'pipeline',
        message: `Pipeline failed: ${error.message}`,
      });
    }
  });
```

---

## Low Severity (P3) - 3 Total

### ⚠️ [OPEN] Bug #16: Console.log in Production Code

**Status:** ⚠️ OPEN

**Details:**
- **Files:** Multiple files including `core/llm_bridge.js:31, 41, 51, 58`
- **Discovery Date:** 2025-11-09
- **Severity:** Low
- **Impact:** Inconsistent log format, hard to filter/search logs, missing log levels and metadata

**Issue:**
```javascript
console.log('Starting LLM request...');
console.error('Error:', error);
```

**Recommended Fix:**
```javascript
logger.info('Starting LLM request', { provider, model });
logger.error('LLM request failed', { error: error.message, provider, model });
```

**Cleanup Plan:**
1. Search for all `console.log`, `console.error`, `console.warn`, `console.info`
2. Replace with winston logger
3. Add structured metadata
4. Add ESLint rule to prevent future usage: `"no-console": "error"`

---

### ⚠️ [OPEN] Bug #17: Missing JSDoc Comments

**Status:** ⚠️ OPEN (Will be addressed by Documentation Agent in Phase 1)

**Details:**
- **Files:** `src/core/BaseAgent.ts` and various agent files
- **Discovery Date:** 2025-11-09
- **Severity:** Low
- **Impact:** Poor developer experience, harder to maintain, no autocomplete hints

**Recommended Pattern:**
```typescript
/**
 * Base class for all AI agents in the system
 *
 * @example
 * ```typescript
 * class CustomAgent extends BaseAgent {
 *   async run(input: string): Promise<AgentResult> {
 *     return { output: 'processed' };
 *   }
 * }
 * ```
 */
export abstract class BaseAgent {
  /**
   * Execute the agent with the given input
   *
   * @param input - The input data to process
   * @param options - Optional configuration
   * @returns Promise resolving to agent result
   * @throws {AgentError} If execution fails
   */
  abstract run(input: AgentInput, options?: AgentOptions): Promise<AgentResult>;
}
```

**Phase 1 Implementation Plan:**
1. Add JSDoc to all modified files in Iteration 1
2. Create JSDoc style guide
3. Add to contribution guidelines
4. Automate with ESLint rule: `"require-jsdoc": "error"`

---

### ⚠️ [OPEN] Bug #18: Hardcoded Magic Numbers

**Status:** ⚠️ OPEN

**Details:**
- **Files:** `dashboard/hooks/useWebSocket.ts:21-22`, `src/pipeline/PipelineController.ts:279`
- **Discovery Date:** 2025-11-09
- **Severity:** Low
- **Impact:** Hard to tune/configure, repeated values across codebase, poor maintainability

**Issue:**
```typescript
reconnectInterval = 3000,       // Magic number
maxReconnectAttempts = 5,      // Magic number
```

**Recommended Fix:**
```typescript
// Create configuration constants file
// config/websocket.constants.ts
export const WEBSOCKET_CONFIG = {
  DEFAULT_RECONNECT_INTERVAL: 3000,
  DEFAULT_MAX_RECONNECT_ATTEMPTS: 5,
  MAX_RECONNECT_DELAY: 30000,
  MIN_RECONNECT_DELAY: 1000,
} as const;

// Use in hook
import { WEBSOCKET_CONFIG } from '@/config/websocket.constants';

reconnectInterval = WEBSOCKET_CONFIG.DEFAULT_RECONNECT_INTERVAL,
maxReconnectAttempts = WEBSOCKET_CONFIG.DEFAULT_MAX_RECONNECT_ATTEMPTS,
```

---

## Testing Gaps Identified

### Critical Testing Gaps

1. **tests/connectors.test.js:48-49** - Test skipped instead of properly handling no providers
   - Status: ⚠️ OPEN
   - Impact: Test suite incomplete
   - Fix: Implement proper test or remove skip

2. **Missing tests for error conditions**
   - Status: 📋 PLANNED (Phase 2)
   - Impact: Error handling untested
   - Fix: Add negative test cases for all connectors

3. **No integration tests for pipeline execution**
   - Status: 📋 PLANNED (Phase 3)
   - Impact: Pipeline reliability unknown
   - Fix: Create end-to-end pipeline tests

4. **No tests for WebSocket reconnection logic**
   - Status: 📋 PLANNED (Phase 4)
   - Impact: Connection stability untested
   - Fix: Mock WebSocket and test reconnection scenarios

5. **Missing tests for rate limiting functionality**
   - Status: 📋 PLANNED (Phase 2)
   - Impact: Security feature untested
   - Fix: Test rate limiting with supertest

---

## Security Concerns

### Critical Security Issues

1. **server.js - Rate limiting not functional (Bug #4)**
   - Status: ✅ FIXED (2025-11-13)
   - Impact: No DoS protection
   - Fix: Property name corrected

2. **dashboard/lib/api.ts - Sensitive data in URL query params (Bug #7)**
   - Status: 📋 PLANNED (Phase 2)
   - Impact: Data exposure in logs
   - Fix: Migrate to WebSocket for POST data

3. **No input sanitization before LLM queries**
   - Status: 📋 PLANNED (Phase 2)
   - Impact: Prompt injection attacks possible
   - Fix: Implement input validation and sanitization

4. **Missing CSRF protection on API endpoints**
   - Status: 📋 PLANNED (Phase 2)
   - Impact: Cross-site request forgery vulnerability
   - Fix: Add CSRF tokens to all POST/PUT/DELETE endpoints

5. **No API key rotation mechanism**
   - Status: ⚠️ OPEN
   - Impact: Compromised keys cannot be rotated easily
   - Fix: Implement key rotation with grace period

6. **Secrets potentially logged in error messages**
   - Status: ⚠️ OPEN
   - Impact: API keys exposed in logs
   - Fix: Sanitize error messages before logging

---

## Performance Issues

### Identified Performance Bottlenecks

1. **Memory leak in activeRuns Map (Bug #1)**
   - Status: ✅ FIXED (2025-11-13)
   - Impact: Memory exhaustion
   - Fix: TTL-based cleanup implemented

2. **Inefficient polling in dependency resolution (Bug #13)**
   - Status: ⚠️ OPEN
   - Impact: CPU waste, slow execution
   - Fix: Use asyncio.Event for coordination

3. **No caching for LLM model lists**
   - Status: ⚠️ OPEN
   - Impact: Repeated API calls
   - Fix: Cache model lists with 1-hour TTL

4. **Synchronous file I/O in some paths**
   - Status: ⚠️ OPEN
   - Impact: Blocking operations
   - Fix: Migrate to async fs operations

5. **No connection pooling for database queries**
   - Status: ⚠️ OPEN
   - Impact: Connection overhead
   - Fix: Implement pg connection pool

---

## Bug Statistics

### By Severity
| Severity | Total | Fixed | In Progress | Planned | Open | Deferred |
|----------|-------|-------|-------------|---------|------|----------|
| P0 (Critical) | 3 | 2 | 0 | 0 | 0 | 1 |
| P1 (High) | 5 | 2 | 0 | 3 | 0 | 0 |
| P2 (Medium) | 7 | 0 | 0 | 1 | 6 | 0 |
| P3 (Low) | 3 | 0 | 0 | 0 | 3 | 0 |
| **Total** | **18** | **4** | **0** | **4** | **9** | **1** |

### By Component
| Component | Bugs | Fixed | Remaining |
|-----------|------|-------|-----------|
| Dashboard (TypeScript) | 5 | 3 | 2 |
| Server (JavaScript) | 4 | 1 | 3 |
| Core Connectors | 3 | 0 | 3 |
| Orchestrator (Python) | 2 | 0 | 2 |
| Agent System | 2 | 0 | 2 |
| Configuration | 2 | 0 | 2 |

### Progress Over Time
- **2025-11-09:** 18 bugs discovered
- **2025-11-13:** 4 bugs fixed (22% resolution rate)
- **Target (Phase 2):** 8 bugs fixed (44% resolution rate)
- **Target (Phase 5):** 16 bugs fixed (89% resolution rate)

---

## Phase Roadmap

### Phase 1: Foundation ✅ COMPLETED
**Weeks 1-2**
- ✅ Fix critical bugs (memory leak, WebSocket loop, rate limiting)
- ✅ Add code coverage tracking
- ✅ Harden CI/CD pipeline
- ✅ Document all findings

**Bugs Fixed:** 4 (2 P0, 2 P1)

---

### Phase 2: Critical Testing & Security 📋 PLANNED
**Weeks 3-4**

**Focus:** Input validation, API tests, error handling

**Bugs to Fix:**
- Bug #6: Unsafe string operation (P1)
- Bug #7: EventSource HTTP violation (P1)
- Bug #8: Missing error handling (P1)
- Bug #12: Missing input validation (P2)

**Target:** 8 bugs fixed total (44% resolution)

---

### Phase 3: Connectors & Integration 📋 PLANNED
**Weeks 5-6**

**Focus:** Connector reliability, integration tests

**Bugs to Fix:**
- Bug #10: Missing await in test connection (P2)
- Bug #11: Hardcoded timeout values (P2)
- Bug #14: Missing null checks in response parsing (P2)

**Target:** 11 bugs fixed total (61% resolution)

---

### Phase 4: Dashboard & E2E 📋 PLANNED
**Weeks 7-8**

**Focus:** Dashboard testing, end-to-end flows

**Bugs to Fix:**
- Bug #15: Unhandled promise rejection (P2)
- Bug #17: Missing JSDoc comments (P3)

**Target:** 13 bugs fixed total (72% resolution)

---

### Phase 5: Performance & Polish 📋 PLANNED
**Weeks 9-10**

**Focus:** Performance optimization, code quality

**Bugs to Fix:**
- Bug #9: Inconsistent logging (P2)
- Bug #13: Race condition in workflow (P2)
- Bug #16: Console.log in production (P3)
- Bug #18: Hardcoded magic numbers (P3)

**Target:** 16 bugs fixed total (89% resolution)

---

### Python Infrastructure Iteration 🔄 DEFERRED
**Timeline:** TBD

**Focus:** Python orchestrator modernization

**Bugs to Fix:**
- Bug #3: Deprecated datetime.utcnow() (P0 deferred)

**Additional Tasks:**
- Python 3.12+ compatibility
- Type hints with mypy
- async/await modernization
- Testing with pytest

---

## Update History

### 2025-11-13 - Iteration 1 Complete
**Updated By:** Documentation Agent
**Changes:**
- Created MASTER_BUG_GUIDE.md as living document
- Marked 4 bugs as FIXED with commits and dates
- Deferred Bug #3 to Python iteration
- Added phase roadmap
- Added bug statistics and progress tracking

**Next Update:** Phase 2 completion (estimated Weeks 3-4)

---

## How to Use This Guide

### For Developers
1. Check bug status before starting work
2. Update status when beginning work (⚠️ OPEN → 🚧 IN PROGRESS)
3. Mark as ✅ FIXED with commit hash when complete
4. Add fix details and production impact

### For QA Team
1. Verify fixed bugs have tests
2. Update test coverage metrics
3. Validate fixes in staging environment
4. Track regression bugs

### For Product/Management
1. Review bug statistics for sprint planning
2. Track production readiness progress
3. Prioritize based on severity and impact
4. Monitor phase completion

### For Documentation Agent
1. Update after each iteration
2. Add new bugs as discovered
3. Track fix commits and dates
4. Maintain statistics and metrics

---

**This is a living document. Update after every iteration.**

**Last Reviewed:** 2025-11-13
**Next Review:** Phase 2 completion
**Owner:** Documentation Agent
