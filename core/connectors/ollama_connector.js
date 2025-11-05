/**
 * Ollama Connector
 * Handles communication with local Ollama instance
 */

import { Ollama } from 'ollama';
import { BaseConnector } from '../base_connector.js';

export class OllamaConnector extends BaseConnector {
  constructor(config = {}) {
    super({ ...config, provider: 'ollama' });

    this.host = config.host || process.env.OLLAMA_HOST || 'http://localhost:11434';
    this.defaultModel = config.defaultModel || 'llama2';

    this.client = new Ollama({
      host: this.host,
    });
  }

  /**
   * Send a query to Ollama
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
        stream = false,
        ...otherOptions
      } = options;

      if (stream) {
        throw new Error('Use streamQuery() for streaming responses');
      }

      try {
        let response;

        if (messages) {
          // Use chat format
          response = await this.client.chat({
            model,
            messages,
            stream: false,
            options: {
              temperature,
              ...otherOptions,
            },
          });

          return this.standardizeResponse({
            content: response.message.content,
            model: response.model,
            usage: {
              promptTokens: response.prompt_eval_count || 0,
              completionTokens: response.eval_count || 0,
              totalTokens: (response.prompt_eval_count || 0) + (response.eval_count || 0),
            },
            metadata: {
              totalDuration: response.total_duration,
              loadDuration: response.load_duration,
              evalDuration: response.eval_duration,
              createdAt: response.created_at,
            },
          });
        } else {
          // Use generate format
          response = await this.client.generate({
            model,
            prompt,
            stream: false,
            options: {
              temperature,
              ...otherOptions,
            },
          });

          return this.standardizeResponse({
            content: response.response,
            model: response.model,
            usage: {
              promptTokens: response.prompt_eval_count || 0,
              completionTokens: response.eval_count || 0,
              totalTokens: (response.prompt_eval_count || 0) + (response.eval_count || 0),
            },
            metadata: {
              totalDuration: response.total_duration,
              loadDuration: response.load_duration,
              evalDuration: response.eval_duration,
              createdAt: response.created_at,
              context: response.context,
            },
          });
        }
      } catch (error) {
        throw this.handleError(error);
      }
    });
  }

  /**
   * Stream a query response from Ollama
   * @param {Object} options - Query options
   * @returns {AsyncGenerator} Async generator yielding response chunks
   */
  async *streamQuery(options) {
    const {
      prompt,
      messages,
      model = this.defaultModel,
      temperature = 0.7,
      ...otherOptions
    } = options;

    try {
      if (messages) {
        // Use chat format with streaming
        const stream = await this.client.chat({
          model,
          messages,
          stream: true,
          options: {
            temperature,
            ...otherOptions,
          },
        });

        for await (const chunk of stream) {
          if (chunk.message?.content) {
            yield {
              content: chunk.message.content,
              model: chunk.model,
              done: chunk.done,
            };
          }
        }
      } else {
        // Use generate format with streaming
        const stream = await this.client.generate({
          model,
          prompt,
          stream: true,
          options: {
            temperature,
            ...otherOptions,
          },
        });

        for await (const chunk of stream) {
          if (chunk.response) {
            yield {
              content: chunk.response,
              model: chunk.model,
              done: chunk.done,
            };
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

    if (!this.host) {
      errors.push('Ollama host is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Test the connection to Ollama
   * @returns {Promise<boolean>} True if connection is successful
   */
  async testConnection() {
    try {
      await this.client.list();
      return true;
    } catch (error) {
      console.error('[Ollama] Connection test failed:', error.message);
      return false;
    }
  }

  /**
   * Get available models from Ollama
   * @returns {Promise<Array>} List of available models
   */
  async getModels() {
    try {
      const response = await this.client.list();
      return response.models.map((model) => ({
        id: model.name,
        size: model.size,
        digest: model.digest,
        modifiedAt: model.modified_at,
        details: model.details,
      }));
    } catch (error) {
      console.error('[Ollama] Failed to get models:', error.message);
      return [];
    }
  }

  /**
   * Pull a model from Ollama registry
   * @param {string} modelName - Name of the model to pull
   * @returns {AsyncGenerator} Progress updates
   */
  async *pullModel(modelName) {
    try {
      const stream = await this.client.pull({
        model: modelName,
        stream: true,
      });

      for await (const chunk of stream) {
        yield {
          status: chunk.status,
          digest: chunk.digest,
          total: chunk.total,
          completed: chunk.completed,
        };
      }
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Delete a model from local Ollama instance
   * @param {string} modelName - Name of the model to delete
   * @returns {Promise<boolean>} True if deletion was successful
   */
  async deleteModel(modelName) {
    try {
      await this.client.delete({
        model: modelName,
      });
      return true;
    } catch (error) {
      console.error('[Ollama] Failed to delete model:', error.message);
      return false;
    }
  }

  /**
   * Get model information
   * @param {string} modelName - Name of the model
   * @returns {Promise<Object>} Model information
   */
  async getModelInfo(modelName) {
    try {
      const response = await this.client.show({
        model: modelName,
      });
      return response;
    } catch (error) {
      console.error('[Ollama] Failed to get model info:', error.message);
      return null;
    }
  }

  /**
   * Generate embeddings using Ollama
   * @param {string} text - Text to embed
   * @param {string} model - Model to use for embeddings
   * @returns {Promise<Array>} Embedding vector
   */
  async createEmbeddings(text, model = this.defaultModel) {
    return await this.withRetry(async () => {
      try {
        const response = await this.client.embeddings({
          model,
          prompt: text,
        });

        return response.embedding;
      } catch (error) {
        throw this.handleError(error);
      }
    });
  }

  /**
   * Copy a model
   * @param {string} source - Source model name
   * @param {string} destination - Destination model name
   * @returns {Promise<boolean>} True if copy was successful
   */
  async copyModel(source, destination) {
    try {
      await this.client.copy({
        source,
        destination,
      });
      return true;
    } catch (error) {
      console.error('[Ollama] Failed to copy model:', error.message);
      return false;
    }
  }
}
