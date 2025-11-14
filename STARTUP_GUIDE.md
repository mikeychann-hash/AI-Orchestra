# AI-Orchestra Startup Guide

Complete guide to get AI-Orchestra up and running with Phase 9 Visual Orchestration.

**Last Updated**: November 14, 2025
**Version**: Phase 9 (Visual Canvas Edition)

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Detailed Installation](#detailed-installation)
4. [Configuration](#configuration)
5. [Running the Application](#running-the-application)
6. [First Visual Workflow](#first-visual-workflow)
7. [Troubleshooting](#troubleshooting)
8. [Next Steps](#next-steps)

---

## Prerequisites

### System Requirements

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Git**: v2.5.0 or higher (for worktree support)
- **Operating System**: Linux, macOS, or Windows with WSL2
- **Memory**: 4GB RAM minimum, 8GB recommended
- **Disk Space**: 2GB free space

### API Keys (Choose at least one)

You'll need API keys for at least one LLM provider:

- **OpenAI** (Recommended): Get from [platform.openai.com](https://platform.openai.com/api-keys)
- **Anthropic Claude** (New!): Get from [console.anthropic.com](https://console.anthropic.com/)
- **Grok** (Optional): Get from [x.ai](https://x.ai/)
- **Ollama** (Optional): Local models, no API key needed

---

## Quick Start

Get AI-Orchestra running in under 5 minutes:

```bash
# 1. Clone the repository
git clone https://github.com/mikeychann-hash/AI-Orchestra.git
cd AI-Orchestra

# 2. Install dependencies
npm install
cd dashboard && npm install && cd ..

# 3. Configure environment
cp .env.example .env
# Edit .env and add your API key (OPENAI_API_KEY or ANTHROPIC_API_KEY)

# 4. Run Phase 9 migration
node scripts/migrate_to_phase9.js migrate

# 5. Start the server
npm start

# 6. Access the application
# Backend API: http://localhost:3000
# Visual Canvas: http://localhost:3000 (coming soon with dashboard)
# Dashboard: Run separately in /dashboard folder
```

---

## Detailed Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/mikeychann-hash/AI-Orchestra.git
cd AI-Orchestra
```

### Step 2: Install Backend Dependencies

```bash
# Install backend dependencies
npm install
```

This installs:
- Express.js (web server)
- LLM provider SDKs (OpenAI, Anthropic, etc.)
- Database (better-sqlite3)
- Monitoring (Winston, Prometheus)
- Security (Helmet, CORS, rate limiting)

### Step 3: Install Frontend Dependencies

```bash
# Navigate to dashboard
cd dashboard

# Install frontend dependencies
npm install

# Return to root
cd ..
```

This installs:
- Next.js (React framework)
- ReactFlow (visual canvas)
- Zustand (state management)
- Tailwind CSS (styling)
- shadcn/ui (UI components)

### Step 4: Verify Installation

```bash
# Check Node.js version
node --version  # Should be v18.0.0+

# Check npm version
npm --version   # Should be v9.0.0+

# Check Git version
git --version   # Should be v2.5.0+

# Verify dependencies
npm list --depth=0
```

---

## Configuration

### Step 1: Create Environment File

```bash
# Copy example environment file
cp .env.example .env
```

### Step 2: Configure LLM Provider

Open `.env` in your text editor and add your API keys:

#### Option A: OpenAI (Most Common)

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
DEFAULT_MODEL=gpt-4-turbo-preview
```

#### Option B: Anthropic Claude (New!)

```bash
# Anthropic Claude Configuration
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
DEFAULT_MODEL=claude-3-5-sonnet-20241022
```

#### Option C: Multiple Providers (Advanced)

```bash
# Use both OpenAI and Claude
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
DEFAULT_MODEL=gpt-4-turbo-preview
```

### Step 3: Enable Your Provider

Edit `config/settings.json`:

**For OpenAI** (enabled by default):
```json
{
  "llm": {
    "providers": {
      "openai": {
        "enabled": true,
        "priority": 1
      }
    }
  }
}
```

**For Claude**:
```json
{
  "llm": {
    "providers": {
      "claude": {
        "enabled": true,
        "priority": 1,
        "defaultModel": "claude-3-5-sonnet-20241022"
      },
      "openai": {
        "enabled": false
      }
    },
    "defaultProvider": "claude"
  }
}
```

**For Both** (with fallback):
```json
{
  "llm": {
    "providers": {
      "openai": {
        "enabled": true,
        "priority": 1
      },
      "claude": {
        "enabled": true,
        "priority": 2
      }
    },
    "defaultProvider": "openai",
    "loadBalancing": "round-robin",
    "enableFallback": true
  }
}
```

### Step 4: GitHub Integration (Optional)

For Phase 9 visual workflows with GitHub context injection:

```bash
# Add to .env
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Get a token from: https://github.com/settings/tokens

Required scopes:
- `repo` (for private repos)
- `read:org` (for organization access)

### Step 5: Phase 9 Configuration

Customize Phase 9 settings in `.env`:

```bash
# Worktree Configuration
WORKTREE_BASE_PATH=.worktrees
WORKTREE_PORT_MIN=3001
WORKTREE_PORT_MAX=3999

# GitHub Context
GITHUB_CONTEXT_CACHE_TIMEOUT=300000  # 5 minutes

# Feature Flags
ENABLE_VISUAL_CANVAS=true
```

---

## Running the Application

### Option 1: Development Mode (Recommended)

```bash
# Terminal 1: Start backend server
npm run dev

# Terminal 2: Start frontend dashboard (in separate terminal)
cd dashboard
npm run dev
```

**Access**:
- Backend API: http://localhost:3000
- Frontend Dashboard: http://localhost:3001
- API Documentation: http://localhost:3000/api-docs

### Option 2: Production Mode

```bash
# Build frontend
cd dashboard
npm run build
cd ..

# Start server (serves both API and frontend)
npm start
```

**Access**:
- Application: http://localhost:3000

### Option 3: Docker Deployment

```bash
# Build Docker image
docker-compose build

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f
```

### Verify Server is Running

```bash
# Test backend health
curl http://localhost:3000/health

# Expected response:
# {"status":"healthy","version":"0.6.0","timestamp":"..."}

# Test LLM connection
curl http://localhost:3000/api/llm/test

# Test Phase 9 APIs
curl http://localhost:3000/api/zones
curl http://localhost:3000/api/worktrees
```

---

## Phase 9 Migration

Before using the visual canvas, run the Phase 9 database migration:

### Step 1: Run Migration

```bash
node scripts/migrate_to_phase9.js migrate
```

**Expected output**:
```
[Migration] Starting Phase 9 migration...
[Migration] Creating database tables...
[Migration] Created table: worktrees
[Migration] Created table: zones
[Migration] Created table: worktree_zones
[Migration] Created table: zone_executions
[Migration] Creating default zones...
[Migration] Created default zone: Development
[Migration] Created default zone: Testing
[Migration] Created default zone: Code Review
[Migration] Created default zone: Deployment
[Migration] Phase 9 migration completed successfully
```

### Step 2: Verify Migration

```bash
node scripts/migrate_to_phase9.js verify
```

### Step 3: Rollback (if needed)

```bash
node scripts/migrate_to_phase9.js rollback
```

---

## First Visual Workflow

Let's create your first visual workflow with Phase 9!

### Step 1: Access the Visual Canvas

1. Open http://localhost:3001 (dashboard)
2. Click "Visual Canvas" in the sidebar
3. You'll see 4 default zones:
   - Development (left)
   - Testing (middle-left)
   - Code Review (middle-right)
   - Deployment (right)

### Step 2: Create a Worktree

1. Click "Create Worktree" button in the toolbar
2. Fill in the form:
   - **Branch Name**: `feature/user-authentication`
   - **GitHub Issue URL**: `https://github.com/yourorg/yourrepo/issues/123` (optional)
   - **Description**: Implement user authentication
3. Click "Create"

A new worktree card appears on the canvas with:
- Branch name
- Assigned port (e.g., 3001)
- Status indicator (green = active)

### Step 3: Drag to Development Zone

1. Click and drag the worktree card
2. Drop it into the "Development" zone
3. Watch the magic happen:
   - Zone trigger executes automatically
   - Frontend and Backend agents activate
   - GitHub issue context injected into prompts
   - Agents start working on the task

### Step 4: View Execution Results

1. Click on the worktree card
2. See execution results:
   - Agent outputs
   - Token usage
   - Execution time
   - Success/failure status

### Step 5: Move Through Workflow

1. Drag worktree to "Testing" zone
   - QA agent runs tests automatically
   - Test results displayed
2. Drag to "Code Review" zone
   - Code review agent analyzes changes
   - Creates PR if configured
3. Drag to "Deployment" zone
   - DevOps agent handles deployment

### Step 6: View Worktree Locally

```bash
# List all worktrees
git worktree list

# Navigate to your worktree
cd .worktrees/wt-xxxxx

# Make changes
git add .
git commit -m "Implement authentication"

# Start dev server on assigned port
npm start -- --port 3001
```

---

## Troubleshooting

### Issue: "API Key is required"

**Solution**:
```bash
# Check .env file exists
ls -la .env

# Verify API key is set
cat .env | grep API_KEY

# Make sure no extra spaces
# Bad:  OPENAI_API_KEY= sk-xxx
# Good: OPENAI_API_KEY=sk-xxx
```

### Issue: "Failed to initialize connector"

**Solution**:
```bash
# Test your API key manually
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY"

# Or for Claude
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: YOUR_API_KEY" \
  -H "anthropic-version: 2023-06-01"
```

### Issue: "Port already in use"

**Solution**:
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3001 npm start
```

### Issue: "Database migration failed"

**Solution**:
```bash
# Check database file
ls -la data/visual.db

# Remove and re-create
rm data/visual.db
node scripts/migrate_to_phase9.js migrate

# Check permissions
chmod 755 data
chmod 644 data/visual.db
```

### Issue: "Git worktree failed"

**Solution**:
```bash
# Check Git version (need 2.5+)
git --version

# Clean up orphaned worktrees
git worktree prune

# List all worktrees
git worktree list

# Remove specific worktree
git worktree remove .worktrees/wt-xxxxx
```

### Issue: "Cannot connect to dashboard"

**Solution**:
```bash
# Check if Next.js is running
cd dashboard
npm run dev

# Check for port conflicts
lsof -i :3001

# Clear Next.js cache
rm -rf .next
npm run build
```

### Issue: "Module not found" errors

**Solution**:
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Also for dashboard
cd dashboard
rm -rf node_modules package-lock.json
npm install
```

---

## Testing Your Setup

### Test Backend API

```bash
# Health check
curl http://localhost:3000/health

# Test LLM query
curl -X POST http://localhost:3000/api/llm_query \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Say hello!",
    "model": "gpt-4-turbo-preview"
  }'

# Test Phase 9 APIs
curl http://localhost:3000/api/zones
curl http://localhost:3000/api/worktrees
```

### Test Visual Canvas

```bash
# Create a zone
curl -X POST http://localhost:3000/api/zones \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Custom Zone",
    "trigger": "onDrop",
    "agents": ["frontend"],
    "promptTemplate": "Work on {{ github.title }}"
  }'

# Create a worktree
curl -X POST http://localhost:3000/api/worktrees \
  -H "Content-Type: application/json" \
  -d '{
    "branchName": "test-feature",
    "issueUrl": "https://github.com/org/repo/issues/1"
  }'
```

### Run Test Suite

```bash
# Run all tests
npm test

# Run specific test files
npm test -- tests/unit/zone_manager.test.js
npm test -- tests/unit/visual_db.test.js

# Run integration tests
npm test -- tests/integration/phase9_api.test.js
```

---

## Next Steps

### Learn More

- **User Guide**: `/docs/PHASE_9_USER_GUIDE.md` - Complete visual canvas guide
- **Developer Guide**: `/docs/PHASE_9_DEVELOPER_GUIDE.md` - Technical deep dive
- **API Reference**: `/docs/PHASE_9_API_REFERENCE.md` - All endpoints documented
- **Migration Guide**: `/docs/PHASE_9_MIGRATION_GUIDE.md` - Upgrade from Phase 8

### Customize Your Setup

1. **Add More Zones**: Create custom workflow stages
2. **Configure Agents**: Adjust agent prompts in `config/settings.json`
3. **GitHub Integration**: Link worktrees to your issues/PRs
4. **Custom Triggers**: Add scheduled or manual triggers
5. **Extend Actions**: Create custom zone actions (webhooks, deployments)

### Production Deployment

```bash
# 1. Set environment to production
NODE_ENV=production

# 2. Build frontend
cd dashboard
npm run build
cd ..

# 3. Use PM2 for process management
npm install -g pm2
pm2 start npm --name "ai-orchestra" -- start

# 4. Set up Nginx reverse proxy
# See /docs/DEPLOYMENT_GUIDE.md

# 5. Enable HTTPS with Let's Encrypt
# See /docs/SSL_SETUP.md
```

### Join the Community

- **GitHub**: https://github.com/mikeychann-hash/AI-Orchestra
- **Documentation**: https://ai-orchestra-docs.netlify.app
- **Issues**: https://github.com/mikeychann-hash/AI-Orchestra/issues
- **Discussions**: https://github.com/mikeychann-hash/AI-Orchestra/discussions

---

## Quick Reference

### Common Commands

```bash
# Start development
npm run dev                    # Backend
cd dashboard && npm run dev    # Frontend

# Build production
npm run build                  # Backend
cd dashboard && npm run build  # Frontend

# Run tests
npm test                       # All tests
npm test -- --coverage         # With coverage

# Database
node scripts/migrate_to_phase9.js migrate   # Migrate
node scripts/migrate_to_phase9.js verify    # Verify
node scripts/migrate_to_phase9.js rollback  # Rollback

# Git worktrees
git worktree list              # List all
git worktree prune             # Clean up
git worktree remove <path>     # Remove one
```

### Environment Variables

```bash
# LLM Providers
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-ant-xxx
CLAUDE_API_KEY=sk-ant-xxx
GROK_API_KEY=xai-xxx

# GitHub
GITHUB_TOKEN=ghp_xxx

# Phase 9
WORKTREE_BASE_PATH=.worktrees
WORKTREE_PORT_MIN=3001
WORKTREE_PORT_MAX=3999
GITHUB_CONTEXT_CACHE_TIMEOUT=300000

# Server
PORT=3000
NODE_ENV=development
LOG_LEVEL=info
```

### Default Ports

- **Backend API**: 3000
- **Frontend Dashboard**: 3001
- **Worktree Range**: 3001-3999
- **Prometheus**: 9090 (if enabled)
- **Grafana**: 3002 (if enabled)

---

## Success!

You're now ready to use AI-Orchestra with Phase 9 Visual Orchestration! 🎉

**What you can do now**:
- ✅ Create visual workflows with drag-and-drop
- ✅ Manage Git worktrees automatically
- ✅ Link GitHub issues for context injection
- ✅ Execute multi-agent workflows visually
- ✅ Monitor execution in real-time
- ✅ Use Claude, GPT-4, or other LLMs

**Need help?**
- Check `/docs/PHASE_9_USER_GUIDE.md` for detailed usage
- See `/docs/TROUBLESHOOTING.md` for common issues
- Open an issue on GitHub for bugs
- Join discussions for questions

Happy orchestrating! 🎭
