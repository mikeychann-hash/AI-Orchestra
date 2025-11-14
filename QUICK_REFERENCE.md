# AI-Orchestra Quick Reference Card

**Version**: Phase 9 + Claude Integration
**Last Updated**: November 14, 2025

---

## 🚀 Getting Started (3 Minutes)

```bash
# 1. Clone and navigate
git clone https://github.com/mikeychann-hash/AI-Orchestra.git
cd AI-Orchestra

# 2. Run automated setup
./scripts/quickstart.sh

# 3. Add your API key to .env
nano .env
# Add: ANTHROPIC_API_KEY=sk-ant-xxxxx  OR  OPENAI_API_KEY=sk-xxxxx

# 4. Start the server
npm start
```

**Done!** Access at http://localhost:3000

---

## 🤖 Supported LLM Providers

| Provider | Models | Context | Cost (Input/Output) | Setup |
|----------|--------|---------|---------------------|-------|
| **Anthropic Claude** ⭐ | 3.5 Sonnet, 3.5 Haiku, 3 Opus | 200K | $0.003/$0.015 | `ANTHROPIC_API_KEY=sk-ant-xxx` |
| **OpenAI** | GPT-4 Turbo, GPT-3.5 | 128K | $0.01/$0.03 | `OPENAI_API_KEY=sk-xxx` |
| **Grok** | Grok Beta | 100K | TBD | `GROK_API_KEY=xai-xxx` |
| **Ollama** | Llama2, Mistral, CodeLlama | Varies | Free | `OLLAMA_ENDPOINT=http://localhost:11434` |

**Recommendation**: Use **Claude 3.5 Sonnet** for best results with Phase 9 visual workflows.

---

## ⚙️ Configuration Quick Reference

### Enable Claude (Default)

Edit `config/settings.json`:

```json
{
  "llm": {
    "providers": {
      "claude": {
        "enabled": true,
        "priority": 1
      }
    },
    "defaultProvider": "claude"
  }
}
```

### Use Multiple Providers with Fallback

```json
{
  "llm": {
    "providers": {
      "claude": { "enabled": true, "priority": 1 },
      "openai": { "enabled": true, "priority": 2 }
    },
    "defaultProvider": "claude",
    "loadBalancing": "round-robin",
    "enableFallback": true
  }
}
```

---

## 📡 API Usage Examples

### Query Claude Directly

```bash
curl -X POST http://localhost:3000/api/llm_query \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "claude",
    "model": "claude-3-5-sonnet-20241022",
    "prompt": "Explain Phase 9 visual orchestration in 3 sentences",
    "temperature": 0.7,
    "maxTokens": 500
  }'
```

### Use Load Balancing (Auto-Select Provider)

```bash
curl -X POST http://localhost:3000/api/llm_query \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Generate a React component for user login",
    "temperature": 0.8
  }'
```

---

## 🎨 Phase 9 Visual Canvas Quick Start

### Create a Worktree

```bash
curl -X POST http://localhost:3000/api/worktrees \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: YOUR_TOKEN" \
  -d '{
    "branchName": "feature-auth",
    "issueUrl": "https://github.com/org/repo/issues/123"
  }'
```

### Create a Zone

```bash
curl -X POST http://localhost:3000/api/zones \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: YOUR_TOKEN" \
  -d '{
    "name": "Development",
    "trigger": "onDrop",
    "agents": ["frontend", "backend"],
    "promptTemplate": "Implement {{ github.title }} using Claude 3.5 Sonnet"
  }'
```

### Assign Worktree to Zone (Triggers Execution)

```bash
curl -X POST http://localhost:3000/api/zones/ZONE_ID/assign/WORKTREE_ID \
  -H "X-CSRF-Token: YOUR_TOKEN"
```

---

## 🔧 Common Commands

```bash
# Start development server
npm run dev

# Start production server
npm start

# Run tests
npm test

# Database migration
node scripts/migrate_to_phase9.js migrate

# Verify database
node scripts/migrate_to_phase9.js verify

# Rollback migration
node scripts/migrate_to_phase9.js rollback

# List all worktrees
git worktree list

# Clean up worktrees
git worktree prune
```

---

## 🐛 Troubleshooting

### "API key is required"

```bash
# Check .env file
cat .env | grep API_KEY

# Make sure key is set correctly (no spaces!)
ANTHROPIC_API_KEY=sk-ant-xxxxx  # ✅ Good
ANTHROPIC_API_KEY = sk-ant-xxx  # ❌ Bad (spaces)
```

### "Failed to initialize connector"

```bash
# Test your API key
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: YOUR_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 10,
    "messages": [{"role": "user", "content": "Hi"}]
  }'
```

### "Port already in use"

```bash
# Find and kill process using port 3000
lsof -i :3000
kill -9 <PID>

# Or use a different port
PORT=3001 npm start
```

### "Database migration failed"

```bash
# Remove and recreate database
rm data/visual.db
node scripts/migrate_to_phase9.js migrate
```

---

## 📚 Documentation

| Document | Purpose | Location |
|----------|---------|----------|
| Startup Guide | Complete setup instructions | `/STARTUP_GUIDE.md` |
| User Guide | Using the visual canvas | `/docs/PHASE_9_USER_GUIDE.md` |
| Developer Guide | Technical architecture | `/docs/PHASE_9_DEVELOPER_GUIDE.md` |
| API Reference | All REST/WebSocket APIs | `/docs/PHASE_9_API_REFERENCE.md` |
| Migration Guide | Upgrading from Phase 8 | `/docs/PHASE_9_MIGRATION_GUIDE.md` |
| Documentation Index | Central navigation | `/docs/PHASE_9_DOCUMENTATION_INDEX.md` |

---

## 🎯 Template Variables (GitHub Context)

Use these in zone prompt templates:

| Variable | Example | Description |
|----------|---------|-------------|
| `{{ github.title }}` | "Add user authentication" | Issue/PR title |
| `{{ github.description }}` | "Users need to log in..." | Issue body |
| `{{ github.labels }}` | "bug, priority:high" | Comma-separated labels |
| `{{ github.author }}` | "johndoe" | Issue creator |
| `{{ github.number }}` | "123" | Issue number |
| `{{ worktree.branch }}` | "feature-auth" | Git branch name |
| `{{ worktree.port }}` | "3001" | Assigned port |
| `{{ worktree.path }}` | ".worktrees/wt-xxx" | Worktree path |
| `{{ worktree.id }}` | "wt-abc123" | Unique worktree ID |

**Example Template**:
```
Implement {{ github.title }} for issue #{{ github.number }}.

Requirements:
{{ github.description }}

Use port {{ worktree.port }} for testing.
Branch: {{ worktree.branch }}
```

---

## 🌐 Default URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Backend API | http://localhost:3000 | REST API endpoints |
| Frontend Dashboard | http://localhost:3001 | Visual canvas UI |
| Health Check | http://localhost:3000/health | Server status |
| API Docs | http://localhost:3000/api-docs | Swagger documentation |
| Prometheus | http://localhost:9090 | Metrics (if enabled) |
| Grafana | http://localhost:3002 | Dashboards (if enabled) |

---

## 🎭 Agent Types

Available for zone configuration:

- `frontend` - React, Next.js, UI components
- `backend` - Node.js, Express, APIs
- `qa` - Testing, bug identification
- `debugger` - Error resolution
- `code-reviewer` - Code quality review
- `devops` - Deployment, infrastructure

---

## 💡 Pro Tips

1. **Use Claude 3.5 Sonnet for complex tasks** - Best reasoning and code generation
2. **Use Claude 3.5 Haiku for simple tasks** - 10x faster, 3x cheaper
3. **Enable fallback** - If Claude hits rate limits, automatically use OpenAI
4. **Link GitHub issues** - Get automatic context injection in agent prompts
5. **Use round-robin** - Distribute load across multiple providers
6. **Monitor token usage** - Claude has better input pricing than GPT-4
7. **Leverage 200K context** - Claude can handle entire codebases in context

---

## 🆘 Getting Help

- **Startup Guide**: `cat STARTUP_GUIDE.md`
- **Documentation**: `ls docs/`
- **Logs**: `tail -f logs/orchestra.log`
- **GitHub Issues**: https://github.com/mikeychann-hash/AI-Orchestra/issues
- **Discussions**: https://github.com/mikeychann-hash/AI-Orchestra/discussions

---

**Ready to orchestrate!** 🎵
