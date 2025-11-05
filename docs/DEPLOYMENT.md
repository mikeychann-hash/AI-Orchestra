# AI Orchestra - Deployment Guide

Complete guide for deploying AI Orchestra using Docker and Docker Compose.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Deployment Methods](#deployment-methods)
- [LLM Provider Setup](#llm-provider-setup)
- [Environment Variables](#environment-variables)
- [Health Checks](#health-checks)
- [Troubleshooting](#troubleshooting)
- [Production Considerations](#production-considerations)

---

## Prerequisites

### Required

- **Docker** (v20.10+)
- **Docker Compose** (v2.0+)
- At least one LLM provider:
  - OpenAI API key, or
  - Grok (xAI) API key, or
  - Ollama (runs locally)

### Recommended

- **Node.js** 18+ (for local development)
- **Git** (for version control)
- 4GB+ RAM for running Ollama models
- Stable internet connection for cloud LLM providers

---

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/AI-Orchestra.git
cd AI-Orchestra
```

### 2. Configure Environment

Copy the example environment file and configure it:

```bash
cp config/.env.example .env
```

Edit `.env` and add your API keys:

```bash
# Minimum required configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_ENABLED=true
```

### 3. Start with Docker Compose

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

### 4. Verify Deployment

Open your browser and navigate to:
- Application: http://localhost:3000
- Health Check: http://localhost:3000/health
- WebSocket: ws://localhost:3001

---

## Configuration

### Environment File Setup

Create a `.env` file in the project root with your configuration:

```bash
# Application
NODE_ENV=production
PORT=3000

# OpenAI (recommended for getting started)
OPENAI_ENABLED=true
OPENAI_API_KEY=sk-...your-key-here...

# Grok/xAI (optional)
GROK_ENABLED=false
GROK_API_KEY=your_grok_key_here

# Ollama (enabled by default in Docker)
OLLAMA_ENABLED=true
OLLAMA_HOST=http://ollama:11434
```

### Settings.json Configuration

Advanced configuration can be done in `config/settings.json`:

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

---

## Deployment Methods

### Method 1: Docker Compose (Recommended)

**Production deployment:**

```bash
docker-compose up -d
```

**Development with hot reload:**

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

**Stop services:**

```bash
docker-compose down
```

**Stop and remove volumes:**

```bash
docker-compose down -v
```

### Method 2: Docker Only

**Build the image:**

```bash
docker build -t ai-orchestra .
```

**Run the container:**

```bash
docker run -d \
  --name ai-orchestra \
  -p 3000:3000 \
  -p 3001:3001 \
  -e OPENAI_API_KEY=your_key_here \
  -v $(pwd)/database:/app/database \
  -v $(pwd)/logs:/app/logs \
  ai-orchestra
```

### Method 3: Native Node.js

**Install dependencies:**

```bash
npm install
```

**Start the application:**

```bash
# Production
npm start

# Development with watch mode
npm run dev
```

---

## LLM Provider Setup

### OpenAI Setup

1. Create an account at https://platform.openai.com
2. Generate an API key
3. Add to `.env`:

```bash
OPENAI_ENABLED=true
OPENAI_API_KEY=sk-...your-key-here...
OPENAI_DEFAULT_MODEL=gpt-4-turbo-preview
```

### Grok (xAI) Setup

1. Sign up at https://x.ai
2. Generate an API key
3. Add to `.env`:

```bash
GROK_ENABLED=true
GROK_API_KEY=your_grok_key_here
GROK_BASE_URL=https://api.x.ai/v1
```

### Ollama Setup

**With Docker Compose (automatic):**

Ollama is included in the docker-compose.yml and starts automatically.

**Download models:**

```bash
# Access the Ollama container
docker exec -it ai-orchestra-ollama ollama pull llama2

# Or use the API
curl http://localhost:11434/api/pull -d '{"name": "llama2"}'
```

**Available models:**
- `llama2` - General purpose
- `mistral` - Fast and capable
- `codellama` - Code generation
- `llama2:13b` - Larger model

**Standalone Ollama:**

```bash
# Download and install from https://ollama.ai
curl https://ollama.ai/install.sh | sh

# Pull a model
ollama pull llama2

# Start server
ollama serve
```

Then update `.env`:

```bash
OLLAMA_ENABLED=true
OLLAMA_HOST=http://localhost:11434
```

---

## Environment Variables

### Application Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment mode |
| `PORT` | `3000` | HTTP server port |
| `HOST` | `localhost` | Server host |

### OpenAI Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_ENABLED` | No | Enable OpenAI connector |
| `OPENAI_API_KEY` | Yes* | OpenAI API key |
| `OPENAI_ORGANIZATION` | No | OpenAI organization ID |
| `OPENAI_DEFAULT_MODEL` | No | Default model to use |

### Grok Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `GROK_ENABLED` | No | Enable Grok connector |
| `GROK_API_KEY` | Yes* | Grok/xAI API key |
| `GROK_BASE_URL` | No | API base URL |

### Ollama Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `OLLAMA_ENABLED` | No | Enable Ollama connector |
| `OLLAMA_HOST` | Yes* | Ollama server URL |
| `OLLAMA_DEFAULT_MODEL` | No | Default model name |

### LLM Bridge Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `LLM_DEFAULT_PROVIDER` | `openai` | Default LLM provider |
| `LLM_LOAD_BALANCING` | `round-robin` | Load balancing strategy |
| `LLM_ENABLE_FALLBACK` | `true` | Enable provider fallback |
| `LLM_REQUEST_TIMEOUT` | `60000` | Request timeout (ms) |
| `LLM_RETRY_ATTEMPTS` | `3` | Number of retry attempts |

### GitHub Integration

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_ENABLED` | No | Enable GitHub integration |
| `GITHUB_TOKEN` | Yes* | GitHub personal access token |
| `GITHUB_OWNER` | No | Default repository owner |
| `GITHUB_REPO` | No | Default repository name |

*Required only when the feature is enabled

---

## Health Checks

### Application Health

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456
}
```

### Docker Health Check

```bash
docker-compose ps
```

Healthy containers show `(healthy)` status.

### Test Connections

Run integration tests:

```bash
# Inside container
docker exec -it ai-orchestra-app npm test

# Or locally
npm test
```

---

## Troubleshooting

### Common Issues

**1. Container fails to start**

Check logs:
```bash
docker-compose logs ai-orchestra
```

Verify environment variables:
```bash
docker-compose config
```

**2. OpenAI connection fails**

- Verify API key is correct
- Check rate limits: https://platform.openai.com/account/rate-limits
- Ensure billing is set up

**3. Ollama models not available**

Pull the model:
```bash
docker exec -it ai-orchestra-ollama ollama pull llama2
```

Check model list:
```bash
docker exec -it ai-orchestra-ollama ollama list
```

**4. Port already in use**

Change ports in `.env`:
```bash
PORT=3001
WEBSOCKET_PORT=3002
```

Then restart:
```bash
docker-compose down
docker-compose up -d
```

**5. Database permissions**

Fix volume permissions:
```bash
chmod -R 777 database logs
docker-compose restart
```

### Debug Mode

Enable debug logging:

```bash
LOG_LEVEL=debug docker-compose up
```

### Reset Everything

Complete cleanup:

```bash
# Stop and remove containers
docker-compose down -v

# Remove images
docker rmi ai-orchestra

# Clean volumes
docker volume prune

# Restart fresh
docker-compose up -d --build
```

---

## Production Considerations

### Security

1. **API Keys**: Never commit `.env` files
2. **Firewall**: Restrict port access
3. **HTTPS**: Use reverse proxy (Nginx/Caddy)
4. **Updates**: Keep dependencies updated

### Performance

1. **Scaling**: Use multiple replicas
2. **Load Balancing**: Enable round-robin or random
3. **Caching**: Consider Redis for task queue
4. **Database**: Use PostgreSQL for production

### Monitoring

1. **Logs**: Centralize with ELK or similar
2. **Metrics**: Track API usage and costs
3. **Alerts**: Set up health check notifications
4. **Backups**: Regular database backups

### Example Production Setup

**docker-compose.prod.yml:**

```yaml
version: '3.8'

services:
  ai-orchestra:
    image: ai-orchestra:latest
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '2'
          memory: 4G
    environment:
      - NODE_ENV=production
      - DATABASE_TYPE=postgresql
    secrets:
      - openai_api_key
      - db_password

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl

secrets:
  openai_api_key:
    external: true
  db_password:
    external: true
```

### Backup Strategy

**Database backup:**

```bash
# SQLite
docker cp ai-orchestra-app:/app/database/memory.sqlite ./backups/

# PostgreSQL
docker exec ai-orchestra-postgres pg_dump -U postgres ai_orchestra > backup.sql
```

**Automated backups:**

```bash
# Add to crontab
0 2 * * * /path/to/backup-script.sh
```

---

## Next Steps

1. Configure your LLM providers
2. Set up GitHub integration (optional)
3. Review security settings
4. Set up monitoring
5. Read [Architecture Documentation](./ARCHITECTURE.md)
6. Explore [API Reference](./API_REFERENCE.md)

---

## Support

For issues and questions:
- GitHub Issues: https://github.com/your-org/AI-Orchestra/issues
- Documentation: https://docs.ai-orchestra.dev
- Community: https://discord.gg/ai-orchestra
