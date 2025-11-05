const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

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

  // Stream query (returns EventSource)
  streamQuery(data: any): EventSource {
    const params = new URLSearchParams({ data: JSON.stringify(data) });
    return new EventSource(`${this.baseUrl}/api/stream?${params}`);
  }
}

export const api = new ApiClient();
