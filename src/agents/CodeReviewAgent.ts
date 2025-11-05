import { z } from 'zod';
import { BaseAgent } from '../core/BaseAgent.js';
import { AgentConfig, AgentRole, LLMProvider } from '../types/agent.types.js';
import { LLMClientFactory } from '../core/LLMClient.js';
import { ConfigManager, AgentPresets } from '../core/Config.js';

/**
 * Code Review Input Schema
 */
const CodeReviewInputSchema = z.object({
  code: z.string().describe('The code to review'),
  language: z.string().describe('Programming language'),
  context: z.string().optional().describe('Additional context about the code'),
});

/**
 * Code Review Output Schema
 */
const CodeReviewOutputSchema = z.object({
  success: z.boolean(),
  issues: z.array(
    z.object({
      severity: z.enum(['critical', 'major', 'minor', 'suggestion']),
      line: z.number().optional(),
      message: z.string(),
      category: z.string(),
    })
  ),
  summary: z.string(),
  score: z.number().min(0).max(10),
});

type CodeReviewInput = z.infer<typeof CodeReviewInputSchema>;
type CodeReviewOutput = z.infer<typeof CodeReviewOutputSchema>;

/**
 * Code Review Agent - Reviews code for quality, bugs, and best practices
 *
 * Example concrete implementation of BaseAgent
 */
export class CodeReviewAgent extends BaseAgent<
  typeof CodeReviewInputSchema,
  typeof CodeReviewOutputSchema
> {
  constructor(config?: Partial<AgentConfig>) {
    const configManager = ConfigManager.getInstance();
    const defaults = configManager.getAgentDefaults();
    const qaPreset = AgentPresets[AgentRole.QA];

    const fullConfig: AgentConfig = {
      id: config?.id || `qa-${Date.now()}`,
      role: AgentRole.QA,
      name: config?.name || 'Code Review Agent',
      systemPrompt:
        config?.systemPrompt ||
        `${qaPreset.systemPrompt}

When reviewing code, analyze for:
1. Bugs and logical errors
2. Security vulnerabilities
3. Performance issues
4. Code style and readability
5. Best practices adherence
6. Error handling
7. Type safety

Provide specific, actionable feedback with severity levels.`,
      provider: config?.provider || LLMProvider.OPENAI,
      model: config?.model || qaPreset.model,
      temperature: config?.temperature ?? qaPreset.temperature,
      maxTokens: config?.maxTokens,
      retries: config?.retries ?? defaults.defaultRetries,
      timeout: config?.timeout ?? defaults.defaultTimeout,
    };

    super(fullConfig, CodeReviewInputSchema, CodeReviewOutputSchema);
  }

  /**
   * Execute the code review using the configured LLM
   */
  protected async execute(
    input: CodeReviewInput,
    context: string
  ): Promise<CodeReviewOutput> {
    // Get the LLM client for this agent's provider
    const client = LLMClientFactory.getClient(this.config.provider);

    // Build the prompt
    const userMessage = `Please review the following ${input.language} code:

\`\`\`${input.language}
${input.code}
\`\`\`

${input.context ? `\nAdditional context: ${input.context}` : ''}

${context ? `\n${context}` : ''}

Provide a structured review with:
1. List of issues (with severity: critical/major/minor/suggestion, line number if applicable, message, and category)
2. Overall summary
3. Quality score (0-10)

Format your response as JSON matching this structure:
{
  "issues": [
    {
      "severity": "major",
      "line": 10,
      "message": "Description of issue",
      "category": "security|performance|style|logic|error-handling"
    }
  ],
  "summary": "Overall assessment",
  "score": 7.5
}`;

    // Add to history
    this.addMessage('user', userMessage);

    // Make LLM request
    const response = await client.complete({
      model: this.config.model,
      messages: this.getHistory().map((h) => ({
        role: h.role,
        content: h.content,
      })),
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
    });

    // Add response to history
    this.addMessage('assistant', response.content);

    // Parse the JSON response
    let reviewData;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = response.content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : response.content;
      reviewData = JSON.parse(jsonStr);
    } catch (error) {
      throw new Error(`Failed to parse LLM response as JSON: ${error}`);
    }

    return {
      success: true,
      issues: reviewData.issues || [],
      summary: reviewData.summary || 'No summary provided',
      score: reviewData.score || 5,
    };
  }
}
