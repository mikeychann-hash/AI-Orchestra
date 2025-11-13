/**
 * Test Request Fixtures
 * Valid and invalid API request data for testing
 */

/**
 * Valid LLM query request fixtures
 */
export const validQueryRequests = {
  basic: {
    prompt: 'Hello, how are you?',
  },
  withProvider: {
    prompt: 'Write a hello world program',
    provider: 'openai',
    model: 'gpt-4',
  },
  withTemperature: {
    prompt: 'Generate creative content',
    temperature: 0.8,
    maxTokens: 500,
  },
  fullOptions: {
    prompt: 'Complete this task',
    provider: 'openai',
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 1000,
  },
  longPrompt: {
    prompt: 'A'.repeat(1000),
  },
};

/**
 * Invalid LLM query request fixtures (for validation testing)
 */
export const invalidQueryRequests = {
  missingPrompt: {
    provider: 'openai',
    model: 'gpt-4',
  },
  emptyPrompt: {
    prompt: '',
  },
  nullPrompt: {
    prompt: null,
  },
  undefinedPrompt: {
    prompt: undefined,
  },
  invalidTemperature: {
    prompt: 'Test',
    temperature: 2.5, // Should be 0-2
  },
  negativeTemperature: {
    prompt: 'Test',
    temperature: -0.5,
  },
  invalidMaxTokens: {
    prompt: 'Test',
    maxTokens: -100,
  },
  nonNumericMaxTokens: {
    prompt: 'Test',
    maxTokens: 'invalid',
  },
  extremelyLongPrompt: {
    prompt: 'A'.repeat(100000), // Too long
  },
  invalidProvider: {
    prompt: 'Test',
    provider: 'nonexistent-provider',
  },
  sqlInjection: {
    prompt: "'; DROP TABLE users; --",
  },
  xssAttempt: {
    prompt: '<script>alert("XSS")</script>',
  },
};

/**
 * Edge case request fixtures
 */
export const edgeCaseRequests = {
  minimumValid: {
    prompt: 'Hi',
  },
  maxLengthPrompt: {
    prompt: 'A'.repeat(10000), // At boundary
  },
  zeroTemperature: {
    prompt: 'Be deterministic',
    temperature: 0,
  },
  maxTemperature: {
    prompt: 'Be creative',
    temperature: 2.0,
  },
  unicodePrompt: {
    prompt: '你好世界 🌍 مرحبا بالعالم',
  },
  specialCharacters: {
    prompt: '!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`',
  },
  multilinePrompt: {
    prompt: 'Line 1\nLine 2\nLine 3',
  },
};

/**
 * Stream request fixtures
 */
export const streamRequests = {
  basic: {
    prompt: 'Tell me a story',
  },
  withOptions: {
    prompt: 'Generate code',
    provider: 'openai',
    model: 'gpt-4',
    temperature: 0.5,
  },
};

/**
 * GitHub API request fixtures
 */
export const githubRequests = {
  listIssues: {
    state: 'open',
    labels: 'bug',
  },
  createIssue: {
    title: 'Test Issue',
    body: 'This is a test issue',
    labels: ['bug', 'test'],
  },
};

/**
 * WebSocket message fixtures
 */
export const websocketMessages = {
  query: {
    type: 'query',
    payload: {
      prompt: 'Hello via WebSocket',
      provider: 'openai',
      model: 'gpt-4',
    },
  },
  stream: {
    type: 'stream',
    payload: {
      prompt: 'Stream via WebSocket',
      provider: 'openai',
    },
  },
  invalid: {
    type: 'unknown',
    payload: {},
  },
  malformed: 'not-json',
};
