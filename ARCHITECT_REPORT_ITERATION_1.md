# ARCHITECT AGENT REPORT - Iteration 1

**Date:** 2025-11-13  
**Codebase:** AI-Orchestra  
**Branch:** claude/ai-agent-team-setup-011CV59nRWGNatFDYrFy8vpm  
**Architect:** Claude Architect Agent  

---

## EXECUTIVE SUMMARY

This report provides comprehensive architectural analysis and technical specifications for addressing critical issues in the AI-Orchestra codebase. The system demonstrates solid foundational patterns (Bridge, Strategy, Template Method) but suffers from:

1. **Security vulnerabilities** (P0): Missing input validation, data exposure
2. **Reliability issues** (P0/P1): Memory management, error handling gaps
3. **Structural debt**: Monolithic server.js, JS/TS duplication, in-memory state
4. **Missing patterns**: Repository, Circuit Breaker, proper middleware architecture

**Critical Path:** P0 issues must be resolved before production deployment.

---

## ARCHITECTURE OVERVIEW

### Current State

```
AI-Orchestra/
├── core/                    # JavaScript implementation (legacy)
│   ├── config_manager.js    # Configuration management
│   ├── llm_bridge.js        # Provider abstraction (Bridge pattern)
│   ├── base_connector.js    # Connector template (Template Method)
│   └── connectors/          # LLM provider implementations
├── src/                     # TypeScript implementation (modern)
│   ├── core/                # Core abstractions (BaseAgent, LLMClient)
│   ├── agents/              # Specialized agents
│   ├── pipeline/            # Pipeline orchestration
│   └── types/               # Type definitions
├── server.js                # Monolithic HTTP/WS server (537 lines)
└── dashboard/               # Next.js frontend with API routes
    └── src/app/api/         # Dashboard API endpoints
```

### Design Patterns Identified

| Pattern | Location | Implementation Quality |
|---------|----------|----------------------|
| **Bridge** | `core/llm_bridge.js` | ✅ Good - Clean abstraction over providers |
| **Strategy** | Load balancing (round-robin, random) | ✅ Good - Pluggable algorithms |
| **Template Method** | `core/base_connector.js`, `src/core/BaseAgent.ts` | ✅ Good - Clear extension points |
| **Factory** | `LLMClientFactory` (implied) | ⚠️ Partial - Could be more explicit |
| **Observer** | WebSocket event handling | ⚠️ Partial - No formal event bus |
| **Repository** | ❌ Missing | **CRITICAL** - Direct data access scattered |
| **Circuit Breaker** | ❌ Missing | **HIGH** - No failure protection |
| **Command** | ❌ Missing | **MEDIUM** - Agent actions not encapsulated |

---

## P0 SPECIFICATIONS (Engineer: Implement Immediately)

### P0-1: Input Validation Architecture

**File:** `server.js:284-380`

#### Problem Analysis

```javascript
// Current code - NO VALIDATION
app.post('/api/query', async (req, res) => {
  const { prompt, provider, model, temperature, maxTokens } = req.body;
  if (!prompt) {  // Only checks prompt existence
    return res.status(400).json({ error: 'Prompt is required' });
  }
  // No validation for temperature, maxTokens, provider, model
  const response = await llmBridge.query(options);
});
```

**Why This Is Critical:**
- Invalid parameters cause LLM API errors (cryptic error messages)
- Cost overruns: `maxTokens: 999999999` could cost thousands of dollars
- Security: Long prompts (>1MB) could DoS the server
- Injection attacks: Malicious provider names could exploit fallback logic

#### Proposed Solution

**Architecture Decision:** Centralized validation middleware using `express-validator` + custom validation schemas.

**Module Structure:**
```
src/validation/
├── middleware/
│   └── validateRequest.ts       # Generic validation middleware
├── schemas/
│   ├── querySchema.ts           # LLM query validation
│   ├── streamSchema.ts          # Stream query validation
│   └── pipelineSchema.ts        # Pipeline validation
└── validators/
    ├── llmValidators.ts         # Custom validators (model exists, etc.)
    └── commonValidators.ts      # Reusable validators
```

#### Implementation Plan

**Step 1: Install Dependencies**
```bash
npm install express-validator zod
```

**Step 2: Create Validation Schemas** (`src/validation/schemas/querySchema.ts`)
```typescript
import { z } from 'zod';

export const QuerySchema = z.object({
  prompt: z.string()
    .min(1, 'Prompt is required')
    .max(50000, 'Prompt exceeds maximum length of 50,000 characters'),
  
  provider: z.enum(['openai', 'grok', 'ollama'])
    .optional()
    .describe('LLM provider'),
  
  model: z.string()
    .max(100)
    .optional()
    .describe('Model identifier'),
  
  temperature: z.number()
    .min(0, 'Temperature must be >= 0')
    .max(2, 'Temperature must be <= 2')
    .optional()
    .default(0.7),
  
  maxTokens: z.number()
    .int('maxTokens must be an integer')
    .min(1)
    .max(4096, 'maxTokens cannot exceed 4096')
    .optional()
    .default(1000),
});

export type QueryInput = z.infer<typeof QuerySchema>;
```

**Step 3: Create Validation Middleware** (`src/validation/middleware/validateRequest.ts`)
```typescript
import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

export function validateRequest(schema: ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      next(error);
    }
  };
}
```

**Step 4: Apply to Routes** (`server.js`)
```javascript
import { validateRequest } from './src/validation/middleware/validateRequest.js';
import { QuerySchema } from './src/validation/schemas/querySchema.js';

// Apply validation middleware
app.post('/api/query', validateRequest(QuerySchema), async (req, res) => {
  // req.body is now validated and typed
  const response = await llmBridge.query(req.body);
  res.json(response);
});
```

**Step 5: Add Provider Validation**
```typescript
// Custom validator: Check if provider is available
export const availableProviderValidator = (value: string | undefined) => {
  if (!value) return true; // Optional
  const available = llmBridge.getAvailableProviders();
  if (!available.includes(value)) {
    throw new Error(`Provider "${value}" is not available. Available: ${available.join(', ')}`);
  }
  return true;
};
```

#### Validation Criteria (QA Testing)

- [ ] Reject `temperature < 0` or `temperature > 2` with 400 status
- [ ] Reject `maxTokens > 4096` with 400 status
- [ ] Reject `prompt` longer than 50,000 characters with 400 status
- [ ] Reject empty/missing `prompt` with 400 status
- [ ] Reject invalid `provider` with helpful error message
- [ ] Accept valid requests and pass to LLM bridge
- [ ] Return structured error with field names and messages
- [ ] Performance: Validation adds <5ms overhead

#### Risk Assessment

- **Low Risk:** Well-established pattern, minimal breaking changes
- **Mitigation:** Deploy validation in "warning mode" first (log but don't reject)
- **Rollback:** Remove middleware if issues arise

---

### P0-2: Error Handling Strategy for Pipeline Components

**File:** `src/pipeline/PipelineController.ts:145-168`

#### Problem Analysis

```typescript
// Current code - NO TRY-CATCH
for (const component of frontend.components) {
  const result = await this.frontendAgent.run({...});
  // If this throws, entire pipeline stops
  components.push(result);
}
```

**Why This Is Critical:**
- One failing component kills entire pipeline (10 components, 1 fails = lose 9)
- No partial results saved
- Poor user experience: "Your 2-hour pipeline failed at minute 118"
- No retry mechanism for transient failures

#### Proposed Solution

**Architecture Decision:** Graceful degradation with error boundaries and retry logic.

**Error Handling Hierarchy:**
```
Pipeline Level
├── Stage Level (Frontend, Backend, QA, Debug)
│   ├── Component Level (Individual agent executions)
│   │   ├── Retry with exponential backoff (transient errors)
│   │   └── Fail gracefully (permanent errors)
│   └── Continue with warnings (non-critical failures)
└── Global error handler (catch-all)
```

#### Implementation Plan

**Step 1: Define Error Types** (`src/types/error.types.ts`)
```typescript
export enum ErrorSeverity {
  FATAL = 'fatal',       // Stop entire pipeline
  ERROR = 'error',       // Stop stage, continue pipeline
  WARNING = 'warning',   // Log and continue
  INFO = 'info',         // Informational only
}

export class PipelineError extends Error {
  constructor(
    message: string,
    public severity: ErrorSeverity,
    public stage: PipelineStage,
    public retryable: boolean = true,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'PipelineError';
  }
}

export class AgentExecutionError extends PipelineError {
  constructor(
    message: string,
    public agentId: string,
    stage: PipelineStage,
    retryable: boolean = true
  ) {
    super(message, ErrorSeverity.ERROR, stage, retryable);
    this.name = 'AgentExecutionError';
  }
}
```

**Step 2: Add Retry Logic Wrapper** (`src/pipeline/utils/retry.ts`)
```typescript
interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig,
  errorHandler?: (error: Error, attempt: number) => void
): Promise<T> {
  const { maxAttempts, baseDelay, maxDelay, backoffMultiplier } = config;
  
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (errorHandler) {
        errorHandler(lastError, attempt);
      }
      
      // Don't retry on validation errors
      if (error instanceof z.ZodError) {
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt === maxAttempts) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        baseDelay * Math.pow(backoffMultiplier, attempt - 1),
        maxDelay
      );
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}
```

**Step 3: Refactor Frontend Stage with Error Boundaries**
```typescript
private async runFrontendStage(featureSpec: FeatureSpec): Promise<StageResult> {
  const stageResult: StageResult = {
    stage: PipelineStage.FRONTEND,
    status: 'success',
    startTime: Date.now(),
    artifacts: [],
    errors: [],  // NEW: Track partial errors
  };

  const frontend = featureSpec.frontend!;
  const components: FrontEndOutput[] = [];
  let successCount = 0;
  let failureCount = 0;

  for (const component of frontend.components) {
    this.log('info', PipelineStage.FRONTEND, `Generating component: ${component.name}`);
    
    try {
      // Wrap in retry logic
      const result = await withRetry(
        () => this.frontendAgent.run({
          feature: component.description,
          componentName: component.name,
          styling: frontend.styling || 'tailwind',
          framework: frontend.framework || 'react',
          typescript: true,
          accessibility: true,
          responsive: true,
          context: featureSpec.description,
        }),
        {
          maxAttempts: 3,
          baseDelay: 1000,
          maxDelay: 10000,
          backoffMultiplier: 2,
        },
        (error, attempt) => {
          this.log('warn', PipelineStage.FRONTEND, 
            `Component ${component.name} failed (attempt ${attempt}/3): ${error.message}`
          );
        }
      );
      
      components.push(result);
      successCount++;
      
      // Add artifacts (same as before)
      this.addArtifact('frontend', PipelineStage.FRONTEND, {
        type: 'component',
        path: `${result.componentName}.tsx`,
        content: result.code,
      });
      
    } catch (error) {
      failureCount++;
      const errorMsg = `Component ${component.name} failed after retries: ${error}`;
      
      this.log('error', PipelineStage.FRONTEND, errorMsg);
      
      stageResult.errors!.push({
        component: component.name,
        error: errorMsg,
        severity: ErrorSeverity.ERROR,
      });
      
      // DECISION POINT: Continue or stop?
      if (this.config.continueOnErrors) {
        // Continue with remaining components
        continue;
      } else {
        // Stop stage but don't kill pipeline
        stageResult.status = 'failure';
        break;
      }
    }
  }

  stageResult.output = components;
  
  // Determine final status
  if (failureCount === 0) {
    stageResult.status = 'success';
  } else if (successCount > 0) {
    stageResult.status = 'partial';  // NEW status
    this.log('warn', PipelineStage.FRONTEND, 
      `Partial success: ${successCount}/${frontend.components.length} components generated`
    );
  } else {
    stageResult.status = 'failure';
  }
  
  this.runResult.summary.frontendGenerated = successCount > 0;
  this.runResult.summary.frontendComponentsTotal = frontend.components.length;
  this.runResult.summary.frontendComponentsSuccess = successCount;
  this.runResult.summary.frontendComponentsFailed = failureCount;

  stageResult.endTime = Date.now();
  stageResult.duration = stageResult.endTime - stageResult.startTime;

  return stageResult;
}
```

**Step 4: Add Global Error Handler**
```typescript
public async run(featureSpec: FeatureSpec): Promise<PipelineRunResult> {
  try {
    // ... existing pipeline logic
  } catch (error) {
    // Global error boundary
    this.handlePipelineError(error);
    
    this.runResult.status = 'failed';
    this.runResult.endTime = Date.now();
    this.runResult.totalDuration = this.runResult.endTime - this.runResult.startTime;
    
    // Save partial results
    if (this.config.saveArtifacts) {
      await this.saveArtifacts();
    }
    
    return this.runResult;
  }
}

private handlePipelineError(error: unknown): void {
  if (error instanceof PipelineError) {
    this.log(error.severity, error.stage, error.message);
  } else if (error instanceof Error) {
    this.log('error', PipelineStage.FAILED, `Unexpected error: ${error.message}\n${error.stack}`);
  } else {
    this.log('error', PipelineStage.FAILED, `Unknown error: ${String(error)}`);
  }
}
```

**Step 5: Update Config to Support Error Handling**
```typescript
// PipelineConfig additions
export const PipelineConfigSchema = z.object({
  // ... existing config
  continueOnErrors: z.boolean().default(false),
  retryConfig: z.object({
    maxAttempts: z.number().default(3),
    baseDelay: z.number().default(1000),
    maxDelay: z.number().default(10000),
    backoffMultiplier: z.number().default(2),
  }).optional(),
});
```

#### Validation Criteria (QA Testing)

- [ ] Pipeline continues when one component fails (if `continueOnErrors: true`)
- [ ] Retries 3 times with exponential backoff (1s, 2s, 4s)
- [ ] Saves partial results when stage partially succeeds
- [ ] Logs all errors with stage and component context
- [ ] Returns status `partial` when some components succeed
- [ ] Validation errors skip retries (fail fast)
- [ ] Global error handler catches unexpected errors
- [ ] Artifacts saved even when pipeline fails

#### Risk Assessment

- **Medium Risk:** Changes core pipeline logic
- **Mitigation:** 
  - Feature flag: `continueOnErrors` defaults to `false` (current behavior)
  - Comprehensive unit tests for all error paths
  - Integration test: Inject failures at each stage
- **Rollback:** Set `continueOnErrors: false` globally

---

### P0-3: Safe JSON Parsing Patterns for Agent Responses

**File:** `src/agents/BackEndDevAgent.ts:221-228`

#### Problem Analysis

```typescript
// Current code - UNSAFE JSON PARSING
const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
if (jsonMatch) {
  return JSON.parse(jsonMatch[1]);  // Can throw if malformed
}
return JSON.parse(content);  // Can throw
```

**Why This Is Critical:**
- LLMs occasionally return invalid JSON (trailing commas, unquoted keys)
- Thrown errors crash agent execution
- No graceful degradation
- Poor error messages: "Unexpected token } in JSON at position 234"

#### Proposed Solution

**Architecture Decision:** Safe JSON parser with fallback strategies and schema validation.

**Strategy Hierarchy:**
1. Try parsing JSON markdown block
2. Try parsing raw content
3. Try fixing common JSON errors (trailing commas, unquoted keys)
4. Return structured error with original content

#### Implementation Plan

**Step 1: Create JSON Utility Module** (`src/utils/jsonParser.ts`)
```typescript
import { z, ZodSchema } from 'zod';

export interface ParseResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  rawContent?: string;
}

/**
 * Safely parse JSON from LLM response with fallback strategies
 */
export function safeParseJSON<T = any>(
  content: string,
  schema?: ZodSchema<T>
): ParseResult<T> {
  const strategies = [
    extractAndParseCodeBlock,
    parseRawJSON,
    parseFixedJSON,
  ];
  
  for (const strategy of strategies) {
    const result = strategy(content);
    if (result.success) {
      // Validate against schema if provided
      if (schema) {
        try {
          const validated = schema.parse(result.data);
          return { success: true, data: validated };
        } catch (error) {
          return {
            success: false,
            error: `JSON validation failed: ${error}`,
            rawContent: content,
          };
        }
      }
      return result;
    }
  }
  
  return {
    success: false,
    error: 'Failed to parse JSON after all strategies',
    rawContent: content,
  };
}

/**
 * Strategy 1: Extract and parse JSON from code block
 */
function extractAndParseCodeBlock(content: string): ParseResult<any> {
  // Match ```json or ``` followed by JSON
  const patterns = [
    /```json\s*(\{[\s\S]*?\})\s*```/,
    /```\s*(\{[\s\S]*?\})\s*```/,
    /```json\s*(\[[\s\S]*?\])\s*```/,
    /```\s*(\[[\s\S]*?\])\s*```/,
  ];
  
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      try {
        const parsed = JSON.parse(match[1]);
        return { success: true, data: parsed };
      } catch (error) {
        // Try next pattern
        continue;
      }
    }
  }
  
  return { success: false, error: 'No JSON code block found' };
}

/**
 * Strategy 2: Parse raw content as JSON
 */
function parseRawJSON(content: string): ParseResult<any> {
  try {
    const parsed = JSON.parse(content.trim());
    return { success: true, data: parsed };
  } catch (error) {
    return { success: false, error: `Raw JSON parse failed: ${error}` };
  }
}

/**
 * Strategy 3: Fix common JSON errors and parse
 */
function parseFixedJSON(content: string): ParseResult<any> {
  try {
    // Extract JSON from code block or use raw
    let jsonStr = content;
    const match = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      jsonStr = match[1];
    }
    
    // Fix common issues
    jsonStr = fixCommonJSONErrors(jsonStr);
    
    const parsed = JSON.parse(jsonStr);
    return { success: true, data: parsed };
  } catch (error) {
    return { success: false, error: `Fixed JSON parse failed: ${error}` };
  }
}

/**
 * Fix common JSON errors from LLM responses
 */
function fixCommonJSONErrors(json: string): string {
  let fixed = json.trim();
  
  // Remove trailing commas before } or ]
  fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
  
  // Fix unquoted keys (simple cases)
  fixed = fixed.replace(/(\s*)(\w+)(\s*):/g, '$1"$2"$3:');
  
  // Remove comments (// and /* */)
  fixed = fixed.replace(/\/\/.*$/gm, '');
  fixed = fixed.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // Fix single quotes to double quotes (careful with content)
  fixed = fixed.replace(/'/g, '"');
  
  return fixed;
}

/**
 * Extract specific field from parsed JSON with fallback
 */
export function extractField<T>(
  parsed: any,
  fieldPath: string[],
  fallback?: T
): T | undefined {
  let current = parsed;
  
  for (const field of fieldPath) {
    if (current && typeof current === 'object' && field in current) {
      current = current[field];
    } else {
      return fallback;
    }
  }
  
  return current as T;
}
```

**Step 2: Create Response Schemas** (`src/agents/schemas/backendResponseSchema.ts`)
```typescript
import { z } from 'zod';

export const BackendAgentResponseSchema = z.object({
  success: z.boolean(),
  endpoint: z.string(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  code: z.string().min(1, 'Code cannot be empty'),
  middleware: z.string().optional(),
  model: z.string().optional(),
  tests: z.string().optional(),
  dependencies: z.array(z.string()).optional(),
  notes: z.string().optional(),
});
```

**Step 3: Refactor Agent Response Parsing**
```typescript
// In BackEndDevAgent.ts
import { safeParseJSON } from '../utils/jsonParser.js';
import { BackendAgentResponseSchema } from './schemas/backendResponseSchema.js';

protected async execute(input: BackEndInput, context: string): Promise<BackEndOutput> {
  // ... LLM call logic ...
  
  const response = await this.llmClient.generate({
    messages: this.buildMessages(input, context),
    temperature: 0.2,
    maxTokens: 2000,
  });
  
  const content = response.content;
  
  // Safe JSON parsing with schema validation
  const parseResult = safeParseJSON(content, BackendAgentResponseSchema);
  
  if (!parseResult.success) {
    // Enhanced error handling
    this.log('error', `Failed to parse LLM response: ${parseResult.error}`);
    this.log('debug', `Raw content:\n${parseResult.rawContent?.substring(0, 500)}...`);
    
    throw new AgentExecutionError(
      `Backend agent response parsing failed: ${parseResult.error}`,
      this.config.id,
      PipelineStage.BACKEND,
      true  // Retryable - LLM might return valid JSON next time
    );
  }
  
  // Validate required fields exist
  const output = parseResult.data!;
  
  if (!output.code || output.code.trim().length === 0) {
    throw new AgentExecutionError(
      'Backend agent returned empty code',
      this.config.id,
      PipelineStage.BACKEND,
      true
    );
  }
  
  return output;
}
```

**Step 4: Add Logging Helper**
```typescript
// In BaseAgent.ts
protected log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${this.config.id}] [${level.toUpperCase()}] ${message}`;
  
  if (level === 'error') {
    console.error(logMessage);
  } else if (level === 'warn') {
    console.warn(logMessage);
  } else if (this.config.verbose || level === 'info') {
    console.log(logMessage);
  }
}
```

**Step 5: Add Unit Tests** (`src/utils/__tests__/jsonParser.test.ts`)
```typescript
import { safeParseJSON } from '../jsonParser';
import { z } from 'zod';

describe('safeParseJSON', () => {
  const TestSchema = z.object({
    name: z.string(),
    value: z.number(),
  });
  
  it('should parse JSON from code block', () => {
    const content = '```json\n{"name": "test", "value": 42}\n```';
    const result = safeParseJSON(content, TestSchema);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ name: 'test', value: 42 });
  });
  
  it('should parse raw JSON', () => {
    const content = '{"name": "test", "value": 42}';
    const result = safeParseJSON(content, TestSchema);
    expect(result.success).toBe(true);
  });
  
  it('should fix trailing commas', () => {
    const content = '{"name": "test", "value": 42,}';
    const result = safeParseJSON(content, TestSchema);
    expect(result.success).toBe(true);
  });
  
  it('should return error for invalid JSON', () => {
    const content = 'This is not JSON';
    const result = safeParseJSON(content, TestSchema);
    expect(result.success).toBe(false);
    expect(result.rawContent).toBe(content);
  });
  
  it('should validate against schema', () => {
    const content = '{"name": "test"}';  // Missing 'value'
    const result = safeParseJSON(content, TestSchema);
    expect(result.success).toBe(false);
    expect(result.error).toContain('validation failed');
  });
});
```

#### Validation Criteria (QA Testing)

- [ ] Parse valid JSON from code blocks
- [ ] Parse valid raw JSON
- [ ] Fix trailing commas and parse
- [ ] Fix unquoted keys and parse
- [ ] Return structured error for unparseable content
- [ ] Validate parsed JSON against schema
- [ ] Include raw content in error response
- [ ] Log parse errors with context
- [ ] Retry agent execution on parse failures (retryable error)

#### Risk Assessment

- **Low Risk:** Pure utility function, no breaking changes
- **Mitigation:** Comprehensive unit tests covering all edge cases
- **Rollback:** Easy - revert to try-catch JSON.parse

---

## P1 SPECIFICATIONS (Engineer: Implement This Sprint)

### P1-1: EventSource URL Data Exposure - Architectural Solution

**File:** `dashboard/lib/api.ts:91-94`

#### Problem Analysis

```typescript
streamQuery(data: any): EventSource {
  const params = new URLSearchParams({ data: JSON.stringify(data) });
  return new EventSource(`${this.baseUrl}/api/stream?${params}`);
}
```

**Why This Is Problematic:**
- EventSource only supports GET requests
- Sensitive data (prompts, API keys) in URL query params
- URLs logged in server logs, browser history, proxy caches
- URL length limit (~2048 chars) truncates large prompts
- Violates HTTP semantics (GET for non-idempotent operations)

#### Proposed Solution

**Architecture Decision:** Replace EventSource with Fetch + ReadableStream for POST-based streaming.

**Why Fetch over EventSource:**
- Supports POST requests
- No URL length limits
- Request body not logged
- Standard `text/event-stream` parsing
- Better error handling
- Cancellable via AbortController

#### Implementation Plan

**Step 1: Create Stream Utility** (`dashboard/lib/streamUtil.ts`)
```typescript
export interface StreamChunk {
  type: 'content' | 'metadata' | 'error' | 'done';
  data?: any;
  error?: string;
}

export async function* fetchSSEStream(
  url: string,
  options: RequestInit
): AsyncGenerator<StreamChunk> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  if (!response.body) {
    throw new Error('Response body is null');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }

      // Decode chunk and add to buffer
      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE messages
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';  // Keep incomplete message in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          
          if (data === '[DONE]') {
            yield { type: 'done' };
            return;
          }

          try {
            const parsed = JSON.parse(data);
            yield {
              type: parsed.type || 'content',
              data: parsed.data || parsed,
            };
          } catch (error) {
            console.error('Failed to parse SSE data:', error);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
```

**Step 2: Update ApiClient** (`dashboard/lib/api.ts`)
```typescript
import { fetchSSEStream, StreamChunk } from './streamUtil';

export class ApiClient {
  // ... existing methods ...

  /**
   * Stream query with POST (secure)
   * @deprecated Use streamQueryPost instead
   */
  streamQuery(data: any): EventSource {
    console.warn('streamQuery is deprecated - URLs expose data. Use streamQueryPost instead.');
    const params = new URLSearchParams({ data: JSON.stringify(data) });
    return new EventSource(`${this.baseUrl}/api/stream?${params}`);
  }

  /**
   * Stream query with POST (recommended)
   */
  async *streamQueryPost(data: {
    prompt: string;
    provider?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }): AsyncGenerator<StreamChunk> {
    const controller = new AbortController();
    
    try {
      yield* fetchSSEStream(`${this.baseUrl}/api/stream`, {
        method: 'POST',
        body: JSON.stringify(data),
        signal: controller.signal,
      });
    } catch (error) {
      console.error('Stream query failed:', error);
      yield {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  /**
   * Cancel ongoing stream
   */
  cancelStream(controller: AbortController): void {
    controller.abort();
  }
}
```

**Step 3: Update Server Endpoint** (`server.js`)
```javascript
// Update /api/stream to support POST
app.post('/api/stream', async (req, res) => {
  const start = Date.now();
  const { prompt, provider, model, temperature, maxTokens } = req.body;

  try {
    if (!prompt) {
      llmQueryTotal.labels(provider || 'unknown', model || 'unknown', 'error').inc();
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');  // Disable nginx buffering

    // Stream response
    for await (const chunk of llmBridge.streamQuery({
      prompt,
      provider,
      model,
      temperature,
      maxTokens,
    })) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();

    // Record metrics
    const duration = (Date.now() - start) / 1000;
    llmQueryDuration.labels(provider || 'unknown', model || 'unknown').observe(duration);
    llmQueryTotal.labels(provider || 'unknown', model || 'unknown', 'success').inc();

    logger.info('LLM Stream Query', {
      provider,
      model,
      duration: `${duration.toFixed(3)}s`,
    });
  } catch (error) {
    const duration = (Date.now() - start) / 1000;
    llmQueryDuration.labels(provider || 'unknown', model || 'unknown').observe(duration);
    llmQueryTotal.labels(provider || 'unknown', model || 'unknown', 'error').inc();

    logger.error('LLM Stream Query failed', {
      error: error.message,
      provider,
      model,
      duration: `${duration.toFixed(3)}s`,
    });
    
    res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
    res.end();
  }
});

// Keep GET endpoint for backward compatibility with deprecation notice
app.get('/api/stream', async (req, res) => {
  logger.warn('GET /api/stream is deprecated - use POST to avoid data exposure');
  
  // ... existing GET implementation with deprecation header
  res.setHeader('Deprecation', 'true');
  res.setHeader('Sunset', '2025-12-31');
  // ... rest of implementation
});
```

**Step 4: Update UI Components** (Example usage)
```typescript
// In a React component
const handleStreamQuery = async () => {
  const controller = new AbortController();
  
  try {
    for await (const chunk of api.streamQueryPost({
      prompt: userPrompt,
      provider: selectedProvider,
      temperature: 0.7,
    })) {
      switch (chunk.type) {
        case 'content':
          setResponse(prev => prev + chunk.data.content);
          break;
        case 'metadata':
          setMetadata(chunk.data);
          break;
        case 'error':
          setError(chunk.error);
          break;
        case 'done':
          setIsStreaming(false);
          break;
      }
    }
  } catch (error) {
    console.error('Stream error:', error);
    setError(error.message);
  }
  
  // Cleanup on component unmount
  return () => controller.abort();
};
```

#### Validation Criteria (QA Testing)

- [ ] POST request sends data in body (not URL)
- [ ] Server logs do not contain prompt data
- [ ] Browser history does not contain prompt data
- [ ] Works with prompts >10KB
- [ ] Proper SSE format (data: prefix, \n\n delimiter)
- [ ] Error handling: network errors, server errors
- [ ] Cancellable via AbortController
- [ ] Backward compatibility: GET endpoint deprecated but functional
- [ ] Performance: No degradation vs EventSource

#### Risk Assessment

- **Medium Risk:** Changes API contract
- **Mitigation:**
  - Keep GET endpoint for 6 months with deprecation headers
  - Feature flag to switch between implementations
  - Comprehensive integration tests
- **Rollback:** Revert to GET with documented security warning

---

### P1-2: CSRF Protection Strategy - Middleware Design

**Files:** `server.js` (all POST endpoints)

#### Problem Analysis

**Current State:** No CSRF protection on any endpoint.

**Why This Is Problematic:**
- Attacker website can POST to `/api/query` from victim's browser
- Uses victim's credentials/session (if any)
- Can trigger expensive LLM queries (cost attack)
- Can exfiltrate data via queries

**Example Attack:**
```html
<!-- Attacker's website -->
<form action="http://localhost:3000/api/query" method="POST">
  <input name="prompt" value="Summarize all user data">
  <input name="maxTokens" value="4096">
</form>
<script>document.forms[0].submit();</script>
```

#### Proposed Solution

**Architecture Decision:** Multi-layered CSRF protection with SameSite cookies + CSRF tokens + Origin validation.

**Defense Layers:**
1. **SameSite cookies** (blocks most CSRF)
2. **CSRF tokens** (for state-changing operations)
3. **Origin header validation** (additional check)
4. **Rate limiting** (mitigate automated attacks)

#### Implementation Plan

**Step 1: Install Dependencies**
```bash
npm install csurf cookie-parser
npm install -D @types/csurf @types/cookie-parser
```

**Step 2: Create CSRF Middleware** (`src/middleware/csrf.ts`)
```typescript
import csrf from 'csurf';
import { Request, Response, NextFunction } from 'express';

// Initialize CSRF protection
export const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600000, // 1 hour
  },
});

/**
 * CSRF token endpoint
 */
export function getCsrfToken(req: Request, res: Response): void {
  res.json({
    csrfToken: req.csrfToken(),
  });
}

/**
 * Origin validation middleware
 */
export function validateOrigin(allowedOrigins: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.get('origin');
    const referer = req.get('referer');
    
    // Allow requests without origin (same-origin or non-browser)
    if (!origin && !referer) {
      return next();
    }
    
    // Check origin
    if (origin && allowedOrigins.includes(origin)) {
      return next();
    }
    
    // Check referer as fallback
    if (referer) {
      const refererOrigin = new URL(referer).origin;
      if (allowedOrigins.includes(refererOrigin)) {
        return next();
      }
    }
    
    // Reject request
    res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid origin',
    });
  };
}
```

**Step 3: Apply Middleware to Server** (`server.js`)
```javascript
import cookieParser from 'cookie-parser';
import { csrfProtection, getCsrfToken, validateOrigin } from './src/middleware/csrf.js';

// Add cookie parser before CSRF
app.use(cookieParser());

// Define allowed origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  process.env.ALLOWED_ORIGIN,
].filter(Boolean);

// Apply origin validation to all routes
app.use(validateOrigin(allowedOrigins));

// CSRF token endpoint (must be before csrfProtection)
app.get('/api/csrf-token', getCsrfToken);

// Apply CSRF protection to state-changing routes
app.post('/api/query', csrfProtection, validateRequest(QuerySchema), async (req, res) => {
  // ... existing implementation
});

app.post('/api/stream', csrfProtection, async (req, res) => {
  // ... existing implementation
});

// Apply to all POST/PUT/DELETE routes
const protectedRoutes = ['/api/query', '/api/stream', '/api/pipeline/run'];
protectedRoutes.forEach(route => {
  app.use(route, csrfProtection);
});

// CSRF error handler
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    logger.warn('CSRF token validation failed', {
      ip: req.ip,
      path: req.path,
      origin: req.get('origin'),
    });
    
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid CSRF token',
    });
  }
  
  next(err);
});
```

**Step 4: Update API Client** (`dashboard/lib/api.ts`)
```typescript
export class ApiClient {
  private baseUrl: string;
  private csrfToken: string | null = null;

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl;
    this.initializeCsrfToken();
  }

  /**
   * Fetch CSRF token on initialization
   */
  private async initializeCsrfToken(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/csrf-token`, {
        credentials: 'include',  // Include cookies
      });
      const data = await response.json();
      this.csrfToken = data.csrfToken;
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error);
    }
  }

  /**
   * Get current CSRF token (fetch if not cached)
   */
  private async getCsrfToken(): Promise<string> {
    if (!this.csrfToken) {
      await this.initializeCsrfToken();
    }
    return this.csrfToken!;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Add CSRF token to state-changing requests
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options?.headers,
    };
    
    if (options?.method && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method)) {
      const csrfToken = await this.getCsrfToken();
      headers['X-CSRF-Token'] = csrfToken;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',  // Include cookies for CSRF cookie
      });

      // If CSRF token expired, refresh and retry
      if (response.status === 403) {
        const error = await response.json().catch(() => ({}));
        if (error.message === 'Invalid CSRF token') {
          this.csrfToken = null;  // Clear cached token
          const newToken = await this.getCsrfToken();
          headers['X-CSRF-Token'] = newToken;
          
          // Retry request
          return this.request<T>(endpoint, { ...options, headers });
        }
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // ... rest of methods unchanged (use this.request)
}
```

**Step 5: Add Configuration** (`.env`)
```bash
# CSRF Configuration
ALLOWED_ORIGIN=http://localhost:3001
CSRF_SECRET=<generate-random-secret>
SESSION_SECRET=<generate-random-secret>
```

#### Validation Criteria (QA Testing)

- [ ] CSRF token required for POST requests
- [ ] Request without token returns 403
- [ ] Request with invalid token returns 403
- [ ] Request with valid token succeeds
- [ ] Token auto-refreshes on expiration
- [ ] Origin validation blocks unauthorized origins
- [ ] SameSite cookie set correctly
- [ ] Token rotation after significant actions
- [ ] Performance: <2ms overhead per request

**Security Test Cases:**
- [ ] Attack: External site POST → Blocked by origin validation
- [ ] Attack: Stolen token from old session → Blocked by token expiration
- [ ] Attack: Token from different session → Blocked by cookie mismatch

#### Risk Assessment

- **Medium Risk:** Adds complexity to API calls
- **Mitigation:**
  - Automatic token management in ApiClient
  - Clear error messages for debugging
  - Gradual rollout with monitoring
- **Rollback:** Remove middleware (CSRF not critical for public APIs without auth)

---

### P1-3: Configuration Null Safety Patterns

**File:** `core/config_manager.js:151`

#### Problem Analysis

```javascript
parseBool(value, defaultValue = false) {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  return value.toLowerCase() === 'true' || value === '1';  // TypeError if value is not string
}
```

**Why This Is Problematic:**
- `value.toLowerCase()` throws TypeError if `value` is number, object, array
- Can happen if env var parsing fails or config JSON malformed
- Crashes application during startup (critical failure point)

**Example Failure:**
```javascript
RATE_LIMIT_ENABLED=1  // Number, not string
// parseBool(1) → (1).toLowerCase() → TypeError
```

#### Proposed Solution

**Architecture Decision:** Type-safe configuration parsing with Zod schemas + safe type coercion.

#### Implementation Plan

**Step 1: Create Config Schema** (`src/config/schema.ts`)
```typescript
import { z } from 'zod';

// Safe boolean coercion
const BooleanSchema = z.union([
  z.boolean(),
  z.string().transform(s => s.toLowerCase() === 'true' || s === '1'),
  z.number().transform(n => n === 1),
]).pipe(z.boolean());

export const ConfigSchema = z.object({
  application: z.object({
    name: z.string().default('AI Orchestra'),
    version: z.string().default('0.6.0'),
    environment: z.enum(['development', 'production', 'test']).default('development'),
    port: z.coerce.number().int().min(1).max(65535).default(3000),
    host: z.string().default('localhost'),
  }),
  
  providers: z.object({
    openai: z.object({
      enabled: BooleanSchema.default(false),
      apiKey: z.string().optional(),
      organization: z.string().optional(),
      baseURL: z.string().url().optional(),
      defaultModel: z.string().default('gpt-4-turbo-preview'),
    }),
    grok: z.object({
      enabled: BooleanSchema.default(false),
      apiKey: z.string().optional(),
      baseURL: z.string().url().default('https://api.x.ai/v1'),
      defaultModel: z.string().default('grok-beta'),
    }),
    ollama: z.object({
      enabled: BooleanSchema.default(false),
      host: z.string().url().default('http://localhost:11434'),
      defaultModel: z.string().default('llama2'),
    }),
  }),
  
  llm: z.object({
    defaultProvider: z.enum(['openai', 'grok', 'ollama']).default('openai'),
    loadBalancing: z.enum(['round-robin', 'random', 'default']).default('round-robin'),
    enableFallback: BooleanSchema.default(true),
    requestTimeout: z.coerce.number().int().min(1000).default(60000),
    retryAttempts: z.coerce.number().int().min(0).max(10).default(3),
    retryDelay: z.coerce.number().int().min(100).default(1000),
  }),
  
  security: z.object({
    helmet: z.object({
      enabled: BooleanSchema.default(true),
    }),
    cors: z.object({
      enabled: BooleanSchema.default(true),
      origin: z.string().default('http://localhost:3000'),
      credentials: BooleanSchema.default(true),
    }),
    rateLimiting: z.object({
      enabled: BooleanSchema.default(false),
      windowMs: z.coerce.number().int().min(1000).default(60000),
      maxRequests: z.coerce.number().int().min(1).default(100),
    }),
    apiKey: z.string().optional(),
    jwtSecret: z.string().optional(),
  }),
  
  websocket: z.object({
    enabled: BooleanSchema.default(true),
    port: z.coerce.number().int().min(1).max(65535).default(3001),
  }),
  
  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    filePath: z.string().default('./logs/orchestra.log'),
    maxFiles: z.coerce.number().int().min(1).default(10),
    maxSize: z.string().default('10m'),
  }),
  
  database: z.object({
    type: z.enum(['sqlite', 'postgresql', 'mysql']).default('sqlite'),
    path: z.string().default('./database/memory.sqlite'),
    host: z.string().optional(),
    port: z.coerce.number().int().optional(),
    name: z.string().optional(),
    user: z.string().optional(),
    password: z.string().optional(),
    poolSize: z.coerce.number().int().min(1).max(100).default(10),
  }),
  
  github: z.object({
    enabled: BooleanSchema.default(false),
    token: z.string().optional(),
    owner: z.string().optional(),
    repo: z.string().optional(),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;
```

**Step 2: Refactor ConfigManager** (`core/config_manager.js` → `src/config/ConfigManager.ts`)
```typescript
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { ConfigSchema, type Config } from './schema';

export class ConfigManager {
  private config: Config;
  
  constructor(options: { envPath?: string; settingsPath?: string } = {}) {
    const envPath = options.envPath || '.env';
    const settingsPath = options.settingsPath || './config/settings.json';
    
    this.config = this.loadConfig(envPath, settingsPath);
  }
  
  private loadConfig(envPath: string, settingsPath: string): Config {
    // Load environment variables
    dotenv.config({ path: envPath });
    
    // Load settings.json
    let settings = {};
    try {
      const content = readFileSync(settingsPath, 'utf-8');
      settings = JSON.parse(content);
    } catch (error) {
      console.warn(`[ConfigManager] Failed to load ${settingsPath}:`, error.message);
    }
    
    // Merge with environment variables (env takes precedence)
    const merged = this.mergeWithEnv(settings);
    
    // Validate with Zod schema
    try {
      return ConfigSchema.parse(merged);
    } catch (error) {
      console.error('[ConfigManager] Configuration validation failed:');
      if (error instanceof z.ZodError) {
        error.errors.forEach(err => {
          console.error(`  - ${err.path.join('.')}: ${err.message}`);
        });
      }
      throw new Error('Invalid configuration');
    }
  }
  
  private mergeWithEnv(settings: any): any {
    // Environment variables override settings
    return {
      application: {
        name: settings.application?.name,
        version: settings.application?.version,
        environment: process.env.NODE_ENV,
        port: process.env.PORT || settings.application?.port,
        host: process.env.HOST || settings.application?.host,
      },
      providers: {
        openai: {
          enabled: process.env.OPENAI_ENABLED ?? settings.llm?.providers?.openai?.enabled,
          apiKey: process.env.OPENAI_API_KEY,
          organization: process.env.OPENAI_ORGANIZATION,
          baseURL: process.env.OPENAI_BASE_URL,
          defaultModel: process.env.OPENAI_DEFAULT_MODEL || settings.llm?.providers?.openai?.models?.[0]?.id,
        },
        grok: {
          enabled: process.env.GROK_ENABLED ?? settings.llm?.providers?.grok?.enabled,
          apiKey: process.env.GROK_API_KEY || process.env.XAI_API_KEY,
          baseURL: process.env.GROK_BASE_URL,
          defaultModel: process.env.GROK_DEFAULT_MODEL || settings.llm?.providers?.grok?.models?.[0]?.id,
        },
        ollama: {
          enabled: process.env.OLLAMA_ENABLED ?? settings.llm?.providers?.ollama?.enabled,
          host: process.env.OLLAMA_HOST,
          defaultModel: process.env.OLLAMA_DEFAULT_MODEL || settings.llm?.providers?.ollama?.models?.[0]?.id,
        },
      },
      security: {
        helmet: {
          enabled: process.env.HELMET_ENABLED ?? settings.security?.helmet?.enabled,
        },
        cors: {
          enabled: process.env.CORS_ENABLED ?? settings.security?.cors?.enabled,
          origin: process.env.CORS_ORIGIN || settings.security?.cors?.origin,
          credentials: process.env.CORS_CREDENTIALS ?? settings.security?.cors?.credentials,
        },
        rateLimiting: {
          enabled: process.env.RATE_LIMIT_ENABLED ?? settings.security?.rateLimiting?.enabled,
          windowMs: process.env.RATE_LIMIT_WINDOW_MS || settings.security?.rateLimiting?.windowMs,
          maxRequests: process.env.RATE_LIMIT_MAX_REQUESTS || settings.security?.rateLimiting?.maxRequests,
        },
        apiKey: process.env.API_KEY,
        jwtSecret: process.env.JWT_SECRET,
      },
      llm: {
        defaultProvider: process.env.LLM_DEFAULT_PROVIDER || settings.llm?.defaultProvider,
        loadBalancing: process.env.LLM_LOAD_BALANCING || settings.llm?.loadBalancing,
        enableFallback: process.env.LLM_ENABLE_FALLBACK ?? settings.llm?.enableFallback,
        requestTimeout: process.env.LLM_REQUEST_TIMEOUT || settings.llm?.requestTimeout,
        retryAttempts: process.env.LLM_RETRY_ATTEMPTS || settings.llm?.retryAttempts,
        retryDelay: process.env.LLM_RETRY_DELAY || settings.llm?.retryDelay,
      },
      websocket: {
        enabled: process.env.WEBSOCKET_ENABLED ?? settings.websocket?.enabled,
        port: process.env.WEBSOCKET_PORT || settings.websocket?.port,
      },
      logging: {
        level: process.env.LOG_LEVEL || settings.logging?.level,
        filePath: process.env.LOG_FILE_PATH || settings.logging?.filePath,
        maxFiles: process.env.LOG_MAX_FILES || settings.logging?.maxFiles,
        maxSize: process.env.LOG_MAX_SIZE || settings.logging?.maxSize,
      },
      database: {
        type: process.env.DATABASE_TYPE,
        path: process.env.DATABASE_PATH,
        host: process.env.DATABASE_HOST,
        port: process.env.DATABASE_PORT,
        name: process.env.DATABASE_NAME,
        user: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        poolSize: process.env.DATABASE_POOL_SIZE,
      },
      github: {
        enabled: process.env.GITHUB_ENABLED ?? false,
        token: process.env.GITHUB_TOKEN,
        owner: process.env.GITHUB_OWNER,
        repo: process.env.GITHUB_REPO,
      },
    };
  }
  
  public getConfig(): Config {
    return this.config;
  }
  
  public get<K extends keyof Config>(key: K): Config[K] {
    return this.config[key];
  }
  
  public validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check at least one provider is enabled
    const hasProvider = Object.values(this.config.providers).some(p => p.enabled);
    if (!hasProvider) {
      errors.push('At least one LLM provider must be enabled');
    }
    
    // Check API keys for enabled providers
    if (this.config.providers.openai.enabled && !this.config.providers.openai.apiKey) {
      errors.push('OpenAI API key is required when OpenAI is enabled');
    }
    if (this.config.providers.grok.enabled && !this.config.providers.grok.apiKey) {
      errors.push('Grok API key is required when Grok is enabled');
    }
    if (this.config.providers.ollama.enabled && !this.config.providers.ollama.host) {
      errors.push('Ollama host is required when Ollama is enabled');
    }
    
    // Check GitHub integration
    if (this.config.github.enabled && !this.config.github.token) {
      errors.push('GitHub token is required when GitHub integration is enabled');
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
  
  public printSummary(): void {
    console.log('\n=== AI Orchestra Configuration ===\n');
    console.log(`Environment: ${this.config.application.environment}`);
    console.log(`Port: ${this.config.application.port}`);
    console.log(`\nLLM Providers:`);
    console.log(`  OpenAI: ${this.config.providers.openai.enabled ? '✓' : '✗'}`);
    console.log(`  Grok: ${this.config.providers.grok.enabled ? '✓' : '✗'}`);
    console.log(`  Ollama: ${this.config.providers.ollama.enabled ? '✓' : '✗'}`);
    console.log(`\nDefault Provider: ${this.config.llm.defaultProvider}`);
    console.log(`Load Balancing: ${this.config.llm.loadBalancing}`);
    console.log(`Fallback: ${this.config.llm.enableFallback ? '✓' : '✗'}`);
    console.log(`\nGitHub Integration: ${this.config.github.enabled ? '✓' : '✗'}`);
    console.log(`WebSocket: ${this.config.websocket.enabled ? '✓' : '✗'}`);
    console.log('\n===================================\n');
  }
}
```

**Step 3: Fix Rate Limiting Bug** (`server.js:118`)
```javascript
// BEFORE (Bug #4 from report)
if (config.security?.rateLimit?.enabled) {  // Wrong property name

// AFTER
if (config.security?.rateLimiting?.enabled) {  // Correct name
  const limiter = rateLimit({
    windowMs: config.security.rateLimiting.windowMs,
    max: config.security.rateLimiting.maxRequests,
    message: 'Too many requests from this IP, please try again later.',
  });
  app.use(limiter);
  logger.info('Rate limiting enabled', {
    windowMs: config.security.rateLimiting.windowMs,
    maxRequests: config.security.rateLimiting.maxRequests,
  });
}
```

**Step 4: Add Unit Tests** (`src/config/__tests__/ConfigManager.test.ts`)
```typescript
import { ConfigManager } from '../ConfigManager';

describe('ConfigManager', () => {
  it('should coerce string "true" to boolean', () => {
    process.env.OPENAI_ENABLED = 'true';
    const manager = new ConfigManager();
    expect(manager.get('providers').openai.enabled).toBe(true);
  });
  
  it('should coerce number 1 to boolean true', () => {
    process.env.RATE_LIMIT_ENABLED = '1';
    const manager = new ConfigManager();
    expect(manager.get('security').rateLimiting.enabled).toBe(true);
  });
  
  it('should coerce "false" to boolean false', () => {
    process.env.OPENAI_ENABLED = 'false';
    const manager = new ConfigManager();
    expect(manager.get('providers').openai.enabled).toBe(false);
  });
  
  it('should handle invalid port gracefully', () => {
    process.env.PORT = 'invalid';
    expect(() => new ConfigManager()).toThrow('Invalid configuration');
  });
  
  it('should validate required API keys', () => {
    process.env.OPENAI_ENABLED = 'true';
    delete process.env.OPENAI_API_KEY;
    const manager = new ConfigManager();
    const validation = manager.validate();
    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain('OpenAI API key is required when OpenAI is enabled');
  });
});
```

#### Validation Criteria (QA Testing)

- [ ] Parse `RATE_LIMIT_ENABLED=1` correctly (number to boolean)
- [ ] Parse `RATE_LIMIT_ENABLED=true` correctly (string to boolean)
- [ ] Parse `RATE_LIMIT_ENABLED=false` correctly
- [ ] Throw error for invalid port (e.g., "abc")
- [ ] Throw error for invalid enum (e.g., environment="invalid")
- [ ] Apply defaults when values missing
- [ ] Validation catches missing API keys for enabled providers
- [ ] No TypeError during config parsing

#### Risk Assessment

- **Low Risk:** Internal refactor, no API changes
- **Mitigation:** Comprehensive tests for all config paths
- **Rollback:** Revert to old ConfigManager (keep both versions temporarily)

---

## STRUCTURAL REFACTORING PLANS

### REFACTOR-1: Decompose Monolithic server.js

**Current State:** 537 lines mixing concerns (routing, middleware, metrics, WebSocket, shutdown)

**Target Architecture:**
```
src/server/
├── app.ts                   # Express app factory
├── server.ts                # HTTP server + lifecycle
├── routes/
│   ├── index.ts            # Route aggregator
│   ├── health.routes.ts    # Health checks
│   ├── llm.routes.ts       # LLM query endpoints
│   ├── pipeline.routes.ts  # Pipeline endpoints (future)
│   └── github.routes.ts    # GitHub integration
├── middleware/
│   ├── index.ts            # Middleware aggregator
│   ├── logging.ts          # Request logging
│   ├── validation.ts       # Input validation
│   ├── csrf.ts             # CSRF protection
│   ├── error.ts            # Error handling
│   └── metrics.ts          # Prometheus metrics
├── services/
│   ├── LLMService.ts       # Business logic for LLM operations
│   ├── MetricsService.ts   # Metrics collection
│   └── WebSocketService.ts # WebSocket management
└── websocket/
    ├── server.ts           # WebSocket server
    └── handlers.ts         # Message handlers
```

**Implementation Plan:**

**Phase 1: Extract Routes (Week 1)**
1. Create route modules for each domain
2. Move endpoint handlers to routes
3. Keep server.js importing routes (no breaking changes)

**Phase 2: Extract Middleware (Week 1)**
1. Create middleware modules
2. Export middleware functions
3. Apply in server.ts

**Phase 3: Extract Services (Week 2)**
1. Create service classes for business logic
2. Inject dependencies (LLMBridge, config, logger)
3. Call services from route handlers

**Phase 4: Extract WebSocket (Week 2)**
1. Create WebSocketService class
2. Move connection handling and message processing
3. Initialize from server.ts

**Phase 5: Final Cleanup (Week 3)**
1. Slim down server.ts to <100 lines
2. Update tests to use new structure
3. Update documentation

**Benefits:**
- Single Responsibility Principle per module
- Easier testing (mock services, not HTTP layer)
- Better code navigation
- Reduced merge conflicts

---

### REFACTOR-2: Consolidate JS/TS Duplication

**Problem:** Duplicate implementations in `core/` (JS) and `src/` (TS)

**Current Duplication:**
- `core/llm_bridge.js` vs `src/core/LLMClient.ts`
- `core/config_manager.js` vs `src/core/Config.ts`
- `core/base_connector.js` vs `src/core/BaseAgent.ts` (different but overlapping)

**Strategy:** Migrate to TypeScript-first architecture

**Migration Path:**

**Phase 1: Audit Usage (Week 1)**
```bash
# Find all imports of core/ modules
grep -r "from './core/" --include="*.js" --include="*.ts"
grep -r "require('./core/" --include="*.js"
```

**Phase 2: Create Compatibility Layer (Week 2)**
```typescript
// src/compat/llm_bridge.ts
import { LLMClient } from '../core/LLMClient';

// Export with old interface for backward compatibility
export class LLMBridge {
  private client: LLMClient;
  
  constructor(config: any) {
    this.client = new LLMClient(config);
  }
  
  async query(options: any) {
    return this.client.query(options);
  }
  
  // ... rest of methods delegate to LLMClient
}
```

**Phase 3: Update Imports (Week 3)**
```javascript
// server.js
// BEFORE
import { LLMBridge } from './core/llm_bridge.js';

// AFTER
import { LLMBridge } from './src/compat/llm_bridge.ts';
```

**Phase 4: Deprecate core/ Modules (Week 4)**
```javascript
// core/llm_bridge.js
console.warn('DEPRECATED: core/llm_bridge.js is deprecated. Use src/core/LLMClient.ts');
export * from '../src/compat/llm_bridge.ts';
```

**Phase 5: Remove core/ (Month 2)**
1. Ensure all tests pass with new modules
2. Remove core/ directory
3. Update documentation
4. Celebrate 🎉

**Benefits:**
- Single source of truth
- Type safety everywhere
- Easier refactoring
- Smaller bundle size

---

### REFACTOR-3: Migrate to Redis for State Management

**Problem:** In-memory `activeRuns` Map (memory leak, no persistence, not scalable)

**Target Architecture:**
```
┌─────────────┐        ┌─────────────┐        ┌─────────────┐
│  Dashboard  │◄──────►│   Server    │◄──────►│    Redis    │
│  (Next.js)  │  HTTP  │  (Express)  │  CRUD  │  (Key-Value)│
└─────────────┘        └─────────────┘        └─────────────┘
                              │
                              ▼
                      ┌──────────────┐
                      │  PipelineController
                      │  (Background jobs)
                      └──────────────┘
```

**Redis Schema Design:**
```
Key Pattern: pipeline:runs:{runId}
Value: JSON object with PipelineRunResult

Key Pattern: pipeline:logs:{runId}
Value: List of log entries (LPUSH/LRANGE)

Key Pattern: pipeline:artifacts:{runId}:{artifactId}
Value: Artifact content

Key Pattern: pipeline:active
Value: Set of active runIds (SADD/SREM/SMEMBERS)

TTL: 24 hours for completed runs
```

**Implementation Plan:**

**Step 1: Install Dependencies**
```bash
npm install ioredis
npm install -D @types/ioredis
```

**Step 2: Create Redis Client** (`src/database/redis.ts`)
```typescript
import Redis from 'ioredis';
import { ConfigManager } from '../config/ConfigManager';

export class RedisClient {
  private client: Redis;
  private static instance: RedisClient;
  
  private constructor() {
    const config = ConfigManager.getInstance().get('redis');
    
    this.client = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });
    
    this.client.on('error', (err) => {
      console.error('Redis error:', err);
    });
    
    this.client.on('connect', () => {
      console.log('Redis connected');
    });
  }
  
  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }
  
  public getClient(): Redis {
    return this.client;
  }
  
  public async disconnect(): Promise<void> {
    await this.client.quit();
  }
}
```

**Step 3: Create Pipeline Repository** (`src/repositories/PipelineRepository.ts`)
```typescript
import { RedisClient } from '../database/redis';
import { PipelineRunResult } from '../types/pipeline.types';

export class PipelineRepository {
  private redis: Redis;
  private readonly TTL = 24 * 60 * 60; // 24 hours
  
  constructor() {
    this.redis = RedisClient.getInstance().getClient();
  }
  
  /**
   * Save pipeline run
   */
  async save(runId: string, result: PipelineRunResult): Promise<void> {
    const key = `pipeline:runs:${runId}`;
    await this.redis.setex(key, this.TTL, JSON.stringify(result));
    await this.redis.sadd('pipeline:active', runId);
  }
  
  /**
   * Get pipeline run
   */
  async get(runId: string): Promise<PipelineRunResult | null> {
    const key = `pipeline:runs:${runId}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }
  
  /**
   * Update pipeline run
   */
  async update(runId: string, updates: Partial<PipelineRunResult>): Promise<void> {
    const existing = await this.get(runId);
    if (!existing) {
      throw new Error(`Pipeline run ${runId} not found`);
    }
    
    const updated = { ...existing, ...updates };
    await this.save(runId, updated);
  }
  
  /**
   * Add log entry
   */
  async addLog(runId: string, log: any): Promise<void> {
    const key = `pipeline:logs:${runId}`;
    await this.redis.lpush(key, JSON.stringify(log));
    await this.redis.expire(key, this.TTL);
  }
  
  /**
   * Get logs
   */
  async getLogs(runId: string, start = 0, end = -1): Promise<any[]> {
    const key = `pipeline:logs:${runId}`;
    const logs = await this.redis.lrange(key, start, end);
    return logs.map(log => JSON.parse(log)).reverse();
  }
  
  /**
   * Save artifact
   */
  async saveArtifact(runId: string, artifactId: string, content: string): Promise<void> {
    const key = `pipeline:artifacts:${runId}:${artifactId}`;
    await this.redis.setex(key, this.TTL, content);
  }
  
  /**
   * Get artifact
   */
  async getArtifact(runId: string, artifactId: string): Promise<string | null> {
    const key = `pipeline:artifacts:${runId}:${artifactId}`;
    return await this.redis.get(key);
  }
  
  /**
   * List active runs
   */
  async listActive(): Promise<string[]> {
    return await this.redis.smembers('pipeline:active');
  }
  
  /**
   * Mark run as complete and remove from active set
   */
  async markComplete(runId: string): Promise<void> {
    await this.redis.srem('pipeline:active', runId);
  }
  
  /**
   * Delete run (including logs and artifacts)
   */
  async delete(runId: string): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.del(`pipeline:runs:${runId}`);
    pipeline.del(`pipeline:logs:${runId}`);
    
    // Delete artifacts (need to scan for keys)
    const artifactKeys = await this.redis.keys(`pipeline:artifacts:${runId}:*`);
    artifactKeys.forEach(key => pipeline.del(key));
    
    pipeline.srem('pipeline:active', runId);
    await pipeline.exec();
  }
  
  /**
   * Cleanup old runs (run periodically)
   */
  async cleanup(): Promise<number> {
    const active = await this.listActive();
    let cleaned = 0;
    
    for (const runId of active) {
      const run = await this.get(runId);
      if (!run) {
        await this.redis.srem('pipeline:active', runId);
        cleaned++;
      } else if (run.status !== 'running' && run.endTime) {
        const age = Date.now() - run.endTime;
        if (age > this.TTL * 1000) {
          await this.markComplete(runId);
          cleaned++;
        }
      }
    }
    
    return cleaned;
  }
}
```

**Step 4: Update Dashboard API Route** (`dashboard/src/app/api/pipeline/run/route.ts`)
```typescript
import { PipelineRepository } from '@/repositories/PipelineRepository';

const repo = new PipelineRepository();

export async function POST(request: NextRequest) {
  // ... validation ...
  
  const runId = `run-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  const pipeline = new PipelineController(config);
  
  // Save initial state to Redis
  await repo.save(runId, {
    runId,
    featureId: validatedSpec.id,
    startTime: Date.now(),
    status: 'running',
    stages: [],
    qaIterations: 0,
    debugIterations: 0,
    artifacts: [],
    summary: {
      frontendGenerated: false,
      backendGenerated: false,
      issuesFound: 0,
      issuesFixed: 0,
    },
    logs: [],
  });
  
  // Run pipeline in background
  pipeline.run(validatedSpec)
    .then(async (result) => {
      await repo.update(runId, result);
      await repo.markComplete(runId);
    })
    .catch(async (error) => {
      await repo.addLog(runId, {
        timestamp: Date.now(),
        level: 'error',
        stage: 'pipeline',
        message: `Pipeline failed: ${error.message}`,
      });
      await repo.markComplete(runId);
    });
  
  return NextResponse.json({
    success: true,
    runId,
    message: 'Pipeline started successfully',
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const runId = searchParams.get('runId');
  
  if (!runId) {
    return NextResponse.json({ error: 'runId is required' }, { status: 400 });
  }
  
  const run = await repo.get(runId);
  
  if (!run) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 });
  }
  
  return NextResponse.json(run);
}
```

**Step 5: Add Cleanup Job** (`src/jobs/cleanup.ts`)
```typescript
import { PipelineRepository } from '../repositories/PipelineRepository';

const repo = new PipelineRepository();

// Run cleanup every hour
setInterval(async () => {
  try {
    const cleaned = await repo.cleanup();
    console.log(`[Cleanup] Cleaned up ${cleaned} old pipeline runs`);
  } catch (error) {
    console.error('[Cleanup] Failed:', error);
  }
}, 60 * 60 * 1000);
```

**Step 6: Add Redis Config**
```typescript
// In ConfigSchema
redis: z.object({
  enabled: BooleanSchema.default(true),
  host: z.string().default('localhost'),
  port: z.coerce.number().int().default(6379),
  password: z.string().optional(),
  db: z.coerce.number().int().default(0),
}),
```

**Benefits:**
- No memory leaks
- Persistence across restarts
- Horizontal scaling (multiple server instances)
- Centralized state management
- TTL-based automatic cleanup

**Migration Strategy:**
1. Deploy with both in-memory and Redis (feature flag)
2. Test Redis implementation
3. Switch default to Redis
4. Remove in-memory code

---

## ARCHITECTURE DECISIONS

### AD-1: Adopt Repository Pattern for Data Access

**Decision:** All data access goes through Repository classes.

**Rationale:**
- Decouples business logic from data storage
- Enables switching storage backends (Redis → PostgreSQL)
- Simplifies testing (mock repositories)
- Enforces consistent data access patterns

**Implementation:**
```typescript
// Repository interface
interface IRepository<T> {
  get(id: string): Promise<T | null>;
  save(id: string, entity: T): Promise<void>;
  update(id: string, updates: Partial<T>): Promise<void>;
  delete(id: string): Promise<void>;
  list(filters?: any): Promise<T[]>;
}

// Implementations
- PipelineRepository (Redis)
- ConfigRepository (File system)
- MetricsRepository (Prometheus)
```

---

### AD-2: Introduce Circuit Breaker for LLM Calls

**Decision:** Wrap all LLM API calls in Circuit Breaker pattern.

**Rationale:**
- Prevent cascading failures when LLM provider is down
- Faster failure detection (don't wait for timeout)
- Automatic fallback to other providers
- Cost savings (don't retry against down service)

**Implementation:**
```typescript
import CircuitBreaker from 'opossum';

class LLMClient {
  private breakers: Map<string, CircuitBreaker> = new Map();
  
  private createBreaker(provider: string) {
    return new CircuitBreaker(this.callLLM.bind(this, provider), {
      timeout: 30000,          // 30s timeout
      errorThresholdPercentage: 50,  // Open circuit after 50% errors
      resetTimeout: 30000,     // Try again after 30s
      volumeThreshold: 10,     // Need 10 requests before circuit opens
    });
  }
  
  async query(provider: string, options: any) {
    if (!this.breakers.has(provider)) {
      this.breakers.set(provider, this.createBreaker(provider));
    }
    
    const breaker = this.breakers.get(provider)!;
    
    try {
      return await breaker.fire(options);
    } catch (error) {
      // Circuit is open, try fallback
      if (breaker.opened) {
        logger.warn(`Circuit breaker open for ${provider}, trying fallback`);
        return await this.tryFallback(provider, options);
      }
      throw error;
    }
  }
}
```

**Benefits:**
- Fail fast (< 1s vs 30s timeout)
- Automatic recovery detection
- Metrics: circuit state, failure rate
- Better user experience

---

### AD-3: Implement Command Pattern for Agent Actions

**Decision:** Encapsulate agent actions as Command objects.

**Rationale:**
- Undo/redo functionality for QA-Debug loop
- Audit trail of all agent actions
- Queueable and replayable actions
- Easier testing (mock commands)

**Implementation:**
```typescript
interface ICommand {
  execute(): Promise<any>;
  undo?(): Promise<void>;
  canUndo(): boolean;
  getMetadata(): CommandMetadata;
}

class GenerateComponentCommand implements ICommand {
  constructor(
    private agent: FrontEndDevAgent,
    private spec: ComponentSpec
  ) {}
  
  async execute(): Promise<FrontEndOutput> {
    return await this.agent.run(this.spec);
  }
  
  canUndo(): boolean {
    return false;  // Can't undo generation
  }
  
  getMetadata(): CommandMetadata {
    return {
      type: 'generate-component',
      agent: this.agent.getConfig().id,
      timestamp: Date.now(),
    };
  }
}

class ApplyFixCommand implements ICommand {
  constructor(
    private codebase: CodebaseManager,
    private fix: DebugFix
  ) {}
  
  async execute(): Promise<void> {
    await this.codebase.applyPatch(this.fix.patch);
  }
  
  async undo(): Promise<void> {
    await this.codebase.revertPatch(this.fix.patch);
  }
  
  canUndo(): boolean {
    return true;
  }
}

// Usage in PipelineController
class PipelineController {
  private commandHistory: ICommand[] = [];
  
  async executeCommand(command: ICommand): Promise<any> {
    const result = await command.execute();
    this.commandHistory.push(command);
    
    // Log to audit trail
    this.logCommand(command);
    
    return result;
  }
  
  async undoLastCommand(): Promise<void> {
    const command = this.commandHistory.pop();
    if (command && command.canUndo()) {
      await command.undo();
    }
  }
}
```

**Benefits:**
- Clear separation of what/how
- Testable action logic
- Audit trail built-in
- Foundation for undo/redo

---

## RISKS & CONSIDERATIONS

### Risk Matrix

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Redis dependency adds complexity | High | Medium | Use Redis-compatible interface, fallback to in-memory |
| Config migration breaks existing deployments | Medium | High | Provide migration script, backward compatibility layer |
| CSRF breaks existing API clients | Low | High | Deprecation period, clear migration docs |
| Performance degradation from validation | Low | Low | Benchmark, optimize hot paths |
| Agent JSON parsing still fragile | Medium | Medium | Extensive testing with real LLM responses |

### Performance Considerations

**Validation Overhead:**
- Zod validation: ~0.1-1ms per request
- CSRF token check: ~1-2ms
- Redis roundtrip: ~1-5ms (local), ~10-50ms (remote)
- **Total overhead:** <10ms for local setup

**Optimization Strategies:**
- Cache CSRF tokens client-side
- Batch Redis operations (pipeline)
- Use Redis connection pooling
- Lazy-load validation schemas

### Backward Compatibility

**Breaking Changes:**
- ConfigManager API (mitigation: compatibility layer)
- EventSource → Fetch streaming (mitigation: keep old endpoint with deprecation)

**Non-Breaking Changes:**
- All P0 fixes (additive)
- Repository pattern (internal refactor)
- Circuit breaker (transparent wrapper)

### Deployment Strategy

**Phase 1: P0 Fixes (Week 1-2)**
1. Deploy input validation
2. Deploy error handling
3. Deploy safe JSON parsing
4. Monitor error rates, latency

**Phase 2: P1 Fixes (Week 3-4)**
1. Deploy streaming POST endpoint
2. Deploy CSRF protection (warning mode)
3. Enable CSRF enforcement
4. Deploy config migration

**Phase 3: Refactoring (Month 2)**
1. Server.js decomposition
2. JS/TS consolidation
3. Redis migration (behind feature flag)
4. Circuit breaker

**Phase 4: Patterns (Month 3)**
1. Repository pattern rollout
2. Command pattern for agents
3. Remove deprecated code
4. Performance optimization

---

## APPROVAL CHECKLIST

Use this checklist to validate Engineer's implementations:

### P0-1: Input Validation
- [ ] Zod schemas defined for all request types
- [ ] Middleware applied to all POST endpoints
- [ ] Error responses include field-level details
- [ ] Tests cover: valid input, invalid temperature, invalid maxTokens, missing prompt
- [ ] Validation errors logged with context
- [ ] Performance overhead < 5ms per request

### P0-2: Error Handling
- [ ] Pipeline continues on non-fatal errors (with config flag)
- [ ] Retry logic with exponential backoff implemented
- [ ] Partial results saved when some components succeed
- [ ] Error types defined (Fatal, Error, Warning)
- [ ] Global error boundary catches all exceptions
- [ ] Tests inject failures at each pipeline stage

### P0-3: Safe JSON Parsing
- [ ] safeParseJSON utility handles code blocks, raw JSON, common errors
- [ ] Schema validation integrated with Zod
- [ ] Parse errors include raw content for debugging
- [ ] Agent execution retries on parse failures
- [ ] Unit tests cover all parsing strategies
- [ ] No JSON.parse calls without try-catch

### P1-1: EventSource Replacement
- [ ] POST-based streaming implemented with Fetch
- [ ] Old GET endpoint deprecated with Sunset header
- [ ] SSE format maintained (data: prefix, \n\n delimiter)
- [ ] AbortController for cancellation
- [ ] Server logs don't contain prompt data
- [ ] Works with large prompts (>10KB)

### P1-2: CSRF Protection
- [ ] CSRF middleware applied to all state-changing endpoints
- [ ] Token endpoint (/api/csrf-token) functional
- [ ] ApiClient auto-fetches and includes token
- [ ] Origin validation blocks unauthorized origins
- [ ] SameSite cookies configured correctly
- [ ] Security tests: external POST blocked, token required

### P1-3: Config Null Safety
- [ ] Zod schema covers all config properties
- [ ] BooleanSchema coerces strings, numbers to boolean
- [ ] Rate limiting bug fixed (rateLimiting vs rateLimit)
- [ ] Tests cover all coercion paths
- [ ] Invalid config throws helpful error messages
- [ ] No TypeErrors during config parsing

### Structural Refactoring
- [ ] server.js < 150 lines (routes/middleware extracted)
- [ ] Route modules in src/server/routes/
- [ ] Middleware modules in src/server/middleware/
- [ ] Service classes in src/services/
- [ ] Tests updated to reflect new structure

### Architecture Patterns
- [ ] Repository classes implemented for data access
- [ ] Circuit breaker wrapping LLM calls
- [ ] Command pattern for agent actions (if implemented)
- [ ] Redis client with connection pooling
- [ ] Cleanup jobs scheduled

---

## NEXT STEPS

1. **Engineer Agent:** Implement P0 specifications (this sprint)
2. **QA Agent:** Create test plans for each P0/P1 issue
3. **Architect:** Review implementation PRs against approval checklist
4. **Team:** Weekly sync on progress, blockers, questions

**Estimated Timeline:**
- P0 fixes: 2 weeks
- P1 fixes: 2 weeks
- Structural refactoring: 4 weeks
- Pattern implementation: 4 weeks
- **Total:** ~3 months for complete architectural overhaul

**Success Metrics:**
- Zero TypeErrors in production
- < 1% request validation failures
- P95 latency < 500ms (validation + processing)
- Zero memory leaks
- Circuit breaker: < 5s failure detection
- Test coverage > 80%

---

**END OF ARCHITECT REPORT - Iteration 1**

*This document is a living specification. Update as implementations progress and new issues are discovered.*
