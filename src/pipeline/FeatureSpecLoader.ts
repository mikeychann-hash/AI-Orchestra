/**
 * Feature Specification Loader
 *
 * Loads and validates feature specifications from various sources
 */

import { FeatureSpec, FeatureSpecSchema } from '../types/pipeline.types.js';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Feature Spec Loader
 */
export class FeatureSpecLoader {
  /**
   * Load feature spec from JSON file
   */
  static async fromFile(filePath: string): Promise<FeatureSpec> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      return FeatureSpecSchema.parse(data);
    } catch (error) {
      throw new Error(`Failed to load feature spec from ${filePath}: ${error}`);
    }
  }

  /**
   * Load feature spec from JSON string
   */
  static fromJSON(json: string): FeatureSpec {
    try {
      const data = JSON.parse(json);
      return FeatureSpecSchema.parse(data);
    } catch (error) {
      throw new Error(`Failed to parse feature spec JSON: ${error}`);
    }
  }

  /**
   * Load feature spec from object
   */
  static fromObject(obj: any): FeatureSpec {
    return FeatureSpecSchema.parse(obj);
  }

  /**
   * Create a simple feature spec from minimal input
   */
  static createSimple(
    name: string,
    description: string,
    options?: {
      frontend?: boolean;
      backend?: boolean;
      components?: Array<{ name: string; description: string }>;
      endpoints?: Array<{
        method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
        route: string;
        description: string;
      }>;
    }
  ): FeatureSpec {
    const id = `feature-${Date.now()}`;

    return FeatureSpecSchema.parse({
      id,
      name,
      description,
      type: 'full-stack',
      frontend: options?.frontend !== false
        ? {
            enabled: true,
            components:
              options?.components || [
                {
                  name: `${name.replace(/\s+/g, '')}Component`,
                  description: `Component for ${name}`,
                  type: 'component',
                },
              ],
            styling: 'tailwind',
            framework: 'react',
          }
        : undefined,
      backend: options?.backend !== false
        ? {
            enabled: true,
            endpoints:
              options?.endpoints || [
                {
                  method: 'GET',
                  route: `/api/${name.toLowerCase().replace(/\s+/g, '-')}`,
                  description: `Get ${name} data`,
                  authentication: false,
                },
              ],
            framework: 'express',
            database: 'postgresql',
          }
        : undefined,
      testing: {
        enabled: true,
        types: ['unit'],
        coverage: 80,
        strictMode: false,
      },
      quality: {
        maxQAIterations: 3,
        autoFix: true,
        minScore: 7,
      },
    });
  }

  /**
   * Save feature spec to file
   */
  static async saveToFile(featureSpec: FeatureSpec, filePath: string): Promise<void> {
    try {
      const json = JSON.stringify(featureSpec, null, 2);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, json, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save feature spec to ${filePath}: ${error}`);
    }
  }

  /**
   * Validate feature spec
   */
  static validate(obj: any): { valid: boolean; errors?: string[] } {
    try {
      FeatureSpecSchema.parse(obj);
      return { valid: true };
    } catch (error: any) {
      return {
        valid: false,
        errors: error.errors?.map((e: any) => `${e.path.join('.')}: ${e.message}`) || [String(error)],
      };
    }
  }
}
