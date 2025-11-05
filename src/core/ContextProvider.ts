import {
  IContextProvider,
  ContextProviderType,
  ContextData,
} from '../types/context.types.js';

/**
 * Static Context Provider - provides pre-defined static context
 */
export class StaticContextProvider implements IContextProvider {
  public readonly name: string;
  public readonly type = ContextProviderType.STATIC;
  private readonly content: string;

  constructor(name: string, content: string) {
    this.name = name;
    this.content = content;
  }

  async provide(): Promise<string> {
    return this.content;
  }
}

/**
 * Dynamic Context Provider - executes a function to generate context
 */
export class DynamicContextProvider implements IContextProvider {
  public readonly name: string;
  public readonly type = ContextProviderType.DYNAMIC;
  private readonly generator: () => Promise<string>;

  constructor(name: string, generator: () => Promise<string>) {
    this.name = name;
    this.generator = generator;
  }

  async provide(): Promise<string> {
    return await this.generator();
  }
}

/**
 * File Context Provider - reads context from a file
 */
export class FileContextProvider implements IContextProvider {
  public readonly name: string;
  public readonly type = ContextProviderType.FILE;
  private readonly filePath: string;

  constructor(name: string, filePath: string) {
    this.name = name;
    this.filePath = filePath;
  }

  async provide(): Promise<string> {
    const fs = await import('fs/promises');
    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      return content;
    } catch (error) {
      throw new Error(`Failed to read file ${this.filePath}: ${error}`);
    }
  }
}

/**
 * API Context Provider - fetches context from an HTTP endpoint
 */
export class APIContextProvider implements IContextProvider {
  public readonly name: string;
  public readonly type = ContextProviderType.API;
  private readonly url: string;
  private readonly headers?: Record<string, string>;

  constructor(name: string, url: string, headers?: Record<string, string>) {
    this.name = name;
    this.url = url;
    this.headers = headers;
  }

  async provide(): Promise<string> {
    try {
      const response = await fetch(this.url, {
        headers: this.headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return JSON.stringify(data, null, 2);
    } catch (error) {
      throw new Error(`Failed to fetch from ${this.url}: ${error}`);
    }
  }
}

/**
 * Memory Context Provider - retrieves relevant context from agent memory
 */
export class MemoryContextProvider implements IContextProvider {
  public readonly name: string;
  public readonly type = ContextProviderType.MEMORY;
  private readonly memoryRetriever: (query: string) => Promise<string[]>;
  private readonly query: string;

  constructor(
    name: string,
    query: string,
    memoryRetriever: (query: string) => Promise<string[]>
  ) {
    this.name = name;
    this.query = query;
    this.memoryRetriever = memoryRetriever;
  }

  async provide(): Promise<string> {
    try {
      const memories = await this.memoryRetriever(this.query);
      return memories.join('\n\n---\n\n');
    } catch (error) {
      throw new Error(`Failed to retrieve memories: ${error}`);
    }
  }
}

/**
 * Context Provider Factory - convenient creation methods
 */
export class ContextProviderFactory {
  static static(name: string, content: string): IContextProvider {
    return new StaticContextProvider(name, content);
  }

  static dynamic(
    name: string,
    generator: () => Promise<string>
  ): IContextProvider {
    return new DynamicContextProvider(name, generator);
  }

  static file(name: string, filePath: string): IContextProvider {
    return new FileContextProvider(name, filePath);
  }

  static api(
    name: string,
    url: string,
    headers?: Record<string, string>
  ): IContextProvider {
    return new APIContextProvider(name, url, headers);
  }

  static memory(
    name: string,
    query: string,
    retriever: (query: string) => Promise<string[]>
  ): IContextProvider {
    return new MemoryContextProvider(name, query, retriever);
  }

  /**
   * Create a timestamp context provider
   */
  static timestamp(name: string = 'Current Time'): IContextProvider {
    return new DynamicContextProvider(name, async () => {
      return new Date().toISOString();
    });
  }

  /**
   * Create an environment info context provider
   */
  static environmentInfo(name: string = 'Environment'): IContextProvider {
    return new DynamicContextProvider(name, async () => {
      return JSON.stringify(
        {
          platform: process.platform,
          nodeVersion: process.version,
          cwd: process.cwd(),
          env: process.env.NODE_ENV || 'development',
        },
        null,
        2
      );
    });
  }
}
