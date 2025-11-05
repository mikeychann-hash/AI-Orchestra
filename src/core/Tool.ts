import { z } from 'zod';
import { ToolDefinition } from '../types/agent.types.js';

/**
 * Tool Builder - Fluent API for creating agent tools
 *
 * Provides a type-safe, schema-validated way to define agent capabilities
 */
export class ToolBuilder<T extends z.ZodSchema = z.ZodAny> {
  private name: string = '';
  private description: string = '';
  private parameters: T = z.any() as T;
  private executeFunction: ((params: z.infer<T>) => Promise<any>) | null = null;

  /**
   * Set the tool name
   */
  public setName(name: string): this {
    this.name = name;
    return this;
  }

  /**
   * Set the tool description
   */
  public setDescription(description: string): this {
    this.description = description;
    return this;
  }

  /**
   * Define the parameter schema
   */
  public setParameters<TSchema extends z.ZodSchema>(schema: TSchema): ToolBuilder<TSchema> {
    const builder = this as any;
    builder.parameters = schema;
    return builder;
  }

  /**
   * Set the execution function
   */
  public setExecute(fn: (params: z.infer<T>) => Promise<any>): this {
    this.executeFunction = fn;
    return this;
  }

  /**
   * Build the final tool definition
   */
  public build(): ToolDefinition {
    if (!this.name) {
      throw new Error('Tool name is required');
    }
    if (!this.description) {
      throw new Error('Tool description is required');
    }
    if (!this.executeFunction) {
      throw new Error('Tool execute function is required');
    }

    return {
      name: this.name,
      description: this.description,
      parameters: this.parameters,
      execute: this.executeFunction,
    };
  }
}

/**
 * Pre-built common tools
 */
export class CommonTools {
  /**
   * File read tool
   */
  static fileRead(): ToolDefinition {
    return new ToolBuilder()
      .setName('read_file')
      .setDescription('Read contents from a file')
      .setParameters(
        z.object({
          path: z.string().describe('Path to the file to read'),
        })
      )
      .setExecute(async ({ path }) => {
        const fs = await import('fs/promises');
        return await fs.readFile(path, 'utf-8');
      })
      .build();
  }

  /**
   * File write tool
   */
  static fileWrite(): ToolDefinition {
    return new ToolBuilder()
      .setName('write_file')
      .setDescription('Write contents to a file')
      .setParameters(
        z.object({
          path: z.string().describe('Path to the file to write'),
          content: z.string().describe('Content to write to the file'),
        })
      )
      .setExecute(async ({ path, content }) => {
        const fs = await import('fs/promises');
        await fs.writeFile(path, content, 'utf-8');
        return { success: true, path };
      })
      .build();
  }

  /**
   * Execute command tool
   */
  static executeCommand(): ToolDefinition {
    return new ToolBuilder()
      .setName('execute_command')
      .setDescription('Execute a shell command')
      .setParameters(
        z.object({
          command: z.string().describe('Command to execute'),
          cwd: z.string().optional().describe('Working directory'),
        })
      )
      .setExecute(async ({ command, cwd }) => {
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);

        const { stdout, stderr } = await execAsync(command, { cwd });
        return { stdout, stderr };
      })
      .build();
  }

  /**
   * Web search tool (placeholder - needs API integration)
   */
  static webSearch(): ToolDefinition {
    return new ToolBuilder()
      .setName('web_search')
      .setDescription('Search the web for information')
      .setParameters(
        z.object({
          query: z.string().describe('Search query'),
          limit: z.number().optional().default(5).describe('Number of results'),
        })
      )
      .setExecute(async ({ query, limit }) => {
        // TODO: Integrate with actual search API (e.g., Serper, Brave Search)
        console.warn('Web search not yet implemented');
        return { results: [], message: 'Web search requires API integration' };
      })
      .build();
  }
}
