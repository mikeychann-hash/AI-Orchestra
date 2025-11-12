# AI Orchestra - Comprehensive Bug Report

**Date:** 2025-11-09
**Review Type:** Extensive codebase bug review
**Files Reviewed:** 95+ files across backend, frontend, configuration, and tests

---

## Executive Summary

This report documents bugs found during an extensive review of the AI Orchestra codebase. Bugs are categorized by severity: **Critical**, **High**, **Medium**, and **Low**.

**Total Bugs Found:** 18
- Critical: 3
- High: 5
- Medium: 7
- Low: 3

---

## Critical Severity Issues

### 1. Memory Leak in Pipeline API Route
**File:** `dashboard/src/app/api/pipeline/run/route.ts:9-17`
**Severity:** Critical

**Issue:**
```typescript
const activeRuns = new Map<string, {...}>()
```
The `activeRuns` Map stores pipeline runs but never cleans up completed runs, causing unbounded memory growth.

**Impact:**
- Server memory exhaustion over time
- Potential service crashes in production
- Resource starvation for other processes

**Recommendation:**
Implement automatic cleanup:
```typescript
// Add TTL-based cleanup
setInterval(() => {
  const now = Date.now();
  for (const [runId, run] of activeRuns.entries()) {
    if (run.result && (now - run.result.endTime > 3600000)) { // 1 hour
      activeRuns.delete(runId);
    }
  }
}, 300000); // Clean every 5 minutes
```

---

### 2. Infinite Reconnection Loop in WebSocket Hook
**File:** `dashboard/hooks/useWebSocket.ts:74`
**Severity:** Critical

**Issue:**
```typescript
}, [onMessage, onOpen, onClose, onError, reconnectInterval, reconnectAttempts, maxReconnectAttempts]);
```
The `reconnectAttempts` state variable is in the dependency array of `useCallback`, causing the `connect` function to be recreated every time reconnection is attempted, which triggers `useEffect` again, creating an infinite loop.

**Impact:**
- Infinite connection attempts
- Browser performance degradation
- Excessive network traffic
- Poor user experience

**Recommendation:**
Remove `reconnectAttempts` from dependency array or use `useRef` instead of state:
```typescript
const reconnectAttemptsRef = useRef(0);
```

---

### 3. Deprecated datetime.utcnow() Usage
**File:** `orchestrator/main.py` (lines 105, 106, 130, 199, 226, 320, 344, etc.)
**Severity:** Critical (Python 3.12+)

**Issue:**
```python
datetime.utcnow()  # Deprecated in Python 3.12
```
Using deprecated `datetime.utcnow()` which will be removed in future Python versions and doesn't include timezone information.

**Impact:**
- Code will break in Python 3.12+
- Timezone-related bugs
- Inconsistent datetime handling

**Recommendation:**
Replace all occurrences with:
```python
from datetime import datetime, timezone
datetime.now(timezone.utc)
```

---

## High Severity Issues

### 4. Configuration Property Name Inconsistency
**File:** `server.js:116` and `core/config_manager.js:115`
**Severity:** High

**Issue:**
In `server.js:116`:
```javascript
if (config.security?.rateLimit?.enabled) {  // Wrong property name
```
But config defines it as:
```javascript
rateLimiting: {  // Correct name in config_manager.js:115
  enabled: ...
}
```

**Impact:**
- Rate limiting never activates
- Security vulnerability: no protection against DoS attacks
- Silent failure (no error thrown)

**Recommendation:**
```javascript
if (config.security?.rateLimiting?.enabled) {
```

---

### 5. Unsafe String Operation Without Null Check
**File:** `core/config_manager.js:151`
**Severity:** High

**Issue:**
```javascript
return value.toLowerCase() === 'true' || value === '1';
```
Calling `.toLowerCase()` on a value without checking if it's a string can cause TypeError.

**Impact:**
- Runtime crashes if non-string value passed
- Configuration validation failures
- Application startup failures

**Recommendation:**
```javascript
return String(value).toLowerCase() === 'true' || value === '1';
```

---

### 6. Deprecated substr() Method
**File:** `dashboard/src/app/api/pipeline/run/route.ts:57`
**Severity:** High

**Issue:**
```typescript
const runId = `run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
```
Using deprecated `String.substr()` method.

**Impact:**
- Deprecated in ES2020
- May be removed in future JavaScript versions
- Browser compatibility warnings

**Recommendation:**
```typescript
const runId = `run-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
```

---

### 7. EventSource HTTP Method Violation
**File:** `dashboard/lib/api.ts:91-94`
**Severity:** High

**Issue:**
```typescript
streamQuery(data: any): EventSource {
  const params = new URLSearchParams({ data: JSON.stringify(data) });
  return new EventSource(`${this.baseUrl}/api/stream?${params}`);
}
```
EventSource only supports GET requests. Passing POST data via query params violates HTTP semantics and has URL length limits.

**Impact:**
- URL length limitations (~2048 chars)
- Data truncation for large prompts
- Security: sensitive data in URL/logs
- Improper HTTP method usage

**Recommendation:**
Use WebSocket or fetch with ReadableStream for streaming POST requests.

---

### 8. Missing Error Handling in Pipeline Execution
**File:** `src/pipeline/PipelineController.ts:145-168`
**Severity:** High

**Issue:**
```typescript
const result = await this.frontendAgent.run({...});
```
No try-catch for individual component generation. If one component fails, entire pipeline fails.

**Impact:**
- Pipeline stops on first error
- No partial results saved
- Poor error recovery

**Recommendation:**
Wrap in try-catch and continue with remaining components:
```typescript
try {
  const result = await this.frontendAgent.run({...});
  components.push(result);
} catch (error) {
  this.log('error', PipelineStage.FRONTEND, `Component ${component.name} failed: ${error}`);
  // Continue with next component
}
```

---

## Medium Severity Issues

### 9. Inconsistent Logging in server.js
**File:** `server.js:387`
**Severity:** Medium

**Issue:**
```javascript
console.error('[API] Failed to get models:', error.message);
```
Using `console.error` instead of structured `logger.error` like rest of the file.

**Impact:**
- Inconsistent log format
- Missing structured logging metadata
- Harder to monitor/debug in production

**Recommendation:**
```javascript
logger.error('Failed to get models', { error: error.message });
```

---

### 10. Missing Await in Test Connection
**File:** `core/connectors/openai_connector.js:142-148`
**Severity:** Medium

**Issue:**
The testConnection method doesn't validate the response, only checks if call completes.

**Impact:**
- False positive connection tests
- May report healthy when API is degraded
- Misleading health checks

**Recommendation:**
Validate response has expected structure:
```javascript
async testConnection() {
  try {
    const models = await this.client.models.list();
    return models && models.data && models.data.length > 0;
  } catch (error) {
    return false;
  }
}
```

---

### 11. Hardcoded Timeout Values
**File:** `core/base_connector.js:16, 73, 83`
**Severity:** Medium

**Issue:**
```javascript
this.timeout = config.timeout || 60000;
// Later in retry logic:
const delay = this.retryDelay * Math.pow(2, i);
```
Exponential backoff can exceed timeout, causing confusion.

**Impact:**
- Retry logic may exceed overall timeout
- Unclear error messages
- Poor user experience during failures

**Recommendation:**
Track total elapsed time and respect overall timeout:
```javascript
const startTime = Date.now();
for (let i = 0; i < attempts; i++) {
  if (Date.now() - startTime > this.timeout) {
    throw new Error('Operation timeout exceeded');
  }
  // ... retry logic
}
```

---

### 12. Missing Input Validation in API Routes
**File:** `server.js:284-328`
**Severity:** Medium

**Issue:**
```javascript
app.post('/api/query', async (req, res) => {
  const { prompt, provider, model, temperature, maxTokens } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }
```
No validation for temperature range, maxTokens limits, or prompt length.

**Impact:**
- Invalid parameters passed to LLM providers
- Potential API errors
- Cost overruns from excessive token requests
- Poor error messages

**Recommendation:**
Add validation:
```javascript
if (temperature !== undefined && (temperature < 0 || temperature > 2)) {
  return res.status(400).json({ error: 'Temperature must be between 0 and 2' });
}
if (maxTokens !== undefined && maxTokens > 4096) {
  return res.status(400).json({ error: 'maxTokens exceeds limit' });
}
if (prompt.length > 50000) {
  return res.status(400).json({ error: 'Prompt too long' });
}
```

---

### 13. Race Condition in Workflow Execution
**File:** `orchestrator/main.py:261-301`
**Severity:** Medium

**Issue:**
```python
async def execute_graph(workflow_id: str, workflow_request: WorkflowRequest):
    completed_tasks: Dict[str, Any] = {}
    # ... dependency checking with while loop
    while not all(dep_id in completed_tasks for dep_id in task_def.depends_on):
        await asyncio.sleep(0.1)
```
Polling with sleep for dependencies instead of using proper async coordination.

**Impact:**
- Unnecessary CPU usage (busy waiting)
- 100ms granularity delays
- Inefficient execution
- Potential deadlocks

**Recommendation:**
Use asyncio.Event or asyncio.Condition for proper coordination:
```python
completed_events = {task.agent_id: asyncio.Event() for task in tasks}
# Wait for dependencies
await asyncio.gather(*[completed_events[dep_id].wait() for dep_id in task_def.depends_on])
```

---

### 14. Missing Null/Undefined Checks in Response Parsing
**File:** `src/agents/BackEndDevAgent.ts:221-228`
**Severity:** Medium

**Issue:**
```typescript
const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
if (jsonMatch) {
  return JSON.parse(jsonMatch[1]);  // No validation
}
return JSON.parse(content);  // Can throw
```
No try-catch around JSON.parse or validation of parsed content.

**Impact:**
- Runtime errors on invalid JSON
- Poor error messages
- Agent execution failures

**Recommendation:**
Validate parsed JSON structure:
```typescript
if (jsonMatch) {
  const parsed = JSON.parse(jsonMatch[1]);
  if (!parsed.endpoint || !parsed.code) {
    throw new Error('Invalid response structure');
  }
  return parsed;
}
```

---

### 15. Unhandled Promise Rejection in Background Task
**File:** `dashboard/src/app/api/pipeline/run/route.ts:68-88`
**Severity:** Medium

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
Promise rejections only logged to in-memory object, not monitored.

**Impact:**
- Silent failures
- No alerts on pipeline failures
- Hard to debug production issues

**Recommendation:**
Add proper error logging and monitoring:
```typescript
.catch((error) => {
  logger.error('Pipeline execution failed', { runId, error });
  // Send to monitoring service
  const run = activeRuns.get(runId);
  if (run) {
    run.logs.push({
      timestamp: Date.now(),
      level: 'error',
      stage: 'pipeline',
      message: `Pipeline failed: ${error.message}`,
    });
  }
})
```

---

## Low Severity Issues

### 16. Console.log in Production Code
**File:** Multiple files including `core/llm_bridge.js:31, 41, 51, 58`
**Severity:** Low

**Issue:**
Using `console.log` instead of proper logging framework.

**Impact:**
- Inconsistent log format
- Hard to filter/search logs
- Missing log levels and metadata

**Recommendation:**
Replace with structured logger.

---

### 17. Missing JSDoc Comments
**File:** `src/core/BaseAgent.ts` and various agent files
**Severity:** Low

**Issue:**
Many public methods lack JSDoc comments explaining parameters and return values.

**Impact:**
- Poor developer experience
- Harder to maintain
- No autocomplete hints

**Recommendation:**
Add comprehensive JSDoc comments to all public APIs.

---

### 18. Hardcoded Magic Numbers
**File:** `dashboard/hooks/useWebSocket.ts:21-22, src/pipeline/PipelineController.ts:279`
**Severity:** Low

**Issue:**
```typescript
reconnectInterval = 3000,
maxReconnectAttempts = 5,
```
Magic numbers without constants or configuration.

**Impact:**
- Hard to tune/configure
- Repeated values across codebase
- Poor maintainability

**Recommendation:**
Extract to configuration constants:
```typescript
const DEFAULT_RECONNECT_INTERVAL = 3000;
const DEFAULT_MAX_RECONNECT_ATTEMPTS = 5;
```

---

## Testing Gaps Identified

### Issues Found in Test Suite

1. **tests/connectors.test.js:48-49** - Test skipped instead of properly handling no providers
2. **tests/connectors.test.js** - Missing tests for error conditions
3. No integration tests for pipeline execution
4. No tests for WebSocket reconnection logic
5. Missing tests for rate limiting functionality

---

## Security Concerns

1. **server.js** - Rate limiting not functional (issue #4)
2. **dashboard/lib/api.ts** - Sensitive data in URL query params (issue #7)
3. No input sanitization before LLM queries
4. Missing CSRF protection on API endpoints
5. No API key rotation mechanism
6. Secrets potentially logged in error messages

---

## Performance Issues

1. Memory leak in activeRuns Map (issue #1)
2. Inefficient polling in dependency resolution (issue #13)
3. No caching for LLM model lists
4. Synchronous file I/O in some paths
5. No connection pooling for database queries

---

## Recommendations Summary

### Immediate Action Required (Critical/High)
1. Fix memory leak in pipeline route
2. Fix WebSocket infinite reconnection loop
3. Update deprecated datetime.utcnow() calls
4. Fix rate limiting configuration bug
5. Replace deprecated substr() method
6. Implement proper streaming for POST requests

### Short Term (Medium)
1. Add comprehensive input validation
2. Implement proper async coordination for workflows
3. Add structured logging throughout
4. Improve error handling in pipeline execution
5. Add monitoring and alerting

### Long Term (Low + Improvements)
1. Comprehensive test coverage
2. Security audit and hardening
3. Performance optimization
4. Documentation improvements
5. Code style consistency

---

## Conclusion

The codebase is functional but has several critical issues that need immediate attention, particularly:
- Memory management (leaks, cleanup)
- Proper async/await error handling
- Deprecated API usage
- Configuration bugs affecting security features

Most issues are straightforward to fix with targeted patches. The architecture is sound, but production readiness requires addressing the critical and high severity issues.

**Next Steps:**
1. Prioritize Critical bugs for immediate fixes
2. Create tickets for High severity issues
3. Plan sprint for Medium severity improvements
4. Schedule code review sessions for consistency
5. Implement comprehensive testing strategy
