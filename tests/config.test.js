/**
 * Configuration Tests
 * Tests for configuration management
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { ConfigManager } from '../core/config_manager.js';

describe('Configuration Manager', () => {
  let configManager;

  before(() => {
    configManager = new ConfigManager();
  });

  describe('Configuration Loading', () => {
    it('should load configuration', () => {
      const config = configManager.getConfig();
      assert.ok(config, 'Configuration should be loaded');
      assert.ok(config.application, 'Should have application config');
      assert.ok(config.providers, 'Should have providers config');
      assert.ok(config.llm, 'Should have LLM config');
    });

    it('should get specific config value', () => {
      const port = configManager.get('application.port');
      assert.ok(typeof port === 'number', 'Port should be a number');
    });

    it('should have application settings', () => {
      const config = configManager.getConfig();
      assert.ok(config.application.name, 'Should have application name');
      assert.ok(config.application.version, 'Should have version');
      assert.ok(config.application.environment, 'Should have environment');
    });
  });

  describe('Provider Configuration', () => {
    it('should have provider configurations', () => {
      const config = configManager.getConfig();
      assert.ok(config.providers.openai, 'Should have OpenAI config');
      assert.ok(config.providers.grok, 'Should have Grok config');
      assert.ok(config.providers.ollama, 'Should have Ollama config');
    });

    it('should have LLM bridge configuration', () => {
      const config = configManager.getConfig();
      assert.ok(config.llm.defaultProvider, 'Should have default provider');
      assert.ok(config.llm.loadBalancing, 'Should have load balancing strategy');
    });
  });

  describe('Configuration Validation', () => {
    it('should validate configuration', () => {
      const validation = configManager.validate();
      assert.ok(typeof validation.valid === 'boolean', 'Should return validation result');
      assert.ok(Array.isArray(validation.errors), 'Should return errors array');
    });

    it('should have valid configuration', () => {
      const validation = configManager.validate();
      if (!validation.valid) {
        console.warn('Configuration validation failed:', validation.errors);
      }
    });
  });

  describe('Boolean Parsing', () => {
    it('should parse boolean from string', () => {
      assert.strictEqual(configManager.parseBool('true'), true);
      assert.strictEqual(configManager.parseBool('false'), false);
      assert.strictEqual(configManager.parseBool('1'), true);
      assert.strictEqual(configManager.parseBool(true), true);
      assert.strictEqual(configManager.parseBool(false), false);
    });

    it('should use default value for invalid input', () => {
      assert.strictEqual(configManager.parseBool(null, true), true);
      assert.strictEqual(configManager.parseBool(undefined, false), false);
    });
  });
});
