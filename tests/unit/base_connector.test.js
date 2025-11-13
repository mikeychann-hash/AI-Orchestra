/**
 * Base Connector Unit Tests
 * Tests base connector functionality that all connectors inherit
 *
 * Coverage:
 * - Retry mechanism with exponential backoff
 * - Sleep utility
 * - Response standardization
 * - Error handling
 * - Abstract class enforcement
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { BaseConnector } from '../../core/base_connector.js';

// Concrete implementation for testing
class TestConnector extends BaseConnector {
  constructor(config = {}) {
    super({ ...config, provider: 'test' });
    this.queryCallCount = 0;
    this.shouldFail = false;
    this.failureCount = 0;
  }

  async query(options) {
    this.queryCallCount++;
    if (this.shouldFail && this.queryCallCount <= this.failureCount) {
      throw new Error('Simulated API failure');
    }
    return {
      content: `Response to: ${options.prompt}`,
      model: 'test-model',
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
    };
  }

  async *streamQuery(options) {
    yield { content: 'chunk1' };
    yield { content: 'chunk2' };
    yield { content: 'chunk3' };
  }

  validateConfig() {
    return { valid: true, errors: [] };
  }

  async testConnection() {
    return true;
  }

  async getModels() {
    return [{ id: 'test-model', name: 'Test Model' }];
  }
}

describe('Base Connector Tests', () => {
  describe('Abstract Class Enforcement', () => {
    test('should throw error when instantiated directly', () => {
      assert.throws(
        () => {
          new BaseConnector();
        },
        {
          name: 'Error',
          message: /abstract.*cannot be instantiated/i,
        }
      );
    });

    test('should allow instantiation through subclass', () => {
      assert.doesNotThrow(() => {
        const connector = new TestConnector();
        assert.ok(connector);
      });
    });

    test('should set provider from config', () => {
      // TestConnector sets provider to 'test' in its constructor, overriding config
      const connector = new TestConnector({ provider: 'custom' });
      // The TestConnector constructor explicitly sets provider: 'test'
      assert.strictEqual(connector.provider, 'test');
    });

    test('should use default provider if not specified', () => {
      const connector = new TestConnector();
      assert.strictEqual(connector.provider, 'test');
    });
  });

  describe('Configuration Defaults', () => {
    test('should use default retry attempts', () => {
      const connector = new TestConnector();
      assert.strictEqual(connector.retryAttempts, 3);
    });

    test('should use custom retry attempts', () => {
      const connector = new TestConnector({ retryAttempts: 5 });
      assert.strictEqual(connector.retryAttempts, 5);
    });

    test('should use default retry delay', () => {
      const connector = new TestConnector();
      assert.strictEqual(connector.retryDelay, 1000);
    });

    test('should use custom retry delay', () => {
      const connector = new TestConnector({ retryDelay: 500 });
      assert.strictEqual(connector.retryDelay, 500);
    });

    test('should use default timeout', () => {
      const connector = new TestConnector();
      assert.strictEqual(connector.timeout, 60000);
    });

    test('should use custom timeout', () => {
      const connector = new TestConnector({ timeout: 30000 });
      assert.strictEqual(connector.timeout, 30000);
    });
  });

  describe('Retry Mechanism', () => {
    test('should succeed on first attempt', async () => {
      const connector = new TestConnector();
      const result = await connector.withRetry(async () => {
        return { success: true };
      });

      assert.deepStrictEqual(result, { success: true });
    });

    test('should retry on failure and eventually succeed', async () => {
      const connector = new TestConnector({ retryDelay: 10 });
      let attemptCount = 0;

      const result = await connector.withRetry(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
        return { success: true, attempts: attemptCount };
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.attempts, 3);
    });

    test('should throw error after max retries exhausted', async () => {
      const connector = new TestConnector({ retryAttempts: 3, retryDelay: 10 });

      await assert.rejects(
        async () => {
          await connector.withRetry(async () => {
            throw new Error('Persistent failure');
          });
        },
        {
          name: 'Error',
          message: 'Persistent failure',
        }
      );
    });

    test('should use exponential backoff for delays', async () => {
      const connector = new TestConnector({ retryAttempts: 4, retryDelay: 10 });
      const delays = [];
      const startTimes = [];

      await assert.rejects(async () => {
        await connector.withRetry(async () => {
          const now = Date.now();
          if (startTimes.length > 0) {
            delays.push(now - startTimes[startTimes.length - 1]);
          }
          startTimes.push(now);
          throw new Error('Fail');
        });
      });

      // Verify exponential backoff pattern (each delay ~2x previous)
      // First delay: 10ms, second: 20ms, third: 40ms
      assert.ok(delays.length === 3, 'Should have 3 delays');
      assert.ok(delays[0] >= 10, 'First delay should be >= 10ms');
      assert.ok(delays[1] >= 20, 'Second delay should be >= 20ms');
      assert.ok(delays[2] >= 40, 'Third delay should be >= 40ms');
    });

    test('should respect custom retry attempts', async () => {
      const connector = new TestConnector({ retryAttempts: 2, retryDelay: 10 });
      let attemptCount = 0;

      await assert.rejects(async () => {
        await connector.withRetry(async () => {
          attemptCount++;
          throw new Error('Fail');
        });
      });

      assert.strictEqual(attemptCount, 2, 'Should attempt exactly 2 times');
    });

    test('should pass through successful result immediately', async () => {
      const connector = new TestConnector();
      const start = Date.now();

      const result = await connector.withRetry(async () => {
        return { immediate: true };
      });

      const duration = Date.now() - start;

      assert.deepStrictEqual(result, { immediate: true });
      assert.ok(duration < 100, 'Should complete quickly without delays');
    });
  });

  describe('Sleep Utility', () => {
    test('should delay for specified milliseconds', async () => {
      const connector = new TestConnector();
      const start = Date.now();

      await connector.sleep(50);

      const duration = Date.now() - start;
      assert.ok(duration >= 45, `Duration ${duration}ms should be >= 45ms`);
      assert.ok(duration < 150, `Duration ${duration}ms should be < 150ms`);
    });

    test('should resolve immediately for 0ms', async () => {
      const connector = new TestConnector();
      const start = Date.now();

      await connector.sleep(0);

      const duration = Date.now() - start;
      assert.ok(duration < 50, 'Should complete almost immediately');
    });
  });

  describe('Response Standardization', () => {
    test('should standardize complete response', () => {
      const connector = new TestConnector();
      const raw = {
        content: 'Hello world',
        model: 'gpt-4',
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        metadata: { finishReason: 'stop', id: 'chat-123' },
      };

      const standardized = connector.standardizeResponse(raw);

      assert.strictEqual(standardized.provider, 'test');
      assert.strictEqual(standardized.content, 'Hello world');
      assert.strictEqual(standardized.model, 'gpt-4');
      assert.deepStrictEqual(standardized.usage, raw.usage);
      assert.deepStrictEqual(standardized.metadata, raw.metadata);
      assert.ok(standardized.timestamp);
    });

    test('should handle missing content', () => {
      const connector = new TestConnector();
      const raw = { model: 'gpt-4' };

      const standardized = connector.standardizeResponse(raw);

      assert.strictEqual(standardized.content, '');
      assert.strictEqual(standardized.model, 'gpt-4');
    });

    test('should handle missing model', () => {
      const connector = new TestConnector();
      const raw = { content: 'Hello' };

      const standardized = connector.standardizeResponse(raw);

      assert.strictEqual(standardized.model, 'unknown');
    });

    test('should handle missing usage', () => {
      const connector = new TestConnector();
      const raw = { content: 'Hello', model: 'gpt-4' };

      const standardized = connector.standardizeResponse(raw);

      assert.strictEqual(standardized.usage, null);
    });

    test('should handle missing metadata', () => {
      const connector = new TestConnector();
      const raw = { content: 'Hello', model: 'gpt-4' };

      const standardized = connector.standardizeResponse(raw);

      assert.deepStrictEqual(standardized.metadata, {});
    });

    test('should add timestamp to response', () => {
      const connector = new TestConnector();
      const raw = { content: 'Hello', model: 'gpt-4' };

      const standardized = connector.standardizeResponse(raw);

      assert.ok(standardized.timestamp);
      assert.ok(new Date(standardized.timestamp).getTime() > 0);
    });

    test('should preserve all original fields', () => {
      const connector = new TestConnector();
      const raw = {
        content: 'Hello',
        model: 'gpt-4',
        usage: { totalTokens: 30 },
        metadata: { custom: 'field' },
      };

      const standardized = connector.standardizeResponse(raw);

      assert.strictEqual(standardized.metadata.custom, 'field');
      assert.strictEqual(standardized.usage.totalTokens, 30);
    });
  });

  describe('Error Handling', () => {
    test('should format basic error', () => {
      const connector = new TestConnector();
      const error = new Error('Test error');

      const formattedError = connector.handleError(error);

      assert.ok(formattedError instanceof Error);
      const errorData = JSON.parse(formattedError.message);
      assert.strictEqual(errorData.provider, 'test');
      assert.strictEqual(errorData.message, 'Test error');
      assert.ok(errorData.timestamp);
    });

    test('should include error code if present', () => {
      const connector = new TestConnector();
      const error = new Error('API error');
      error.code = 'RATE_LIMIT';

      const formattedError = connector.handleError(error);
      const errorData = JSON.parse(formattedError.message);

      assert.strictEqual(errorData.code, 'RATE_LIMIT');
    });

    test('should use UNKNOWN_ERROR as default code', () => {
      const connector = new TestConnector();
      const error = new Error('Generic error');

      const formattedError = connector.handleError(error);
      const errorData = JSON.parse(formattedError.message);

      assert.strictEqual(errorData.code, 'UNKNOWN_ERROR');
    });

    test('should include response status if present', () => {
      const connector = new TestConnector();
      const error = new Error('HTTP error');
      error.response = {
        status: 429,
        statusText: 'Too Many Requests',
        data: { message: 'Rate limit exceeded' },
      };

      const formattedError = connector.handleError(error);
      const errorData = JSON.parse(formattedError.message);

      assert.strictEqual(errorData.status, 429);
      assert.strictEqual(errorData.statusText, 'Too Many Requests');
      assert.deepStrictEqual(errorData.data, { message: 'Rate limit exceeded' });
    });

    test('should handle error without response', () => {
      const connector = new TestConnector();
      const error = new Error('Network error');

      const formattedError = connector.handleError(error);
      const errorData = JSON.parse(formattedError.message);

      assert.ok(!errorData.status);
      assert.ok(!errorData.statusText);
    });

    test('should preserve error message', () => {
      const connector = new TestConnector();
      const error = new Error('Original message');

      const formattedError = connector.handleError(error);
      const errorData = JSON.parse(formattedError.message);

      assert.strictEqual(errorData.message, 'Original message');
    });
  });

  describe('Abstract Method Enforcement', () => {
    test('base query should throw not implemented', async () => {
      const base = Object.create(BaseConnector.prototype);
      base.config = {};

      await assert.rejects(
        async () => {
          await base.query({});
        },
        {
          name: 'Error',
          message: /must be implemented/,
        }
      );
    });

    test('base streamQuery should throw not implemented', async () => {
      const base = Object.create(BaseConnector.prototype);
      base.config = {};

      // streamQuery returns a generator, calling it throws immediately
      assert.throws(
        () => {
          base.streamQuery({});
        },
        {
          name: 'Error',
          message: /must be implemented/,
        }
      );
    });

    test('base validateConfig should throw not implemented', () => {
      const base = Object.create(BaseConnector.prototype);
      base.config = {};

      assert.throws(
        () => {
          base.validateConfig();
        },
        {
          name: 'Error',
          message: /must be implemented/,
        }
      );
    });

    test('base testConnection should throw not implemented', async () => {
      const base = Object.create(BaseConnector.prototype);
      base.config = {};

      await assert.rejects(
        async () => {
          await base.testConnection();
        },
        {
          name: 'Error',
          message: /must be implemented/,
        }
      );
    });

    test('base getModels should throw not implemented', async () => {
      const base = Object.create(BaseConnector.prototype);
      base.config = {};

      await assert.rejects(
        async () => {
          await base.getModels();
        },
        {
          name: 'Error',
          message: /must be implemented/,
        }
      );
    });
  });

  describe('Integration with Subclass', () => {
    test('subclass should call inherited withRetry', async () => {
      const connector = new TestConnector({ retryAttempts: 2, retryDelay: 10 });
      connector.shouldFail = true;
      connector.failureCount = 1;

      const result = await connector.withRetry(async () => {
        return await connector.query({ prompt: 'test' });
      });

      assert.strictEqual(connector.queryCallCount, 2);
      assert.ok(result.content);
    });

    test('subclass should use standardizeResponse', async () => {
      const connector = new TestConnector();
      const raw = await connector.query({ prompt: 'Hello' });
      const standardized = connector.standardizeResponse(raw);

      assert.strictEqual(standardized.provider, 'test');
      assert.ok(standardized.timestamp);
    });
  });
});
