import { z } from 'zod';
import {
  AgentConfig,
  AgentInput,
  AgentOutput,
  AgentStatus,
  AgentExecutionContext,
  ToolDefinition,
  AgentInputSchema,
  AgentOutputSchema,
} from '../types/agent.types.js';
import { IContextProvider } from '../types/context.types.js';

/**
 * BaseAgent - Core agent execution template
 *
 * Provides the fundamental contract for all agents in the system:
 * - Schema-based input/output validation
 * - Context provider management
 * - Tool registration and execution
 * - Execution lifecycle management
 * - History tracking
 *
 * Inspired by Atomic-Agents' modular design philosophy
 */
export abstract class BaseAgent<
  TInput extends z.ZodSchema = typeof AgentInputSchema,
  TOutput extends z.ZodSchema = typeof AgentOutputSchema
> {
  protected config: AgentConfig;
  protected inputSchema: TInput;
  protected outputSchema: TOutput;
  protected tools: Map<string, ToolDefinition> = new Map();
  protected contextProviders: IContextProvider[] = [];
  protected executionContext: AgentExecutionContext;

  constructor(
    config: AgentConfig,
    inputSchema?: TInput,
    outputSchema?: TOutput
  ) {
    this.config = config;
    this.inputSchema = (inputSchema || AgentInputSchema) as TInput;
    this.outputSchema = (outputSchema || AgentOutputSchema) as TOutput;

    this.executionContext = {
      agentId: config.id,
      startTime: Date.now(),
      status: AgentStatus.IDLE,
      attempt: 0,
      history: [],
    };

    this.addSystemMessage(config.systemPrompt);
  }

  /**
   * Register a tool for the agent to use
   */
  public registerTool(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Register a context provider for dynamic context injection
   */
  public registerContextProvider(provider: IContextProvider): void {
    this.contextProviders.push(provider);
  }

  /**
   * Main execution method - implements retry logic and error handling
   */
  public async run(input: z.infer<TInput>): Promise<z.infer<TOutput>> {
    // Validate input
    const validatedInput = this.inputSchema.parse(input);

    this.executionContext.status = AgentStatus.THINKING;
    this.executionContext.attempt = 0;

    let lastError: Error | null = null;

    // Retry loop
    while (this.executionContext.attempt < this.config.retries) {
      try {
        this.executionContext.attempt++;

        // Gather context from providers
        const context = await this.gatherContext();

        // Execute the agent's core logic
        this.executionContext.status = AgentStatus.EXECUTING;
        const result = await this.execute(validatedInput, context);

        // Validate output
        const validatedOutput = this.outputSchema.parse(result);

        this.executionContext.status = AgentStatus.COMPLETED;

        return validatedOutput;
      } catch (error) {
        lastError = error as Error;
        console.error(
          `Agent ${this.config.id} execution failed (attempt ${this.executionContext.attempt}/${this.config.retries}):`,
          error
        );

        // Don't retry on validation errors
        if (error instanceof z.ZodError) {
          this.executionContext.status = AgentStatus.FAILED;
          throw error;
        }

        // Wait before retry (exponential backoff)
        if (this.executionContext.attempt < this.config.retries) {
          await this.sleep(Math.pow(2, this.executionContext.attempt) * 1000);
        }
      }
    }

    this.executionContext.status = AgentStatus.FAILED;
    throw new Error(
      `Agent ${this.config.id} failed after ${this.config.retries} attempts: ${lastError?.message}`
    );
  }

  /**
   * Abstract method - must be implemented by specific agent types
   * This is where the agent's core LLM interaction logic goes
   */
  protected abstract execute(
    input: z.infer<TInput>,
    context: string
  ): Promise<z.infer<TOutput>>;

  /**
   * Gather context from all registered providers
   */
  protected async gatherContext(): Promise<string> {
    if (this.contextProviders.length === 0) {
      return '';
    }

    const contextParts = await Promise.all(
      this.contextProviders.map(async (provider) => {
        try {
          const data = await provider.provide();
          return `[${provider.name}]\n${data}`;
        } catch (error) {
          console.error(`Context provider ${provider.name} failed:`, error);
          return '';
        }
      })
    );

    return contextParts.filter(Boolean).join('\n\n');
  }

  /**
   * Add a message to the agent's history
   */
  protected addMessage(
    role: 'user' | 'assistant',
    content: string
  ): void {
    this.executionContext.history.push({
      role,
      content,
      timestamp: Date.now(),
    });
  }

  /**
   * Add system message (typically during initialization)
   */
  protected addSystemMessage(content: string): void {
    this.executionContext.history.push({
      role: 'system',
      content,
      timestamp: Date.now(),
    });
  }

  /**
   * Get the current execution status
   */
  public getStatus(): AgentStatus {
    return this.executionContext.status;
  }

  /**
   * Get the agent's configuration
   */
  public getConfig(): AgentConfig {
    return { ...this.config };
  }

  /**
   * Get the agent's execution history
   */
  public getHistory(): AgentExecutionContext['history'] {
    return [...this.executionContext.history];
  }

  /**
   * Get all registered tools
   */
  public getTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Execute a registered tool by name
   */
  protected async executeTool(
    toolName: string,
    params: any
  ): Promise<any> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`);
    }

    // Validate parameters
    const validatedParams = tool.parameters.parse(params);

    // Execute tool
    return await tool.execute(validatedParams);
  }

  /**
   * Utility: sleep for async operations
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
