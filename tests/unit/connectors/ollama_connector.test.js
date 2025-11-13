/**
 * Comprehensive Ollama Connector Tests - Iteration 5
 * Focus on increasing code coverage from 32.38% to 60%+
 *
 * Test Coverage Areas:
 * - Edge cases and boundary conditions
 * - Error handling paths
 * - Parameter validation
 * - Stream query functionality
 * - Response parsing edge cases
 * - Retry logic verification
 * - Configuration variations
 * - Model management operations
 */

import { test, describe, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import { OllamaConnector } from '../../../core/connectors/ollama_connector.js';

describe('Ollama Connector - Comprehensive Coverage Tests', () => {
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

  describe('Initialization Edge Cases', () => {
    test('should initialize with environment variable host', () => {
      process.env.OLLAMA_HOST = 'http://env-host:11434';
      const conn = new OllamaConnector({});
      assert.strictEqual(conn.host, 'http://env-host:11434');
      delete process.env.OLLAMA_HOST;
    });

    test('should prioritize config host over environment', () => {
      process.env.OLLAMA_HOST = 'http://env-host:11434';
      const conn = new OllamaConnector({ host: 'http://config-host:11434' });
      assert.strictEqual(conn.host, 'http://config-host:11434');
      delete process.env.OLLAMA_HOST;
    });

    test('should use default localhost when no host provided', () => {
      delete process.env.OLLAMA_HOST;
      const conn = new OllamaConnector({});
      assert.strictEqual(conn.host, 'http://localhost:11434');
    });

    test('should set correct provider name', () => {
      assert.strictEqual(connector.provider, 'ollama');
    });

    test('should use default model when not specified', () => {
      assert.strictEqual(connector.defaultModel, 'llama2');
    });

    test('should accept custom default model', () => {
      const conn = new OllamaConnector({ defaultModel: 'mistral' });
      assert.strictEqual(conn.defaultModel, 'mistral');
    });

    test('should handle custom port in host', () => {
      const conn = new OllamaConnector({ host: 'http://localhost:8080' });
      assert.strictEqual(conn.host, 'http://localhost:8080');
    });

    test('should handle https host', () => {
      const conn = new OllamaConnector({ host: 'https://secure-ollama:11434' });
      assert.strictEqual(conn.host, 'https://secure-ollama:11434');
    });
  });

  describe('Query Method - Generate Format - Edge Cases', () => {
    test('should handle empty prompt string', async () => {
      mockOllamaClient.generate.mock.mockImplementationOnce(async (options) => {
        assert.strictEqual(options.prompt, '');
        return {
          model: 'llama2',
          response: 'Response to empty prompt',
          eval_count: 5,
        };
      });

      const response = await connector.query({ prompt: '' });
      assert.ok(response.content);
    });

    test('should handle very long prompt', async () => {
      const longPrompt = 'a'.repeat(50000);

      mockOllamaClient.generate.mock.mockImplementationOnce(async (options) => {
        assert.strictEqual(options.prompt.length, 50000);
        return {
          model: 'llama2',
          response: 'Response',
          prompt_eval_count: 10000,
          eval_count: 50,
        };
      });

      const response = await connector.query({ prompt: longPrompt });
      assert.strictEqual(response.usage.promptTokens, 10000);
    });

    test('should handle special characters in prompt', async () => {
      const specialPrompt = 'Test\n\t"quotes"\r\n\'single\'\\backslash{brackets}';

      mockOllamaClient.generate.mock.mockImplementationOnce(async () => ({
        model: 'llama2',
        response: 'Handled special chars',
        eval_count: 10,
      }));

      const response = await connector.query({ prompt: specialPrompt });
      assert.ok(response.content);
    });

    test('should handle unicode and emoji in prompt', async () => {
      const unicodePrompt = 'Hello 世界 🌍 🚀 مرحبا';

      mockOllamaClient.generate.mock.mockImplementationOnce(async () => ({
        model: 'llama2',
        response: 'Handled unicode',
        eval_count: 10,
      }));

      const response = await connector.query({ prompt: unicodePrompt });
      assert.ok(response.content);
    });

    test('should use provided model parameter', async () => {
      mockOllamaClient.generate.mock.mockImplementationOnce(async (options) => {
        assert.strictEqual(options.model, 'mistral');
        return {
          model: 'mistral',
          response: 'Response',
          eval_count: 10,
        };
      });

      await connector.query({ prompt: 'Test', model: 'mistral' });
    });

    test('should use default model when not specified', async () => {
      mockOllamaClient.generate.mock.mockImplementationOnce(async (options) => {
        assert.strictEqual(options.model, 'llama2');
        return {
          model: 'llama2',
          response: 'Response',
          eval_count: 10,
        };
      });

      await connector.query({ prompt: 'Test' });
    });

    test('should handle temperature boundary values', async () => {
      mockOllamaClient.generate.mock.mockImplementationOnce(async (options) => {
        assert.strictEqual(options.options.temperature, 0);
        return {
          model: 'llama2',
          response: 'Response',
          eval_count: 10,
        };
      });

      await connector.query({ prompt: 'Test', temperature: 0 });
    });

    test('should pass through additional options', async () => {
      mockOllamaClient.generate.mock.mockImplementationOnce(async (options) => {
        assert.strictEqual(options.options.top_p, 0.9);
        assert.strictEqual(options.options.top_k, 40);
        assert.strictEqual(options.options.num_predict, 100);
        return {
          model: 'llama2',
          response: 'Response',
          eval_count: 10,
        };
      });

      await connector.query({
        prompt: 'Test',
        top_p: 0.9,
        top_k: 40,
        num_predict: 100,
      });
    });

    test('should handle response with all metadata fields', async () => {
      mockOllamaClient.generate.mock.mockImplementationOnce(async () => ({
        model: 'llama2',
        response: 'Response',
        prompt_eval_count: 15,
        eval_count: 25,
        total_duration: 5000000000,
        load_duration: 1000000000,
        prompt_eval_duration: 2000000000,
        eval_duration: 2000000000,
        created_at: '2024-01-01T00:00:00Z',
        context: [1, 2, 3, 4, 5],
        done: true,
      }));

      const response = await connector.query({ prompt: 'Test' });
      assert.ok(response.metadata);
      assert.ok(response.metadata.totalDuration);
      assert.ok(response.metadata.loadDuration);
      assert.ok(response.metadata.evalDuration);
      assert.ok(response.metadata.createdAt);
      assert.ok(response.metadata.context);
    });

    test('should handle response with minimal fields', async () => {
      mockOllamaClient.generate.mock.mockImplementationOnce(async () => ({
        model: 'llama2',
        response: 'Minimal response',
      }));

      const response = await connector.query({ prompt: 'Test' });
      assert.strictEqual(response.content, 'Minimal response');
      assert.strictEqual(response.usage.totalTokens, 0);
    });
  });

  describe('Query Method - Chat Format - Edge Cases', () => {
    test('should handle single message', async () => {
      mockOllamaClient.chat.mock.mockImplementationOnce(async (options) => {
        assert.ok(Array.isArray(options.messages));
        assert.strictEqual(options.messages.length, 1);
        return {
          model: 'llama2',
          message: { role: 'assistant', content: 'Response' },
          eval_count: 10,
        };
      });

      await connector.query({
        messages: [{ role: 'user', content: 'Hello' }],
      });
    });

    test('should handle multiple messages', async () => {
      mockOllamaClient.chat.mock.mockImplementationOnce(async (options) => {
        assert.strictEqual(options.messages.length, 3);
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
          { role: 'assistant', content: 'Hi there!' },
        ],
      });
    });

    test('should handle messages with different roles', async () => {
      mockOllamaClient.chat.mock.mockImplementationOnce(async (options) => {
        const roles = options.messages.map(m => m.role);
        assert.ok(roles.includes('system'));
        assert.ok(roles.includes('user'));
        return {
          model: 'llama2',
          message: { role: 'assistant', content: 'Response' },
          eval_count: 10,
        };
      });

      await connector.query({
        messages: [
          { role: 'system', content: 'System message' },
          { role: 'user', content: 'User message' },
        ],
      });
    });

    test('should ensure stream is false in chat mode', async () => {
      mockOllamaClient.chat.mock.mockImplementationOnce(async (options) => {
        assert.strictEqual(options.stream, false);
        return {
          model: 'llama2',
          message: { role: 'assistant', content: 'Response' },
          eval_count: 10,
        };
      });

      await connector.query({
        messages: [{ role: 'user', content: 'Test' }],
      });
    });

    test('should handle chat response with all metadata', async () => {
      mockOllamaClient.chat.mock.mockImplementationOnce(async () => ({
        model: 'llama2',
        message: {
          role: 'assistant',
          content: 'Chat response',
          images: null,
        },
        prompt_eval_count: 20,
        eval_count: 30,
        total_duration: 8000000000,
        load_duration: 2000000000,
        eval_duration: 6000000000,
        created_at: '2024-01-01T12:00:00Z',
        done: true,
      }));

      const response = await connector.query({
        messages: [{ role: 'user', content: 'Test' }],
      });
      assert.strictEqual(response.usage.promptTokens, 20);
      assert.strictEqual(response.usage.completionTokens, 30);
      assert.strictEqual(response.usage.totalTokens, 50);
    });
  });

  describe('Error Handling - Comprehensive', () => {
    test('should handle connection refused error', async () => {
      mockOllamaClient.generate.mock.mockImplementationOnce(async () => {
        const error = new Error('connect ECONNREFUSED');
        error.code = 'ECONNREFUSED';
        throw error;
      });

      await assert.rejects(
        async () => await connector.query({ prompt: 'Test' }),
        (error) => {
          assert.ok(error.message);
          return true;
        }
      );
    });

    test('should handle model not found error', async () => {
      mockOllamaClient.generate.mock.mockImplementationOnce(async () => {
        const error = new Error('model "nonexistent" not found');
        error.code = 'MODEL_NOT_FOUND';
        throw error;
      });

      await assert.rejects(
        async () => await connector.query({ prompt: 'Test', model: 'nonexistent' }),
        (error) => {
          assert.ok(error.message.includes('not found') || error.code === 'MODEL_NOT_FOUND');
          return true;
        }
      );
    });

    test('should handle timeout error', async () => {
      mockOllamaClient.generate.mock.mockImplementationOnce(async () => {
        const error = new Error('Request timeout');
        error.code = 'ETIMEDOUT';
        throw error;
      });

      await assert.rejects(
        async () => await connector.query({ prompt: 'Test' }),
        (error) => {
          assert.ok(error.message);
          return true;
        }
      );
    });

    test('should handle network error', async () => {
      mockOllamaClient.generate.mock.mockImplementationOnce(async () => {
        const error = new Error('Network error');
        error.code = 'ENETUNREACH';
        throw error;
      });

      await assert.rejects(
        async () => await connector.query({ prompt: 'Test' }),
        (error) => {
          assert.ok(error.message);
          return true;
        }
      );
    });

    test('should handle malformed response - missing model', async () => {
      mockOllamaClient.generate.mock.mockImplementationOnce(async () => ({
        response: 'Response text',
        // Missing model field
      }));

      await assert.rejects(
        async () => await connector.query({ prompt: 'Test' }),
        (error) => {
          assert.ok(error.message);
          return true;
        }
      );
    });

    test('should handle malformed response - missing response field', async () => {
      mockOllamaClient.generate.mock.mockImplementationOnce(async () => ({
        model: 'llama2',
        // Missing response field
      }));

      await assert.rejects(
        async () => await connector.query({ prompt: 'Test' }),
        (error) => {
          assert.ok(error.message);
          return true;
        }
      );
    });

    test('should handle chat error - missing message', async () => {
      mockOllamaClient.chat.mock.mockImplementationOnce(async () => ({
        model: 'llama2',
        // Missing message field
      }));

      await assert.rejects(
        async () => await connector.query({ messages: [{ role: 'user', content: 'Test' }] }),
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
    test('should stream generate responses', async () => {
      async function* mockGenerateStream() {
        yield { model: 'llama2', response: 'Hello', done: false };
        yield { model: 'llama2', response: ' world', done: false };
        yield { model: 'llama2', response: '!', done: true };
      }

      mockOllamaClient.generate.mock.mockImplementationOnce(mockGenerateStream);

      const results = [];
      for await (const chunk of connector.streamQuery({ prompt: 'Test' })) {
        results.push(chunk);
      }

      assert.strictEqual(results.length, 3);
      assert.strictEqual(results[0].content, 'Hello');
      assert.strictEqual(results[1].content, ' world');
      assert.strictEqual(results[2].content, '!');
      assert.strictEqual(results[2].done, true);
    });

    test('should stream chat responses', async () => {
      async function* mockChatStream() {
        yield {
          model: 'llama2',
          message: { role: 'assistant', content: 'Response' },
          done: false
        };
        yield {
          model: 'llama2',
          message: { role: 'assistant', content: ' chunk' },
          done: true
        };
      }

      mockOllamaClient.chat.mock.mockImplementationOnce(mockChatStream);

      const results = [];
      for await (const chunk of connector.streamQuery({
        messages: [{ role: 'user', content: 'Test' }]
      })) {
        results.push(chunk);
      }

      assert.strictEqual(results.length, 2);
      assert.strictEqual(results[0].content, 'Response');
      assert.strictEqual(results[1].done, true);
    });

    test('should filter out chunks without content in generate mode', async () => {
      async function* mockGenerateStream() {
        yield { model: 'llama2', response: '', done: false };
        yield { model: 'llama2', response: 'Content', done: false };
        yield { model: 'llama2', done: true };
      }

      mockOllamaClient.generate.mock.mockImplementationOnce(mockGenerateStream);

      const results = [];
      for await (const chunk of connector.streamQuery({ prompt: 'Test' })) {
        results.push(chunk);
      }

      // Should only get chunks with actual content
      assert.ok(results.some(r => r.content === 'Content'));
    });

    test('should filter out chunks without content in chat mode', async () => {
      async function* mockChatStream() {
        yield { model: 'llama2', message: { role: 'assistant' }, done: false };
        yield { model: 'llama2', message: { role: 'assistant', content: 'Real content' }, done: false };
      }

      mockOllamaClient.chat.mock.mockImplementationOnce(mockChatStream);

      const results = [];
      for await (const chunk of connector.streamQuery({
        messages: [{ role: 'user', content: 'Test' }]
      })) {
        results.push(chunk);
      }

      assert.ok(results.some(r => r.content === 'Real content'));
    });

    test('should handle stream errors', async () => {
      mockOllamaClient.generate.mock.mockImplementationOnce(async () => {
        throw new Error('Stream error');
      });

      await assert.rejects(async () => {
        for await (const _ of connector.streamQuery({ prompt: 'Test' })) {
          // Should throw before yielding
        }
      });
    });

    test('should pass temperature in stream mode', async () => {
      async function* mockGenerateStream() {
        yield { model: 'llama2', response: 'Response', done: true };
      }

      mockOllamaClient.generate.mock.mockImplementationOnce(async (options) => {
        assert.strictEqual(options.options.temperature, 0.8);
        assert.strictEqual(options.stream, true);
        return mockGenerateStream();
      });

      const results = [];
      for await (const chunk of connector.streamQuery({ prompt: 'Test', temperature: 0.8 })) {
        results.push(chunk);
      }

      assert.ok(results.length > 0);
    });
  });

  describe('Configuration Validation', () => {
    test('validateConfig should pass with valid host', () => {
      const result = connector.validateConfig();
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors.length, 0);
    });

    test('validateConfig should fail with null host', () => {
      connector.host = null;
      const result = connector.validateConfig();
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.length > 0);
      assert.ok(result.errors[0].includes('host'));
    });

    test('validateConfig should fail with undefined host', () => {
      connector.host = undefined;
      const result = connector.validateConfig();
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.length > 0);
    });

    test('validateConfig should fail with empty string host', () => {
      connector.host = '';
      const result = connector.validateConfig();
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.length > 0);
    });
  });

  describe('Connection Testing', () => {
    test('testConnection should return true on successful list', async () => {
      mockOllamaClient.list.mock.mockImplementationOnce(async () => ({
        models: [
          { name: 'llama2', size: 3825819519 },
        ],
      }));

      const result = await connector.testConnection();
      assert.strictEqual(result, true);
    });

    test('testConnection should return false on connection error', async () => {
      mockOllamaClient.list.mock.mockImplementationOnce(async () => {
        throw new Error('Connection refused');
      });

      const result = await connector.testConnection();
      assert.strictEqual(result, false);
    });

    test('testConnection should return false on timeout', async () => {
      mockOllamaClient.list.mock.mockImplementationOnce(async () => {
        const error = new Error('Timeout');
        error.code = 'ETIMEDOUT';
        throw error;
      });

      const result = await connector.testConnection();
      assert.strictEqual(result, false);
    });

    test('testConnection should return false on network error', async () => {
      mockOllamaClient.list.mock.mockImplementationOnce(async () => {
        const error = new Error('Network unreachable');
        error.code = 'ENETUNREACH';
        throw error;
      });

      const result = await connector.testConnection();
      assert.strictEqual(result, false);
    });
  });

  describe('Model Management', () => {
    test('getModels should return list of models', async () => {
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
      assert.strictEqual(models[1].id, 'mistral');
    });

    test('getModels should handle empty model list', async () => {
      mockOllamaClient.list.mock.mockImplementationOnce(async () => ({
        models: [],
      }));

      const models = await connector.getModels();
      assert.ok(Array.isArray(models));
      assert.strictEqual(models.length, 0);
    });

    test('getModels should return empty array on error', async () => {
      mockOllamaClient.list.mock.mockImplementationOnce(async () => {
        throw new Error('Connection error');
      });

      const models = await connector.getModels();
      assert.ok(Array.isArray(models));
      assert.strictEqual(models.length, 0);
    });

    test('getModels should include all model details', async () => {
      mockOllamaClient.list.mock.mockImplementationOnce(async () => ({
        models: [{
          name: 'llama2',
          size: 3825819519,
          digest: 'sha256:abc123',
          modified_at: '2024-01-01T00:00:00Z',
          details: {
            format: 'gguf',
            family: 'llama',
            parameter_size: '7B',
            quantization_level: 'Q4_0',
          },
        }],
      }));

      const models = await connector.getModels();
      assert.ok(models[0].size);
      assert.ok(models[0].digest);
      assert.ok(models[0].modifiedAt);
      assert.ok(models[0].details);
    });

    test('getModelInfo should return model information', async () => {
      mockOllamaClient.show.mock.mockImplementationOnce(async () => ({
        modelfile: 'FROM llama2\nPARAMETER temperature 0.7',
        parameters: 'temperature 0.7\nnum_ctx 2048',
        template: '{{ .System }}\n{{ .Prompt }}',
        details: {
          format: 'gguf',
          family: 'llama',
          parameter_size: '7B',
        },
      }));

      const info = await connector.getModelInfo('llama2');
      assert.ok(info.modelfile);
      assert.ok(info.parameters);
      assert.ok(info.template);
      assert.ok(info.details);
    });

    test('getModelInfo should return null on error', async () => {
      mockOllamaClient.show.mock.mockImplementationOnce(async () => {
        throw new Error('Model not found');
      });

      const info = await connector.getModelInfo('nonexistent');
      assert.strictEqual(info, null);
    });

    test('deleteModel should return true on success', async () => {
      mockOllamaClient.delete.mock.mockImplementationOnce(async () => {});

      const result = await connector.deleteModel('test-model');
      assert.strictEqual(result, true);
      assert.ok(mockOllamaClient.delete.mock.calls.length === 1);
    });

    test('deleteModel should return false on error', async () => {
      mockOllamaClient.delete.mock.mockImplementationOnce(async () => {
        throw new Error('Model not found');
      });

      const result = await connector.deleteModel('nonexistent');
      assert.strictEqual(result, false);
    });

    test('copyModel should return true on success', async () => {
      mockOllamaClient.copy.mock.mockImplementationOnce(async () => {});

      const result = await connector.copyModel('llama2', 'my-llama2');
      assert.strictEqual(result, true);
      assert.ok(mockOllamaClient.copy.mock.calls.length === 1);
    });

    test('copyModel should return false on error', async () => {
      mockOllamaClient.copy.mock.mockImplementationOnce(async () => {
        throw new Error('Source model not found');
      });

      const result = await connector.copyModel('nonexistent', 'new-model');
      assert.strictEqual(result, false);
    });
  });

  describe('Embeddings Functionality', () => {
    test('createEmbeddings should return embedding vector', async () => {
      mockOllamaClient.embeddings.mock.mockImplementationOnce(async () => ({
        embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
      }));

      const embedding = await connector.createEmbeddings('Test text');
      assert.ok(Array.isArray(embedding));
      assert.strictEqual(embedding.length, 5);
    });

    test('createEmbeddings should use custom model', async () => {
      mockOllamaClient.embeddings.mock.mockImplementationOnce(async (options) => {
        assert.strictEqual(options.model, 'mistral');
        assert.strictEqual(options.prompt, 'Test text');
        return { embedding: [0.1, 0.2] };
      });

      await connector.createEmbeddings('Test text', 'mistral');
    });

    test('createEmbeddings should use default model when not specified', async () => {
      mockOllamaClient.embeddings.mock.mockImplementationOnce(async (options) => {
        assert.strictEqual(options.model, 'llama2');
        return { embedding: [0.1, 0.2] };
      });

      await connector.createEmbeddings('Test text');
    });

    test('createEmbeddings should handle empty text', async () => {
      mockOllamaClient.embeddings.mock.mockImplementationOnce(async (options) => {
        assert.strictEqual(options.prompt, '');
        return { embedding: [] };
      });

      const embedding = await connector.createEmbeddings('');
      assert.ok(Array.isArray(embedding));
    });

    test('createEmbeddings should retry on failure', async () => {
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

    test('createEmbeddings should handle large embedding vectors', async () => {
      const largeEmbedding = Array(4096).fill(0).map((_, i) => i / 4096);

      mockOllamaClient.embeddings.mock.mockImplementationOnce(async () => ({
        embedding: largeEmbedding,
      }));

      const embedding = await connector.createEmbeddings('Test');
      assert.strictEqual(embedding.length, 4096);
    });
  });

  describe('Pull Model Functionality', () => {
    test('pullModel should yield progress updates', async () => {
      async function* mockPullStream() {
        yield { status: 'pulling manifest', total: 0, completed: 0 };
        yield { status: 'downloading', total: 1000, completed: 250 };
        yield { status: 'downloading', total: 1000, completed: 500 };
        yield { status: 'downloading', total: 1000, completed: 1000 };
        yield { status: 'verifying', total: 1000, completed: 1000 };
        yield { status: 'success', total: 1000, completed: 1000 };
      }

      mockOllamaClient.pull.mock.mockImplementationOnce(mockPullStream);

      const updates = [];
      for await (const update of connector.pullModel('llama2')) {
        updates.push(update);
      }

      assert.ok(updates.length >= 4);
      assert.ok(updates.some(u => u.status === 'downloading'));
      assert.ok(updates.some(u => u.status === 'success'));
    });

    test('pullModel should handle errors', async () => {
      mockOllamaClient.pull.mock.mockImplementationOnce(async () => {
        throw new Error('Model not found in registry');
      });

      await assert.rejects(async () => {
        for await (const _ of connector.pullModel('nonexistent')) {
          // Should throw before yielding
        }
      });
    });

    test('pullModel should include digest in updates', async () => {
      async function* mockPullStream() {
        yield {
          status: 'downloading',
          digest: 'sha256:abc123',
          total: 1000,
          completed: 500,
        };
      }

      mockOllamaClient.pull.mock.mockImplementationOnce(mockPullStream);

      const updates = [];
      for await (const update of connector.pullModel('llama2')) {
        updates.push(update);
      }

      assert.ok(updates[0].digest);
    });
  });

  describe('Retry Mechanism Integration', () => {
    test('query should use inherited retry mechanism', async () => {
      let attempts = 0;

      mockOllamaClient.generate.mock.mockImplementation(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary error');
        }
        return {
          model: 'llama2',
          response: 'Success after retry',
          eval_count: 10,
        };
      });

      const response = await connector.query({ prompt: 'Test' });
      assert.strictEqual(attempts, 3);
      assert.strictEqual(response.content, 'Success after retry');
    });

    test('query should fail after max retries', async () => {
      mockOllamaClient.generate.mock.mockImplementation(async () => {
        throw new Error('Persistent error');
      });

      await assert.rejects(
        async () => await connector.query({ prompt: 'Test' }),
        (error) => {
          assert.ok(error.message);
          return true;
        }
      );

      assert.ok(mockOllamaClient.generate.mock.calls.length === 3);
    });

    test('createEmbeddings should retry on transient failures', async () => {
      let attempts = 0;

      mockOllamaClient.embeddings.mock.mockImplementation(async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Temporary failure');
        }
        return { embedding: [0.1, 0.2, 0.3] };
      });

      const result = await connector.createEmbeddings('Test');
      assert.strictEqual(attempts, 2);
      assert.ok(Array.isArray(result));
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    test('should handle concurrent requests', async () => {
      mockOllamaClient.generate.mock.mockImplementation(async () => ({
        model: 'llama2',
        response: 'Concurrent response',
        eval_count: 10,
      }));

      const promises = [
        connector.query({ prompt: 'Test 1' }),
        connector.query({ prompt: 'Test 2' }),
        connector.query({ prompt: 'Test 3' }),
      ];

      const results = await Promise.all(promises);
      assert.strictEqual(results.length, 3);
      results.forEach(r => assert.strictEqual(r.content, 'Concurrent response'));
    });

    test('should handle null prompt gracefully', async () => {
      mockOllamaClient.generate.mock.mockImplementationOnce(async () => ({
        model: 'llama2',
        response: 'Response to null',
        eval_count: 5,
      }));

      const response = await connector.query({ prompt: null });
      assert.ok(response.content);
    });

    test('should handle response with zero tokens', async () => {
      mockOllamaClient.generate.mock.mockImplementationOnce(async () => ({
        model: 'llama2',
        response: '',
        prompt_eval_count: 0,
        eval_count: 0,
      }));

      const response = await connector.query({ prompt: '' });
      assert.strictEqual(response.usage.totalTokens, 0);
    });

    test('should handle very long response', async () => {
      const longResponse = 'b'.repeat(100000);

      mockOllamaClient.generate.mock.mockImplementationOnce(async () => ({
        model: 'llama2',
        response: longResponse,
        eval_count: 50000,
      }));

      const response = await connector.query({ prompt: 'Test' });
      assert.strictEqual(response.content.length, 100000);
    });

    test('should preserve timestamp in standardized response', async () => {
      const beforeTime = Date.now();

      mockOllamaClient.generate.mock.mockImplementationOnce(async () => ({
        model: 'llama2',
        response: 'Response',
        eval_count: 10,
      }));

      const response = await connector.query({ prompt: 'Test' });
      const afterTime = Date.now();

      assert.ok(response.timestamp >= beforeTime);
      assert.ok(response.timestamp <= afterTime);
    });

    test('should handle responses with extra unexpected fields', async () => {
      mockOllamaClient.generate.mock.mockImplementationOnce(async () => ({
        model: 'llama2',
        response: 'Response',
        eval_count: 10,
        unexpected_field: 'unexpected_value',
        another_field: { nested: 'data' },
      }));

      const response = await connector.query({ prompt: 'Test' });
      assert.strictEqual(response.content, 'Response');
      assert.strictEqual(response.provider, 'ollama');
    });

    test('should handle mix of chat and generate parameters gracefully', async () => {
      mockOllamaClient.chat.mock.mockImplementationOnce(async () => ({
        model: 'llama2',
        message: { role: 'assistant', content: 'Chat response' },
        eval_count: 10,
      }));

      // Providing both messages (chat) should use chat format
      const response = await connector.query({
        prompt: 'This should be ignored',
        messages: [{ role: 'user', content: 'Actual message' }],
      });

      assert.strictEqual(response.content, 'Chat response');
      assert.ok(mockOllamaClient.chat.mock.calls.length === 1);
      assert.ok(mockOllamaClient.generate.mock.calls.length === 0);
    });
  });
});
