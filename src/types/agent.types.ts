import { z } from 'zod';

/**
 * Agent Role Types - defines the purpose and specialization of each agent
 */
export enum AgentRole {
  FRONTEND = 'frontend',
  BACKEND = 'backend',
  QA = 'qa',
  DEBUGGER = 'debugger',
  COORDINATOR = 'coordinator',
  CUSTOM = 'custom'
}

/**
 * Agent Status - lifecycle state of agent execution
 */
export enum AgentStatus {
  IDLE = 'idle',
  THINKING = 'thinking',
  EXECUTING = 'executing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  WAITING = 'waiting'
}

/**
 * LLM Provider Types
 */
export enum LLMProvider {
  OPENAI = 'openai',
  GROK = 'grok',
  OLLAMA = 'ollama',
  ANTHROPIC = 'anthropic'
}

/**
 * Base schema for agent input - can be extended by specific agents
 */
export const AgentInputSchema = z.object({
  task: z.string().describe('The primary task or objective for the agent'),
  context: z.record(z.any()).optional().describe('Additional context data'),
  dependencies: z.array(z.string()).optional().describe('IDs of dependent tasks'),
});

/**
 * Base schema for agent output - standardized response format
 */
export const AgentOutputSchema = z.object({
  success: z.boolean(),
  result: z.any().optional(),
  error: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  artifacts: z.array(z.object({
    type: z.string(),
    path: z.string().optional(),
    content: z.string().optional(),
  })).optional(),
});

/**
 * Agent Configuration
 */
export const AgentConfigSchema = z.object({
  id: z.string(),
  role: z.nativeEnum(AgentRole),
  name: z.string(),
  systemPrompt: z.string(),
  provider: z.nativeEnum(LLMProvider),
  model: z.string(),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().positive().optional(),
  retries: z.number().int().min(0).default(3),
  timeout: z.number().positive().default(30000),
});

/**
 * Type exports derived from Zod schemas
 */
export type AgentInput = z.infer<typeof AgentInputSchema>;
export type AgentOutput = z.infer<typeof AgentOutputSchema>;
export type AgentConfig = z.infer<typeof AgentConfigSchema>;

/**
 * Agent Execution Context - runtime information
 */
export interface AgentExecutionContext {
  agentId: string;
  startTime: number;
  status: AgentStatus;
  attempt: number;
  history: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
    timestamp: number;
  }>;
}

/**
 * Tool Definition - for agent capabilities
 */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: z.ZodSchema;
  execute: (params: any) => Promise<any>;
}
