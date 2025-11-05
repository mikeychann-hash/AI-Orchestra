import { z } from 'zod';
import { BaseAgent } from '../core/BaseAgent.js';
import { AgentConfig, AgentRole, LLMProvider } from '../types/agent.types.js';
import { LLMClientFactory } from '../core/LLMClient.js';
import { ConfigManager } from '../core/Config.js';

/**
 * Backend Development Input Schema
 */
const BackEndInputSchema = z.object({
  feature: z.string().describe('API feature or endpoint description'),
  method: z
    .enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
    .optional()
    .describe('HTTP method'),
  route: z.string().optional().describe('API route path (e.g., /api/users)'),
  framework: z
    .enum(['express', 'fastify', 'nestjs', 'koa'])
    .default('express')
    .describe('Backend framework'),
  database: z
    .enum(['postgresql', 'mongodb', 'mysql', 'sqlite', 'none'])
    .default('postgresql')
    .describe('Database type'),
  authentication: z.boolean().default(false).describe('Require authentication'),
  validation: z.boolean().default(true).describe('Include request validation'),
  typescript: z.boolean().default(true).describe('Use TypeScript'),
  context: z.string().optional().describe('Additional context'),
});

/**
 * Backend Development Output Schema
 */
const BackEndOutputSchema = z.object({
  success: z.boolean(),
  endpoint: z.string().describe('API endpoint path'),
  method: z.string().describe('HTTP method'),
  code: z.string().describe('Generated route/controller code'),
  middleware: z
    .string()
    .optional()
    .describe('Middleware code (auth, validation)'),
  model: z.string().optional().describe('Database model/schema'),
  tests: z.string().optional().describe('Test code'),
  dependencies: z.array(z.string()).optional().describe('Required packages'),
  notes: z.string().optional().describe('Implementation notes'),
  files: z
    .array(
      z.object({
        path: z.string(),
        content: z.string(),
      })
    )
    .optional(),
});

export type BackEndInput = z.infer<typeof BackEndInputSchema>;
export type BackEndOutput = z.infer<typeof BackEndOutputSchema>;

/**
 * BackEndDevAgent - Generates Express API routes and server logic
 *
 * Specialized agent for backend development using Ollama mistral:7b
 *
 * Capabilities:
 * - Generate Express/Fastify API routes
 * - Implement RESTful endpoints with validation
 * - Create database models and queries
 * - Add authentication and authorization
 * - Error handling and logging
 * - API documentation
 */
export class BackEndDevAgent extends BaseAgent<
  typeof BackEndInputSchema,
  typeof BackEndOutputSchema
> {
  constructor(config?: Partial<AgentConfig>) {
    const configManager = ConfigManager.getInstance();
    const defaults = configManager.getAgentDefaults();

    const fullConfig: AgentConfig = {
      id: config?.id || `backend-${Date.now()}`,
      role: AgentRole.BACKEND,
      name: config?.name || 'Backend Development Agent',
      systemPrompt:
        config?.systemPrompt ||
        `You are an expert Backend Development Agent specializing in server-side API development.

Your responsibilities:
- Generate production-ready Express/Node.js API routes
- Implement RESTful API design principles
- Create secure authentication and authorization logic
- Design and implement database schemas and queries
- Add comprehensive request validation
- Implement proper error handling with descriptive messages
- Follow security best practices (input sanitization, SQL injection prevention)
- Write clean, maintainable TypeScript/JavaScript code

Code Style Guidelines:
- Use async/await for asynchronous operations
- Implement proper error handling with try-catch
- Use middleware for cross-cutting concerns (auth, validation, logging)
- Follow REST conventions (proper status codes, resource naming)
- Include TypeScript interfaces for request/response types
- Add JSDoc comments for complex logic
- Separate business logic from route handlers

Security Requirements:
- Validate and sanitize all inputs
- Use parameterized queries to prevent SQL injection
- Implement rate limiting for public endpoints
- Hash passwords using bcrypt
- Use JWT for authentication
- Never expose sensitive data in responses

Output Format:
Provide your response as JSON with the following structure:
{
  "endpoint": "/api/endpoint",
  "method": "POST",
  "code": "// Route handler code...",
  "middleware": "// Middleware code...",
  "model": "// Database model...",
  "tests": "// Test code...",
  "dependencies": ["package-name"],
  "notes": "Implementation notes"
}`,
      provider: config?.provider || LLMProvider.OLLAMA,
      model: config?.model || 'mistral:7b',
      temperature: config?.temperature ?? 0.6,
      maxTokens: config?.maxTokens,
      retries: config?.retries ?? defaults.defaultRetries,
      timeout: config?.timeout ?? defaults.defaultTimeout,
    };

    super(fullConfig, BackEndInputSchema, BackEndOutputSchema);
  }

  /**
   * Execute backend development task
   */
  protected async execute(
    input: BackEndInput,
    context: string
  ): Promise<BackEndOutput> {
    const client = LLMClientFactory.getClient(this.config.provider);

    const userMessage = this.buildPrompt(input, context);
    this.addMessage('user', userMessage);

    const response = await client.complete({
      model: this.config.model,
      messages: this.getHistory().map((h) => ({
        role: h.role,
        content: h.content,
      })),
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
    });

    this.addMessage('assistant', response.content);

    const result = this.parseResponse(response.content, input);

    return {
      success: true,
      ...result,
    };
  }

  /**
   * Build detailed prompt
   */
  private buildPrompt(input: BackEndInput, context: string): string {
    const parts = [
      `Create a ${input.framework.toUpperCase()} API endpoint for the following feature:`,
      `\nFeature: ${input.feature}`,
    ];

    if (input.route) {
      parts.push(`Route: ${input.route}`);
    }

    if (input.method) {
      parts.push(`Method: ${input.method}`);
    }

    parts.push(`\nRequirements:`);
    parts.push(`- Framework: ${input.framework}`);
    parts.push(`- Database: ${input.database}`);
    parts.push(`- Authentication: ${input.authentication ? 'Required' : 'Not required'}`);
    parts.push(`- Request Validation: ${input.validation ? 'Yes' : 'No'}`);
    parts.push(`- TypeScript: ${input.typescript ? 'Yes' : 'No'}`);

    if (input.context) {
      parts.push(`\nAdditional Context:\n${input.context}`);
    }

    if (context) {
      parts.push(`\nContext Providers:\n${context}`);
    }

    parts.push(
      `\nProvide complete implementation including route handler, middleware, database model (if needed), and tests.`
    );
    parts.push(
      `Follow REST best practices and include proper error handling.`
    );

    return parts.join('\n');
  }

  /**
   * Parse LLM response
   */
  private parseResponse(
    content: string,
    input: BackEndInput
  ): Omit<BackEndOutput, 'success'> {
    try {
      const jsonMatch = content.match(
        /```(?:json)?\s*(\{[\s\S]*?\})\s*```/
      );
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }

      return JSON.parse(content);
    } catch (error) {
      // Fallback: extract code blocks
      const codeMatch = content.match(
        /```(?:typescript|javascript|ts|js)?\s*([\s\S]*?)\s*```/g
      );

      let routeCode = '';
      let middlewareCode = '';
      let modelCode = '';

      if (codeMatch) {
        codeMatch.forEach((block) => {
          const code = block.replace(/```(?:typescript|javascript|ts|js)?\s*/, '').replace(/```$/, '').trim();

          if (code.includes('router.') || code.includes('app.')) {
            routeCode = code;
          } else if (code.includes('middleware') || code.includes('authenticate')) {
            middlewareCode = code;
          } else if (code.includes('Schema') || code.includes('model')) {
            modelCode = code;
          } else if (!routeCode) {
            routeCode = code;
          }
        });
      }

      return {
        endpoint: input.route || '/api/endpoint',
        method: input.method || 'GET',
        code: routeCode || content,
        middleware: middlewareCode || undefined,
        model: modelCode || undefined,
        dependencies: this.extractDependencies(routeCode + middlewareCode + modelCode),
        notes: 'Generated API endpoint - review security and error handling',
      };
    }
  }

  /**
   * Extract dependencies from code
   */
  private extractDependencies(code: string): string[] {
    const deps = new Set<string>(['express']); // Express is default
    const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;

    [requireRegex, importRegex].forEach((regex) => {
      let match;
      while ((match = regex.exec(code)) !== null) {
        const pkg = match[1];
        if (!pkg.startsWith('.') && !pkg.startsWith('/')) {
          const pkgName = pkg.startsWith('@')
            ? pkg.split('/').slice(0, 2).join('/')
            : pkg.split('/')[0];
          deps.add(pkgName);
        }
      }
    });

    // Common packages based on features
    if (code.includes('jwt') || code.includes('JWT')) deps.add('jsonwebtoken');
    if (code.includes('bcrypt')) deps.add('bcrypt');
    if (code.includes('joi') || code.includes('Joi')) deps.add('joi');
    if (code.includes('mongoose')) deps.add('mongoose');
    if (code.includes('pg') || code.includes('Pool')) deps.add('pg');
    if (code.includes('cors')) deps.add('cors');

    return Array.from(deps);
  }
}
