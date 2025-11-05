/**
 * Connector Tests
 * Tests for LLM connectors
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { ConfigManager } from '../core/config_manager.js';
import { LLMBridge } from '../core/llm_bridge.js';

describe('LLM Connectors', () => {
  let bridge;
  let config;

  before(() => {
    config = new ConfigManager();
    const bridgeConfig = {
      providers: config.getConfig().providers,
      defaultProvider: config.get('llm.defaultProvider'),
      loadBalancing: config.get('llm.loadBalancing'),
      enableFallback: config.get('llm.enableFallback'),
    };
    bridge = new LLMBridge(bridgeConfig);
  });

  describe('LLMBridge', () => {
    it('should initialize with configured providers', () => {
      const providers = bridge.getAvailableProviders();
      assert.ok(Array.isArray(providers), 'Should return array of providers');
      assert.ok(providers.length > 0, 'Should have at least one provider');
    });

    it('should get bridge statistics', () => {
      const stats = bridge.getStats();
      assert.ok(stats.connectors >= 0, 'Should have connector count');
      assert.ok(Array.isArray(stats.providers), 'Should have providers array');
      assert.ok(stats.defaultProvider, 'Should have default provider');
    });

    it('should select a provider', () => {
      const provider = bridge.selectProvider();
      assert.ok(typeof provider === 'string', 'Should return a provider name');
    });
  });

  describe('OpenAI Connector', () => {
    it('should validate configuration', () => {
      const connector = bridge.getConnector('openai');
      if (connector) {
        const validation = connector.validateConfig();
        assert.ok(typeof validation.valid === 'boolean', 'Should return validation result');
      }
    });

    it('should test connection (if enabled)', async () => {
      const connector = bridge.getConnector('openai');
      if (connector && connector.apiKey) {
        try {
          const isConnected = await connector.testConnection();
          assert.ok(typeof isConnected === 'boolean', 'Should return connection status');
        } catch (error) {
          console.warn('OpenAI connection test skipped:', error.message);
        }
      }
    });
  });

  describe('Grok Connector', () => {
    it('should validate configuration', () => {
      const connector = bridge.getConnector('grok');
      if (connector) {
        const validation = connector.validateConfig();
        assert.ok(typeof validation.valid === 'boolean', 'Should return validation result');
      }
    });
  });

  describe('Ollama Connector', () => {
    it('should validate configuration', () => {
      const connector = bridge.getConnector('ollama');
      if (connector) {
        const validation = connector.validateConfig();
        assert.ok(typeof validation.valid === 'boolean', 'Should return validation result');
      }
    });

    it('should test connection (if enabled)', async () => {
      const connector = bridge.getConnector('ollama');
      if (connector) {
        try {
          const isConnected = await connector.testConnection();
          assert.ok(typeof isConnected === 'boolean', 'Should return connection status');
        } catch (error) {
          console.warn('Ollama connection test skipped:', error.message);
        }
      }
    });
  });
});
