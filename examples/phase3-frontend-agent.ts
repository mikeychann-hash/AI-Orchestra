/**
 * Phase 3 Example - FrontEndDevAgent
 *
 * Demonstrates using the FrontEndDevAgent to generate React/Tailwind components
 */

import {
  FrontEndDevAgent,
  FrontEndTools,
  ContextProviderFactory,
} from '../src/index.js';

async function main() {
  console.log('🎨 Phase 3: FrontEndDevAgent Example\n');

  // Create frontend development agent (uses Ollama qwen2.5:1.5b)
  const frontendAgent = new FrontEndDevAgent({
    name: 'React Component Generator',
  });

  // Add design system context
  frontendAgent.registerContextProvider(
    ContextProviderFactory.static(
      'Design System',
      `Design System Guidelines:
- Primary color: blue-600
- Secondary color: gray-700
- Border radius: rounded-lg
- Spacing: use 4px increments (space-4, space-8, etc)
- Typography: Use font-sans, font-semibold for headings
- Shadows: Use shadow-md for cards, shadow-lg for modals
- Transitions: Use transition-all duration-200`
    )
  );

  // Register specialized tools
  frontendAgent.registerTool(FrontEndTools.validateComponent());
  frontendAgent.registerTool(FrontEndTools.checkTailwindClasses());

  console.log('Agent configured ✓\n');

  // Example 1: Generate a Login Form Component
  console.log('📝 Example 1: Generating Login Form Component\n');

  try {
    const loginFormResult = await frontendAgent.run({
      feature: 'User login form with email and password fields',
      componentName: 'LoginForm',
      styling: 'tailwind',
      framework: 'react',
      typescript: true,
      accessibility: true,
      responsive: true,
      context: `
The form should include:
- Email input field with validation
- Password input field with show/hide toggle
- "Remember me" checkbox
- Submit button
- Error message display area
- Loading state during submission
`,
    });

    console.log('Component Generated ✓\n');
    console.log('Component Name:', loginFormResult.componentName);
    console.log('Dependencies:', loginFormResult.dependencies?.join(', ') || 'None');
    console.log('\nGenerated Code:');
    console.log('─'.repeat(60));
    console.log(loginFormResult.code);
    console.log('─'.repeat(60));

    if (loginFormResult.usage) {
      console.log('\nUsage Example:');
      console.log(loginFormResult.usage);
    }

    if (loginFormResult.notes) {
      console.log('\nNotes:');
      console.log(loginFormResult.notes);
    }

    if (loginFormResult.files && loginFormResult.files.length > 0) {
      console.log('\nAdditional Files:');
      loginFormResult.files.forEach((file) => {
        console.log(`  - ${file.path}`);
      });
    }
  } catch (error) {
    console.error('❌ Error generating component:', error);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Example 2: Generate a Dashboard Card Component
  console.log('📊 Example 2: Generating Dashboard Card Component\n');

  try {
    const cardResult = await frontendAgent.run({
      feature: 'Dashboard statistic card displaying a metric with trend indicator',
      componentName: 'StatCard',
      styling: 'tailwind',
      framework: 'react',
      typescript: true,
      accessibility: true,
      responsive: true,
      context: `
The card should display:
- Metric title (e.g., "Total Users")
- Large metric value (e.g., "12,345")
- Percentage change (e.g., "+12.5%")
- Trend indicator (up arrow for positive, down for negative)
- Optional icon
- Subtle animation on hover
`,
    });

    console.log('Component Generated ✓\n');
    console.log('Component Name:', cardResult.componentName);
    console.log('\nGenerated Code (preview):');
    console.log(cardResult.code.slice(0, 500) + '...\n');

    console.log('Success:', cardResult.success ? '✅' : '❌');
  } catch (error) {
    console.error('❌ Error generating component:', error);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Example 3: Generate a Navigation Component
  console.log('🧭 Example 3: Generating Navigation Component\n');

  try {
    const navResult = await frontendAgent.run({
      feature: 'Responsive navigation bar with mobile menu',
      componentName: 'Navbar',
      styling: 'tailwind',
      framework: 'react',
      typescript: true,
      accessibility: true,
      responsive: true,
      context: `
The navbar should include:
- Logo on the left
- Navigation links in the center
- User profile dropdown on the right
- Mobile hamburger menu (shows on small screens)
- Sticky positioning
- Smooth scroll behavior
`,
    });

    console.log('Component Generated ✓\n');
    console.log('Component Name:', navResult.componentName);
    console.log('Code Length:', navResult.code.length, 'characters');

    if (navResult.dependencies) {
      console.log('\nRequired Dependencies:');
      navResult.dependencies.forEach((dep) => {
        console.log(`  npm install ${dep}`);
      });
    }
  } catch (error) {
    console.error('❌ Error generating component:', error);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Show agent status
  console.log('Agent Status:', frontendAgent.getStatus());
  console.log('Total History Entries:', frontendAgent.getHistory().length);
}

main().catch(console.error);
