/**
 * Phase 3 Example - DebuggerAgent
 *
 * Demonstrates using the DebuggerAgent to identify and fix bugs
 */

import {
  DebuggerAgent,
  DebuggerTools,
  ContextProviderFactory,
} from '../src/index.js';

async function main() {
  console.log('🐛 Phase 3: DebuggerAgent Example\n');

  // Create debugger agent (uses Grok xAI)
  const debuggerAgent = new DebuggerAgent({
    name: 'Bug Hunter',
  });

  // Add debugging context
  debuggerAgent.registerContextProvider(
    ContextProviderFactory.static(
      'Debugging Guidelines',
      `Debugging Best Practices:
- Make minimal changes (principle of least surprise)
- Add defensive programming (null checks, validation)
- Include clear comments explaining the fix
- Preserve existing functionality
- Consider edge cases
- Add tests to prevent regression`
    )
  );

  // Register specialized tools
  debuggerAgent.registerTool(DebuggerTools.parseStackTrace());
  debuggerAgent.registerTool(DebuggerTools.analyzeError());

  console.log('Agent configured ✓\n');

  // Example 1: Fix Null Reference Error
  console.log('🔧 Example 1: Null Reference Error\n');

  const nullRefCode = `
function getUserProfile(userId) {
  const user = database.findUser(userId);
  console.log(user.profile.name);
  return user.profile;
}
`;

  const stackTrace1 = `
TypeError: Cannot read property 'name' of undefined
    at getUserProfile (user-service.ts:42:23)
    at processUser (handler.ts:15:10)
    at async Promise.all (index 0)
`;

  try {
    const bugFix1 = await debuggerAgent.run({
      errorMessage: "TypeError: Cannot read property 'name' of undefined",
      stackTrace: stackTrace1,
      code: nullRefCode,
      expectedBehavior: 'Function should safely handle missing user profiles',
      actualBehavior: 'Application crashes with TypeError',
      reproducible: true,
      context: 'Error occurs when user has no profile created yet',
    });

    console.log('Bug Analysis Complete ✓\n');
    console.log('Severity:', bugFix1.severity.toUpperCase());
    console.log('Category:', bugFix1.category);
    console.log('\nDiagnosis:');
    console.log(bugFix1.diagnosis);

    console.log(`\nProposed Fixes (${bugFix1.fixes.length}):\n`);

    bugFix1.fixes.forEach((fix, index) => {
      console.log(`Fix ${index + 1}: ${fix.description}`);
      console.log(`Impact: ${fix.impact === 'breaking' ? '⚠️  Breaking' : '✅ Non-breaking'}`);
      console.log(`Confidence: ${fix.confidence}%`);

      if (fix.location) {
        console.log(`Location: ${fix.location.file}:${fix.location.startLine}-${fix.location.endLine}`);
      }

      console.log('\nPatch:');
      console.log('─'.repeat(60));
      console.log(fix.patch);
      console.log('─'.repeat(60) + '\n');
    });

    if (bugFix1.preventionTips.length > 0) {
      console.log('Prevention Tips:');
      bugFix1.preventionTips.forEach((tip, i) => {
        console.log(`  ${i + 1}. ${tip}`);
      });
    }

    if (bugFix1.testRecommendations.length > 0) {
      console.log('\nTest Recommendations:');
      bugFix1.testRecommendations.forEach((test, i) => {
        console.log(`  ${i + 1}. ${test}`);
      });
    }
  } catch (error) {
    console.error('❌ Error analyzing bug:', error);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Example 2: Fix Async/Promise Error
  console.log('⏱️  Example 2: Async/Promise Error\n');

  const asyncCode = `
async function fetchUserData(userId) {
  const user = getUser(userId);
  const orders = getOrders(user.id);
  return { user, orders };
}

function getUser(id) {
  return fetch(\`/api/users/\${id}\`).then(r => r.json());
}

function getOrders(userId) {
  return fetch(\`/api/orders?user=\${userId}\`).then(r => r.json());
}
`;

  const stackTrace2 = `
TypeError: Cannot read property 'id' of undefined
    at fetchUserData (api-service.ts:28:35)
`;

  try {
    const bugFix2 = await debuggerAgent.run({
      errorMessage: "TypeError: Cannot read property 'id' of undefined",
      stackTrace: stackTrace2,
      code: asyncCode,
      expectedBehavior: 'Both user and orders data should be fetched',
      actualBehavior: 'orders is undefined, user.id is not available',
      reproducible: true,
      context: 'The getUser() promise is not being awaited',
    });

    console.log('Bug Analysis Complete ✓\n');
    console.log('Severity:', bugFix2.severity.toUpperCase());
    console.log('Diagnosis:', bugFix2.diagnosis);

    console.log('\nProposed Fix:');
    const mainFix = bugFix2.fixes[0];
    console.log(mainFix.description);
    console.log(`Confidence: ${mainFix.confidence}%\n`);
    console.log('Patch Preview:');
    console.log(mainFix.patch.slice(0, 400) + '...');
  } catch (error) {
    console.error('❌ Error analyzing bug:', error);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Example 3: Fix Logic Error from QA Report
  console.log('🧮 Example 3: Logic Error from QA Report\n');

  const qaReport = `
QA Report - Shopping Cart Bug

Issue: Discount calculation produces negative totals
Severity: Major
Category: Logic Error

Test Case:
- Cart total: $50
- Discount code: 20% off
- Expected result: $40
- Actual result: $-10

Code Location: checkout-service.ts:calculateTotal()
`;

  const checkoutCode = `
function calculateTotal(items, discountCode) {
  let total = items.reduce((sum, item) => sum + item.price, 0);

  if (discountCode) {
    const discount = total * 0.20; // 20% discount
    total = total - discount - total; // BUG: subtracting total twice
  }

  return total;
}
`;

  try {
    const bugFix3 = await debuggerAgent.run({
      qaReport,
      code: checkoutCode,
      expectedBehavior: 'Apply 20% discount correctly',
      actualBehavior: 'Results in negative total',
      reproducible: true,
    });

    console.log('Bug Analysis Complete ✓\n');
    console.log('Severity:', bugFix3.severity.toUpperCase());
    console.log('Category:', bugFix3.category);
    console.log('\nDiagnosis:', bugFix3.diagnosis);

    if (bugFix3.fixes.length > 0) {
      const fix = bugFix3.fixes[0];
      console.log('\nFix:', fix.description);
      console.log('\nCorrected Code:');
      console.log('─'.repeat(60));
      console.log(fix.patch);
      console.log('─'.repeat(60));
    }

    if (bugFix3.relatedIssues && bugFix3.relatedIssues.length > 0) {
      console.log('\nRelated Issues to Check:');
      bugFix3.relatedIssues.forEach((issue) => {
        console.log(`  - ${issue}`);
      });
    }
  } catch (error) {
    console.error('❌ Error analyzing bug:', error);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Example 4: Fix Test Failure
  console.log('🧪 Example 4: Failed Test Analysis\n');

  const testFailure = `
FAIL  src/utils/date-utils.spec.ts
  ● DateUtils › formatDate › should format date correctly

    expect(received).toBe(expected)

    Expected: "2024-01-15"
    Received: "2024-1-15"

      24 | it('should format date correctly', () => {
      25 |   const date = new Date('2024-01-15');
    > 26 |   expect(formatDate(date)).toBe('2024-01-15');
         |                            ^
      27 | });

    at Object.<anonymous> (src/utils/date-utils.spec.ts:26:28)
`;

  const dateUtilsCode = `
function formatDate(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return \`\${year}-\${month}-\${day}\`;
}
`;

  try {
    const bugFix4 = await debuggerAgent.run({
      testFailures: testFailure,
      code: dateUtilsCode,
      expectedBehavior: 'Date formatted as YYYY-MM-DD with zero-padding',
      actualBehavior: 'Month and day not zero-padded (e.g., 2024-1-15)',
      reproducible: true,
    });

    console.log('Test Failure Analysis Complete ✓\n');
    console.log('Diagnosis:', bugFix4.diagnosis);

    const fix = bugFix4.fixes[0];
    console.log('\nFix:', fix.description);
    console.log('Confidence:', fix.confidence + '%');
    console.log('\nPatch:');
    console.log('─'.repeat(60));
    console.log(fix.patch);
    console.log('─'.repeat(60));

    console.log('\nPrevention:');
    bugFix4.preventionTips.forEach((tip) => {
      console.log(`  - ${tip}`);
    });
  } catch (error) {
    console.error('❌ Error analyzing test failure:', error);
  }

  console.log('\n' + '='.repeat(60) + '\n');
  console.log('Agent Status:', debuggerAgent.getStatus());
  console.log('Total Bugs Analyzed:', 4);
}

main().catch(console.error);
