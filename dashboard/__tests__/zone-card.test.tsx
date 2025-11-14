import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ZoneCard } from '@/components/zone-card';
import { api } from '@/lib/api';

// Mock the API
vi.mock('@/lib/api', () => ({
  api: {
    deleteZone: vi.fn(),
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

describe('ZoneCard', () => {
  const mockZoneData = {
    id: 'zone-dev',
    name: 'Development',
    description: 'Active development work',
    trigger: 'onDrop',
    agents: ['frontend', 'backend'],
    promptTemplate: 'Implement the feature: {{ github.title }}',
    actions: [{ type: 'runTests' }, { type: 'notify' }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render zone card with basic information', () => {
    render(<ZoneCard id="zone-dev" data={mockZoneData} />);

    expect(screen.getByText('Development')).toBeInTheDocument();
    expect(screen.getByText('Active development work')).toBeInTheDocument();
  });

  it('should render trigger badge when trigger is provided', () => {
    render(<ZoneCard id="zone-dev" data={mockZoneData} />);

    expect(screen.getByText('onDrop')).toBeInTheDocument();
  });

  it('should render agents list when agents are provided', () => {
    render(<ZoneCard id="zone-dev" data={mockZoneData} />);

    expect(screen.getByText('Agents:')).toBeInTheDocument();
    expect(screen.getByText('frontend')).toBeInTheDocument();
    expect(screen.getByText('backend')).toBeInTheDocument();
  });

  it('should render prompt template preview when promptTemplate is provided', () => {
    render(<ZoneCard id="zone-dev" data={mockZoneData} />);

    expect(screen.getByText(/Prompt:/)).toBeInTheDocument();
    expect(screen.getByText(/Implement the feature/)).toBeInTheDocument();
  });

  it('should render actions when actions are provided', () => {
    render(<ZoneCard id="zone-dev" data={mockZoneData} />);

    expect(screen.getByText(/Actions:/)).toBeInTheDocument();
    expect(screen.getByText(/runTests, notify/)).toBeInTheDocument();
  });

  it('should truncate long prompt templates', () => {
    const longPrompt = 'A'.repeat(150);
    const dataWithLongPrompt = {
      ...mockZoneData,
      promptTemplate: longPrompt,
    };

    render(<ZoneCard id="zone-dev" data={dataWithLongPrompt} />);

    const promptText = screen.getByText(/Prompt:/);
    expect(promptText.textContent).toContain('...');
    expect(promptText.textContent?.length).toBeLessThan(longPrompt.length);
  });

  it('should open dropdown menu when clicking more button', async () => {
    render(<ZoneCard id="zone-dev" data={mockZoneData} />);

    const moreButton = screen.getByRole('button', { name: '' });
    fireEvent.click(moreButton);

    await waitFor(() => {
      expect(screen.getByText('Edit Zone')).toBeInTheDocument();
      expect(screen.getByText('Delete Zone')).toBeInTheDocument();
    });
  });

  it('should call deleteZone when delete is clicked', async () => {
    (api.deleteZone as any).mockResolvedValue({});

    render(<ZoneCard id="zone-dev" data={mockZoneData} />);

    // Open dropdown
    const moreButton = screen.getByRole('button', { name: '' });
    fireEvent.click(moreButton);

    // Click delete
    await waitFor(() => {
      const deleteButton = screen.getByText('Delete Zone');
      fireEvent.click(deleteButton);
    });

    await waitFor(() => {
      expect(api.deleteZone).toHaveBeenCalledWith('zone-dev');
    });
  });

  it('should log when edit is clicked', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    render(<ZoneCard id="zone-dev" data={mockZoneData} />);

    // Open dropdown
    const moreButton = screen.getByRole('button', { name: '' });
    fireEvent.click(moreButton);

    // Click edit
    await waitFor(() => {
      const editButton = screen.getByText('Edit Zone');
      fireEvent.click(editButton);
    });

    expect(consoleSpy).toHaveBeenCalledWith('[ZoneCard] Edit zone:', 'zone-dev');
    consoleSpy.mockRestore();
  });

  it('should apply correct trigger color based on trigger type', () => {
    const { rerender } = render(
      <ZoneCard id="zone-1" data={{ ...mockZoneData, trigger: 'onDrop' }} />
    );

    let triggerBadge = screen.getByText('onDrop');
    expect(triggerBadge).toHaveClass('text-blue-600');

    rerender(<ZoneCard id="zone-1" data={{ ...mockZoneData, trigger: 'manual' }} />);
    triggerBadge = screen.getByText('manual');
    expect(triggerBadge).toHaveClass('text-purple-600');

    rerender(<ZoneCard id="zone-1" data={{ ...mockZoneData, trigger: 'scheduled' }} />);
    triggerBadge = screen.getByText('scheduled');
    expect(triggerBadge).toHaveClass('text-orange-600');
  });

  it('should handle missing optional fields gracefully', () => {
    const minimalData = {
      id: 'zone-minimal',
      name: 'Minimal Zone',
    };

    render(<ZoneCard id="zone-minimal" data={minimalData} />);

    expect(screen.getByText('Minimal Zone')).toBeInTheDocument();
    expect(screen.queryByText('Agents:')).not.toBeInTheDocument();
    expect(screen.queryByText(/Prompt:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Actions:/)).not.toBeInTheDocument();
  });

  it('should render drop zone hint', () => {
    render(<ZoneCard id="zone-dev" data={mockZoneData} />);

    expect(screen.getByText('Drop worktree here')).toBeInTheDocument();
    expect(screen.getByText('Triggers automatically on drop')).toBeInTheDocument();
  });

  it('should not show auto-trigger hint for manual zones', () => {
    render(<ZoneCard id="zone-dev" data={{ ...mockZoneData, trigger: 'manual' }} />);

    expect(screen.getByText('Drop worktree here')).toBeInTheDocument();
    expect(screen.queryByText('Triggers automatically on drop')).not.toBeInTheDocument();
  });
});
