/**
 * Phase 3 Example - QAAgent
 *
 * Demonstrates using the QAAgent for comprehensive testing and code review
 */

import {
  QAAgent,
  QATools,
  ContextProviderFactory,
} from '../src/index.js';

async function main() {
  console.log('🔍 Phase 3: QAAgent Example\n');

  // Create QA agent (uses Ollama codellama:13b)
  const qaAgent = new QAAgent({
    name: 'Code Quality Inspector',
  });

  // Add quality standards context
  qaAgent.registerContextProvider(
    ContextProviderFactory.static(
      'Quality Standards',
      `Code Quality Standards:
- Test Coverage: Minimum 80% line coverage
- Code Complexity: Functions should have cyclomatic complexity < 10
- Security: No hardcoded secrets, SQL injection prevention, XSS protection
- Performance: No N+1 queries, efficient algorithms
- Type Safety: Strict TypeScript with no 'any' types
- Error Handling: All async operations wrapped in try-catch
- Documentation: All public APIs have JSDoc comments`
    )
  );

  // Register specialized tools
  qaAgent.registerTool(QATools.runLinter());
  qaAgent.registerTool(QATools.calculateComplexity());

  console.log('Agent configured ✓\n');

  // Example 1: Review a User Service
  console.log('📋 Example 1: Code Review - User Service\n');

  const userServiceCode = `
export class UserService {
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  async getUser(id: string) {
    const user = await this.db.query('SELECT * FROM users WHERE id = ' + id);
    return user;
  }

  async createUser(email, password, name) {
    const user = await this.db.query(
      \`INSERT INTO users (email, password, name) VALUES ('\${email}', '\${password}', '\${name}')\`
    );
    return user;
  }

  getUserById(id) {
    return this.db.query('SELECT * FROM users WHERE id = ?', [id]);
  }
}
`;

  try {
    const reviewResult = await qaAgent.run({
      testType: 'all',
      code: userServiceCode,
      framework: 'jest',
      coverage: true,
      strictMode: true,
      context: 'This is a user service for authentication',
    });

    console.log('QA Report Generated ✓\n');
    console.log('Overall Status:', reviewResult.overallStatus.toUpperCase());
    console.log('Quality Score:', `${reviewResult.score}/10`);
    console.log('\nSummary:', reviewResult.summary);

    if (reviewResult.issues.length > 0) {
      console.log(`\nIssues Found (${reviewResult.issues.length}):\n`);

      reviewResult.issues.forEach((issue, index) => {
        const emoji = {
          critical: '🔴',
          major: '🟠',
          minor: '🟡',
          suggestion: '💡',
        }[issue.severity];

        console.log(`${emoji} Issue ${index + 1}: [${issue.severity.toUpperCase()}] ${issue.category}`);
        console.log(`   Message: ${issue.message}`);

        if (issue.location) {
          console.log(`   Location: ${issue.location.file}${issue.location.line ? `:${issue.location.line}` : ''}`);
        }

        console.log(`   Fix: ${issue.recommendation}`);
        console.log('');
      });
    } else {
      console.log('\n✅ No issues found!');
    }

    if (reviewResult.testStats) {
      console.log('Test Statistics:');
      console.log(`  Total: ${reviewResult.testStats.total}`);
      console.log(`  Passed: ${reviewResult.testStats.passed}`);
      console.log(`  Failed: ${reviewResult.testStats.failed}`);
      console.log(`  Skipped: ${reviewResult.testStats.skipped}`);
    }

    if (reviewResult.coverage) {
      console.log('\nCoverage:');
      console.log(`  Lines: ${reviewResult.coverage.lines}%`);
      console.log(`  Branches: ${reviewResult.coverage.branches}%`);
      console.log(`  Functions: ${reviewResult.coverage.functions}%`);
      console.log(`  Statements: ${reviewResult.coverage.statements}%`);
    }

    if (reviewResult.testCode) {
      console.log('\nGenerated Test Code:');
      console.log('─'.repeat(60));
      console.log(reviewResult.testCode);
      console.log('─'.repeat(60));
    }
  } catch (error) {
    console.error('❌ Error during QA review:', error);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Example 2: Analyze Test Results
  console.log('📊 Example 2: Test Results Analysis\n');

  const testResults = `
Test Suites: 2 failed, 8 passed, 10 total
Tests:       5 failed, 45 passed, 50 total

FAIL  src/auth/auth.service.spec.ts
  ● AuthService › login
    Expected 401, received 500

FAIL  src/products/products.controller.spec.ts
  ● ProductsController › getProducts › should handle pagination
    TypeError: Cannot read property 'length' of undefined
`;

  try {
    const analysisResult = await qaAgent.run({
      testType: 'unit',
      testResults,
      framework: 'jest',
      strictMode: false,
      context: 'Analyzing failed test run from CI/CD pipeline',
    });

    console.log('Test Analysis Complete ✓\n');
    console.log('Overall Status:', analysisResult.overallStatus.toUpperCase());
    console.log('Score:', `${analysisResult.score}/10`);
    console.log('\nSummary:', analysisResult.summary);

    if (analysisResult.issues.length > 0) {
      console.log('\nIssues Identified:\n');

      analysisResult.issues.slice(0, 5).forEach((issue) => {
        console.log(`  - [${issue.severity}] ${issue.message}`);
        console.log(`    Category: ${issue.category}`);
        console.log(`    Fix: ${issue.recommendation}\n`);
      });
    }
  } catch (error) {
    console.error('❌ Error analyzing test results:', error);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Example 3: Security Scan
  console.log('🔒 Example 3: Security Scan\n');

  const securityCode = `
const apiKey = "sk-1234567890abcdef";

function processPayment(userId, amount) {
  const query = \`UPDATE accounts SET balance = balance - \${amount} WHERE user_id = \${userId}\`;
  db.execute(query);
}

app.post('/api/admin', (req, res) => {
  const { action } = req.body;
  eval(action);
  res.json({ success: true });
});
`;

  try {
    const securityResult = await qaAgent.run({
      testType: 'security',
      code: securityCode,
      strictMode: true,
      context: 'Security audit of payment processing code',
    });

    console.log('Security Scan Complete ✓\n');
    console.log('Status:', securityResult.overallStatus.toUpperCase());
    console.log('Score:', `${securityResult.score}/10`);

    const criticalIssues = securityResult.issues.filter(
      (i) => i.severity === 'critical'
    );

    if (criticalIssues.length > 0) {
      console.log(`\n⚠️  CRITICAL: ${criticalIssues.length} critical security issue(s) found!\n`);

      criticalIssues.forEach((issue) => {
        console.log(`  🔴 ${issue.message}`);
        console.log(`     ${issue.recommendation}\n`);
      });
    }
  } catch (error) {
    console.error('❌ Error during security scan:', error);
  }

  console.log('\n' + '='.repeat(60) + '\n');
  console.log('Agent Status:', qaAgent.getStatus());
}

main().catch(console.error);
