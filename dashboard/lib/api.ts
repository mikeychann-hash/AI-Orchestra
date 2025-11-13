const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface StreamChunk {
  type: 'content' | 'metadata' | 'error' | 'done';
  data?: any;
  error?: string;
}

export class ApiClient {
  private baseUrl: string;
  private csrfToken: string | null = null;

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl;
    this.initializeCsrfToken();
  }

  /**
   * Fetch CSRF token on initialization
   */
  private async initializeCsrfToken(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/csrf-token`, {
        credentials: 'include',
      });
      const data = await response.json();
      this.csrfToken = data.csrfToken;
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error);
    }
  }

  /**
   * Get current CSRF token (fetch if not cached)
   */
  private async getCsrfToken(): Promise<string> {
    if (!this.csrfToken) {
      await this.initializeCsrfToken();
    }
    return this.csrfToken || '';
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    // Add CSRF token to state-changing requests
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options?.headers,
    };

    if (options?.method && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method)) {
      const csrfToken = await this.getCsrfToken();
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include', // Include cookies for CSRF
      });

      // If CSRF token expired, refresh and retry
      if (response.status === 403) {
        const error = await response.json().catch(() => ({}));
        if (error.message?.includes('CSRF token')) {
          this.csrfToken = null; // Clear cached token
          const newToken = await this.getCsrfToken();
          headers['X-CSRF-Token'] = newToken;

          // Retry request
          const retryResponse = await fetch(url, {
            ...options,
            headers,
            credentials: 'include',
          });

          if (!retryResponse.ok) {
            const retryError = await retryResponse.json().catch(() => ({}));
            throw new Error(retryError.message || `HTTP ${retryResponse.status}: ${retryResponse.statusText}`);
          }

          return retryResponse.json();
        }
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Health check
  async getHealth() {
    return this.get<{ status: string; timestamp: string; uptime: number }>('/health');
  }

  // System status
  async getStatus() {
    return this.get<any>('/api/status');
  }

  // Providers
  async getProviders() {
    return this.get<{ providers: string[] }>('/api/providers');
  }

  // Models
  async getModels() {
    return this.get<any>('/api/models');
  }

  // Query LLM
  async query(data: {
    prompt: string;
    provider?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }) {
    return this.post<any>('/api/query', data);
  }

  /**
   * Stream query using EventSource with GET (DEPRECATED)
   * @deprecated Use streamQueryPost instead - GET exposes data in URLs
   */
  streamQuery(data: any): EventSource {
    console.warn('streamQuery is deprecated - URLs expose sensitive data. Use streamQueryPost instead.');
    const params = new URLSearchParams({ data: JSON.stringify(data) });
    return new EventSource(`${this.baseUrl}/api/stream?${params}`);
  }

  /**
   * Stream query using POST with Fetch API (Recommended)
   * Secure alternative that doesn't expose data in URLs
   */
  async *streamQueryPost(data: {
    prompt: string;
    provider?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }): AsyncGenerator<StreamChunk> {
    const csrfToken = await this.getCsrfToken();

    const response = await fetch(`${this.baseUrl}/api/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify(data),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        // Decode chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages (split by \n\n)
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || ''; // Keep incomplete message in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();

            if (data === '[DONE]') {
              yield { type: 'done' };
              return;
            }

            try {
              const parsed = JSON.parse(data);
              yield {
                type: parsed.type || 'content',
                data: parsed.data || parsed,
              };
            } catch (error) {
              console.error('Failed to parse SSE data:', error);
              yield {
                type: 'error',
                error: `Failed to parse stream data: ${error}`,
              };
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

export const api = new ApiClient();
