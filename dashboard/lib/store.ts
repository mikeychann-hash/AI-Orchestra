import { create } from 'zustand';
import type {
  SystemStatus,
  AgentLog,
  Build,
  Artifact,
  Agent,
  WebSocketMessage,
} from '@/types';

interface DashboardStore {
  // System status
  systemStatus: SystemStatus | null;
  setSystemStatus: (status: SystemStatus) => void;

  // Agents
  agents: Agent[];
  setAgents: (agents: Agent[]) => void;
  updateAgent: (id: string, updates: Partial<Agent>) => void;

  // Logs
  logs: AgentLog[];
  addLog: (log: AgentLog) => void;
  clearLogs: () => void;
  filterLogLevel: 'all' | 'info' | 'warn' | 'error' | 'debug';
  setFilterLogLevel: (level: 'all' | 'info' | 'warn' | 'error' | 'debug') => void;

  // Builds
  builds: Build[];
  currentBuild: Build | null;
  addBuild: (build: Build) => void;
  updateBuild: (id: string, updates: Partial<Build>) => void;
  setCurrentBuild: (build: Build | null) => void;

  // Artifacts
  artifacts: Artifact[];
  addArtifact: (artifact: Artifact) => void;
  setArtifacts: (artifacts: Artifact[]) => void;

  // WebSocket
  isConnected: boolean;
  setIsConnected: (connected: boolean) => void;
  handleWebSocketMessage: (message: WebSocketMessage) => void;

  // UI State
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;

  // Phase 9: Workflow Canvas
  worktrees: any[];
  setWorktrees: (worktrees: any[]) => void;
  addWorktree: (worktree: any) => void;
  updateWorktree: (id: string, updates: Partial<any>) => void;
  removeWorktree: (id: string) => void;

  zones: any[];
  setZones: (zones: any[]) => void;
  addZone: (zone: any) => void;
  updateZone: (id: string, updates: Partial<any>) => void;
  removeZone: (id: string) => void;
}

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  // System status
  systemStatus: null,
  setSystemStatus: (status) => set({ systemStatus: status }),

  // Agents
  agents: [],
  setAgents: (agents) => set({ agents }),
  updateAgent: (id, updates) =>
    set((state) => ({
      agents: state.agents.map((agent) =>
        agent.id === id ? { ...agent, ...updates } : agent
      ),
    })),

  // Logs
  logs: [],
  addLog: (log) =>
    set((state) => ({
      logs: [log, ...state.logs].slice(0, 1000), // Keep last 1000 logs
    })),
  clearLogs: () => set({ logs: [] }),
  filterLogLevel: 'all',
  setFilterLogLevel: (level) => set({ filterLogLevel: level }),

  // Builds
  builds: [],
  currentBuild: null,
  addBuild: (build) =>
    set((state) => ({
      builds: [build, ...state.builds],
      currentBuild: build,
    })),
  updateBuild: (id, updates) =>
    set((state) => ({
      builds: state.builds.map((build) =>
        build.id === id ? { ...build, ...updates } : build
      ),
      currentBuild:
        state.currentBuild?.id === id
          ? { ...state.currentBuild, ...updates }
          : state.currentBuild,
    })),
  setCurrentBuild: (build) => set({ currentBuild: build }),

  // Artifacts
  artifacts: [],
  addArtifact: (artifact) =>
    set((state) => ({
      artifacts: [artifact, ...state.artifacts],
    })),
  setArtifacts: (artifacts) => set({ artifacts }),

  // WebSocket
  isConnected: false,
  setIsConnected: (connected) => set({ isConnected: connected }),
  handleWebSocketMessage: (message) => {
    const { type, data } = message;

    switch (type) {
      case 'log':
        get().addLog(data);
        break;

      case 'status':
        get().setSystemStatus(data);
        break;

      case 'build':
        if (data.action === 'create') {
          get().addBuild(data.build);
        } else if (data.action === 'update') {
          get().updateBuild(data.build.id, data.build);
        }
        break;

      case 'agent':
        if (data.action === 'update') {
          get().updateAgent(data.agent.id, data.agent);
        }
        break;

      case 'artifact':
        if (data.action === 'create') {
          get().addArtifact(data.artifact);
        }
        break;

      default:
        console.warn('[Store] Unknown WebSocket message type:', type);
    }
  },

  // UI State
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  theme: 'dark',
  setTheme: (theme) => set({ theme }),

  // Phase 9: Workflow Canvas
  worktrees: [],
  setWorktrees: (worktrees) => set({ worktrees }),
  addWorktree: (worktree) =>
    set((state) => ({
      worktrees: [...state.worktrees, worktree],
    })),
  updateWorktree: (id, updates) =>
    set((state) => ({
      worktrees: state.worktrees.map((wt) =>
        wt.id === id ? { ...wt, ...updates } : wt
      ),
    })),
  removeWorktree: (id) =>
    set((state) => ({
      worktrees: state.worktrees.filter((wt) => wt.id !== id),
    })),

  zones: [],
  setZones: (zones) => set({ zones }),
  addZone: (zone) =>
    set((state) => ({
      zones: [...state.zones, zone],
    })),
  updateZone: (id, updates) =>
    set((state) => ({
      zones: state.zones.map((zone) =>
        zone.id === id ? { ...zone, ...updates } : zone
      ),
    })),
  removeZone: (id) =>
    set((state) => ({
      zones: state.zones.filter((zone) => zone.id !== id),
    })),
}));
