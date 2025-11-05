/**
 * Swarm Interface - TypeScript bridge to Python Orchestration Service
 *
 * Provides type-safe client for communicating with the FastAPI orchestration service
 */

import { z } from 'zod';

/**
 * Workflow execution patterns
 */
export enum WorkflowType {
  SEQUENTIAL = 'sequential',
  PARALLEL = 'parallel',
  GRAPH = 'graph',
}

/**
 * Task status enum
 */
export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * Workflow status enum
 */
export enum WorkflowStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PARTIAL = 'partial',
}

/**
 * Agent task definition schema
 */
export const AgentTaskSchema = z.object({
  agent_id: z.string(),
  agent_role: z.string(),
  input_data: z.record(z.any()),
  depends_on: z.array(z.string()).default([]),
});

export type AgentTask = z.infer<typeof AgentTaskSchema>;

/**
 * Workflow request schema
 */
export const WorkflowRequestSchema = z.object({
  workflow_id: z.string().optional(),
  workflow_type: z.nativeEnum(WorkflowType),
  tasks: z.array(AgentTaskSchema),
  metadata: z.record(z.any()).default({}),
});

export type WorkflowRequest = z.infer<typeof WorkflowRequestSchema>;

/**
 * Task status response schema
 */
export const TaskStatusResponseSchema = z.object({
  task_id: z.string(),
  agent_id: z.string(),
  agent_role: z.string(),
  status: z.nativeEnum(TaskStatus),
  started_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  result: z.record(z.any()).nullable(),
  error: z.string().nullable(),
});

export type TaskStatusResponse = z.infer<typeof TaskStatusResponseSchema>;

/**
 * Workflow status response schema
 */
export const WorkflowStatusResponseSchema = z.object({
  workflow_id: z.string(),
  workflow_type: z.string(),
  status: z.nativeEnum(WorkflowStatus),
  created_at: z.string(),
  started_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  tasks: z.array(TaskStatusResponseSchema),
  metadata: z.record(z.any()),
});

export type WorkflowStatusResponse = z.infer<typeof WorkflowStatusResponseSchema>;

/**
 * Swarm Interface Client - Communicates with Python orchestration service
 */
export class SwarmInterface {
  private baseUrl: string;
  private apiKey?: string;
  private pollingInterval: number;

  constructor(
    baseUrl: string = 'http://localhost:8000',
    apiKey?: string,
    pollingInterval: number = 1000
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = apiKey;
    this.pollingInterval = pollingInterval;
  }

  /**
   * Submit a workflow for execution
   */
  async submitWorkflow(
    request: WorkflowRequest
  ): Promise<WorkflowStatusResponse> {
    const response = await this.makeRequest<WorkflowStatusResponse>(
      '/run-graph',
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );

    return WorkflowStatusResponseSchema.parse(response);
  }

  /**
   * Get the status of a workflow
   */
  async getWorkflowStatus(
    workflowId: string
  ): Promise<WorkflowStatusResponse> {
    const response = await this.makeRequest<WorkflowStatusResponse>(
      `/status/${workflowId}`,
      { method: 'GET' }
    );

    return WorkflowStatusResponseSchema.parse(response);
  }

  /**
   * List all workflows
   */
  async listWorkflows(
    status?: WorkflowStatus,
    limit: number = 100
  ): Promise<WorkflowStatusResponse[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    params.append('limit', limit.toString());

    const response = await this.makeRequest<WorkflowStatusResponse[]>(
      `/workflows?${params.toString()}`,
      { method: 'GET' }
    );

    return z.array(WorkflowStatusResponseSchema).parse(response);
  }

  /**
   * Delete a workflow
   */
  async deleteWorkflow(workflowId: string): Promise<void> {
    await this.makeRequest(`/workflows/${workflowId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Submit a workflow and wait for completion
   */
  async submitAndWait(
    request: WorkflowRequest,
    timeout: number = 300000, // 5 minutes default
    onProgress?: (status: WorkflowStatusResponse) => void
  ): Promise<WorkflowStatusResponse> {
    // Submit workflow
    const initial = await this.submitWorkflow(request);
    const workflowId = initial.workflow_id;

    const startTime = Date.now();

    // Poll for completion
    while (true) {
      const status = await this.getWorkflowStatus(workflowId);

      // Call progress callback if provided
      if (onProgress) {
        onProgress(status);
      }

      // Check if completed
      if (
        status.status === WorkflowStatus.COMPLETED ||
        status.status === WorkflowStatus.FAILED ||
        status.status === WorkflowStatus.PARTIAL
      ) {
        return status;
      }

      // Check timeout
      if (Date.now() - startTime > timeout) {
        throw new Error(
          `Workflow ${workflowId} timed out after ${timeout}ms`
        );
      }

      // Wait before next poll
      await this.sleep(this.pollingInterval);
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    status: string;
    active_workflows: number;
    timestamp: string;
  }> {
    return await this.makeRequest('/health', { method: 'GET' });
  }

  /**
   * Make HTTP request to orchestration service
   */
  private async makeRequest<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `Orchestration service request failed: ${response.status} ${error}`
      );
    }

    return await response.json();
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Workflow Builder - Fluent API for constructing workflows
 */
export class WorkflowBuilder {
  private workflowType: WorkflowType;
  private tasks: AgentTask[] = [];
  private metadata: Record<string, any> = {};
  private workflowId?: string;

  constructor(type: WorkflowType) {
    this.workflowType = type;
  }

  /**
   * Set workflow ID
   */
  setId(id: string): this {
    this.workflowId = id;
    return this;
  }

  /**
   * Add a task to the workflow
   */
  addTask(
    agentId: string,
    agentRole: string,
    inputData: Record<string, any>,
    dependsOn: string[] = []
  ): this {
    this.tasks.push({
      agent_id: agentId,
      agent_role: agentRole,
      input_data: inputData,
      depends_on: dependsOn,
    });
    return this;
  }

  /**
   * Add metadata to the workflow
   */
  addMetadata(key: string, value: any): this {
    this.metadata[key] = value;
    return this;
  }

  /**
   * Build the workflow request
   */
  build(): WorkflowRequest {
    if (this.tasks.length === 0) {
      throw new Error('Workflow must have at least one task');
    }

    return WorkflowRequestSchema.parse({
      workflow_id: this.workflowId,
      workflow_type: this.workflowType,
      tasks: this.tasks,
      metadata: this.metadata,
    });
  }

  /**
   * Build and submit the workflow
   */
  async submit(client: SwarmInterface): Promise<WorkflowStatusResponse> {
    const request = this.build();
    return await client.submitWorkflow(request);
  }

  /**
   * Build and submit, then wait for completion
   */
  async submitAndWait(
    client: SwarmInterface,
    timeout?: number,
    onProgress?: (status: WorkflowStatusResponse) => void
  ): Promise<WorkflowStatusResponse> {
    const request = this.build();
    return await client.submitAndWait(request, timeout, onProgress);
  }
}

/**
 * Pre-built workflow patterns
 */
export class WorkflowPatterns {
  /**
   * Full-stack development pipeline: Frontend → Backend → QA → Debug → QA
   */
  static fullStackDevelopment(featureDescription: string): WorkflowBuilder {
    return new WorkflowBuilder(WorkflowType.SEQUENTIAL)
      .addTask('frontend-agent', 'frontend', {
        task: `Create frontend components for: ${featureDescription}`,
      })
      .addTask('backend-agent', 'backend', {
        task: `Create backend API for: ${featureDescription}`,
      })
      .addTask('qa-agent-1', 'qa', {
        task: `Review the frontend and backend code. Identify issues.`,
      })
      .addTask('debugger-agent', 'debugger', {
        task: `Fix any issues found by QA agent.`,
      })
      .addTask('qa-agent-2', 'qa', {
        task: `Final review after fixes. Verify all issues are resolved.`,
      })
      .addMetadata('pattern', 'full-stack-development')
      .addMetadata('feature', featureDescription);
  }

  /**
   * Parallel code review: Multiple QA agents review different aspects
   */
  static parallelCodeReview(
    code: string,
    language: string
  ): WorkflowBuilder {
    return new WorkflowBuilder(WorkflowType.PARALLEL)
      .addTask('qa-security', 'qa', {
        task: `Review this ${language} code for security vulnerabilities:\n${code}`,
      })
      .addTask('qa-performance', 'qa', {
        task: `Review this ${language} code for performance issues:\n${code}`,
      })
      .addTask('qa-style', 'qa', {
        task: `Review this ${language} code for style and best practices:\n${code}`,
      })
      .addMetadata('pattern', 'parallel-code-review')
      .addMetadata('language', language);
  }

  /**
   * Graph-based workflow with custom dependencies
   */
  static customGraph(): WorkflowBuilder {
    return new WorkflowBuilder(WorkflowType.GRAPH);
  }
}
