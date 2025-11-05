import { z } from 'zod';

/**
 * Context Provider Types - for dynamic information injection
 */
export enum ContextProviderType {
  STATIC = 'static',
  DYNAMIC = 'dynamic',
  FILE = 'file',
  API = 'api',
  MEMORY = 'memory'
}

/**
 * Base Context Provider Interface
 */
export interface IContextProvider {
  name: string;
  type: ContextProviderType;
  provide(): Promise<string>;
}

/**
 * Context Data Schema - structured context information
 */
export const ContextDataSchema = z.object({
  source: z.string(),
  timestamp: z.number(),
  data: z.record(z.any()),
  metadata: z.record(z.string()).optional(),
});

export type ContextData = z.infer<typeof ContextDataSchema>;

/**
 * Memory Entry - for agent memory system
 */
export const MemoryEntrySchema = z.object({
  id: z.string(),
  agentId: z.string(),
  timestamp: z.number(),
  type: z.enum(['task', 'reflection', 'error', 'success']),
  content: z.string(),
  embedding: z.array(z.number()).optional(),
  metadata: z.record(z.any()).optional(),
});

export type MemoryEntry = z.infer<typeof MemoryEntrySchema>;
