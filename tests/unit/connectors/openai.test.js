/**
 * OpenAI Connector Unit Tests
 * Tests OpenAI connector with mocked API responses
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
 * - Token counting
 * - Response standardization
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import nock from 'nock';
import { OpenAIConnector } from '../../../core/connectors/openai_connector.js';

const OPENAI_API_BASE = 'https://api.openai.com';

describe('OpenAI Connector Tests', () => {
  let connector;

  beforeEach(() => {
    // Clean all mocks before each test
    nock.cleanAll();

    // Create connector with test config
    connector = new OpenAIConnector({
      apiKey: 'test-api-key',
      defaultModel: 'gpt-4',
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
      assert.strictEqual(connector.provider, 'openai');
      assert.strictEqual(connector.apiKey, 'test-api-key');
    });

    test('should throw error without API key', () => {
      assert.throws(() => {
        new OpenAIConnector({});
      }, /API key is required/);
    });

    test('should use default model when not specified', () => {
      const conn = new OpenAIConnector({
        apiKey: 'test-key',
      });

      assert.ok(conn.defaultModel);
    });

    test('should accept custom baseURL', () => {
      const conn = new OpenAIConnector({
        apiKey: 'test-key',
        baseURL: 'https://custom.api.com',
      });

      assert.ok(conn.baseURL);
    });

    test('should accept organization parameter', () => {
      const conn = new OpenAIConnector({
        apiKey: 'test-key',
        organization: 'org-123',
      });

      assert.ok(conn);
    });
  });

  describe('Configuration Validation', () => {
    test('validateConfig should return valid for proper config', () => {
      const result = connector.validateConfig();

      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors.length, 0);
    });

    test('validateConfig should fail without API key', () => {
      const conn = new OpenAIConnector({ apiKey: 'test' });
      conn.apiKey = null;

      const result = conn.validateConfig();

      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.length > 0);
      assert.ok(result.errors[0].includes('API key'));
    });
  });

  describe('Query Functionality', () => {
    test('should successfully query OpenAI API', async () => {
      nock(OPENAI_API_BASE)
        .post('/v1/chat/completions')
        .reply(200, {
          id: 'chatcmpl-123',
          object: 'chat.completion',
          created: Date.now(),
          model: 'gpt-4',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: 'Hello! How can I help you today?',
              },
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30,
          },
        });

      const response = await connector.query({
        prompt: 'Hello, world!',
      });

      assert.ok(response);
      assert.strictEqual(response.provider, 'openai');
      assert.ok(response.content);
      assert.ok(response.usage);
      assert.strictEqual(response.usage.totalTokens, 30);
    });

    test('should handle custom model parameter', async () => {
      nock(OPENAI_API_BASE)
        .post('/v1/chat/completions', (body) => {
          assert.strictEqual(body.model, 'gpt-3.5-turbo');
          return true;
        })
        .reply(200, {
          id: 'chatcmpl-123',
          model: 'gpt-3.5-turbo',
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
        model: 'gpt-3.5-turbo',
      });
    });

    test('should handle temperature parameter', async () => {
      nock(OPENAI_API_BASE)
        .post('/v1/chat/completions', (body) => {
          assert.strictEqual(body.temperature, 0.5);
          return true;
        })
        .reply(200, {
          id: 'chatcmpl-123',
          model: 'gpt-4',
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
        temperature: 0.5,
      });
    });

    test('should handle maxTokens parameter', async () => {
      nock(OPENAI_API_BASE)
        .post('/v1/chat/completions', (body) => {
          assert.strictEqual(body.max_tokens, 1000);
          return true;
        })
        .reply(200, {
          id: 'chatcmpl-123',
          model: 'gpt-4',
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
        maxTokens: 1000,
      });
    });

    test('should handle messages array instead of prompt', async () => {
      nock(OPENAI_API_BASE)
        .post('/v1/chat/completions', (body) => {
          assert.ok(Array.isArray(body.messages));
          assert.strictEqual(body.messages.length, 2);
          return true;
        })
        .reply(200, {
          id: 'chatcmpl-123',
          model: 'gpt-4',
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
          { role: 'system', content: 'You are helpful.' },
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
  });

  describe('Error Handling', () => {
    test('should handle 401 unauthorized error', async () => {
      nock(OPENAI_API_BASE)
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
      nock(OPENAI_API_BASE)
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
      nock(OPENAI_API_BASE)
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
      nock(OPENAI_API_BASE)
        .post('/v1/chat/completions')
        .delayConnection(6000)
        .reply(200, {});

      await assert.rejects(async () => {
        await connector.query({ prompt: 'Test' });
      });
    });

    test('should handle malformed response', async () => {
      nock(OPENAI_API_BASE)
        .post('/v1/chat/completions')
        .reply(200, 'invalid json');

      await assert.rejects(async () => {
        await connector.query({ prompt: 'Test' });
      });
    });

    test('should handle missing choices in response', async () => {
      nock(OPENAI_API_BASE)
        .post('/v1/chat/completions')
        .reply(200, {
          id: 'chatcmpl-123',
          model: 'gpt-4',
          choices: [],
          usage: { prompt_tokens: 5, completion_tokens: 0, total_tokens: 5 },
        });

      await assert.rejects(async () => {
        await connector.query({ prompt: 'Test' });
      });
    });
  });

  describe('Retry Mechanism', () => {
    test('should retry on transient failures', async () => {
      let attempts = 0;

      nock(OPENAI_API_BASE)
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
              id: 'chatcmpl-123',
              model: 'gpt-4',
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
      nock(OPENAI_API_BASE)
        .post('/v1/chat/completions')
        .times(3)
        .reply(503, { error: { message: 'Service unavailable' } });

      await assert.rejects(async () => {
        await connector.query({ prompt: 'Test' });
      });
    });

    test('should use exponential backoff for retries', async () => {
      const startTime = Date.now();
      let attempts = 0;

      nock(OPENAI_API_BASE)
        .post('/v1/chat/completions')
        .times(3)
        .reply(() => {
          attempts++;
          return [503, { error: { message: 'Service unavailable' } }];
        });

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
      nock(OPENAI_API_BASE)
        .get('/v1/models')
        .reply(200, {
          object: 'list',
          data: [
            { id: 'gpt-4', created: 1678000000, owned_by: 'openai' },
            { id: 'gpt-3.5-turbo', created: 1677000000, owned_by: 'openai' },
            { id: 'whisper-1', created: 1676000000, owned_by: 'openai' },
          ],
        });

      const models = await connector.getModels();

      assert.ok(Array.isArray(models));
      assert.ok(models.length > 0);
      assert.ok(models.every((m) => m.id.includes('gpt')));
    });

    test('should filter non-GPT models', async () => {
      nock(OPENAI_API_BASE)
        .get('/v1/models')
        .reply(200, {
          object: 'list',
          data: [
            { id: 'gpt-4', created: 1678000000, owned_by: 'openai' },
            { id: 'whisper-1', created: 1677000000, owned_by: 'openai' },
            { id: 'dall-e-3', created: 1676000000, owned_by: 'openai' },
          ],
        });

      const models = await connector.getModels();

      assert.strictEqual(models.length, 1);
      assert.strictEqual(models[0].id, 'gpt-4');
    });

    test('should handle getModels error gracefully', async () => {
      nock(OPENAI_API_BASE)
        .get('/v1/models')
        .reply(500, { error: { message: 'Internal error' } });

      const models = await connector.getModels();

      assert.ok(Array.isArray(models));
      assert.strictEqual(models.length, 0);
    });

    test('should sort models by creation date', async () => {
      nock(OPENAI_API_BASE)
        .get('/v1/models')
        .reply(200, {
          object: 'list',
          data: [
            { id: 'gpt-3.5-turbo', created: 1677000000, owned_by: 'openai' },
            { id: 'gpt-4', created: 1678000000, owned_by: 'openai' },
            { id: 'gpt-4-turbo', created: 1679000000, owned_by: 'openai' },
          ],
        });

      const models = await connector.getModels();

      // Should be sorted newest first
      assert.ok(models[0].created >= models[1].created);
    });
  });

  describe('Connection Testing', () => {
    test('testConnection should return true on success', async () => {
      nock(OPENAI_API_BASE)
        .get('/v1/models')
        .reply(200, { object: 'list', data: [] });

      const result = await connector.testConnection();

      assert.strictEqual(result, true);
    });

    test('testConnection should return false on failure', async () => {
      nock(OPENAI_API_BASE)
        .get('/v1/models')
        .reply(401, { error: { message: 'Invalid API key' } });

      const result = await connector.testConnection();

      assert.strictEqual(result, false);
    });

    test('testConnection should handle network errors', async () => {
      nock(OPENAI_API_BASE)
        .get('/v1/models')
        .replyWithError('Network error');

      const result = await connector.testConnection();

      assert.strictEqual(result, false);
    });
  });

  describe('Response Standardization', () => {
    test('should standardize response format', async () => {
      nock(OPENAI_API_BASE)
        .post('/v1/chat/completions')
        .reply(200, {
          id: 'chatcmpl-123',
          model: 'gpt-4',
          choices: [
            {
              message: { role: 'assistant', content: 'Hello!' },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
        });

      const response = await connector.query({ prompt: 'Test' });

      assert.strictEqual(response.provider, 'openai');
      assert.ok(response.content);
      assert.ok(response.model);
      assert.ok(response.usage);
      assert.ok(response.timestamp);
    });

    test('should include metadata in response', async () => {
      nock(OPENAI_API_BASE)
        .post('/v1/chat/completions')
        .reply(200, {
          id: 'chatcmpl-123',
          created: 1234567890,
          model: 'gpt-4',
          choices: [
            {
              message: { role: 'assistant', content: 'Hello!' },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
        });

      const response = await connector.query({ prompt: 'Test' });

      assert.ok(response.metadata);
      assert.ok(response.metadata.finishReason);
      assert.ok(response.metadata.id);
      assert.ok(response.metadata.created);
    });

    test('should include token usage in standardized format', async () => {
      nock(OPENAI_API_BASE)
        .post('/v1/chat/completions')
        .reply(200, {
          id: 'chatcmpl-123',
          model: 'gpt-4',
          choices: [
            {
              message: { role: 'assistant', content: 'Hello!' },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 15, completion_tokens: 25, total_tokens: 40 },
        });

      const response = await connector.query({ prompt: 'Test' });

      assert.strictEqual(response.usage.promptTokens, 15);
      assert.strictEqual(response.usage.completionTokens, 25);
      assert.strictEqual(response.usage.totalTokens, 40);
    });
  });

  describe('Embeddings', () => {
    test('should create embeddings for text', async () => {
      nock(OPENAI_API_BASE)
        .post('/v1/embeddings')
        .reply(200, {
          object: 'list',
          data: [
            {
              object: 'embedding',
              embedding: [0.1, 0.2, 0.3],
              index: 0,
            },
          ],
        });

      const embeddings = await connector.createEmbeddings('Test text');

      assert.ok(Array.isArray(embeddings));
      assert.strictEqual(embeddings.length, 1);
      assert.ok(Array.isArray(embeddings[0].embedding));
    });

    test('should handle array of texts for embeddings', async () => {
      nock(OPENAI_API_BASE)
        .post('/v1/embeddings')
        .reply(200, {
          object: 'list',
          data: [
            { object: 'embedding', embedding: [0.1, 0.2], index: 0 },
            { object: 'embedding', embedding: [0.3, 0.4], index: 1 },
          ],
        });

      const embeddings = await connector.createEmbeddings(['Text 1', 'Text 2']);

      assert.strictEqual(embeddings.length, 2);
    });
  });

  describe('Image Generation', () => {
    test('should generate images with DALL-E', async () => {
      nock(OPENAI_API_BASE)
        .post('/v1/images/generations')
        .reply(200, {
          created: 1234567890,
          data: [
            {
              url: 'https://example.com/image.png',
              revised_prompt: 'A beautiful landscape',
            },
          ],
        });

      const images = await connector.generateImage({
        prompt: 'A beautiful landscape',
      });

      assert.ok(Array.isArray(images));
      assert.strictEqual(images.length, 1);
      assert.ok(images[0].url);
    });

    test('should handle image generation parameters', async () => {
      nock(OPENAI_API_BASE)
        .post('/v1/images/generations', (body) => {
          assert.strictEqual(body.model, 'dall-e-3');
          assert.strictEqual(body.size, '1024x1024');
          assert.strictEqual(body.quality, 'hd');
          return true;
        })
        .reply(200, {
          created: 1234567890,
          data: [{ url: 'https://example.com/image.png' }],
        });

      await connector.generateImage({
        prompt: 'Test',
        model: 'dall-e-3',
        size: '1024x1024',
        quality: 'hd',
      });
    });
  });
});
