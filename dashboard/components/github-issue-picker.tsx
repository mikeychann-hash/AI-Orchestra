'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Search, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

interface GitHubIssue {
  number: number;
  title: string;
  state: string;
  html_url: string;
  labels: Array<{ name: string; color: string }>;
  created_at: string;
  user: { login: string };
}

interface GitHubIssuePickerProps {
  onSelect: (issue: GitHubIssue) => void;
  owner?: string;
  repo?: string;
  trigger?: React.ReactNode;
}

/**
 * GitHubIssuePicker Component
 *
 * Provides a searchable dialog for selecting GitHub issues:
 * - Search issues by keyword
 * - Display issue metadata (title, labels, state)
 * - Link selected issue to worktree
 */
export function GitHubIssuePicker({ onSelect, owner, repo, trigger }: GitHubIssuePickerProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const results = await api.searchGitHubIssues(searchQuery, owner, repo);
      setIssues(results);
    } catch (err) {
      console.error('[GitHubIssuePicker] Search failed:', err);
      setError('Failed to search issues. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectIssue = (issue: GitHubIssue) => {
    onSelect(issue);
    setOpen(false);
    setSearchQuery('');
    setIssues([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Search className="w-4 h-4 mr-2" />
            Link GitHub Issue
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[600px]">
        <DialogHeader>
          <DialogTitle>Link GitHub Issue</DialogTitle>
          <DialogDescription>
            Search for a GitHub issue to link to this worktree. Context from the issue will be
            automatically injected into prompts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Search Input */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Search issues... (e.g., 'bug auth' or '#123')"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <Button onClick={handleSearch} disabled={loading || !searchQuery.trim()}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </>
              )}
            </Button>
          </div>

          {/* Repository Info */}
          {(owner || repo) && (
            <div className="text-sm text-muted-foreground">
              Searching in: {owner}/{repo}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
              {error}
            </div>
          )}

          {/* Results */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {issues.length === 0 && !loading && searchQuery && (
              <div className="text-center py-8 text-muted-foreground">
                No issues found. Try a different search term.
              </div>
            )}

            {issues.map((issue) => (
              <button
                key={issue.number}
                onClick={() => handleSelectIssue(issue)}
                className="w-full p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">#{issue.number}</span>
                      <Badge
                        variant={issue.state === 'open' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {issue.state}
                      </Badge>
                    </div>
                    <h4 className="font-medium text-sm mb-2 line-clamp-2">{issue.title}</h4>
                    {issue.labels.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {issue.labels.map((label) => (
                          <Badge
                            key={label.name}
                            variant="outline"
                            className="text-xs"
                            style={{
                              borderColor: `#${label.color}`,
                              color: `#${label.color}`,
                            }}
                          >
                            {label.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Opened by {issue.user.login} on{' '}
                      {new Date(issue.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <a
                    href={issue.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </button>
            ))}
          </div>

          {/* Instructions */}
          {issues.length === 0 && !loading && !searchQuery && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="mb-2">Search for GitHub issues to link</p>
              <p className="text-sm">
                You can search by keywords, issue number (#123), or labels
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
