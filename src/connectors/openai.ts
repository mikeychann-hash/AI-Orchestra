import OpenAI from 'openai';
import { ILLMClient, LLMRequestOptions, LLMResponse } from '../core/LLMClient.js';

/**
 * OpenAI Client Implementation
 *
 * Supports all OpenAI models including:
 * - GPT-4 Turbo
 * - GPT-4
 * - GPT-3.5 Turbo
 * - Custom deployments via baseURL
 */
export class OpenAIClient implements ILLMClient {
  private client: OpenAI;
  private readonly apiKey: string;
  private readonly baseURL?: string;

  constructor(apiKey?: string, baseURL?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
    this.baseURL = baseURL;

    if (!this.apiKey) {
      throw new Error('OpenAI API key is required. Set OPENAI_API_KEY environment variable.');
    }

    this.client = new OpenAI({
      apiKey: this.apiKey,
      baseURL: this.baseURL,
    });
  }

  /**
   * Send a completion request to OpenAI
   */
  async complete(options: LLMRequestOptions): Promise<LLMResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model: options.model,
        messages: options.messages as any,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        tools: options.tools,
        tool_choice: options.toolChoice,
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
        throw new Error(`OpenAI request failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Test connection to OpenAI API
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await this.client.models.list();
      return response.data.map((model) => model.id);
    } catch (error) {
      console.error('Failed to list OpenAI models:', error);
      return [];
    }
  }

  /**
   * Get the configured API key (masked for security)
   */
  getApiKeyMasked(): string {
    if (!this.apiKey) return 'Not set';
    return `${this.apiKey.substring(0, 7)}...${this.apiKey.substring(this.apiKey.length - 4)}`;
  }

  /**
   * Get the base URL being used
   */
  getBaseURL(): string {
    return this.baseURL || 'https://api.openai.com/v1';
  }
}
