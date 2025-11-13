/**
 * LLM Bridge
 * Central hub for managing multiple LLM providers and routing requests
 */

import { OpenAIConnector } from './connectors/openai_connector.js';
import { GrokConnector } from './connectors/grok_connector.js';
import { OllamaConnector } from './connectors/ollama_connector.js';
import logger from './logger.js';

export class LLMBridge {
  constructor(config = {}) {
    this.config = config;
    this.connectors = new Map();
    this.defaultProvider = config.defaultProvider || 'openai';
    this.loadBalancing = config.loadBalancing || 'round-robin';
    this.currentProviderIndex = 0;

    this.initializeConnectors();
  }

  /**
   * Initialize all configured connectors
   */
  initializeConnectors() {
    const { providers = {} } = this.config;

    // Initialize OpenAI connector
    if (providers && providers.openai?.enabled) {
      try {
        this.connectors.set('openai', new OpenAIConnector(providers.openai));
        logger.info('[LLMBridge] OpenAI connector initialized');
      } catch (error) {
        logger.error('[LLMBridge] Failed to initialize OpenAI connector', { error: error.message });
      }
    }

    // Initialize Grok connector
    if (providers && providers.grok?.enabled) {
      try {
        this.connectors.set('grok', new GrokConnector(providers.grok));
        logger.info('[LLMBridge] Grok connector initialized');
      } catch (error) {
        logger.error('[LLMBridge] Failed to initialize Grok connector', { error: error.message });
      }
    }

    // Initialize Ollama connector
    if (providers && providers.ollama?.enabled) {
      try {
        this.connectors.set('ollama', new OllamaConnector(providers.ollama));
        logger.info('[LLMBridge] Ollama connector initialized');
      } catch (error) {
        logger.error('[LLMBridge] Failed to initialize Ollama connector', { error: error.message });
      }
    }

    if (this.connectors.size === 0) {
      logger.warn('[LLMBridge] No connectors initialized. Check your configuration.');
    }
  }

  /**
   * Query an LLM provider
   * @param {Object} options - Query options
   * @param {string} options.provider - Specific provider to use (optional)
   * @param {string} options.prompt - The prompt to send
   * @param {Array} options.messages - Array of messages for chat
   * @param {string} options.model - Model identifier
   * @param {number} options.temperature - Sampling temperature
   * @param {number} options.maxTokens - Maximum tokens to generate
   * @param {boolean} options.stream - Whether to stream the response
   * @returns {Promise<Object>} Response from the LLM
   */
  async query(options) {
    const provider = options.provider || this.selectProvider();
    const connector = this.connectors.get(provider);

    if (!connector) {
      throw new Error(`Provider "${provider}" is not available or not configured`);
    }

    try {
      const response = await connector.query(options);
      return {
        ...response,
        provider,
      };
    } catch (error) {
      logger.error(`[LLMBridge] Query failed for provider "${provider}"`, { error: error.message });

      // Attempt fallback to another provider if configured
      if (this.config.enableFallback && options.provider === undefined) {
        return await this.queryWithFallback(options, provider);
      }

      throw error;
    }
  }

  /**
   * Stream a query response
   * @param {Object} options - Query options
   * @returns {AsyncGenerator} Async generator yielding response chunks
   */
  async *streamQuery(options) {
    const provider = options.provider || this.selectProvider();
    const connector = this.connectors.get(provider);

    if (!connector) {
      throw new Error(`Provider "${provider}" is not available or not configured`);
    }

    try {
      for await (const chunk of connector.streamQuery(options)) {
        yield {
          ...chunk,
          provider,
        };
      }
    } catch (error) {
      logger.error(`[LLMBridge] Stream query failed for provider "${provider}"`, { error: error.message });
      throw error;
    }
  }

  /**
   * Query with automatic fallback to other providers
   * @param {Object} options - Query options
   * @param {string} failedProvider - Provider that failed
   * @returns {Promise<Object>} Response from fallback provider
   */
  async queryWithFallback(options, failedProvider) {
    const availableProviders = Array.from(this.connectors.keys()).filter(
      (p) => p !== failedProvider
    );

    for (const provider of availableProviders) {
      try {
        logger.info(`[LLMBridge] Attempting fallback to provider "${provider}"`);
        const connector = this.connectors.get(provider);
        const response = await connector.query(options);
        return {
          ...response,
          provider,
          fallback: true,
          originalProvider: failedProvider,
        };
      } catch (error) {
        logger.error(`[LLMBridge] Fallback provider "${provider}" also failed`, { error: error.message });
      }
    }

    throw new Error('All providers failed to respond');
  }

  /**
   * Select a provider based on load balancing strategy
   * @returns {string} Selected provider name
   */
  selectProvider() {
    const providers = Array.from(this.connectors.keys());

    if (providers.length === 0) {
      // Return default provider name even if not configured
      // The availability check will happen in query() method
      return this.defaultProvider;
    }

    if (providers.length === 1) {
      return providers[0];
    }

    switch (this.loadBalancing) {
      case 'round-robin':
        const provider = providers[this.currentProviderIndex % providers.length];
        this.currentProviderIndex++;
        return provider;

      case 'random':
        return providers[Math.floor(Math.random() * providers.length)];

      case 'default':
      default:
        return this.connectors.has(this.defaultProvider)
          ? this.defaultProvider
          : providers[0];
    }
  }

  /**
   * Get a specific connector
   * @param {string} provider - Provider name
   * @returns {BaseConnector} Connector instance
   */
  getConnector(provider) {
    return this.connectors.get(provider);
  }

  /**
   * Get all available providers
   * @returns {Array<string>} List of provider names
   */
  getAvailableProviders() {
    return Array.from(this.connectors.keys());
  }

  /**
   * Test all connector connections
   * @returns {Promise<Object>} Test results for all connectors
   */
  async testAllConnections() {
    const results = {};

    for (const [provider, connector] of this.connectors.entries()) {
      try {
        const isConnected = await connector.testConnection();
        results[provider] = {
          connected: isConnected,
          error: null,
        };
      } catch (error) {
        results[provider] = {
          connected: false,
          error: error.message,
        };
      }
    }

    return results;
  }

  /**
   * Get available models from all providers
   * @returns {Promise<Object>} Models grouped by provider
   */
  async getAllModels() {
    const models = {};

    for (const [provider, connector] of this.connectors.entries()) {
      try {
        models[provider] = await connector.getModels();
      } catch (error) {
        logger.error(`[LLMBridge] Failed to get models from "${provider}"`, { error: error.message });
        models[provider] = [];
      }
    }

    return models;
  }

  /**
   * Get bridge statistics
   * @returns {Object} Statistics about the bridge
   */
  getStats() {
    return {
      connectors: this.connectors.size,
      providers: Array.from(this.connectors.keys()),
      defaultProvider: this.defaultProvider,
      loadBalancing: this.loadBalancing,
    };
  }
}
