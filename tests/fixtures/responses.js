/**
 * Test Response Fixtures
 * Mock LLM and API response data for testing
 */

/**
 * Successful LLM response fixtures
 */
export const successfulLLMResponses = {
  basic: {
    provider: 'openai',
    content: 'This is a test response',
    model: 'gpt-4',
    usage: {
      promptTokens: 10,
      completionTokens: 20,
      totalTokens: 30,
    },
    metadata: {},
    timestamp: '2025-11-13T00:00:00.000Z',
  },
  withMetadata: {
    provider: 'grok',
    content: 'Response with metadata',
    model: 'grok-beta',
    usage: {
      promptTokens: 15,
      completionTokens: 25,
      totalTokens: 40,
    },
    metadata: {
      reasoning: 'test reasoning',
      confidence: 0.95,
    },
    timestamp: '2025-11-13T00:00:00.000Z',
  },
};

/**
 * Error response fixtures
 */
export const errorResponses = {
  providerError: {
    error: 'Provider error: API key invalid',
    provider: 'openai',
    statusCode: 401,
  },
  rateLimitError: {
    error: 'Rate limit exceeded',
    provider: 'openai',
    statusCode: 429,
    retryAfter: 60,
  },
  timeoutError: {
    error: 'Request timeout',
    provider: 'openai',
    statusCode: 408,
  },
  serverError: {
    error: 'Internal server error',
    statusCode: 500,
  },
  validationError: {
    error: 'Prompt is required',
    statusCode: 400,
  },
};

/**
 * Health check response fixtures
 */
export const healthResponses = {
  healthy: {
    status: 'ok',
    timestamp: '2025-11-13T00:00:00.000Z',
    uptime: 12345,
    environment: 'test',
    version: '0.0.0',
    services: {
      llm: 'ok',
      database: 'ok',
      websocket: 'ok',
      github: 'disabled',
    },
  },
  degraded: {
    status: 'degraded',
    timestamp: '2025-11-13T00:00:00.000Z',
    uptime: 12345,
    environment: 'test',
    version: '0.0.0',
    services: {
      llm: 'error',
      database: 'ok',
      websocket: 'ok',
      github: 'disabled',
    },
  },
};

/**
 * Status response fixtures
 */
export const statusResponses = {
  basic: {
    application: {
      name: 'AI Orchestra Test',
      version: '0.0.0',
      environment: 'test',
      uptime: 12345,
    },
    llm: {
      totalQueries: 100,
      successfulQueries: 95,
      failedQueries: 5,
      averageResponseTime: 1.234,
    },
    github: {
      enabled: false,
    },
  },
};

/**
 * Provider list response fixtures
 */
export const providerResponses = {
  multiple: {
    providers: ['openai', 'grok', 'ollama'],
  },
  single: {
    providers: ['openai'],
  },
  none: {
    providers: [],
  },
};

/**
 * Stream chunk fixtures
 */
export const streamChunks = [
  {
    content: 'Hello',
    model: 'gpt-4',
    done: false,
  },
  {
    content: ' ',
    model: 'gpt-4',
    done: false,
  },
  {
    content: 'world',
    model: 'gpt-4',
    done: false,
  },
  {
    content: '',
    model: 'gpt-4',
    done: true,
  },
];

/**
 * GitHub API response fixtures
 */
export const githubResponses = {
  user: {
    login: 'testuser',
    id: 12345,
    name: 'Test User',
    email: 'test@example.com',
  },
  issues: [
    {
      id: 1,
      number: 1,
      title: 'Test Issue 1',
      state: 'open',
      labels: [{ name: 'bug' }],
    },
    {
      id: 2,
      number: 2,
      title: 'Test Issue 2',
      state: 'closed',
      labels: [{ name: 'enhancement' }],
    },
  ],
};

/**
 * Metrics response fixtures
 */
export const metricsResponses = {
  prometheus: `# HELP ai_orchestra_http_requests_total Total number of HTTP requests
# TYPE ai_orchestra_http_requests_total counter
ai_orchestra_http_requests_total{method="GET",route="/health",status_code="200"} 100
ai_orchestra_http_requests_total{method="POST",route="/api/query",status_code="200"} 50
ai_orchestra_http_requests_total{method="POST",route="/api/query",status_code="500"} 5

# HELP ai_orchestra_llm_queries_total Total number of LLM queries
# TYPE ai_orchestra_llm_queries_total counter
ai_orchestra_llm_queries_total{provider="openai",model="gpt-4",status="success"} 45
ai_orchestra_llm_queries_total{provider="openai",model="gpt-4",status="error"} 5
`,
};
