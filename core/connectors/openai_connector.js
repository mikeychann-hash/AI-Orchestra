/**
 * OpenAI Connector
 * Handles communication with OpenAI's API
 */

import OpenAI from 'openai';
import { BaseConnector } from '../base_connector.js';

export class OpenAIConnector extends BaseConnector {
  constructor(config = {}) {
    super({ ...config, provider: 'openai' });

    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    this.organization = config.organization || process.env.OPENAI_ORGANIZATION;
    this.baseURL = config.baseURL || process.env.OPENAI_BASE_URL;
    this.defaultModel = config.defaultModel || 'gpt-4-turbo-preview';

    if (!this.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.client = new OpenAI({
      apiKey: this.apiKey,
      organization: this.organization,
      baseURL: this.baseURL,
      timeout: this.timeout,
    });
  }

  /**
   * Send a query to OpenAI
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

      const completion = await this.client.chat.completions.create({
        model,
        messages: messagesArray,
        temperature,
        max_tokens: maxTokens,
        ...otherOptions,
      });

      return this.standardizeResponse({
        content: completion.choices[0].message.content,
        model: completion.model,
        usage: {
          promptTokens: completion.usage.prompt_tokens,
          completionTokens: completion.usage.completion_tokens,
          totalTokens: completion.usage.total_tokens,
        },
        metadata: {
          finishReason: completion.choices[0].finish_reason,
          id: completion.id,
          created: completion.created,
        },
      });
    });
  }

  /**
   * Stream a query response from OpenAI
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

    const stream = await this.client.chat.completions.create({
      model,
      messages: messagesArray,
      temperature,
      max_tokens: maxTokens,
      stream: true,
      ...otherOptions,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;

      if (delta?.content) {
        yield {
          content: delta.content,
          model: chunk.model,
          finishReason: chunk.choices[0].finish_reason,
          id: chunk.id,
        };
      }
    }
  }

  /**
   * Validate the connector configuration
   * @returns {Object} Validation result
   */
  validateConfig() {
    const errors = [];

    if (!this.apiKey) {
      errors.push('OpenAI API key is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Test the connection to OpenAI
   * @returns {Promise<boolean>} True if connection is successful
   */
  async testConnection() {
    try {
      await this.client.models.list();
      return true;
    } catch (error) {
      console.error('[OpenAI] Connection test failed:', error.message);
      return false;
    }
  }

  /**
   * Get available models from OpenAI
   * @returns {Promise<Array>} List of available models
   */
  async getModels() {
    try {
      const response = await this.client.models.list();
      return response.data
        .filter((model) => model.id.includes('gpt'))
        .map((model) => ({
          id: model.id,
          created: model.created,
          ownedBy: model.owned_by,
        }))
        .sort((a, b) => b.created - a.created);
    } catch (error) {
      console.error('[OpenAI] Failed to get models:', error.message);
      return [];
    }
  }

  /**
   * Generate embeddings using OpenAI
   * @param {string|Array<string>} input - Text to embed
   * @param {string} model - Embedding model to use
   * @returns {Promise<Array>} Array of embeddings
   */
  async createEmbeddings(input, model = 'text-embedding-3-small') {
    return await this.withRetry(async () => {
      const response = await this.client.embeddings.create({
        model,
        input,
      });

      return response.data.map((item) => ({
        embedding: item.embedding,
        index: item.index,
      }));
    });
  }

  /**
   * Generate images using DALL-E
   * @param {Object} options - Image generation options
   * @returns {Promise<Array>} Array of generated image URLs
   */
  async generateImage(options) {
    return await this.withRetry(async () => {
      const {
        prompt,
        model = 'dall-e-3',
        size = '1024x1024',
        quality = 'standard',
        n = 1,
      } = options;

      const response = await this.client.images.generate({
        model,
        prompt,
        size,
        quality,
        n,
      });

      return response.data.map((item) => ({
        url: item.url,
        revisedPrompt: item.revised_prompt,
      }));
    });
  }
}
