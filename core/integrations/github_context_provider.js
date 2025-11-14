/**
 * GitHub Context Provider
 * Extends GitHub Integration with context extraction and template injection
 */

import { GitHubIntegration } from './github_integration.js';
import logger from '../logger.js';

export class GitHubContextProvider extends GitHubIntegration {
  constructor(config) {
    super(config);
    this.contextCache = new Map();
    this.cacheTimeout = config.cacheTimeout || 300000; // 5 minutes
  }

  /**
   * Extract context from GitHub URL
   */
  async getContextFromUrl(url) {
    const cached = this.contextCache.get(url);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      logger.info('[GitHubContext] Using cached context', { url });
      return cached.data;
    }

    const parsed = this._parseGitHubUrl(url);
    if (!parsed) {
      throw new Error(`Invalid GitHub URL: ${url}`);
    }

    let context;
    if (parsed.type === 'issue') {
      const issue = await this.getIssue(parsed.number, parsed.owner, parsed.repo);
      context = {
        type: 'issue',
        number: issue.number,
        title: issue.title,
        description: issue.body || '',
        labels: issue.labels.map(l => l.name),
        state: issue.state,
        author: issue.user.login,
        url: issue.html_url,
        createdAt: issue.created_at,
        updatedAt: issue.updated_at
      };
    } else if (parsed.type === 'pull') {
      const pr = await this.getPullRequest(parsed.number, parsed.owner, parsed.repo);
      context = {
        type: 'pull_request',
        number: pr.number,
        title: pr.title,
        description: pr.body || '',
        labels: pr.labels.map(l => l.name),
        state: pr.state,
        author: pr.user.login,
        url: pr.html_url,
        baseBranch: pr.base.ref,
        headBranch: pr.head.ref,
        createdAt: pr.created_at,
        updatedAt: pr.updated_at
      };
    }

    this.contextCache.set(url, {
      data: context,
      timestamp: Date.now()
    });

    return context;
  }

  /**
   * Inject context into prompt template
   */
  injectContext(template, context, worktree = {}) {
    let rendered = template;

    const worktreeVars = {
      'worktree.id': worktree.id || '',
      'worktree.port': worktree.port || '',
      'worktree.path': worktree.path || '',
      'worktree.branch': worktree.branchName || '',
      'worktree.issue_url': worktree.issueUrl || ''
    };

    const contextVars = context ? {
      'github.type': context.type || '',
      'github.number': context.number || '',
      'github.title': context.title || '',
      'github.description': context.description || '',
      'github.labels': context.labels ? context.labels.join(', ') : '',
      'github.state': context.state || '',
      'github.author': context.author || '',
      'github.url': context.url || '',
      'github.branch': context.headBranch || context.baseBranch || ''
    } : {};

    const allVars = { ...worktreeVars, ...contextVars };

    Object.entries(allVars).forEach(([key, value]) => {
      const pattern = new RegExp(`{{\\\\s*${key.replace('.', '\\\\.')}\\\\s*}}`, 'g');
      rendered = rendered.replace(pattern, String(value));
    });

    return rendered;
  }

  /**
   * Parse GitHub URL
   */
  _parseGitHubUrl(url) {
    const issuePattern = /github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/;
    const issueMatch = url.match(issuePattern);
    if (issueMatch) {
      return {
        type: 'issue',
        owner: issueMatch[1],
        repo: issueMatch[2],
        number: parseInt(issueMatch[3])
      };
    }

    const prPattern = /github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/;
    const prMatch = url.match(prPattern);
    if (prMatch) {
      return {
        type: 'pull',
        owner: prMatch[1],
        repo: prMatch[2],
        number: parseInt(prMatch[3])
      };
    }

    return null;
  }

  /**
   * Clear context cache
   */
  clearCache() {
    this.contextCache.clear();
    logger.info('[GitHubContext] Cache cleared');
  }
}

export default GitHubContextProvider;
