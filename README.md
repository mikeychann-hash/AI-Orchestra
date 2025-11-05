# AI Orchestra - Phase 1: Core SDK

A lightweight, modular agent composition framework for building autonomous multi-LLM applications.

## Overview

AI Orchestra is being built as a hybrid system combining Node/TypeScript for agent logic, Python/FastAPI (with Swarms) for orchestration, and Next.js for the frontend dashboard.

**Phase 1** focuses on creating the core SDK - a lightweight, schema-validated agent framework inspired by Atomic-Agents' design philosophy.

## Architecture Philosophy

```
Layer              | Source Influence    | Purpose
-------------------|---------------------|----------------------------------
Agent SDK          | Atomic-Agents       | Lightweight composition & validation
Orchestration      | Swarms              | Runtime management of concurrent agents
Pipeline Logic     | Concept-driven      | FE → BE → QA → Debug workflow design
```

## Features

✅ **Schema-based validation** - Type-safe input/output using Zod schemas
✅ **Modular design** - Single-purpose, composable components
✅ **Multi-provider LLM support** - OpenAI, Grok, Ollama, Anthropic (planned)
✅ **Context providers** - Dynamic information injection at runtime
✅ **Tool registration** - Extend agent capabilities with custom tools
✅ **Execution lifecycle** - Built-in retry logic and error handling
✅ **History tracking** - Full conversation and execution context

## Quick Start

### Installation

```bash
npm install
```

### Environment Setup

```bash
cp .env.example .env
# Edit .env with your API keys
```

Required environment variables:
```env
OPENAI_API_KEY=sk-xxx
GROK_API_KEY=xai-xxx        # Optional
OLLAMA_ENDPOINT=http://localhost:11434  # Optional
```

### Basic Usage

```typescript
import { CodeReviewAgent, ContextProviderFactory } from 'ai-orchestra';

// Create an agent
const agent = new CodeReviewAgent({
  name: 'Code Quality Reviewer',
});

// Add context providers
agent.registerContextProvider(
  ContextProviderFactory.static('Guidelines', 'Use TypeScript strict mode...')
);

// Run the agent
const result = await agent.run({
  code: 'function example() { ... }',
  language: 'javascript',
});

console.log(result);
```

## Core Components

### BaseAgent

Abstract base class providing the execution template for all agents:

```typescript
import { BaseAgent, AgentConfig } from 'ai-orchestra';

class MyAgent extends BaseAgent {
  constructor(config: AgentConfig) {
    super(config, inputSchema, outputSchema);
  }

  protected async execute(input, context) {
    // Implement your agent logic here
  }
}
```

### Context Providers

Inject dynamic information into agent prompts:

```typescript
import { ContextProviderFactory } from 'ai-orchestra';

// Static context
agent.registerContextProvider(
  ContextProviderFactory.static('name', 'content')
);

// Dynamic context
agent.registerContextProvider(
  ContextProviderFactory.dynamic('name', async () => {
    return await fetchLatestData();
  })
);

// File-based context
agent.registerContextProvider(
  ContextProviderFactory.file('Config', './config.json')
);

// API-based context
agent.registerContextProvider(
  ContextProviderFactory.api('API Data', 'https://api.example.com/data')
);
```

### Tools

Extend agent capabilities with custom tools:

```typescript
import { ToolBuilder, CommonTools } from 'ai-orchestra';

// Use pre-built tools
agent.registerTool(CommonTools.fileRead());
agent.registerTool(CommonTools.fileWrite());
agent.registerTool(CommonTools.executeCommand());

// Create custom tools
const customTool = new ToolBuilder()
  .setName('calculate')
  .setDescription('Perform mathematical calculations')
  .setParameters(z.object({
    expression: z.string(),
  }))
  .setExecute(async ({ expression }) => {
    return eval(expression); // Don't actually do this!
  })
  .build();

agent.registerTool(customTool);
```

### Configuration

Global configuration management:

```typescript
import { ConfigManager } from 'ai-orchestra';

const config = ConfigManager.getInstance();

// Get current configuration
const llmConfig = config.getLLMConfig();
const providerConfig = config.getProviderConfig('openai');

// Update configuration
config.updateConfig({
  llm: {
    defaultModel: 'gpt-4-turbo',
    defaultTemperature: 0.5,
  },
});
```

## Project Structure

```
AI Orchestra/
├── src/
│   ├── core/
│   │   ├── BaseAgent.ts          # Core agent execution template
│   │   ├── Tool.ts                # Tool builder and common tools
│   │   ├── ContextProvider.ts     # Context provider implementations
│   │   ├── Config.ts              # Configuration management
│   │   └── LLMClient.ts           # Multi-provider LLM abstraction
│   ├── types/
│   │   ├── agent.types.ts         # Agent-related types and schemas
│   │   └── context.types.ts       # Context provider types
│   ├── agents/
│   │   └── CodeReviewAgent.ts     # Example concrete agent
│   └── index.ts                   # Main exports
├── examples/
│   ├── basic-usage.ts             # Basic usage example
│   └── custom-agent.ts            # Custom agent creation example
├── package.json
├── tsconfig.json
└── README.md
```

## Examples

### Running Examples

```bash
# Set up environment
npm install
cp .env.example .env
# Add your API keys to .env

# Run basic usage example
npm run dev examples/basic-usage.ts

# Run custom agent example
npm run dev examples/custom-agent.ts
```

### Creating a Custom Agent

See [examples/custom-agent.ts](examples/custom-agent.ts) for a complete example of creating a custom documentation generation agent.

## Agent Presets

Pre-configured agent templates for common roles:

- **Frontend Agent** - React/Next.js UI development
- **Backend Agent** - API and server-side logic
- **QA Agent** - Testing and validation (used by CodeReviewAgent)
- **Debugger Agent** - Bug identification and fixes
- **Coordinator Agent** - Multi-agent orchestration

```typescript
import { AgentPresets, AgentRole } from 'ai-orchestra';

const qaConfig = AgentPresets[AgentRole.QA];
console.log(qaConfig.systemPrompt);
```

## API Reference

### BaseAgent

**Methods:**
- `run(input)` - Execute the agent with validated input
- `registerTool(tool)` - Register a tool for the agent
- `registerContextProvider(provider)` - Add a context provider
- `getStatus()` - Get current execution status
- `getHistory()` - Get conversation history
- `getTools()` - Get registered tools

**Abstract Methods:**
- `execute(input, context)` - Implement core agent logic (required)

### ToolBuilder

**Methods:**
- `setName(name)` - Set tool name
- `setDescription(desc)` - Set tool description
- `setParameters(schema)` - Define parameter schema
- `setExecute(fn)` - Set execution function
- `build()` - Create the tool definition

### ContextProviderFactory

**Static Methods:**
- `static(name, content)` - Create static context provider
- `dynamic(name, generator)` - Create dynamic context provider
- `file(name, path)` - Create file-based context provider
- `api(name, url, headers?)` - Create API-based context provider
- `memory(name, query, retriever)` - Create memory-based context provider
- `timestamp(name?)` - Create timestamp context provider
- `environmentInfo(name?)` - Create environment info provider

## Type Safety

All inputs and outputs are validated using Zod schemas:

```typescript
import { z } from 'zod';

const MyInputSchema = z.object({
  task: z.string(),
  options: z.object({
    verbose: z.boolean().default(false),
  }),
});

const MyOutputSchema = z.object({
  success: z.boolean(),
  result: z.any(),
});

class MyAgent extends BaseAgent<typeof MyInputSchema, typeof MyOutputSchema> {
  // TypeScript ensures type safety throughout
}
```

## Development

```bash
# Type checking
npm run type-check

# Build
npm run build

# Run tests (coming soon)
npm test
```

## Roadmap

### Phase 1 - Core SDK ✅ (Current)
- [x] BaseAgent execution template
- [x] Schema-based validation
- [x] Context providers
- [x] Tool system
- [x] Multi-provider LLM support
- [x] Configuration management

### Phase 2 - Orchestration (Next)
- [ ] Integrate Swarms for task scheduling
- [ ] Agent communication protocols
- [ ] Dependency management
- [ ] Concurrent execution
- [ ] Task queue system

### Phase 3 - Dashboard & Pipeline
- [ ] Next.js frontend dashboard
- [ ] Real-time agent monitoring
- [ ] FE → BE → QA → Debug pipeline
- [ ] Memory & reflection system
- [ ] Performance analytics

## License

MIT

## Contributing

Contributions welcome! This is Phase 1 of an ongoing project.
