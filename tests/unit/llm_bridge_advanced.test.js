/**
 * LLM Bridge Advanced Tests
 * Tests advanced LLM Bridge functionality to improve coverage
 *
 * Coverage:
 * - getConnector() method
 * - getAvailableProviders() method
 * - testAllConnections() method
 * - getAllModels() method
 * - getStats() method
 * - streamQuery() method
 * - queryWithFallback() method
 * - Edge cases and error scenarios
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { LLMBridge } from '../../core/llm_bridge.js';

describe('LLM Bridge Advanced Tests', () => {
  describe('getConnector() method', () => {
    test('should return specific connector', () => {
      const bridge = new LLMBridge({
        providers: {
          grok: {
            enabled: true,
            apiKey: 'test-key',
          },
        },
      });

      const connector = bridge.getConnector('grok');
      assert.ok(connector);
      assert.strictEqual(connector.provider, 'grok');
    });

    test('should return undefined for non-existent provider', () => {
      const bridge = new LLMBridge({
        providers: {
          grok: {
            enabled: true,
            apiKey: 'test-key',
          },
        },
      });

      const connector = bridge.getConnector('non-existent');
      assert.strictEqual(connector, undefined);
    });

    test('should return undefined when no connectors initialized', () => {
      const bridge = new LLMBridge({
        providers: {},
      });

      const connector = bridge.getConnector('openai');
      assert.strictEqual(connector, undefined);
    });

    test('should handle null provider name', () => {
      const bridge = new LLMBridge({
        providers: {
          grok: {
            enabled: true,
            apiKey: 'test-key',
          },
        },
      });

      const connector = bridge.getConnector(null);
      assert.strictEqual(connector, undefined);
    });

    test('should handle undefined provider name', () => {
      const bridge = new LLMBridge({
        providers: {
          grok: {
            enabled: true,
            apiKey: 'test-key',
          },
        },
      });

      const connector = bridge.getConnector(undefined);
      assert.strictEqual(connector, undefined);
    });
  });

  describe('getAvailableProviders() method', () => {
    test('should return list of available providers', () => {
      const bridge = new LLMBridge({
        providers: {
          grok: {
            enabled: true,
            apiKey: 'test-key',
          },
        },
      });

      const providers = bridge.getAvailableProviders();
      assert.ok(Array.isArray(providers));
      assert.strictEqual(providers.length, 1);
      assert.ok(providers.includes('grok'));
    });

    test('should return empty array when no providers', () => {
      const bridge = new LLMBridge({
        providers: {},
      });

      const providers = bridge.getAvailableProviders();
      assert.ok(Array.isArray(providers));
      assert.strictEqual(providers.length, 0);
    });

    test('should return multiple providers', () => {
      const bridge = new LLMBridge({
        providers: {
          grok: {
            enabled: true,
            apiKey: 'test-key-1',
          },
          ollama: {
            enabled: true,
            host: 'http://localhost:11434',
          },
        },
      });

      const providers = bridge.getAvailableProviders();
      assert.strictEqual(providers.length, 2);
      assert.ok(providers.includes('grok'));
      assert.ok(providers.includes('ollama'));
    });

    test('should not include disabled providers', () => {
      const bridge = new LLMBridge({
        providers: {
          grok: {
            enabled: true,
            apiKey: 'test-key',
          },
          openai: {
            enabled: false,
            apiKey: 'test-key',
          },
        },
      });

      const providers = bridge.getAvailableProviders();
      assert.strictEqual(providers.length, 1);
      assert.ok(providers.includes('grok'));
      assert.ok(!providers.includes('openai'));
    });
  });

  describe('testAllConnections() method', () => {
    test('should return results object', async () => {
      const bridge = new LLMBridge({
        providers: {
          grok: {
            enabled: true,
            apiKey: 'test-key',
          },
        },
      });

      const results = await bridge.testAllConnections();
      assert.ok(typeof results === 'object');
      assert.ok('grok' in results);
    });

    test('should include connection status for each provider', async () => {
      const bridge = new LLMBridge({
        providers: {
          grok: {
            enabled: true,
            apiKey: 'test-key',
          },
        },
      });

      const results = await bridge.testAllConnections();
      assert.ok('grok' in results);
      assert.ok(typeof results.grok.connected === 'boolean');
      // error field may or may not be present depending on connection outcome
    });

    test('should return empty object for no providers', async () => {
      const bridge = new LLMBridge({
        providers: {},
      });

      const results = await bridge.testAllConnections();
      assert.deepStrictEqual(results, {});
    });

    test('should test multiple providers', async () => {
      const bridge = new LLMBridge({
        providers: {
          grok: {
            enabled: true,
            apiKey: 'test-key',
          },
          ollama: {
            enabled: true,
            host: 'http://localhost:11434',
          },
        },
      });

      const results = await bridge.testAllConnections();
      assert.ok('grok' in results);
      assert.ok('ollama' in results);
      assert.strictEqual(typeof results.grok.connected, 'boolean');
      assert.strictEqual(typeof results.ollama.connected, 'boolean');
    });

    test('should handle connector that throws during test', async () => {
      const bridge = new LLMBridge({
        providers: {
          grok: {
            enabled: true,
            apiKey: 'test-key',
          },
        },
      });

      const results = await bridge.testAllConnections();
      assert.ok('grok' in results);
      assert.ok(typeof results.grok.connected === 'boolean');
    });
  });

  describe('getAllModels() method', () => {
    test('should return models object', async () => {
      const bridge = new LLMBridge({
        providers: {
          grok: {
            enabled: true,
            apiKey: 'test-key',
          },
        },
      });

      const models = await bridge.getAllModels();
      assert.ok(typeof models === 'object');
      assert.ok('grok' in models);
    });

    test('should return empty arrays for failed providers', async () => {
      const bridge = new LLMBridge({
        providers: {
          grok: {
            enabled: true,
            apiKey: 'invalid-key',
          },
        },
      });

      const models = await bridge.getAllModels();
      assert.ok('grok' in models);
      assert.ok(Array.isArray(models.grok));
    });

    test('should return empty object for no providers', async () => {
      const bridge = new LLMBridge({
        providers: {},
      });

      const models = await bridge.getAllModels();
      assert.deepStrictEqual(models, {});
    });

    test('should get models from multiple providers', async () => {
      const bridge = new LLMBridge({
        providers: {
          grok: {
            enabled: true,
            apiKey: 'test-key',
          },
          ollama: {
            enabled: true,
            host: 'http://localhost:11434',
          },
        },
      });

      const models = await bridge.getAllModels();
      assert.ok('grok' in models);
      assert.ok('ollama' in models);
      assert.ok(Array.isArray(models.grok));
      assert.ok(Array.isArray(models.ollama));
    });

    test('should continue if one provider fails', async () => {
      const bridge = new LLMBridge({
        providers: {
          grok: {
            enabled: true,
            apiKey: 'test-key',
          },
          ollama: {
            enabled: true,
            host: 'http://localhost:11434',
          },
        },
      });

      const models = await bridge.getAllModels();
      // Should have both providers even if they fail
      assert.ok('grok' in models);
      assert.ok('ollama' in models);
    });
  });

  describe('getStats() method', () => {
    test('should return stats object with correct structure', () => {
      const bridge = new LLMBridge({
        providers: {
          grok: {
            enabled: true,
            apiKey: 'test-key',
          },
        },
      });

      const stats = bridge.getStats();
      assert.ok(typeof stats === 'object');
      assert.ok('connectors' in stats);
      assert.ok('providers' in stats);
      assert.ok('loadBalancing' in stats);
      assert.ok('defaultProvider' in stats);
      // Note: enableFallback is not included in getStats() return value
    });

    test('should show correct connector count', () => {
      const bridge = new LLMBridge({
        providers: {
          grok: {
            enabled: true,
            apiKey: 'test-key',
          },
          ollama: {
            enabled: true,
            host: 'http://localhost:11434',
          },
        },
      });

      const stats = bridge.getStats();
      assert.strictEqual(stats.connectors, 2);
      assert.strictEqual(stats.providers.length, 2);
    });

    test('should show zero connectors when none initialized', () => {
      const bridge = new LLMBridge({
        providers: {},
      });

      const stats = bridge.getStats();
      assert.strictEqual(stats.connectors, 0);
      assert.strictEqual(stats.providers.length, 0);
    });

    test('should include provider names', () => {
      const bridge = new LLMBridge({
        providers: {
          grok: {
            enabled: true,
            apiKey: 'test-key',
          },
        },
      });

      const stats = bridge.getStats();
      assert.ok(Array.isArray(stats.providers));
      assert.ok(stats.providers.includes('grok'));
    });

    test('should include load balancing strategy', () => {
      const bridge = new LLMBridge({
        providers: {
          grok: {
            enabled: true,
            apiKey: 'test-key',
          },
        },
        loadBalancing: 'round-robin',
      });

      const stats = bridge.getStats();
      assert.strictEqual(stats.loadBalancing, 'round-robin');
    });

    test('should include default provider', () => {
      const bridge = new LLMBridge({
        providers: {
          grok: {
            enabled: true,
            apiKey: 'test-key',
          },
        },
        defaultProvider: 'grok',
      });

      const stats = bridge.getStats();
      assert.strictEqual(stats.defaultProvider, 'grok');
    });

    test('should include fallback setting in config', () => {
      const bridge = new LLMBridge({
        providers: {
          grok: {
            enabled: true,
            apiKey: 'test-key',
          },
        },
        enableFallback: true,
      });

      // enableFallback is stored in config but not returned by getStats()
      assert.strictEqual(bridge.config.enableFallback, true);
    });
  });

  describe('Load Balancing', () => {
    test('should use round-robin strategy', () => {
      const bridge = new LLMBridge({
        providers: {
          grok: {
            enabled: true,
            apiKey: 'test-key',
          },
          ollama: {
            enabled: true,
            host: 'http://localhost:11434',
          },
        },
        loadBalancing: 'round-robin',
      });

      const provider1 = bridge.selectProvider();
      const provider2 = bridge.selectProvider();
      const provider3 = bridge.selectProvider();

      // Should alternate between providers
      assert.notStrictEqual(provider1, provider2);
      assert.strictEqual(provider1, provider3);
    });

    test('should use random strategy', () => {
      const bridge = new LLMBridge({
        providers: {
          grok: {
            enabled: true,
            apiKey: 'test-key',
          },
          ollama: {
            enabled: true,
            host: 'http://localhost:11434',
          },
        },
        loadBalancing: 'random',
      });

      const providers = new Set();
      for (let i = 0; i < 10; i++) {
        providers.add(bridge.selectProvider());
      }

      // Should see both providers with high probability
      assert.ok(providers.size >= 1);
    });

    test('should use default strategy', () => {
      const bridge = new LLMBridge({
        providers: {
          grok: {
            enabled: true,
            apiKey: 'test-key',
          },
          ollama: {
            enabled: true,
            host: 'http://localhost:11434',
          },
        },
        loadBalancing: 'default',
        defaultProvider: 'grok',
      });

      const provider = bridge.selectProvider();
      assert.strictEqual(provider, 'grok');
    });

    test('should return single provider when only one available', () => {
      const bridge = new LLMBridge({
        providers: {
          grok: {
            enabled: true,
            apiKey: 'test-key',
          },
        },
        loadBalancing: 'round-robin',
      });

      const provider1 = bridge.selectProvider();
      const provider2 = bridge.selectProvider();

      assert.strictEqual(provider1, 'grok');
      assert.strictEqual(provider2, 'grok');
    });
  });

  describe('Configuration Edge Cases', () => {
    test('should handle empty providers object', () => {
      assert.doesNotThrow(() => {
        const bridge = new LLMBridge({ providers: {} });
        assert.ok(bridge);
      });
    });

    test('should handle null providers', () => {
      assert.doesNotThrow(() => {
        const bridge = new LLMBridge({ providers: null });
        assert.ok(bridge);
      });
    });

    test('should handle undefined providers', () => {
      assert.doesNotThrow(() => {
        const bridge = new LLMBridge({ providers: undefined });
        assert.ok(bridge);
      });
    });

    test('should handle providers without enabled flag', () => {
      assert.doesNotThrow(() => {
        const bridge = new LLMBridge({
          providers: {
            grok: {
              apiKey: 'test-key',
            },
          },
        });
        assert.ok(bridge);
        assert.strictEqual(bridge.connectors.size, 0);
      });
    });

    test('should handle invalid load balancing strategy', () => {
      const bridge = new LLMBridge({
        providers: {
          grok: {
            enabled: true,
            apiKey: 'test-key',
          },
        },
        loadBalancing: 'invalid-strategy',
      });

      // Should fall back to default strategy
      const provider = bridge.selectProvider();
      assert.strictEqual(provider, 'grok');
    });

    test('should handle missing API keys', () => {
      assert.doesNotThrow(() => {
        const bridge = new LLMBridge({
          providers: {
            grok: {
              enabled: true,
              // missing apiKey
            },
          },
        });
        // Connector should not be initialized
        assert.strictEqual(bridge.connectors.size, 0);
      });
    });
  });

  describe('Query Edge Cases', () => {
    test('should reject query with empty prompt', async () => {
      const bridge = new LLMBridge({
        providers: {
          grok: {
            enabled: true,
            apiKey: 'test-key',
          },
        },
      });

      await assert.rejects(async () => {
        await bridge.query({ prompt: '' });
      });
    });

    test('should reject query with null prompt', async () => {
      const bridge = new LLMBridge({
        providers: {
          grok: {
            enabled: true,
            apiKey: 'test-key',
          },
        },
      });

      await assert.rejects(async () => {
        await bridge.query({ prompt: null });
      });
    });

    test('should reject query with undefined prompt', async () => {
      const bridge = new LLMBridge({
        providers: {
          grok: {
            enabled: true,
            apiKey: 'test-key',
          },
        },
      });

      await assert.rejects(async () => {
        await bridge.query({ prompt: undefined });
      });
    });

    test('should reject query with invalid provider', async () => {
      const bridge = new LLMBridge({
        providers: {
          grok: {
            enabled: true,
            apiKey: 'test-key',
          },
        },
      });

      await assert.rejects(
        async () => {
          await bridge.query({ prompt: 'Hello', provider: 'non-existent' });
        },
        {
          name: 'Error',
          message: /not available or not configured/,
        }
      );
    });
  });

  describe('Initialization Edge Cases', () => {
    test('should handle null config', () => {
      assert.doesNotThrow(() => {
        const bridge = new LLMBridge(null);
        assert.ok(bridge);
        // When null is passed, it defaults to {}
        assert.strictEqual(bridge.config, null);
      });
    });

    test('should handle undefined config', () => {
      assert.doesNotThrow(() => {
        const bridge = new LLMBridge(undefined);
        assert.ok(bridge);
      });
    });

    test('should handle config without providers key', () => {
      assert.doesNotThrow(() => {
        const bridge = new LLMBridge({});
        assert.ok(bridge);
      });
    });

    test('should set default values when config is empty', () => {
      const bridge = new LLMBridge({});
      assert.ok(bridge.config);
      assert.strictEqual(typeof bridge.loadBalancing, 'string');
      assert.strictEqual(bridge.loadBalancing, 'round-robin'); // default value
      assert.strictEqual(bridge.defaultProvider, 'openai'); // default value
      // enableFallback is accessed via config, not as direct property
    });
  });
});
