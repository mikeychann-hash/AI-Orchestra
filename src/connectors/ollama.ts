import { ILLMClient, LLMRequestOptions, LLMResponse } from '../core/LLMClient.js';

/**
 * Ollama Model Information
 */
export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    format: string;
    family: string;
    parameter_size: string;
    quantization_level: string;
  };
}

/**
 * Ollama Client Implementation
 *
 * Connects to local or remote Ollama instances.
 * Supports all Ollama models including:
 * - qwen2.5:1.5b (Frontend dev)
 * - mistral:7b (Backend dev)
 * - codellama:13b (QA)
 * - And any other model you've pulled
 *
 * Default endpoint: http://localhost:11434
 * Set OLLAMA_ENDPOINT to override
 */
export class OllamaClient implements ILLMClient {
  private readonly endpoint: string;

  constructor(endpoint?: string) {
    this.endpoint = endpoint || process.env.OLLAMA_ENDPOINT || 'http://localhost:11434';
  }

  /**
   * Send a completion request to Ollama
   */
  async complete(options: LLMRequestOptions): Promise<LLMResponse> {
    try {
      const response = await fetch(`${this.endpoint}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: options.model,
          messages: options.messages,
          stream: false,
          options: {
            temperature: options.temperature,
            num_predict: options.maxTokens,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama request failed (${response.status}): ${errorText}`);
      }

      const data = await response.json();

      return {
        content: data.message?.content || '',
        usage: {
          promptTokens: data.prompt_eval_count || 0,
          completionTokens: data.eval_count || 0,
          totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Ollama request failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Test connection to Ollama instance
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.endpoint}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * List all available models on the Ollama instance
   */
  async listModels(): Promise<OllamaModel[]> {
    try {
      const response = await fetch(`${this.endpoint}/api/tags`);
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }

      const data = await response.json();
      return data.models || [];
    } catch (error) {
      console.error('Failed to list Ollama models:', error);
      return [];
    }
  }

  /**
   * Get model names only
   */
  async getModelNames(): Promise<string[]> {
    const models = await this.listModels();
    return models.map((m) => m.name);
  }

  /**
   * Pull a model from Ollama registry
   */
  async pullModel(modelName: string): Promise<void> {
    try {
      const response = await fetch(`${this.endpoint}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: modelName,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to pull model: ${response.statusText}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to pull model ${modelName}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Check if a specific model exists locally
   */
  async hasModel(modelName: string): Promise<boolean> {
    const models = await this.getModelNames();
    return models.includes(modelName);
  }

  /**
   * Delete a model from local storage
   */
  async deleteModel(modelName: string): Promise<void> {
    try {
      const response = await fetch(`${this.endpoint}/api/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: modelName,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to delete model: ${response.statusText}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to delete model ${modelName}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get Ollama server version
   */
  async getVersion(): Promise<string> {
    try {
      const response = await fetch(`${this.endpoint}/api/version`);
      if (!response.ok) {
        return 'unknown';
      }
      const data = await response.json();
      return data.version || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Get the endpoint being used
   */
  getEndpoint(): string {
    return this.endpoint;
  }

  /**
   * Get recommended models for AI Orchestra
   */
  getRecommendedModels(): { role: string; model: string; description: string }[] {
    return [
      {
        role: 'Frontend Development',
        model: 'qwen2.5:1.5b',
        description: 'Lightweight model for React/Tailwind component generation',
      },
      {
        role: 'Backend Development',
        model: 'mistral:7b',
        description: 'Balanced model for Express API route creation',
      },
      {
        role: 'QA & Testing',
        model: 'codellama:13b',
        description: 'Code-specialized model for testing and review',
      },
    ];
  }

  /**
   * Ensure required models are available
   */
  async ensureModels(modelNames: string[]): Promise<{ model: string; available: boolean }[]> {
    const results = [];
    const availableModels = await this.getModelNames();

    for (const modelName of modelNames) {
      results.push({
        model: modelName,
        available: availableModels.includes(modelName),
      });
    }

    return results;
  }
}
