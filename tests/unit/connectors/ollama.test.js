/**
 * Ollama Connector Unit Tests
 * Tests Ollama connector with mocked API responses
 *
 * Coverage:
 * - Successful query/response (chat and generate formats)
 * - Streaming responses
 * - Error handling
 * - Retry mechanism
 * - Model management (list, pull, delete, copy, info)
 * - Connection testing
 * - Configuration validation
 * - Embeddings generation
 * - Response standardization
 */

import { test, describe, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import { OllamaConnector } from '../../../core/connectors/ollama_connector.js';

describe('Ollama Connector Tests', () => {
  let connector;
  let mockOllamaClient;

  beforeEach(() => {
    // Create mock Ollama client
    mockOllamaClient = {
      chat: mock.fn(),
      generate: mock.fn(),
      list: mock.fn(),
      pull: mock.fn(),
      delete: mock.fn(),
      show: mock.fn(),
      embeddings: mock.fn(),
      copy: mock.fn(),
    };

    // Create connector
    connector = new OllamaConnector({
      host: 'http://localhost:11434',
      defaultModel: 'llama2',
      timeout: 5000,
      retryAttempts: 3,
      retryDelay: 100,
    });

    // Replace client with mock
    connector.client = mockOllamaClient;
  });

  afterEach(() => {
    mock.reset();
  });

  describe('Initialization', () => {
    test('should initialize with default values', () => {
      const conn = new OllamaConnector({});

      assert.ok(conn);
      assert.strictEqual(conn.provider, 'ollama');
      assert.strictEqual(conn.defaultModel, 'llama2');
    });

    test('should accept custom host', () => {
      const conn = new OllamaConnector({
        host: 'http://custom-host:11434',
      });

      assert.strictEqual(conn.host, 'http://custom-host:11434');
    });

    test('should accept custom default model', () => {
      const conn = new OllamaConnector({
        defaultModel: 'mistral',
      });

      assert.strictEqual(conn.defaultModel, 'mistral');
    });

    test('should use environment variable for host', () => {
      process.env.OLLAMA_HOST = 'http://env-host:11434';

      const conn = new OllamaConnector({});

      assert.strictEqual(conn.host, 'http://env-host:11434');

      delete process.env.OLLAMA_HOST;
    });
  });

  describe('Configuration Validation', () => {
    test('validateConfig should return valid for proper config', () => {
      const result = connector.validateConfig();

      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors.length, 0);
    });

    test('validateConfig should fail without host', () => {
      connector.host = null;

      const result = connector.validateConfig();

      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.length > 0);
      assert.ok(result.errors[0].includes('host'));
    });
  });

  describe('Query Functionality - Generate Format', () => {
    test('should successfully query using generate format', async () => {
      mockOllamaClient.generate.mock.mockImplementationOnce(async () => ({
        model: 'llama2',
        response: 'This is a response from Ollama!',
        prompt_eval_count: 10,
        eval_count: 20,
        total_duration: 1000000,
        load_duration: 100000,
        eval_duration: 900000,
        created_at: new Date().toISOString(),
        context: [1, 2, 3],
      }));

      const response = await connector.query({
        prompt: 'Hello, Ollama!',
      });

      assert.ok(response);
      assert.strictEqual(response.provider, 'ollama');
      assert.strictEqual(response.content, 'This is a response from Ollama!');
      assert.strictEqual(response.usage.totalTokens, 30);
      assert.ok(mockOllamaClient.generate.mock.calls.length === 1);
    });

    test('should handle custom model in generate format', async () => {
      mockOllamaClient.generate.mock.mockImplementationOnce(async (options) => {
        assert.strictEqual(options.model, 'mistral');
        return {
          model: 'mistral',
          response: 'Response',
          eval_count: 10,
        };
      });

      await connector.query({
        prompt: 'Test',
        model: 'mistral',
      });
    });

    test('should handle temperature parameter', async () => {
      mockOllamaClient.generate.mock.mockImplementationOnce(async (options) => {
        assert.strictEqual(options.options.temperature, 0.9);
        return {
          model: 'llama2',
          response: 'Response',
          eval_count: 5,
        };
      });

      await connector.query({
        prompt: 'Test',
        temperature: 0.9,
      });
    });

    test('should pass through other options', async () => {
      mockOllamaClient.generate.mock.mockImplementationOnce(async (options) => {
        assert.strictEqual(options.options.top_p, 0.9);
        assert.strictEqual(options.options.top_k, 40);
        return {
          model: 'llama2',
          response: 'Response',
          eval_count: 5,
        };
      });

      await connector.query({
        prompt: 'Test',
        top_p: 0.9,
        top_k: 40,
      });
    });
  });

  describe('Query Functionality - Chat Format', () => {
    test('should successfully query using chat format', async () => {
      mockOllamaClient.chat.mock.mockImplementationOnce(async () => ({
        model: 'llama2',
        message: {
          role: 'assistant',
          content: 'Chat response!',
        },
        prompt_eval_count: 15,
        eval_count: 25,
        total_duration: 2000000,
        load_duration: 200000,
        eval_duration: 1800000,
        created_at: new Date().toISOString(),
      }));

      const response = await connector.query({
        messages: [
          { role: 'user', content: 'Hello!' },
        ],
      });

      assert.ok(response);
      assert.strictEqual(response.content, 'Chat response!');
      assert.strictEqual(response.usage.totalTokens, 40);
      assert.ok(mockOllamaClient.chat.mock.calls.length === 1);
    });

    test('should handle multiple messages in chat format', async () => {
      mockOllamaClient.chat.mock.mockImplementationOnce(async (options) => {
        assert.ok(Array.isArray(options.messages));
        assert.strictEqual(options.messages.length, 2);
        return {
          model: 'llama2',
          message: { role: 'assistant', content: 'Response' },
          eval_count: 10,
        };
      });

      await connector.query({
        messages: [
          { role: 'system', content: 'You are helpful.' },
          { role: 'user', content: 'Hello' },
        ],
      });
    });

    test('should set stream to false in chat format', async () => {
      mockOllamaClient.chat.mock.mockImplementationOnce(async (options) => {
        assert.strictEqual(options.stream, false);
        return {
          model: 'llama2',
          message: { role: 'assistant', content: 'Response' },
          eval_count: 5,
        };
      });

      await connector.query({
        messages: [{ role: 'user', content: 'Test' }],
      });
    });
  });

  describe('Query Validation', () => {
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

    test('should handle missing token counts', async () => {
      mockOllamaClient.generate.mock.mockImplementationOnce(async () => ({
        model: 'llama2',
        response: 'Response',
      }));

      const response = await connector.query({ prompt: 'Test' });

      assert.strictEqual(response.usage.promptTokens, 0);
      assert.strictEqual(response.usage.completionTokens, 0);
      assert.strictEqual(response.usage.totalTokens, 0);
    });
  });

  describe('Error Handling', () => {
    test('should handle connection errors', async () => {
      mockOllamaClient.generate.mock.mockImplementationOnce(async () => {
        throw new Error('Connection refused');
      });

      await assert.rejects(async () => {
        await connector.query({ prompt: 'Test' });
      });
    });

    test('should handle model not found errors', async () => {
      mockOllamaClient.generate.mock.mockImplementationOnce(async () => {
        const error = new Error('Model not found');
        error.code = 'MODEL_NOT_FOUND';
        throw error;
      });

      await assert.rejects(async () => {
        await connector.query({ prompt: 'Test', model: 'nonexistent' });
      });
    });

    test('should handle timeout errors', async () => {
      mockOllamaClient.generate.mock.mockImplementationOnce(async () => {
        await new Promise((resolve) => setTimeout(resolve, 6000));
        throw new Error('Timeout');
      });

      await assert.rejects(async () => {
        await connector.query({ prompt: 'Test' });
      });
    });

    test('should handle malformed responses', async () => {
      mockOllamaClient.generate.mock.mockImplementationOnce(async () => ({
        // Missing required fields
        model: 'llama2',
      }));

      await assert.rejects(async () => {
        await connector.query({ prompt: 'Test' });
      });
    });
  });

  describe('Retry Mechanism', () => {
    test('should retry on transient failures', async () => {
      let attempts = 0;

      mockOllamaClient.generate.mock.mockImplementation(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary error');
        }
        return {
          model: 'llama2',
          response: 'Success after retry!',
          eval_count: 10,
        };
      });

      const response = await connector.query({ prompt: 'Test' });

      assert.strictEqual(attempts, 3);
      assert.strictEqual(response.content, 'Success after retry!');
    });

    test('should fail after max retry attempts', async () => {
      mockOllamaClient.generate.mock.mockImplementation(async () => {
        throw new Error('Persistent error');
      });

      await assert.rejects(async () => {
        await connector.query({ prompt: 'Test' });
      });

      assert.ok(mockOllamaClient.generate.mock.calls.length === 3);
    });
  });

  describe('Model Management', () => {
    test('should list available models', async () => {
      mockOllamaClient.list.mock.mockImplementationOnce(async () => ({
        models: [
          {
            name: 'llama2',
            size: 3825819519,
            digest: 'abc123',
            modified_at: '2024-01-01T00:00:00Z',
            details: { format: 'gguf', family: 'llama' },
          },
          {
            name: 'mistral',
            size: 4109865159,
            digest: 'def456',
            modified_at: '2024-01-02T00:00:00Z',
            details: { format: 'gguf', family: 'mistral' },
          },
        ],
      }));

      const models = await connector.getModels();

      assert.ok(Array.isArray(models));
      assert.strictEqual(models.length, 2);
      assert.strictEqual(models[0].id, 'llama2');
      assert.ok(models[0].size);
      assert.ok(models[0].digest);
    });

    test('should handle empty model list', async () => {
      mockOllamaClient.list.mock.mockImplementationOnce(async () => ({
        models: [],
      }));

      const models = await connector.getModels();

      assert.ok(Array.isArray(models));
      assert.strictEqual(models.length, 0);
    });

    test('should handle getModels error gracefully', async () => {
      mockOllamaClient.list.mock.mockImplementationOnce(async () => {
        throw new Error('Connection error');
      });

      const models = await connector.getModels();

      assert.ok(Array.isArray(models));
      assert.strictEqual(models.length, 0);
    });

    test('should get model information', async () => {
      mockOllamaClient.show.mock.mockImplementationOnce(async () => ({
        modelfile: 'FROM llama2\nPARAMETER temperature 0.7',
        parameters: 'temperature 0.7',
        template: 'template content',
        details: {
          format: 'gguf',
          family: 'llama',
          parameter_size: '7B',
        },
      }));

      const info = await connector.getModelInfo('llama2');

      assert.ok(info);
      assert.ok(info.modelfile);
      assert.ok(info.details);
    });

    test('should handle model info errors', async () => {
      mockOllamaClient.show.mock.mockImplementationOnce(async () => {
        throw new Error('Model not found');
      });

      const info = await connector.getModelInfo('nonexistent');

      assert.strictEqual(info, null);
    });

    test('should delete a model', async () => {
      mockOllamaClient.delete.mock.mockImplementationOnce(async () => {});

      const result = await connector.deleteModel('test-model');

      assert.strictEqual(result, true);
      assert.ok(mockOllamaClient.delete.mock.calls.length === 1);
    });

    test('should handle delete errors', async () => {
      mockOllamaClient.delete.mock.mockImplementationOnce(async () => {
        throw new Error('Model not found');
      });

      const result = await connector.deleteModel('nonexistent');

      assert.strictEqual(result, false);
    });

    test('should copy a model', async () => {
      mockOllamaClient.copy.mock.mockImplementationOnce(async () => {});

      const result = await connector.copyModel('llama2', 'my-llama2');

      assert.strictEqual(result, true);
      assert.ok(mockOllamaClient.copy.mock.calls.length === 1);
    });

    test('should handle copy errors', async () => {
      mockOllamaClient.copy.mock.mockImplementationOnce(async () => {
        throw new Error('Source model not found');
      });

      const result = await connector.copyModel('nonexistent', 'new-model');

      assert.strictEqual(result, false);
    });
  });

  describe('Connection Testing', () => {
    test('testConnection should return true on success', async () => {
      mockOllamaClient.list.mock.mockImplementationOnce(async () => ({
        models: [],
      }));

      const result = await connector.testConnection();

      assert.strictEqual(result, true);
    });

    test('testConnection should return false on failure', async () => {
      mockOllamaClient.list.mock.mockImplementationOnce(async () => {
        throw new Error('Connection refused');
      });

      const result = await connector.testConnection();

      assert.strictEqual(result, false);
    });

    test('testConnection should handle network errors', async () => {
      mockOllamaClient.list.mock.mockImplementationOnce(async () => {
        const error = new Error('ECONNREFUSED');
        error.code = 'ECONNREFUSED';
        throw error;
      });

      const result = await connector.testConnection();

      assert.strictEqual(result, false);
    });
  });

  describe('Response Standardization', () => {
    test('should standardize generate response format', async () => {
      mockOllamaClient.generate.mock.mockImplementationOnce(async () => ({
        model: 'llama2',
        response: 'Hello!',
        prompt_eval_count: 10,
        eval_count: 20,
        total_duration: 1000000,
        load_duration: 100000,
        eval_duration: 900000,
        created_at: '2024-01-01T00:00:00Z',
      }));

      const response = await connector.query({ prompt: 'Test' });

      assert.strictEqual(response.provider, 'ollama');
      assert.ok(response.content);
      assert.ok(response.model);
      assert.ok(response.usage);
      assert.ok(response.timestamp);
    });

    test('should include metadata in response', async () => {
      mockOllamaClient.generate.mock.mockImplementationOnce(async () => ({
        model: 'llama2',
        response: 'Hello!',
        eval_count: 10,
        total_duration: 1000000,
        load_duration: 100000,
        eval_duration: 900000,
        created_at: '2024-01-01T00:00:00Z',
        context: [1, 2, 3],
      }));

      const response = await connector.query({ prompt: 'Test' });

      assert.ok(response.metadata);
      assert.ok(response.metadata.totalDuration);
      assert.ok(response.metadata.loadDuration);
      assert.ok(response.metadata.evalDuration);
      assert.ok(response.metadata.createdAt);
      assert.ok(response.metadata.context);
    });

    test('should include token usage in standardized format', async () => {
      mockOllamaClient.generate.mock.mockImplementationOnce(async () => ({
        model: 'llama2',
        response: 'Hello!',
        prompt_eval_count: 25,
        eval_count: 35,
      }));

      const response = await connector.query({ prompt: 'Test' });

      assert.strictEqual(response.usage.promptTokens, 25);
      assert.strictEqual(response.usage.completionTokens, 35);
      assert.strictEqual(response.usage.totalTokens, 60);
    });

    test('should standardize chat response format', async () => {
      mockOllamaClient.chat.mock.mockImplementationOnce(async () => ({
        model: 'llama2',
        message: {
          role: 'assistant',
          content: 'Chat response!',
        },
        prompt_eval_count: 15,
        eval_count: 25,
        total_duration: 2000000,
      }));

      const response = await connector.query({
        messages: [{ role: 'user', content: 'Hello' }],
      });

      assert.strictEqual(response.provider, 'ollama');
      assert.strictEqual(response.content, 'Chat response!');
      assert.ok(response.timestamp);
    });
  });

  describe('Embeddings', () => {
    test('should create embeddings', async () => {
      mockOllamaClient.embeddings.mock.mockImplementationOnce(async () => ({
        embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
      }));

      const embedding = await connector.createEmbeddings('Test text');

      assert.ok(Array.isArray(embedding));
      assert.strictEqual(embedding.length, 5);
      assert.ok(mockOllamaClient.embeddings.mock.calls.length === 1);
    });

    test('should handle custom model for embeddings', async () => {
      mockOllamaClient.embeddings.mock.mockImplementationOnce(async (options) => {
        assert.strictEqual(options.model, 'mistral');
        return { embedding: [0.1, 0.2] };
      });

      await connector.createEmbeddings('Test', 'mistral');
    });

    test('should handle embeddings errors', async () => {
      mockOllamaClient.embeddings.mock.mockImplementationOnce(async () => {
        throw new Error('Model not found');
      });

      await assert.rejects(async () => {
        await connector.createEmbeddings('Test');
      });
    });

    test('should retry on embeddings failure', async () => {
      let attempts = 0;

      mockOllamaClient.embeddings.mock.mockImplementation(async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Temporary error');
        }
        return { embedding: [0.1, 0.2] };
      });

      const embedding = await connector.createEmbeddings('Test');

      assert.strictEqual(attempts, 2);
      assert.ok(Array.isArray(embedding));
    });
  });

  describe('Pull Model', () => {
    test('should pull a model with progress updates', async () => {
      async function* mockPullStream() {
        yield { status: 'downloading', total: 1000, completed: 100 };
        yield { status: 'downloading', total: 1000, completed: 500 };
        yield { status: 'downloading', total: 1000, completed: 1000 };
        yield { status: 'success', total: 1000, completed: 1000 };
      }

      mockOllamaClient.pull.mock.mockImplementationOnce(mockPullStream);

      const updates = [];
      for await (const update of connector.pullModel('llama2')) {
        updates.push(update);
      }

      assert.strictEqual(updates.length, 4);
      assert.strictEqual(updates[0].status, 'downloading');
      assert.strictEqual(updates[3].status, 'success');
    });

    test('should handle pull errors', async () => {
      mockOllamaClient.pull.mock.mockImplementationOnce(async () => {
        throw new Error('Model not found in registry');
      });

      await assert.rejects(async () => {
        for await (const _ of connector.pullModel('nonexistent')) {
          // Should throw before yielding
        }
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle responses with empty content', async () => {
      mockOllamaClient.generate.mock.mockImplementationOnce(async () => ({
        model: 'llama2',
        response: '',
        eval_count: 0,
      }));

      const response = await connector.query({ prompt: 'Test' });

      assert.strictEqual(response.content, '');
    });

    test('should handle responses with extra fields', async () => {
      mockOllamaClient.generate.mock.mockImplementationOnce(async () => ({
        model: 'llama2',
        response: 'Response',
        eval_count: 10,
        extra_field: 'extra_value',
        another_field: 123,
      }));

      const response = await connector.query({ prompt: 'Test' });

      assert.ok(response);
      assert.strictEqual(response.content, 'Response');
    });

    test('should handle very long responses', async () => {
      const longResponse = 'a'.repeat(100000);

      mockOllamaClient.generate.mock.mockImplementationOnce(async () => ({
        model: 'llama2',
        response: longResponse,
        eval_count: 50000,
      }));

      const response = await connector.query({ prompt: 'Test' });

      assert.strictEqual(response.content.length, 100000);
    });

    test('should handle concurrent requests', async () => {
      mockOllamaClient.generate.mock.mockImplementation(async () => ({
        model: 'llama2',
        response: 'Response',
        eval_count: 10,
      }));

      const promises = [
        connector.query({ prompt: 'Test 1' }),
        connector.query({ prompt: 'Test 2' }),
        connector.query({ prompt: 'Test 3' }),
      ];

      const results = await Promise.all(promises);

      assert.strictEqual(results.length, 3);
      results.forEach(r => assert.ok(r.content));
    });
  });
});
