/**
 * Basic Usage Example - AI Orchestra Core SDK
 *
 * This example demonstrates:
 * 1. Creating a simple agent
 * 2. Adding context providers
 * 3. Registering tools
 * 4. Executing tasks
 */

import {
  CodeReviewAgent,
  ContextProviderFactory,
  CommonTools,
} from '../src/index.js';

async function main() {
  console.log('🎼 AI Orchestra - Basic Usage Example\n');

  // Create a Code Review Agent
  const reviewAgent = new CodeReviewAgent({
    name: 'Code Quality Reviewer',
  });

  // Add a context provider for additional guidelines
  reviewAgent.registerContextProvider(
    ContextProviderFactory.static(
      'Coding Standards',
      `Company Coding Standards:
- Use TypeScript strict mode
- Prefer functional programming patterns
- Include JSDoc comments for public APIs
- Maximum function length: 50 lines
- Use async/await over promises`
    )
  );

  // Add timestamp context
  reviewAgent.registerContextProvider(
    ContextProviderFactory.timestamp()
  );

  // Register file read tool (in case agent needs to read related files)
  reviewAgent.registerTool(CommonTools.fileRead());

  console.log('Agent created and configured ✓\n');

  // Example code to review
  const codeToReview = `
function processUser(user) {
  if (user) {
    console.log(user.name);
    var data = getUserData(user.id);
    return data;
  }
}

function getUserData(id) {
  return fetch('/api/users/' + id).then(r => r.json());
}
`;

  console.log('Reviewing code...\n');

  try {
    // Execute the review
    const result = await reviewAgent.run({
      code: codeToReview,
      language: 'javascript',
      context: 'This is user authentication code that runs on the backend',
    });

    // Display results
    console.log('📊 Review Results\n');
    console.log(`Quality Score: ${result.score}/10\n`);
    console.log(`Summary: ${result.summary}\n`);

    if (result.issues.length > 0) {
      console.log(`Found ${result.issues.length} issue(s):\n`);
      result.issues.forEach((issue, index) => {
        const emoji = {
          critical: '🔴',
          major: '🟠',
          minor: '🟡',
          suggestion: '💡',
        }[issue.severity];

        console.log(
          `${emoji} [${issue.severity.toUpperCase()}] ${issue.category}`
        );
        if (issue.line) {
          console.log(`   Line ${issue.line}`);
        }
        console.log(`   ${issue.message}\n`);
      });
    } else {
      console.log('✅ No issues found!\n');
    }

    // Show execution stats
    console.log('Agent Status:', reviewAgent.getStatus());
    console.log('Message History Length:', reviewAgent.getHistory().length);
  } catch (error) {
    console.error('❌ Review failed:', error);
    process.exit(1);
  }
}

// Run the example
main().catch(console.error);
