/**
 * AI Orchestra - Phase 1: Core SDK
 *
 * Lightweight, modular agent composition framework inspired by Atomic-Agents
 */

// Core Classes
export { BaseAgent } from './core/BaseAgent.js';
export { ToolBuilder, CommonTools } from './core/Tool.js';
export {
  StaticContextProvider,
  DynamicContextProvider,
  FileContextProvider,
  APIContextProvider,
  MemoryContextProvider,
  ContextProviderFactory,
} from './core/ContextProvider.js';
export {
  ConfigManager,
  AgentPresets,
  SystemConfigSchema,
  type SystemConfig,
} from './core/Config.js';
export {
  LLMClientFactory,
  type ILLMClient,
  type LLMMessage,
  type LLMRequestOptions,
  type LLMResponse,
} from './core/LLMClient.js';

// Types
export {
  AgentRole,
  AgentStatus,
  LLMProvider,
  AgentInputSchema,
  AgentOutputSchema,
  AgentConfigSchema,
  type AgentInput,
  type AgentOutput,
  type AgentConfig,
  type AgentExecutionContext,
  type ToolDefinition,
} from './types/agent.types.js';
export {
  ContextProviderType,
  ContextDataSchema,
  MemoryEntrySchema,
  type IContextProvider,
  type ContextData,
  type MemoryEntry,
} from './types/context.types.js';

// Example Agents
export { CodeReviewAgent } from './agents/CodeReviewAgent.js';
