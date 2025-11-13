# ARCHITECT REPORT - ITERATION 4

**Generated:** 2025-11-13
**Architect Agent:** ITERATION 4 Analysis
**Branch:** claude/ai-agent-team-setup-011CV59nRWGNatFDYrFy8vpm
**Status:** Ready for Engineer & QA Implementation

---

## Executive Summary

Iteration 4 focuses on achieving **100% test pass rate** and **55-65% coverage** to reach **90-95% production readiness**. Analysis reveals 2 failing tests requiring immediate fixes, dashboard mock configuration issues preventing proper test execution, and specific coverage gaps in connector modules requiring targeted testing.

**Current State:**
- **Test Results:** 188/190 passing (99% pass rate, 2 failures)
- **Coverage:** 46.86% (target: 55-65%, gap: +8.14% minimum)
- **Production Readiness:** 85-90%
- **Critical Issues:** 2 test failures (P0), dashboard mocks broken (P1), connector coverage critically low (P1)

**Iteration 4 Goals:**
1. ✅ Fix 2 remaining test failures (P0)
2. ✅ Fix dashboard test mocks (P1)
3. ✅ Increase coverage to 55-65% (P1)
4. ✅ Address remaining P3 bugs (P2)

---

## Priority 1: Fix 2 Remaining Test Failures (P0)

### Test Failure #1: LLMBridge Error Message Mismatch

**Location:** `/home/user/AI-Orchestra/tests/unit/bug-fixes-p0-p2.test.js:115`

**Test Name:** `LLMBridge should provide clear error message when querying with no connectors`

**Current Behavior:**
- Test expects error message to match regex: `/not available or not configured/`
- Actual error message: `'No providers available'`
- Error is thrown from `selectProvider()` at line 165 before reaching the intended check at line 80

**Expected Behavior:**
- When calling `bridge.query({ prompt: 'Hello' })` with no connectors, should throw error matching the regex
- Error should come from the query method's connector validation, not from selectProvider

**Root Cause:**
The error flow is:
1. `query()` calls `selectProvider()` (line 76)
2. `selectProvider()` throws `'No providers available'` (line 165) when `providers.length === 0`
3. This error bubbles up before reaching the intended validation at line 80

The test expects the error from line 80:
```javascript
throw new Error(`Provider "${provider}" is not available or not configured`);
```

But gets the error from line 165:
```javascript
throw new Error('No providers available');
```

**Specification for Engineer:**

**File:** `/home/user/AI-Orchestra/core/llm_bridge.js`

**Fix Required:**

```javascript
// LOCATION: llm_bridge.js, line 75-81
async query(options) {
  // OLD CODE:
  const provider = options.provider || this.selectProvider();
  const connector = this.connectors.get(provider);

  if (!connector) {
    throw new Error(`Provider "${provider}" is not available or not configured`);
  }

  // NEW CODE - Add pre-check for empty connectors:
  // Check if we have any connectors before attempting selection
  if (this.connectors.size === 0) {
    throw new Error('No LLM providers are available or not configured. Please check your configuration.');
  }

  const provider = options.provider || this.selectProvider();
  const connector = this.connectors.get(provider);

  if (!connector) {
    throw new Error(`Provider "${provider}" is not available or not configured`);
  }

  // ... rest of method unchanged
}
```

**Rationale:**
- Adding the check before `selectProvider()` ensures the error message matches the test's regex pattern
- Provides clearer error message for users when no providers are configured
- Prevents cascading error from `selectProvider()` throwing first

---

### Test Failure #2: LLMBridge selectProvider Should Return Default Without Throwing

**Location:** `/home/user/AI-Orchestra/tests/unit/bug-fixes-p0-p2.test.js:151`

**Test Name:** `LLMBridge selectProvider should handle no available providers`

**Current Behavior:**
```javascript
const bridge = new LLMBridge({ providers: {} });
const provider = bridge.selectProvider(); // ❌ Throws: "No providers available"
```

**Expected Behavior:**
```javascript
const bridge = new LLMBridge({ providers: {} });
const provider = bridge.selectProvider(); // ✅ Should return default provider without throwing
assert.ok(provider); // Test expects a truthy provider name
```

**Root Cause:**
The test comment states: `"Should return default provider even if not available"`

This indicates the design intent is for `selectProvider()` to be graceful and return a default value (like the configured `defaultProvider`) even when no connectors are initialized, allowing the error to be thrown later at query time.

Current implementation at line 164-166:
```javascript
if (providers.length === 0) {
  throw new Error('No providers available');
}
```

**Specification for Engineer:**

**File:** `/home/user/AI-Orchestra/core/llm_bridge.js`

**Fix Required:**

```javascript
// LOCATION: llm_bridge.js, lines 161-187
selectProvider() {
  const providers = Array.from(this.connectors.keys());

  // OLD CODE (lines 164-166):
  if (providers.length === 0) {
    throw new Error('No providers available');
  }

  // NEW CODE:
  // Return default provider name even if no connectors are initialized
  // This allows graceful degradation - actual error will be thrown at query time
  if (providers.length === 0) {
    return this.defaultProvider; // Returns 'openai' by default
  }

  if (providers.length === 1) {
    return providers[0];
  }

  switch (this.loadBalancing) {
    case 'round-robin':
      const provider = providers[this.currentProviderIndex % providers.length];
      this.currentProviderIndex++;
      return provider;

    case 'random':
      return providers[Math.floor(Math.random() * providers.length)];

    case 'default':
    default:
      return this.connectors.has(this.defaultProvider)
        ? this.defaultProvider
        : providers[0];
  }
}
```

**Rationale:**
- Separates provider selection logic from connector availability validation
- `selectProvider()` becomes a pure selection function that returns a provider name
- Validation that the selected provider actually exists happens in `query()` method
- Aligns with test's expectation of graceful degradation
- Consistent with the defensive programming pattern used elsewhere

---

## Priority 2: Dashboard Test Mocks (P1)

### Mock Issue Analysis

**Files Affected:**
- `/home/user/AI-Orchestra/dashboard/tests/api.test.ts`
- `/home/user/AI-Orchestra/dashboard/tests/useWebSocket.test.ts`
- `/home/user/AI-Orchestra/dashboard/tests/setup.ts`

**Current Problems:**

#### Issue 1: Global fetch Mock Not Properly Configured

**Error Message:**
```
Failed to fetch CSRF token: TypeError: Cannot read properties of undefined (reading 'json')
```

**Root Cause:**
The global `fetch` mock in `setup.ts` (line 62) is declared but not properly initialized:
```typescript
global.fetch = vi.fn(); // ❌ Returns undefined by default
```

When `ApiClient.initializeCsrfToken()` calls `fetch()`, it gets an undefined return value, and attempting to call `.json()` on undefined throws.

#### Issue 2: WebSocket Mock Constructor Pattern

**Error Message:**
```
[vitest] The vi.fn() mock did not use 'function' or 'class' in its implementation
TypeError: () => mockWebSocketInstance is not a constructor
```

**Root Cause:**
In `useWebSocket.test.ts`, the mock is created as:
```typescript
mockWebSocket = vi.fn(() => mockWebSocketInstance); // ❌ Arrow function not a constructor
```

Vitest's `vi.fn()` with arrow functions cannot be used with `new` keyword.

---

### Specification for Engineer

#### Fix 1: Configure Global fetch Mock in setup.ts

**File:** `/home/user/AI-Orchestra/dashboard/tests/setup.ts`

**Current Code (line 62):**
```typescript
global.fetch = vi.fn();
```

**New Code:**
```typescript
// Mock fetch globally with proper response structure
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: async () => ({}),
  text: async () => '',
  blob: async () => new Blob(),
  arrayBuffer: async () => new ArrayBuffer(0),
  headers: new Headers(),
  redirected: false,
  type: 'basic',
  url: '',
  clone: function() { return this; },
  body: null,
  bodyUsed: false,
}) as any;
```

**Rationale:**
- Provides a complete Response-like object that won't throw on property access
- Individual tests can override this mock with `fetchMock.mockResolvedValueOnce(...)` for specific scenarios
- Follows Vitest best practices for global mocks

---

#### Fix 2: Fix WebSocket Mock Constructor Pattern

**File:** `/home/user/AI-Orchestra/dashboard/tests/useWebSocket.test.ts`

**Current Code (lines 37-38):**
```typescript
mockWebSocket = vi.fn(() => mockWebSocketInstance);
global.WebSocket = mockWebSocket as any;
```

**New Code:**
```typescript
// Use function constructor pattern instead of arrow function
mockWebSocket = vi.fn(function(this: any, url: string) {
  // Copy properties to 'this' context
  Object.assign(this, mockWebSocketInstance);
  return this;
});
global.WebSocket = mockWebSocket as any;
```

**Alternative (Simpler) Approach:**
```typescript
// Create a proper constructor function
class MockWebSocket {
  send = vi.fn();
  close = vi.fn();
  readyState = 0;
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  onopen = null;
  onmessage = null;
  onclose = null;
  onerror = null;

  constructor(url: string) {
    // Initialize with URL
  }
}

mockWebSocket = vi.fn().mockImplementation((url: string) => new MockWebSocket(url));
global.WebSocket = mockWebSocket as any;
```

**Rationale:**
- Using `function` keyword allows Vitest to properly spy on constructor calls
- The class pattern is cleaner and more maintainable
- Matches Vitest documentation for mocking constructors

---

#### Fix 3: Ensure fetch Mock in Individual Tests Doesn't Conflict

**File:** `/home/user/AI-Orchestra/dashboard/tests/api.test.ts`

**Current Pattern (lines 20-23):**
```typescript
beforeEach(() => {
  fetchMock = vi.fn();
  global.fetch = fetchMock;
  apiClient = new ApiClient('http://test-api.local');
});
```

**Issue:** ApiClient constructor immediately calls `initializeCsrfToken()`, but the mock isn't configured yet.

**New Pattern:**
```typescript
beforeEach(async () => {
  // Configure mock BEFORE creating ApiClient
  fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ csrfToken: 'test-token-default' }),
  });
  global.fetch = fetchMock;

  // Now create ApiClient - it will successfully fetch CSRF token
  apiClient = new ApiClient('http://test-api.local');

  // Wait for async initialization to complete
  await new Promise(resolve => setTimeout(resolve, 10));
});
```

**Rationale:**
- Ensures mock is properly configured before ApiClient initialization
- Prevents "Cannot read properties of undefined" errors
- Makes tests more predictable and robust

---

## Priority 3: Coverage Improvement to 55-65% (P1)

### Coverage Gap Analysis

**Current:** 46.86%
**Target:** 55-65%
**Gap:** +8.14% minimum, +18.14% for upper target

**Critical Modules with Low Coverage:**

| Module | Current % | Target % | Uncovered Functions | Priority |
|--------|-----------|----------|---------------------|----------|
| core/connectors/*.js | 27.21% | 70%+ | Most async methods | P0 |
| openai_connector.js | 31.22% | 75% | streamQuery, getModels, testConnection | P0 |
| grok_connector.js | 26.29% | 75% | streamQuery, getModels, testConnection | P0 |
| ollama_connector.js | 25.15% | 75% | streamQuery, getModels, testConnection | P0 |
| base_connector.js | 58.86% | 80% | withRetry edge cases, timeout handling | P1 |
| llm_bridge.js | 52.67% | 75% | streamQuery, queryWithFallback, getAllModels | P1 |

---

### Modules Requiring Tests

#### 1. OpenAI Connector (Current: 31.22%, Target: 75%)

**Uncovered Functions:**
- `streamQuery()` - Lines 84-126
- `getModels()` - Lines 179-190
- `testConnection()` - Lines 142-149
- `validateConfig()` - Lines 156-170
- Error handling in `withRetry()` wrapper - Lines 73-76

**Uncovered Lines:** 142-149, 156-170, 179-190, 198-220

**Test Specifications:**

```javascript
// File to create: /home/user/AI-Orchestra/tests/unit/connectors/openai-extended.test.js

describe('OpenAI Connector - Extended Coverage', () => {
  describe('streamQuery()', () => {
    test('should stream responses chunk by chunk', async () => {
      // Mock OpenAI client streaming
      // Verify chunks are yielded correctly
      // Test with various chunk sizes
    });

    test('should handle streaming errors gracefully', async () => {
      // Mock stream that throws error mid-stream
      // Verify error handling
    });

    test('should support streaming with messages array', async () => {
      // Test streaming with multi-turn conversations
    });
  });

  describe('getModels()', () => {
    test('should fetch and return available models', async () => {
      // Mock client.models.list()
      // Verify model list transformation
    });

    test('should handle API errors when fetching models', async () => {
      // Mock API failure
      // Verify error is thrown with clear message
    });

    test('should cache models list to reduce API calls', async () => {
      // If caching is implemented, test it
    });
  });

  describe('testConnection()', () => {
    test('should return true when connection succeeds', async () => {
      // Mock successful lightweight API call
      // Verify returns true
    });

    test('should return false when connection fails', async () => {
      // Mock API error (network, auth, etc.)
      // Verify returns false, not throwing
    });

    test('should validate API key format before testing', async () => {
      // Test with invalid API key format
    });
  });

  describe('validateConfig()', () => {
    test('should validate API key presence', () => {
      // Test missing API key
      // Verify validation error
    });

    test('should validate model name format', () => {
      // Test invalid model names
    });

    test('should validate temperature range (0-2)', () => {
      // Test out of range values
    });

    test('should validate maxTokens bounds', () => {
      // Test negative, zero, excessive values
    });
  });

  describe('Error Handling & Retries', () => {
    test('should retry on rate limit errors', async () => {
      // Mock 429 response
      // Verify retries with exponential backoff
    });

    test('should not retry on 4xx client errors', async () => {
      // Mock 400, 401, 403 errors
      // Verify no retry, immediate failure
    });

    test('should handle timeout errors', async () => {
      // Mock timeout
      // Verify proper error message
    });
  });
});
```

**Expected Coverage Impact:** +12% (31.22% → 43%)

---

#### 2. Grok Connector (Current: 26.29%, Target: 75%)

**Uncovered Functions:**
- `streamQuery()` - Lines 162-176
- `getModels()` - Lines 208-231
- `testConnection()` - Lines 183-201
- `validateConfig()` - Lines 238-250

**Uncovered Lines:** 162-176, 183-201, 208-231, 238-250

**Test Specifications:**

```javascript
// File to create: /home/user/AI-Orchestra/tests/unit/connectors/grok-extended.test.js

describe('Grok Connector - Extended Coverage', () => {
  describe('streamQuery()', () => {
    test('should stream Grok responses via SSE', async () => {
      // Mock Grok streaming API
      // Verify SSE parsing
    });

    test('should handle Grok-specific rate limits', async () => {
      // Grok has different rate limit structure
      // Test rate limit handling
    });

    test('should fallback to non-streaming on error', async () => {
      // If streaming fails, should gracefully degrade
    });
  });

  describe('getModels()', () => {
    test('should return Grok model list', async () => {
      // Mock Grok API models endpoint
      // Verify model list format
    });

    test('should handle Grok API version differences', async () => {
      // Test with different API versions
    });
  });

  describe('testConnection()', () => {
    test('should verify Grok API accessibility', async () => {
      // Mock health check or lightweight query
      // Verify connection status
    });

    test('should detect Grok API key issues', async () => {
      // Test with invalid/expired key
    });
  });

  describe('validateConfig()', () => {
    test('should validate Grok-specific config', () => {
      // Grok may have unique config requirements
      // Test validation logic
    });
  });
});
```

**Expected Coverage Impact:** +13% (26.29% → 39%)

---

#### 3. Ollama Connector (Current: 25.15%, Target: 75%)

**Uncovered Functions:**
- `streamQuery()` - Lines 251-260
- `getModels()` - Lines 286-298
- `testConnection()` - Lines 268-277
- `validateConfig()` - Lines 307-317

**Uncovered Lines:** 251-260, 268-277, 286-298, 307-317

**Test Specifications:**

```javascript
// File to create: /home/user/AI-Orchestra/tests/unit/connectors/ollama-extended.test.js

describe('Ollama Connector - Extended Coverage', () => {
  describe('Local Connection Handling', () => {
    test('should detect when Ollama is not running', async () => {
      // Mock connection refused error
      // Verify clear error message
    });

    test('should handle localhost vs 127.0.0.1 differences', async () => {
      // Test both connection strings
    });

    test('should timeout appropriately for local connections', async () => {
      // Local should have shorter timeout than remote
    });
  });

  describe('streamQuery()', () => {
    test('should stream from local Ollama instance', async () => {
      // Mock local streaming
      // Verify chunk handling
    });

    test('should handle Ollama-specific response format', async () => {
      // Ollama has different response structure
      // Test parsing
    });
  });

  describe('getModels()', () => {
    test('should list locally available models', async () => {
      // Mock /api/tags endpoint
      // Verify model list
    });

    test('should handle empty model list gracefully', async () => {
      // No models pulled yet
      // Should return empty array, not error
    });
  });

  describe('testConnection()', () => {
    test('should ping local Ollama API', async () => {
      // Mock /api/version or /api/tags
      // Quick connectivity test
    });

    test('should detect Ollama version compatibility', async () => {
      // Test with old/new Ollama versions
    });
  });

  describe('validateConfig()', () => {
    test('should validate baseURL format', () => {
      // Test various URL formats
      // http://localhost:11434 vs http://127.0.0.1:11434
    });

    test('should validate model availability', async () => {
      // Check if requested model is pulled
    });
  });
});
```

**Expected Coverage Impact:** +14% (25.15% → 39%)

---

#### 4. Base Connector (Current: 58.86%, Target: 80%)

**Uncovered Functions:**
- `withRetry()` - Edge cases in retry logic (lines 73-93)
- `validateConfig()` - Abstract method never called directly (lines 47-49)
- `testConnection()` - Abstract method (lines 54-56)
- `getModels()` - Abstract method (lines 63-65)
- `standardizeResponse()` - Helper method (lines 101-102)
- `formatError()` - Error formatting (lines 110-118)
- `logMetrics()` - Metrics logging (lines 126-140)

**Uncovered Lines:** 74-93, 101-102, 110-118, 126-140

**Test Specifications:**

```javascript
// File to create: /home/user/AI-Orchestra/tests/unit/base-connector-extended.test.js

describe('BaseConnector - Extended Coverage', () => {
  // Need to create a concrete test implementation
  class TestConnector extends BaseConnector {
    async query(options) { return { content: 'test' }; }
    async *streamQuery(options) { yield { chunk: 'test' }; }
    validateConfig() { return { valid: true, errors: [] }; }
    async testConnection() { return true; }
    async getModels() { return ['model-1', 'model-2']; }
  }

  describe('withRetry() - Edge Cases', () => {
    test('should retry exactly retryAttempts times', async () => {
      const connector = new TestConnector({ retryAttempts: 3 });
      const failingFn = vi.fn().mockRejectedValue(new Error('Fail'));

      await expect(connector.withRetry(failingFn)).rejects.toThrow();
      expect(failingFn).toHaveBeenCalledTimes(3);
    });

    test('should wait retryDelay between attempts', async () => {
      const connector = new TestConnector({ retryAttempts: 2, retryDelay: 100 });
      const start = Date.now();

      await expect(connector.withRetry(() => Promise.reject(new Error()))).rejects.toThrow();

      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(100); // At least one delay
    });

    test('should succeed on last retry attempt', async () => {
      const connector = new TestConnector({ retryAttempts: 3 });
      let attempts = 0;
      const fn = vi.fn(() => {
        attempts++;
        if (attempts < 3) throw new Error('Fail');
        return Promise.resolve('success');
      });

      const result = await connector.withRetry(fn);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    test('should not retry on non-retryable errors', async () => {
      const connector = new TestConnector({ retryAttempts: 5 });
      const error = new Error('Invalid API key');
      error.code = 'AUTH_ERROR';

      const fn = vi.fn().mockRejectedValue(error);

      // Should fail immediately, not retry 5 times
      await expect(connector.withRetry(fn)).rejects.toThrow('Invalid API key');
      // Implementation may need to check error codes
    });
  });

  describe('standardizeResponse()', () => {
    test('should format response consistently', () => {
      const connector = new TestConnector();
      const raw = {
        content: 'Hello',
        model: 'gpt-4',
        usage: { total: 100 }
      };

      const standardized = connector.standardizeResponse(raw);

      expect(standardized).toHaveProperty('content');
      expect(standardized).toHaveProperty('provider');
      expect(standardized.provider).toBe('unknown'); // Default provider
    });
  });

  describe('formatError()', () => {
    test('should format API errors with context', () => {
      const connector = new TestConnector();
      const error = new Error('Rate limit exceeded');
      error.status = 429;

      const formatted = connector.formatError(error, { operation: 'query' });

      expect(formatted).toContain('Rate limit exceeded');
      expect(formatted).toContain('query');
    });
  });

  describe('logMetrics()', () => {
    test('should log request metrics', () => {
      const connector = new TestConnector();
      const metrics = {
        duration: 1500,
        tokens: 250,
        model: 'gpt-4'
      };

      // Should not throw
      expect(() => connector.logMetrics(metrics)).not.toThrow();
    });
  });
});
```

**Expected Coverage Impact:** +5% (58.86% → 64%)

---

#### 5. LLM Bridge (Current: 52.67%, Target: 75%)

**Uncovered Functions:**
- `streamQuery()` - Lines 106-125
- `queryWithFallback()` - Lines 133-155
- `testAllConnections()` - Lines 210-229
- `getAllModels()` - Lines 236-248
- `getStats()` - Lines 255-261

**Uncovered Lines:** 203-204, 211-229, 236-248, 255-261

**Test Specifications:**

```javascript
// File to expand: /home/user/AI-Orchestra/tests/unit/llm-bridge-extended.test.js

describe('LLM Bridge - Extended Coverage', () => {
  describe('streamQuery()', () => {
    test('should stream from selected provider', async () => {
      const config = {
        providers: {
          openai: { enabled: true, apiKey: 'test-key' }
        }
      };

      const bridge = new LLMBridge(config);

      // Mock connector streamQuery
      const mockStream = async function*() {
        yield { content: 'chunk1', provider: 'openai' };
        yield { content: 'chunk2', provider: 'openai' };
      };

      bridge.connectors.get('openai').streamQuery = mockStream;

      const chunks = [];
      for await (const chunk of bridge.streamQuery({ prompt: 'test' })) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(2);
      expect(chunks[0].provider).toBe('openai');
    });

    test('should handle streaming errors', async () => {
      const bridge = new LLMBridge({
        providers: { openai: { enabled: true, apiKey: 'test-key' } }
      });

      bridge.connectors.get('openai').streamQuery = async function*() {
        throw new Error('Stream failed');
      };

      await expect(async () => {
        for await (const chunk of bridge.streamQuery({ prompt: 'test' })) {
          // Should throw before first chunk
        }
      }).rejects.toThrow('Stream failed');
    });
  });

  describe('queryWithFallback()', () => {
    test('should fallback to next provider on failure', async () => {
      const config = {
        enableFallback: true,
        providers: {
          openai: { enabled: true, apiKey: 'test-key' },
          grok: { enabled: true, apiKey: 'test-key' }
        }
      };

      const bridge = new LLMBridge(config);

      // Make OpenAI fail
      bridge.connectors.get('openai').query = vi.fn().mockRejectedValue(new Error('OpenAI failed'));

      // Make Grok succeed
      bridge.connectors.get('grok').query = vi.fn().mockResolvedValue({
        content: 'Success from Grok',
        model: 'grok-1'
      });

      const result = await bridge.queryWithFallback({ prompt: 'test' }, 'openai');

      expect(result.content).toBe('Success from Grok');
      expect(result.fallback).toBe(true);
      expect(result.originalProvider).toBe('openai');
      expect(result.provider).toBe('grok');
    });

    test('should try all providers before failing', async () => {
      const bridge = new LLMBridge({
        enableFallback: true,
        providers: {
          openai: { enabled: true, apiKey: 'test-key' },
          grok: { enabled: true, apiKey: 'test-key' }
        }
      });

      // Make both fail
      bridge.connectors.get('openai').query = vi.fn().mockRejectedValue(new Error('Failed'));
      bridge.connectors.get('grok').query = vi.fn().mockRejectedValue(new Error('Failed'));

      await expect(bridge.queryWithFallback({ prompt: 'test' }, 'openai'))
        .rejects.toThrow('All providers failed to respond');
    });
  });

  describe('testAllConnections()', () => {
    test('should test all configured providers', async () => {
      const bridge = new LLMBridge({
        providers: {
          openai: { enabled: true, apiKey: 'test-key' },
          grok: { enabled: true, apiKey: 'test-key' }
        }
      });

      bridge.connectors.get('openai').testConnection = vi.fn().mockResolvedValue(true);
      bridge.connectors.get('grok').testConnection = vi.fn().mockResolvedValue(false);

      const results = await bridge.testAllConnections();

      expect(results.openai.connected).toBe(true);
      expect(results.grok.connected).toBe(false);
      expect(results.grok.error).toBeDefined();
    });
  });

  describe('getAllModels()', () => {
    test('should aggregate models from all providers', async () => {
      const bridge = new LLMBridge({
        providers: {
          openai: { enabled: true, apiKey: 'test-key' },
          grok: { enabled: true, apiKey: 'test-key' }
        }
      });

      bridge.connectors.get('openai').getModels = vi.fn().mockResolvedValue([
        { id: 'gpt-4', name: 'GPT-4' }
      ]);
      bridge.connectors.get('grok').getModels = vi.fn().mockResolvedValue([
        { id: 'grok-1', name: 'Grok-1' }
      ]);

      const models = await bridge.getAllModels();

      expect(models.openai).toHaveLength(1);
      expect(models.grok).toHaveLength(1);
    });

    test('should handle provider errors gracefully', async () => {
      const bridge = new LLMBridge({
        providers: {
          openai: { enabled: true, apiKey: 'test-key' }
        }
      });

      bridge.connectors.get('openai').getModels = vi.fn().mockRejectedValue(new Error('API Error'));

      const models = await bridge.getAllModels();

      expect(models.openai).toEqual([]); // Should return empty array, not throw
    });
  });

  describe('getStats()', () => {
    test('should return bridge statistics', () => {
      const bridge = new LLMBridge({
        defaultProvider: 'grok',
        loadBalancing: 'round-robin',
        providers: {
          openai: { enabled: true, apiKey: 'test-key' },
          grok: { enabled: true, apiKey: 'test-key' }
        }
      });

      const stats = bridge.getStats();

      expect(stats.connectors).toBe(2);
      expect(stats.providers).toContain('openai');
      expect(stats.providers).toContain('grok');
      expect(stats.defaultProvider).toBe('grok');
      expect(stats.loadBalancing).toBe('round-robin');
    });
  });
});
```

**Expected Coverage Impact:** +6% (52.67% → 59%)

---

### Specification for QA

**Priority Order for Test Creation:**

1. **IMMEDIATE (Target: +15%):**
   - `tests/unit/connectors/openai-extended.test.js` (+12%)
   - Fix dashboard mocks and re-run dashboard tests (+3%)

2. **HIGH PRIORITY (Target: +13%):**
   - `tests/unit/connectors/grok-extended.test.js` (+13%)

3. **MEDIUM PRIORITY (Target: +14%):**
   - `tests/unit/connectors/ollama-extended.test.js` (+14%)

4. **FINAL PUSH (Target: +11%):**
   - `tests/unit/base-connector-extended.test.js` (+5%)
   - `tests/unit/llm-bridge-extended.test.js` (+6%)

**Expected Total Coverage After All Tests:** 46.86% + 55% = **~102%** → Achievable target: **60-65%**

**Test Execution Strategy:**
1. Run each test file individually first to verify it works
2. Ensure all mocks are properly configured
3. Use `c8` coverage reporter to track incremental improvements
4. Aim for 70%+ coverage in connector files (currently 27%)
5. Dashboard tests should add 3-5% when mocks are fixed

---

## Priority 4: Remaining P3 Bugs (P2)

Based on analysis of the codebase and MASTER_BUG_GUIDE.md, the following P3 bugs remain:

### Bug #14: Console.log Usage Instead of Winston Logger (P3)

**Priority:** P3 (Code Quality)
**Files Affected:** Multiple core files
**Current Status:** Tests exist but are disabled (TODOs in bug-fixes-p0-p2.test.js)

**Issue:**
Legacy `console.log`, `console.error`, `console.warn` statements throughout the codebase should use structured Winston logger for:
- Centralized log management
- Log levels
- Structured formatting
- Production log aggregation

**Locations:**
- `/home/user/AI-Orchestra/core/llm_bridge.js` - Logger is imported but check for remaining console usage
- `/home/user/AI-Orchestra/core/connectors/*.js` - Connectors may have console statements
- `/home/user/AI-Orchestra/server.js` - Some console usage for startup messages

**Impact:**
- Medium: Affects observability and debugging in production
- Does not affect functionality
- Makes log aggregation and monitoring difficult

**Specification:**

```javascript
// REPLACE ALL console.* calls with logger.*

// BAD:
console.log('User connected');
console.error('Failed to connect:', error);
console.warn('Rate limit approaching');

// GOOD:
logger.info('User connected', { userId: user.id });
logger.error('Failed to connect', { error: error.message, stack: error.stack });
logger.warn('Rate limit approaching', { remaining: limit.remaining });
```

**Files to Update:**
1. Search entire codebase for `console.log`, `console.error`, `console.warn`
2. Replace with appropriate logger level
3. Add contextual metadata to log calls
4. Update tests to verify logger is called instead of console

**Affected Test File:** `/home/user/AI-Orchestra/tests/unit/bug-fixes-p0-p2.test.js:206-312`
- Currently has TODOs and commented assertions
- Uncomment and verify after fixes are implemented

---

### Bug #15: Missing Input Validation on API Endpoints (P3)

**Priority:** P3 (Security/Robustness)
**Files Affected:** `/home/user/AI-Orchestra/server.js`
**Current Status:** Tests exist but validation not implemented

**Issue:**
API endpoints lack comprehensive input validation for:
- Prompt length limits (prevent abuse)
- Temperature range (0-2 for OpenAI)
- MaxTokens bounds (prevent excessive usage)
- Provider parameter validation (whitelist)
- Model parameter format
- XSS/injection prevention

**Impact:**
- Security: Allows malformed requests
- Cost: No limits on token usage
- Stability: Invalid parameters may crash connectors

**Specification:**

```javascript
// File: /home/user/AI-Orchestra/server.js
// Add validation middleware

import { body, validationResult } from 'express-validator';

// Query endpoint validation
app.post('/api/query',
  [
    body('prompt')
      .isString()
      .trim()
      .isLength({ min: 1, max: 10000 })
      .withMessage('Prompt must be 1-10000 characters'),

    body('temperature')
      .optional()
      .isFloat({ min: 0, max: 2 })
      .withMessage('Temperature must be between 0 and 2'),

    body('maxTokens')
      .optional()
      .isInt({ min: 1, max: 4096 })
      .withMessage('MaxTokens must be between 1 and 4096'),

    body('provider')
      .optional()
      .isIn(['openai', 'grok', 'ollama'])
      .withMessage('Invalid provider'),

    body('model')
      .optional()
      .isString()
      .trim()
      .matches(/^[a-zA-Z0-9-_]+$/)
      .withMessage('Invalid model format'),
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  },
  csrfProtection,
  async (req, res) => {
    // Existing query handler
  }
);

// Similar validation for /api/stream endpoint
```

**Dependencies:**
```json
{
  "express-validator": "^7.0.1"
}
```

**Affected Test File:** `/home/user/AI-Orchestra/tests/unit/bug-fixes-p0-p2.test.js:314-453`
- Currently placeholder tests with TODOs
- Implement actual endpoint tests after validation is added

---

### Bug #16: Polling Instead of Event-Based Waiting (P3)

**Priority:** P3 (Performance)
**Files Affected:** `/home/user/AI-Orchestra/python_orchestrator.py`
**Current Status:** Deferred to Python iteration

**Issue:**
Python orchestrator may use polling (`while True: time.sleep()`) instead of event-based waiting (`threading.Event`), causing:
- Unnecessary CPU usage
- Delayed response times (limited by sleep interval)
- Poor scalability

**Specification:**

```python
# File: /home/user/AI-Orchestra/orchestrator/main.py

# BAD:
while True:
    if check_condition():
        break
    time.sleep(0.1)  # Wastes CPU, delayed by 100ms

# GOOD:
from threading import Event

event = Event()

# In the waiting thread:
event.wait(timeout=30)  # Blocks efficiently, immediate response

# In the signaling thread:
event.set()  # Wake up waiting thread immediately
```

**Rationale for P3:**
- Python orchestrator is separate component
- Requires Python-specific testing
- Can be addressed in dedicated Python modernization iteration
- Does not block core JavaScript functionality

**Affected Test File:** `/home/user/AI-Orchestra/tests/unit/bug-fixes-p0-p2.test.js:455-538`

---

### Bug #17: Unbounded WebSocket Connection Growth (P3)

**Priority:** P3 (Resource Management)
**Files Affected:** `/home/user/AI-Orchestra/server.js` (WebSocket server initialization)

**Issue:**
WebSocket server may not limit concurrent connections, allowing:
- Resource exhaustion under load
- DoS vulnerability
- Memory growth

**Current Code:**
```javascript
// server.js - WebSocket initialization
const wss = new WebSocketServer({ server: httpServer });
// No connection limit enforcement
```

**Specification:**

```javascript
// File: /home/user/AI-Orchestra/server.js

const MAX_WS_CONNECTIONS = 1000;
let activeConnections = 0;

wss.on('connection', (ws, req) => {
  // Enforce connection limit
  if (activeConnections >= MAX_WS_CONNECTIONS) {
    logger.warn('WebSocket connection limit reached', {
      current: activeConnections,
      max: MAX_WS_CONNECTIONS,
      ip: req.socket.remoteAddress
    });

    ws.close(1008, 'Server at capacity');
    return;
  }

  activeConnections++;
  logger.info('WebSocket connected', {
    activeConnections,
    ip: req.socket.remoteAddress
  });

  ws.on('close', () => {
    activeConnections--;
    logger.info('WebSocket disconnected', { activeConnections });
  });

  // Existing connection handling...
});

// Expose metrics
app.get('/api/ws-stats', (req, res) => {
  res.json({
    activeConnections,
    maxConnections: MAX_WS_CONNECTIONS,
    utilization: (activeConnections / MAX_WS_CONNECTIONS * 100).toFixed(2) + '%'
  });
});
```

**Configuration:**
Add to `config/settings.json`:
```json
{
  "websocket": {
    "maxConnections": 1000,
    "connectionTimeout": 300000
  }
}
```

---

### Bug #18: Missing Rate Limiting on WebSocket Messages (P3)

**Priority:** P3 (Security/Performance)
**Files Affected:** `/home/user/AI-Orchestra/server.js` (WebSocket message handler)

**Issue:**
Individual WebSocket connections can flood the server with messages without rate limiting, causing:
- Resource exhaustion
- DoS from single client
- Degraded performance for all users

**Specification:**

```javascript
// File: /home/user/AI-Orchestra/server.js

// Message rate limiter per connection
class WebSocketRateLimiter {
  constructor(maxMessages = 100, windowMs = 60000) {
    this.maxMessages = maxMessages;
    this.windowMs = windowMs;
    this.connections = new Map();
  }

  allow(connectionId) {
    const now = Date.now();

    if (!this.connections.has(connectionId)) {
      this.connections.set(connectionId, [now]);
      return true;
    }

    const timestamps = this.connections.get(connectionId);

    // Remove old timestamps outside window
    const validTimestamps = timestamps.filter(t => now - t < this.windowMs);

    if (validTimestamps.length >= this.maxMessages) {
      return false;
    }

    validTimestamps.push(now);
    this.connections.set(connectionId, validTimestamps);
    return true;
  }

  cleanup(connectionId) {
    this.connections.delete(connectionId);
  }
}

const wsRateLimiter = new WebSocketRateLimiter(100, 60000); // 100 msg/min

wss.on('connection', (ws, req) => {
  const connectionId = `${req.socket.remoteAddress}:${Date.now()}`;

  ws.on('message', (data) => {
    if (!wsRateLimiter.allow(connectionId)) {
      logger.warn('WebSocket rate limit exceeded', { connectionId });
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Rate limit exceeded. Please slow down.'
      }));
      return;
    }

    // Existing message handling...
  });

  ws.on('close', () => {
    wsRateLimiter.cleanup(connectionId);
  });
});
```

---

### Bug #19: Dashboard API Client Missing Error Retry Logic (P3)

**Priority:** P3 (Reliability)
**Files Affected:** `/home/user/AI-Orchestra/dashboard/lib/api.ts`

**Issue:**
API client only retries on CSRF token expiration (403 errors) but not on:
- Network failures (fetch errors)
- 5xx server errors
- Timeout errors

This makes the dashboard brittle under network instability.

**Specification:**

```typescript
// File: /home/user/AI-Orchestra/dashboard/lib/api.ts

private async requestWithRetry<T>(
  endpoint: string,
  options?: RequestInit,
  retries: number = 3
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await this.request<T>(endpoint, options);
    } catch (error) {
      lastError = error as Error;

      // Don't retry on client errors (4xx except 403)
      if (error.message.includes('HTTP 4')) {
        if (!error.message.includes('403')) {
          throw error;
        }
      }

      // Log retry attempt
      console.warn(`Request failed (attempt ${attempt}/${retries}):`, {
        endpoint,
        error: error.message
      });

      // Exponential backoff
      if (attempt < retries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`Request failed after ${retries} attempts: ${lastError.message}`);
}

// Update public methods to use retry wrapper
async get<T>(endpoint: string): Promise<T> {
  return this.requestWithRetry<T>(endpoint, { method: 'GET' });
}

async post<T>(endpoint: string, data?: any): Promise<T> {
  return this.requestWithRetry<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ... similar for put, delete
```

**Benefits:**
- Handles transient network failures
- Exponential backoff prevents overwhelming server
- Improves user experience during network instability

---

### Bug #20: Missing Timeout Configuration for LLM Queries (P3)

**Priority:** P3 (Reliability)
**Files Affected:** `/home/user/AI-Orchestra/core/connectors/*.js`

**Issue:**
While BaseConnector has a `timeout` config property, it's not consistently enforced in connector implementations. Long-running queries can hang indefinitely.

**Specification:**

```javascript
// File: /home/user/AI-Orchestra/core/base_connector.js

/**
 * Wrap async operation with timeout
 */
async withTimeout(promise, timeoutMs = this.timeout) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}
```

**Usage in Connectors:**

```javascript
// File: /home/user/AI-Orchestra/core/connectors/openai_connector.js

async query(options) {
  return await this.withRetry(async () => {
    // Wrap the API call with timeout
    return await this.withTimeout(
      this.client.chat.completions.create({
        // ... params
      }),
      options.timeout || this.timeout
    );
  });
}
```

**Apply to all three connectors:**
- OpenAI Connector
- Grok Connector
- Ollama Connector

---

## Architecture Decisions

### ADR-017: Error Message Consistency Pattern

**Context:**
Test failures revealed inconsistency in error handling between provider selection and provider availability checks.

**Decision:**
Separate concerns:
1. `selectProvider()` - Pure selection logic, returns provider name even if not available
2. `query()` - Validates selected provider exists before executing query
3. Pre-check for empty connectors in `query()` to provide clear error message

**Rationale:**
- Separation of concerns (selection vs validation)
- Graceful degradation (select first, validate later)
- Clear error messages for users
- Testable components

**Consequences:**
- More predictable error messages
- Easier to test provider selection logic independently
- Consistent with defensive programming patterns

---

### ADR-018: Dashboard Mock Configuration Strategy

**Context:**
Dashboard tests were failing due to improperly configured mocks for global APIs (fetch, WebSocket).

**Decision:**
1. Configure default global mocks in `setup.ts` with complete Response-like objects
2. Use `vi.fn().mockImplementation()` for constructor mocks (WebSocket)
3. Individual tests can override global mocks for specific scenarios
4. Always await async initialization in `beforeEach` hooks

**Rationale:**
- Prevents "Cannot read property 'json' of undefined" errors
- Follows Vitest best practices
- Makes tests more maintainable
- Reduces test boilerplate

**Consequences:**
- Tests are more reliable
- Easier to add new tests
- Better alignment with Vitest documentation

---

## Implementation Roadmap

### Phase 1: Critical Fixes (P0) - **Target: Day 1**

**Engineer Tasks:**
- [ ] Fix Test Failure #1: LLMBridge error message in `query()` method
- [ ] Fix Test Failure #2: LLMBridge `selectProvider()` graceful handling
- [ ] Run tests to verify 190/190 passing (100% pass rate)

**Estimated Time:** 2-3 hours
**Success Criteria:** All 190 tests passing

---

### Phase 2: Infrastructure (P1) - **Target: Day 1-2**

**Engineer Tasks:**
- [ ] Fix dashboard `setup.ts` fetch mock configuration
- [ ] Fix dashboard WebSocket mock constructor pattern
- [ ] Fix dashboard `api.test.ts` beforeEach async initialization
- [ ] Run dashboard tests to verify all passing

**QA Tasks (Parallel):**
- [ ] Create `tests/unit/connectors/openai-extended.test.js`
- [ ] Run and verify OpenAI extended tests pass
- [ ] Check coverage improvement (+12% expected)

**Estimated Time:** 4-6 hours
**Success Criteria:**
- Dashboard tests all passing
- Coverage: 46.86% → 59% (+12% from OpenAI tests)

---

### Phase 3: Coverage Push (P1) - **Target: Day 2-3**

**QA Tasks:**
- [ ] Create `tests/unit/connectors/grok-extended.test.js` (+13%)
- [ ] Create `tests/unit/connectors/ollama-extended.test.js` (+14%)
- [ ] Create `tests/unit/base-connector-extended.test.js` (+5%)
- [ ] Create `tests/unit/llm-bridge-extended.test.js` (+6%)
- [ ] Run full test suite after each new file
- [ ] Verify cumulative coverage improvements

**Estimated Time:** 8-12 hours
**Success Criteria:** Coverage: 59% → 60-65% (target achieved)

---

### Phase 4: Bug Fixes (P2) - **Target: Day 3-4**

**Engineer Tasks:**
- [ ] Bug #14: Replace console.* with logger.* calls (search entire codebase)
- [ ] Bug #15: Add express-validator middleware to API endpoints
- [ ] Bug #17: Add WebSocket connection limit enforcement
- [ ] Bug #18: Add WebSocket message rate limiting
- [ ] Bug #19: Add retry logic to dashboard API client
- [ ] Bug #20: Enforce timeout in connector query methods

**QA Tasks:**
- [ ] Uncomment TODOs in `bug-fixes-p0-p2.test.js` for Bug #14
- [ ] Add endpoint validation tests for Bug #15
- [ ] Add WebSocket limit tests for Bug #17-18
- [ ] Add API client retry tests for Bug #19
- [ ] Add timeout tests for Bug #20

**Estimated Time:** 10-15 hours
**Success Criteria:** All P3 bugs resolved, tests passing

---

## Success Metrics

### Iteration 4 Targets

| Metric | Baseline | Target | Success |
|--------|----------|--------|---------|
| **Test Pass Rate** | 99% (188/190) | 100% (190/190) | ✅ All pass |
| **Code Coverage** | 46.86% | 55-65% | ✅ 60-65% |
| **Connector Coverage** | 27.21% | 70%+ | ✅ 70-75% |
| **Dashboard Tests** | 0 passing | All passing | ✅ 100% |
| **Production Readiness** | 85-90% | 90-95% | ✅ Achieved |
| **P3 Bugs** | 8 open | 0 open | ✅ All resolved |

### Post-Iteration 4 Status

**Expected State:**
- ✅ **100% test pass rate** (190/190 tests)
- ✅ **60-65% code coverage** (target range achieved)
- ✅ **70%+ connector coverage** (up from 27%)
- ✅ **All dashboard tests passing** (mocks fixed)
- ✅ **P3 bugs addressed** (production-ready code quality)
- ✅ **90-95% production readiness**

---

## Notes for Engineer

### Critical Path Items

1. **Test Failures (P0):** These are blocking all other work. Fix immediately.
   - The fixes are straightforward: add pre-check and change throw to return
   - Should take 1-2 hours maximum

2. **Dashboard Mocks (P1):** Required for dashboard test suite to run.
   - Follow the exact patterns provided in specifications
   - Test incrementally - fix one mock at a time

3. **Code Quality:** When fixing bugs, follow existing patterns:
   - Use structured logging with context
   - Add comprehensive error handling
   - Include JSDoc comments
   - Follow existing code style

### Testing Strategy

- Run `npm test` after EACH fix to catch regressions early
- Run `npm test -- --coverage` to track coverage improvements
- Dashboard: `cd dashboard && npm test` separately
- Use `npm test -- --grep "specific test"` to run individual tests

### Common Pitfalls to Avoid

1. ❌ Don't change test expectations - fix the code to meet them
2. ❌ Don't skip error handling to make tests pass faster
3. ❌ Don't commit without running full test suite
4. ❌ Don't copy-paste mock configurations - understand them first

---

## Notes for QA

### Test Development Strategy

**Priority:** Focus on **connector tests first** - they have lowest coverage and biggest impact.

**Test File Naming:**
- Use `-extended.test.js` suffix to distinguish from existing tests
- Place in same directory as existing connector tests for consistency

**Mock Best Practices:**
1. Mock external dependencies (OpenAI SDK, HTTP calls)
2. Don't mock the code being tested (connectors themselves)
3. Use `vi.fn()` for functions, `vi.fn().mockImplementation()` for classes
4. Always clean up mocks in `afterEach()` hooks

**Coverage Verification:**
```bash
# Run tests with coverage for specific file
npm test -- tests/unit/connectors/openai-extended.test.js --coverage

# Check coverage report
cat coverage/coverage-summary.json | grep openai_connector
```

**Expected Coverage Gains:**
- Each connector file: +40-50% coverage
- Total system: +8-15% with all connector tests
- Dashboard tests (when fixed): +3-5%

**Test Quality Checklist:**
- [ ] Tests are independent (no shared state)
- [ ] Mocks are properly cleaned up
- [ ] Error cases are tested, not just happy path
- [ ] Async operations use proper awaits
- [ ] Test names clearly describe what is being tested

---

## Appendix A: Test Execution Commands

```bash
# Run all tests with coverage
npm test

# Run specific test file
npm test tests/unit/bug-fixes-p0-p2.test.js

# Run dashboard tests
cd dashboard && npm test

# Run with verbose output
npm test -- --verbose

# Run only failing tests
npm test -- --bail

# Generate coverage report
npm test -- --coverage
open coverage/index.html

# Watch mode for development
npm test -- --watch
```

---

## Appendix B: Coverage Report Analysis

**Current Coverage Breakdown:**

```
File                  | % Stmts | % Branch | % Funcs | % Lines | Priority
----------------------|---------|----------|---------|---------|----------
core/connectors/
  grok_connector.js   |  26.29% |    40.00%|  14.28% |  26.29% | P0 ⚠️
  ollama_connector.js |  25.15% |   100.00%|   0.00% |  25.15% | P0 ⚠️
  openai_connector.js |  31.22% |    66.66%|  12.50% |  31.22% | P0 ⚠️

core/
  base_connector.js   |  58.86% |    50.00%|  10.00% |  58.86% | P1
  llm_bridge.js       |  52.67% |    62.50%|  36.36% |  52.67% | P1
  config_manager.js   |  78.17% |    24.56%|  72.72% |  78.17% | P2
  logger.js           | 100.00% |    66.66%| 100.00% | 100.00% | ✅

TOTAL                 |  46.86% |    39.17%|  25.86% |  46.86% |
```

**Target After Iteration 4:**

```
File                  | Current | Target  | Tests Needed
----------------------|---------|---------|------------------
core/connectors/
  grok_connector.js   |  26.29% |  75%+   | grok-extended.test.js
  ollama_connector.js |  25.15% |  75%+   | ollama-extended.test.js
  openai_connector.js |  31.22% |  75%+   | openai-extended.test.js

core/
  base_connector.js   |  58.86% |  80%+   | base-connector-extended.test.js
  llm_bridge.js       |  52.67% |  75%+   | llm-bridge-extended.test.js
  config_manager.js   |  78.17% |  80%+   | (existing tests sufficient)
  logger.js           | 100.00% | 100%    | ✅ Complete

TOTAL                 |  46.86% | 60-65%  | 5 new test files
```

---

## Document Status

**Status:** ✅ COMPLETE - Ready for Engineer & QA Implementation
**Next Steps:**
1. Engineer: Fix 2 test failures (P0)
2. Engineer: Fix dashboard mocks (P1)
3. QA: Create connector extended tests (P1)
4. Engineer: Address P3 bugs (P2)

**Estimated Total Effort:** 30-40 hours across Engineer + QA
**Expected Completion:** 4-5 days with parallel work

**Review Status:**
- ✅ Test failures analyzed
- ✅ Root causes identified
- ✅ Specifications provided
- ✅ Coverage gaps documented
- ✅ Implementation roadmap defined
- ✅ Success metrics established

---

**END OF REPORT**
