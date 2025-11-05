import OpenAI from 'openai';
import { LLMProvider } from '../types/agent.types.js';
import { ConfigManager } from './Config.js';

/**
 * Message format for LLM interactions
 */
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * LLM Request Options
 */
export interface LLMRequestOptions {
  model: string;
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
  tools?: any[];
  toolChoice?: 'auto' | 'required' | 'none';
}

/**
 * LLM Response
 */
export interface LLMResponse {
  content: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: string;
  }>;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Base LLM Client Interface
 */
export interface ILLMClient {
  complete(options: LLMRequestOptions): Promise<LLMResponse>;
}

/**
 * OpenAI Client Implementation
 */
class OpenAIClient implements ILLMClient {
  private client: OpenAI;

  constructor(apiKey?: string, baseURL?: string) {
    this.client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
      baseURL,
    });
  }

  async complete(options: LLMRequestOptions): Promise<LLMResponse> {
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
  }
}

/**
 * Grok Client Implementation (using OpenAI-compatible API)
 */
class GrokClient implements ILLMClient {
  private client: OpenAI;

  constructor(apiKey?: string) {
    this.client = new OpenAI({
      apiKey: apiKey || process.env.GROK_API_KEY,
      baseURL: 'https://api.x.ai/v1',
    });
  }

  async complete(options: LLMRequestOptions): Promise<LLMResponse> {
    const response = await this.client.chat.completions.create({
      model: options.model,
      messages: options.messages as any,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
    });

    const choice = response.choices[0];
    const message = choice.message;

    return {
      content: message.content || '',
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
    };
  }
}

/**
 * Ollama Client Implementation
 */
class OllamaClient implements ILLMClient {
  private endpoint: string;

  constructor(endpoint?: string) {
    this.endpoint = endpoint || process.env.OLLAMA_ENDPOINT || 'http://localhost:11434';
  }

  async complete(options: LLMRequestOptions): Promise<LLMResponse> {
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
      throw new Error(`Ollama request failed: ${response.statusText}`);
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
  }
}

/**
 * LLM Client Factory
 */
export class LLMClientFactory {
  private static clients: Map<LLMProvider, ILLMClient> = new Map();

  /**
   * Get or create a client for the specified provider
   */
  static getClient(provider: LLMProvider): ILLMClient {
    if (this.clients.has(provider)) {
      return this.clients.get(provider)!;
    }

    const config = ConfigManager.getInstance();
    let client: ILLMClient;

    switch (provider) {
      case LLMProvider.OPENAI:
        const openaiConfig = config.getProviderConfig(LLMProvider.OPENAI);
        client = new OpenAIClient(openaiConfig.apiKey, openaiConfig.baseURL);
        break;

      case LLMProvider.GROK:
        const grokConfig = config.getProviderConfig(LLMProvider.GROK);
        client = new GrokClient(grokConfig.apiKey);
        break;

      case LLMProvider.OLLAMA:
        const ollamaConfig = config.getProviderConfig(LLMProvider.OLLAMA);
        client = new OllamaClient(ollamaConfig.endpoint);
        break;

      case LLMProvider.ANTHROPIC:
        throw new Error('Anthropic client not yet implemented');

      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }

    this.clients.set(provider, client);
    return client;
  }

  /**
   * Clear cached clients (useful for testing or config changes)
   */
  static clearCache(): void {
    this.clients.clear();
  }
}
