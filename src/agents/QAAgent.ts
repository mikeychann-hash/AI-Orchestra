import { z } from 'zod';
import { BaseAgent } from '../core/BaseAgent.js';
import { AgentConfig, AgentRole, LLMProvider } from '../types/agent.types.js';
import { LLMClientFactory } from '../core/LLMClient.js';
import { ConfigManager } from '../core/Config.js';

/**
 * QA Input Schema
 */
const QAInputSchema = z.object({
  testType: z
    .enum(['unit', 'integration', 'e2e', 'lint', 'security', 'all'])
    .default('all')
    .describe('Type of testing to perform'),
  code: z.string().optional().describe('Code to review/test'),
  files: z
    .array(z.string())
    .optional()
    .describe('File paths to test'),
  testResults: z.string().optional().describe('Existing test results to analyze'),
  framework: z
    .enum(['jest', 'vitest', 'mocha', 'playwright', 'cypress'])
    .default('jest')
    .describe('Testing framework'),
  coverage: z.boolean().default(true).describe('Include coverage analysis'),
  strictMode: z.boolean().default(false).describe('Enable strict checking'),
  context: z.string().optional().describe('Additional context'),
});

/**
 * QA Output Schema
 */
const QAOutputSchema = z.object({
  success: z.boolean(),
  overallStatus: z
    .enum(['pass', 'fail', 'warning'])
    .describe('Overall test status'),
  summary: z.string().describe('Summary of findings'),
  issues: z.array(
    z.object({
      severity: z.enum(['critical', 'major', 'minor', 'suggestion']),
      category: z.string().describe('Issue category'),
      message: z.string().describe('Issue description'),
      location: z
        .object({
          file: z.string().optional(),
          line: z.number().optional(),
        })
        .optional(),
      recommendation: z.string().describe('How to fix'),
    })
  ),
  testStats: z
    .object({
      total: z.number(),
      passed: z.number(),
      failed: z.number(),
      skipped: z.number(),
    })
    .optional(),
  coverage: z
    .object({
      lines: z.number(),
      branches: z.number(),
      functions: z.number(),
      statements: z.number(),
    })
    .optional(),
  testCode: z.string().optional().describe('Generated test code'),
  score: z.number().min(0).max(10).describe('Quality score (0-10)'),
});

export type QAInput = z.infer<typeof QAInputSchema>;
export type QAOutput = z.infer<typeof QAOutputSchema>;

/**
 * QAAgent - Testing and quality assurance agent
 *
 * Specialized agent for QA using Ollama codellama:13b
 *
 * Capabilities:
 * - Run and analyze unit/integration/e2e tests
 * - Execute linting and code style checks
 * - Security vulnerability scanning
 * - Generate test cases
 * - Analyze test coverage
 * - Provide actionable feedback
 */
export class QAAgent extends BaseAgent<
  typeof QAInputSchema,
  typeof QAOutputSchema
> {
  constructor(config?: Partial<AgentConfig>) {
    const configManager = ConfigManager.getInstance();
    const defaults = configManager.getAgentDefaults();

    const fullConfig: AgentConfig = {
      id: config?.id || `qa-${Date.now()}`,
      role: AgentRole.QA,
      name: config?.name || 'QA Agent',
      systemPrompt:
        config?.systemPrompt ||
        `You are an expert Quality Assurance Agent specializing in comprehensive software testing and code review.

Your responsibilities:
- Analyze code for bugs, security vulnerabilities, and quality issues
- Review test results and identify failure patterns
- Generate comprehensive test cases (unit, integration, e2e)
- Evaluate code coverage and suggest improvements
- Check for code style violations and best practice adherence
- Identify edge cases and potential runtime issues
- Provide actionable, prioritized recommendations

Testing Categories to Check:
1. **Functionality**: Does the code work as expected?
2. **Security**: Any vulnerabilities (XSS, SQL injection, auth bypass)?
3. **Performance**: Inefficient algorithms, memory leaks, N+1 queries?
4. **Code Quality**: Readability, maintainability, complexity
5. **Error Handling**: Proper try-catch, validation, edge cases
6. **Type Safety**: TypeScript usage, type guards, null checks
7. **Testing**: Test coverage, test quality, missing test cases
8. **Documentation**: Comments, JSDoc, README clarity

Severity Levels:
- **Critical**: Security vulnerabilities, data loss, system crashes
- **Major**: Functional bugs, significant performance issues
- **Minor**: Code quality, small bugs, style issues
- **Suggestion**: Improvements, optimizations, best practices

Output Format:
Provide your response as JSON with the following structure:
{
  "overallStatus": "pass|fail|warning",
  "summary": "Brief summary of findings",
  "issues": [
    {
      "severity": "critical|major|minor|suggestion",
      "category": "security|performance|functionality|etc",
      "message": "Description of the issue",
      "location": {"file": "path", "line": 10},
      "recommendation": "How to fix it"
    }
  ],
  "testStats": {"total": 10, "passed": 8, "failed": 2, "skipped": 0},
  "coverage": {"lines": 85.5, "branches": 78.2, "functions": 90.0, "statements": 85.5},
  "testCode": "// Generated test cases...",
  "score": 7.5
}`,
      provider: config?.provider || LLMProvider.OLLAMA,
      model: config?.model || 'codellama:13b',
      temperature: config?.temperature ?? 0.5,
      maxTokens: config?.maxTokens,
      retries: config?.retries ?? defaults.defaultRetries,
      timeout: config?.timeout ?? defaults.defaultTimeout,
    };

    super(fullConfig, QAInputSchema, QAOutputSchema);
  }

  /**
   * Execute QA task
   */
  protected async execute(
    input: QAInput,
    context: string
  ): Promise<QAOutput> {
    const client = LLMClientFactory.getClient(this.config.provider);

    const userMessage = this.buildPrompt(input, context);
    this.addMessage('user', userMessage);

    const response = await client.complete({
      model: this.config.model,
      messages: this.getHistory().map((h) => ({
        role: h.role,
        content: h.content,
      })),
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
    });

    this.addMessage('assistant', response.content);

    const result = this.parseResponse(response.content, input);

    return {
      success: true,
      ...result,
    };
  }

  /**
   * Build QA prompt
   */
  private buildPrompt(input: QAInput, context: string): string {
    const parts = [
      `Perform ${input.testType === 'all' ? 'comprehensive' : input.testType} quality assurance analysis.`,
    ];

    if (input.code) {
      parts.push(`\nCode to Review:\n\`\`\`\n${input.code}\n\`\`\``);
    }

    if (input.files && input.files.length > 0) {
      parts.push(`\nFiles to Test: ${input.files.join(', ')}`);
    }

    if (input.testResults) {
      parts.push(`\nExisting Test Results:\n${input.testResults}`);
    }

    parts.push(`\nTesting Configuration:`);
    parts.push(`- Test Type: ${input.testType}`);
    parts.push(`- Framework: ${input.framework}`);
    parts.push(`- Coverage Analysis: ${input.coverage ? 'Yes' : 'No'}`);
    parts.push(`- Strict Mode: ${input.strictMode ? 'Enabled' : 'Disabled'}`);

    if (input.context) {
      parts.push(`\nAdditional Context:\n${input.context}`);
    }

    if (context) {
      parts.push(`\nContext Providers:\n${context}`);
    }

    parts.push(`\nProvide a comprehensive QA report with:`);
    parts.push(`1. Overall status and summary`);
    parts.push(`2. Categorized issues with severity levels`);
    parts.push(`3. Specific recommendations for each issue`);
    parts.push(`4. Test statistics (if applicable)`);
    parts.push(`5. Coverage metrics (if applicable)`);
    parts.push(`6. Generated test cases (if needed)`);
    parts.push(`7. Overall quality score (0-10)`);

    return parts.join('\n');
  }

  /**
   * Parse QA response
   */
  private parseResponse(
    content: string,
    input: QAInput
  ): Omit<QAOutput, 'success'> {
    try {
      const jsonMatch = content.match(
        /```(?:json)?\s*(\{[\s\S]*?\})\s*```/
      );
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }

      return JSON.parse(content);
    } catch (error) {
      // Fallback: construct response from text analysis
      const issues = this.extractIssuesFromText(content);

      // Determine overall status
      const hasCritical = issues.some((i) => i.severity === 'critical');
      const hasMajor = issues.some((i) => i.severity === 'major');

      const overallStatus = hasCritical
        ? 'fail'
        : hasMajor
        ? 'warning'
        : 'pass';

      // Calculate score
      const criticalCount = issues.filter(
        (i) => i.severity === 'critical'
      ).length;
      const majorCount = issues.filter((i) => i.severity === 'major').length;
      const minorCount = issues.filter((i) => i.severity === 'minor').length;

      const score = Math.max(
        0,
        10 - criticalCount * 3 - majorCount * 1.5 - minorCount * 0.5
      );

      return {
        overallStatus,
        summary:
          issues.length > 0
            ? `Found ${issues.length} issue(s): ${criticalCount} critical, ${majorCount} major, ${minorCount} minor`
            : 'No significant issues found',
        issues,
        score: Math.round(score * 10) / 10,
      };
    }
  }

  /**
   * Extract issues from text response
   */
  private extractIssuesFromText(text: string): QAOutput['issues'] {
    const issues: QAOutput['issues'] = [];

    // Look for issue patterns in text
    const issuePatterns = [
      /(?:critical|security|vulnerability)/i,
      /(?:bug|error|fail|broken)/i,
      /(?:warning|issue|problem)/i,
      /(?:improve|optimize|refactor)/i,
    ];

    const severities: Array<'critical' | 'major' | 'minor' | 'suggestion'> = [
      'critical',
      'major',
      'minor',
      'suggestion',
    ];

    // Split into lines and analyze
    const lines = text.split('\n');
    let currentSeverity: (typeof severities)[number] = 'minor';

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.length < 10) return;

      // Check if line indicates severity
      issuePatterns.forEach((pattern, index) => {
        if (pattern.test(trimmed)) {
          currentSeverity = severities[index];

          // Extract issue details
          const issue = {
            severity: currentSeverity,
            category: this.categorizeIssue(trimmed),
            message: trimmed.replace(/^[\*\-\d\.]+\s*/, ''),
            recommendation: 'Review and address this issue',
          };

          if (issue.message.length > 0) {
            issues.push(issue);
          }
        }
      });
    });

    return issues.length > 0
      ? issues
      : [
          {
            severity: 'suggestion',
            category: 'general',
            message: 'Code review completed',
            recommendation: 'No critical issues found',
          },
        ];
  }

  /**
   * Categorize issue based on keywords
   */
  private categorizeIssue(text: string): string {
    const lower = text.toLowerCase();

    if (lower.match(/security|xss|injection|auth|credential/))
      return 'security';
    if (lower.match(/performance|slow|optimize|memory|leak/))
      return 'performance';
    if (lower.match(/bug|error|fail|broken|crash/)) return 'functionality';
    if (lower.match(/test|coverage|assertion/)) return 'testing';
    if (lower.match(/type|typescript|null|undefined/)) return 'type-safety';
    if (lower.match(/style|format|lint|convention/)) return 'code-style';
    if (lower.match(/error handling|exception|try|catch/))
      return 'error-handling';
    if (lower.match(/document|comment|readme/)) return 'documentation';

    return 'general';
  }
}
