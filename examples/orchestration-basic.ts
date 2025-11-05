/**
 * Basic Orchestration Example
 *
 * Demonstrates how to:
 * 1. Connect to the orchestration service
 * 2. Submit a simple sequential workflow
 * 3. Monitor workflow progress
 * 4. Retrieve results
 */

import {
  SwarmInterface,
  WorkflowBuilder,
  WorkflowType,
  WorkflowStatus,
} from '../src/orchestrator/swarm_interface.js';

async function main() {
  console.log('🎼 AI Orchestra - Basic Orchestration Example\n');

  // Create orchestration client
  const swarm = new SwarmInterface('http://localhost:8000');

  // Check service health
  console.log('Checking orchestration service health...');
  try {
    const health = await swarm.healthCheck();
    console.log('✓ Service is healthy');
    console.log(`  Active workflows: ${health.active_workflows}\n`);
  } catch (error) {
    console.error('❌ Orchestration service is not running!');
    console.error('Please start it with: cd orchestrator && python main.py\n');
    process.exit(1);
  }

  // Build a simple sequential workflow
  console.log('Building sequential workflow...\n');

  const workflow = new WorkflowBuilder(WorkflowType.SEQUENTIAL)
    .addTask('task-1', 'backend', {
      task: 'Create a REST API endpoint for user authentication',
    })
    .addTask('task-2', 'qa', {
      task: 'Review the authentication API for security issues',
    })
    .addTask('task-3', 'debugger', {
      task: 'Fix any security issues found in the authentication API',
    })
    .addMetadata('description', 'User authentication API development')
    .build();

  console.log('Workflow configuration:');
  console.log(`  Type: ${workflow.workflow_type}`);
  console.log(`  Tasks: ${workflow.tasks.length}\n`);

  // Submit workflow
  console.log('Submitting workflow...');
  const submitted = await swarm.submitWorkflow(workflow);
  console.log(`✓ Workflow submitted: ${submitted.workflow_id}`);
  console.log(`  Status: ${submitted.status}\n`);

  // Monitor progress
  console.log('Monitoring workflow progress...\n');

  const final = await swarm.submitAndWait(
    workflow,
    60000, // 1 minute timeout
    (status) => {
      console.log(`[${new Date().toLocaleTimeString()}] Status: ${status.status}`);

      // Show task progress
      status.tasks.forEach((task, index) => {
        const icon = {
          pending: '⏳',
          running: '🔄',
          completed: '✅',
          failed: '❌',
        }[task.status];

        console.log(`  ${icon} Task ${index + 1} (${task.agent_role}): ${task.status}`);
      });
      console.log('');
    }
  );

  // Display final results
  console.log('📊 Workflow Complete!\n');
  console.log(`Final Status: ${final.status}`);
  console.log(`Started: ${final.started_at}`);
  console.log(`Completed: ${final.completed_at}\n`);

  console.log('Task Results:');
  final.tasks.forEach((task, index) => {
    console.log(`\n${index + 1}. ${task.agent_role} (${task.status})`);
    if (task.result) {
      console.log(`   Output: ${JSON.stringify(task.result.output, null, 2)}`);
    }
    if (task.error) {
      console.log(`   Error: ${task.error}`);
    }
  });

  // List all workflows
  console.log('\n\n📋 All Workflows:');
  const allWorkflows = await swarm.listWorkflows();
  console.log(`Total: ${allWorkflows.length}`);

  allWorkflows.slice(0, 5).forEach((w) => {
    console.log(`  - ${w.workflow_id} (${w.status}) - ${w.workflow_type}`);
  });
}

main().catch(console.error);
