import { z } from 'zod';

/**
 * Feature Specification Schema
 *
 * Defines the structure of a feature specification that drives the pipeline
 */
export const FeatureSpecSchema = z.object({
  id: z.string().describe('Unique feature ID'),
  name: z.string().describe('Feature name'),
  description: z.string().describe('Detailed feature description'),
  type: z
    .enum(['full-stack', 'frontend-only', 'backend-only', 'bug-fix'])
    .default('full-stack')
    .describe('Type of feature'),

  frontend: z
    .object({
      enabled: z.boolean().default(true),
      components: z.array(
        z.object({
          name: z.string(),
          description: z.string(),
          type: z.enum(['page', 'component', 'layout', 'form']).optional(),
        })
      ),
      styling: z.enum(['tailwind', 'css', 'styled-components']).default('tailwind'),
      framework: z.enum(['react', 'nextjs', 'vue']).default('react'),
      requirements: z.array(z.string()).optional(),
    })
    .optional(),

  backend: z
    .object({
      enabled: z.boolean().default(true),
      endpoints: z.array(
        z.object({
          method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
          route: z.string(),
          description: z.string(),
          authentication: z.boolean().default(false),
        })
      ),
      framework: z.enum(['express', 'fastify', 'nestjs']).default('express'),
      database: z
        .enum(['postgresql', 'mongodb', 'mysql', 'sqlite', 'none'])
        .default('postgresql'),
      requirements: z.array(z.string()).optional(),
    })
    .optional(),

  testing: z
    .object({
      enabled: z.boolean().default(true),
      types: z
        .array(z.enum(['unit', 'integration', 'e2e', 'security']))
        .default(['unit']),
      coverage: z.number().min(0).max(100).default(80),
      strictMode: z.boolean().default(false),
    })
    .optional(),

  quality: z
    .object({
      maxQAIterations: z.number().int().min(1).max(10).default(3),
      autoFix: z.boolean().default(true),
      minScore: z.number().min(0).max(10).default(7),
    })
    .optional(),

  metadata: z
    .object({
      priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
      estimatedHours: z.number().positive().optional(),
      tags: z.array(z.string()).optional(),
      author: z.string().optional(),
    })
    .optional(),
});

export type FeatureSpec = z.infer<typeof FeatureSpecSchema>;

/**
 * Pipeline Configuration Schema
 */
export const PipelineConfigSchema = z.object({
  maxQAIterations: z.number().int().min(1).max(10).default(3),
  maxDebugIterations: z.number().int().min(1).max(5).default(2),
  continueOnWarnings: z.boolean().default(true),
  failOnQAFailure: z.boolean().default(false),
  parallelExecution: z.boolean().default(true),
  saveArtifacts: z.boolean().default(true),
  artifactsPath: z.string().default('./artifacts'),
  verbose: z.boolean().default(false),
});

export type PipelineConfig = z.infer<typeof PipelineConfigSchema>;

/**
 * Pipeline Stage Status
 */
export enum PipelineStage {
  INIT = 'init',
  FRONTEND = 'frontend',
  BACKEND = 'backend',
  QA = 'qa',
  DEBUG = 'debug',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * Pipeline Stage Result
 */
export interface StageResult {
  stage: PipelineStage;
  status: 'success' | 'failure' | 'warning';
  startTime: number;
  endTime?: number;
  duration?: number;
  output?: any;
  error?: string;
  artifacts?: Array<{
    type: string;
    path?: string;
    content?: string;
  }>;
}

/**
 * Pipeline Run Result
 */
export interface PipelineRunResult {
  runId: string;
  featureId: string;
  startTime: number;
  endTime?: number;
  totalDuration?: number;
  status: 'running' | 'completed' | 'failed';
  stages: StageResult[];
  qaIterations: number;
  debugIterations: number;
  finalScore?: number;
  artifacts: Array<{
    type: string;
    stage: string;
    path?: string;
    content?: string;
  }>;
  summary: {
    frontendGenerated: boolean;
    backendGenerated: boolean;
    qaScore?: number;
    issuesFound: number;
    issuesFixed: number;
    testsPassed?: number;
    testsFailed?: number;
  };
  logs: Array<{
    timestamp: number;
    level: 'info' | 'warn' | 'error';
    stage: PipelineStage;
    message: string;
  }>;
}
