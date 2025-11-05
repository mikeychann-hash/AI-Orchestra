/**
 * Pipeline Controller - Orchestrates the full development pipeline
 *
 * Flow: Feature Spec → Frontend + Backend (parallel) → QA → Debug (if needed) → QA → Complete
 */

import {
  FeatureSpec,
  PipelineConfig,
  PipelineConfigSchema,
  PipelineStage,
  StageResult,
  PipelineRunResult,
} from '../types/pipeline.types.js';
import { FrontEndDevAgent, FrontEndOutput } from '../agents/FrontEndDevAgent.js';
import { BackEndDevAgent, BackEndOutput } from '../agents/BackEndDevAgent.js';
import { QAAgent, QAOutput } from '../agents/QAAgent.js';
import { DebuggerAgent, DebuggerOutput } from '../agents/DebuggerAgent.js';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Pipeline Controller
 *
 * Coordinates the execution of multiple agents in a structured pipeline
 */
export class PipelineController {
  private config: PipelineConfig;
  private runResult: PipelineRunResult;
  private frontendAgent: FrontEndDevAgent;
  private backendAgent: BackEndDevAgent;
  private qaAgent: QAAgent;
  private debuggerAgent: DebuggerAgent;

  constructor(config?: Partial<PipelineConfig>) {
    this.config = PipelineConfigSchema.parse(config || {});

    // Initialize agents
    this.frontendAgent = new FrontEndDevAgent({ name: 'Pipeline Frontend Agent' });
    this.backendAgent = new BackEndDevAgent({ name: 'Pipeline Backend Agent' });
    this.qaAgent = new QAAgent({ name: 'Pipeline QA Agent' });
    this.debuggerAgent = new DebuggerAgent({ name: 'Pipeline Debugger Agent' });

    // Initialize run result
    this.runResult = {
      runId: this.generateRunId(),
      featureId: '',
      startTime: Date.now(),
      status: 'running',
      stages: [],
      qaIterations: 0,
      debugIterations: 0,
      artifacts: [],
      summary: {
        frontendGenerated: false,
        backendGenerated: false,
        issuesFound: 0,
        issuesFixed: 0,
      },
      logs: [],
    };
  }

  /**
   * Run the full pipeline for a feature specification
   */
  async run(featureSpec: FeatureSpec): Promise<PipelineRunResult> {
    this.runResult.featureId = featureSpec.id;
    this.log('info', PipelineStage.INIT, `Starting pipeline for feature: ${featureSpec.name}`);

    try {
      // Stage 1: Generate Frontend + Backend concurrently
      await this.runDevelopmentStage(featureSpec);

      // Stage 2: QA Review with Debug Loop
      await this.runQADebugLoop(featureSpec);

      // Mark as completed
      this.runResult.status = 'completed';
      this.runResult.endTime = Date.now();
      this.runResult.totalDuration = this.runResult.endTime - this.runResult.startTime;

      this.log('info', PipelineStage.COMPLETED, `Pipeline completed successfully`);

      // Save artifacts if enabled
      if (this.config.saveArtifacts) {
        await this.saveArtifacts();
      }

      return this.runResult;
    } catch (error) {
      this.runResult.status = 'failed';
      this.runResult.endTime = Date.now();
      this.runResult.totalDuration = this.runResult.endTime - this.runResult.startTime;

      this.log('error', PipelineStage.FAILED, `Pipeline failed: ${error}`);

      return this.runResult;
    }
  }

  /**
   * Run development stage (Frontend + Backend)
   */
  private async runDevelopmentStage(featureSpec: FeatureSpec): Promise<void> {
    const tasks: Promise<StageResult>[] = [];

    // Frontend generation
    if (featureSpec.frontend?.enabled) {
      tasks.push(this.runFrontendStage(featureSpec));
    }

    // Backend generation
    if (featureSpec.backend?.enabled) {
      tasks.push(this.runBackendStage(featureSpec));
    }

    // Execute in parallel or sequential based on config
    if (this.config.parallelExecution && tasks.length > 1) {
      this.log('info', PipelineStage.INIT, 'Running Frontend and Backend agents in parallel');
      const results = await Promise.all(tasks);
      this.runResult.stages.push(...results);
    } else {
      for (const task of tasks) {
        const result = await task;
        this.runResult.stages.push(result);
      }
    }
  }

  /**
   * Run Frontend agent
   */
  private async runFrontendStage(featureSpec: FeatureSpec): Promise<StageResult> {
    const stageResult: StageResult = {
      stage: PipelineStage.FRONTEND,
      status: 'success',
      startTime: Date.now(),
      artifacts: [],
    };

    this.log('info', PipelineStage.FRONTEND, 'Starting Frontend generation');

    try {
      const frontend = featureSpec.frontend!;

      // Generate each component
      const components: FrontEndOutput[] = [];

      for (const component of frontend.components) {
        this.log('info', PipelineStage.FRONTEND, `Generating component: ${component.name}`);

        const result = await this.frontendAgent.run({
          feature: component.description,
          componentName: component.name,
          styling: frontend.styling || 'tailwind',
          framework: frontend.framework || 'react',
          typescript: true,
          accessibility: true,
          responsive: true,
          context: featureSpec.description,
        });

        components.push(result);

        // Add artifacts
        this.addArtifact('frontend', PipelineStage.FRONTEND, {
          type: 'component',
          path: `${result.componentName}.tsx`,
          content: result.code,
        });

        if (result.files) {
          result.files.forEach((file) => {
            this.addArtifact('frontend', PipelineStage.FRONTEND, {
              type: 'supporting-file',
              path: file.path,
              content: file.content,
            });
          });
        }
      }

      stageResult.output = components;
      stageResult.status = 'success';
      this.runResult.summary.frontendGenerated = true;

      this.log('info', PipelineStage.FRONTEND, `Generated ${components.length} component(s)`);
    } catch (error) {
      stageResult.status = 'failure';
      stageResult.error = String(error);
      this.log('error', PipelineStage.FRONTEND, `Frontend generation failed: ${error}`);
    }

    stageResult.endTime = Date.now();
    stageResult.duration = stageResult.endTime - stageResult.startTime;

    return stageResult;
  }

  /**
   * Run Backend agent
   */
  private async runBackendStage(featureSpec: FeatureSpec): Promise<StageResult> {
    const stageResult: StageResult = {
      stage: PipelineStage.BACKEND,
      status: 'success',
      startTime: Date.now(),
      artifacts: [],
    };

    this.log('info', PipelineStage.BACKEND, 'Starting Backend generation');

    try {
      const backend = featureSpec.backend!;

      // Generate each endpoint
      const endpoints: BackEndOutput[] = [];

      for (const endpoint of backend.endpoints) {
        this.log('info', PipelineStage.BACKEND, `Generating endpoint: ${endpoint.method} ${endpoint.route}`);

        const result = await this.backendAgent.run({
          feature: endpoint.description,
          method: endpoint.method,
          route: endpoint.route,
          framework: backend.framework || 'express',
          database: backend.database || 'postgresql',
          authentication: endpoint.authentication,
          validation: true,
          typescript: true,
          context: featureSpec.description,
        });

        endpoints.push(result);

        // Add artifacts
        this.addArtifact('backend', PipelineStage.BACKEND, {
          type: 'endpoint',
          path: `${endpoint.route.replace(/\//g, '-')}.route.ts`,
          content: result.code,
        });

        if (result.middleware) {
          this.addArtifact('backend', PipelineStage.BACKEND, {
            type: 'middleware',
            path: `${endpoint.route.replace(/\//g, '-')}.middleware.ts`,
            content: result.middleware,
          });
        }

        if (result.model) {
          this.addArtifact('backend', PipelineStage.BACKEND, {
            type: 'model',
            path: `${endpoint.route.replace(/\//g, '-')}.model.ts`,
            content: result.model,
          });
        }
      }

      stageResult.output = endpoints;
      stageResult.status = 'success';
      this.runResult.summary.backendGenerated = true;

      this.log('info', PipelineStage.BACKEND, `Generated ${endpoints.length} endpoint(s)`);
    } catch (error) {
      stageResult.status = 'failure';
      stageResult.error = String(error);
      this.log('error', PipelineStage.BACKEND, `Backend generation failed: ${error}`);
    }

    stageResult.endTime = Date.now();
    stageResult.duration = stageResult.endTime - stageResult.startTime;

    return stageResult;
  }

  /**
   * Run QA + Debug loop until passing or max iterations
   */
  private async runQADebugLoop(featureSpec: FeatureSpec): Promise<void> {
    const maxIterations = featureSpec.quality?.maxQAIterations || this.config.maxQAIterations;
    const minScore = featureSpec.quality?.minScore || 7;
    const autoFix = featureSpec.quality?.autoFix !== false;

    let iteration = 0;
    let qaResult: QAOutput | null = null;

    while (iteration < maxIterations) {
      iteration++;
      this.runResult.qaIterations = iteration;

      this.log('info', PipelineStage.QA, `QA Iteration ${iteration}/${maxIterations}`);

      // Run QA
      qaResult = await this.runQAStage(featureSpec);

      // Check if QA passed
      if (qaResult.overallStatus === 'pass' && qaResult.score >= minScore) {
        this.log('info', PipelineStage.QA, `QA passed with score ${qaResult.score}/10`);
        break;
      }

      // Log issues found
      this.log(
        'warn',
        PipelineStage.QA,
        `QA found ${qaResult.issues.length} issue(s), score: ${qaResult.score}/10`
      );
      this.runResult.summary.issuesFound += qaResult.issues.length;

      // If not autoFix or last iteration, stop
      if (!autoFix || iteration >= maxIterations) {
        if (iteration >= maxIterations) {
          this.log('warn', PipelineStage.QA, 'Max QA iterations reached');
        }
        break;
      }

      // Run debugger to fix issues
      await this.runDebugStage(qaResult);
    }

    // Store final QA score
    if (qaResult) {
      this.runResult.finalScore = qaResult.score;
      this.runResult.summary.qaScore = qaResult.score;
    }
  }

  /**
   * Run QA stage
   */
  private async runQAStage(featureSpec: FeatureSpec): Promise<QAOutput> {
    const stageResult: StageResult = {
      stage: PipelineStage.QA,
      status: 'success',
      startTime: Date.now(),
    };

    this.log('info', PipelineStage.QA, 'Running QA analysis');

    try {
      // Aggregate all generated code for review
      const allCode = this.aggregateGeneratedCode();

      const result = await this.qaAgent.run({
        testType: 'all',
        code: allCode,
        framework: 'jest',
        coverage: featureSpec.testing?.coverage !== undefined,
        strictMode: featureSpec.testing?.strictMode || false,
        context: `Feature: ${featureSpec.name}\n${featureSpec.description}`,
      });

      stageResult.output = result;
      stageResult.status = result.overallStatus === 'pass' ? 'success' : 'warning';

      // Add QA report artifact
      this.addArtifact('qa-report', PipelineStage.QA, {
        type: 'qa-report',
        path: `qa-report-${this.runResult.qaIterations}.json`,
        content: JSON.stringify(result, null, 2),
      });

      this.runResult.stages.push(stageResult);

      return result;
    } catch (error) {
      stageResult.status = 'failure';
      stageResult.error = String(error);
      this.log('error', PipelineStage.QA, `QA analysis failed: ${error}`);
      throw error;
    } finally {
      stageResult.endTime = Date.now();
      stageResult.duration = stageResult.endTime - stageResult.startTime;
    }
  }

  /**
   * Run Debug stage
   */
  private async runDebugStage(qaResult: QAOutput): Promise<void> {
    const stageResult: StageResult = {
      stage: PipelineStage.DEBUG,
      status: 'success',
      startTime: Date.now(),
      artifacts: [],
    };

    this.runResult.debugIterations++;
    this.log('info', PipelineStage.DEBUG, `Debug iteration ${this.runResult.debugIterations}`);

    try {
      // Get critical and major issues
      const criticalIssues = qaResult.issues.filter(
        (i) => i.severity === 'critical' || i.severity === 'major'
      );

      if (criticalIssues.length === 0) {
        this.log('info', PipelineStage.DEBUG, 'No critical issues to fix');
        return;
      }

      this.log('info', PipelineStage.DEBUG, `Fixing ${criticalIssues.length} issue(s)`);

      // Generate QA report summary for debugger
      const qaReportSummary = `QA Report Summary:
Overall Status: ${qaResult.overallStatus}
Score: ${qaResult.score}/10
Issues Found: ${qaResult.issues.length}

Critical Issues:
${criticalIssues.map((i) => `- [${i.severity}] ${i.category}: ${i.message}`).join('\n')}

Recommendations:
${criticalIssues.map((i) => `- ${i.recommendation}`).join('\n')}`;

      // Run debugger
      const allCode = this.aggregateGeneratedCode();

      const debugResult = await this.debuggerAgent.run({
        qaReport: qaReportSummary,
        code: allCode,
        expectedBehavior: 'Code should pass QA checks',
        actualBehavior: `QA score: ${qaResult.score}/10 with ${criticalIssues.length} critical issues`,
        reproducible: true,
        context: qaReportSummary,
      });

      stageResult.output = debugResult;
      this.runResult.summary.issuesFixed += debugResult.fixes.length;

      // Add fix artifacts
      debugResult.fixes.forEach((fix, index) => {
        this.addArtifact('fix', PipelineStage.DEBUG, {
          type: 'fix-patch',
          path: `fix-${this.runResult.debugIterations}-${index + 1}.patch`,
          content: fix.patch,
        });
      });

      this.log('info', PipelineStage.DEBUG, `Applied ${debugResult.fixes.length} fix(es)`);
    } catch (error) {
      stageResult.status = 'failure';
      stageResult.error = String(error);
      this.log('error', PipelineStage.DEBUG, `Debug failed: ${error}`);
    } finally {
      stageResult.endTime = Date.now();
      stageResult.duration = stageResult.endTime - stageResult.startTime;
      this.runResult.stages.push(stageResult);
    }
  }

  /**
   * Aggregate all generated code for review
   */
  private aggregateGeneratedCode(): string {
    const parts: string[] = [];

    this.runResult.artifacts.forEach((artifact) => {
      if (artifact.content && artifact.type !== 'qa-report') {
        parts.push(`// ${artifact.stage}/${artifact.path}`);
        parts.push(artifact.content);
        parts.push('');
      }
    });

    return parts.join('\n');
  }

  /**
   * Add artifact to results
   */
  private addArtifact(
    type: string,
    stage: PipelineStage,
    artifact: { type: string; path?: string; content?: string }
  ): void {
    this.runResult.artifacts.push({
      type,
      stage: stage.toString(),
      path: artifact.path,
      content: artifact.content,
    });
  }

  /**
   * Log message
   */
  private log(
    level: 'info' | 'warn' | 'error',
    stage: PipelineStage,
    message: string
  ): void {
    this.runResult.logs.push({
      timestamp: Date.now(),
      level,
      stage,
      message,
    });

    if (this.config.verbose) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [${level.toUpperCase()}] [${stage}] ${message}`);
    }
  }

  /**
   * Save artifacts to disk
   */
  private async saveArtifacts(): Promise<void> {
    const basePath = path.join(this.config.artifactsPath, this.runResult.runId);

    try {
      await fs.mkdir(basePath, { recursive: true });

      // Save each artifact
      for (const artifact of this.runResult.artifacts) {
        if (artifact.content && artifact.path) {
          const artifactPath = path.join(basePath, artifact.stage, artifact.path);
          await fs.mkdir(path.dirname(artifactPath), { recursive: true });
          await fs.writeFile(artifactPath, artifact.content, 'utf-8');
        }
      }

      // Save run summary
      const summaryPath = path.join(basePath, 'pipeline-result.json');
      await fs.writeFile(summaryPath, JSON.stringify(this.runResult, null, 2), 'utf-8');

      this.log('info', PipelineStage.COMPLETED, `Artifacts saved to ${basePath}`);
    } catch (error) {
      this.log('error', PipelineStage.COMPLETED, `Failed to save artifacts: ${error}`);
    }
  }

  /**
   * Generate unique run ID
   */
  private generateRunId(): string {
    return `run-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Get current run result
   */
  public getResult(): PipelineRunResult {
    return { ...this.runResult };
  }
}
