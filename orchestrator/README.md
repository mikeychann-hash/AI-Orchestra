# AI Orchestra - Orchestration Service (Phase 2)

FastAPI microservice powered by the Swarms framework for distributed, concurrent multi-agent execution.

## Overview

The orchestration service provides:

- **Multi-agent workflow execution** - Sequential, parallel, and graph-based patterns
- **REST API** - Simple endpoints for job submission and status tracking
- **Swarms integration** - Leverage enterprise-grade agent orchestration
- **TypeScript bridge** - Type-safe client for Node.js integration
- **Real-time monitoring** - Track workflow progress and task status

## Architecture

```
┌─────────────────┐
│  TypeScript App │  ← Your Node.js application
└────────┬────────┘
         │ HTTP
         ↓
┌─────────────────┐
│ SwarmInterface  │  ← TypeScript bridge client
└────────┬────────┘
         │ REST API
         ↓
┌─────────────────┐
│  FastAPI Server │  ← Python orchestration service
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ Swarms Framework│  ← Multi-agent orchestration
└─────────────────┘
```

## Quick Start

### 1. Install Dependencies

```bash
cd orchestrator
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your API keys
```

Required environment variables:
```env
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-ant-xxx  # Optional
GROK_API_KEY=xai-xxx          # Optional
```

### 3. Start the Service

```bash
python main.py
```

The service will start on `http://localhost:8000`

### 4. Verify Health

```bash
curl http://localhost:8000/health
```

## API Endpoints

### Health Check

```http
GET /health
```

Response:
```json
{
  "status": "healthy",
  "active_workflows": 0,
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Submit Workflow

```http
POST /run-graph
Content-Type: application/json

{
  "workflow_type": "sequential",
  "tasks": [
    {
      "agent_id": "task-1",
      "agent_role": "frontend",
      "input_data": {
        "task": "Create a login form component"
      },
      "depends_on": []
    }
  ],
  "metadata": {}
}
```

Response:
```json
{
  "workflow_id": "uuid-here",
  "workflow_type": "sequential",
  "status": "pending",
  "created_at": "2024-01-01T12:00:00.000Z",
  "tasks": [...],
  "metadata": {}
}
```

### Get Workflow Status

```http
GET /status/{workflow_id}
```

Response:
```json
{
  "workflow_id": "uuid-here",
  "status": "running",
  "tasks": [
    {
      "task_id": "task-1",
      "agent_id": "frontend-agent",
      "status": "completed",
      "result": {...}
    }
  ]
}
```

### List Workflows

```http
GET /workflows?status=completed&limit=10
```

### Delete Workflow

```http
DELETE /workflows/{workflow_id}
```

## Workflow Types

### Sequential Workflow

Tasks execute one after another. Each task receives the previous task's output as context.

```python
{
  "workflow_type": "sequential",
  "tasks": [
    {"agent_id": "1", "agent_role": "frontend", ...},
    {"agent_id": "2", "agent_role": "backend", ...},
    {"agent_id": "3", "agent_role": "qa", ...}
  ]
}
```

**Execution Order:** Task 1 → Task 2 → Task 3

### Parallel Workflow

All tasks execute concurrently. Ideal for independent operations.

```python
{
  "workflow_type": "parallel",
  "tasks": [
    {"agent_id": "1", "agent_role": "qa", ...},
    {"agent_id": "2", "agent_role": "qa", ...},
    {"agent_id": "3", "agent_role": "qa", ...}
  ]
}
```

**Execution Order:** Tasks 1, 2, 3 run simultaneously

### Graph Workflow

Tasks execute based on dependency graph. Supports complex workflows with multiple dependency chains.

```python
{
  "workflow_type": "graph",
  "tasks": [
    {"agent_id": "1", "agent_role": "frontend", "depends_on": []},
    {"agent_id": "2", "agent_role": "backend", "depends_on": []},
    {"agent_id": "3", "agent_role": "qa", "depends_on": ["1", "2"]},
    {"agent_id": "4", "agent_role": "debugger", "depends_on": ["3"]}
  ]
}
```

**Execution Order:**
- Tasks 1 & 2 run in parallel
- Task 3 waits for 1 & 2 to complete
- Task 4 waits for 3 to complete

## Using from TypeScript

### Basic Example

```typescript
import { SwarmInterface, WorkflowBuilder, WorkflowType } from 'ai-orchestra';

// Create client
const swarm = new SwarmInterface('http://localhost:8000');

// Build workflow
const workflow = new WorkflowBuilder(WorkflowType.SEQUENTIAL)
  .addTask('task-1', 'backend', { task: 'Create API endpoint' })
  .addTask('task-2', 'qa', { task: 'Review API' })
  .build();

// Submit and wait for completion
const result = await swarm.submitAndWait(workflow);

console.log(result.status); // 'completed'
```

### Pre-built Patterns

```typescript
import { WorkflowPatterns, SwarmInterface } from 'ai-orchestra';

const swarm = new SwarmInterface('http://localhost:8000');

// Full-stack development pipeline
const workflow = WorkflowPatterns.fullStackDevelopment(
  'User authentication system'
);

const result = await workflow.submitAndWait(swarm);
```

### Monitoring Progress

```typescript
await swarm.submitAndWait(
  workflow,
  60000, // timeout
  (status) => {
    console.log(`Status: ${status.status}`);
    status.tasks.forEach(task => {
      console.log(`  ${task.agent_role}: ${task.status}`);
    });
  }
);
```

## Swarms Integration

The service leverages the Swarms framework for agent orchestration:

### Agent Roles

- **Frontend** - React/Next.js UI development
- **Backend** - API and server-side logic
- **QA** - Testing and code review
- **Debugger** - Bug identification and fixes
- **Coordinator** - Multi-agent coordination

### Creating Custom Agents

```python
from orchestrator.swarms_integration import AgentFactory

agent = AgentFactory.create_agent(
    role='backend',
    agent_id='my-backend-agent',
    llm_model='gpt-4o',
    temperature=0.7
)
```

### Pre-built Workflow Patterns

```python
from orchestrator.swarms_integration import WorkflowPatterns

# Full-stack development pipeline
workflow = WorkflowPatterns.full_stack_development_pipeline(
    "User profile dashboard"
)

# Parallel code review
workflow = WorkflowPatterns.code_review_pipeline(
    code="...",
    language="typescript"
)

# Coordinator-supervised workflow
coordinator = WorkflowPatterns.coordinator_supervised_workflow(
    "Build e-commerce checkout flow"
)
```

## Configuration

### Environment Variables

```env
# Service Configuration
ORCHESTRATOR_HOST=0.0.0.0
ORCHESTRATOR_PORT=8000
ORCHESTRATOR_WORKERS=4

# LLM Providers
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-ant-xxx
GROK_API_KEY=xai-xxx

# Redis (Optional - for distributed task queue)
REDIS_URL=redis://localhost:6379/0

# Logging
LOG_LEVEL=INFO
ENABLE_DEBUG=false

# Security
API_KEY=your-secret-api-key
CORS_ORIGINS=http://localhost:3000
```

### Agent Configuration

Edit agent system prompts and settings in `swarms_integration.py`:

```python
system_prompts = {
    "frontend": "Your custom frontend agent prompt...",
    "backend": "Your custom backend agent prompt...",
    # ...
}
```

## Production Deployment

### Using Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and run:
```bash
docker build -t ai-orchestra-orchestrator .
docker run -p 8000:8000 --env-file .env ai-orchestra-orchestrator
```

### Scaling

The service is stateless and can be scaled horizontally:

```bash
# Run multiple workers
uvicorn main:app --workers 4

# Or use gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker
```

For distributed deployment, configure Redis for shared state:

```python
# TODO: Implement Redis-backed workflow storage
```

## Development

### Running in Development Mode

```bash
python main.py
# or
uvicorn main:app --reload
```

### Testing Endpoints

```bash
# Submit test workflow
curl -X POST http://localhost:8000/run-graph \
  -H "Content-Type: application/json" \
  -d '{
    "workflow_type": "sequential",
    "tasks": [
      {
        "agent_id": "test-1",
        "agent_role": "backend",
        "input_data": {"task": "Create API"}
      }
    ]
  }'

# Check status
curl http://localhost:8000/status/<workflow-id>
```

### API Documentation

Interactive API docs available at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Troubleshooting

### Service Won't Start

1. Check Python version: `python --version` (requires 3.10+)
2. Verify dependencies: `pip install -r requirements.txt`
3. Check port availability: `lsof -i :8000`

### Workflows Failing

1. Check logs: `LOG_LEVEL=DEBUG python main.py`
2. Verify API keys in `.env`
3. Test LLM connectivity independently

### Performance Issues

1. Increase workers: `ORCHESTRATOR_WORKERS=8`
2. Enable Redis for distributed state
3. Monitor resource usage: `htop` or `docker stats`

## Next Steps

- Integrate with Phase 3: Frontend Dashboard
- Implement memory & reflection system
- Add workflow templates marketplace
- Enable real-time WebSocket updates

## Support

For issues and questions:
- GitHub Issues: https://github.com/mikeychann-hash/AI-Orchestra/issues
- Documentation: See main README.md
