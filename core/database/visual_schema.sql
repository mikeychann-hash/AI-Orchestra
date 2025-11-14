-- Phase 9: Visual Orchestration Database Schema
-- SQLite schema for worktree and zone management

-- Worktrees table
CREATE TABLE IF NOT EXISTS worktrees (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL,
  port INTEGER NOT NULL,
  branch_name TEXT NOT NULL,
  issue_url TEXT,
  task_id TEXT,
  status TEXT DEFAULT 'active',
  position_x INTEGER DEFAULT 0,
  position_y INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  UNIQUE(port)
);

-- Zones table
CREATE TABLE IF NOT EXISTS zones (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  trigger TEXT DEFAULT 'onDrop',
  agents TEXT, -- JSON array
  prompt_template TEXT,
  actions TEXT, -- JSON array
  position_x INTEGER DEFAULT 0,
  position_y INTEGER DEFAULT 0,
  size_width INTEGER DEFAULT 300,
  size_height INTEGER DEFAULT 200,
  created_at TEXT NOT NULL,
  updated_at TEXT
);

-- Worktree-Zone assignments
CREATE TABLE IF NOT EXISTS worktree_zones (
  worktree_id TEXT NOT NULL,
  zone_id TEXT NOT NULL,
  assigned_at TEXT NOT NULL,
  PRIMARY KEY (worktree_id),
  FOREIGN KEY (worktree_id) REFERENCES worktrees(id) ON DELETE CASCADE,
  FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE CASCADE
);

-- Execution history
CREATE TABLE IF NOT EXISTS zone_executions (
  id TEXT PRIMARY KEY,
  zone_id TEXT NOT NULL,
  worktree_id TEXT NOT NULL,
  agent_type TEXT NOT NULL,
  prompt TEXT NOT NULL,
  result TEXT,
  success INTEGER DEFAULT 1,
  executed_at TEXT NOT NULL,
  FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE CASCADE,
  FOREIGN KEY (worktree_id) REFERENCES worktrees(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_worktrees_status ON worktrees(status);
CREATE INDEX IF NOT EXISTS idx_worktrees_port ON worktrees(port);
CREATE INDEX IF NOT EXISTS idx_zones_trigger ON zones(trigger);
CREATE INDEX IF NOT EXISTS idx_worktree_zones_zone ON worktree_zones(zone_id);
CREATE INDEX IF NOT EXISTS idx_executions_zone ON zone_executions(zone_id);
CREATE INDEX IF NOT EXISTS idx_executions_worktree ON zone_executions(worktree_id);
CREATE INDEX IF NOT EXISTS idx_executions_timestamp ON zone_executions(executed_at);
