import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WorktreeCard } from '@/components/worktree-card';
import { api } from '@/lib/api';
import { useDashboardStore } from '@/lib/store';

// Mock the API
vi.mock('@/lib/api', () => ({
  api: {
    deleteWorktree: vi.fn(),
  },
}));

// Mock ReactFlow
vi.mock('reactflow', () => ({
  Handle: ({ position, type }: any) => (
    <div data-testid={`handle-${type}-${position}`}>{position}</div>
  ),
  Position: {
    Top: 'top',
    Bottom: 'bottom',
    Left: 'left',
    Right: 'right',
  },
}));

describe('WorktreeCard', () => {
  const mockWorktreeData = {
    id: 'wt-123',
    branchName: 'feature-auth',
    port: 3001,
    status: 'active',
    issueUrl: 'https://github.com/owner/repo/issues/123',
    issueTitle: 'Add authentication',
    taskId: 'TASK-123',
    agentStatus: 'running',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render worktree card with basic information', () => {
    render(<WorktreeCard id="wt-123" data={mockWorktreeData} />);

    expect(screen.getByText('feature-auth')).toBeInTheDocument();
    expect(screen.getByText('3001')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('should render GitHub issue link when issueUrl is provided', () => {
    render(<WorktreeCard id="wt-123" data={mockWorktreeData} />);

    const issueLink = screen.getByText('Add authentication');
    expect(issueLink).toBeInTheDocument();
    expect(issueLink.closest('a')).toHaveAttribute(
      'href',
      'https://github.com/owner/repo/issues/123'
    );
  });

  it('should render agent status when agentStatus is provided', () => {
    render(<WorktreeCard id="wt-123" data={mockWorktreeData} />);

    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('should render task ID when taskId is provided', () => {
    render(<WorktreeCard id="wt-123" data={mockWorktreeData} />);

    expect(screen.getByText(/Task: TASK-123/)).toBeInTheDocument();
  });

  it('should open dropdown menu when clicking more button', async () => {
    render(<WorktreeCard id="wt-123" data={mockWorktreeData} />);

    const moreButton = screen.getByRole('button', { name: '' });
    fireEvent.click(moreButton);

    await waitFor(() => {
      expect(screen.getByText('Open in Browser')).toBeInTheDocument();
      expect(screen.getByText('Delete Worktree')).toBeInTheDocument();
    });
  });

  it('should call deleteWorktree when delete is clicked', async () => {
    const mockDeleteWorktree = vi.fn();
    (api.deleteWorktree as any).mockResolvedValue({});

    render(<WorktreeCard id="wt-123" data={mockWorktreeData} />);

    // Open dropdown
    const moreButton = screen.getByRole('button', { name: '' });
    fireEvent.click(moreButton);

    // Click delete
    await waitFor(() => {
      const deleteButton = screen.getByText('Delete Worktree');
      fireEvent.click(deleteButton);
    });

    await waitFor(() => {
      expect(api.deleteWorktree).toHaveBeenCalledWith('wt-123');
    });
  });

  it('should render correct status color based on status', () => {
    const { rerender } = render(
      <WorktreeCard id="wt-123" data={{ ...mockWorktreeData, status: 'active' }} />
    );

    let statusIndicator = document.querySelector('.bg-green-500');
    expect(statusIndicator).toBeInTheDocument();

    rerender(<WorktreeCard id="wt-123" data={{ ...mockWorktreeData, status: 'idle' }} />);
    statusIndicator = document.querySelector('.bg-yellow-500');
    expect(statusIndicator).toBeInTheDocument();

    rerender(<WorktreeCard id="wt-123" data={{ ...mockWorktreeData, status: 'error' }} />);
    statusIndicator = document.querySelector('.bg-red-500');
    expect(statusIndicator).toBeInTheDocument();
  });

  it('should handle missing optional fields gracefully', () => {
    const minimalData = {
      id: 'wt-456',
      branchName: 'hotfix-bug',
    };

    render(<WorktreeCard id="wt-456" data={minimalData} />);

    expect(screen.getByText('hotfix-bug')).toBeInTheDocument();
    expect(screen.queryByText(/Port:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Task:/)).not.toBeInTheDocument();
  });

  it('should render ReactFlow handles', () => {
    render(<WorktreeCard id="wt-123" data={mockWorktreeData} />);

    expect(screen.getByTestId('handle-target-top')).toBeInTheDocument();
    expect(screen.getByTestId('handle-source-bottom')).toBeInTheDocument();
  });
});
