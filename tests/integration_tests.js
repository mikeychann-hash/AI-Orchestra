/**
 * Integration Tests
 * End-to-end integration tests for the AI Orchestra system
 */

import { ConfigManager } from '../core/config_manager.js';
import { LLMBridge } from '../core/llm_bridge.js';
import { GitHubIntegration } from '../core/integrations/github_integration.js';

console.log('\n=== AI Orchestra Integration Tests ===\n');

// Test 1: Configuration Loading
console.log('Test 1: Configuration Loading');
try {
  const configManager = new ConfigManager();
  const config = configManager.getConfig();

  console.log('  ✓ Configuration loaded successfully');
  console.log(`  ✓ Environment: ${config.application.environment}`);
  console.log(`  ✓ Port: ${config.application.port}`);

  // Validate configuration
  const validation = configManager.validate();
  if (validation.valid) {
    console.log('  ✓ Configuration is valid');
  } else {
    console.log('  ✗ Configuration validation failed:');
    validation.errors.forEach((error) => console.log(`    - ${error}`));
  }
} catch (error) {
  console.error('  ✗ Configuration test failed:', error.message);
}

console.log('\n');

// Test 2: LLM Bridge Initialization
console.log('Test 2: LLM Bridge Initialization');
try {
  const configManager = new ConfigManager();
  const config = configManager.getConfig();

  const bridgeConfig = {
    providers: config.providers,
    defaultProvider: config.llm.defaultProvider,
    loadBalancing: config.llm.loadBalancing,
    enableFallback: config.llm.enableFallback,
  };

  const bridge = new LLMBridge(bridgeConfig);
  const stats = bridge.getStats();

  console.log(`  ✓ LLM Bridge initialized with ${stats.connectors} connector(s)`);
  console.log(`  ✓ Available providers: ${stats.providers.join(', ')}`);
  console.log(`  ✓ Default provider: ${stats.defaultProvider}`);
  console.log(`  ✓ Load balancing: ${stats.loadBalancing}`);
} catch (error) {
  console.error('  ✗ LLM Bridge test failed:', error.message);
}

console.log('\n');

// Test 3: Connector Tests
console.log('Test 3: Connector Connection Tests');
(async () => {
  try {
    const configManager = new ConfigManager();
    const config = configManager.getConfig();

    const bridgeConfig = {
      providers: config.providers,
      defaultProvider: config.llm.defaultProvider,
      loadBalancing: config.llm.loadBalancing,
      enableFallback: config.llm.enableFallback,
    };

    const bridge = new LLMBridge(bridgeConfig);
    const results = await bridge.testAllConnections();

    console.log('  Connection test results:');
    for (const [provider, result] of Object.entries(results)) {
      if (result.connected) {
        console.log(`    ✓ ${provider}: Connected`);
      } else {
        console.log(`    ✗ ${provider}: ${result.error || 'Connection failed'}`);
      }
    }
  } catch (error) {
    console.error('  ✗ Connector tests failed:', error.message);
  }

  console.log('\n');

  // Test 4: GitHub Integration (if enabled)
  console.log('Test 4: GitHub Integration');
  try {
    const configManager = new ConfigManager();
    const config = configManager.getConfig();

    if (config.github?.enabled && config.github?.token) {
      const github = new GitHubIntegration(config.github);
      const isConnected = await github.testConnection();

      if (isConnected) {
        console.log('  ✓ GitHub connection successful');

        const user = await github.getAuthenticatedUser();
        console.log(`  ✓ Authenticated as: ${user.login}`);
      } else {
        console.log('  ✗ GitHub connection failed');
      }
    } else {
      console.log('  ⊘ GitHub integration not enabled (skipped)');
    }
  } catch (error) {
    console.error('  ✗ GitHub integration test failed:', error.message);
  }

  console.log('\n');

  // Test 5: Model Listing
  console.log('Test 5: Available Models');
  try {
    const configManager = new ConfigManager();
    const config = configManager.getConfig();

    const bridgeConfig = {
      providers: config.providers,
      defaultProvider: config.llm.defaultProvider,
      loadBalancing: config.llm.loadBalancing,
      enableFallback: config.llm.enableFallback,
    };

    const bridge = new LLMBridge(bridgeConfig);
    const models = await bridge.getAllModels();

    for (const [provider, providerModels] of Object.entries(models)) {
      if (providerModels.length > 0) {
        console.log(`  ✓ ${provider}: ${providerModels.length} model(s) available`);
        providerModels.slice(0, 3).forEach((model) => {
          console.log(`    - ${model.id || model.name}`);
        });
      } else {
        console.log(`  ⊘ ${provider}: No models available`);
      }
    }
  } catch (error) {
    console.error('  ✗ Model listing test failed:', error.message);
  }

  console.log('\n=== Integration Tests Complete ===\n');
  process.exit(0);
})();
