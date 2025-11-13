/**
 * Base Connector Class
 * Abstract class that all LLM connectors must extend
 */

export class BaseConnector {
  constructor(config = {}) {
    if (new.target === BaseConnector) {
      throw new Error('BaseConnector is abstract and cannot be instantiated directly');
    }

    this.config = config;
    this.provider = config.provider || 'unknown';
    this.retryAttempts = config.retryAttempts || 3;
    this.retryDelay = config.retryDelay || 1000;
    this.timeout = config.timeout || 60000;
  }

  /**
   * Send a query to the LLM provider
   * @param {Object} options - Query options
   * @param {string} options.prompt - The prompt to send
   * @param {Array} options.messages - Array of messages for chat
   * @param {string} options.model - Model identifier
   * @param {number} options.temperature - Sampling temperature
   * @param {number} options.maxTokens - Maximum tokens to generate
   * @param {boolean} options.stream - Whether to stream the response
   * @returns {Promise<Object>} Response from the LLM
   */
  async query(options) {
    throw new Error('query() must be implemented by connector');
  }

  /**
   * Stream a query response from the LLM provider
   * @param {Object} options - Query options
   * @returns {AsyncGenerator} Async generator yielding response chunks
   */
  streamQuery(options) {
    throw new Error('streamQuery() must be implemented by connector');
  }

  /**
   * Validate the connector configuration
   * @returns {Object} Validation result { valid: boolean, errors: Array }
   */
  validateConfig() {
    throw new Error('validateConfig() must be implemented by connector');
  }

  /**
   * Test the connection to the provider
   * @returns {Promise<boolean>} True if connection is successful
   */
  async testConnection() {
    throw new Error('testConnection() must be implemented by connector');
  }

  /**
   * Get available models from the provider
   * @returns {Promise<Array>} List of available models
   */
  async getModels() {
    throw new Error('getModels() must be implemented by connector');
  }

  /**
   * Retry wrapper for API calls
   * @param {Function} fn - Function to retry
   * @param {number} attempts - Number of retry attempts
   * @returns {Promise<any>} Result of the function
   */
  async withRetry(fn, attempts = this.retryAttempts) {
    let lastError;

    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        if (i < attempts - 1) {
          const delay = this.retryDelay * Math.pow(2, i);
          console.warn(
            `[${this.provider}] Request failed (attempt ${i + 1}/${attempts}), retrying in ${delay}ms...`
          );
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  /**
   * Sleep utility for retries
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Standardize response format across providers
   * @param {Object} rawResponse - Raw response from provider
   * @returns {Object} Standardized response
   */
  standardizeResponse(rawResponse) {
    return {
      provider: this.provider,
      content: rawResponse.content || '',
      model: rawResponse.model || 'unknown',
      usage: rawResponse.usage || null,
      metadata: rawResponse.metadata || {},
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Handle errors consistently across connectors
   * @param {Error} error - The error object
   * @returns {Error} Formatted error
   */
  handleError(error) {
    const errorInfo = {
      provider: this.provider,
      message: error.message,
      code: error.code || 'UNKNOWN_ERROR',
      timestamp: new Date().toISOString(),
    };

    if (error.response) {
      errorInfo.status = error.response.status;
      errorInfo.statusText = error.response.statusText;
      errorInfo.data = error.response.data;
    }

    return new Error(JSON.stringify(errorInfo));
  }
}
