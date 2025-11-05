import { z } from 'zod';
import { BaseAgent } from '../core/BaseAgent.js';
import { AgentConfig, AgentRole, LLMProvider } from '../types/agent.types.js';
import { LLMClientFactory } from '../core/LLMClient.js';
import { ConfigManager } from '../core/Config.js';

/**
 * Debugger Input Schema
 */
const DebuggerInputSchema = z.object({
  errorMessage: z.string().optional().describe('Error message or description'),
  stackTrace: z.string().optional().describe('Stack trace'),
  code: z.string().optional().describe('Problematic code'),
  qaReport: z.string().optional().describe('QA report with issues'),
  testFailures: z.string().optional().describe('Failed test information'),
  expectedBehavior: z
    .string()
    .optional()
    .describe('What should happen instead'),
  actualBehavior: z.string().optional().describe('What actually happens'),
  reproducible: z.boolean().default(true).describe('Can the issue be reproduced'),
  context: z.string().optional().describe('Additional context'),
});

/**
 * Debugger Output Schema
 */
const DebuggerOutputSchema = z.object({
  success: z.boolean(),
  diagnosis: z.string().describe('Root cause analysis'),
  severity: z.enum(['critical', 'major', 'minor']),
  category: z.string().describe('Bug category'),
  fixes: z.array(
    z.object({
      description: z.string().describe('What the fix does'),
      patch: z.string().describe('Code patch/changes'),
      location: z
        .object({
          file: z.string().optional(),
          startLine: z.number().optional(),
          endLine: z.number().optional(),
        })
        .optional(),
      impact: z.enum(['breaking', 'non-breaking']),
      confidence: z
        .number()
        .min(0)
        .max(100)
        .describe('Confidence level (0-100)'),
    })
  ),
  preventionTips: z
    .array(z.string())
    .describe('How to prevent similar issues'),
  testRecommendations: z
    .array(z.string())
    .describe('Tests to add to catch this'),
  relatedIssues: z
    .array(z.string())
    .optional()
    .describe('Other potential related issues'),
});

export type DebuggerInput = z.infer<typeof DebuggerInputSchema>;
export type DebuggerOutput = z.infer<typeof DebuggerOutputSchema>;

/**
 * DebuggerAgent - Bug identification and fixing agent
 *
 * Specialized agent for debugging using Grok (xAI)
 *
 * Capabilities:
 * - Analyze error messages and stack traces
 * - Identify root causes of bugs
 * - Generate minimal, targeted patches
 * - Provide prevention strategies
 * - Suggest additional tests
 * - Handle runtime and logical errors
 */
export class DebuggerAgent extends BaseAgent<
  typeof DebuggerInputSchema,
  typeof DebuggerOutputSchema
> {
  constructor(config?: Partial<AgentConfig>) {
    const configManager = ConfigManager.getInstance();
    const defaults = configManager.getAgentDefaults();

    const fullConfig: AgentConfig = {
      id: config?.id || `debugger-${Date.now()}`,
      role: AgentRole.DEBUGGER,
      name: config?.name || 'Debugger Agent',
      systemPrompt:
        config?.systemPrompt ||
        `You are an expert Debugging Agent specializing in root cause analysis and bug fixing.

Your responsibilities:
- Analyze error messages, stack traces, and QA reports
- Identify the root cause of bugs and issues
- Generate minimal, targeted patches that fix the problem
- Ensure fixes don't introduce new bugs (regression-free)
- Provide clear explanations of what went wrong
- Suggest preventive measures and additional tests
- Prioritize fixes by severity and impact

Debugging Process:
1. **Understand the Problem**: Read error messages, stack traces, and context
2. **Locate the Issue**: Identify the exact code location and scope
3. **Root Cause Analysis**: Determine why the issue occurred
4. **Design Minimal Fix**: Create the smallest change that fixes the issue
5. **Verify Impact**: Ensure the fix is non-breaking when possible
6. **Prevention**: Suggest how to avoid similar issues

Bug Categories:
- **Logic Errors**: Incorrect algorithm, wrong condition, off-by-one
- **Type Errors**: Type mismatches, null/undefined, casting issues
- **Runtime Errors**: Exceptions, missing dependencies, resource issues
- **Security Issues**: Vulnerabilities, injection flaws, auth bypass
- **Performance Issues**: Memory leaks, inefficient algorithms, N+1 queries
- **Integration Issues**: API mismatches, version conflicts, config errors

Fix Guidelines:
- Make minimal changes (principle of least change)
- Preserve existing functionality
- Add defensive programming (null checks, validation)
- Include comments explaining the fix
- Maintain code style consistency

Output Format:
Provide your response as JSON with the following structure:
{
  "diagnosis": "Root cause explanation",
  "severity": "critical|major|minor",
  "category": "logic-error|type-error|runtime-error|etc",
  "fixes": [
    {
      "description": "What this fix does",
      "patch": "// Code changes with comments",
      "location": {"file": "path", "startLine": 10, "endLine": 15},
      "impact": "breaking|non-breaking",
      "confidence": 95
    }
  ],
  "preventionTips": ["How to prevent this in the future"],
  "testRecommendations": ["Tests to add to catch this"],
  "relatedIssues": ["Other potential problems found"]
}`,
      provider: config?.provider || LLMProvider.GROK,
      model: config?.model || 'grok-beta',
      temperature: config?.temperature ?? 0.4,
      maxTokens: config?.maxTokens,
      retries: config?.retries ?? defaults.defaultRetries,
      timeout: config?.timeout ?? defaults.defaultTimeout,
    };

    super(fullConfig, DebuggerInputSchema, DebuggerOutputSchema);
  }

  /**
   * Execute debugging task
   */
  protected async execute(
    input: DebuggerInput,
    context: string
  ): Promise<DebuggerOutput> {
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
   * Build debugging prompt
   */
  private buildPrompt(input: DebuggerInput, context: string): string {
    const parts = ['Analyze and fix the following bug/issue:'];

    if (input.errorMessage) {
      parts.push(`\nError Message:\n${input.errorMessage}`);
    }

    if (input.stackTrace) {
      parts.push(`\nStack Trace:\n\`\`\`\n${input.stackTrace}\n\`\`\``);
    }

    if (input.code) {
      parts.push(`\nProblematic Code:\n\`\`\`\n${input.code}\n\`\`\``);
    }

    if (input.qaReport) {
      parts.push(`\nQA Report:\n${input.qaReport}`);
    }

    if (input.testFailures) {
      parts.push(`\nTest Failures:\n${input.testFailures}`);
    }

    if (input.expectedBehavior) {
      parts.push(`\nExpected Behavior: ${input.expectedBehavior}`);
    }

    if (input.actualBehavior) {
      parts.push(`\nActual Behavior: ${input.actualBehavior}`);
    }

    parts.push(
      `\nReproducible: ${input.reproducible ? 'Yes' : 'No (intermittent)'}`
    );

    if (input.context) {
      parts.push(`\nAdditional Context:\n${input.context}`);
    }

    if (context) {
      parts.push(`\nContext Providers:\n${context}`);
    }

    parts.push(`\nProvide:`);
    parts.push(`1. Root cause diagnosis`);
    parts.push(`2. One or more minimal fix patches`);
    parts.push(`3. Severity and category`);
    parts.push(`4. Impact assessment (breaking vs non-breaking)`);
    parts.push(`5. Confidence level for each fix`);
    parts.push(`6. Prevention tips`);
    parts.push(`7. Test recommendations`);

    return parts.join('\n');
  }

  /**
   * Parse debugger response
   */
  private parseResponse(
    content: string,
    input: DebuggerInput
  ): Omit<DebuggerOutput, 'success'> {
    try {
      const jsonMatch = content.match(
        /```(?:json)?\s*(\{[\s\S]*?\})\s*```/
      );
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }

      return JSON.parse(content);
    } catch (error) {
      // Fallback: extract fixes from code blocks
      const codeMatches = content.match(/```(?:typescript|javascript|ts|js)?\s*([\s\S]*?)\s*```/g);

      const fixes = [];

      if (codeMatches && codeMatches.length > 0) {
        codeMatches.forEach((block, index) => {
          const code = block
            .replace(/```(?:typescript|javascript|ts|js)?\s*/, '')
            .replace(/```$/, '')
            .trim();

          fixes.push({
            description: `Fix ${index + 1}: Code patch for the identified issue`,
            patch: code,
            impact: 'non-breaking' as const,
            confidence: 75,
          });
        });
      }

      // Extract diagnosis from text
      const diagnosisMatch = content.match(
        /(?:diagnosis|root cause|issue|problem):\s*([^\n]+)/i
      );
      const diagnosis =
        diagnosisMatch?.[1] ||
        'Issue analyzed - see proposed fixes';

      // Determine severity from content
      const hasCritical = /critical|severe|crash|security/i.test(content);
      const hasMajor = /major|significant|important/i.test(content);
      const severity = hasCritical ? 'critical' : hasMajor ? 'major' : 'minor';

      return {
        diagnosis,
        severity,
        category: this.categorizeFromContent(content),
        fixes:
          fixes.length > 0
            ? fixes
            : [
                {
                  description: 'Manual review required',
                  patch:
                    '// Unable to generate automatic patch\n// Please review the analysis and apply fixes manually',
                  impact: 'non-breaking' as const,
                  confidence: 50,
                },
              ],
        preventionTips: this.extractTips(content, 'prevent'),
        testRecommendations: this.extractTips(content, 'test'),
      };
    }
  }

  /**
   * Categorize bug from content
   */
  private categorizeFromContent(content: string): string {
    const lower = content.toLowerCase();

    if (lower.match(/type|typescript|null|undefined/)) return 'type-error';
    if (lower.match(/runtime|exception|throw|crash/)) return 'runtime-error';
    if (lower.match(/logic|algorithm|condition|loop/)) return 'logic-error';
    if (lower.match(/security|vulnerability|injection/))
      return 'security-issue';
    if (lower.match(/performance|memory|leak|slow/))
      return 'performance-issue';
    if (lower.match(/integration|api|version|dependency/))
      return 'integration-issue';

    return 'general';
  }

  /**
   * Extract tips from content
   */
  private extractTips(content: string, type: 'prevent' | 'test'): string[] {
    const tips: string[] = [];
    const keyword =
      type === 'prevent' ? /prevent|avoid|future/i : /test|verify|check/i;

    const lines = content.split('\n');
    let inSection = false;

    lines.forEach((line) => {
      const trimmed = line.trim();

      if (keyword.test(trimmed)) {
        inSection = true;
        return;
      }

      if (inSection && trimmed.match(/^[\*\-\d\.]/)) {
        const tip = trimmed.replace(/^[\*\-\d\.]+\s*/, '');
        if (tip.length > 10) {
          tips.push(tip);
        }
      }

      if (inSection && trimmed === '') {
        inSection = false;
      }
    });

    return tips.length > 0
      ? tips
      : [
          type === 'prevent'
            ? 'Add input validation and error handling'
            : 'Add unit tests covering edge cases',
        ];
  }
}
