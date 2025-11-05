/**
 * Test Helpers
 * Utility functions for testing
 */

/**
 * Mock LLM response
 * @param {Object} options - Response options
 * @returns {Object} Mock response
 */
export function mockLLMResponse(options = {}) {
  return {
    provider: options.provider || 'mock',
    content: options.content || 'This is a mock response',
    model: options.model || 'mock-model',
    usage: {
      promptTokens: options.promptTokens || 10,
      completionTokens: options.completionTokens || 20,
      totalTokens: options.totalTokens || 30,
    },
    metadata: options.metadata || {},
    timestamp: new Date().toISOString(),
  };
}

/**
 * Mock stream response
 * @param {Array<string>} chunks - Chunks to stream
 * @returns {AsyncGenerator} Mock stream
 */
export async function* mockStreamResponse(chunks = ['Hello', ' ', 'World']) {
  for (const chunk of chunks) {
    yield {
      content: chunk,
      model: 'mock-model',
      done: false,
    };
  }
  yield {
    content: '',
    model: 'mock-model',
    done: true,
  };
}

/**
 * Wait for a specified time
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
export function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a mock configuration
 * @returns {Object} Mock configuration
 */
export function mockConfig() {
  return {
    application: {
      name: 'AI Orchestra Test',
      version: '0.0.0',
      environment: 'test',
      port: 3000,
      host: 'localhost',
    },
    providers: {
      openai: {
        enabled: false,
        apiKey: 'test-key',
        defaultModel: 'gpt-4',
      },
      grok: {
        enabled: false,
        apiKey: 'test-key',
        defaultModel: 'grok-beta',
      },
      ollama: {
        enabled: false,
        host: 'http://localhost:11434',
        defaultModel: 'llama2',
      },
    },
    llm: {
      defaultProvider: 'openai',
      loadBalancing: 'round-robin',
      enableFallback: true,
    },
  };
}

/**
 * Assert that value is truthy
 * @param {any} value - Value to check
 * @param {string} message - Error message
 */
export function assertTrue(value, message) {
  if (!value) {
    throw new Error(message || `Expected truthy value, got ${value}`);
  }
}

/**
 * Assert that values are equal
 * @param {any} actual - Actual value
 * @param {any} expected - Expected value
 * @param {string} message - Error message
 */
export function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

/**
 * Assert that function throws an error
 * @param {Function} fn - Function to test
 * @param {string} message - Error message
 */
export async function assertThrows(fn, message) {
  let threw = false;
  try {
    await fn();
  } catch (error) {
    threw = true;
  }
  if (!threw) {
    throw new Error(message || 'Expected function to throw an error');
  }
}

/**
 * Create a test logger that collects log messages
 * @returns {Object} Logger with messages array
 */
export function createTestLogger() {
  const messages = [];
  return {
    messages,
    log: (...args) => messages.push({ level: 'log', args }),
    info: (...args) => messages.push({ level: 'info', args }),
    warn: (...args) => messages.push({ level: 'warn', args }),
    error: (...args) => messages.push({ level: 'error', args }),
    clear: () => (messages.length = 0),
  };
}
