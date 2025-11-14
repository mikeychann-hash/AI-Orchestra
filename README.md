# AI Orchestra

**Autonomous Multi-LLM Development System with Distributed Agent Orchestration**

AI Orchestra is a powerful framework that combines multiple LLM providers (OpenAI, Anthropic Claude, Grok, Ollama) with distributed agent orchestration to create an autonomous development system.

## 🚀 Phase 9 Complete - Visual Orchestration

**NEW**: Transform your workflow with visual canvas orchestration!

- ✅ **Phase 9**: Interactive 2D visual canvas with ReactFlow
- ✅ **Phase 9**: Git worktree management with automatic port allocation
- ✅ **Phase 9**: Drag-and-drop workflow automation
- ✅ **Phase 9**: GitHub issue/PR integration with context injection
- ✅ **Phase 9**: Zone-based AI agent orchestration
- ✅ **Phase 9**: Real-time WebSocket updates
- ✅ **Phase 9**: SQLite persistence layer for visual workflows
- ✅ **Phase 9**: Multi-agent parallel execution with LLM bridge

**Previous Phases:**
- ✅ **Phase 6**: Multi-provider LLM connectors (OpenAI, Grok, Ollama)
- ✅ **Phase 6**: Unified LLM bridge with load balancing and fallback
- ✅ **Phase 6**: GitHub integration utilities & Docker deployment
- ✅ **Phase 7**: Modern Next.js dashboard with real-time monitoring
- ✅ **Phase 7**: Build pipeline interface & live agent logs viewer
- ✅ **Phase 8**: Production Docker Compose with Nginx reverse proxy
- ✅ **Phase 8**: SSL/TLS with Let's Encrypt auto-renewal
- ✅ **Phase 8**: GitHub Actions CI/CD pipeline with automated deployment
- ✅ **Phase 8**: Prometheus + Grafana monitoring stack
- ✅ **Phase 8**: Automated backup/restore system with S3 support

## 🎯 Features

### Core Features
- **Multi-LLM Support**: Seamlessly integrate OpenAI, Anthropic Claude, Grok (xAI), and Ollama
- **Intelligent Load Balancing**: Round-robin, random, or default provider selection
- **Automatic Fallback**: Graceful degradation when providers fail
- **FusionForge Dashboard**: Beautiful Next.js web interface with real-time monitoring
- **Build Pipeline**: Interactive interface for triggering and monitoring LLM queries
- **Live Logs**: Real-time agent logs with filtering and WebSocket updates
- **Artifacts Management**: Browse and download generated files and reports
- **Docker Deployment**: One-command deployment with Docker Compose
- **GitHub Integration**: Built-in utilities for GitHub API interactions
- **Flexible Configuration**: Environment variables and JSON-based settings

### Phase 9: Visual Orchestration (NEW)
- **Visual Canvas**: Interactive 2D workspace for managing workflows
- **Worktree Management**: Create isolated Git environments with unique ports
- **Drag-and-Drop**: Intuitive workflow automation via drag-and-drop
- **Smart Zones**: Define workflow stages that trigger AI agents automatically
- **GitHub Context**: Link issues/PRs and inject context into agent prompts
- **Real-Time Updates**: WebSocket-powered live status and execution results
- **Multi-Agent Execution**: Run multiple AI agents in parallel per zone
- **Execution History**: Track and review all agent executions
- **Template System**: Dynamic prompt templates with GitHub and worktree variables

## 📋 Prerequisites

- **Docker** 20.10+ and **Docker Compose** 2.0+ (recommended)
- **Node.js** 18+ and **npm** 9+ (for local development)
- **Git** 2.5+ (for Phase 9 worktree support)
- At least one LLM provider:
  - OpenAI API key (GPT-4, GPT-3.5)
  - **Anthropic Claude API key** (Claude 3.5 Sonnet, Haiku) - NEW!
  - Grok (xAI) API key
  - Ollama (runs locally in Docker)

## 🚀 Quick Start

### Option 1: Automated Setup (Fastest)

```bash
# Clone the repository
git clone https://github.com/mikeychann-hash/AI-Orchestra.git
cd AI-Orchestra

# Run the quick start script
./scripts/quickstart.sh

# Follow the prompts and add your API key to .env
# Then start the server:
npm start
```

### Option 2: Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/your-org/AI-Orchestra.git
cd AI-Orchestra

# Copy and configure environment
cp config/.env.example .env
# Edit .env and add your API keys

# Start with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Access the dashboard
open http://localhost:3001
```

### Option 2: Quick Start Script

**Linux/Mac:**
```bash
chmod +x scripts/quick_start.sh
./scripts/quick_start.sh
```

**Windows:**
```bash
scripts\quick_start.bat
```

### Option 3: Native Node.js

```bash
# Install dependencies
npm install

# Configure environment
cp config/.env.example .env
# Edit .env and add your API keys

# Start the server
npm start

# Or for development with hot reload
npm run dev
```

---

## 🎨 Phase 9: Visual Canvas Quick Start

### Enable Visual Orchestration

**1. Run Database Migration:**
```bash
node scripts/migrate_to_phase9.js
```

This creates:
- Visual database with schema
- 4 default zones (Development, Testing, Review, Deployment)
- Backup of existing data

**2. Enable Feature Flag:**

In `.env`:
```bash
FEATURE_VISUAL_CANVAS=true
WORKTREE_BASE_PATH=.worktrees
WORKTREE_PORT_MIN=3001
WORKTREE_PORT_MAX=3999
```

**3. Restart Server:**
```bash
docker-compose restart
# Or: npm start
```

**4. Access Visual Canvas:**
```
http://localhost:3001/canvas
```

### Your First Visual Workflow

**1. Create a Worktree:**
- Click "Create Worktree" in the toolbar
- Enter branch name: `feature/my-first-feature`
- (Optional) Link a GitHub issue
- Click "Create"

**2. Drag to Development Zone:**
- The worktree card appears on the canvas
- Drag it into the "Development" zone
- Watch as AI agents automatically implement your feature!

**3. Move Through Workflow:**
- Drag to "Testing" zone → Agents write tests
- Drag to "Code Review" zone → Agents review and create PR
- Drag to "Deployment" zone → Agents prepare deployment

**4. View Results:**
- Real-time execution status on cards
- Click zone to view execution history
- Review agent outputs and token usage

### Learn More

- [User Guide](docs/PHASE_9_USER_GUIDE.md) - Complete visual canvas guide
- [Migration Guide](docs/PHASE_9_MIGRATION_GUIDE.md) - Upgrade from Phase 8
- [Developer Guide](docs/PHASE_9_DEVELOPER_GUIDE.md) - Architecture and API
- [API Reference](docs/PHASE_9_API_REFERENCE.md) - REST and WebSocket API

## 📝 Configuration

### Environment Variables

Create a `.env` file in the project root:

```bash
# Application
NODE_ENV=production
PORT=3000

# OpenAI
OPENAI_ENABLED=true
OPENAI_API_KEY=your_openai_api_key_here

# Grok (xAI)
GROK_ENABLED=false
GROK_API_KEY=your_grok_api_key_here

# Ollama (local LLM)
OLLAMA_ENABLED=true
OLLAMA_HOST=http://localhost:11434

# LLM Bridge
LLM_DEFAULT_PROVIDER=openai
LLM_ENABLE_FALLBACK=true
```

See `config/.env.example` for all available options.

### Settings File

Advanced configuration in `config/settings.json`:

```json
{
  "llm": {
    "defaultProvider": "openai",
    "loadBalancing": "round-robin",
    "enableFallback": true
  },
  "agents": {
    "frontend": {
      "preferredModel": "gpt-4-turbo-preview",
      "temperature": 0.7
    }
  }
}
```

## 🎨 Dashboard

The FusionForge Dashboard provides a modern web interface for monitoring and controlling AI Orchestra:

- **Overview**: System metrics, recent builds, and activity feed
- **Build Pipeline**: Trigger new builds with customizable parameters
- **Agent Logs**: Real-time log streaming with filtering
- **Artifacts**: Browse generated files and reports
- **Agents**: Monitor autonomous agent status
- **System**: Health metrics and configuration
- **Configuration**: Manage providers and settings

Access the dashboard at `http://localhost:3001` after starting the services.

See [Dashboard Documentation](docs/DASHBOARD.md) for details.

## 🔌 API Endpoints

### Health Check
```bash
GET /health
```

### Query LLM
```bash
POST /api/query
Content-Type: application/json

{
  "prompt": "Hello, world!",
  "provider": "openai",  // optional
  "model": "gpt-4",      // optional
  "temperature": 0.7     // optional
}
```

### Stream Response
```bash
POST /api/stream
Content-Type: application/json

{
  "prompt": "Tell me a story",
  "provider": "openai"
}
```

### Get Available Providers
```bash
GET /api/providers
```

### Get Available Models
```bash
GET /api/models
```

### System Status
```bash
GET /api/status
```

## 🧪 Testing

### Quick Start Testing

**Run all tests with coverage:**
```bash
npm run test:coverage
```

**Run tests in watch mode (for development):**
```bash
npm run test:watch
```

**Run unit tests only:**
```bash
npm run test:unit
```

### Test Scripts Reference

| Command | Description | Output |
|---------|-------------|--------|
| `npm test` | Run all tests with text and HTML coverage | Terminal + coverage/ |
| `npm run test:coverage` | Run tests with full coverage reporting (text, HTML, lcov) | Terminal + coverage/ + lcov.info |
| `npm run test:unit` | Run unit tests only (faster) | Terminal only |
| `npm run test:watch` | Run tests in watch mode for TDD | Terminal (auto-rerun) |
| `npm run test:integration` | Run integration tests | Terminal |

### Understanding Coverage Reports

**Terminal Output:**
```
--------------------------|---------|----------|---------|---------|-------------------
File                      | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
--------------------------|---------|----------|---------|---------|-------------------
All files                 |   18.24 |     8.33 |   23.08 |   18.24 |
 core                     |   21.43 |    12.50 |   27.27 |   21.43 |
  config_manager.js       |   65.00 |    50.00 |   70.00 |   65.00 | 45-67,89-102
  llm_bridge.js           |   12.50 |     5.00 |   15.00 |   12.50 | 12-89,95-234
--------------------------|---------|----------|---------|---------|-------------------
```

**HTML Report:**
Open `coverage/index.html` in your browser for detailed, browsable coverage reports showing exact lines not covered.

**Coverage Goals:**
- **Phase 1 (Current):** 15-20% baseline
- **Phase 2:** 45-55% (critical paths)
- **Phase 3:** 65-75% (connectors)
- **Phase 4:** 75-85% (dashboard + E2E)
- **Phase 5:** 80-90% (production ready)

### Test in Docker
```bash
docker exec ai-orchestra-app npm test
```

### Writing Tests

**Test Structure:**
```javascript
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';

describe('Feature Name', () => {
  before(() => {
    // Setup before tests
  });

  it('should do something specific', () => {
    const result = functionUnderTest();
    assert.strictEqual(result, expectedValue);
  });

  after(() => {
    // Cleanup after tests
  });
});
```

**Best Practices:**
- One assertion per test when possible
- Clear test names describing expected behavior
- Use `describe` to group related tests
- Clean up resources in `after` hooks
- Mock external dependencies (use `nock` for HTTP, `sinon` for functions)

### CI/CD Testing

Tests run automatically on every PR:
- Linting must pass (ESLint)
- Type checking must pass (TypeScript)
- All tests must pass
- Coverage reported to Codecov

**Local pre-commit check:**
```bash
npm run lint && npm run type-check && npm test
```

## 🐳 Docker Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Rebuild and start
docker-compose up -d --build

# Check service status
docker-compose ps
```

## 📚 Documentation

### Phase 9: Visual Orchestration (NEW)
- [User Guide](docs/PHASE_9_USER_GUIDE.md) - Complete guide to visual canvas
- [Migration Guide](docs/PHASE_9_MIGRATION_GUIDE.md) - Upgrade from Phase 8
- [Developer Guide](docs/PHASE_9_DEVELOPER_GUIDE.md) - Architecture and integration
- [API Reference](docs/PHASE_9_API_REFERENCE.md) - REST API and WebSocket events
- [Documentation Index](docs/PHASE_9_DOCUMENTATION_INDEX.md) - All Phase 9 docs

### User Guides
- [Getting Started](GETTING_STARTED.md) - Quick start guide for new users
- [Dashboard Guide](docs/DASHBOARD.md) - Dashboard documentation
- [Production Deployment](docs/PRODUCTION.md) - Complete production setup guide
- [Deployment Guide](docs/DEPLOYMENT.md) - Basic deployment instructions

### Developer Guides
- [Architecture Overview](AI%20Orchestra.md) - System architecture and design
- [Architecture Decisions](ARCHITECTURE_DECISIONS.md) - ADRs documenting key decisions
- [Dashboard Development](dashboard/README.md) - Dashboard development guide
- [Contributing Guidelines](#-contributing) - How to contribute to this project

### Operations Guides
- [Master Bug Guide](MASTER_BUG_GUIDE.md) - Living bug tracking document
- [Iteration 1 Changelog](ITERATION_1_CHANGELOG.md) - Recent improvements and fixes
- [Agent Team Report](AGENT_TEAM_REPORT.md) - AI Agent Team analysis results

### Configuration Reference
- [Environment Variables](config/.env.example) - Development configuration
- [Production Config](.env.production.example) - Production settings
- [Settings Reference](config/settings.json) - Application settings

### Architecture

**System Architecture:**
```
┌─────────────────────────────────────────────────────────────┐
│                     AI Orchestra                            │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼────────┐  ┌─────────▼────────┐  ┌────────▼────────┐
│   Dashboard    │  │   Core System    │  │  Orchestrator   │
│  (Next.js)     │  │   (Node.js)      │  │   (Python)      │
│                │  │                  │  │                 │
│ - Build UI     │  │ - LLM Bridge     │  │ - Workflows     │
│ - Logs Viewer  │  │ - Connectors     │  │ - Task Graph    │
│ - Artifacts    │  │ - API Server     │  │ - Dependencies  │
└────────────────┘  └──────────────────┘  └─────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼────────┐  ┌─────────▼────────┐  ┌────────▼────────┐
│   OpenAI       │  │     Grok         │  │    Ollama       │
│  Connector     │  │   Connector      │  │   Connector     │
└────────────────┘  └──────────────────┘  └─────────────────┘
```

**Key Components:**
- **LLM Bridge:** Multi-provider orchestration with load balancing and fallback
- **Agents:** Specialized agents for frontend, backend, database, DevOps tasks
- **Pipeline:** Workflow orchestration for complex multi-agent tasks
- **Dashboard:** Real-time monitoring and control interface

**Design Patterns:**
- **Strategy Pattern:** Interchangeable LLM provider implementations
- **Bridge Pattern:** Decouples LLM interface from implementation
- **Template Method:** BaseAgent defines agent workflow
- **Factory Pattern:** LLMBridge creates provider instances

See [ARCHITECTURE_DECISIONS.md](ARCHITECTURE_DECISIONS.md) for detailed ADRs.

### Security Considerations

**Current Security Posture:**
- ✅ Rate limiting active (DoS protection)
- ✅ Helmet.js security headers
- ✅ CORS configuration
- ⚠️ No authentication/authorization (Phase 2)
- ⚠️ No input validation (Phase 2)
- ⚠️ No CSRF protection (Phase 2)

**Security Best Practices:**

1. **API Keys:**
   - Store in `.env` file (never commit to git)
   - Use separate keys for dev/staging/prod
   - Rotate keys regularly
   - Consider secrets management (Vault, AWS Secrets Manager)

2. **Rate Limiting:**
   ```javascript
   // Configured in config/settings.json
   "rateLimiting": {
     "enabled": true,
     "windowMs": 60000,    // 1 minute
     "max": 100            // 100 requests per minute
   }
   ```

3. **Environment Isolation:**
   - Development: Use test API keys with low limits
   - Staging: Separate keys from production
   - Production: Use restricted keys, enable all security features

4. **Known Vulnerabilities (Phase 2 Fixes):**
   - Input validation needed (Zod implementation planned)
   - CSRF protection needed for POST/PUT/DELETE endpoints
   - Authentication/authorization needed (JWT + RBAC planned)

See [MASTER_BUG_GUIDE.md](MASTER_BUG_GUIDE.md) for detailed security findings and roadmap.

## 🏗️ Project Structure

```
AI-Orchestra/
├── core/                          # Core system components
│   ├── base_connector.js          # Base connector class
│   ├── llm_bridge.js              # Multi-provider LLM bridge
│   ├── config_manager.js          # Configuration management
│   ├── connectors/                # LLM provider connectors
│   │   ├── openai_connector.js
│   │   ├── grok_connector.js
│   │   └── ollama_connector.js
│   └── integrations/              # External integrations
│       └── github_integration.js
├── config/                        # Configuration files
│   ├── .env.example               # Environment template
│   └── settings.json              # Application settings
├── tests/                         # Test suite
├── scripts/                       # Setup and utility scripts
├── docs/                          # Documentation
├── docker-compose.yml             # Docker orchestration
├── Dockerfile                     # Container definition
├── server.js                      # Application entry point
└── package.json                   # Dependencies and scripts
```

## 🔧 Development

### Local Development

```bash
# Install dependencies
npm install

# Run in development mode with hot reload
npm run dev

# Run tests in watch mode
npm test -- --watch
```

### Docker Development

```bash
# Use development compose file
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

## 🌟 LLM Providers

### OpenAI
- GPT-4 Turbo, GPT-3.5 Turbo
- DALL-E image generation
- Text embeddings

### Grok (xAI)
- Grok Beta model
- Extended context window
- Real-time knowledge

### Ollama
- Local LLM deployment
- Llama 2, Mistral, Code Llama
- Privacy-focused, no API costs

## 🤝 Contributing

We welcome contributions to AI Orchestra! This section provides guidelines for contributing code, documentation, and bug reports.

### Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/AI-Orchestra.git
   cd AI-Orchestra
   ```
3. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. **Install dependencies:**
   ```bash
   npm install
   ```
5. **Make your changes** following our coding standards
6. **Run tests** to ensure nothing breaks:
   ```bash
   npm run lint && npm run type-check && npm test
   ```
7. **Commit your changes** with a clear message:
   ```bash
   git commit -m "feat: add new feature description"
   ```
8. **Push to your fork:**
   ```bash
   git push origin feature/your-feature-name
   ```
9. **Open a Pull Request** on GitHub

### Contribution Types

**Bug Fixes:**
- Check [MASTER_BUG_GUIDE.md](MASTER_BUG_GUIDE.md) for known issues
- Reference bug number in PR title: `fix: Bug #12 - Add input validation`
- Include tests demonstrating the bug and fix
- Update MASTER_BUG_GUIDE.md to mark bug as fixed

**New Features:**
- Discuss in GitHub Issues before starting large features
- Follow existing design patterns (see [ARCHITECTURE_DECISIONS.md](ARCHITECTURE_DECISIONS.md))
- Include comprehensive tests (aim for 80%+ coverage)
- Update documentation (README, ADRs if architectural change)

**Documentation:**
- Fix typos, improve clarity, add examples
- Keep documentation in sync with code
- Update relevant guides when changing features

**Tests:**
- Improve test coverage (see coverage report in `coverage/index.html`)
- Add missing test cases
- Improve test quality and clarity

### Code Standards

**JavaScript/TypeScript:**
- Follow ESLint configuration (run `npm run lint`)
- Use Prettier for formatting
- Prefer TypeScript for new code
- Add JSDoc comments to public APIs

**Testing:**
- Write tests for all new code
- Maintain or improve code coverage
- Use descriptive test names
- Mock external dependencies

**Commit Messages:**
Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `test:` Test additions or fixes
- `refactor:` Code refactoring
- `perf:` Performance improvements
- `chore:` Maintenance tasks

**Examples:**
```
feat: add Zod validation for API endpoints
fix: Bug #8 - add component-level error handling in pipeline
docs: update README with testing instructions
test: add integration tests for LLM connectors
refactor: consolidate JavaScript to TypeScript
```

### Pull Request Guidelines

**Before Submitting:**
- [ ] Code follows project style guidelines
- [ ] All tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Type checking passes (`npm run type-check`)
- [ ] New code has tests (maintain/improve coverage)
- [ ] Documentation updated if needed
- [ ] Commit messages follow Conventional Commits

**PR Description Template:**
```markdown
## Summary
Brief description of changes

## Type of Change
- [ ] Bug fix (fixes issue #X)
- [ ] New feature
- [ ] Documentation update
- [ ] Test improvement
- [ ] Refactoring

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing performed

## Checklist
- [ ] Code follows style guidelines
- [ ] Tests pass locally
- [ ] Documentation updated
- [ ] No breaking changes (or documented)

## Related Issues
Fixes #X
Closes #Y
```

### Code Review Process

1. **Automated Checks:** CI/CD runs linting, type checking, tests
2. **Coverage Check:** Codecov reports coverage changes
3. **Maintainer Review:** Project maintainer reviews code
4. **Feedback:** Address review comments
5. **Approval:** Maintainer approves and merges

**Review Criteria:**
- Code quality and clarity
- Test coverage (prefer 80%+)
- Documentation completeness
- Adherence to architecture decisions
- No breaking changes (or properly documented)

### Development Workflow

**Local Development:**
```bash
# Start development server with hot reload
npm run dev

# Run tests in watch mode
npm run test:watch

# Check coverage
npm run test:coverage
open coverage/index.html
```

**Pre-commit Checklist:**
```bash
# Run all quality checks
npm run lint && npm run type-check && npm test
```

**Docker Development:**
```bash
# Build and run in Docker
docker-compose up -d

# View logs
docker-compose logs -f

# Run tests in Docker
docker exec ai-orchestra-app npm test
```

### Project Priorities

See [MASTER_BUG_GUIDE.md](MASTER_BUG_GUIDE.md) for current priorities:
- **Phase 2:** Input validation, API tests, error handling
- **Phase 3:** Connector tests, integration tests
- **Phase 4:** Dashboard tests, E2E tests
- **Phase 5:** Performance optimization, code quality

### Questions or Issues?

- **Bug Reports:** Create an issue with bug template
- **Feature Requests:** Create an issue with feature template
- **Questions:** Use GitHub Discussions
- **Security Issues:** Email maintainers (do not create public issue)

### License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 📄 License

MIT License - see LICENSE file for details

## 🔗 Links

- Documentation: [docs/](docs/)
- Issues: [GitHub Issues](https://github.com/your-org/AI-Orchestra/issues)
- Releases: [GitHub Releases](https://github.com/your-org/AI-Orchestra/releases)

## 🎉 Acknowledgments

Built on top of:
- **Autonomous-Agents** - Modular task-based AI agents
- **Swarms** - Distributed coordination and multi-agent orchestration
- **Atomic-Agents** - Self-evolving agent logic with memory

---

**Made with ❤️ by the AI Orchestra Team**
