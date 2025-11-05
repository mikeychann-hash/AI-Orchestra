# AI Orchestra - Autonomous Multi-LLM Development System

A production-ready framework for building distributed, multi-agent AI systems with TypeScript and Python.

## Overview

AI Orchestra is a hybrid system combining:
- **Node/TypeScript** - Agent logic and LLM connectors (Phases 1 & 3)
- **Python/FastAPI + Swarms** - Distributed orchestration (Phase 2)
- **Next.js** - Frontend dashboard (Phase 4 - Coming Soon)

### Current Status

✅ **Phase 1 Complete** - Core SDK with schema-validated agents
✅ **Phase 2 Complete** - Swarms-powered orchestration service
✅ **Phase 3 Complete** - Specialized functional agents (Frontend, Backend, QA, Debugger)
⏳ **Phase 4 Planned** - Real-time dashboard and memory system

## Architecture Philosophy

```
Layer              | Source Influence    | Purpose
-------------------|---------------------|----------------------------------
Agent SDK          | Atomic-Agents       | Lightweight composition & validation
Orchestration      | Swarms              | Runtime management of concurrent agents
Pipeline Logic     | Concept-driven      | FE → BE → QA → Debug workflow design
```

## Features

### Phase 1: Core SDK
✅ **Schema-based validation** - Type-safe input/output using Zod schemas
✅ **Modular design** - Single-purpose, composable components
✅ **Multi-provider LLM support** - OpenAI, Grok, Ollama, Anthropic (planned)
✅ **Context providers** - Dynamic information injection at runtime
✅ **Tool registration** - Extend agent capabilities with custom tools
✅ **Execution lifecycle** - Built-in retry logic and error handling
✅ **History tracking** - Full conversation and execution context

### Phase 2: Orchestration
✅ **Multi-agent workflows** - Sequential, parallel, and graph-based execution
✅ **Swarms integration** - Enterprise-grade agent orchestration
✅ **REST API** - FastAPI endpoints for workflow management
✅ **TypeScript bridge** - Type-safe client for Node.js integration
✅ **Real-time tracking** - Monitor workflow progress and task status
✅ **Workflow patterns** - Pre-built templates for common use cases

### Phase 3: Specialized Agents
✅ **FrontEndDevAgent** - React/Tailwind component generation (Ollama qwen2.5:1.5b)
✅ **BackEndDevAgent** - Express API route creation (Ollama mistral:7b)
✅ **QAAgent** - Comprehensive testing and code review (Ollama codellama:13b)
✅ **DebuggerAgent** - Bug analysis and fixing (Grok xAI)
✅ **Specialized tools** - Role-specific tools for each agent type
✅ **Custom configurations** - Tailored prompts and settings per agent

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

### Phase 2: Orchestration Quick Start

#### 1. Start the Orchestration Service

```bash
cd orchestrator
pip install -r requirements.txt
cp .env.example .env
# Add your API keys to .env
python main.py
```

The service will start on `http://localhost:8000`

#### 2. Use from TypeScript

```typescript
import {
  SwarmInterface,
  WorkflowPatterns,
  WorkflowType,
} from 'ai-orchestra';

// Connect to orchestration service
const swarm = new SwarmInterface('http://localhost:8000');

// Use pre-built pattern: FE → BE → QA → Debug → QA
const workflow = WorkflowPatterns.fullStackDevelopment(
  'User authentication system'
);

// Submit and monitor
const result = await workflow.submitAndWait(swarm, 60000, (status) => {
  console.log(`Status: ${status.status}`);
  status.tasks.forEach(task => {
    console.log(`  ${task.agent_role}: ${task.status}`);
  });
});

console.log('Workflow complete!', result);
```

#### 3. Run Examples

```bash
# Basic orchestration
npm run dev examples/orchestration-basic.ts

# Full-stack pipeline
npm run dev examples/orchestration-fullstack.ts

# Parallel execution
npm run dev examples/orchestration-parallel.ts
```

### Phase 3: Specialized Agents Quick Start

#### 1. Ensure Ollama is Running

The specialized agents use Ollama for local LLM inference:

```bash
# Install Ollama from https://ollama.ai
# Pull required models
ollama pull qwen2.5:1.5b    # For FrontEndDevAgent
ollama pull mistral:7b       # For BackEndDevAgent
ollama pull codellama:13b    # For QAAgent
```

#### 2. Configure Grok API (for DebuggerAgent)

```bash
# Add Grok API key to .env
GROK_API_KEY=xai-your-key-here
```

#### 3. Use Specialized Agents

```typescript
import { FrontEndDevAgent, BackEndDevAgent, QAAgent, DebuggerAgent } from 'ai-orchestra';

// Generate React component
const frontendAgent = new FrontEndDevAgent();
const component = await frontendAgent.run({
  feature: 'User login form with email and password',
  componentName: 'LoginForm',
  styling: 'tailwind',
});

// Generate API endpoint
const backendAgent = new BackEndDevAgent();
const endpoint = await backendAgent.run({
  feature: 'User authentication endpoint',
  method: 'POST',
  route: '/api/auth/login',
});

// Review code quality
const qaAgent = new QAAgent();
const review = await qaAgent.run({
  testType: 'all',
  code: yourCode,
  strictMode: true,
});

// Fix bugs
const debuggerAgent = new DebuggerAgent();
const fix = await debuggerAgent.run({
  errorMessage: error.message,
  stackTrace: error.stack,
  code: problematicCode,
});
```

#### 4. Run Phase 3 Examples

```bash
# Frontend agent examples
npm run dev examples/phase3-frontend-agent.ts

# Backend agent examples
npm run dev examples/phase3-backend-agent.ts

# QA agent examples
npm run dev examples/phase3-qa-agent.ts

# Debugger agent examples
npm run dev examples/phase3-debugger-agent.ts
```

## Core Components

### Phase 1: Core SDK Components

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

### Phase 2: Orchestration Components

#### SwarmInterface

TypeScript client for communicating with the orchestration service:

```typescript
import { SwarmInterface } from 'ai-orchestra';

const swarm = new SwarmInterface('http://localhost:8000');

// Submit workflow
const status = await swarm.submitWorkflow(workflowRequest);

// Check status
const current = await swarm.getWorkflowStatus(status.workflow_id);

// Wait for completion
const final = await swarm.submitAndWait(workflowRequest, 60000);
```

#### WorkflowBuilder

Fluent API for constructing workflows:

```typescript
import { WorkflowBuilder, WorkflowType } from 'ai-orchestra';

const workflow = new WorkflowBuilder(WorkflowType.SEQUENTIAL)
  .addTask('task-1', 'frontend', { task: 'Create UI components' })
  .addTask('task-2', 'backend', { task: 'Create API endpoints' })
  .addTask('task-3', 'qa', { task: 'Review code' })
  .addMetadata('project', 'my-app')
  .build();

// Or use pre-built patterns
import { WorkflowPatterns } from 'ai-orchestra';

const fullStack = WorkflowPatterns.fullStackDevelopment('Feature description');
const codeReview = WorkflowPatterns.parallelCodeReview(code, 'typescript');
```

#### Workflow Types

```typescript
// Sequential: Task 1 → Task 2 → Task 3
WorkflowType.SEQUENTIAL

// Parallel: Tasks 1, 2, 3 run simultaneously
WorkflowType.PARALLEL

// Graph: Tasks execute based on dependencies
WorkflowType.GRAPH
```

### Phase 3: Specialized Agent Components

#### FrontEndDevAgent

Generates React/Tailwind components using Ollama qwen2.5:1.5b:

```typescript
import { FrontEndDevAgent, FrontEndTools } from 'ai-orchestra';

const agent = new FrontEndDevAgent();

// Register specialized tools
agent.registerTool(FrontEndTools.validateComponent());
agent.registerTool(FrontEndTools.checkTailwindClasses());

const result = await agent.run({
  feature: 'Login form with validation',
  componentName: 'LoginForm',
  styling: 'tailwind',
  framework: 'react',
  typescript: true,
  accessibility: true,
  responsive: true,
});

console.log(result.code);          // Generated component code
console.log(result.dependencies);  // Required npm packages
console.log(result.usage);         // Usage example
```

#### BackEndDevAgent

Creates Express API routes using Ollama mistral:7b:

```typescript
import { BackEndDevAgent, BackEndTools } from 'ai-orchestra';

const agent = new BackEndDevAgent();

// Register security tools
agent.registerTool(BackEndTools.validateEndpoint());
agent.registerTool(BackEndTools.checkSecurity());

const result = await agent.run({
  feature: 'User authentication endpoint',
  method: 'POST',
  route: '/api/auth/login',
  framework: 'express',
  database: 'postgresql',
  authentication: false,  // This IS the auth endpoint
  validation: true,
  typescript: true,
});

console.log(result.code);       // Route handler code
console.log(result.middleware); // Middleware (auth, validation)
console.log(result.model);      // Database model
```

#### QAAgent

Comprehensive testing and code review using Ollama codellama:13b:

```typescript
import { QAAgent, QATools } from 'ai-orchestra';

const agent = new QAAgent();

// Register QA tools
agent.registerTool(QATools.runLinter());
agent.registerTool(QATools.calculateComplexity());

const result = await agent.run({
  testType: 'all',  // unit, integration, e2e, lint, security, all
  code: codeToReview,
  framework: 'jest',
  coverage: true,
  strictMode: true,
});

console.log(result.overallStatus); // pass, fail, warning
console.log(result.score);         // Quality score 0-10
console.log(result.issues);        // Array of issues with severity
console.log(result.testCode);      // Generated test code
```

#### DebuggerAgent

Bug analysis and fixing using Grok (xAI):

```typescript
import { DebuggerAgent, DebuggerTools } from 'ai-orchestra';

const agent = new DebuggerAgent();

// Register debugging tools
agent.registerTool(DebuggerTools.parseStackTrace());
agent.registerTool(DebuggerTools.analyzeError());

const result = await agent.run({
  errorMessage: error.message,
  stackTrace: error.stack,
  code: problematicCode,
  qaReport: qaResults,        // Optional: QA findings
  expectedBehavior: 'Should return user data',
  actualBehavior: 'Returns undefined',
  reproducible: true,
});

console.log(result.diagnosis);   // Root cause analysis
console.log(result.fixes);       // Array of proposed fixes
result.fixes.forEach(fix => {
  console.log(fix.patch);        // Code patch
  console.log(fix.confidence);   // Confidence level 0-100
  console.log(fix.impact);       // breaking or non-breaking
});
console.log(result.preventionTips);       // How to prevent
console.log(result.testRecommendations);  // Tests to add
```

#### Specialized Tools

Each agent type has specialized tools:

```typescript
import { FrontEndTools, BackEndTools, QATools, DebuggerTools } from 'ai-orchestra';

// Frontend
FrontEndTools.validateComponent()
FrontEndTools.checkTailwindClasses()
FrontEndTools.generateTemplate()

// Backend
BackEndTools.validateEndpoint()
BackEndTools.checkSecurity()
BackEndTools.generateRouteTemplate()

// QA
QATools.runLinter()
QATools.calculateComplexity()
QATools.generateTestTemplate()

// Debugger
DebuggerTools.parseStackTrace()
DebuggerTools.analyzeError()
DebuggerTools.generatePatch()
```

## Project Structure

```
AI-Orchestra/
├── src/                           # Phase 1: Core SDK (TypeScript)
│   ├── core/
│   │   ├── BaseAgent.ts           # Core agent execution template
│   │   ├── Tool.ts                 # Tool builder and common tools
│   │   ├── ContextProvider.ts      # Context provider implementations
│   │   ├── Config.ts               # Configuration management
│   │   └── LLMClient.ts            # Multi-provider LLM abstraction
│   ├── orchestrator/
│   │   └── swarm_interface.ts      # TypeScript bridge to Python service
│   ├── types/
│   │   ├── agent.types.ts          # Agent-related types and schemas
│   │   └── context.types.ts        # Context provider types
│   ├── agents/                      # Phase 1 & 3: Agents
│   │   ├── CodeReviewAgent.ts      # Phase 1: Example agent
│   │   ├── FrontEndDevAgent.ts     # Phase 3: React/Tailwind generator
│   │   ├── BackEndDevAgent.ts      # Phase 3: Express API generator
│   │   ├── QAAgent.ts              # Phase 3: Testing & code review
│   │   └── DebuggerAgent.ts        # Phase 3: Bug analysis & fixing
│   └── index.ts                    # Main exports
│
├── orchestrator/                   # Phase 2: Orchestration Service (Python)
│   ├── main.py                     # FastAPI application
│   ├── swarms_integration.py       # Swarms framework integration
│   ├── requirements.txt            # Python dependencies
│   ├── .env.example                # Environment template
│   └── README.md                   # Orchestration docs
│
├── examples/
│   ├── basic-usage.ts              # Phase 1: Basic agent usage
│   ├── custom-agent.ts             # Phase 1: Custom agent creation
│   ├── orchestration-basic.ts      # Phase 2: Basic orchestration
│   ├── orchestration-fullstack.ts  # Phase 2: Full-stack pipeline
│   ├── orchestration-parallel.ts   # Phase 2: Parallel execution
│   ├── phase3-frontend-agent.ts    # Phase 3: Frontend agent examples
│   ├── phase3-backend-agent.ts     # Phase 3: Backend agent examples
│   ├── phase3-qa-agent.ts          # Phase 3: QA agent examples
│   └── phase3-debugger-agent.ts    # Phase 3: Debugger agent examples
│
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

### Phase 1 - Core SDK ✅ Complete
- [x] BaseAgent execution template
- [x] Schema-based validation
- [x] Context providers
- [x] Tool system
- [x] Multi-provider LLM support
- [x] Configuration management

### Phase 2 - Orchestration ✅ Complete
- [x] FastAPI orchestration service
- [x] Swarms framework integration
- [x] Multi-agent workflows (Sequential, Parallel, Graph)
- [x] TypeScript bridge (SwarmInterface)
- [x] Workflow patterns (Full-stack, Code review)
- [x] Real-time status tracking
- [x] REST API endpoints

### Phase 3 - Specialized Agents ✅ Complete
- [x] FrontEndDevAgent (React/Tailwind with Ollama qwen2.5:1.5b)
- [x] BackEndDevAgent (Express APIs with Ollama mistral:7b)
- [x] QAAgent (Testing & review with Ollama codellama:13b)
- [x] DebuggerAgent (Bug fixing with Grok xAI)
- [x] Specialized tools for each agent type
- [x] Custom input/output schemas per agent
- [x] Comprehensive examples for all agents

### Phase 4 - Dashboard & Memory (Next)
- [ ] Next.js frontend dashboard
- [ ] Real-time agent monitoring UI
- [ ] WebSocket integration for live updates
- [ ] Memory & reflection system
- [ ] Performance analytics dashboard
- [ ] Workflow visualization
- [ ] Agent marketplace/templates

### Phase 5 - Production Features (Planned)
- [ ] Redis-backed distributed state
- [ ] Agent performance metrics
- [ ] Self-improving agents
- [ ] Multi-project orchestration
- [ ] CLI tools
- [ ] Docker compose setup
- [ ] CI/CD integration

## License

MIT

## Agent Comparison

| Agent | Model | Provider | Purpose | Input | Output |
|-------|-------|----------|---------|-------|--------|
| **FrontEndDevAgent** | qwen2.5:1.5b | Ollama | React/Tailwind UI generation | Feature spec | Component code |
| **BackEndDevAgent** | mistral:7b | Ollama | Express API creation | Endpoint spec | Route handler |
| **QAAgent** | codellama:13b | Ollama | Code review & testing | Code/test results | QA report |
| **DebuggerAgent** | grok-beta | Grok (xAI) | Bug analysis & fixes | Error/stack trace | Fixes & patches |

## Contributing

Contributions welcome! Phase 3 complete - Phase 4 dashboard in progress.
