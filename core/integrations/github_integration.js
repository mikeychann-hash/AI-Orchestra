/**
 * GitHub Integration
 * Provides utilities for interacting with GitHub API
 */

import { Octokit } from '@octokit/rest';
import logger from '../logger.js';

export class GitHubIntegration {
  constructor(config = {}) {
    this.token = config.token || process.env.GITHUB_TOKEN;
    this.owner = config.owner || process.env.GITHUB_OWNER;
    this.repo = config.repo || process.env.GITHUB_REPO;

    if (!this.token) {
      throw new Error('GitHub token is required');
    }

    this.octokit = new Octokit({
      auth: this.token,
    });
  }

  /**
   * Get repository information
   * @param {string} owner - Repository owner (optional)
   * @param {string} repo - Repository name (optional)
   * @returns {Promise<Object>} Repository information
   */
  async getRepository(owner = this.owner, repo = this.repo) {
    try {
      const response = await this.octokit.repos.get({
        owner,
        repo,
      });
      return response.data;
    } catch (error) {
      logger.error('[GitHub] Failed to get repository', { error: error.message });
      throw error;
    }
  }

  /**
   * List issues
   * @param {Object} options - Query options
   * @returns {Promise<Array>} List of issues
   */
  async listIssues(options = {}) {
    try {
      const {
        owner = this.owner,
        repo = this.repo,
        state = 'open',
        labels,
        sort = 'created',
        direction = 'desc',
        per_page = 30,
        page = 1,
      } = options;

      const response = await this.octokit.issues.listForRepo({
        owner,
        repo,
        state,
        labels,
        sort,
        direction,
        per_page,
        page,
      });

      return response.data;
    } catch (error) {
      logger.error('[GitHub] Failed to list issues', { error: error.message });
      throw error;
    }
  }

  /**
   * Get a specific issue
   * @param {number} issueNumber - Issue number
   * @param {string} owner - Repository owner (optional)
   * @param {string} repo - Repository name (optional)
   * @returns {Promise<Object>} Issue details
   */
  async getIssue(issueNumber, owner = this.owner, repo = this.repo) {
    try {
      const response = await this.octokit.issues.get({
        owner,
        repo,
        issue_number: issueNumber,
      });
      return response.data;
    } catch (error) {
      logger.error('[GitHub] Failed to get issue', { error: error.message });
      throw error;
    }
  }

  /**
   * Create an issue
   * @param {Object} options - Issue options
   * @returns {Promise<Object>} Created issue
   */
  async createIssue(options) {
    try {
      const {
        owner = this.owner,
        repo = this.repo,
        title,
        body,
        labels = [],
        assignees = [],
        milestone,
      } = options;

      const response = await this.octokit.issues.create({
        owner,
        repo,
        title,
        body,
        labels,
        assignees,
        milestone,
      });

      return response.data;
    } catch (error) {
      logger.error('[GitHub] Failed to create issue', { error: error.message });
      throw error;
    }
  }

  /**
   * Update an issue
   * @param {number} issueNumber - Issue number
   * @param {Object} options - Update options
   * @returns {Promise<Object>} Updated issue
   */
  async updateIssue(issueNumber, options) {
    try {
      const { owner = this.owner, repo = this.repo, title, body, state, labels, assignees } = options;

      const response = await this.octokit.issues.update({
        owner,
        repo,
        issue_number: issueNumber,
        title,
        body,
        state,
        labels,
        assignees,
      });

      return response.data;
    } catch (error) {
      logger.error('[GitHub] Failed to update issue', { error: error.message });
      throw error;
    }
  }

  /**
   * Add a comment to an issue
   * @param {number} issueNumber - Issue number
   * @param {string} body - Comment body
   * @param {string} owner - Repository owner (optional)
   * @param {string} repo - Repository name (optional)
   * @returns {Promise<Object>} Created comment
   */
  async addComment(issueNumber, body, owner = this.owner, repo = this.repo) {
    try {
      const response = await this.octokit.issues.createComment({
        owner,
        repo,
        issue_number: issueNumber,
        body,
      });
      return response.data;
    } catch (error) {
      logger.error('[GitHub] Failed to add comment', { error: error.message });
      throw error;
    }
  }

  /**
   * List pull requests
   * @param {Object} options - Query options
   * @returns {Promise<Array>} List of pull requests
   */
  async listPullRequests(options = {}) {
    try {
      const {
        owner = this.owner,
        repo = this.repo,
        state = 'open',
        sort = 'created',
        direction = 'desc',
        per_page = 30,
        page = 1,
      } = options;

      const response = await this.octokit.pulls.list({
        owner,
        repo,
        state,
        sort,
        direction,
        per_page,
        page,
      });

      return response.data;
    } catch (error) {
      logger.error('[GitHub] Failed to list pull requests', { error: error.message });
      throw error;
    }
  }

  /**
   * Get a specific pull request
   * @param {number} pullNumber - Pull request number
   * @param {string} owner - Repository owner (optional)
   * @param {string} repo - Repository name (optional)
   * @returns {Promise<Object>} Pull request details
   */
  async getPullRequest(pullNumber, owner = this.owner, repo = this.repo) {
    try {
      const response = await this.octokit.pulls.get({
        owner,
        repo,
        pull_number: pullNumber,
      });
      return response.data;
    } catch (error) {
      logger.error('[GitHub] Failed to get pull request', { error: error.message });
      throw error;
    }
  }

  /**
   * Create a pull request
   * @param {Object} options - Pull request options
   * @returns {Promise<Object>} Created pull request
   */
  async createPullRequest(options) {
    try {
      const { owner = this.owner, repo = this.repo, title, body, head, base, draft = false } = options;

      const response = await this.octokit.pulls.create({
        owner,
        repo,
        title,
        body,
        head,
        base,
        draft,
      });

      return response.data;
    } catch (error) {
      logger.error('[GitHub] Failed to create pull request', { error: error.message });
      throw error;
    }
  }

  /**
   * Merge a pull request
   * @param {number} pullNumber - Pull request number
   * @param {Object} options - Merge options
   * @returns {Promise<Object>} Merge result
   */
  async mergePullRequest(pullNumber, options = {}) {
    try {
      const {
        owner = this.owner,
        repo = this.repo,
        commit_title,
        commit_message,
        merge_method = 'merge',
      } = options;

      const response = await this.octokit.pulls.merge({
        owner,
        repo,
        pull_number: pullNumber,
        commit_title,
        commit_message,
        merge_method,
      });

      return response.data;
    } catch (error) {
      logger.error('[GitHub] Failed to merge pull request', { error: error.message });
      throw error;
    }
  }

  /**
   * Get file contents
   * @param {string} path - File path
   * @param {string} owner - Repository owner (optional)
   * @param {string} repo - Repository name (optional)
   * @param {string} ref - Branch/tag/commit reference (optional)
   * @returns {Promise<Object>} File contents
   */
  async getFileContents(path, owner = this.owner, repo = this.repo, ref) {
    try {
      const response = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
        ref,
      });

      // Decode base64 content if it's a file
      if (response.data.type === 'file' && response.data.content) {
        response.data.decodedContent = Buffer.from(response.data.content, 'base64').toString('utf-8');
      }

      return response.data;
    } catch (error) {
      logger.error('[GitHub] Failed to get file contents', { error: error.message });
      throw error;
    }
  }

  /**
   * Create or update a file
   * @param {Object} options - File options
   * @returns {Promise<Object>} Commit result
   */
  async createOrUpdateFile(options) {
    try {
      const { owner = this.owner, repo = this.repo, path, message, content, branch, sha } = options;

      // Encode content to base64
      const encodedContent = Buffer.from(content).toString('base64');

      const response = await this.octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message,
        content: encodedContent,
        branch,
        sha,
      });

      return response.data;
    } catch (error) {
      logger.error('[GitHub] Failed to create/update file', { error: error.message });
      throw error;
    }
  }

  /**
   * List branches
   * @param {string} owner - Repository owner (optional)
   * @param {string} repo - Repository name (optional)
   * @returns {Promise<Array>} List of branches
   */
  async listBranches(owner = this.owner, repo = this.repo) {
    try {
      const response = await this.octokit.repos.listBranches({
        owner,
        repo,
      });
      return response.data;
    } catch (error) {
      logger.error('[GitHub] Failed to list branches', { error: error.message });
      throw error;
    }
  }

  /**
   * Get authenticated user
   * @returns {Promise<Object>} User information
   */
  async getAuthenticatedUser() {
    try {
      const response = await this.octokit.users.getAuthenticated();
      return response.data;
    } catch (error) {
      logger.error('[GitHub] Failed to get authenticated user', { error: error.message });
      throw error;
    }
  }

  /**
   * Test connection
   * @returns {Promise<boolean>} True if connection is successful
   */
  async testConnection() {
    try {
      await this.getAuthenticatedUser();
      return true;
    } catch (error) {
      logger.error('[GitHub] Connection test failed', { error: error.message });
      return false;
    }
  }
}
