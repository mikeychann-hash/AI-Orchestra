import OpenAI from 'openai';
import { ILLMClient, LLMRequestOptions, LLMResponse } from '../core/LLMClient.js';

/**
 * Grok (xAI) Client Implementation
 *
 * Uses OpenAI-compatible API endpoint from xAI.
 * Supports Grok models including:
 * - grok-beta
 * - grok-2 (when available)
 *
 * Note: Grok API is currently in beta and requires xAI API key.
 * Get your key from: https://console.x.ai/
 */
export class GrokClient implements ILLMClient {
  private client: OpenAI;
  private readonly apiKey: string;
  private readonly baseURL = 'https://api.x.ai/v1';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GROK_API_KEY || '';

    if (!this.apiKey) {
      throw new Error('Grok API key is required. Set GROK_API_KEY environment variable or get one from https://console.x.ai/');
    }

    this.client = new OpenAI({
      apiKey: this.apiKey,
      baseURL: this.baseURL,
    });
  }

  /**
   * Send a completion request to Grok (xAI)
   */
  async complete(options: LLMRequestOptions): Promise<LLMResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model: options.model,
        messages: options.messages as any,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        // Note: Grok may not support all OpenAI features like tools
      });

      const choice = response.choices[0];
      const message = choice.message;

      return {
        content: message.content || '',
        toolCalls: message.tool_calls?.map((tc) => ({
          id: tc.id,
          name: tc.function.name,
          arguments: tc.function.arguments,
        })),
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Grok request failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Test connection to Grok API
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.complete({
        model: 'grok-beta',
        messages: [{ role: 'user', content: 'test' }],
        maxTokens: 5,
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List available models (Grok-specific)
   */
  async listModels(): Promise<string[]> {
    // Grok currently has limited models, return known ones
    // In future, this could query the API if they add a models endpoint
    return ['grok-beta'];
  }

  /**
   * Get the configured API key (masked for security)
   */
  getApiKeyMasked(): string {
    if (!this.apiKey) return 'Not set';
    return `xai-${this.apiKey.substring(4, 8)}...${this.apiKey.substring(this.apiKey.length - 4)}`;
  }

  /**
   * Get the base URL being used
   */
  getBaseURL(): string {
    return this.baseURL;
  }

  /**
   * Get Grok-specific capabilities
   */
  getCapabilities(): {
    supportsToolCalling: boolean;
    supportsStreaming: boolean;
    maxContextWindow: number;
  } {
    return {
      supportsToolCalling: false, // Grok may not support this yet
      supportsStreaming: true,
      maxContextWindow: 131072, // 128k tokens for grok-beta
    };
  }
}
