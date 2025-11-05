import { z } from 'zod';
import { BaseAgent } from '../core/BaseAgent.js';
import { AgentConfig, AgentRole, LLMProvider } from '../types/agent.types.js';
import { LLMClientFactory } from '../core/LLMClient.js';
import { ConfigManager } from '../core/Config.js';

/**
 * Frontend Development Input Schema
 */
const FrontEndInputSchema = z.object({
  feature: z.string().describe('Feature description or requirement'),
  componentName: z.string().optional().describe('Suggested component name'),
  styling: z
    .enum(['tailwind', 'css', 'styled-components'])
    .default('tailwind')
    .describe('Styling approach'),
  framework: z
    .enum(['react', 'nextjs', 'vue'])
    .default('react')
    .describe('Frontend framework'),
  typescript: z.boolean().default(true).describe('Use TypeScript'),
  accessibility: z.boolean().default(true).describe('Include ARIA attributes'),
  responsive: z.boolean().default(true).describe('Make responsive'),
  context: z.string().optional().describe('Additional context'),
});

/**
 * Frontend Development Output Schema
 */
const FrontEndOutputSchema = z.object({
  success: z.boolean(),
  componentName: z.string(),
  code: z.string().describe('Generated component code'),
  dependencies: z
    .array(z.string())
    .describe('Required npm packages')
    .optional(),
  usage: z.string().describe('Usage example').optional(),
  notes: z.string().describe('Implementation notes').optional(),
  files: z
    .array(
      z.object({
        path: z.string(),
        content: z.string(),
      })
    )
    .optional()
    .describe('Additional files (styles, types, etc.)'),
});

export type FrontEndInput = z.infer<typeof FrontEndInputSchema>;
export type FrontEndOutput = z.infer<typeof FrontEndOutputSchema>;

/**
 * FrontEndDevAgent - Generates React/Tailwind UI components
 *
 * Specialized agent for frontend development using Ollama qwen2.5:1.5b
 *
 * Capabilities:
 * - Generate React/Next.js components
 * - Implement responsive designs with Tailwind CSS
 * - Create accessible UI with ARIA attributes
 * - TypeScript support
 * - Component composition and best practices
 */
export class FrontEndDevAgent extends BaseAgent<
  typeof FrontEndInputSchema,
  typeof FrontEndOutputSchema
> {
  constructor(config?: Partial<AgentConfig>) {
    const configManager = ConfigManager.getInstance();
    const defaults = configManager.getAgentDefaults();

    const fullConfig: AgentConfig = {
      id: config?.id || `frontend-${Date.now()}`,
      role: AgentRole.FRONTEND,
      name: config?.name || 'Frontend Development Agent',
      systemPrompt:
        config?.systemPrompt ||
        `You are an expert Frontend Development Agent specializing in modern web UI development.

Your responsibilities:
- Generate clean, production-ready React/Next.js components
- Implement responsive designs using Tailwind CSS
- Ensure accessibility with proper ARIA attributes and semantic HTML
- Follow React best practices (hooks, composition, prop validation)
- Use TypeScript for type safety
- Optimize for performance (lazy loading, memoization)
- Create reusable, maintainable component structures

Code Style Guidelines:
- Use functional components with hooks
- Implement proper TypeScript interfaces for props
- Follow component naming conventions (PascalCase)
- Include JSDoc comments for complex logic
- Use Tailwind utility classes for styling
- Ensure mobile-first responsive design

Output Format:
Provide your response as JSON with the following structure:
{
  "componentName": "ComponentName",
  "code": "// Full component code here...",
  "dependencies": ["package-name"],
  "usage": "// Usage example",
  "notes": "Implementation notes",
  "files": [{"path": "types.ts", "content": "// Additional files"}]
}`,
      provider: config?.provider || LLMProvider.OLLAMA,
      model: config?.model || 'qwen2.5:1.5b',
      temperature: config?.temperature ?? 0.7,
      maxTokens: config?.maxTokens,
      retries: config?.retries ?? defaults.defaultRetries,
      timeout: config?.timeout ?? defaults.defaultTimeout,
    };

    super(fullConfig, FrontEndInputSchema, FrontEndOutputSchema);
  }

  /**
   * Execute frontend development task
   */
  protected async execute(
    input: FrontEndInput,
    context: string
  ): Promise<FrontEndOutput> {
    const client = LLMClientFactory.getClient(this.config.provider);

    // Build detailed prompt
    const userMessage = this.buildPrompt(input, context);

    this.addMessage('user', userMessage);

    // Call LLM
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

    // Parse response
    const result = this.parseResponse(response.content, input);

    return {
      success: true,
      ...result,
    };
  }

  /**
   * Build detailed prompt for LLM
   */
  private buildPrompt(input: FrontEndInput, context: string): string {
    const parts = [
      `Create a ${input.framework.toUpperCase()} component for the following feature:`,
      `\nFeature: ${input.feature}`,
    ];

    if (input.componentName) {
      parts.push(`Component Name: ${input.componentName}`);
    }

    parts.push(`\nRequirements:`);
    parts.push(`- Framework: ${input.framework}`);
    parts.push(`- Styling: ${input.styling}`);
    parts.push(`- TypeScript: ${input.typescript ? 'Yes' : 'No'}`);
    parts.push(`- Accessibility: ${input.accessibility ? 'Yes' : 'No'}`);
    parts.push(`- Responsive: ${input.responsive ? 'Yes' : 'No'}`);

    if (input.context) {
      parts.push(`\nAdditional Context:\n${input.context}`);
    }

    if (context) {
      parts.push(`\nContext Providers:\n${context}`);
    }

    parts.push(
      `\nProvide the complete component code with proper structure, styling, and best practices.`
    );
    parts.push(
      `Include any necessary imports, prop types, and implementation notes.`
    );

    return parts.join('\n');
  }

  /**
   * Parse LLM response into structured output
   */
  private parseResponse(
    content: string,
    input: FrontEndInput
  ): Omit<FrontEndOutput, 'success'> {
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(
        /```(?:json)?\s*(\{[\s\S]*?\})\s*```/
      );
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1]);
        return parsed;
      }

      // Try direct JSON parse
      const parsed = JSON.parse(content);
      return parsed;
    } catch (error) {
      // Fallback: extract code blocks and construct response
      const codeMatch = content.match(
        /```(?:typescript|tsx|jsx)?\s*([\s\S]*?)\s*```/
      );
      const code = codeMatch ? codeMatch[1] : content;

      // Try to extract component name from code
      const componentNameMatch = code.match(
        /(?:function|const|export)\s+(\w+)/
      );
      const componentName =
        input.componentName ||
        componentNameMatch?.[1] ||
        'GeneratedComponent';

      return {
        componentName,
        code,
        dependencies: this.extractDependencies(code),
        usage: `import ${componentName} from './${componentName}';\n\n<${componentName} />`,
        notes: 'Generated component - review and customize as needed',
      };
    }
  }

  /**
   * Extract dependencies from import statements
   */
  private extractDependencies(code: string): string[] {
    const deps = new Set<string>();
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;

    let match;
    while ((match = importRegex.exec(code)) !== null) {
      const pkg = match[1];
      // Filter out relative imports
      if (!pkg.startsWith('.') && !pkg.startsWith('/')) {
        // Extract package name (handle scoped packages)
        const pkgName = pkg.startsWith('@')
          ? pkg.split('/').slice(0, 2).join('/')
          : pkg.split('/')[0];
        deps.add(pkgName);
      }
    }

    return Array.from(deps);
  }
}
