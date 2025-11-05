/**
 * Full-Stack Development Pipeline Example
 *
 * Demonstrates the complete FE → BE → QA → Debug → QA pipeline
 */

import {
  SwarmInterface,
  WorkflowPatterns,
  WorkflowStatus,
} from '../src/orchestrator/swarm_interface.js';

async function main() {
  console.log('🎼 AI Orchestra - Full-Stack Development Pipeline\n');

  // Create orchestration client
  const swarm = new SwarmInterface('http://localhost:8000');

  // Define the feature to build
  const featureDescription = `
User Profile Dashboard with the following features:
- Display user information (name, email, avatar)
- Edit profile form with validation
- Upload avatar image
- Save changes to backend API
- Show loading and error states
- Responsive design for mobile and desktop
  `.trim();

  console.log('Feature to Build:');
  console.log(featureDescription);
  console.log('\n' + '='.repeat(60) + '\n');

  // Build the full-stack development workflow
  console.log('Building full-stack development pipeline...');
  console.log('Pipeline: Frontend → Backend → QA → Debug → QA\n');

  const workflow = WorkflowPatterns.fullStackDevelopment(featureDescription);

  // Submit and monitor
  console.log('Submitting workflow to orchestration service...\n');

  let currentStage = '';

  const result = await workflow.submitAndWait(
    swarm,
    300000, // 5 minute timeout
    (status) => {
      const timestamp = new Date().toLocaleTimeString();

      // Find currently running task
      const runningTask = status.tasks.find((t) => t.status === 'running');
      if (runningTask && runningTask.agent_role !== currentStage) {
        currentStage = runningTask.agent_role;
        console.log(`\n[${timestamp}] 🚀 Starting: ${currentStage.toUpperCase()} Agent`);
      }

      // Show progress bar
      const completed = status.tasks.filter((t) => t.status === 'completed').length;
      const total = status.tasks.length;
      const progress = Math.round((completed / total) * 100);
      const bar = '█'.repeat(Math.floor(progress / 5)) + '░'.repeat(20 - Math.floor(progress / 5));

      console.log(`[${timestamp}] Progress: [${bar}] ${progress}% (${completed}/${total} tasks)`);
    }
  );

  console.log('\n' + '='.repeat(60) + '\n');

  // Display results
  console.log('📊 Pipeline Results\n');

  if (result.status === WorkflowStatus.COMPLETED) {
    console.log('✅ All tasks completed successfully!\n');

    result.tasks.forEach((task, index) => {
      console.log(`${index + 1}. ${task.agent_role.toUpperCase()} Agent`);
      console.log(`   Status: ${task.status}`);
      console.log(`   Duration: ${calculateDuration(task.started_at, task.completed_at)}`);

      if (task.result?.output) {
        console.log(`   Output: ${task.result.output.message}`);
      }
      console.log('');
    });
  } else if (result.status === WorkflowStatus.FAILED) {
    console.log('❌ Workflow failed\n');

    result.tasks.forEach((task, index) => {
      if (task.status === 'failed') {
        console.log(`Failed at: ${task.agent_role.toUpperCase()} Agent`);
        console.log(`Error: ${task.error}\n`);
      }
    });
  } else if (result.status === WorkflowStatus.PARTIAL) {
    console.log('⚠️  Workflow partially completed\n');

    const completed = result.tasks.filter((t) => t.status === 'completed');
    const failed = result.tasks.filter((t) => t.status === 'failed');

    console.log(`Completed: ${completed.length}/${result.tasks.length}`);
    console.log(`Failed: ${failed.length}/${result.tasks.length}\n`);
  }

  // Show workflow metadata
  console.log('Workflow Info:');
  console.log(`  ID: ${result.workflow_id}`);
  console.log(`  Type: ${result.workflow_type}`);
  console.log(`  Total Duration: ${calculateDuration(result.started_at, result.completed_at)}`);
  console.log(`  Metadata: ${JSON.stringify(result.metadata, null, 2)}`);
}

function calculateDuration(start: string | null, end: string | null): string {
  if (!start || !end) return 'N/A';

  const duration = new Date(end).getTime() - new Date(start).getTime();
  const seconds = Math.floor(duration / 1000);
  const minutes = Math.floor(seconds / 60);

  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

main().catch(console.error);
