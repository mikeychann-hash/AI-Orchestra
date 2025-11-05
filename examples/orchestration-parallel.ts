/**
 * Parallel Workflow Example
 *
 * Demonstrates concurrent execution of multiple agents
 * Example: Multiple QA agents reviewing different aspects simultaneously
 */

import {
  SwarmInterface,
  WorkflowPatterns,
  WorkflowBuilder,
  WorkflowType,
} from '../src/orchestrator/swarm_interface.js';

async function main() {
  console.log('🎼 AI Orchestra - Parallel Workflow Example\n');

  const swarm = new SwarmInterface('http://localhost:8000');

  // Sample code to review
  const codeToReview = `
export class AuthService {
  private users: Map<string, User> = new Map();

  async login(email: string, password: string): Promise<string> {
    const user = Array.from(this.users.values()).find(u => u.email === email);

    if (!user) {
      throw new Error('User not found');
    }

    // TODO: Hash password before comparison
    if (user.password !== password) {
      throw new Error('Invalid password');
    }

    // Generate token (simplified)
    const token = Buffer.from(\`\${email}:\${Date.now()}\`).toString('base64');
    return token;
  }

  async register(email: string, password: string, name: string): Promise<User> {
    if (this.users.has(email)) {
      throw new Error('User already exists');
    }

    const user = {
      id: Math.random().toString(36),
      email,
      password, // Storing plain text password
      name,
      createdAt: new Date(),
    };

    this.users.set(email, user);
    return user;
  }

  getUser(email: string): User | undefined {
    return this.users.get(email);
  }
}
`;

  console.log('Code to Review:');
  console.log('─'.repeat(60));
  console.log(codeToReview);
  console.log('─'.repeat(60) + '\n');

  // Build parallel code review workflow
  console.log('Building parallel code review workflow...');
  console.log('Multiple QA agents will review different aspects concurrently:\n');
  console.log('  1. Security Review Agent');
  console.log('  2. Performance Review Agent');
  console.log('  3. Code Style Review Agent\n');

  const workflow = WorkflowPatterns.parallelCodeReview(
    codeToReview,
    'typescript'
  );

  // Submit and wait
  console.log('Submitting workflow...\n');

  const result = await workflow.submitAndWait(
    swarm,
    120000, // 2 minute timeout
    (status) => {
      const timestamp = new Date().toLocaleTimeString();

      // Show status of all parallel tasks
      const running = status.tasks.filter((t) => t.status === 'running');
      const completed = status.tasks.filter((t) => t.status === 'completed');

      console.log(`[${timestamp}] Running: ${running.length}, Completed: ${completed.length}/${status.tasks.length}`);

      status.tasks.forEach((task) => {
        const icon = {
          pending: '⏳',
          running: '🔄',
          completed: '✅',
          failed: '❌',
        }[task.status];

        console.log(`  ${icon} ${task.agent_id}: ${task.status}`);
      });
      console.log('');
    }
  );

  // Display aggregated results
  console.log('\n' + '='.repeat(60) + '\n');
  console.log('📊 Code Review Results\n');

  result.tasks.forEach((task, index) => {
    const reviewType = task.agent_id.split('-')[1]; // Extract review type from agent_id

    console.log(`${index + 1}. ${reviewType.toUpperCase()} REVIEW`);
    console.log(`   Status: ${task.status === 'completed' ? '✅ Completed' : '❌ Failed'}`);

    if (task.result?.output) {
      console.log(`   Findings: ${task.result.output.message}`);
    }

    if (task.error) {
      console.log(`   Error: ${task.error}`);
    }

    console.log('');
  });

  // Calculate total time saved by parallel execution
  if (result.started_at && result.completed_at) {
    const totalDuration = new Date(result.completed_at).getTime() - new Date(result.started_at).getTime();
    const avgTaskDuration = totalDuration / result.tasks.length;
    const sequentialEstimate = avgTaskDuration * result.tasks.length;
    const timeSaved = sequentialEstimate - totalDuration;

    console.log('⚡ Performance:');
    console.log(`   Parallel execution: ${Math.round(totalDuration / 1000)}s`);
    console.log(`   Sequential estimate: ${Math.round(sequentialEstimate / 1000)}s`);
    console.log(`   Time saved: ${Math.round(timeSaved / 1000)}s (${Math.round((timeSaved / sequentialEstimate) * 100)}%)`);
  }

  console.log('\n' + '='.repeat(60));

  // Example: Custom parallel workflow
  console.log('\n\nBuilding custom parallel workflow...\n');

  const customWorkflow = new WorkflowBuilder(WorkflowType.PARALLEL)
    .addTask('frontend-1', 'frontend', {
      task: 'Create login page component',
    })
    .addTask('frontend-2', 'frontend', {
      task: 'Create registration page component',
    })
    .addTask('backend-1', 'backend', {
      task: 'Create authentication endpoints',
    })
    .addMetadata('custom', true)
    .build();

  console.log('Custom workflow tasks:');
  customWorkflow.tasks.forEach((task, i) => {
    console.log(`  ${i + 1}. ${task.agent_id} (${task.agent_role}): ${task.input_data.task}`);
  });

  console.log('\nWorkflow ready to submit!');
  console.log('Call: swarm.submitWorkflow(customWorkflow)');
}

main().catch(console.error);
