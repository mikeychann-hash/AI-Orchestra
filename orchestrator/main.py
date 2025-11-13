"""
AI Orchestra - Orchestration Service
FastAPI microservice powered by Swarms framework

This service provides:
- Multi-agent workflow execution (sequential, parallel, graph-based)
- REST API for job management
- Integration with TypeScript Core SDK agents
- Real-time status tracking
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any, Literal
from datetime import datetime
import uuid
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="AI Orchestra - Orchestration Service",
    description="Multi-agent workflow orchestration powered by Swarms",
    version="0.1.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# Models / Schemas
# ==========================================

class AgentTask(BaseModel):
    """Single agent task definition"""
    agent_id: str = Field(..., description="ID of the agent to execute")
    agent_role: str = Field(..., description="Role: frontend, backend, qa, debugger, coordinator")
    input_data: Dict[str, Any] = Field(..., description="Input data for the agent")
    depends_on: List[str] = Field(default_factory=list, description="IDs of tasks this depends on")

class WorkflowRequest(BaseModel):
    """Workflow execution request"""
    workflow_id: Optional[str] = Field(None, description="Optional workflow ID (auto-generated if not provided)")
    workflow_type: Literal["sequential", "parallel", "graph"] = Field(..., description="Workflow execution pattern")
    tasks: List[AgentTask] = Field(..., description="List of agent tasks to execute")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")

class TaskStatus(BaseModel):
    """Status of a single task"""
    task_id: str
    agent_id: str
    agent_role: str
    status: Literal["pending", "running", "completed", "failed"]
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class WorkflowStatus(BaseModel):
    """Status of entire workflow"""
    workflow_id: str
    workflow_type: str
    status: Literal["pending", "running", "completed", "failed", "partial"]
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    tasks: List[TaskStatus]
    metadata: Dict[str, Any]

# ==========================================
# In-Memory Storage (replace with Redis/DB in production)
# ==========================================

workflows_store: Dict[str, WorkflowStatus] = {}

# ==========================================
# API Endpoints
# ==========================================

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "AI Orchestra - Orchestration Service",
        "status": "running",
        "version": "0.1.0",
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "active_workflows": len(workflows_store),
        "timestamp": datetime.utcnow().isoformat(),
    }

@app.post("/run-graph", response_model=WorkflowStatus)
async def run_graph(
    workflow_request: WorkflowRequest,
    background_tasks: BackgroundTasks,
):
    """
    Execute a multi-agent workflow

    Supports three workflow types:
    - sequential: Tasks run one after another
    - parallel: All tasks run concurrently
    - graph: Tasks run based on dependency graph
    """
    # Generate workflow ID if not provided
    workflow_id = workflow_request.workflow_id or str(uuid.uuid4())

    # Create initial workflow status
    workflow_status = WorkflowStatus(
        workflow_id=workflow_id,
        workflow_type=workflow_request.workflow_type,
        status="pending",
        created_at=datetime.utcnow(),
        tasks=[
            TaskStatus(
                task_id=f"{workflow_id}-task-{i}",
                agent_id=task.agent_id,
                agent_role=task.agent_role,
                status="pending",
            )
            for i, task in enumerate(workflow_request.tasks)
        ],
        metadata=workflow_request.metadata,
    )

    # Store workflow
    workflows_store[workflow_id] = workflow_status

    # Execute workflow in background
    background_tasks.add_task(
        execute_workflow,
        workflow_id,
        workflow_request,
    )

    return workflow_status

@app.get("/status/{workflow_id}", response_model=WorkflowStatus)
async def get_status(workflow_id: str):
    """Get the status of a workflow"""
    if workflow_id not in workflows_store:
        raise HTTPException(status_code=404, detail=f"Workflow {workflow_id} not found")

    return workflows_store[workflow_id]

@app.get("/workflows", response_model=List[WorkflowStatus])
async def list_workflows(
    status: Optional[str] = None,
    limit: int = 100,
):
    """List all workflows, optionally filtered by status"""
    workflows = list(workflows_store.values())

    if status:
        workflows = [w for w in workflows if w.status == status]

    # Sort by creation time (newest first)
    workflows.sort(key=lambda w: w.created_at, reverse=True)

    return workflows[:limit]

@app.delete("/workflows/{workflow_id}")
async def delete_workflow(workflow_id: str):
    """Delete a workflow from the store"""
    if workflow_id not in workflows_store:
        raise HTTPException(status_code=404, detail=f"Workflow {workflow_id} not found")

    del workflows_store[workflow_id]

    return {"message": f"Workflow {workflow_id} deleted"}

# ==========================================
# Workflow Execution Logic
# ==========================================

async def execute_workflow(workflow_id: str, workflow_request: WorkflowRequest):
    """
    Execute a workflow based on its type
    This runs in the background
    """
    workflow = workflows_store[workflow_id]
    workflow.status = "running"
    workflow.started_at = datetime.utcnow()

    try:
        if workflow_request.workflow_type == "sequential":
            await execute_sequential(workflow_id, workflow_request)
        elif workflow_request.workflow_type == "parallel":
            await execute_parallel(workflow_id, workflow_request)
        elif workflow_request.workflow_type == "graph":
            await execute_graph(workflow_id, workflow_request)

        # Check if all tasks completed successfully
        all_completed = all(t.status == "completed" for t in workflow.tasks)
        any_failed = any(t.status == "failed" for t in workflow.tasks)

        if all_completed:
            workflow.status = "completed"
        elif any_failed:
            workflow.status = "partial" if any(t.status == "completed" for t in workflow.tasks) else "failed"

    except Exception as e:
        workflow.status = "failed"
        # Mark all pending/running tasks as failed
        for task in workflow.tasks:
            if task.status in ["pending", "running"]:
                task.status = "failed"
                task.error = str(e)

    workflow.completed_at = datetime.utcnow()

async def execute_sequential(workflow_id: str, workflow_request: WorkflowRequest):
    """Execute tasks one after another"""
    workflow = workflows_store[workflow_id]

    previous_result = None

    for i, task_def in enumerate(workflow_request.tasks):
        task_status = workflow.tasks[i]

        # Execute the task
        result = await execute_task(task_status, task_def, previous_result)

        # Store result for next task
        previous_result = result

        # If task failed and it's not QA (which can report failures), stop
        if task_status.status == "failed" and task_def.agent_role != "qa":
            break

async def execute_parallel(workflow_id: str, workflow_request: WorkflowRequest):
    """Execute all tasks concurrently"""
    import asyncio

    workflow = workflows_store[workflow_id]

    # Execute all tasks concurrently
    tasks = [
        execute_task(workflow.tasks[i], task_def, None)
        for i, task_def in enumerate(workflow_request.tasks)
    ]

    await asyncio.gather(*tasks, return_exceptions=True)

async def execute_graph(workflow_id: str, workflow_request: WorkflowRequest):
    """Execute tasks based on dependency graph"""
    import asyncio

    workflow = workflows_store[workflow_id]
    completed_tasks: Dict[str, Any] = {}
    task_events: Dict[str, asyncio.Event] = {}

    # Build task map and create events for each task
    task_map = {
        task_def.agent_id: (i, task_def)
        for i, task_def in enumerate(workflow_request.tasks)
    }

    # Create an event for each task to signal completion
    for task_def in workflow_request.tasks:
        task_events[task_def.agent_id] = asyncio.Event()

    async def execute_with_deps(task_def: AgentTask, task_idx: int):
        """Execute a task after its dependencies are met"""
        # Wait for dependencies using events (no polling)
        if task_def.depends_on:
            # Wait for all dependency events to be set
            await asyncio.gather(*[
                task_events[dep_id].wait()
                for dep_id in task_def.depends_on
            ])

        # Gather dependency results
        dep_results = {
            dep_id: completed_tasks[dep_id]
            for dep_id in task_def.depends_on
        } if task_def.depends_on else None

        # Execute task
        result = await execute_task(workflow.tasks[task_idx], task_def, dep_results)

        # Mark as completed
        completed_tasks[task_def.agent_id] = result

        # Signal completion to dependent tasks
        task_events[task_def.agent_id].set()

        return result

    # Execute all tasks (they'll wait for their dependencies internally)
    tasks = [
        execute_with_deps(task_def, i)
        for i, task_def in enumerate(workflow_request.tasks)
    ]

    await asyncio.gather(*tasks, return_exceptions=True)

async def execute_task(
    task_status: TaskStatus,
    task_def: AgentTask,
    context: Any,
) -> Optional[Dict[str, Any]]:
    """
    Execute a single agent task

    This is where we'll integrate with:
    1. TypeScript agents via HTTP bridge
    2. Swarms agents directly
    3. External services
    """
    import asyncio
    import httpx

    task_status.status = "running"
    task_status.started_at = datetime.utcnow()

    try:
        # TODO: Call TypeScript agent via bridge
        # For now, simulate execution

        # Simulate some work
        await asyncio.sleep(1)

        # Mock successful result
        result = {
            "agent_id": task_def.agent_id,
            "agent_role": task_def.agent_role,
            "input": task_def.input_data,
            "context": context,
            "output": {
                "success": True,
                "message": f"{task_def.agent_role} agent completed successfully",
                "timestamp": datetime.utcnow().isoformat(),
            }
        }

        task_status.status = "completed"
        task_status.result = result
        task_status.completed_at = datetime.utcnow()

        return result

    except Exception as e:
        task_status.status = "failed"
        task_status.error = str(e)
        task_status.completed_at = datetime.utcnow()
        return None

# ==========================================
# Run Server
# ==========================================

if __name__ == "__main__":
    import uvicorn

    host = os.getenv("ORCHESTRATOR_HOST", "0.0.0.0")
    port = int(os.getenv("ORCHESTRATOR_PORT", "8000"))

    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=True,
        log_level=os.getenv("LOG_LEVEL", "info").lower(),
    )
