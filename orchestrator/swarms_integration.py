"""
Swarms Framework Integration
Provides workflow orchestration using Swarms agents and patterns
"""

from swarms import Agent
from swarms.structs import SequentialWorkflow, ConcurrentWorkflow
from typing import List, Dict, Any, Optional
import os
from dotenv import load_dotenv

load_dotenv()

# ==========================================
# Agent Factory
# ==========================================

class AgentFactory:
    """Creates Swarms agents based on role definitions"""

    @staticmethod
    def create_agent(
        role: str,
        agent_id: str,
        llm_model: str = "gpt-4o",
        temperature: float = 0.7,
    ) -> Agent:
        """
        Create a Swarms agent for a specific role

        Args:
            role: Agent role (frontend, backend, qa, debugger, coordinator)
            agent_id: Unique identifier for the agent
            llm_model: LLM model to use
            temperature: Temperature for generation

        Returns:
            Configured Swarms Agent
        """
        # Role-specific system prompts
        system_prompts = {
            "frontend": """You are a Frontend Development Agent specialized in creating user interfaces and client-side logic.

Your responsibilities:
- Generate React/Next.js components with TypeScript
- Implement responsive designs with Tailwind CSS
- Ensure accessibility (ARIA, semantic HTML)
- Optimize performance (lazy loading, code splitting)
- Follow UI/UX best practices

Provide clean, maintainable code with proper component structure.""",

            "backend": """You are a Backend Development Agent specialized in server-side logic and API design.

Your responsibilities:
- Design and implement RESTful APIs
- Write Node.js/TypeScript server code
- Implement authentication and authorization
- Design database schemas and queries
- Ensure security best practices
- Handle error cases gracefully

Provide production-ready, scalable backend solutions.""",

            "qa": """You are a Quality Assurance Agent specialized in testing and validation.

Your responsibilities:
- Review code for bugs and issues
- Generate comprehensive test cases
- Write unit and integration tests
- Validate API responses and edge cases
- Check for security vulnerabilities
- Ensure code quality standards

Provide detailed test reports and actionable feedback.""",

            "debugger": """You are a Debugging Agent specialized in identifying and fixing issues.

Your responsibilities:
- Analyze error messages and stack traces
- Identify root causes of bugs
- Propose and implement fixes
- Debug runtime and logical errors
- Optimize problematic code sections
- Document fixes and preventive measures

Provide clear explanations and reliable solutions.""",

            "coordinator": """You are a Coordinator Agent responsible for orchestrating multiple agents and managing workflows.

Your responsibilities:
- Break down high-level objectives into subtasks
- Assign tasks to appropriate specialized agents
- Monitor task progress and dependencies
- Coordinate communication between agents
- Resolve conflicts and blockers
- Synthesize results into coherent outputs

Provide clear task assignments and maintain workflow efficiency.""",
        }

        system_prompt = system_prompts.get(role, "You are a helpful AI assistant.")

        # Create Swarms agent
        agent = Agent(
            agent_name=f"{role.capitalize()}Agent-{agent_id}",
            system_prompt=system_prompt,
            model_name=llm_model,
            temperature=temperature,
            max_loops=1,  # Single execution per task
            streaming_on=False,
            verbose=True,
            stopping_token="<END>",
            saved_state_path=f"agent_states/{agent_id}.json",
            retry_attempts=3,
            context_length=8192,
        )

        return agent


# ==========================================
# Workflow Builders
# ==========================================

class WorkflowBuilder:
    """Build and execute Swarms workflows"""

    @staticmethod
    def build_sequential_workflow(
        agents: List[Agent],
        workflow_name: str = "sequential_workflow",
    ) -> SequentialWorkflow:
        """
        Create a sequential workflow where agents execute one after another

        Args:
            agents: List of Swarms agents in execution order
            workflow_name: Name for the workflow

        Returns:
            Configured SequentialWorkflow
        """
        workflow = SequentialWorkflow(
            name=workflow_name,
            agents=agents,
            max_loops=1,
            verbose=True,
        )

        return workflow

    @staticmethod
    def build_concurrent_workflow(
        agents: List[Agent],
        workflow_name: str = "concurrent_workflow",
    ) -> ConcurrentWorkflow:
        """
        Create a concurrent workflow where agents execute in parallel

        Args:
            agents: List of Swarms agents to execute concurrently
            workflow_name: Name for the workflow

        Returns:
            Configured ConcurrentWorkflow
        """
        workflow = ConcurrentWorkflow(
            name=workflow_name,
            agents=agents,
            max_loops=1,
            verbose=True,
        )

        return workflow

    @staticmethod
    async def execute_graph_workflow(
        tasks: List[Dict[str, Any]],
        workflow_name: str = "graph_workflow",
    ) -> List[str]:
        """
        Execute a graph-based workflow with dependencies

        Args:
            tasks: List of task definitions with dependencies
            workflow_name: Name for the workflow

        Returns:
            List of task results
        """
        import asyncio

        # Build dependency graph
        task_map = {task["agent_id"]: task for task in tasks}
        results = {}

        async def execute_with_deps(task: Dict[str, Any]) -> str:
            """Execute task after dependencies are met"""
            # Wait for dependencies
            if task.get("depends_on"):
                while not all(dep_id in results for dep_id in task["depends_on"]):
                    await asyncio.sleep(0.1)

            # Create agent
            agent = AgentFactory.create_agent(
                role=task["agent_role"],
                agent_id=task["agent_id"],
            )

            # Gather context from dependencies
            context = ""
            if task.get("depends_on"):
                context = "\n\n".join(
                    f"[Dependency {dep_id}]\n{results[dep_id]}"
                    for dep_id in task["depends_on"]
                )

            # Build input
            input_text = task["input_data"].get("task", "")
            if context:
                input_text = f"{input_text}\n\nContext from previous steps:\n{context}"

            # Execute
            result = agent.run(input_text)

            # Store result
            results[task["agent_id"]] = result

            return result

        # Execute all tasks (they handle their own dependencies)
        task_coroutines = [execute_with_deps(task) for task in tasks]
        task_results = await asyncio.gather(*task_coroutines)

        return task_results


# ==========================================
# Pre-built Workflow Patterns
# ==========================================

class WorkflowPatterns:
    """Common multi-agent workflow patterns"""

    @staticmethod
    def full_stack_development_pipeline(
        feature_description: str,
    ) -> SequentialWorkflow:
        """
        Complete full-stack development workflow:
        Frontend → Backend → QA → Debug → QA

        Args:
            feature_description: Description of feature to build

        Returns:
            Configured sequential workflow
        """
        # Create agents
        frontend_agent = AgentFactory.create_agent("frontend", "fs-frontend")
        backend_agent = AgentFactory.create_agent("backend", "fs-backend")
        qa_agent_1 = AgentFactory.create_agent("qa", "fs-qa-1")
        debugger_agent = AgentFactory.create_agent("debugger", "fs-debugger")
        qa_agent_2 = AgentFactory.create_agent("qa", "fs-qa-2")

        # Build workflow
        workflow = WorkflowBuilder.build_sequential_workflow(
            agents=[
                frontend_agent,
                backend_agent,
                qa_agent_1,
                debugger_agent,
                qa_agent_2,
            ],
            workflow_name="full_stack_development",
        )

        return workflow

    @staticmethod
    def code_review_pipeline(
        code: str,
        language: str,
    ) -> ConcurrentWorkflow:
        """
        Parallel code review workflow:
        Multiple QA agents review different aspects concurrently

        Args:
            code: Code to review
            language: Programming language

        Returns:
            Configured concurrent workflow
        """
        # Create specialized QA agents
        security_qa = AgentFactory.create_agent("qa", "qa-security")
        performance_qa = AgentFactory.create_agent("qa", "qa-performance")
        style_qa = AgentFactory.create_agent("qa", "qa-style")

        # Build workflow
        workflow = WorkflowBuilder.build_concurrent_workflow(
            agents=[security_qa, performance_qa, style_qa],
            workflow_name="code_review_parallel",
        )

        return workflow

    @staticmethod
    def coordinator_supervised_workflow(
        objective: str,
    ) -> Agent:
        """
        Coordinator-led workflow where one agent manages others

        Args:
            objective: High-level objective

        Returns:
            Coordinator agent (manages sub-agents internally)
        """
        coordinator = AgentFactory.create_agent(
            "coordinator",
            "coordinator-main",
            temperature=0.6,
        )

        # Coordinator can delegate to other agents
        # This is a single agent that manages the workflow

        return coordinator
