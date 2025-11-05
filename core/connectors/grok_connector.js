/**
 * Grok (xAI) Connector
 * Handles communication with xAI's Grok API
 */

import axios from 'axios';
import { BaseConnector } from '../base_connector.js';

export class GrokConnector extends BaseConnector {
  constructor(config = {}) {
    super({ ...config, provider: 'grok' });

    this.apiKey = config.apiKey || process.env.GROK_API_KEY || process.env.XAI_API_KEY;
    this.baseURL = config.baseURL || process.env.GROK_BASE_URL || 'https://api.x.ai/v1';
    this.defaultModel = config.defaultModel || 'grok-beta';

    if (!this.apiKey) {
      throw new Error('Grok API key is required');
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: this.timeout,
    });
  }

  /**
   * Send a query to Grok
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
        maxTokens = 2000,
        stream = false,
        ...otherOptions
      } = options;

      if (stream) {
        throw new Error('Use streamQuery() for streaming responses');
      }

      // Build messages array
      const messagesArray = messages || [{ role: 'user', content: prompt }];

      try {
        const response = await this.client.post('/chat/completions', {
          model,
          messages: messagesArray,
          temperature,
          max_tokens: maxTokens,
          stream: false,
          ...otherOptions,
        });

        const completion = response.data;

        return this.standardizeResponse({
          content: completion.choices[0].message.content,
          model: completion.model,
          usage: {
            promptTokens: completion.usage?.prompt_tokens || 0,
            completionTokens: completion.usage?.completion_tokens || 0,
            totalTokens: completion.usage?.total_tokens || 0,
          },
          metadata: {
            finishReason: completion.choices[0].finish_reason,
            id: completion.id,
            created: completion.created,
          },
        });
      } catch (error) {
        throw this.handleError(error);
      }
    });
  }

  /**
   * Stream a query response from Grok
   * @param {Object} options - Query options
   * @returns {AsyncGenerator} Async generator yielding response chunks
   */
  async *streamQuery(options) {
    const {
      prompt,
      messages,
      model = this.defaultModel,
      temperature = 0.7,
      maxTokens = 2000,
      ...otherOptions
    } = options;

    // Build messages array
    const messagesArray = messages || [{ role: 'user', content: prompt }];

    try {
      const response = await this.client.post(
        '/chat/completions',
        {
          model,
          messages: messagesArray,
          temperature,
          max_tokens: maxTokens,
          stream: true,
          ...otherOptions,
        },
        {
          responseType: 'stream',
        }
      );

      // Process the stream
      for await (const chunk of response.data) {
        const lines = chunk
          .toString()
          .split('\n')
          .filter((line) => line.trim().startsWith('data: '));

        for (const line of lines) {
          const data = line.replace('data: ', '').trim();

          if (data === '[DONE]') {
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices[0]?.delta;

            if (delta?.content) {
              yield {
                content: delta.content,
                model: parsed.model,
                finishReason: parsed.choices[0].finish_reason,
                id: parsed.id,
              };
            }
          } catch (parseError) {
            console.error('[Grok] Failed to parse stream chunk:', parseError.message);
          }
        }
      }
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Validate the connector configuration
   * @returns {Object} Validation result
   */
  validateConfig() {
    const errors = [];

    if (!this.apiKey) {
      errors.push('Grok API key is required');
    }

    if (!this.baseURL) {
      errors.push('Grok base URL is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Test the connection to Grok
   * @returns {Promise<boolean>} True if connection is successful
   */
  async testConnection() {
    try {
      // Try to list models or make a minimal request
      const response = await this.client.get('/models');
      return response.status === 200;
    } catch (error) {
      // If models endpoint doesn't exist, try a minimal chat completion
      try {
        await this.client.post('/chat/completions', {
          model: this.defaultModel,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 5,
        });
        return true;
      } catch (innerError) {
        console.error('[Grok] Connection test failed:', innerError.message);
        return false;
      }
    }
  }

  /**
   * Get available models from Grok
   * @returns {Promise<Array>} List of available models
   */
  async getModels() {
    try {
      const response = await this.client.get('/models');
      return response.data.data.map((model) => ({
        id: model.id,
        created: model.created,
        ownedBy: model.owned_by || 'xai',
      }));
    } catch (error) {
      console.error('[Grok] Failed to get models:', error.message);
      // Return default models if API doesn't support listing
      return [
        {
          id: 'grok-beta',
          created: Date.now(),
          ownedBy: 'xai',
        },
        {
          id: 'grok-1',
          created: Date.now(),
          ownedBy: 'xai',
        },
      ];
    }
  }

  /**
   * Get Grok system status
   * @returns {Promise<Object>} System status information
   */
  async getSystemStatus() {
    try {
      const response = await this.client.get('/status');
      return {
        status: 'operational',
        data: response.data,
      };
    } catch (error) {
      return {
        status: 'unknown',
        error: error.message,
      };
    }
  }
}
