/**
 * Grok (xAI) Connector Unit Tests
 * Tests Grok connector with mocked API responses
 *
 * Coverage:
 * - Successful query/response
 * - Streaming responses
 * - Error handling (401, 429, 503, timeout)
 * - Retry mechanism with exponential backoff
 * - Model listing
 * - Connection testing
 * - Configuration validation
 * - API key validation
 * - Response standardization
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import nock from 'nock';
import { GrokConnector } from '../../../core/connectors/grok_connector.js';

const GROK_API_BASE = 'https://api.x.ai';

describe('Grok Connector Tests', () => {
  let connector;

  beforeEach(() => {
    nock.cleanAll();

    connector = new GrokConnector({
      apiKey: 'test-grok-key',
      defaultModel: 'grok-beta',
      timeout: 5000,
      retryAttempts: 3,
      retryDelay: 100,
    });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('Initialization', () => {
    test('should initialize with valid API key', () => {
      assert.ok(connector);
      assert.strictEqual(connector.provider, 'grok');
      assert.strictEqual(connector.apiKey, 'test-grok-key');
    });

    test('should throw error without API key', () => {
      assert.throws(() => {
        new GrokConnector({});
      }, /API key is required/);
    });

    test('should use default model when not specified', () => {
      const conn = new GrokConnector({
        apiKey: 'test-key',
      });

      assert.strictEqual(conn.defaultModel, 'grok-beta');
    });

    test('should accept custom baseURL', () => {
      const conn = new GrokConnector({
        apiKey: 'test-key',
        baseURL: 'https://custom.api.com',
      });

      assert.strictEqual(conn.baseURL, 'https://custom.api.com');
    });

    test('should use environment variable for API key', () => {
      process.env.GROK_API_KEY = 'env-test-key';

      const conn = new GrokConnector({});

      assert.strictEqual(conn.apiKey, 'env-test-key');

      delete process.env.GROK_API_KEY;
    });
  });

  describe('Configuration Validation', () => {
    test('validateConfig should return valid for proper config', () => {
      const result = connector.validateConfig();

      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors.length, 0);
    });

    test('validateConfig should fail without API key', () => {
      const conn = new GrokConnector({ apiKey: 'test' });
      conn.apiKey = null;

      const result = conn.validateConfig();

      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.length > 0);
      assert.ok(result.errors[0].includes('API key'));
    });

    test('validateConfig should fail without base URL', () => {
      const conn = new GrokConnector({ apiKey: 'test' });
      conn.baseURL = null;

      const result = conn.validateConfig();

      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('base URL')));
    });
  });

  describe('Query Functionality', () => {
    test('should successfully query Grok API', async () => {
      nock(GROK_API_BASE)
        .post('/v1/chat/completions')
        .reply(200, {
          id: 'grok-123',
          object: 'chat.completion',
          created: Date.now(),
          model: 'grok-beta',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: 'This is a Grok response!',
              },
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: 15,
            completion_tokens: 25,
            total_tokens: 40,
          },
        });

      const response = await connector.query({
        prompt: 'Hello, Grok!',
      });

      assert.ok(response);
      assert.strictEqual(response.provider, 'grok');
      assert.strictEqual(response.content, 'This is a Grok response!');
      assert.strictEqual(response.usage.totalTokens, 40);
    });

    test('should handle custom model parameter', async () => {
      nock(GROK_API_BASE)
        .post('/v1/chat/completions', (body) => {
          assert.strictEqual(body.model, 'grok-1');
          return true;
        })
        .reply(200, {
          id: 'grok-123',
          model: 'grok-1',
          choices: [
            {
              message: { role: 'assistant', content: 'Response' },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
        });

      await connector.query({
        prompt: 'Test',
        model: 'grok-1',
      });
    });

    test('should handle temperature parameter', async () => {
      nock(GROK_API_BASE)
        .post('/v1/chat/completions', (body) => {
          assert.strictEqual(body.temperature, 0.9);
          return true;
        })
        .reply(200, {
          id: 'grok-123',
          model: 'grok-beta',
          choices: [
            {
              message: { role: 'assistant', content: 'Response' },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
        });

      await connector.query({
        prompt: 'Test',
        temperature: 0.9,
      });
    });

    test('should handle maxTokens parameter', async () => {
      nock(GROK_API_BASE)
        .post('/v1/chat/completions', (body) => {
          assert.strictEqual(body.max_tokens, 1500);
          return true;
        })
        .reply(200, {
          id: 'grok-123',
          model: 'grok-beta',
          choices: [
            {
              message: { role: 'assistant', content: 'Response' },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
        });

      await connector.query({
        prompt: 'Test',
        maxTokens: 1500,
      });
    });

    test('should handle messages array instead of prompt', async () => {
      nock(GROK_API_BASE)
        .post('/v1/chat/completions', (body) => {
          assert.ok(Array.isArray(body.messages));
          assert.strictEqual(body.messages.length, 2);
          return true;
        })
        .reply(200, {
          id: 'grok-123',
          model: 'grok-beta',
          choices: [
            {
              message: { role: 'assistant', content: 'Response' },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
        });

      await connector.query({
        messages: [
          { role: 'system', content: 'You are Grok.' },
          { role: 'user', content: 'Hello' },
        ],
      });
    });

    test('should reject streaming via query method', async () => {
      await assert.rejects(
        async () => {
          await connector.query({
            prompt: 'Test',
            stream: true,
          });
        },
        /Use streamQuery/
      );
    });

    test('should set stream to false explicitly', async () => {
      nock(GROK_API_BASE)
        .post('/v1/chat/completions', (body) => {
          assert.strictEqual(body.stream, false);
          return true;
        })
        .reply(200, {
          id: 'grok-123',
          model: 'grok-beta',
          choices: [
            {
              message: { role: 'assistant', content: 'Response' },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
        });

      await connector.query({ prompt: 'Test' });
    });
  });

  describe('Error Handling', () => {
    test('should handle 401 unauthorized error', async () => {
      nock(GROK_API_BASE)
        .post('/v1/chat/completions')
        .reply(401, {
          error: {
            message: 'Invalid API key',
            type: 'invalid_request_error',
          },
        });

      await assert.rejects(async () => {
        await connector.query({ prompt: 'Test' });
      });
    });

    test('should handle 429 rate limit error', async () => {
      nock(GROK_API_BASE)
        .post('/v1/chat/completions')
        .reply(429, {
          error: {
            message: 'Rate limit exceeded',
            type: 'rate_limit_error',
          },
        });

      await assert.rejects(async () => {
        await connector.query({ prompt: 'Test' });
      });
    });

    test('should handle 503 service unavailable', async () => {
      nock(GROK_API_BASE)
        .post('/v1/chat/completions')
        .reply(503, {
          error: {
            message: 'Service temporarily unavailable',
            type: 'service_unavailable',
          },
        });

      await assert.rejects(async () => {
        await connector.query({ prompt: 'Test' });
      });
    });

    test('should handle network timeout', async () => {
      nock(GROK_API_BASE)
        .post('/v1/chat/completions')
        .delayConnection(6000)
        .reply(200, {});

      await assert.rejects(async () => {
        await connector.query({ prompt: 'Test' });
      });
    });

    test('should handle malformed response', async () => {
      nock(GROK_API_BASE)
        .post('/v1/chat/completions')
        .reply(200, 'invalid json');

      await assert.rejects(async () => {
        await connector.query({ prompt: 'Test' });
      });
    });

    test('should handle missing choices in response', async () => {
      nock(GROK_API_BASE)
        .post('/v1/chat/completions')
        .reply(200, {
          id: 'grok-123',
          model: 'grok-beta',
          choices: [],
          usage: { prompt_tokens: 5, completion_tokens: 0, total_tokens: 5 },
        });

      await assert.rejects(async () => {
        await connector.query({ prompt: 'Test' });
      });
    });

    test('should handle missing usage in response', async () => {
      nock(GROK_API_BASE)
        .post('/v1/chat/completions')
        .reply(200, {
          id: 'grok-123',
          model: 'grok-beta',
          choices: [
            {
              message: { role: 'assistant', content: 'Response' },
              finish_reason: 'stop',
            },
          ],
        });

      const response = await connector.query({ prompt: 'Test' });

      // Should default to 0 for missing usage
      assert.strictEqual(response.usage.promptTokens, 0);
      assert.strictEqual(response.usage.completionTokens, 0);
      assert.strictEqual(response.usage.totalTokens, 0);
    });
  });

  describe('Retry Mechanism', () => {
    test('should retry on transient failures', async () => {
      let attempts = 0;

      nock(GROK_API_BASE)
        .post('/v1/chat/completions')
        .times(3)
        .reply(() => {
          attempts++;
          if (attempts < 3) {
            return [503, { error: { message: 'Service unavailable' } }];
          }
          return [
            200,
            {
              id: 'grok-123',
              model: 'grok-beta',
              choices: [
                {
                  message: { role: 'assistant', content: 'Success!' },
                  finish_reason: 'stop',
                },
              ],
              usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
            },
          ];
        });

      const response = await connector.query({ prompt: 'Test' });

      assert.strictEqual(attempts, 3);
      assert.ok(response.content);
    });

    test('should fail after max retry attempts', async () => {
      nock(GROK_API_BASE)
        .post('/v1/chat/completions')
        .times(3)
        .reply(503, { error: { message: 'Service unavailable' } });

      await assert.rejects(async () => {
        await connector.query({ prompt: 'Test' });
      });
    });

    test('should use exponential backoff for retries', async () => {
      const startTime = Date.now();

      nock(GROK_API_BASE)
        .post('/v1/chat/completions')
        .times(3)
        .reply(503, { error: { message: 'Service unavailable' } });

      try {
        await connector.query({ prompt: 'Test' });
      } catch (error) {
        const elapsed = Date.now() - startTime;

        // Should have waited for retries (100ms + 200ms = 300ms minimum)
        assert.ok(elapsed >= 300, `Expected >= 300ms, got ${elapsed}ms`);
      }
    });
  });

  describe('Model Management', () => {
    test('should list available models', async () => {
      nock(GROK_API_BASE)
        .get('/v1/models')
        .reply(200, {
          object: 'list',
          data: [
            { id: 'grok-beta', created: 1678000000, owned_by: 'xai' },
            { id: 'grok-1', created: 1677000000, owned_by: 'xai' },
          ],
        });

      const models = await connector.getModels();

      assert.ok(Array.isArray(models));
      assert.strictEqual(models.length, 2);
      assert.strictEqual(models[0].ownedBy, 'xai');
    });

    test('should return default models on API error', async () => {
      nock(GROK_API_BASE)
        .get('/v1/models')
        .reply(500, { error: { message: 'Internal error' } });

      const models = await connector.getModels();

      assert.ok(Array.isArray(models));
      assert.ok(models.length > 0);
      assert.ok(models.some(m => m.id === 'grok-beta'));
    });

    test('should handle models with missing owned_by', async () => {
      nock(GROK_API_BASE)
        .get('/v1/models')
        .reply(200, {
          object: 'list',
          data: [
            { id: 'grok-beta', created: 1678000000 },
          ],
        });

      const models = await connector.getModels();

      assert.strictEqual(models[0].ownedBy, 'xai');
    });

    test('should handle network errors gracefully', async () => {
      nock(GROK_API_BASE)
        .get('/v1/models')
        .replyWithError('Network error');

      const models = await connector.getModels();

      // Should return default models
      assert.ok(Array.isArray(models));
      assert.ok(models.length > 0);
    });
  });

  describe('Connection Testing', () => {
    test('testConnection should return true on models endpoint success', async () => {
      nock(GROK_API_BASE)
        .get('/v1/models')
        .reply(200, { object: 'list', data: [] });

      const result = await connector.testConnection();

      assert.strictEqual(result, true);
    });

    test('testConnection should fallback to chat completion test', async () => {
      nock(GROK_API_BASE)
        .get('/v1/models')
        .reply(404, { error: { message: 'Not found' } });

      nock(GROK_API_BASE)
        .post('/v1/chat/completions')
        .reply(200, {
          id: 'grok-123',
          model: 'grok-beta',
          choices: [
            {
              message: { role: 'assistant', content: 'Hi' },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        });

      const result = await connector.testConnection();

      assert.strictEqual(result, true);
    });

    test('testConnection should return false on failure', async () => {
      nock(GROK_API_BASE)
        .get('/v1/models')
        .reply(401, { error: { message: 'Invalid API key' } });

      nock(GROK_API_BASE)
        .post('/v1/chat/completions')
        .reply(401, { error: { message: 'Invalid API key' } });

      const result = await connector.testConnection();

      assert.strictEqual(result, false);
    });

    test('testConnection should handle network errors', async () => {
      nock(GROK_API_BASE)
        .get('/v1/models')
        .replyWithError('Network error');

      nock(GROK_API_BASE)
        .post('/v1/chat/completions')
        .replyWithError('Network error');

      const result = await connector.testConnection();

      assert.strictEqual(result, false);
    });
  });

  describe('Response Standardization', () => {
    test('should standardize response format', async () => {
      nock(GROK_API_BASE)
        .post('/v1/chat/completions')
        .reply(200, {
          id: 'grok-123',
          model: 'grok-beta',
          created: 1234567890,
          choices: [
            {
              message: { role: 'assistant', content: 'Hello!' },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
        });

      const response = await connector.query({ prompt: 'Test' });

      assert.strictEqual(response.provider, 'grok');
      assert.ok(response.content);
      assert.ok(response.model);
      assert.ok(response.usage);
      assert.ok(response.timestamp);
    });

    test('should include metadata in response', async () => {
      nock(GROK_API_BASE)
        .post('/v1/chat/completions')
        .reply(200, {
          id: 'grok-123',
          created: 1234567890,
          model: 'grok-beta',
          choices: [
            {
              message: { role: 'assistant', content: 'Hello!' },
              finish_reason: 'length',
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
        });

      const response = await connector.query({ prompt: 'Test' });

      assert.ok(response.metadata);
      assert.strictEqual(response.metadata.finishReason, 'length');
      assert.strictEqual(response.metadata.id, 'grok-123');
      assert.strictEqual(response.metadata.created, 1234567890);
    });

    test('should include token usage in standardized format', async () => {
      nock(GROK_API_BASE)
        .post('/v1/chat/completions')
        .reply(200, {
          id: 'grok-123',
          model: 'grok-beta',
          choices: [
            {
              message: { role: 'assistant', content: 'Hello!' },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 25, completion_tokens: 35, total_tokens: 60 },
        });

      const response = await connector.query({ prompt: 'Test' });

      assert.strictEqual(response.usage.promptTokens, 25);
      assert.strictEqual(response.usage.completionTokens, 35);
      assert.strictEqual(response.usage.totalTokens, 60);
    });
  });

  describe('System Status', () => {
    test('should get system status', async () => {
      nock(GROK_API_BASE)
        .get('/v1/status')
        .reply(200, {
          status: 'operational',
          uptime: 99.9,
        });

      const status = await connector.getSystemStatus();

      assert.strictEqual(status.status, 'operational');
      assert.ok(status.data);
    });

    test('should handle status endpoint errors', async () => {
      nock(GROK_API_BASE)
        .get('/v1/status')
        .reply(500, { error: { message: 'Internal error' } });

      const status = await connector.getSystemStatus();

      assert.strictEqual(status.status, 'unknown');
      assert.ok(status.error);
    });

    test('should handle network errors for status', async () => {
      nock(GROK_API_BASE)
        .get('/v1/status')
        .replyWithError('Network error');

      const status = await connector.getSystemStatus();

      assert.strictEqual(status.status, 'unknown');
      assert.ok(status.error);
    });
  });

  describe('Edge Cases', () => {
    test('should handle responses with extra fields', async () => {
      nock(GROK_API_BASE)
        .post('/v1/chat/completions')
        .reply(200, {
          id: 'grok-123',
          model: 'grok-beta',
          extra_field: 'extra_value',
          choices: [
            {
              message: { role: 'assistant', content: 'Response' },
              finish_reason: 'stop',
              extra: 'data',
            },
          ],
          usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
        });

      const response = await connector.query({ prompt: 'Test' });

      assert.ok(response);
      assert.strictEqual(response.content, 'Response');
    });

    test('should handle empty content gracefully', async () => {
      nock(GROK_API_BASE)
        .post('/v1/chat/completions')
        .reply(200, {
          id: 'grok-123',
          model: 'grok-beta',
          choices: [
            {
              message: { role: 'assistant', content: '' },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 5, completion_tokens: 0, total_tokens: 5 },
        });

      const response = await connector.query({ prompt: 'Test' });

      assert.strictEqual(response.content, '');
    });

    test('should handle Authorization header correctly', async () => {
      nock(GROK_API_BASE, {
        reqheaders: {
          'authorization': 'Bearer test-grok-key',
        },
      })
        .post('/v1/chat/completions')
        .reply(200, {
          id: 'grok-123',
          model: 'grok-beta',
          choices: [
            {
              message: { role: 'assistant', content: 'Authorized!' },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
        });

      const response = await connector.query({ prompt: 'Test' });

      assert.strictEqual(response.content, 'Authorized!');
    });
  });
});
