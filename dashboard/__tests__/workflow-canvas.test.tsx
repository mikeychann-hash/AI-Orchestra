import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { WorkflowCanvas } from '@/components/workflow-canvas';
import { api } from '@/lib/api';
import { useDashboardStore } from '@/lib/store';

// Mock the API
vi.mock('@/lib/api', () => ({
  api: {
    getWorktrees: vi.fn(),
    getZones: vi.fn(),
    assignWorktreeToZone: vi.fn(),
    updateNodePosition: vi.fn(),
  },
}));

// Mock ReactFlow
vi.mock('reactflow', () => ({
  default: ({ children, nodes, edges }: any) => (
    <div data-testid="react-flow">
      <div data-testid="nodes-count">{nodes?.length || 0}</div>
      <div data-testid="edges-count">{edges?.length || 0}</div>
      {children}
    </div>
  ),
  Background: () => <div data-testid="background" />,
  Controls: () => <div data-testid="controls" />,
  MiniMap: () => <div data-testid="minimap" />,
  useNodesState: (initial: any) => {
    const [nodes, setNodes] = React.useState(initial);
    const onNodesChange = vi.fn();
    return [nodes, setNodes, onNodesChange];
  },
  useEdgesState: (initial: any) => {
    const [edges, setEdges] = React.useState(initial);
    const onEdgesChange = vi.fn();
    return [edges, setEdges, onEdgesChange];
  },
  addEdge: vi.fn(),
  BackgroundVariant: { Dots: 'dots' },
}));

// Mock CanvasToolbar
vi.mock('@/components/canvas-toolbar', () => ({
  CanvasToolbar: ({ onZoneCreated, onWorktreeCreated }: any) => (
    <div data-testid="canvas-toolbar">
      <button onClick={() => onZoneCreated?.({ id: 'zone-1' })}>Create Zone</button>
      <button onClick={() => onWorktreeCreated?.({ id: 'wt-1' })}>Create Worktree</button>
    </div>
  ),
}));

describe('WorkflowCanvas', () => {
  const mockWorktrees = [
    {
      id: 'wt-1',
      branchName: 'feature-auth',
      port: 3001,
      status: 'active',
      position: { x: 100, y: 100 },
    },
    {
      id: 'wt-2',
      branchName: 'feature-ui',
      port: 3002,
      status: 'idle',
      position: { x: 200, y: 100 },
    },
  ];

  const mockZones = [
    {
      id: 'zone-dev',
      name: 'Development',
      description: 'Active development',
      trigger: 'onDrop',
      position: { x: 50, y: 50 },
      size: { width: 400, height: 300 },
    },
    {
      id: 'zone-test',
      name: 'Testing',
      description: 'QA testing',
      trigger: 'manual',
      position: { x: 500, y: 50 },
      size: { width: 400, height: 300 },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (api.getWorktrees as any).mockResolvedValue(mockWorktrees);
    (api.getZones as any).mockResolvedValue(mockZones);
  });

  it('should render loading state initially', () => {
    (api.getWorktrees as any).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockWorktrees), 1000))
    );
    (api.getZones as any).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockZones), 1000))
    );

    render(<WorkflowCanvas />);

    expect(screen.getByText('Loading workflow canvas...')).toBeInTheDocument();
  });

  it('should load and display worktrees and zones', async () => {
    render(<WorkflowCanvas />);

    await waitFor(() => {
      expect(api.getWorktrees).toHaveBeenCalled();
      expect(api.getZones).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading workflow canvas...')).not.toBeInTheDocument();
    });
  });

  it('should render ReactFlow components', async () => {
    render(<WorkflowCanvas />);

    await waitFor(() => {
      expect(screen.getByTestId('react-flow')).toBeInTheDocument();
      expect(screen.getByTestId('background')).toBeInTheDocument();
      expect(screen.getByTestId('controls')).toBeInTheDocument();
      expect(screen.getByTestId('minimap')).toBeInTheDocument();
    });
  });

  it('should render canvas toolbar', async () => {
    render(<WorkflowCanvas />);

    await waitFor(() => {
      expect(screen.getByTestId('canvas-toolbar')).toBeInTheDocument();
    });
  });

  it('should display connection status indicator', async () => {
    render(<WorkflowCanvas />);

    await waitFor(() => {
      expect(screen.getByText(/Connected|Disconnected/)).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (api.getWorktrees as any).mockRejectedValue(new Error('API Error'));
    (api.getZones as any).mockRejectedValue(new Error('API Error'));

    render(<WorkflowCanvas />);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[WorkflowCanvas] Failed to load canvas data'),
        expect.any(Error)
      );
    });

    // Should still render (not crash)
    expect(screen.queryByText('Loading workflow canvas...')).not.toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it('should create correct number of nodes for worktrees and zones', async () => {
    render(<WorkflowCanvas />);

    await waitFor(() => {
      const nodesCount = screen.getByTestId('nodes-count');
      // 2 worktrees + 2 zones = 4 nodes
      expect(nodesCount.textContent).toBe('4');
    });
  });

  it('should handle zone creation from toolbar', async () => {
    render(<WorkflowCanvas />);

    await waitFor(() => {
      expect(screen.getByTestId('canvas-toolbar')).toBeInTheDocument();
    });

    // The toolbar mock should be able to create zones
    const createZoneButton = screen.getByText('Create Zone');
    expect(createZoneButton).toBeInTheDocument();
  });

  it('should handle worktree creation from toolbar', async () => {
    render(<WorkflowCanvas />);

    await waitFor(() => {
      expect(screen.getByTestId('canvas-toolbar')).toBeInTheDocument();
    });

    const createWorktreeButton = screen.getByText('Create Worktree');
    expect(createWorktreeButton).toBeInTheDocument();
  });

  it('should set up store with initial data', async () => {
    const store = useDashboardStore.getState();
    const setWorktreesSpy = vi.spyOn(store, 'setWorktrees');
    const setZonesSpy = vi.spyOn(store, 'setZones');

    render(<WorkflowCanvas />);

    await waitFor(() => {
      expect(setWorktreesSpy).toHaveBeenCalledWith(mockWorktrees);
      expect(setZonesSpy).toHaveBeenCalledWith(mockZones);
    });
  });

  it('should render with default viewport settings', async () => {
    render(<WorkflowCanvas />);

    await waitFor(() => {
      const reactFlow = screen.getByTestId('react-flow');
      expect(reactFlow).toBeInTheDocument();
    });
  });
});
