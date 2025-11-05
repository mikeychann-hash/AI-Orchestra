/**
 * AI Orchestra - Core SDK + Orchestration + Specialized Agents
 *
 * Phase 1: Lightweight, modular agent composition framework inspired by Atomic-Agents
 * Phase 2: Distributed orchestration powered by Swarms
 * Phase 3: Specialized functional agents (Frontend, Backend, QA, Debugger)
 */

// Core Classes
export { BaseAgent } from './core/BaseAgent.js';
export { ToolBuilder, CommonTools } from './core/Tool.js';
export {
  FrontEndTools,
  BackEndTools,
  QATools,
  DebuggerTools,
} from './core/SpecializedTools.js';
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

// Orchestration (Phase 2)
export {
  SwarmInterface,
  WorkflowBuilder,
  WorkflowPatterns,
  WorkflowType,
  TaskStatus as OrchestrationTaskStatus,
  WorkflowStatus as OrchestrationWorkflowStatus,
  type AgentTask,
  type WorkflowRequest,
  type TaskStatusResponse,
  type WorkflowStatusResponse,
} from './orchestrator/swarm_interface.js';

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

// Phase 1: Example Agent
export { CodeReviewAgent } from './agents/CodeReviewAgent.js';

// Phase 3: Specialized Functional Agents
export {
  FrontEndDevAgent,
  type FrontEndInput,
  type FrontEndOutput,
} from './agents/FrontEndDevAgent.js';
export {
  BackEndDevAgent,
  type BackEndInput,
  type BackEndOutput,
} from './agents/BackEndDevAgent.js';
export {
  QAAgent,
  type QAInput,
  type QAOutput,
} from './agents/QAAgent.js';
export {
  DebuggerAgent,
  type DebuggerInput,
  type DebuggerOutput,
} from './agents/DebuggerAgent.js';
