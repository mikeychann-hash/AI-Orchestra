/**
 * Specialized Tools for Development Agents
 *
 * Tools specific to frontend, backend, QA, and debugging workflows
 */

import { z } from 'zod';
import { ToolBuilder } from './Tool.js';
import { ToolDefinition } from '../types/agent.types.js';

/**
 * Frontend-specific tools
 */
export class FrontEndTools {
  /**
   * Validate React component syntax
   */
  static validateComponent(): ToolDefinition {
    return new ToolBuilder()
      .setName('validate_component')
      .setDescription('Validate React component syntax and structure')
      .setParameters(
        z.object({
          code: z.string(),
          framework: z.enum(['react', 'vue', 'angular']).default('react'),
        })
      )
      .setExecute(async ({ code, framework }) => {
        // Basic validation
        const errors = [];

        if (framework === 'react') {
          // Check for common React issues
          if (!code.includes('import React') && !code.includes('from "react"')) {
            errors.push('Missing React import');
          }

          if (
            !code.match(/function\s+\w+/) &&
            !code.match(/const\s+\w+\s*=/) &&
            !code.match(/export default/)
          ) {
            errors.push('No component declaration found');
          }

          if (!code.match(/return\s*\(/)) {
            errors.push('Component should return JSX');
          }
        }

        return {
          valid: errors.length === 0,
          errors,
          warnings: [],
        };
      })
      .build();
  }

  /**
   * Check Tailwind class usage
   */
  static checkTailwindClasses(): ToolDefinition {
    return new ToolBuilder()
      .setName('check_tailwind')
      .setDescription('Validate Tailwind CSS class usage')
      .setParameters(
        z.object({
          code: z.string(),
        })
      )
      .setExecute(async ({ code }) => {
        // Extract className attributes
        const classNameRegex = /className=["']([^"']+)["']/g;
        const classes = [];
        let match;

        while ((match = classNameRegex.exec(code)) !== null) {
          classes.push(...match[1].split(' '));
        }

        // Check for common issues
        const issues = [];
        const uniqueClasses = [...new Set(classes)];

        // Check for custom CSS class names (might not be Tailwind)
        uniqueClasses.forEach((cls) => {
          if (
            !cls.match(/^[a-z\-0-9]+$/) ||
            cls.includes('_') ||
            cls.length > 30
          ) {
            issues.push(`Potentially non-Tailwind class: ${cls}`);
          }
        });

        return {
          totalClasses: classes.length,
          uniqueClasses: uniqueClasses.length,
          classes: uniqueClasses,
          issues,
        };
      })
      .build();
  }

  /**
   * Generate component template
   */
  static generateTemplate(): ToolDefinition {
    return new ToolBuilder()
      .setName('generate_template')
      .setDescription('Generate React component template')
      .setParameters(
        z.object({
          name: z.string(),
          typescript: z.boolean().default(true),
        })
      )
      .setExecute(async ({ name, typescript }) => {
        const ext = typescript ? 'tsx' : 'jsx';
        const propsType = typescript ? `\n\ninterface ${name}Props {\n  // Props here\n}` : '';

        const template = `import React from 'react';${propsType}

export const ${name}${typescript ? `: React.FC<${name}Props>` : ''} = (props) => {
  return (
    <div className="container">
      {/* Component content */}
    </div>
  );
};

export default ${name};
`;

        return {
          filename: `${name}.${ext}`,
          content: template,
        };
      })
      .build();
  }
}

/**
 * Backend-specific tools
 */
export class BackEndTools {
  /**
   * Validate API endpoint structure
   */
  static validateEndpoint(): ToolDefinition {
    return new ToolBuilder()
      .setName('validate_endpoint')
      .setDescription('Validate REST API endpoint structure')
      .setParameters(
        z.object({
          code: z.string(),
          method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
        })
      )
      .setExecute(async ({ code, method }) => {
        const errors = [];
        const warnings = [];

        // Check for route definition
        if (!code.match(/router\.(get|post|put|patch|delete|all)/i)) {
          errors.push('No route definition found');
        }

        // Check for async handler
        if (!code.includes('async') && !code.includes('.then(')) {
          warnings.push('Handler should be async or return Promise');
        }

        // Check for error handling
        if (!code.includes('try') && !code.includes('catch')) {
          warnings.push('Missing error handling (try-catch)');
        }

        // Check for response
        if (!code.includes('res.') && !code.includes('response.')) {
          errors.push('No response sent');
        }

        // Check for validation
        if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
          if (!code.match(/validate|joi|yup|zod/i)) {
            warnings.push('Consider adding request validation');
          }
        }

        return {
          valid: errors.length === 0,
          errors,
          warnings,
        };
      })
      .build();
  }

  /**
   * Check security best practices
   */
  static checkSecurity(): ToolDefinition {
    return new ToolBuilder()
      .setName('check_security')
      .setDescription('Check for common security issues')
      .setParameters(
        z.object({
          code: z.string(),
        })
      )
      .setExecute(async ({ code }) => {
        const issues = [];

        // Check for SQL injection vulnerabilities
        if (code.match(/\$\{.*\}/) && code.match(/SELECT|INSERT|UPDATE|DELETE/i)) {
          issues.push({
            severity: 'critical',
            message: 'Potential SQL injection - use parameterized queries',
          });
        }

        // Check for eval usage
        if (code.includes('eval(')) {
          issues.push({
            severity: 'critical',
            message: 'Using eval() is dangerous - avoid if possible',
          });
        }

        // Check for hardcoded secrets
        if (code.match(/password\s*=\s*["'][^"']+["']/i) || code.match(/api_key\s*=\s*["'][^"']+["']/i)) {
          issues.push({
            severity: 'major',
            message: 'Potential hardcoded secret - use environment variables',
          });
        }

        // Check for authentication
        if (code.match(/router\.(post|put|patch|delete)/i) && !code.match(/auth|authenticate|verify/i)) {
          issues.push({
            severity: 'minor',
            message: 'Consider adding authentication middleware',
          });
        }

        return {
          secure: issues.filter((i) => i.severity === 'critical').length === 0,
          issues,
        };
      })
      .build();
  }

  /**
   * Generate API route template
   */
  static generateRouteTemplate(): ToolDefinition {
    return new ToolBuilder()
      .setName('generate_route')
      .setDescription('Generate Express route template')
      .setParameters(
        z.object({
          path: z.string(),
          method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
        })
      )
      .setExecute(async ({ path, method }) => {
        const methodLower = method.toLowerCase();
        const template = `import { Router, Request, Response } from 'express';

const router = Router();

router.${methodLower}('${path}', async (req: Request, res: Response) => {
  try {
    // TODO: Implement endpoint logic

    res.status(200).json({
      success: true,
      message: 'Success',
    });
  } catch (error) {
    console.error('Error in ${method} ${path}:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export default router;
`;

        return {
          filename: `${path.replace(/\//g, '-').slice(1)}.route.ts`,
          content: template,
        };
      })
      .build();
  }
}

/**
 * QA-specific tools
 */
export class QATools {
  /**
   * Run linter
   */
  static runLinter(): ToolDefinition {
    return new ToolBuilder()
      .setName('run_lint')
      .setDescription('Run ESLint on code')
      .setParameters(
        z.object({
          code: z.string(),
          config: z.string().optional(),
        })
      )
      .setExecute(async ({ code }) => {
        // Simplified linting - check common issues
        const issues = [];

        // Check for console.log
        if (code.match(/console\.log/g)) {
          issues.push({
            line: -1,
            message: 'Unexpected console.log statement',
            severity: 'warning',
          });
        }

        // Check for var usage
        if (code.match(/\bvar\b/g)) {
          issues.push({
            line: -1,
            message: 'Use const or let instead of var',
            severity: 'error',
          });
        }

        // Check for == instead of ===
        if (code.match(/[^=!]==[^=]/g)) {
          issues.push({
            line: -1,
            message: 'Use === instead of ==',
            severity: 'warning',
          });
        }

        return {
          passed: issues.filter((i) => i.severity === 'error').length === 0,
          issues,
        };
      })
      .build();
  }

  /**
   * Calculate code complexity
   */
  static calculateComplexity(): ToolDefinition {
    return new ToolBuilder()
      .setName('calculate_complexity')
      .setDescription('Calculate cyclomatic complexity')
      .setParameters(
        z.object({
          code: z.string(),
        })
      )
      .setExecute(async ({ code }) => {
        // Simplified complexity calculation
        let complexity = 1; // Base complexity

        // Count decision points
        complexity += (code.match(/\bif\b/g) || []).length;
        complexity += (code.match(/\bfor\b/g) || []).length;
        complexity += (code.match(/\bwhile\b/g) || []).length;
        complexity += (code.match(/\bcase\b/g) || []).length;
        complexity += (code.match(/&&|\|\|/g) || []).length;
        complexity += (code.match(/\?/g) || []).length;

        const rating =
          complexity <= 5
            ? 'simple'
            : complexity <= 10
            ? 'moderate'
            : complexity <= 20
            ? 'complex'
            : 'very complex';

        return {
          complexity,
          rating,
          recommendation:
            complexity > 10
              ? 'Consider refactoring into smaller functions'
              : 'Complexity is acceptable',
        };
      })
      .build();
  }

  /**
   * Generate test template
   */
  static generateTestTemplate(): ToolDefinition {
    return new ToolBuilder()
      .setName('generate_test')
      .setDescription('Generate test template')
      .setParameters(
        z.object({
          componentName: z.string(),
          framework: z.enum(['jest', 'vitest', 'mocha']).default('jest'),
        })
      )
      .setExecute(async ({ componentName, framework }) => {
        const template = `import { describe, it, expect } from '${framework === 'mocha' ? 'mocha' : framework}';

describe('${componentName}', () => {
  it('should render correctly', () => {
    // Arrange

    // Act

    // Assert
    expect(true).toBe(true); // TODO: Implement test
  });

  it('should handle edge cases', () => {
    // TODO: Implement test
  });
});
`;

        return {
          filename: `${componentName}.test.ts`,
          content: template,
        };
      })
      .build();
  }
}

/**
 * Debugger-specific tools
 */
export class DebuggerTools {
  /**
   * Parse stack trace
   */
  static parseStackTrace(): ToolDefinition {
    return new ToolBuilder()
      .setName('parse_stack_trace')
      .setDescription('Parse and analyze stack trace')
      .setParameters(
        z.object({
          stackTrace: z.string(),
        })
      )
      .setExecute(async ({ stackTrace }) => {
        const lines = stackTrace.split('\n');
        const frames = [];

        lines.forEach((line) => {
          // Match common stack trace formats
          const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
          if (match) {
            frames.push({
              function: match[1],
              file: match[2],
              line: parseInt(match[3]),
              column: parseInt(match[4]),
            });
          }
        });

        return {
          totalFrames: frames.length,
          frames,
          topFrame: frames[0],
        };
      })
      .build();
  }

  /**
   * Analyze error message
   */
  static analyzeError(): ToolDefinition {
    return new ToolBuilder()
      .setName('analyze_error')
      .setDescription('Analyze error message and classify')
      .setParameters(
        z.object({
          errorMessage: z.string(),
        })
      )
      .setExecute(async ({ errorMessage }) => {
        const lower = errorMessage.toLowerCase();

        let category = 'unknown';
        let severity = 'minor';

        if (lower.match(/cannot read property|undefined|null/)) {
          category = 'null-reference';
          severity = 'major';
        } else if (lower.match(/type error|not a function/)) {
          category = 'type-error';
          severity = 'major';
        } else if (lower.match(/syntax error|unexpected token/)) {
          category = 'syntax-error';
          severity = 'critical';
        } else if (lower.match(/module not found|cannot find/)) {
          category = 'dependency-error';
          severity = 'major';
        } else if (lower.match(/timeout|timed out/)) {
          category = 'timeout-error';
          severity = 'minor';
        }

        return {
          category,
          severity,
          likelyCause: this.suggestCause(category),
        };
      })
      .build();
  }

  private static suggestCause(category: string): string {
    const causes: Record<string, string> = {
      'null-reference':
        'Accessing property on null/undefined value - add null checks',
      'type-error': 'Wrong type used - check function signatures and types',
      'syntax-error': 'Code syntax is invalid - check for typos and formatting',
      'dependency-error': 'Missing dependency - run npm install',
      'timeout-error': 'Operation taking too long - optimize or increase timeout',
    };

    return causes[category] || 'Unknown cause - review error context';
  }

  /**
   * Generate patch
   */
  static generatePatch(): ToolDefinition {
    return new ToolBuilder()
      .setName('generate_patch')
      .setDescription('Generate minimal code patch')
      .setParameters(
        z.object({
          originalCode: z.string(),
          fixedCode: z.string(),
        })
      )
      .setExecute(async ({ originalCode, fixedCode }) => {
        // Simple diff-like output
        const patch = `--- original
+++ fixed
${originalCode.split('\n').map((line) => `- ${line}`).join('\n')}
${fixedCode.split('\n').map((line) => `+ ${line}`).join('\n')}`;

        return {
          patch,
          linesAdded: fixedCode.split('\n').length,
          linesRemoved: originalCode.split('\n').length,
        };
      })
      .build();
  }
}
