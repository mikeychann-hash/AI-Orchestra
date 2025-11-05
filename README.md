# AI Orchestra

**Autonomous Multi-LLM Development System with Distributed Agent Orchestration**

AI Orchestra is a powerful framework that combines multiple LLM providers (OpenAI, Grok, Ollama) with distributed agent orchestration to create an autonomous development system.

## 🚀 Phase 8 Complete - Production Launch & CI/CD

This release includes all previous phases plus production deployment:
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

- **Multi-LLM Support**: Seamlessly integrate OpenAI, Grok (xAI), and Ollama
- **Intelligent Load Balancing**: Round-robin, random, or default provider selection
- **Automatic Fallback**: Graceful degradation when providers fail
- **FusionForge Dashboard**: Beautiful Next.js web interface with real-time monitoring
- **Build Pipeline**: Interactive interface for triggering and monitoring LLM queries
- **Live Logs**: Real-time agent logs with filtering and WebSocket updates
- **Artifacts Management**: Browse and download generated files and reports
- **Docker Deployment**: One-command deployment with Docker Compose
- **GitHub Integration**: Built-in utilities for GitHub API interactions
- **Flexible Configuration**: Environment variables and JSON-based settings

## 📋 Prerequisites

- **Docker** 20.10+ and **Docker Compose** 2.0+ (recommended)
- **Node.js** 18+ and **npm** 9+ (for local development)
- At least one LLM provider:
  - OpenAI API key
  - Grok (xAI) API key
  - Ollama (runs locally in Docker)

## 🚀 Quick Start

### Option 1: Docker Compose (Recommended)

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

### Run Unit Tests
```bash
npm test
```

### Run Integration Tests
```bash
npm run test:integration
```

### Test in Docker
```bash
docker exec ai-orchestra-app npm test
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

- [Production Deployment](docs/PRODUCTION.md) - **Complete production setup guide**
- [Dashboard Guide](docs/DASHBOARD.md) - Dashboard documentation
- [Deployment Guide](docs/DEPLOYMENT.md) - Basic deployment instructions
- [Architecture Overview](AI%20Orchestra.md) - System architecture and design
- [Dashboard README](dashboard/README.md) - Dashboard development guide
- Configuration Reference - See `config/.env.example` or `.env.production.example`

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

Contributions are welcome! Please read our contributing guidelines before submitting pull requests.

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
