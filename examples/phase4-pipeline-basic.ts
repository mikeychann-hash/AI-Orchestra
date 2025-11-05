/**
 * Phase 4 Example - Basic Pipeline
 *
 * Demonstrates the full end-to-end pipeline with a simple feature
 */

import {
  PipelineController,
  FeatureSpecLoader,
  PipelineReporter,
} from '../src/index.js';

async function main() {
  console.log('🎼 Phase 4: Basic Pipeline Example\n');

  // Create a simple feature spec programmatically
  const featureSpec = FeatureSpecLoader.createSimple(
    'User Profile',
    'Display user profile information with edit capability',
    {
      frontend: true,
      backend: true,
      components: [
        {
          name: 'UserProfile',
          description: 'User profile card showing name, email, and avatar',
        },
        {
          name: 'EditProfileForm',
          description: 'Form to edit user name and email',
        },
      ],
      endpoints: [
        {
          method: 'GET',
          route: '/api/users/profile',
          description: 'Get current user profile data',
        },
        {
          method: 'PUT',
          route: '/api/users/profile',
          description: 'Update user profile information',
        },
      ],
    }
  );

  console.log('📋 Feature Specification Created:');
  console.log(`  Name: ${featureSpec.name}`);
  console.log(`  ID: ${featureSpec.id}`);
  console.log(`  Components: ${featureSpec.frontend?.components.length || 0}`);
  console.log(`  Endpoints: ${featureSpec.backend?.endpoints.length || 0}`);
  console.log('\n' + '='.repeat(80) + '\n');

  // Create pipeline controller
  const pipeline = new PipelineController({
    maxQAIterations: 2,
    parallelExecution: true,
    saveArtifacts: true,
    verbose: true,
    artifactsPath: './pipeline-artifacts',
  });

  console.log('🚀 Starting Pipeline...\n');

  try {
    // Run the pipeline
    const result = await pipeline.run(featureSpec);

    console.log('\n' + '='.repeat(80) + '\n');
    console.log('📊 Pipeline Complete!\n');

    // Generate and display console report
    const consoleReport = PipelineReporter.generateConsoleReport(result);
    console.log(consoleReport);

    // Generate additional reports
    console.log('\n' + '='.repeat(80));
    console.log('📄 Generating Additional Reports...\n');

    // Save markdown report
    const markdownReport = PipelineReporter.generateMarkdownReport(result);
    const fs = await import('fs/promises');
    await fs.mkdir('./pipeline-reports', { recursive: true });
    await fs.writeFile(
      `./pipeline-reports/report-${result.runId}.md`,
      markdownReport,
      'utf-8'
    );
    console.log('✓ Markdown report saved to ./pipeline-reports/');

    // Save HTML report
    const htmlReport = PipelineReporter.generateHTMLReport(result);
    await fs.writeFile(
      `./pipeline-reports/report-${result.runId}.html`,
      htmlReport,
      'utf-8'
    );
    console.log('✓ HTML report saved to ./pipeline-reports/');

    // Save JSON report
    const jsonReport = PipelineReporter.generateJSONReport(result);
    await fs.writeFile(
      `./pipeline-reports/report-${result.runId}.json`,
      jsonReport,
      'utf-8'
    );
    console.log('✓ JSON report saved to ./pipeline-reports/');

    // Show final summary
    console.log('\n' + '='.repeat(80));
    console.log('Summary:');
    console.log(`  Status: ${result.status}`);
    console.log(`  Duration: ${Math.round((result.totalDuration || 0) / 1000)}s`);
    console.log(`  QA Score: ${result.finalScore || 'N/A'}/10`);
    console.log(`  Artifacts: ${result.artifacts.length}`);
    console.log(`  QA Iterations: ${result.qaIterations}`);
    console.log(`  Debug Iterations: ${result.debugIterations}`);
  } catch (error) {
    console.error('\n❌ Pipeline Failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);
