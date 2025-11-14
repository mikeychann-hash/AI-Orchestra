/**
 * GitHubContextProvider Tests
 * Unit tests for GitHub context extraction and template injection
 */

import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert';
import { GitHubContextProvider } from '../../core/integrations/github_context_provider.js';

describe('GitHubContextProvider', () => {
  let provider;
  let mockGitHubData;

  before(() => {
    // Mock GitHub data
    mockGitHubData = {
      issue: {
        number: 123,
        title: 'Add new feature',
        body: 'This is a detailed description of the feature',
        labels: [{ name: 'enhancement' }, { name: 'frontend' }],
        state: 'open',
        user: { login: 'testuser' },
        html_url: 'https://github.com/owner/repo/issues/123',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-02T00:00:00Z',
      },
      pullRequest: {
        number: 456,
        title: 'Fix bug in authentication',
        body: 'This PR fixes the authentication issue',
        labels: [{ name: 'bug' }, { name: 'security' }],
        state: 'open',
        user: { login: 'contributor' },
        html_url: 'https://github.com/owner/repo/pull/456',
        base: { ref: 'main' },
        head: { ref: 'fix-auth' },
        created_at: '2025-01-03T00:00:00Z',
        updated_at: '2025-01-04T00:00:00Z',
      },
    };
  });

  beforeEach(() => {
    // Create provider with mock token (will be mocked)
    provider = new GitHubContextProvider({
      token: 'mock-token',
      owner: 'test-owner',
      repo: 'test-repo',
      cacheTimeout: 300000,
    });

    // Mock the getIssue and getPullRequest methods
    provider.getIssue = async (number, owner, repo) => {
      if (number === 123) return mockGitHubData.issue;
      throw new Error('Issue not found');
    };

    provider.getPullRequest = async (number, owner, repo) => {
      if (number === 456) return mockGitHubData.pullRequest;
      throw new Error('PR not found');
    };
  });

  describe('Initialization', () => {
    it('should initialize with default cache timeout', () => {
      const defaultProvider = new GitHubContextProvider({ token: 'test' });
      assert.strictEqual(defaultProvider.cacheTimeout, 300000);
    });

    it('should initialize with custom cache timeout', () => {
      const customProvider = new GitHubContextProvider({
        token: 'test',
        cacheTimeout: 600000,
      });
      assert.strictEqual(customProvider.cacheTimeout, 600000);
    });

    it('should initialize empty cache', () => {
      assert.strictEqual(provider.contextCache.size, 0);
    });
  });

  describe('URL Parsing', () => {
    it('should parse GitHub issue URL', () => {
      const url = 'https://github.com/owner/repo/issues/123';
      const parsed = provider._parseGitHubUrl(url);

      assert.strictEqual(parsed.type, 'issue');
      assert.strictEqual(parsed.owner, 'owner');
      assert.strictEqual(parsed.repo, 'repo');
      assert.strictEqual(parsed.number, 123);
    });

    it('should parse GitHub PR URL', () => {
      const url = 'https://github.com/owner/repo/pull/456';
      const parsed = provider._parseGitHubUrl(url);

      assert.strictEqual(parsed.type, 'pull');
      assert.strictEqual(parsed.owner, 'owner');
      assert.strictEqual(parsed.repo, 'repo');
      assert.strictEqual(parsed.number, 456);
    });

    it('should return null for invalid URL', () => {
      const url = 'https://github.com/owner/repo';
      const parsed = provider._parseGitHubUrl(url);

      assert.strictEqual(parsed, null);
    });

    it('should return null for non-GitHub URL', () => {
      const url = 'https://example.com/issues/123';
      const parsed = provider._parseGitHubUrl(url);

      assert.strictEqual(parsed, null);
    });
  });

  describe('Context Extraction', () => {
    it('should extract context from issue URL', async () => {
      const url = 'https://github.com/owner/repo/issues/123';
      const context = await provider.getContextFromUrl(url);

      assert.strictEqual(context.type, 'issue');
      assert.strictEqual(context.number, 123);
      assert.strictEqual(context.title, 'Add new feature');
      assert.strictEqual(context.description, 'This is a detailed description of the feature');
      assert.deepStrictEqual(context.labels, ['enhancement', 'frontend']);
      assert.strictEqual(context.state, 'open');
      assert.strictEqual(context.author, 'testuser');
    });

    it('should extract context from PR URL', async () => {
      const url = 'https://github.com/owner/repo/pull/456';
      const context = await provider.getContextFromUrl(url);

      assert.strictEqual(context.type, 'pull_request');
      assert.strictEqual(context.number, 456);
      assert.strictEqual(context.title, 'Fix bug in authentication');
      assert.strictEqual(context.baseBranch, 'main');
      assert.strictEqual(context.headBranch, 'fix-auth');
    });

    it('should throw error for invalid URL', async () => {
      const url = 'https://invalid-url.com';

      await assert.rejects(
        async () => await provider.getContextFromUrl(url),
        /Invalid GitHub URL/
      );
    });

    it('should include owner and repo in context', async () => {
      const url = 'https://github.com/test-owner/test-repo/issues/123';
      const context = await provider.getContextFromUrl(url);

      assert.strictEqual(context.owner, 'test-owner');
      assert.strictEqual(context.repo, 'test-repo');
    });
  });

  describe('Caching', () => {
    it('should cache fetched context', async () => {
      const url = 'https://github.com/owner/repo/issues/123';

      await provider.getContextFromUrl(url);

      assert.strictEqual(provider.contextCache.size, 1);
      assert.ok(provider.contextCache.has(url));
    });

    it('should return cached context on second call', async () => {
      const url = 'https://github.com/owner/repo/issues/123';

      const context1 = await provider.getContextFromUrl(url);
      const context2 = await provider.getContextFromUrl(url);

      assert.deepStrictEqual(context1, context2);
    });

    it('should clear specific cache entry', async () => {
      const url = 'https://github.com/owner/repo/issues/123';
      await provider.getContextFromUrl(url);

      provider.clearCache(url);

      assert.strictEqual(provider.contextCache.has(url), false);
    });

    it('should clear all cache', async () => {
      await provider.getContextFromUrl('https://github.com/owner/repo/issues/123');
      await provider.getContextFromUrl('https://github.com/owner/repo/pull/456');

      provider.clearCache();

      assert.strictEqual(provider.contextCache.size, 0);
    });

    it('should get cache statistics', async () => {
      await provider.getContextFromUrl('https://github.com/owner/repo/issues/123');

      const stats = provider.getCacheStats();

      assert.strictEqual(stats.totalEntries, 1);
      assert.strictEqual(stats.validEntries, 1);
      assert.strictEqual(stats.expiredEntries, 0);
      assert.strictEqual(stats.cacheTimeout, 300000);
    });

    it('should clean expired cache entries', async () => {
      const shortCacheProvider = new GitHubContextProvider({
        token: 'test',
        cacheTimeout: 100, // 100ms
      });
      shortCacheProvider.getIssue = provider.getIssue;

      await shortCacheProvider.getContextFromUrl('https://github.com/owner/repo/issues/123');

      // Wait for cache to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      const removed = shortCacheProvider.cleanExpiredCache();

      assert.strictEqual(removed, 1);
      assert.strictEqual(shortCacheProvider.contextCache.size, 0);
    });
  });

  describe('Template Injection', () => {
    it('should inject GitHub variables', () => {
      const template = 'Work on {{ github.title }} in {{ github.repo }}';
      const context = {
        title: 'Fix bug',
        repo: 'my-repo',
      };

      const result = provider.injectContext(template, context);

      assert.strictEqual(result, 'Work on Fix bug in my-repo');
    });

    it('should inject worktree variables', () => {
      const template = 'Worktree at port {{ worktree.port }} on branch {{ worktree.branch }}';
      const worktree = {
        port: 3001,
        branchName: 'feature-test',
      };

      const result = provider.injectContext(template, null, worktree);

      assert.strictEqual(result, 'Worktree at port 3001 on branch feature-test');
    });

    it('should inject both GitHub and worktree variables', () => {
      const template = 'Issue: {{ github.title }} on port {{ worktree.port }}';
      const context = { title: 'New Feature' };
      const worktree = { port: 3002 };

      const result = provider.injectContext(template, context, worktree);

      assert.strictEqual(result, 'Issue: New Feature on port 3002');
    });

    it('should handle missing context gracefully', () => {
      const template = 'Title: {{ github.title }}';
      const result = provider.injectContext(template, null, {});

      assert.strictEqual(result, 'Title: ');
    });

    it('should handle template with no variables', () => {
      const template = 'This is a static template';
      const result = provider.injectContext(template, {}, {});

      assert.strictEqual(result, 'This is a static template');
    });

    it('should inject labels as comma-separated string', () => {
      const template = 'Labels: {{ github.labels }}';
      const context = {
        labels: ['bug', 'priority', 'frontend'],
      };

      const result = provider.injectContext(template, context);

      assert.strictEqual(result, 'Labels: bug, priority, frontend');
    });

    it('should inject branch from PR context', () => {
      const template = 'Branch: {{ github.branch }}';
      const context = {
        headBranch: 'feature-branch',
      };

      const result = provider.injectContext(template, context);

      assert.strictEqual(result, 'Branch: feature-branch');
    });

    it('should handle special regex characters in values', () => {
      const template = 'Title: {{ github.title }}';
      const context = {
        title: 'Fix regex ($) and (.) issues',
      };

      const result = provider.injectContext(template, context);

      assert.strictEqual(result, 'Title: Fix regex ($) and (.) issues');
    });

    it('should handle whitespace in template variables', () => {
      const template = 'Title: {{  github.title  }}';
      const context = { title: 'Test' };

      const result = provider.injectContext(template, context);

      assert.strictEqual(result, 'Title: Test');
    });
  });

  describe('Template Validation', () => {
    it('should validate template with valid variables', () => {
      const template = 'Work on {{ github.title }} in {{ worktree.path }}';
      const validation = provider.validateTemplate(template);

      assert.strictEqual(validation.valid, true);
      assert.strictEqual(validation.variables.length, 2);
      assert.strictEqual(validation.invalidVariables.length, 0);
    });

    it('should detect invalid variables', () => {
      const template = 'Work on {{ invalid.var }} and {{ github.title }}';
      const validation = provider.validateTemplate(template);

      assert.strictEqual(validation.valid, false);
      assert.ok(validation.invalidVariables.includes('invalid.var'));
    });

    it('should return empty variables for template with no variables', () => {
      const template = 'Static template with no variables';
      const validation = provider.validateTemplate(template);

      assert.strictEqual(validation.valid, true);
      assert.strictEqual(validation.variables.length, 0);
    });
  });

  describe('Regex Escaping', () => {
    it('should escape special regex characters', () => {
      const str = 'github.title';
      const escaped = provider._escapeRegex(str);

      assert.strictEqual(escaped, 'github\\.title');
    });

    it('should escape all special characters', () => {
      const str = '.*+?^${}()|[]\\';
      const escaped = provider._escapeRegex(str);

      // Should escape all special characters
      assert.ok(escaped.includes('\\'));
      assert.ok(escaped.length > str.length);
    });
  });

  describe('Integration', () => {
    it('should extract and inject context in one flow', async () => {
      const url = 'https://github.com/owner/repo/issues/123';
      const context = await provider.getContextFromUrl(url);

      const template = `
Issue: {{ github.title }}
Description: {{ github.description }}
Labels: {{ github.labels }}
Author: {{ github.author }}
`;

      const result = provider.injectContext(template, context);

      assert.ok(result.includes('Add new feature'));
      assert.ok(result.includes('This is a detailed description'));
      assert.ok(result.includes('enhancement, frontend'));
      assert.ok(result.includes('testuser'));
    });

    it('should handle full workflow with worktree and GitHub context', async () => {
      const url = 'https://github.com/owner/repo/pull/456';
      const context = await provider.getContextFromUrl(url);

      const worktree = {
        id: 'wt-123',
        port: 3001,
        branchName: 'fix-auth',
        path: '/path/to/worktree',
      };

      const template = `
PR: {{ github.title }}
Branch: {{ github.branch }}
Worktree ID: {{ worktree.id }}
Port: {{ worktree.port }}
Path: {{ worktree.path }}
`;

      const result = provider.injectContext(template, context, worktree);

      assert.ok(result.includes('Fix bug in authentication'));
      assert.ok(result.includes('fix-auth'));
      assert.ok(result.includes('wt-123'));
      assert.ok(result.includes('3001'));
      assert.ok(result.includes('/path/to/worktree'));
    });
  });
});
