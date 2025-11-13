/**
 * Comprehensive OpenAI Connector Tests - Iteration 5
 * Focus on increasing code coverage from 31.22% to 60%+
 *
 * Test Coverage Areas:
 * - Edge cases and boundary conditions
 * - Error handling paths
 * - Parameter validation
 * - Stream query functionality
 * - Response parsing edge cases
 * - Retry logic verification
 * - Configuration variations
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import nock from 'nock';
import { OpenAIConnector } from '../../../core/connectors/openai_connector.js';

const OPENAI_API_BASE = 'https://api.openai.com';

describe('OpenAI Connector - Comprehensive Coverage Tests', () => {
  let connector;

  beforeEach(() => {
    nock.cleanAll();
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

  describe('Initialization Edge Cases', () => {
    test('should initialize with environment variable API key', () => {
      process.env.OPENAI_API_KEY = 'env-test-key';
      const conn = new OpenAIConnector({});
      assert.strictEqual(conn.apiKey, 'env-test-key');
      delete process.env.OPENAI_API_KEY;
    });

    test('should prioritize config API key over environment', () => {
      process.env.OPENAI_API_KEY = 'env-key';
      const conn = new OpenAIConnector({ apiKey: 'config-key' });
      assert.strictEqual(conn.apiKey, 'config-key');
      delete process.env.OPENAI_API_KEY;
    });

    test('should use environment organization when provided', () => {
      process.env.OPENAI_ORGANIZATION = 'env-org';
      const conn = new OpenAIConnector({ apiKey: 'test' });
      assert.strictEqual(conn.organization, 'env-org');
      delete process.env.OPENAI_ORGANIZATION;
    });

    test('should use environment baseURL when provided', () => {
      process.env.OPENAI_BASE_URL = 'https://custom.api.com';
      const conn = new OpenAIConnector({ apiKey: 'test' });
      assert.strictEqual(conn.baseURL, 'https://custom.api.com');
      delete process.env.OPENAI_BASE_URL;
    });

    test('should throw error when no API key in config or environment', () => {
      delete process.env.OPENAI_API_KEY;
      assert.throws(() => {
        new OpenAIConnector({});
      }, /API key is required/);
    });

    test('should set correct provider name', () => {
      assert.strictEqual(connector.provider, 'openai');
    });

    test('should use default model when not specified', () => {
      assert.strictEqual(connector.defaultModel, 'gpt-4');
    });

    test('should accept custom default model', () => {
      const conn = new OpenAIConnector({
        apiKey: 'test',
        defaultModel: 'gpt-3.5-turbo',
      });
      assert.strictEqual(conn.defaultModel, 'gpt-3.5-turbo');
    });
  });

  describe('Query Method - Parameter Handling', () => {
    test('should handle empty prompt string', async () => {
      nock(OPENAI_API_BASE)
        .post('/v1/chat/completions', (body) => {
          assert.strictEqual(body.messages[0].content, '');
          return true;
        })
        .reply(200, {
          id: 'test',
          model: 'gpt-4',
          choices: [{ message: { role: 'assistant', content: 'Response' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 0, completion_tokens: 5, total_tokens: 5 },
        });

      await connector.query({ prompt: '' });
    });

    test('should handle very long prompt', async () => {
      const longPrompt = 'a'.repeat(10000);

      nock(OPENAI_API_BASE)
        .post('/v1/chat/completions', (body) => {
          assert.strictEqual(body.messages[0].content.length, 10000);
          return true;
        })
        .reply(200, {
          id: 'test',
          model: 'gpt-4',
          choices: [{ message: { role: 'assistant', content: 'Response' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 1000, completion_tokens: 5, total_tokens: 1005 },
        });

      await connector.query({ prompt: longPrompt });
    });

    test('should handle special characters in prompt', async () => {
      const specialPrompt = 'Test\n\t"quotes"\r\n\'single\'\\backslash';

      nock(OPENAI_API_BASE)
        .post('/v1/chat/completions')
        .reply(200, {
          id: 'test',
          model: 'gpt-4',
          choices: [{ message: { role: 'assistant', content: 'Response' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        });

      const response = await connector.query({ prompt: specialPrompt });
      assert.ok(response.content);
    });

    test('should handle unicode and emoji in prompt', async () => {
      const unicodePrompt = 'Hello 世界 🌍 🚀';

      nock(OPENAI_API_BASE)
        .post('/v1/chat/completions')
        .reply(200, {
          id: 'test',
          model: 'gpt-4',
          choices: [{ message: { role: 'assistant', content: 'Response' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        });

      const response = await connector.query({ prompt: unicodePrompt });
      assert.ok(response.content);
    });

    test('should use provided model parameter', async () => {
      nock(OPENAI_API_BASE)
        .post('/v1/chat/completions', (body) => {
          assert.strictEqual(body.model, 'gpt-3.5-turbo');
          return true;
        })
        .reply(200, {
          id: 'test',
          model: 'gpt-3.5-turbo',
          choices: [{ message: { role: 'assistant', content: 'Response' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        });

      await connector.query({ prompt: 'Test', model: 'gpt-3.5-turbo' });
    });

    test('should use default model when not specified', async () => {
      nock(OPENAI_API_BASE)
        .post('/v1/chat/completions', (body) => {
          assert.strictEqual(body.model, 'gpt-4');
          return true;
        })
        .reply(200, {
          id: 'test',
          model: 'gpt-4',
          choices: [{ message: { role: 'assistant', content: 'Response' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        });

      await connector.query({ prompt: 'Test' });
    });

    test('should handle temperature parameter boundaries', async () => {
      nock(OPENAI_API_BASE)
        .post('/v1/chat/completions', (body) => {
          assert.strictEqual(body.temperature, 0);
          return true;
        })
        .reply(200, {
          id: 'test',
          model: 'gpt-4',
          choices: [{ message: { role: 'assistant', content: 'Response' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        });

      await connector.query({ prompt: 'Test', temperature: 0 });
    });

    test('should handle maxTokens parameter', async () => {
      nock(OPENAI_API_BASE)
        .post('/v1/chat/completions', (body) => {
          assert.strictEqual(body.max_tokens, 500);
          return true;
        })
        .reply(200, {
          id: 'test',
          model: 'gpt-4',
          choices: [{ message: { role: 'assistant', content: 'Response' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        });

      await connector.query({ prompt: 'Test', maxTokens: 500 });
    });

    test('should handle additional OpenAI parameters', async () => {
      nock(OPENAI_API_BASE)
        .post('/v1/chat/completions', (body) => {
          assert.strictEqual(body.top_p, 0.9);
          assert.strictEqual(body.frequency_penalty, 0.5);
          assert.strictEqual(body.presence_penalty, 0.3);
          return true;
        })
        .reply(200, {
          id: 'test',
          model: 'gpt-4',
          choices: [{ message: { role: 'assistant', content: 'Response' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        });

      await connector.query({
        prompt: 'Test',
        top_p: 0.9,
        frequency_penalty: 0.5,
        presence_penalty: 0.3,
      });
    });
  });

  describe('Response Handling Edge Cases', () => {
    test('should handle response with minimal metadata', async () => {
      nock(OPENAI_API_BASE)
        .post('/v1/chat/completions')
        .reply(200, {
          id: 'test',
          model: 'gpt-4',
          choices: [{ message: { role: 'assistant', content: 'Response' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        });

      const response = await connector.query({ prompt: 'Test' });
      assert.strictEqual(response.content, 'Response');
      assert.strictEqual(response.provider, 'openai');
      assert.ok(response.timestamp);
    });

    test('should handle response with all metadata fields', async () => {
      nock(OPENAI_API_BASE)
        .post('/v1/chat/completions')
        .reply(200, {
          id: 'chatcmpl-123',
          created: 1234567890,
          model: 'gpt-4',
          object: 'chat.completion',
          choices: [{
            index: 0,
            message: { role: 'assistant', content: 'Response' },
            finish_reason: 'stop',
            logprobs: null
          }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          system_fingerprint: 'fp_123',
        });

      const response = await connector.query({ prompt: 'Test' });
      assert.strictEqual(response.metadata.id, 'chatcmpl-123');
      assert.strictEqual(response.metadata.created, 1234567890);
      assert.strictEqual(response.metadata.finishReason, 'stop');
    });

    test('should handle response with length finish reason', async () => {
      nock(OPENAI_API_BASE)
        .post('/v1/chat/completions')
        .reply(200, {
          id: 'test',
          model: 'gpt-4',
          choices: [{ message: { role: 'assistant', content: 'Truncated' }, finish_reason: 'length' }],
          usage: { prompt_tokens: 10, completion_tokens: 2000, total_tokens: 2010 },
        });

      const response = await connector.query({ prompt: 'Test' });
      assert.strictEqual(response.metadata.finishReason, 'length');
    });

    test('should handle response with content_filter finish reason', async () => {
      nock(OPENAI_API_BASE)
        .post('/v1/chat/completions')
        .reply(200, {
          id: 'test',
          model: 'gpt-4',
          choices: [{ message: { role: 'assistant', content: 'Filtered' }, finish_reason: 'content_filter' }],
          usage: { prompt_tokens: 10, completion_tokens: 1, total_tokens: 11 },
        });

      const response = await connector.query({ prompt: 'Test' });
      assert.strictEqual(response.metadata.finishReason, 'content_filter');
    });

    test('should handle empty content in response', async () => {
      nock(OPENAI_API_BASE)
        .post('/v1/chat/completions')
        .reply(200, {
          id: 'test',
          model: 'gpt-4',
          choices: [{ message: { role: 'assistant', content: '' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 0, total_tokens: 10 },
        });

      const response = await connector.query({ prompt: 'Test' });
      assert.strictEqual(response.content, '');
      assert.strictEqual(response.usage.completionTokens, 0);
    });

    test('should handle very long response content', async () => {
      const longContent = 'b'.repeat(50000);

      nock(OPENAI_API_BASE)
        .post('/v1/chat/completions')
        .reply(200, {
          id: 'test',
          model: 'gpt-4',
          choices: [{ message: { role: 'assistant', content: longContent }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 10000, total_tokens: 10010 },
        });

      const response = await connector.query({ prompt: 'Test' });
      assert.strictEqual(response.content.length, 50000);
    });
  });

  describe('Error Handling - Comprehensive', () => {
    test('should handle 400 bad request error', async () => {
      nock(OPENAI_API_BASE)
        .post('/v1/chat/completions')
        .reply(400, {
          error: {
            message: 'Invalid request parameters',
            type: 'invalid_request_error',
            code: 'invalid_parameter',
          },
        });

      await assert.rejects(
        async () => await connector.query({ prompt: 'Test' }),
        (error) => {
          assert.ok(error.message);
          return true;
        }
      );
    });

    test('should handle 404 not found error', async () => {
      nock(OPENAI_API_BASE)
        .post('/v1/chat/completions')
        .reply(404, {
          error: {
            message: 'Model not found',
            type: 'invalid_request_error',
          },
        });

      await assert.rejects(
        async () => await connector.query({ prompt: 'Test', model: 'nonexistent' }),
        (error) => {
          assert.ok(error.message);
          return true;
        }
      );
    });

    test('should handle 500 internal server error', async () => {
      nock(OPENAI_API_BASE)
        .post('/v1/chat/completions')
        .reply(500, {
          error: {
            message: 'Internal server error',
            type: 'server_error',
          },
        });

      await assert.rejects(
        async () => await connector.query({ prompt: 'Test' }),
        (error) => {
          assert.ok(error.message);
          return true;
        }
      );
    });

    test('should handle 502 bad gateway error', async () => {
      nock(OPENAI_API_BASE)
        .post('/v1/chat/completions')
        .reply(502, 'Bad Gateway');

      await assert.rejects(
        async () => await connector.query({ prompt: 'Test' }),
        (error) => {
          assert.ok(error.message);
          return true;
        }
      );
    });

    test('should handle network connection error', async () => {
      nock(OPENAI_API_BASE)
        .post('/v1/chat/completions')
        .replyWithError({ code: 'ECONNREFUSED', message: 'Connection refused' });

      await assert.rejects(
        async () => await connector.query({ prompt: 'Test' }),
        (error) => {
          assert.ok(error.message);
          return true;
        }
      );
    });

    test('should handle DNS resolution error', async () => {
      nock(OPENAI_API_BASE)
        .post('/v1/chat/completions')
        .replyWithError({ code: 'ENOTFOUND', message: 'DNS lookup failed' });

      await assert.rejects(
        async () => await connector.query({ prompt: 'Test' }),
        (error) => {
          assert.ok(error.message);
          return true;
        }
      );
    });

    test('should reject when stream parameter is true', async () => {
      await assert.rejects(
        async () => await connector.query({ prompt: 'Test', stream: true }),
        /Use streamQuery/
      );
    });
  });

  describe('Stream Query Functionality', () => {
    test('should stream query responses', async () => {
      const chunks = [
        { id: 'test', model: 'gpt-4', choices: [{ delta: { content: 'Hello' }, finish_reason: null }] },
        { id: 'test', model: 'gpt-4', choices: [{ delta: { content: ' world' }, finish_reason: null }] },
        { id: 'test', model: 'gpt-4', choices: [{ delta: {}, finish_reason: 'stop' }] },
      ];

      nock(OPENAI_API_BASE)
        .post('/v1/chat/completions')
        .reply(200, async function* () {
          for (const chunk of chunks) {
            yield `data: ${JSON.stringify(chunk)}\n\n`;
          }
          yield 'data: [DONE]\n\n';
        });

      const results = [];
      for await (const chunk of connector.streamQuery({ prompt: 'Test' })) {
        results.push(chunk);
      }

      assert.ok(results.length > 0);
    });

    test('should handle stream with messages array', async () => {
      const chunks = [
        { id: 'test', model: 'gpt-4', choices: [{ delta: { content: 'Response' }, finish_reason: null }] },
      ];

      nock(OPENAI_API_BASE)
        .post('/v1/chat/completions', (body) => {
          assert.ok(Array.isArray(body.messages));
          assert.strictEqual(body.stream, true);
          return true;
        })
        .reply(200, async function* () {
          for (const chunk of chunks) {
            yield `data: ${JSON.stringify(chunk)}\n\n`;
          }
          yield 'data: [DONE]\n\n';
        });

      const results = [];
      for await (const chunk of connector.streamQuery({
        messages: [{ role: 'user', content: 'Hello' }]
      })) {
        results.push(chunk);
      }

      assert.ok(results.length > 0);
    });

    test('should filter out chunks without content', async () => {
      const chunks = [
        { id: 'test', model: 'gpt-4', choices: [{ delta: {}, finish_reason: null }] },
        { id: 'test', model: 'gpt-4', choices: [{ delta: { role: 'assistant' }, finish_reason: null }] },
        { id: 'test', model: 'gpt-4', choices: [{ delta: { content: 'Actual content' }, finish_reason: null }] },
      ];

      nock(OPENAI_API_BASE)
        .post('/v1/chat/completions')
        .reply(200, async function* () {
          for (const chunk of chunks) {
            yield `data: ${JSON.stringify(chunk)}\n\n`;
          }
          yield 'data: [DONE]\n\n';
        });

      const results = [];
      for await (const chunk of connector.streamQuery({ prompt: 'Test' })) {
        results.push(chunk);
      }

      // Should only get the chunk with actual content
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].content, 'Actual content');
    });

    test('should include finish reason in stream chunks', async () => {
      const chunks = [
        { id: 'test', model: 'gpt-4', choices: [{ delta: { content: 'Done' }, finish_reason: 'stop' }] },
      ];

      nock(OPENAI_API_BASE)
        .post('/v1/chat/completions')
        .reply(200, async function* () {
          for (const chunk of chunks) {
            yield `data: ${JSON.stringify(chunk)}\n\n`;
          }
          yield 'data: [DONE]\n\n';
        });

      const results = [];
      for await (const chunk of connector.streamQuery({ prompt: 'Test' })) {
        results.push(chunk);
      }

      assert.strictEqual(results[0].finishReason, 'stop');
    });
  });

  describe('Configuration Validation', () => {
    test('validateConfig should pass with valid API key', () => {
      const result = connector.validateConfig();
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors.length, 0);
    });

    test('validateConfig should fail with null API key', () => {
      connector.apiKey = null;
      const result = connector.validateConfig();
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.length > 0);
      assert.ok(result.errors[0].includes('API key'));
    });

    test('validateConfig should fail with undefined API key', () => {
      connector.apiKey = undefined;
      const result = connector.validateConfig();
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.length > 0);
    });

    test('validateConfig should fail with empty string API key', () => {
      connector.apiKey = '';
      const result = connector.validateConfig();
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.length > 0);
    });
  });

  describe('Connection Testing', () => {
    test('testConnection should return true on successful model list', async () => {
      nock(OPENAI_API_BASE)
        .get('/v1/models')
        .reply(200, {
          object: 'list',
          data: [
            { id: 'gpt-4', created: 1678000000, owned_by: 'openai' },
          ],
        });

      const result = await connector.testConnection();
      assert.strictEqual(result, true);
    });

    test('testConnection should return false on 401 error', async () => {
      nock(OPENAI_API_BASE)
        .get('/v1/models')
        .reply(401, { error: { message: 'Invalid API key' } });

      const result = await connector.testConnection();
      assert.strictEqual(result, false);
    });

    test('testConnection should return false on network error', async () => {
      nock(OPENAI_API_BASE)
        .get('/v1/models')
        .replyWithError('Network error');

      const result = await connector.testConnection();
      assert.strictEqual(result, false);
    });

    test('testConnection should return false on timeout', async () => {
      nock(OPENAI_API_BASE)
        .get('/v1/models')
        .delayConnection(10000)
        .reply(200, { object: 'list', data: [] });

      const result = await connector.testConnection();
      assert.strictEqual(result, false);
    });
  });

  describe('Model Management', () => {
    test('getModels should return list of GPT models', async () => {
      nock(OPENAI_API_BASE)
        .get('/v1/models')
        .reply(200, {
          object: 'list',
          data: [
            { id: 'gpt-4', created: 1678000000, owned_by: 'openai' },
            { id: 'gpt-3.5-turbo', created: 1677000000, owned_by: 'openai' },
          ],
        });

      const models = await connector.getModels();
      assert.ok(Array.isArray(models));
      assert.strictEqual(models.length, 2);
      assert.strictEqual(models[0].id, 'gpt-4');
    });

    test('getModels should filter out non-GPT models', async () => {
      nock(OPENAI_API_BASE)
        .get('/v1/models')
        .reply(200, {
          object: 'list',
          data: [
            { id: 'gpt-4', created: 1678000000, owned_by: 'openai' },
            { id: 'whisper-1', created: 1677000000, owned_by: 'openai' },
            { id: 'tts-1', created: 1676000000, owned_by: 'openai' },
          ],
        });

      const models = await connector.getModels();
      assert.strictEqual(models.length, 1);
      assert.strictEqual(models[0].id, 'gpt-4');
    });

    test('getModels should return empty array on error', async () => {
      nock(OPENAI_API_BASE)
        .get('/v1/models')
        .reply(500, { error: { message: 'Server error' } });

      const models = await connector.getModels();
      assert.ok(Array.isArray(models));
      assert.strictEqual(models.length, 0);
    });

    test('getModels should sort by creation date descending', async () => {
      nock(OPENAI_API_BASE)
        .get('/v1/models')
        .reply(200, {
          object: 'list',
          data: [
            { id: 'gpt-3.5-turbo', created: 1677000000, owned_by: 'openai' },
            { id: 'gpt-4-turbo', created: 1679000000, owned_by: 'openai' },
            { id: 'gpt-4', created: 1678000000, owned_by: 'openai' },
          ],
        });

      const models = await connector.getModels();
      assert.strictEqual(models[0].id, 'gpt-4-turbo');
      assert.strictEqual(models[1].id, 'gpt-4');
      assert.strictEqual(models[2].id, 'gpt-3.5-turbo');
    });
  });

  describe('Embeddings Functionality', () => {
    test('createEmbeddings should handle single string input', async () => {
      nock(OPENAI_API_BASE)
        .post('/v1/embeddings')
        .reply(200, {
          object: 'list',
          data: [
            { object: 'embedding', embedding: [0.1, 0.2, 0.3], index: 0 },
          ],
        });

      const result = await connector.createEmbeddings('Test text');
      assert.ok(Array.isArray(result));
      assert.strictEqual(result.length, 1);
      assert.ok(Array.isArray(result[0].embedding));
      assert.strictEqual(result[0].index, 0);
    });

    test('createEmbeddings should handle array input', async () => {
      nock(OPENAI_API_BASE)
        .post('/v1/embeddings')
        .reply(200, {
          object: 'list',
          data: [
            { object: 'embedding', embedding: [0.1, 0.2], index: 0 },
            { object: 'embedding', embedding: [0.3, 0.4], index: 1 },
          ],
        });

      const result = await connector.createEmbeddings(['Text 1', 'Text 2']);
      assert.strictEqual(result.length, 2);
      assert.strictEqual(result[0].index, 0);
      assert.strictEqual(result[1].index, 1);
    });

    test('createEmbeddings should use custom model', async () => {
      nock(OPENAI_API_BASE)
        .post('/v1/embeddings', (body) => {
          assert.strictEqual(body.model, 'text-embedding-ada-002');
          return true;
        })
        .reply(200, {
          object: 'list',
          data: [{ object: 'embedding', embedding: [0.1], index: 0 }],
        });

      await connector.createEmbeddings('Test', 'text-embedding-ada-002');
    });

    test('createEmbeddings should retry on failure', async () => {
      let attempts = 0;

      nock(OPENAI_API_BASE)
        .post('/v1/embeddings')
        .times(3)
        .reply(() => {
          attempts++;
          if (attempts < 3) {
            return [503, { error: { message: 'Service unavailable' } }];
          }
          return [200, {
            object: 'list',
            data: [{ object: 'embedding', embedding: [0.1], index: 0 }],
          }];
        });

      const result = await connector.createEmbeddings('Test');
      assert.strictEqual(attempts, 3);
      assert.ok(Array.isArray(result));
    });
  });

  describe('Image Generation Functionality', () => {
    test('generateImage should create image with default parameters', async () => {
      nock(OPENAI_API_BASE)
        .post('/v1/images/generations')
        .reply(200, {
          created: 1234567890,
          data: [
            { url: 'https://example.com/image.png', revised_prompt: 'A beautiful scene' },
          ],
        });

      const result = await connector.generateImage({ prompt: 'A beautiful scene' });
      assert.ok(Array.isArray(result));
      assert.strictEqual(result.length, 1);
      assert.ok(result[0].url);
      assert.ok(result[0].revisedPrompt);
    });

    test('generateImage should use custom parameters', async () => {
      nock(OPENAI_API_BASE)
        .post('/v1/images/generations', (body) => {
          assert.strictEqual(body.model, 'dall-e-3');
          assert.strictEqual(body.size, '1792x1024');
          assert.strictEqual(body.quality, 'hd');
          assert.strictEqual(body.n, 1);
          return true;
        })
        .reply(200, {
          created: 1234567890,
          data: [{ url: 'https://example.com/image.png' }],
        });

      await connector.generateImage({
        prompt: 'Test',
        model: 'dall-e-3',
        size: '1792x1024',
        quality: 'hd',
        n: 1,
      });
    });

    test('generateImage should retry on failure', async () => {
      let attempts = 0;

      nock(OPENAI_API_BASE)
        .post('/v1/images/generations')
        .times(2)
        .reply(() => {
          attempts++;
          if (attempts < 2) {
            return [503, { error: { message: 'Service unavailable' } }];
          }
          return [200, {
            created: 1234567890,
            data: [{ url: 'https://example.com/image.png' }],
          }];
        });

      const result = await connector.generateImage({ prompt: 'Test' });
      assert.strictEqual(attempts, 2);
      assert.ok(Array.isArray(result));
    });

    test('generateImage should handle empty response data', async () => {
      nock(OPENAI_API_BASE)
        .post('/v1/images/generations')
        .reply(200, {
          created: 1234567890,
          data: [],
        });

      const result = await connector.generateImage({ prompt: 'Test' });
      assert.ok(Array.isArray(result));
      assert.strictEqual(result.length, 0);
    });
  });

  describe('Retry Mechanism Integration', () => {
    test('query should use inherited retry mechanism', async () => {
      let attempts = 0;

      nock(OPENAI_API_BASE)
        .post('/v1/chat/completions')
        .times(3)
        .reply(() => {
          attempts++;
          if (attempts < 3) {
            return [503, { error: { message: 'Service unavailable' } }];
          }
          return [200, {
            id: 'test',
            model: 'gpt-4',
            choices: [{ message: { role: 'assistant', content: 'Success' }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          }];
        });

      const response = await connector.query({ prompt: 'Test' });
      assert.strictEqual(attempts, 3);
      assert.strictEqual(response.content, 'Success');
    });

    test('query should fail after max retries', async () => {
      nock(OPENAI_API_BASE)
        .post('/v1/chat/completions')
        .times(3)
        .reply(503, { error: { message: 'Service unavailable' } });

      await assert.rejects(
        async () => await connector.query({ prompt: 'Test' }),
        (error) => {
          assert.ok(error.message);
          return true;
        }
      );
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    test('should handle concurrent requests', async () => {
      nock(OPENAI_API_BASE)
        .post('/v1/chat/completions')
        .times(3)
        .reply(200, {
          id: 'test',
          model: 'gpt-4',
          choices: [{ message: { role: 'assistant', content: 'Response' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        });

      const promises = [
        connector.query({ prompt: 'Test 1' }),
        connector.query({ prompt: 'Test 2' }),
        connector.query({ prompt: 'Test 3' }),
      ];

      const results = await Promise.all(promises);
      assert.strictEqual(results.length, 3);
      results.forEach(r => assert.strictEqual(r.content, 'Response'));
    });

    test('should handle null prompt gracefully', async () => {
      nock(OPENAI_API_BASE)
        .post('/v1/chat/completions')
        .reply(200, {
          id: 'test',
          model: 'gpt-4',
          choices: [{ message: { role: 'assistant', content: 'Response' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 0, completion_tokens: 5, total_tokens: 5 },
        });

      const response = await connector.query({ prompt: null });
      assert.ok(response.content);
    });

    test('should handle response with zero tokens', async () => {
      nock(OPENAI_API_BASE)
        .post('/v1/chat/completions')
        .reply(200, {
          id: 'test',
          model: 'gpt-4',
          choices: [{ message: { role: 'assistant', content: '' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        });

      const response = await connector.query({ prompt: '' });
      assert.strictEqual(response.usage.totalTokens, 0);
    });

    test('should preserve timestamp in standardized response', async () => {
      const beforeTime = Date.now();

      nock(OPENAI_API_BASE)
        .post('/v1/chat/completions')
        .reply(200, {
          id: 'test',
          model: 'gpt-4',
          choices: [{ message: { role: 'assistant', content: 'Response' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        });

      const response = await connector.query({ prompt: 'Test' });
      const afterTime = Date.now();

      assert.ok(response.timestamp >= beforeTime);
      assert.ok(response.timestamp <= afterTime);
    });
  });
});
