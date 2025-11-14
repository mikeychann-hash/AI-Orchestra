/**
 * Claude (Anthropic) Connector
 * Handles communication with Anthropic's Claude API
 */

import Anthropic from '@anthropic-ai/sdk';
import { BaseConnector } from '../base_connector.js';

export class ClaudeConnector extends BaseConnector {
  constructor(config = {}) {
    super({ ...config, provider: 'claude' });

    this.apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
    this.baseURL = config.baseURL || process.env.ANTHROPIC_BASE_URL;
    this.defaultModel = config.defaultModel || 'claude-3-5-sonnet-20241022';

    if (!this.apiKey) {
      throw new Error('Anthropic API key is required (ANTHROPIC_API_KEY or CLAUDE_API_KEY)');
    }

    this.client = new Anthropic({
      apiKey: this.apiKey,
      baseURL: this.baseURL,
      timeout: this.timeout,
    });
  }

  /**
   * Send a query to Claude
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Standardized response
   */
  async query(options) {
    return await this.withRetry(async () => {
      const {
        prompt,
        messages,
        model = this.defaultModel,
        temperature = 0.7,
        maxTokens = 4096,
        system,
        stream = false,
        ...otherOptions
      } = options;

      if (stream) {
        throw new Error('Use streamQuery() for streaming responses');
      }

      // Build messages array
      let messagesArray;
      if (messages) {
        // Convert OpenAI-style messages to Anthropic format
        messagesArray = messages.map(msg => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        }));
      } else {
        messagesArray = [{ role: 'user', content: prompt }];
      }

      const requestParams = {
        model,
        messages: messagesArray,
        max_tokens: maxTokens,
        temperature,
        ...otherOptions,
      };

      // Add system prompt if provided
      if (system) {
        requestParams.system = system;
      }

      const completion = await this.client.messages.create(requestParams);

      return this.standardizeResponse({
        content: completion.content[0].text,
        model: completion.model,
        usage: {
          promptTokens: completion.usage.input_tokens,
          completionTokens: completion.usage.output_tokens,
          totalTokens: completion.usage.input_tokens + completion.usage.output_tokens,
        },
        metadata: {
          finishReason: completion.stop_reason,
          id: completion.id,
          role: completion.role,
          type: completion.type,
        },
      });
    });
  }

  /**
   * Stream a query response from Claude
   * @param {Object} options - Query options
   * @returns {AsyncGenerator} Async generator yielding response chunks
   */
  async *streamQuery(options) {
    const {
      prompt,
      messages,
      model = this.defaultModel,
      temperature = 0.7,
      maxTokens = 4096,
      system,
      ...otherOptions
    } = options;

    // Build messages array
    let messagesArray;
    if (messages) {
      messagesArray = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }));
    } else {
      messagesArray = [{ role: 'user', content: prompt }];
    }

    const requestParams = {
      model,
      messages: messagesArray,
      max_tokens: maxTokens,
      temperature,
      stream: true,
      ...otherOptions,
    };

    if (system) {
      requestParams.system = system;
    }

    const stream = await this.client.messages.create(requestParams);

    let contentBuffer = '';
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        const delta = event.delta.text || '';
        contentBuffer += delta;

        yield this.standardizeStreamChunk({
          delta,
          content: contentBuffer,
          finishReason: null,
        });
      } else if (event.type === 'message_start') {
        totalInputTokens = event.message.usage.input_tokens;
      } else if (event.type === 'message_delta') {
        totalOutputTokens = event.usage.output_tokens;
      } else if (event.type === 'message_stop') {
        yield this.standardizeStreamChunk({
          delta: '',
          content: contentBuffer,
          finishReason: 'stop',
          usage: {
            promptTokens: totalInputTokens,
            completionTokens: totalOutputTokens,
            totalTokens: totalInputTokens + totalOutputTokens,
          },
        });
      }
    }
  }

  /**
   * Test the Claude API connection
   * @returns {Promise<boolean>} True if connection is successful
   */
  async testConnection() {
    try {
      await this.client.messages.create({
        model: this.defaultModel,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      });
      return true;
    } catch (error) {
      this.logger.error('[ClaudeConnector] Connection test failed', { error: error.message });
      return false;
    }
  }

  /**
   * Get available Claude models
   * @returns {Promise<Array>} List of available models
   */
  async getModels() {
    // Anthropic doesn't have a models list endpoint, return known models
    return [
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        contextWindow: 200000,
        maxOutputTokens: 8192,
        description: 'Most intelligent model, best for complex tasks',
      },
      {
        id: 'claude-3-5-haiku-20241022',
        name: 'Claude 3.5 Haiku',
        contextWindow: 200000,
        maxOutputTokens: 8192,
        description: 'Fastest model, best for quick responses',
      },
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        contextWindow: 200000,
        maxOutputTokens: 4096,
        description: 'Previous flagship model, very capable',
      },
      {
        id: 'claude-3-sonnet-20240229',
        name: 'Claude 3 Sonnet',
        contextWindow: 200000,
        maxOutputTokens: 4096,
        description: 'Balanced performance and speed',
      },
      {
        id: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        contextWindow: 200000,
        maxOutputTokens: 4096,
        description: 'Fastest and most compact model',
      },
    ];
  }
}
