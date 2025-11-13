import { LLMProvider } from '../types/agent.types.js';
import { ConfigManager } from './Config.js';
import { OpenAIClient } from '../connectors/openai.js';
import { GrokClient } from '../connectors/grok.js';
import { OllamaClient } from '../connectors/ollama.js';

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
        if (!openaiConfig) {
          throw new Error('OpenAI provider configuration not found. Please check your environment variables.');
        }
        if (!openaiConfig.apiKey) {
          throw new Error('OpenAI API key is missing. Please set OPENAI_API_KEY in your environment.');
        }
        client = new OpenAIClient(openaiConfig.apiKey, openaiConfig.baseURL);
        break;

      case LLMProvider.GROK:
        const grokConfig = config.getProviderConfig(LLMProvider.GROK);
        if (!grokConfig) {
          throw new Error('Grok provider configuration not found. Please check your environment variables.');
        }
        if (!grokConfig.apiKey) {
          throw new Error('Grok API key is missing. Please set GROK_API_KEY in your environment.');
        }
        client = new GrokClient(grokConfig.apiKey);
        break;

      case LLMProvider.OLLAMA:
        const ollamaConfig = config.getProviderConfig(LLMProvider.OLLAMA);
        if (!ollamaConfig) {
          throw new Error('Ollama provider configuration not found. Please check your environment variables.');
        }
        if (!ollamaConfig.endpoint) {
          throw new Error('Ollama endpoint is missing. Please set OLLAMA_ENDPOINT in your environment.');
        }
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
