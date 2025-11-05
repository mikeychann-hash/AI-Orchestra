/**
 * Phase 4 Example - Full-Stack Pipeline
 *
 * Demonstrates running a complete full-stack feature from a JSON spec file
 */

import {
  PipelineController,
  FeatureSpecLoader,
  PipelineReporter,
  FeatureSpec,
} from '../src/index.js';
import * as path from 'path';

async function main() {
  console.log('🎼 Phase 4: Full-Stack Pipeline Example\n');
  console.log('This example demonstrates the complete FE → BE → QA → Debug → QA pipeline\n');

  // Load feature spec from file
  const specPath = path.join(process.cwd(), 'feature-specs', 'user-authentication.json');

  console.log(`📁 Loading feature spec from: ${specPath}\n`);

  let featureSpec: FeatureSpec;

  try {
    featureSpec = await FeatureSpecLoader.fromFile(specPath);
  } catch (error) {
    console.error(`❌ Failed to load feature spec: ${error}`);
    console.log('\n💡 Make sure you have the feature-specs directory with user-authentication.json');
    process.exit(1);
  }

  // Display feature info
  console.log('📋 Feature Specification Loaded:');
  console.log('─'.repeat(80));
  console.log(`  Name: ${featureSpec.name}`);
  console.log(`  Description: ${featureSpec.description}`);
  console.log(`  Type: ${featureSpec.type}`);
  console.log(`  Priority: ${featureSpec.metadata?.priority || 'N/A'}`);
  console.log('');
  console.log('  Frontend:');
  console.log(`    - Components: ${featureSpec.frontend?.components.length || 0}`);
  featureSpec.frontend?.components.forEach((c) => {
    console.log(`      • ${c.name}: ${c.description}`);
  });
  console.log('');
  console.log('  Backend:');
  console.log(`    - Endpoints: ${featureSpec.backend?.endpoints.length || 0}`);
  featureSpec.backend?.endpoints.forEach((e) => {
    console.log(`      • ${e.method} ${e.route}: ${e.description}`);
  });
  console.log('');
  console.log('  Quality Settings:');
  console.log(`    - Max QA Iterations: ${featureSpec.quality?.maxQAIterations || 3}`);
  console.log(`    - Min Score: ${featureSpec.quality?.minScore || 7}/10`);
  console.log(`    - Auto Fix: ${featureSpec.quality?.autoFix ? 'Yes' : 'No'}`);
  console.log('─'.repeat(80));
  console.log('');

  // Create pipeline with configuration
  const pipeline = new PipelineController({
    maxQAIterations: featureSpec.quality?.maxQAIterations || 3,
    maxDebugIterations: 2,
    continueOnWarnings: true,
    parallelExecution: true,
    saveArtifacts: true,
    verbose: true,
    artifactsPath: './pipeline-artifacts',
  });

  console.log('🚀 Starting Pipeline Execution...\n');
  console.log('Pipeline Flow:');
  console.log('  1️⃣  Frontend Generation (parallel with Backend)');
  console.log('  2️⃣  Backend Generation (parallel with Frontend)');
  console.log('  3️⃣  QA Review of all generated code');
  console.log('  4️⃣  Debug fixes (if QA finds issues)');
  console.log('  5️⃣  Re-run QA (until passing or max iterations)');
  console.log('  6️⃣  Generate artifacts and reports');
  console.log('');
  console.log('='.repeat(80));
  console.log('');

  const startTime = Date.now();

  try {
    // Run the pipeline
    const result = await pipeline.run(featureSpec);

    const totalTime = Date.now() - startTime;

    console.log('\n' + '='.repeat(80));
    console.log('');
    console.log('✅ Pipeline Execution Complete!');
    console.log('');

    // Display detailed console report
    const consoleReport = PipelineReporter.generateConsoleReport(result);
    console.log(consoleReport);

    // Show stage-by-stage breakdown
    console.log('\n' + '='.repeat(80));
    console.log('Stage-by-Stage Breakdown:');
    console.log('='.repeat(80));
    console.log('');

    result.stages.forEach((stage, index) => {
      const icon = {
        success: '✅',
        failure: '❌',
        warning: '⚠️',
      }[stage.status] || '⏺️';

      console.log(`${index + 1}. ${icon} ${stage.stage.toUpperCase()}`);
      console.log(`   Status: ${stage.status}`);
      console.log(`   Duration: ${Math.round((stage.duration || 0) / 1000)}s`);

      if (stage.error) {
        console.log(`   Error: ${stage.error}`);
      }

      if (stage.output && stage.stage === 'qa') {
        const qa = stage.output;
        console.log(`   QA Score: ${qa.score}/10`);
        console.log(`   Issues Found: ${qa.issues?.length || 0}`);
      }

      console.log('');
    });

    // Generate reports
    console.log('='.repeat(80));
    console.log('📊 Generating Reports...');
    console.log('='.repeat(80));
    console.log('');

    const fs = await import('fs/promises');
    await fs.mkdir('./pipeline-reports', { recursive: true });

    // Markdown
    const markdownReport = PipelineReporter.generateMarkdownReport(result);
    await fs.writeFile(
      `./pipeline-reports/${featureSpec.id}-${result.runId}.md`,
      markdownReport,
      'utf-8'
    );
    console.log(`✓ Markdown: ./pipeline-reports/${featureSpec.id}-${result.runId}.md`);

    // HTML
    const htmlReport = PipelineReporter.generateHTMLReport(result);
    await fs.writeFile(
      `./pipeline-reports/${featureSpec.id}-${result.runId}.html`,
      htmlReport,
      'utf-8'
    );
    console.log(`✓ HTML: ./pipeline-reports/${featureSpec.id}-${result.runId}.html`);

    // JSON
    const jsonReport = PipelineReporter.generateJSONReport(result);
    await fs.writeFile(
      `./pipeline-reports/${featureSpec.id}-${result.runId}.json`,
      jsonReport,
      'utf-8'
    );
    console.log(`✓ JSON: ./pipeline-reports/${featureSpec.id}-${result.runId}.json`);

    console.log('');

    // Final summary
    console.log('='.repeat(80));
    console.log('🎉 Pipeline Summary');
    console.log('='.repeat(80));
    console.log('');
    console.log(`  Feature: ${featureSpec.name}`);
    console.log(`  Status: ${result.status.toUpperCase()}`);
    console.log(`  Total Duration: ${Math.round(totalTime / 1000)}s`);
    console.log('');
    console.log('  Generation:');
    console.log(`    Frontend: ${result.summary.frontendGenerated ? '✅ Generated' : '❌ Failed'}`);
    console.log(`    Backend: ${result.summary.backendGenerated ? '✅ Generated' : '❌ Failed'}`);
    console.log('');
    console.log('  Quality Assurance:');
    console.log(`    Final Score: ${result.finalScore || 'N/A'}/10`);
    console.log(`    Issues Found: ${result.summary.issuesFound}`);
    console.log(`    Issues Fixed: ${result.summary.issuesFixed}`);
    console.log(`    QA Iterations: ${result.qaIterations}`);
    console.log(`    Debug Iterations: ${result.debugIterations}`);
    console.log('');
    console.log('  Artifacts:');
    console.log(`    Total: ${result.artifacts.length}`);
    console.log(`    Location: ./pipeline-artifacts/${result.runId}/`);
    console.log('');
    console.log('='.repeat(80));

    if (result.status === 'completed') {
      console.log('\n✨ Feature implementation ready for review!');
    } else {
      console.log('\n⚠️  Pipeline completed with warnings - manual review recommended');
    }
  } catch (error) {
    console.error('\n❌ Pipeline Failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);
