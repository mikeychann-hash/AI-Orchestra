/**
 * ApiClient Tests
 * Comprehensive tests for API client functionality
 *
 * Coverage:
 * - CSRF token management
 * - HTTP methods (GET, POST, PUT, DELETE)
 * - Error handling
 * - Request/response handling
 * - Streaming functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../lib/api';

describe('ApiClient', () => {
  let apiClient: ApiClient;
  let fetchMock: any;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
    apiClient = new ApiClient('http://test-api.local');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default URL', () => {
      const client = new ApiClient();
      expect(client).toBeDefined();
    });

    it('should initialize with custom URL', () => {
      const customUrl = 'http://custom.api';
      const client = new ApiClient(customUrl);
      expect(client).toBeDefined();
    });

    it('should fetch CSRF token on initialization', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'test-token-123' }),
      });

      const client = new ApiClient('http://test.api');

      // Wait for async initialization
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(fetchMock).toHaveBeenCalledWith(
        'http://test.api/api/csrf-token',
        expect.objectContaining({
          credentials: 'include',
        })
      );
    });

    it('should handle CSRF token fetch failure gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      fetchMock.mockRejectedValueOnce(new Error('Network error'));

      const client = new ApiClient('http://test.api');

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to fetch CSRF token:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('GET Requests', () => {
    it('should make GET request without CSRF token', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'success' }),
      });

      const result = await apiClient.get('/api/test');

      expect(fetchMock).toHaveBeenCalledWith(
        'http://test-api.local/api/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          credentials: 'include',
        })
      );

      expect(result).toEqual({ data: 'success' });
    });

    it('should handle GET request errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ message: 'Resource not found' }),
      });

      await expect(apiClient.get('/api/missing')).rejects.toThrow(
        'Resource not found'
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle network errors in GET requests', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      fetchMock.mockRejectedValueOnce(new Error('Network failure'));

      await expect(apiClient.get('/api/test')).rejects.toThrow(
        'Network failure'
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('POST Requests', () => {
    it('should make POST request with CSRF token', async () => {
      // Mock CSRF token fetch
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'csrf-123' }),
      });

      // Wait for initialization
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Mock POST request
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const data = { prompt: 'test prompt' };
      await apiClient.post('/api/query', data);

      const postCall = fetchMock.mock.calls.find(
        (call: any) => call[1]?.method === 'POST'
      );

      expect(postCall).toBeDefined();
      expect(postCall[1].headers['X-CSRF-Token']).toBe('csrf-123');
      expect(postCall[1].body).toBe(JSON.stringify(data));
    });

    it('should retry POST request on CSRF token expiration', async () => {
      // Initial CSRF token
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'old-token' }),
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      // First POST fails with 403 CSRF error
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ message: 'CSRF token invalid' }),
      });

      // New CSRF token fetch
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'new-token' }),
      });

      // Retry POST succeeds
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const result = await apiClient.post('/api/query', { prompt: 'test' });

      expect(result).toEqual({ success: true });
      expect(fetchMock).toHaveBeenCalledTimes(4); // csrf + post + csrf + retry
    });

    it('should handle POST request with empty body', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'token' }),
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await apiClient.post('/api/action');

      const postCall = fetchMock.mock.calls.find(
        (call: any) => call[1]?.method === 'POST'
      );

      expect(postCall[1].body).toBe(JSON.stringify(undefined));
    });

    it('should handle POST request errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'token' }),
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ message: 'Invalid input' }),
      });

      await expect(
        apiClient.post('/api/query', { invalid: 'data' })
      ).rejects.toThrow('Invalid input');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('PUT Requests', () => {
    it('should make PUT request with CSRF token', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'token-put' }),
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ updated: true }),
      });

      const data = { field: 'value' };
      const result = await apiClient.put('/api/resource/1', data);

      const putCall = fetchMock.mock.calls.find(
        (call: any) => call[1]?.method === 'PUT'
      );

      expect(putCall).toBeDefined();
      expect(putCall[1].headers['X-CSRF-Token']).toBe('token-put');
      expect(result).toEqual({ updated: true });
    });

    it('should handle PUT request errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'token' }),
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ message: 'Resource not found' }),
      });

      await expect(
        apiClient.put('/api/resource/999', { field: 'value' })
      ).rejects.toThrow('Resource not found');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('DELETE Requests', () => {
    it('should make DELETE request with CSRF token', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'token-delete' }),
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ deleted: true }),
      });

      const result = await apiClient.delete('/api/resource/1');

      const deleteCall = fetchMock.mock.calls.find(
        (call: any) => call[1]?.method === 'DELETE'
      );

      expect(deleteCall).toBeDefined();
      expect(deleteCall[1].headers['X-CSRF-Token']).toBe('token-delete');
      expect(result).toEqual({ deleted: true });
    });
  });

  describe('API Methods', () => {
    beforeEach(async () => {
      // Mock CSRF token for all API methods
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'test-token' }),
      });
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    it('should call getHealth endpoint', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'healthy',
          timestamp: '2024-01-01T00:00:00Z',
          uptime: 1000,
        }),
      });

      const health = await apiClient.getHealth();

      expect(health).toEqual({
        status: 'healthy',
        timestamp: '2024-01-01T00:00:00Z',
        uptime: 1000,
      });
    });

    it('should call getStatus endpoint', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'running' }),
      });

      const status = await apiClient.getStatus();

      expect(status).toEqual({ status: 'running' });
    });

    it('should call getProviders endpoint', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ providers: ['openai', 'grok', 'ollama'] }),
      });

      const providers = await apiClient.getProviders();

      expect(providers).toEqual({
        providers: ['openai', 'grok', 'ollama'],
      });
    });

    it('should call getModels endpoint', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [
            { id: 'gpt-4', provider: 'openai' },
            { id: 'grok-1', provider: 'grok' },
          ],
        }),
      });

      const models = await apiClient.getModels();

      expect(models).toEqual({
        models: [
          { id: 'gpt-4', provider: 'openai' },
          { id: 'grok-1', provider: 'grok' },
        ],
      });
    });

    it('should call query endpoint with correct parameters', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: 'AI response',
          provider: 'openai',
        }),
      });

      const queryData = {
        prompt: 'Hello, AI!',
        provider: 'openai',
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 150,
      };

      const result = await apiClient.query(queryData);

      const queryCall = fetchMock.mock.calls.find(
        (call: any) => call[0].includes('/api/query')
      );

      expect(queryCall[1].body).toBe(JSON.stringify(queryData));
      expect(result).toEqual({
        response: 'AI response',
        provider: 'openai',
      });
    });
  });

  describe('Streaming', () => {
    it('should create async generator for streaming', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'stream-token' }),
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type":"content","data":"Hello"}\n\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: [DONE]\n\n'),
          })
          .mockResolvedValueOnce({ done: true }),
        releaseLock: vi.fn(),
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      const generator = apiClient.streamQueryPost({ prompt: 'test' });
      const chunks: any[] = [];

      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(2);
      expect(chunks[0]).toEqual({
        type: 'content',
        data: 'Hello',
      });
      expect(chunks[1]).toEqual({ type: 'done' });
      expect(mockReader.releaseLock).toHaveBeenCalled();
    });

    it('should handle streaming errors', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'token' }),
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const generator = apiClient.streamQueryPost({ prompt: 'test' });

      await expect(async () => {
        for await (const chunk of generator) {
          // Should throw before yielding
        }
      }).rejects.toThrow('HTTP 500: Internal Server Error');
    });

    it('should handle streaming with null body', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'token' }),
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      fetchMock.mockResolvedValueOnce({
        ok: true,
        body: null,
      });

      const generator = apiClient.streamQueryPost({ prompt: 'test' });

      await expect(async () => {
        for await (const chunk of generator) {
          // Should throw
        }
      }).rejects.toThrow('Response body is null');
    });

    it('should handle malformed SSE data in stream', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'token' }),
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: invalid json{\n\n'),
          })
          .mockResolvedValueOnce({ done: true }),
        releaseLock: vi.fn(),
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      const generator = apiClient.streamQueryPost({ prompt: 'test' });
      const chunks: any[] = [];

      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      expect(chunks.some((c) => c.type === 'error')).toBe(true);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should handle multi-chunk SSE messages', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'token' }),
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              'data: {"type":"content","data":"Part1"}\n\ndata: {"type":"content","data":"Part2"}\n\n'
            ),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: [DONE]\n\n'),
          })
          .mockResolvedValueOnce({ done: true }),
        releaseLock: vi.fn(),
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      const generator = apiClient.streamQueryPost({ prompt: 'test' });
      const chunks: any[] = [];

      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(3);
      expect(chunks[0].data).toBe('Part1');
      expect(chunks[1].data).toBe('Part2');
      expect(chunks[2].type).toBe('done');
    });

    it('should deprecate old streamQuery method', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      apiClient.streamQuery({ prompt: 'test' });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('streamQuery is deprecated')
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('CSRF Token Management', () => {
    it('should cache CSRF token after first fetch', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'cached-token' }),
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      // Make multiple POST requests
      await apiClient.post('/api/test1', {});
      await apiClient.post('/api/test2', {});

      // Should only fetch CSRF token once (during init)
      const csrfCalls = fetchMock.mock.calls.filter((call: any) =>
        call[0].includes('csrf-token')
      );

      expect(csrfCalls).toHaveLength(1);
    });

    it('should refetch CSRF token on 403 error', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'old-token' }),
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      // First request fails with 403
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ message: 'CSRF token expired' }),
      });

      // Refetch CSRF token
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'new-token' }),
      });

      // Retry succeeds
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await apiClient.post('/api/test', {});

      const csrfCalls = fetchMock.mock.calls.filter((call: any) =>
        call[0].includes('csrf-token')
      );

      expect(csrfCalls).toHaveLength(2); // Initial + refetch
    });

    it('should not add CSRF token to GET requests', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'token' }),
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' }),
      });

      await apiClient.get('/api/test');

      const getCall = fetchMock.mock.calls.find(
        (call: any) =>
          call[0].includes('/api/test') && call[1]?.method === 'GET'
      );

      expect(getCall[1].headers['X-CSRF-Token']).toBeUndefined();
    });
  });

  describe('Error Response Handling', () => {
    beforeEach(async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'token' }),
      });
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    it('should handle JSON error responses', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ message: 'Validation failed' }),
      });

      await expect(apiClient.get('/api/test')).rejects.toThrow(
        'Validation failed'
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle non-JSON error responses', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => {
          throw new Error('Not JSON');
        },
      });

      await expect(apiClient.get('/api/test')).rejects.toThrow(
        'HTTP 500: Internal Server Error'
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle empty error responses', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({}),
      });

      await expect(apiClient.get('/api/test')).rejects.toThrow(
        'HTTP 404: Not Found'
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
