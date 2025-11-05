/**
 * Custom Agent Example - Creating your own specialized agent
 *
 * This example shows how to extend BaseAgent to create a custom agent
 */

import { z } from 'zod';
import {
  BaseAgent,
  AgentConfig,
  AgentRole,
  LLMProvider,
  LLMClientFactory,
  ConfigManager,
} from '../src/index.js';

/**
 * Define custom input schema
 */
const DocumentationInputSchema = z.object({
  code: z.string(),
  language: z.string(),
  includeExamples: z.boolean().default(true),
});

/**
 * Define custom output schema
 */
const DocumentationOutputSchema = z.object({
  success: z.boolean(),
  documentation: z.string(),
  coverage: z.number().min(0).max(100),
});

/**
 * Documentation Generator Agent - Creates comprehensive documentation
 */
class DocumentationAgent extends BaseAgent<
  typeof DocumentationInputSchema,
  typeof DocumentationOutputSchema
> {
  constructor(config?: Partial<AgentConfig>) {
    const configManager = ConfigManager.getInstance();
    const defaults = configManager.getAgentDefaults();

    const fullConfig: AgentConfig = {
      id: config?.id || `doc-gen-${Date.now()}`,
      role: AgentRole.CUSTOM,
      name: config?.name || 'Documentation Generator',
      systemPrompt:
        config?.systemPrompt ||
        `You are a Documentation Agent specialized in creating clear, comprehensive documentation.

Your responsibilities:
- Analyze code structure and functionality
- Generate detailed API documentation
- Include usage examples when requested
- Use proper markdown formatting
- Cover edge cases and error handling
- Provide coverage estimates

Format documentation with:
- Overview section
- Function/class descriptions
- Parameter details
- Return value information
- Usage examples
- Notes and warnings`,
      provider: config?.provider || LLMProvider.OPENAI,
      model: config?.model || 'gpt-4-turbo-preview',
      temperature: config?.temperature ?? 0.5,
      retries: config?.retries ?? defaults.defaultRetries,
      timeout: config?.timeout ?? defaults.defaultTimeout,
    };

    super(fullConfig, DocumentationInputSchema, DocumentationOutputSchema);
  }

  protected async execute(
    input: z.infer<typeof DocumentationInputSchema>,
    context: string
  ): Promise<z.infer<typeof DocumentationOutputSchema>> {
    const client = LLMClientFactory.getClient(this.config.provider);

    const userMessage = `Generate comprehensive documentation for the following ${input.language} code:

\`\`\`${input.language}
${input.code}
\`\`\`

${input.includeExamples ? 'Include usage examples.' : 'Skip usage examples.'}
${context ? `\n${context}` : ''}

Provide your response as JSON:
{
  "documentation": "# Markdown formatted documentation...",
  "coverage": 85.5
}`;

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

    // Parse JSON response
    const jsonMatch = response.content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : response.content;
    const data = JSON.parse(jsonStr);

    return {
      success: true,
      documentation: data.documentation || 'No documentation generated',
      coverage: data.coverage || 0,
    };
  }
}

/**
 * Demo usage
 */
async function main() {
  console.log('🎼 Custom Agent Example\n');

  const docAgent = new DocumentationAgent({
    name: 'API Documentation Generator',
  });

  const sampleCode = `
export class UserService {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async createUser(email: string, name: string): Promise<User> {
    const user = await this.db.users.create({ email, name });
    return user;
  }

  async getUserById(id: string): Promise<User | null> {
    return await this.db.users.findById(id);
  }
}
`;

  console.log('Generating documentation...\n');

  const result = await docAgent.run({
    code: sampleCode,
    language: 'typescript',
    includeExamples: true,
  });

  console.log('📚 Generated Documentation\n');
  console.log(result.documentation);
  console.log(`\n📊 Coverage: ${result.coverage}%`);
}

main().catch(console.error);
