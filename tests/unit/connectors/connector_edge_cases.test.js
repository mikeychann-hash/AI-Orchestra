/**
 * Connector Edge Cases Tests
 * Tests edge cases and error scenarios across all connectors to improve coverage
 *
 * Coverage:
 * - Error handling and recovery
 * - Timeout scenarios
 * - Invalid inputs
 * - Network failures
 * - Rate limiting
 * - Retry mechanisms
 * - Stream error handling
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import nock from 'nock';
import { OpenAIConnector } from '../../../core/connectors/openai_connector.js';
import { GrokConnector } from '../../../core/connectors/grok_connector.js';
import { OllamaConnector } from '../../../core/connectors/ollama_connector.js';

describe('Connector Edge Cases Tests', () => {
  beforeEach(() => {
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('OpenAI Connector Edge Cases', () => {
    test('should handle empty response content', async () => {
      const connector = new OpenAIConnector({
        apiKey: 'test-key',
        retryAttempts: 1,
      });

      nock('https://api.openai.com')
        .post('/v1/chat/completions')
        .reply(200, {
          id: 'chat-123',
          model: 'gpt-4',
          choices: [
            {
              message: { role: 'assistant', content: '' },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 0, total_tokens: 10 },
        });

      const response = await connector.query({ prompt: 'Hello' });
      assert.strictEqual(response.content, '');
    });

    test('should handle missing usage data', async () => {
      const connector = new OpenAIConnector({
        apiKey: 'test-key',
        retryAttempts: 1,
      });

      nock('https://api.openai.com')
        .post('/v1/chat/completions')
        .reply(200, {
          id: 'chat-123',
          model: 'gpt-4',
          choices: [
            {
              message: { role: 'assistant', content: 'Hello' },
              finish_reason: 'stop',
            },
          ],
          // missing usage field
        });

      await assert.rejects(
        async () => {
          await connector.query({ prompt: 'Hello' });
        },
        Error
      );
    });

    test('should handle malformed JSON response', async () => {
      const connector = new OpenAIConnector({
        apiKey: 'test-key',
        retryAttempts: 1,
      });

      nock('https://api.openai.com')
        .post('/v1/chat/completions')
        .reply(200, 'Not JSON');

      await assert.rejects(
        async () => {
          await connector.query({ prompt: 'Hello' });
        },
        Error
      );
    });

    test('should handle network timeout', async () => {
      const connector = new OpenAIConnector({
        apiKey: 'test-key',
        timeout: 100,
        retryAttempts: 1,
      });

      nock('https://api.openai.com')
        .post('/v1/chat/completions')
        .delayConnection(200)
        .reply(200, {});

      await assert.rejects(
        async () => {
          await connector.query({ prompt: 'Hello' });
        },
        Error
      );
    });

    test('should handle 401 unauthorized', async () => {
      const connector = new OpenAIConnector({
        apiKey: 'invalid-key',
        retryAttempts: 1,
      });

      nock('https://api.openai.com')
        .post('/v1/chat/completions')
        .reply(401, {
          error: {
            message: 'Invalid API key',
            type: 'invalid_request_error',
          },
        });

      await assert.rejects(
        async () => {
          await connector.query({ prompt: 'Hello' });
        },
        Error
      );
    });

    test('should handle 429 rate limit', async () => {
      const connector = new OpenAIConnector({
        apiKey: 'test-key',
        retryAttempts: 1,
      });

      nock('https://api.openai.com')
        .post('/v1/chat/completions')
        .reply(429, {
          error: {
            message: 'Rate limit exceeded',
            type: 'rate_limit_error',
          },
        });

      await assert.rejects(
        async () => {
          await connector.query({ prompt: 'Hello' });
        },
        Error
      );
    });

    test('should handle 503 service unavailable', async () => {
      const connector = new OpenAIConnector({
        apiKey: 'test-key',
        retryAttempts: 1,
      });

      nock('https://api.openai.com')
        .post('/v1/chat/completions')
        .reply(503, {
          error: {
            message: 'Service temporarily unavailable',
            type: 'service_unavailable',
          },
        });

      await assert.rejects(
        async () => {
          await connector.query({ prompt: 'Hello' });
        },
        Error
      );
    });

    test('should reject stream parameter in query', async () => {
      const connector = new OpenAIConnector({
        apiKey: 'test-key',
      });

      await assert.rejects(
        async () => {
          await connector.query({ prompt: 'Hello', stream: true });
        },
        {
          name: 'Error',
          message: /streamQuery/,
        }
      );
    });

    test('should handle very long prompts', async () => {
      const connector = new OpenAIConnector({
        apiKey: 'test-key',
        retryAttempts: 1,
      });

      const longPrompt = 'A'.repeat(100000);

      nock('https://api.openai.com')
        .post('/v1/chat/completions')
        .reply(200, {
          id: 'chat-123',
          model: 'gpt-4',
          choices: [
            {
              message: { role: 'assistant', content: 'Response' },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 1000, completion_tokens: 10, total_tokens: 1010 },
        });

      const response = await connector.query({ prompt: longPrompt });
      assert.ok(response.content);
    });

    test('should handle custom parameters', async () => {
      const connector = new OpenAIConnector({
        apiKey: 'test-key',
        retryAttempts: 1,
      });

      nock('https://api.openai.com')
        .post('/v1/chat/completions', (body) => {
          // Verify custom parameters are passed through
          return body.top_p === 0.9 && body.presence_penalty === 0.5;
        })
        .reply(200, {
          id: 'chat-123',
          model: 'gpt-4',
          choices: [
            {
              message: { role: 'assistant', content: 'Response' },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
        });

      const response = await connector.query({
        prompt: 'Hello',
        top_p: 0.9,
        presence_penalty: 0.5,
      });

      assert.ok(response.content);
    });
  });

  describe('Grok Connector Edge Cases', () => {
    test('should handle empty response content', async () => {
      const connector = new GrokConnector({
        apiKey: 'test-key',
        retryAttempts: 1,
      });

      nock('https://api.x.ai')
        .post('/v1/chat/completions')
        .reply(200, {
          id: 'chat-123',
          model: 'grok-1',
          choices: [
            {
              message: { role: 'assistant', content: '' },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 0, total_tokens: 10 },
        });

      const response = await connector.query({ prompt: 'Hello' });
      assert.strictEqual(response.content, '');
    });

    test('should handle 401 unauthorized', async () => {
      const connector = new GrokConnector({
        apiKey: 'invalid-key',
        retryAttempts: 1,
      });

      nock('https://api.x.ai')
        .post('/v1/chat/completions')
        .reply(401, {
          error: {
            message: 'Invalid API key',
            type: 'invalid_request_error',
          },
        });

      await assert.rejects(
        async () => {
          await connector.query({ prompt: 'Hello' });
        },
        Error
      );
    });

    test('should handle connection test failure', async () => {
      const connector = new GrokConnector({
        apiKey: 'test-key',
      });

      nock('https://api.x.ai')
        .get('/v1/models')
        .replyWithError('Connection failed');

      const result = await connector.testConnection();
      assert.strictEqual(result, false);
    });

    test('should handle getModels failure', async () => {
      const connector = new GrokConnector({
        apiKey: 'test-key',
      });

      nock('https://api.x.ai')
        .get('/v1/models')
        .reply(500, { error: 'Internal server error' });

      const models = await connector.getModels();
      assert.ok(Array.isArray(models));
      assert.strictEqual(models.length, 0);
    });

    test('should handle network timeout', async () => {
      const connector = new GrokConnector({
        apiKey: 'test-key',
        timeout: 100,
        retryAttempts: 1,
      });

      nock('https://api.x.ai')
        .post('/v1/chat/completions')
        .delayConnection(200)
        .reply(200, {});

      await assert.rejects(
        async () => {
          await connector.query({ prompt: 'Hello' });
        },
        Error
      );
    });

    test('should reject stream parameter in query', async () => {
      const connector = new GrokConnector({
        apiKey: 'test-key',
      });

      await assert.rejects(
        async () => {
          await connector.query({ prompt: 'Hello', stream: true });
        },
        {
          name: 'Error',
          message: /streamQuery/,
        }
      );
    });
  });

  describe('Ollama Connector Edge Cases', () => {
    test('should handle empty response content', async () => {
      const connector = new OllamaConnector({
        host: 'http://localhost:11434',
        retryAttempts: 1,
      });

      nock('http://localhost:11434')
        .post('/api/generate')
        .reply(200, {
          model: 'llama2',
          response: '',
          done: true,
        });

      const response = await connector.query({ prompt: 'Hello' });
      assert.strictEqual(response.content, '');
    });

    test('should handle connection refused', async () => {
      const connector = new OllamaConnector({
        host: 'http://localhost:11434',
        retryAttempts: 1,
      });

      nock('http://localhost:11434')
        .post('/api/generate')
        .replyWithError({ code: 'ECONNREFUSED' });

      await assert.rejects(
        async () => {
          await connector.query({ prompt: 'Hello' });
        },
        Error
      );
    });

    test('should handle connection test failure', async () => {
      const connector = new OllamaConnector({
        host: 'http://localhost:11434',
      });

      nock('http://localhost:11434')
        .get('/api/tags')
        .replyWithError('Connection failed');

      const result = await connector.testConnection();
      assert.strictEqual(result, false);
    });

    test('should handle getModels failure', async () => {
      const connector = new OllamaConnector({
        host: 'http://localhost:11434',
      });

      nock('http://localhost:11434')
        .get('/api/tags')
        .reply(500, { error: 'Internal server error' });

      const models = await connector.getModels();
      assert.ok(Array.isArray(models));
      assert.strictEqual(models.length, 0);
    });

    test('should handle invalid host URL', () => {
      assert.throws(
        () => {
          new OllamaConnector({
            host: 'not-a-valid-url',
          });
        },
        Error
      );
    });

    test('should handle missing model in query', async () => {
      const connector = new OllamaConnector({
        host: 'http://localhost:11434',
        retryAttempts: 1,
      });

      nock('http://localhost:11434')
        .post('/api/generate')
        .reply(404, {
          error: 'Model not found',
        });

      await assert.rejects(
        async () => {
          await connector.query({ prompt: 'Hello', model: 'non-existent' });
        },
        Error
      );
    });

    test('should handle network timeout', async () => {
      const connector = new OllamaConnector({
        host: 'http://localhost:11434',
        timeout: 100,
        retryAttempts: 1,
      });

      nock('http://localhost:11434')
        .post('/api/generate')
        .delayConnection(200)
        .reply(200, {});

      await assert.rejects(
        async () => {
          await connector.query({ prompt: 'Hello' });
        },
        Error
      );
    });

    test('should reject stream parameter in query', async () => {
      const connector = new OllamaConnector({
        host: 'http://localhost:11434',
      });

      await assert.rejects(
        async () => {
          await connector.query({ prompt: 'Hello', stream: true });
        },
        {
          name: 'Error',
          message: /streamQuery/,
        }
      );
    });
  });

  describe('Retry Mechanism Tests', () => {
    test('OpenAI should retry on 5xx errors', async () => {
      const connector = new OpenAIConnector({
        apiKey: 'test-key',
        retryAttempts: 3,
        retryDelay: 10,
      });

      let attempts = 0;
      nock('https://api.openai.com')
        .post('/v1/chat/completions')
        .times(2)
        .reply(() => {
          attempts++;
          return [500, { error: 'Internal server error' }];
        })
        .post('/v1/chat/completions')
        .reply(200, {
          id: 'chat-123',
          model: 'gpt-4',
          choices: [
            {
              message: { role: 'assistant', content: 'Success' },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
        });

      const response = await connector.query({ prompt: 'Hello' });
      assert.strictEqual(response.content, 'Success');
      assert.ok(attempts >= 2, 'Should have retried');
    });

    test('Grok should retry on network errors', async () => {
      const connector = new GrokConnector({
        apiKey: 'test-key',
        retryAttempts: 3,
        retryDelay: 10,
      });

      let attempts = 0;
      nock('https://api.x.ai')
        .post('/v1/chat/completions')
        .times(2)
        .replyWithError(() => {
          attempts++;
          return 'Network error';
        })
        .post('/v1/chat/completions')
        .reply(200, {
          id: 'chat-123',
          model: 'grok-1',
          choices: [
            {
              message: { role: 'assistant', content: 'Success' },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
        });

      const response = await connector.query({ prompt: 'Hello' });
      assert.strictEqual(response.content, 'Success');
      assert.ok(attempts >= 2, 'Should have retried');
    });

    test('Ollama should retry on connection errors', async () => {
      const connector = new OllamaConnector({
        host: 'http://localhost:11434',
        retryAttempts: 3,
        retryDelay: 10,
      });

      let attempts = 0;
      nock('http://localhost:11434')
        .post('/api/generate')
        .times(2)
        .replyWithError(() => {
          attempts++;
          return { code: 'ECONNRESET' };
        })
        .post('/api/generate')
        .reply(200, {
          model: 'llama2',
          response: 'Success',
          done: true,
        });

      const response = await connector.query({ prompt: 'Hello' });
      assert.strictEqual(response.content, 'Success');
      assert.ok(attempts >= 2, 'Should have retried');
    });
  });

  describe('Configuration Validation Edge Cases', () => {
    test('OpenAI validateConfig should fail without API key', () => {
      const connector = new OpenAIConnector({ apiKey: 'test' });
      connector.apiKey = null;

      const result = connector.validateConfig();
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.length > 0);
    });

    test('Grok validateConfig should fail without API key', () => {
      const connector = new GrokConnector({ apiKey: 'test' });
      connector.apiKey = null;

      const result = connector.validateConfig();
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.length > 0);
    });

    test('Ollama validateConfig should fail without host', () => {
      const connector = new OllamaConnector({ host: 'http://localhost:11434' });
      connector.host = null;

      const result = connector.validateConfig();
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.length > 0);
    });
  });
});
