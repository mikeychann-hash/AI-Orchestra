export interface SystemStatus {
  application: {
    name: string;
    version: string;
    environment: string;
    uptime: number;
  };
  llm: {
    connectors: number;
    providers: string[];
    defaultProvider: string;
    loadBalancing: string;
  };
  github: {
    enabled: boolean;
  };
}

export interface Provider {
  id: string;
  name: string;
  enabled: boolean;
  models: Model[];
}

export interface Model {
  id: string;
  name: string;
  contextWindow?: number;
  maxOutputTokens?: number;
  costPer1kInput?: number;
  costPer1kOutput?: number;
}

export interface AgentLog {
  id: string;
  agent: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: string;
  metadata?: any;
}

export interface Build {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  duration?: number;
  provider: string;
  model: string;
  prompt: string;
  result?: any;
  error?: string;
}

export interface Artifact {
  id: string;
  name: string;
  type: 'file' | 'report' | 'patch' | 'log';
  size: number;
  createdAt: string;
  buildId: string;
  content?: string;
  path?: string;
}

export interface Agent {
  id: string;
  name: string;
  type: 'frontend' | 'backend' | 'qa' | 'debugger' | 'coordinator';
  status: 'idle' | 'active' | 'error';
  currentTask?: string;
  tasksCompleted: number;
  lastActivity?: string;
}

export interface WebSocketMessage {
  type: 'log' | 'status' | 'build' | 'agent' | 'artifact';
  data: any;
  timestamp: string;
}

export interface ConfigSettings {
  providers: {
    openai: {
      enabled: boolean;
      apiKey?: string;
      defaultModel: string;
    };
    grok: {
      enabled: boolean;
      apiKey?: string;
      defaultModel: string;
    };
    ollama: {
      enabled: boolean;
      host: string;
      defaultModel: string;
    };
  };
  llm: {
    defaultProvider: string;
    loadBalancing: 'round-robin' | 'random' | 'default';
    enableFallback: boolean;
  };
  agents: {
    [key: string]: {
      enabled: boolean;
      preferredModel: string;
      temperature: number;
      maxTokens: number;
    };
  };
}
