import { z } from 'zod';
import { AgentRole, LLMProvider } from '../types/agent.types.js';
import { config as dotenvConfig } from 'dotenv';

// Load environment variables
dotenvConfig();

/**
 * System Configuration Schema
 */
export const SystemConfigSchema = z.object({
  llm: z.object({
    defaultProvider: z.nativeEnum(LLMProvider).default(LLMProvider.OPENAI),
    defaultModel: z.string().default('gpt-4-turbo-preview'),
    defaultTemperature: z.number().min(0).max(2).default(0.7),
    defaultMaxTokens: z.number().positive().optional(),
    timeout: z.number().positive().default(30000),
    retries: z.number().int().min(0).default(3),
  }),
  providers: z.object({
    openai: z.object({
      apiKey: z.string().optional(),
      baseURL: z.string().optional(),
    }),
    grok: z.object({
      apiKey: z.string().optional(),
      baseURL: z.string().optional(),
    }),
    ollama: z.object({
      endpoint: z.string().default('http://localhost:11434'),
    }),
    anthropic: z.object({
      apiKey: z.string().optional(),
    }),
  }),
  agents: z.object({
    defaultRetries: z.number().int().min(0).default(3),
    defaultTimeout: z.number().positive().default(30000),
  }),
  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    enableConsole: z.boolean().default(true),
    enableFile: z.boolean().default(false),
  }),
});

export type SystemConfig = z.infer<typeof SystemConfigSchema>;

/**
 * Configuration Manager
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private config: SystemConfig;

  private constructor() {
    this.config = this.loadConfig();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private loadConfig(): SystemConfig {
    const config: SystemConfig = {
      llm: {
        defaultProvider: (process.env.DEFAULT_PROVIDER as LLMProvider) || LLMProvider.OPENAI,
        defaultModel: process.env.DEFAULT_MODEL || 'gpt-4-turbo-preview',
        defaultTemperature: parseFloat(process.env.DEFAULT_TEMPERATURE || '0.7'),
        defaultMaxTokens: process.env.DEFAULT_MAX_TOKENS
          ? parseInt(process.env.DEFAULT_MAX_TOKENS)
          : undefined,
        timeout: parseInt(process.env.TIMEOUT_MS || '30000'),
        retries: parseInt(process.env.MAX_RETRIES || '3'),
      },
      providers: {
        openai: {
          apiKey: process.env.OPENAI_API_KEY,
          baseURL: process.env.OPENAI_BASE_URL,
        },
        grok: {
          apiKey: process.env.GROK_API_KEY,
          baseURL: process.env.GROK_BASE_URL,
        },
        ollama: {
          endpoint: process.env.OLLAMA_ENDPOINT || 'http://localhost:11434',
        },
        anthropic: {
          apiKey: process.env.ANTHROPIC_API_KEY,
        },
      },
      agents: {
        defaultRetries: parseInt(process.env.AGENT_RETRIES || '3'),
        defaultTimeout: parseInt(process.env.AGENT_TIMEOUT || '30000'),
      },
      logging: {
        level: (process.env.LOG_LEVEL as any) || 'info',
        enableConsole: process.env.LOG_CONSOLE !== 'false',
        enableFile: process.env.LOG_FILE === 'true',
      },
    };

    return SystemConfigSchema.parse(config);
  }

  public getConfig(): SystemConfig {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<SystemConfig>): void {
    this.config = SystemConfigSchema.parse({
      ...this.config,
      ...updates,
    });
  }

  public getProviderConfig(provider: LLMProvider): any {
    return this.config.providers[provider];
  }

  public getLLMConfig() {
    return this.config.llm;
  }

  public getAgentDefaults() {
    return this.config.agents;
  }
}

/**
 * Agent Preset Configurations
 */
export const AgentPresets = {
  [AgentRole.FRONTEND]: {
    systemPrompt: `You are a Frontend Development Agent specialized in creating user interfaces and client-side logic.

Your responsibilities:
- Generate React/Next.js components with TypeScript
- Implement responsive designs with Tailwind CSS
- Ensure accessibility (ARIA, semantic HTML)
- Optimize performance (lazy loading, code splitting)
- Follow UI/UX best practices

Provide clean, maintainable code with proper component structure.`,
    temperature: 0.7,
    model: 'gpt-4-turbo-preview',
  },

  [AgentRole.BACKEND]: {
    systemPrompt: `You are a Backend Development Agent specialized in server-side logic and API design.

Your responsibilities:
- Design and implement RESTful APIs
- Write Node.js/TypeScript server code
- Implement authentication and authorization
- Design database schemas and queries
- Ensure security best practices
- Handle error cases gracefully

Provide production-ready, scalable backend solutions.`,
    temperature: 0.6,
    model: 'gpt-4-turbo-preview',
  },

  [AgentRole.QA]: {
    systemPrompt: `You are a Quality Assurance Agent specialized in testing and validation.

Your responsibilities:
- Review code for bugs and issues
- Generate comprehensive test cases
- Write unit and integration tests
- Validate API responses and edge cases
- Check for security vulnerabilities
- Ensure code quality standards

Provide detailed test reports and actionable feedback.`,
    temperature: 0.5,
    model: 'gpt-4-turbo-preview',
  },

  [AgentRole.DEBUGGER]: {
    systemPrompt: `You are a Debugging Agent specialized in identifying and fixing issues.

Your responsibilities:
- Analyze error messages and stack traces
- Identify root causes of bugs
- Propose and implement fixes
- Debug runtime and logical errors
- Optimize problematic code sections
- Document fixes and preventive measures

Provide clear explanations and reliable solutions.`,
    temperature: 0.4,
    model: 'gpt-4-turbo-preview',
  },

  [AgentRole.COORDINATOR]: {
    systemPrompt: `You are a Coordinator Agent responsible for orchestrating multiple agents and managing workflows.

Your responsibilities:
- Break down high-level objectives into subtasks
- Assign tasks to appropriate specialized agents
- Monitor task progress and dependencies
- Coordinate communication between agents
- Resolve conflicts and blockers
- Synthesize results into coherent outputs

Provide clear task assignments and maintain workflow efficiency.`,
    temperature: 0.6,
    model: 'gpt-4-turbo-preview',
  },
};
