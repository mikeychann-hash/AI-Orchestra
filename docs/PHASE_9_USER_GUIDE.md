# Phase 9: Visual Orchestration - User Guide

**AI Orchestra Phase 9** brings a revolutionary visual canvas for managing Git worktrees and orchestrating AI agent workflows with drag-and-drop simplicity.

---

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Visual Canvas Basics](#visual-canvas-basics)
4. [Working with Worktrees](#working-with-worktrees)
5. [Working with Zones](#working-with-zones)
6. [Drag-and-Drop Workflows](#drag-and-drop-workflows)
7. [GitHub Integration](#github-integration)
8. [Zone Triggers and Automation](#zone-triggers-and-automation)
9. [Understanding Execution Results](#understanding-execution-results)
10. [Troubleshooting](#troubleshooting)
11. [Best Practices](#best-practices)

---

## Overview

### What is Phase 9?

Phase 9 transforms AI Orchestra from a CLI-based system into a visual workflow orchestration platform. Instead of managing Git branches and agent tasks through commands, you can:

- **Visualize your work** on an interactive 2D canvas
- **Create isolated environments** (worktrees) for each feature or issue
- **Define workflow zones** where AI agents automatically activate
- **Drag and drop** worktrees into zones to trigger AI assistance
- **Link GitHub issues** directly to your development environments
- **Monitor real-time** execution across all your workflows

### Key Concepts

**Worktree**: An isolated Git working directory with its own branch and development server (on a unique port). Think of it as a "workspace" for a specific feature or bug fix.

**Zone**: A visual boundary on the canvas representing a workflow stage (e.g., Development, Testing, Review). When you drop a worktree into a zone, configured AI agents automatically execute.

**Trigger**: An event that activates zone automation (e.g., `onDrop` when you drag a worktree into the zone).

**GitHub Context**: Information pulled from a linked GitHub issue or PR that agents use to understand what to build.

---

## Getting Started

### Prerequisites

- AI Orchestra Phase 8 or later installed
- Git repository initialized
- At least one LLM provider configured (OpenAI, Grok, or Ollama)
- GitHub token (optional, for issue integration)

### Enabling Phase 9

Phase 9 is controlled by a feature flag. To enable it:

1. **Start AI Orchestra:**
   ```bash
   npm start
   ```

2. **Access the Dashboard:**
   Open your browser to `http://localhost:3001`

3. **Navigate to Visual Canvas:**
   Click "Canvas" or "Visual Orchestration" in the sidebar

4. **Verify Installation:**
   You should see an empty canvas with a toolbar at the top

### First-Time Setup

Run the migration script to set up the database and create default zones:

```bash
node scripts/migrate_to_phase9.js
```

This creates four default zones:
- **Development** - For feature implementation
- **Testing** - For QA and test writing
- **Code Review** - For code review and PR creation
- **Deployment** - For deployment preparation

---

## Visual Canvas Basics

### Canvas Interface

The canvas is your main workspace, consisting of:

**Toolbar (Top)**:
- **Create Zone** - Add a new workflow zone
- **Create Worktree** - Add a new Git worktree
- **Settings** - Canvas configuration (future)

**Main Canvas**:
- 2D grid background with dots pattern
- Zoom controls (bottom-right): 0.2x to 2x zoom
- Mini-map (bottom-left): Navigate large canvases
- Connection status indicator (top-right)

**Navigation**:
- **Pan**: Click and drag the background
- **Zoom**: Use mouse wheel or zoom controls
- **Select**: Click a worktree or zone to select
- **Drag**: Click and drag worktrees to move them

### Canvas Controls

| Action | Shortcut | Description |
|--------|----------|-------------|
| Pan canvas | Click + Drag background | Move your view around |
| Zoom in | Mouse wheel up | Zoom into details |
| Zoom out | Mouse wheel down | See more of the canvas |
| Select item | Left click | Select worktree or zone |
| Move worktree | Click + Drag card | Reposition worktree |
| Reset view | Double-click background | Center and reset zoom |

---

## Working with Worktrees

### What is a Git Worktree?

A Git worktree is a separate checkout of your repository, allowing you to work on multiple branches simultaneously without switching contexts. Each worktree:

- Has its own working directory
- Runs on a unique port (3001-3999)
- Contains an isolated copy of your code
- Can be linked to a GitHub issue

### Creating a Worktree

**Via UI:**

1. Click **"Create Worktree"** in the toolbar
2. Fill in the dialog:
   - **Branch Name** (required): e.g., `feature/new-ui`
   - **GitHub Issue URL** (optional): Link to an issue or PR
   - **Task ID** (optional): Custom task identifier
3. Click **"Create Worktree"**

The system automatically:
- Creates a Git worktree in `.worktrees/[branch-name]/`
- Allocates a unique port (e.g., 3001)
- Creates or checks out the specified branch
- Fetches GitHub context if an issue URL is provided
- Adds a card to the canvas

**Branch Naming Rules:**
- Only letters, numbers, `-`, `_`, and `/` allowed
- Examples: `feature/login`, `fix/bug-123`, `dev_new-feature`

**Screenshot Description:**
*A worktree card appears on the canvas showing the branch name "feature/new-ui", port 3001, status "active" (green indicator), and linked GitHub issue title.*

### Understanding Worktree Cards

Each worktree card displays:

**Header:**
- Branch name (e.g., `feature/new-ui`)
- Status indicator:
  - 🟢 Green = Active
  - 🟡 Yellow = Idle
  - 🔴 Red = Error

**Body:**
- **Port**: Development server port (e.g., `Port: 3001`)
- **Issue**: Linked GitHub issue title (if linked)
- **Task ID**: Custom task identifier (if set)
- **Agent Status**: Current agent activity (running/idle)

**Actions (⋮ menu):**
- **Open in Browser** - Opens `http://localhost:[port]`
- **Delete** - Removes worktree and frees port

### Managing Worktrees

**Opening a Worktree:**
1. Click the ⋮ menu on the worktree card
2. Select "Open in Browser"
3. Your worktree opens at `http://localhost:[port]`

**Deleting a Worktree:**
1. Click the ⋮ menu on the worktree card
2. Select "Delete"
3. Confirm the deletion
4. Git worktree is removed, port is freed

**Moving a Worktree:**
- Click and drag the card to reposition it
- Position is saved automatically

**Updating Worktree Info:**
- Worktrees update in real-time via WebSocket
- Status changes reflect immediately
- No manual refresh needed

---

## Working with Zones

### What is a Zone?

A zone is a visual boundary representing a stage in your workflow. Zones contain:

- **Name and description** - What this stage is for
- **Trigger type** - When automation executes
- **Configured agents** - Which AI agents will run
- **Prompt template** - Instructions for the agents
- **Actions** - Post-execution tasks (run tests, create PR, etc.)

### Creating a Zone

**Via UI:**

1. Click **"Create Zone"** in the toolbar
2. Fill in the dialog:
   - **Zone Name** (required): e.g., "Development"
   - **Description** (optional): "Active development work"
   - **Trigger Type**:
     - `onDrop` - Execute when worktree is dropped in
     - `manual` - Execute on manual trigger only
     - `scheduled` - Execute on schedule (future feature)
3. Click **"Create Zone"**

The zone appears on the canvas as a dashed boundary box.

**Screenshot Description:**
*A zone appears as a large dashed rectangle with the name "Development" at the top, trigger badge "On Drop" in blue, and a list of configured agents.*

### Understanding Zone Cards

Each zone displays:

**Header:**
- Zone name (e.g., "Development")
- Trigger badge:
  - 🔵 Blue = onDrop
  - 🟣 Purple = manual
  - 🟠 Orange = scheduled

**Body:**
- **Description**: What this zone is for
- **Agents**: List of configured AI agents
- **Prompt Preview**: First few lines of the prompt template
- **Actions**: Configured post-execution actions

**Drop Hint:**
- "Drop worktrees here to trigger execution"
- Appears when zone has onDrop trigger

**Actions (⋮ menu):**
- **Edit** - Modify zone configuration
- **Delete** - Remove zone (doesn't delete worktrees inside)

### Editing Zones

**To modify a zone:**

1. Click the ⋮ menu on the zone card
2. Select "Edit"
3. Modify any fields:
   - Name, description, trigger type
   - Agents list (comma-separated)
   - Prompt template with variables
   - Actions configuration
4. Click "Save Changes"

**Prompt Template Variables:**

Zones support dynamic variables that are replaced at execution time:

**GitHub Context:**
- `{{ github.title }}` - Issue or PR title
- `{{ github.description }}` - Issue or PR body
- `{{ github.number }}` - Issue or PR number
- `{{ github.url }}` - Full GitHub URL
- `{{ github.author }}` - GitHub username
- `{{ github.state }}` - open/closed
- `{{ github.labels }}` - Comma-separated labels
- `{{ github.branch }}` - Head/base branch

**Worktree Context:**
- `{{ worktree.id }}` - Unique worktree ID
- `{{ worktree.port }}` - Assigned port number
- `{{ worktree.path }}` - Filesystem path
- `{{ worktree.branch }}` - Branch name
- `{{ worktree.issue_url }}` - Linked GitHub URL

**Example Prompt Template:**
```
You are working on: {{ github.title }}

Issue Description:
{{ github.description }}

Branch: {{ worktree.branch }}
Path: {{ worktree.path }}
Port: {{ worktree.port }}

Please implement the feature following best practices.
```

### Configuring Zone Agents

**Available Agents:**
- `frontend` - Frontend development tasks
- `backend` - Backend development tasks
- `qa` - Quality assurance and testing
- `test-engineer` - Test writing and execution
- `code-reviewer` - Code review
- `devops` - Deployment and infrastructure

**To configure agents:**
1. Edit the zone
2. Enter agent names (comma-separated): `frontend, backend, qa`
3. Save the zone

When the zone executes, all configured agents run in parallel.

### Configuring Zone Actions

Actions execute after agents complete. Available actions:

**runTests:**
```json
{ "type": "runTests" }
```
Executes the project's test suite in the worktree.

**createPR:**
```json
{
  "type": "createPR",
  "title": "{{ github.title }}",
  "body": "Automated PR for {{ github.number }}"
}
```
Creates a pull request on GitHub.

**notify:**
```json
{
  "type": "notify",
  "message": "Zone execution completed"
}
```
Sends a notification (WebSocket, email, etc.).

**webhook:**
```json
{
  "type": "webhook",
  "url": "https://api.example.com/webhook",
  "method": "POST"
}
```
Calls an external webhook.

---

## Drag-and-Drop Workflows

### Basic Drag-and-Drop

**To assign a worktree to a zone:**

1. **Click** on a worktree card to select it
2. **Drag** the card across the canvas
3. **Drop** it inside a zone boundary
4. **Watch** the automation execute (if trigger is `onDrop`)

**Visual Feedback:**
- Zone highlights when worktree is dragged over it
- Drop shadow indicates valid drop target
- Status updates show in real-time

**Screenshot Description:**
*User drags a worktree card over a zone boundary. The zone highlights with a blue border. On drop, a progress indicator appears and execution results display.*

### What Happens on Drop?

When you drop a worktree into a zone with `onDrop` trigger:

1. **Assignment**: Worktree is assigned to the zone
2. **Context Injection**: GitHub context is fetched (if linked)
3. **Prompt Generation**: Template variables are replaced
4. **Agent Execution**: All configured agents run in parallel
5. **Actions**: Configured actions execute
6. **Results Display**: Execution results appear

### Manual Triggers

For zones with `manual` trigger:

1. Drop the worktree into the zone (assigns it)
2. Click the zone's **"Execute"** button (when implemented)
3. Automation runs on demand

---

## GitHub Integration

### Linking a Worktree to a GitHub Issue

**When creating a worktree:**
1. Enter the GitHub issue or PR URL in the "GitHub Issue URL" field
2. Format: `https://github.com/owner/repo/issues/123`
3. Or: `https://github.com/owner/repo/pull/456`

**What gets fetched:**
- Issue/PR title
- Description (body content)
- Labels
- State (open/closed)
- Author
- Branch information (for PRs)

**Caching:**
- GitHub context is cached for 5 minutes
- Reduces API rate limit usage
- Fresh data on first fetch

### GitHub Issue Picker (Future Feature)

The issue picker UI will allow:
- Searching issues by query
- Filtering by repository
- Viewing issue metadata (labels, state, author)
- One-click linking

### GitHub Rate Limits

**Rate Limits:**
- Authenticated: 5,000 requests/hour
- Unauthenticated: 60 requests/hour

**Best Practices:**
- Set `GITHUB_TOKEN` in `.env` for higher limits
- Use issue URLs sparingly (leverage caching)
- Monitor rate limit headers

**If rate limited:**
- System uses cached data if available
- Logs warning message
- Continues execution without GitHub context

---

## Zone Triggers and Automation

### Trigger Types

**onDrop:**
- Executes immediately when worktree is dropped into zone
- Best for: Development, Testing, Review workflows
- Example: "Start implementing the feature"

**manual:**
- Executes only when manually triggered
- Best for: Deployment, expensive operations
- Example: "Deploy to production"

**scheduled (Future):**
- Executes on a cron schedule
- Best for: Nightly tests, periodic checks
- Example: "Run security scans every night"

### Execution Flow

When a zone trigger executes:

```
1. Zone Activated
   ↓
2. GitHub Context Fetched (if worktree has issue URL)
   ↓
3. Prompt Template Processed (variables replaced)
   ↓
4. Agents Execute in Parallel
   ├─→ Frontend Agent
   ├─→ Backend Agent
   └─→ QA Agent
   ↓
5. Actions Execute Sequentially
   ├─→ Run Tests
   └─→ Create PR
   ↓
6. Results Emitted (WebSocket)
   ↓
7. Execution History Recorded
```

### Monitoring Execution

**Real-Time Updates:**
- WebSocket connection shows live execution status
- Progress indicators on zone cards
- Agent activity displayed on worktree cards

**Execution Results:**
- Success/failure status per agent
- Token usage statistics
- Execution timestamp
- Full result data

**Screenshot Description:**
*After zone execution, a results panel shows: "Frontend Agent: ✓ Success (1,234 tokens), Backend Agent: ✓ Success (2,345 tokens), Total execution: 3.2s"*

---

## Understanding Execution Results

### Result Data

Each agent execution returns:

**Success Response:**
```json
{
  "agentType": "frontend",
  "success": true,
  "result": {
    "text": "Feature implemented successfully...",
    "usage": {
      "promptTokens": 1000,
      "completionTokens": 234,
      "totalTokens": 1234
    }
  }
}
```

**Failure Response:**
```json
{
  "agentType": "backend",
  "success": false,
  "error": "LLM request failed: Rate limit exceeded"
}
```

### Viewing Execution History

**To view past executions:**

1. Navigate to the zone
2. Click "View History" (in zone menu)
3. See chronological list of executions

**History includes:**
- Timestamp
- Worktree involved
- Agents executed
- Success/failure status
- Full prompts and results

### Token Usage Tracking

Monitor LLM token usage:
- Per-execution token counts
- Cumulative usage statistics
- Cost estimation (based on provider pricing)

---

## Troubleshooting

### Common Issues

#### Issue: "No available ports in range"

**Cause:** All ports 3001-3999 are allocated

**Solution:**
1. Delete unused worktrees to free ports
2. Or increase `WORKTREE_PORT_MAX` in `.env`:
   ```bash
   WORKTREE_PORT_MAX=5000
   ```
3. Restart the server

---

#### Issue: "Git worktree add failed: branch already exists"

**Cause:** Branch name conflicts with existing branch

**Solution:**
1. Use a different branch name
2. Or delete the existing branch if no longer needed:
   ```bash
   git branch -D feature/old-branch
   ```

---

#### Issue: "GitHub rate limit exceeded"

**Cause:** Too many GitHub API requests

**Solution:**
1. Set `GITHUB_TOKEN` in `.env`:
   ```bash
   GITHUB_TOKEN=ghp_your_token_here
   ```
2. Wait for rate limit to reset (hourly)
3. Cached data will be used for recent issues

---

#### Issue: "WebSocket disconnected"

**Cause:** WebSocket connection lost

**Solution:**
- Automatic reconnection with exponential backoff
- Refresh the page if reconnection fails
- Check server logs for WebSocket errors

---

#### Issue: "Zone execution failed"

**Cause:** LLM provider error, network issue, or invalid configuration

**Solution:**
1. Check zone configuration (agents, prompt template)
2. Verify LLM provider is enabled and API key is valid
3. Check server logs for detailed error:
   ```bash
   docker-compose logs -f app
   ```
4. Review execution history for specific error messages

---

#### Issue: "Worktree not appearing on canvas"

**Cause:** UI not receiving WebSocket event

**Solution:**
1. Check WebSocket connection status (top-right indicator)
2. Refresh the page
3. Check browser console for errors (F12)
4. Verify backend is emitting events:
   ```bash
   docker-compose logs -f app | grep "worktree:created"
   ```

---

### Debug Mode

Enable debug logging:

```bash
# In .env
LOG_LEVEL=debug
DEBUG=phase9:*
```

Restart the server and check logs:
```bash
docker-compose logs -f app
```

### Getting Help

**Before asking for help:**
1. Check this troubleshooting section
2. Review server logs for error messages
3. Verify environment variables are set correctly
4. Test with a minimal example

**Where to get help:**
- GitHub Issues: [AI-Orchestra/issues](https://github.com/your-org/AI-Orchestra/issues)
- Documentation: `/docs/PHASE_9_DEVELOPER_GUIDE.md`
- Community discussions

---

## Best Practices

### Workflow Organization

**Recommended Zone Setup:**

1. **Development Zone**
   - Trigger: `onDrop`
   - Agents: `frontend`, `backend`
   - Purpose: Initial feature implementation

2. **Testing Zone**
   - Trigger: `onDrop`
   - Agents: `qa`, `test-engineer`
   - Actions: `runTests`
   - Purpose: Test writing and validation

3. **Review Zone**
   - Trigger: `onDrop`
   - Agents: `code-reviewer`
   - Actions: `runTests`, `createPR`
   - Purpose: Code review and PR creation

4. **Deployment Zone**
   - Trigger: `manual`
   - Agents: `devops`
   - Actions: `runTests`, `notify`
   - Purpose: Production deployment prep

### Naming Conventions

**Branches:**
- `feature/` - New features
- `fix/` - Bug fixes
- `refactor/` - Code refactoring
- `test/` - Test additions
- `docs/` - Documentation

**Zones:**
- Use clear, action-oriented names
- Examples: "Development", "Code Review", "QA Testing"
- Avoid vague names like "Zone 1"

**Worktrees:**
- Link to GitHub issue when possible
- Use descriptive branch names
- Keep branch names short but meaningful

### Resource Management

**Worktree Lifecycle:**
1. Create worktree for a specific task
2. Move through workflow zones
3. Complete the task
4. Delete the worktree to free resources

**Port Management:**
- Monitor allocated ports (`/api/worktrees/ports/status`)
- Delete completed worktrees promptly
- Don't exceed ~50 active worktrees

**GitHub API:**
- Reuse issue URLs to benefit from caching
- Set `GITHUB_TOKEN` for higher rate limits
- Batch operations when possible

### Performance Tips

**Canvas Performance:**
- Limit to ~100 nodes for optimal performance
- Use zoom controls for navigation
- Group related worktrees visually

**Execution Performance:**
- Use specific prompt templates (avoid vague instructions)
- Configure only necessary agents per zone
- Monitor token usage to control costs

### Security Considerations

**API Keys:**
- Never commit `.env` to version control
- Rotate GitHub tokens regularly
- Use separate tokens for dev/staging/prod

**Access Control:**
- Phase 9 has no authentication (Phase 10)
- Restrict network access to trusted users
- Use firewall rules to limit port access

**Data Privacy:**
- Worktree data stored in local SQLite database
- GitHub context cached locally (5-minute TTL)
- No external services except configured LLM providers

---

## Next Steps

**Learn More:**
- [Developer Guide](/docs/PHASE_9_DEVELOPER_GUIDE.md) - Extend Phase 9
- [API Reference](/docs/PHASE_9_API_REFERENCE.md) - REST API and WebSocket
- [Migration Guide](/docs/PHASE_9_MIGRATION_GUIDE.md) - Upgrade from Phase 8

**Advanced Features:**
- Custom zone configurations
- Multi-step workflows
- Integration with external tools

**Community:**
- Share your workflow setups
- Contribute prompt templates
- Report bugs and request features

---

**Happy Orchestrating!**

*This guide is for AI Orchestra Phase 9. For earlier versions, see legacy documentation.*
