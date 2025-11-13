/**
 * Configuration Manager
 * Handles loading and validation of configuration from environment variables and settings files
 */

import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

export class ConfigManager {
  constructor(options = {}) {
    this.envPath = options.envPath || '.env';
    this.settingsPath = options.settingsPath || './config/settings.json';
    this.config = {};

    this.loadConfig();
  }

  /**
   * Load configuration from environment and settings files
   */
  loadConfig() {
    // Load environment variables
    dotenv.config({ path: this.envPath });

    // Load settings.json
    try {
      const settingsContent = readFileSync(this.settingsPath, 'utf-8');
      const settings = JSON.parse(settingsContent);
      this.config = this.mergeConfig(settings);
    } catch (error) {
      console.warn('[ConfigManager] Failed to load settings.json:', error.message);
      console.warn('[ConfigManager] Using environment variables only');
      this.config = this.buildConfigFromEnv();
    }
  }

  /**
   * Merge settings with environment variables (env takes precedence)
   * @param {Object} settings - Settings from settings.json
   * @returns {Object} Merged configuration
   */
  mergeConfig(settings) {
    return {
      application: {
        name: settings.application?.name || 'AI Orchestra',
        version: settings.application?.version || '0.6.0',
        environment: process.env.NODE_ENV || settings.application?.environment || 'development',
        port: this.parseInt(process.env.PORT || settings.application?.port, 3000, { min: 1, max: 65535 }),
        host: process.env.HOST || settings.application?.host || 'localhost',
      },
      providers: {
        openai: {
          enabled: this.parseBool(process.env.OPENAI_ENABLED, settings.llm?.providers?.openai?.enabled),
          apiKey: process.env.OPENAI_API_KEY,
          organization: process.env.OPENAI_ORGANIZATION,
          baseURL: process.env.OPENAI_BASE_URL,
          defaultModel: process.env.OPENAI_DEFAULT_MODEL || settings.llm?.providers?.openai?.models?.[0]?.id || 'gpt-4-turbo-preview',
        },
        grok: {
          enabled: this.parseBool(process.env.GROK_ENABLED, settings.llm?.providers?.grok?.enabled),
          apiKey: process.env.GROK_API_KEY || process.env.XAI_API_KEY,
          baseURL: process.env.GROK_BASE_URL || 'https://api.x.ai/v1',
          defaultModel: process.env.GROK_DEFAULT_MODEL || settings.llm?.providers?.grok?.models?.[0]?.id || 'grok-beta',
        },
        ollama: {
          enabled: this.parseBool(process.env.OLLAMA_ENABLED, settings.llm?.providers?.ollama?.enabled),
          host: process.env.OLLAMA_HOST || 'http://localhost:11434',
          defaultModel: process.env.OLLAMA_DEFAULT_MODEL || settings.llm?.providers?.ollama?.models?.[0]?.id || 'llama2',
        },
      },
      llm: {
        defaultProvider: process.env.LLM_DEFAULT_PROVIDER || settings.llm?.defaultProvider || 'openai',
        loadBalancing: process.env.LLM_LOAD_BALANCING || settings.llm?.loadBalancing || 'round-robin',
        enableFallback: this.parseBool(process.env.LLM_ENABLE_FALLBACK, settings.llm?.enableFallback),
        requestTimeout: this.parseInt(process.env.LLM_REQUEST_TIMEOUT || settings.llm?.requestTimeout, 60000, { min: 1000 }),
        retryAttempts: this.parseInt(process.env.LLM_RETRY_ATTEMPTS || settings.llm?.retryAttempts, 3, { min: 0, max: 10 }),
        retryDelay: this.parseInt(process.env.LLM_RETRY_DELAY || settings.llm?.retryDelay, 1000, { min: 100 }),
      },
      database: {
        type: process.env.DATABASE_TYPE || 'sqlite',
        path: process.env.DATABASE_PATH || './database/memory.sqlite',
        host: process.env.DATABASE_HOST,
        port: this.parseInt(process.env.DATABASE_PORT, 5432, { min: 1, max: 65535 }),
        name: process.env.DATABASE_NAME,
        user: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        poolSize: this.parseInt(process.env.DATABASE_POOL_SIZE, 10, { min: 1, max: 100 }),
      },
      github: {
        enabled: this.parseBool(process.env.GITHUB_ENABLED, false),
        token: process.env.GITHUB_TOKEN,
        owner: process.env.GITHUB_OWNER,
        repo: process.env.GITHUB_REPO,
      },
      websocket: {
        enabled: this.parseBool(process.env.WEBSOCKET_ENABLED, settings.websocket?.enabled),
        port: this.parseInt(process.env.WEBSOCKET_PORT || settings.websocket?.port, 3001, { min: 1, max: 65535 }),
      },
      logging: {
        level: process.env.LOG_LEVEL || settings.logging?.level || 'info',
        filePath: process.env.LOG_FILE_PATH || settings.logging?.filePath || './logs/orchestra.log',
        maxFiles: this.parseInt(process.env.LOG_MAX_FILES || settings.logging?.maxFiles, 10, { min: 1 }),
        maxSize: process.env.LOG_MAX_SIZE || settings.logging?.maxSize || '10m',
      },
      security: {
        helmet: {
          enabled: this.parseBool(process.env.HELMET_ENABLED, settings.security?.helmet?.enabled),
        },
        cors: {
          enabled: this.parseBool(process.env.CORS_ENABLED, settings.security?.cors?.enabled),
          origin: process.env.CORS_ORIGIN || settings.security?.cors?.origin || 'http://localhost:3000',
          credentials: this.parseBool(process.env.CORS_CREDENTIALS, settings.security?.cors?.credentials),
        },
        rateLimiting: {
          enabled: this.parseBool(process.env.RATE_LIMIT_ENABLED, settings.security?.rateLimiting?.enabled),
          windowMs: this.parseInt(process.env.RATE_LIMIT_WINDOW_MS || settings.security?.rateLimiting?.windowMs, 60000, { min: 1000 }),
          maxRequests: this.parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || settings.security?.rateLimiting?.maxRequests, 100, { min: 1 }),
        },
        apiKey: process.env.API_KEY,
        jwtSecret: process.env.JWT_SECRET,
      },
      agents: settings.agents || {},
      api: settings.api || {},
      dashboard: settings.dashboard || {},
      memory: settings.memory || {},
    };
  }

  /**
   * Build configuration from environment variables only
   * @returns {Object} Configuration object
   */
  buildConfigFromEnv() {
    return this.mergeConfig({});
  }

  /**
   * Parse boolean from string or boolean value
   * @param {string|boolean|number} value - Value to parse
   * @param {boolean} defaultValue - Default value if parsing fails
   * @returns {boolean}
   */
  parseBool(value, defaultValue = false) {
    if (value === undefined || value === null) {
      return defaultValue;
    }
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'number') {
      return value === 1;
    }
    // Convert to string safely to avoid TypeError on non-string values
    return String(value).toLowerCase() === 'true' || value === '1';
  }

  /**
   * Safely parse integer from string or number value
   * @param {string|number} value - Value to parse
   * @param {number} defaultValue - Default value if parsing fails
   * @param {Object} options - Validation options (min, max)
   * @returns {number}
   */
  parseInt(value, defaultValue = 0, options = {}) {
    // Handle null/undefined
    if (value === undefined || value === null || value === '') {
      return defaultValue;
    }

    // If already a number, validate it
    if (typeof value === 'number') {
      if (isNaN(value) || !isFinite(value)) {
        console.warn(`[ConfigManager] Invalid number value: ${value}, using default: ${defaultValue}`);
        return defaultValue;
      }
      const intValue = Math.floor(value);
      return this.validateNumber(intValue, defaultValue, options);
    }

    // Parse string to integer
    const parsed = Number.parseInt(String(value), 10);

    if (isNaN(parsed)) {
      console.warn(`[ConfigManager] Failed to parse integer from "${value}", using default: ${defaultValue}`);
      return defaultValue;
    }

    return this.validateNumber(parsed, defaultValue, options);
  }

  /**
   * Validate number against min/max constraints
   * @param {number} value - Value to validate
   * @param {number} defaultValue - Default value if validation fails
   * @param {Object} options - Validation options (min, max)
   * @returns {number}
   */
  validateNumber(value, defaultValue, options = {}) {
    const { min, max } = options;

    if (min !== undefined && value < min) {
      console.warn(`[ConfigManager] Value ${value} is below minimum ${min}, using default: ${defaultValue}`);
      return defaultValue;
    }

    if (max !== undefined && value > max) {
      console.warn(`[ConfigManager] Value ${value} is above maximum ${max}, using default: ${defaultValue}`);
      return defaultValue;
    }

    return value;
  }

  /**
   * Get the full configuration object
   * @returns {Object} Configuration
   */
  getConfig() {
    return this.config;
  }

  /**
   * Get a specific configuration value
   * @param {string} path - Dot-notation path to the config value
   * @returns {any} Configuration value
   */
  get(path) {
    return path.split('.').reduce((obj, key) => obj?.[key], this.config);
  }

  /**
   * Validate the configuration
   * @returns {Object} Validation result { valid: boolean, errors: Array }
   */
  validate() {
    const errors = [];

    // Validate port numbers are valid
    if (isNaN(this.config.application.port) || this.config.application.port < 1 || this.config.application.port > 65535) {
      errors.push(`Invalid application port: ${this.config.application.port}`);
    }

    if (isNaN(this.config.websocket.port) || this.config.websocket.port < 1 || this.config.websocket.port > 65535) {
      errors.push(`Invalid WebSocket port: ${this.config.websocket.port}`);
    }

    // Validate environment
    const validEnvironments = ['development', 'production', 'test'];
    if (!validEnvironments.includes(this.config.application.environment)) {
      errors.push(`Invalid environment: ${this.config.application.environment}. Must be one of: ${validEnvironments.join(', ')}`);
    }

    // Validate log level
    const validLogLevels = ['debug', 'info', 'warn', 'error'];
    if (!validLogLevels.includes(this.config.logging.level)) {
      errors.push(`Invalid log level: ${this.config.logging.level}. Must be one of: ${validLogLevels.join(', ')}`);
    }

    // Validate LLM provider
    const validProviders = ['openai', 'grok', 'ollama'];
    if (!validProviders.includes(this.config.llm.defaultProvider)) {
      errors.push(`Invalid default provider: ${this.config.llm.defaultProvider}. Must be one of: ${validProviders.join(', ')}`);
    }

    // Validate load balancing strategy
    const validStrategies = ['round-robin', 'random', 'default'];
    if (!validStrategies.includes(this.config.llm.loadBalancing)) {
      errors.push(`Invalid load balancing strategy: ${this.config.llm.loadBalancing}. Must be one of: ${validStrategies.join(', ')}`);
    }

    // Validate at least one LLM provider is enabled
    const hasEnabledProvider =
      this.config.providers.openai?.enabled ||
      this.config.providers.grok?.enabled ||
      this.config.providers.ollama?.enabled;

    if (!hasEnabledProvider) {
      errors.push('At least one LLM provider must be enabled');
    }

    // Validate OpenAI configuration
    if (this.config.providers.openai?.enabled && !this.config.providers.openai?.apiKey) {
      errors.push('OpenAI API key is required when OpenAI is enabled');
    }

    // Validate Grok configuration
    if (this.config.providers.grok?.enabled && !this.config.providers.grok?.apiKey) {
      errors.push('Grok API key is required when Grok is enabled');
    }

    // Validate Ollama configuration
    if (this.config.providers.ollama?.enabled && !this.config.providers.ollama?.host) {
      errors.push('Ollama host is required when Ollama is enabled');
    }

    // Validate GitHub configuration
    if (this.config.github?.enabled && !this.config.github?.token) {
      errors.push('GitHub token is required when GitHub integration is enabled');
    }

    // Validate numeric ranges
    if (this.config.llm.retryAttempts < 0 || this.config.llm.retryAttempts > 10) {
      errors.push(`Invalid retry attempts: ${this.config.llm.retryAttempts}. Must be between 0 and 10`);
    }

    if (this.config.llm.requestTimeout < 1000) {
      errors.push(`Invalid request timeout: ${this.config.llm.requestTimeout}. Must be at least 1000ms`);
    }

    if (this.config.database.poolSize < 1 || this.config.database.poolSize > 100) {
      errors.push(`Invalid database pool size: ${this.config.database.poolSize}. Must be between 1 and 100`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Print configuration summary
   */
  printSummary() {
    console.log('\n=== AI Orchestra Configuration ===\n');
    console.log(`Environment: ${this.config.application.environment}`);
    console.log(`Port: ${this.config.application.port}`);
    console.log(`\nLLM Providers:`);
    console.log(`  OpenAI: ${this.config.providers.openai?.enabled ? '✓' : '✗'}`);
    console.log(`  Grok: ${this.config.providers.grok?.enabled ? '✓' : '✗'}`);
    console.log(`  Ollama: ${this.config.providers.ollama?.enabled ? '✓' : '✗'}`);
    console.log(`\nDefault Provider: ${this.config.llm.defaultProvider}`);
    console.log(`Load Balancing: ${this.config.llm.loadBalancing}`);
    console.log(`Fallback: ${this.config.llm.enableFallback ? '✓' : '✗'}`);
    console.log(`\nGitHub Integration: ${this.config.github?.enabled ? '✓' : '✗'}`);
    console.log(`WebSocket: ${this.config.websocket?.enabled ? '✓' : '✗'}`);
    console.log('\n===================================\n');
  }
}
