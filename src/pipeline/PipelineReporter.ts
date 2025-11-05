/**
 * Pipeline Reporter
 *
 * Generates formatted reports from pipeline run results
 */

import { PipelineRunResult, PipelineStage } from '../types/pipeline.types.js';

/**
 * Pipeline Reporter
 */
export class PipelineReporter {
  /**
   * Generate console report
   */
  static generateConsoleReport(result: PipelineRunResult): string {
    const lines: string[] = [];
    const width = 80;

    // Header
    lines.push('='.repeat(width));
    lines.push(`  AI Orchestra - Pipeline Run Report`.padEnd(width));
    lines.push('='.repeat(width));
    lines.push('');

    // Basic Info
    lines.push(`Run ID: ${result.runId}`);
    lines.push(`Feature ID: ${result.featureId}`);
    lines.push(`Status: ${this.formatStatus(result.status)}`);
    lines.push(`Duration: ${this.formatDuration(result.totalDuration)}`);
    lines.push('');

    // Summary
    lines.push('─'.repeat(width));
    lines.push('Summary');
    lines.push('─'.repeat(width));
    lines.push(`  Frontend Generated: ${result.summary.frontendGenerated ? '✓' : '✗'}`);
    lines.push(`  Backend Generated:  ${result.summary.backendGenerated ? '✓' : '✗'}`);
    lines.push(`  QA Score:           ${result.summary.qaScore ?? 'N/A'}/10`);
    lines.push(`  Issues Found:       ${result.summary.issuesFound}`);
    lines.push(`  Issues Fixed:       ${result.summary.issuesFixed}`);
    lines.push(`  QA Iterations:      ${result.qaIterations}`);
    lines.push(`  Debug Iterations:   ${result.debugIterations}`);
    lines.push('');

    // Stages
    lines.push('─'.repeat(width));
    lines.push('Pipeline Stages');
    lines.push('─'.repeat(width));

    result.stages.forEach((stage, index) => {
      const icon = this.getStageIcon(stage.status);
      const duration = stage.duration ? ` (${this.formatDuration(stage.duration)})` : '';

      lines.push(
        `  ${index + 1}. ${icon} ${stage.stage.toUpperCase()}${duration} - ${stage.status}`
      );

      if (stage.error) {
        lines.push(`     Error: ${stage.error}`);
      }
    });
    lines.push('');

    // Artifacts
    if (result.artifacts.length > 0) {
      lines.push('─'.repeat(width));
      lines.push(`Artifacts (${result.artifacts.length})`);
      lines.push('─'.repeat(width));

      const artifactsByStage = this.groupBy(result.artifacts, 'stage');

      Object.entries(artifactsByStage).forEach(([stage, artifacts]) => {
        lines.push(`  ${stage}:`);
        artifacts.forEach((artifact) => {
          lines.push(`    - ${artifact.type}: ${artifact.path || 'inline'}`);
        });
      });
      lines.push('');
    }

    // Logs (recent errors/warnings)
    const importantLogs = result.logs.filter((l) => l.level === 'error' || l.level === 'warn');
    if (importantLogs.length > 0) {
      lines.push('─'.repeat(width));
      lines.push(`Important Logs`);
      lines.push('─'.repeat(width));

      importantLogs.slice(-10).forEach((log) => {
        const time = new Date(log.timestamp).toLocaleTimeString();
        const icon = log.level === 'error' ? '❌' : '⚠️';
        lines.push(`  ${icon} [${time}] [${log.stage}] ${log.message}`);
      });
      lines.push('');
    }

    // Footer
    lines.push('='.repeat(width));

    return lines.join('\n');
  }

  /**
   * Generate JSON report
   */
  static generateJSONReport(result: PipelineRunResult): string {
    return JSON.stringify(result, null, 2);
  }

  /**
   * Generate markdown report
   */
  static generateMarkdownReport(result: PipelineRunResult): string {
    const lines: string[] = [];

    // Header
    lines.push(`# Pipeline Run Report`);
    lines.push('');
    lines.push(`**Run ID:** ${result.runId}`);
    lines.push(`**Feature ID:** ${result.featureId}`);
    lines.push(`**Status:** ${this.formatStatus(result.status)}`);
    lines.push(`**Duration:** ${this.formatDuration(result.totalDuration)}`);
    lines.push('');

    // Summary
    lines.push(`## Summary`);
    lines.push('');
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Frontend Generated | ${result.summary.frontendGenerated ? '✓' : '✗'} |`);
    lines.push(`| Backend Generated | ${result.summary.backendGenerated ? '✓' : '✗'} |`);
    lines.push(`| QA Score | ${result.summary.qaScore ?? 'N/A'}/10 |`);
    lines.push(`| Issues Found | ${result.summary.issuesFound} |`);
    lines.push(`| Issues Fixed | ${result.summary.issuesFixed} |`);
    lines.push(`| QA Iterations | ${result.qaIterations} |`);
    lines.push(`| Debug Iterations | ${result.debugIterations} |`);
    lines.push('');

    // Stages
    lines.push(`## Pipeline Stages`);
    lines.push('');

    result.stages.forEach((stage, index) => {
      const icon = this.getStageIcon(stage.status);
      const duration = stage.duration ? ` (${this.formatDuration(stage.duration)})` : '';

      lines.push(`### ${index + 1}. ${icon} ${stage.stage.toUpperCase()}${duration}`);
      lines.push('');
      lines.push(`**Status:** ${stage.status}`);

      if (stage.error) {
        lines.push('');
        lines.push(`**Error:**`);
        lines.push('```');
        lines.push(stage.error);
        lines.push('```');
      }

      lines.push('');
    });

    // Artifacts
    if (result.artifacts.length > 0) {
      lines.push(`## Artifacts (${result.artifacts.length})`);
      lines.push('');

      const artifactsByStage = this.groupBy(result.artifacts, 'stage');

      Object.entries(artifactsByStage).forEach(([stage, artifacts]) => {
        lines.push(`### ${stage}`);
        lines.push('');
        artifacts.forEach((artifact) => {
          lines.push(`- **${artifact.type}**: ${artifact.path || 'inline'}`);
        });
        lines.push('');
      });
    }

    return lines.join('\n');
  }

  /**
   * Generate HTML report
   */
  static generateHTMLReport(result: PipelineRunResult): string {
    const statusColor = {
      running: '#ffa500',
      completed: '#4caf50',
      failed: '#f44336',
    }[result.status];

    return `<!DOCTYPE html>
<html>
<head>
  <title>Pipeline Run Report - ${result.runId}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { color: #333; border-bottom: 3px solid ${statusColor}; padding-bottom: 10px; }
    h2 { color: #555; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-top: 30px; }
    .info { display: grid; grid-template-columns: 200px 1fr; gap: 10px; margin: 20px 0; }
    .info-label { font-weight: bold; color: #666; }
    .status { padding: 5px 10px; border-radius: 4px; display: inline-block; color: white; background: ${statusColor}; }
    .stage { background: #f9f9f9; padding: 15px; margin: 10px 0; border-left: 4px solid #2196f3; border-radius: 4px; }
    .stage.success { border-left-color: #4caf50; }
    .stage.failure { border-left-color: #f44336; }
    .stage.warning { border-left-color: #ff9800; }
    .artifact { background: #e3f2fd; padding: 10px; margin: 5px 0; border-radius: 4px; font-family: monospace; }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
    .summary-card { background: #f5f5f5; padding: 15px; border-radius: 4px; text-align: center; }
    .summary-value { font-size: 24px; font-weight: bold; color: #2196f3; }
    .summary-label { color: #666; margin-top: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎼 Pipeline Run Report</h1>

    <div class="info">
      <div class="info-label">Run ID:</div>
      <div>${result.runId}</div>
      <div class="info-label">Feature ID:</div>
      <div>${result.featureId}</div>
      <div class="info-label">Status:</div>
      <div><span class="status">${result.status.toUpperCase()}</span></div>
      <div class="info-label">Duration:</div>
      <div>${this.formatDuration(result.totalDuration)}</div>
    </div>

    <h2>Summary</h2>
    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-value">${result.summary.frontendGenerated ? '✓' : '✗'}</div>
        <div class="summary-label">Frontend</div>
      </div>
      <div class="summary-card">
        <div class="summary-value">${result.summary.backendGenerated ? '✓' : '✗'}</div>
        <div class="summary-label">Backend</div>
      </div>
      <div class="summary-card">
        <div class="summary-value">${result.summary.qaScore ?? 'N/A'}/10</div>
        <div class="summary-label">QA Score</div>
      </div>
      <div class="summary-card">
        <div class="summary-value">${result.summary.issuesFound}</div>
        <div class="summary-label">Issues Found</div>
      </div>
      <div class="summary-card">
        <div class="summary-value">${result.summary.issuesFixed}</div>
        <div class="summary-label">Issues Fixed</div>
      </div>
      <div class="summary-card">
        <div class="summary-value">${result.qaIterations}</div>
        <div class="summary-label">QA Iterations</div>
      </div>
    </div>

    <h2>Pipeline Stages</h2>
    ${result.stages
      .map(
        (stage, index) => `
      <div class="stage ${stage.status}">
        <strong>${index + 1}. ${stage.stage.toUpperCase()}</strong>
        <span style="float: right;">${stage.duration ? this.formatDuration(stage.duration) : ''}</span>
        <div style="margin-top: 10px;">Status: ${stage.status}</div>
        ${stage.error ? `<div style="color: #f44336; margin-top: 10px;">Error: ${stage.error}</div>` : ''}
      </div>
    `
      )
      .join('')}

    ${
      result.artifacts.length > 0
        ? `
    <h2>Artifacts (${result.artifacts.length})</h2>
    ${result.artifacts
      .map(
        (artifact) => `
      <div class="artifact">
        <strong>${artifact.stage}</strong> / ${artifact.type}: ${artifact.path || 'inline'}
      </div>
    `
      )
      .join('')}
    `
        : ''
    }
  </div>
</body>
</html>`;
  }

  /**
   * Format status with emoji
   */
  private static formatStatus(status: string): string {
    const icons = {
      running: '🔄',
      completed: '✅',
      failed: '❌',
    };
    return `${icons[status as keyof typeof icons] || ''} ${status.toUpperCase()}`;
  }

  /**
   * Format duration
   */
  private static formatDuration(ms: number | undefined): string {
    if (ms === undefined) return 'N/A';

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);

    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }

  /**
   * Get stage icon
   */
  private static getStageIcon(status: string): string {
    const icons = {
      success: '✅',
      failure: '❌',
      warning: '⚠️',
    };
    return icons[status as keyof typeof icons] || '⏺️';
  }

  /**
   * Group array by key
   */
  private static groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((result, item) => {
      const groupKey = String(item[key]);
      if (!result[groupKey]) {
        result[groupKey] = [];
      }
      result[groupKey].push(item);
      return result;
    }, {} as Record<string, T[]>);
  }
}
