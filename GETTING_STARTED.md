# Getting Started with AI Orchestra

Welcome to AI Orchestra! This comprehensive guide will walk you through everything you need to download, install, and run the system from start to finish.

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Prerequisites Installation](#prerequisites-installation)
3. [Getting API Keys](#getting-api-keys)
4. [Project Setup](#project-setup)
5. [Configuration](#configuration)
6. [Installation Methods](#installation-methods)
7. [Accessing the Dashboard](#accessing-the-dashboard)
8. [Verification](#verification)
9. [Troubleshooting](#troubleshooting)
10. [Next Steps](#next-steps)

---

## System Requirements

### Minimum Hardware Requirements
- **CPU**: 2+ cores (4+ recommended)
- **RAM**: 4GB minimum (8GB+ recommended, especially with Ollama)
- **Disk Space**: 10GB free (more if using Ollama models)
- **Internet**: Stable connection for API calls

### Supported Operating Systems
- **Linux**: Ubuntu 20.04+, Debian 10+, CentOS 8+, or similar
- **macOS**: 10.15 (Catalina) or later
- **Windows**: 10/11 with WSL2 (for Docker)

---

## Prerequisites Installation

### 1. Install Git

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install git -y
```

**macOS:**
```bash
# Install Homebrew first if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Git
brew install git
```

**Windows:**
Download and install from: https://git-scm.com/download/win

**Verify Installation:**
```bash
git --version
# Should show: git version 2.x.x
```

---

### 2. Choose Your Installation Method

AI Orchestra can be run in two ways:
- **Method A**: Docker (Recommended - Easier Setup)
- **Method B**: Native Node.js (For Development)

---

## Method A: Docker Installation (Recommended)

### Install Docker and Docker Compose

#### Linux (Ubuntu/Debian)
```bash
# Remove old versions
sudo apt-get remove docker docker-engine docker.io containerd runc

# Install dependencies
sudo apt-get update
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add your user to docker group (to run without sudo)
sudo usermod -aG docker $USER
newgrp docker
```

#### macOS
```bash
# Download Docker Desktop from:
# https://www.docker.com/products/docker-desktop

# Or install with Homebrew
brew install --cask docker

# Launch Docker Desktop from Applications
```

#### Windows
1. Enable WSL2: https://docs.microsoft.com/en-us/windows/wsl/install
2. Download Docker Desktop: https://www.docker.com/products/docker-desktop
3. Install and follow the setup wizard

**Verify Installation:**
```bash
docker --version
# Should show: Docker version 20.10+

docker compose version
# Should show: Docker Compose version 2.0+
```

---

## Method B: Native Node.js Installation

### Install Node.js 18+ and npm

#### Linux (Ubuntu/Debian)
```bash
# Install Node.js 18.x using NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should show: v18.x.x or higher
npm --version   # Should show: v9.x.x or higher
```

#### macOS
```bash
# Install with Homebrew
brew install node@18

# Or use nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

#### Windows
Download the installer from: https://nodejs.org/en/download/
- Choose "LTS" version (18.x or higher)
- Run the installer and follow the wizard

**Verify Installation:**
```bash
node --version  # Should show: v18.x.x or higher
npm --version   # Should show: v9.x.x or higher
```

---

## Getting API Keys

AI Orchestra supports multiple LLM providers. You need at least ONE of the following:

### Option 1: OpenAI (Recommended for Beginners)

1. Go to https://platform.openai.com/signup
2. Create an account or sign in
3. Navigate to https://platform.openai.com/api-keys
4. Click "Create new secret key"
5. Copy the key (starts with `sk-...`)
6. **Save it securely** - you won't see it again!

**Cost**: Pay-as-you-go, ~$0.01-0.10 per request depending on model

### Option 2: Grok (xAI)

1. Go to https://x.ai/
2. Sign up for API access
3. Navigate to your API keys section
4. Generate a new API key
5. Copy and save the key

**Cost**: Varies based on xAI pricing

### Option 3: Ollama (Free, Local)

No API key needed! Ollama runs locally on your machine.

**Cost**: Free, but requires more disk space and CPU/RAM

**Note**: When using Docker, Ollama is included automatically!

---

## Project Setup

### 1. Clone the Repository

```bash
# Clone the repo
git clone https://github.com/mikeychann-hash/AI-Orchestra.git

# Navigate into the directory
cd AI-Orchestra

# Check that you're in the right place
ls -la
# You should see: package.json, docker-compose.yml, server.js, etc.
```

### 2. Create Configuration File

```bash
# Copy the example environment file
cp config/.env.example .env

# Open the file in your favorite editor
nano .env
# or
vim .env
# or on macOS/Windows
open .env
notepad .env
```

---

## Configuration

### Edit the `.env` File

Open the `.env` file and configure it based on your needs:

#### Basic Configuration (Required)

```bash
# Application Settings
NODE_ENV=production
PORT=3000
HOST=localhost

# Choose your primary LLM provider
LLM_DEFAULT_PROVIDER=openai  # or 'grok' or 'ollama'
```

#### OpenAI Configuration (If using OpenAI)

```bash
OPENAI_ENABLED=true
OPENAI_API_KEY=sk-your-actual-api-key-here
OPENAI_DEFAULT_MODEL=gpt-4-turbo-preview
```

#### Grok Configuration (If using Grok)

```bash
GROK_ENABLED=true
GROK_API_KEY=your-grok-api-key-here
GROK_DEFAULT_MODEL=grok-beta
```

#### Ollama Configuration (If using Ollama)

```bash
OLLAMA_ENABLED=true
# For Docker (default):
OLLAMA_HOST=http://ollama:11434
# For native installation:
# OLLAMA_HOST=http://localhost:11434
OLLAMA_DEFAULT_MODEL=llama2
```

#### Advanced Configuration (Optional)

```bash
# Enable fallback between providers
LLM_ENABLE_FALLBACK=true

# Load balancing strategy: round-robin, random, or default
LLM_LOAD_BALANCING=round-robin

# Database (SQLite by default, PostgreSQL optional)
DATABASE_TYPE=sqlite
DATABASE_PATH=./database/memory.sqlite

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=./logs/orchestra.log

# GitHub Integration (Optional)
GITHUB_ENABLED=false
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_OWNER=your-github-username
GITHUB_REPO=your-repo-name
```

**Save the file** when you're done editing.

---

## Installation Methods

### Method A: Docker Compose (Recommended)

#### Step 1: Start the Services

```bash
# Start all services in detached mode
docker compose up -d

# This will:
# 1. Build the AI Orchestra application
# 2. Start the Ollama service (local LLM)
# 3. Create necessary networks and volumes
# 4. Start the web dashboard
```

#### Step 2: Wait for Services to Start

```bash
# Monitor the logs
docker compose logs -f

# Look for messages like:
# "AI Orchestra Server running on port 3000"
# "Dashboard available at http://localhost:3001"

# Press Ctrl+C to stop viewing logs (services keep running)
```

#### Step 3: Check Service Status

```bash
# View running containers
docker compose ps

# Should show:
# - ai-orchestra-app (running)
# - ai-orchestra-ollama (running)
```

#### Step 4: Download Ollama Models (If using Ollama)

```bash
# Connect to the Ollama container
docker exec -it ai-orchestra-ollama ollama pull llama2

# Or pull other models:
# docker exec -it ai-orchestra-ollama ollama pull mistral
# docker exec -it ai-orchestra-ollama ollama pull codellama
```

**Docker is now ready!** Proceed to [Accessing the Dashboard](#accessing-the-dashboard).

---

### Method B: Native Node.js Installation

#### Step 1: Install Dependencies

```bash
# Install backend dependencies
npm install

# Navigate to dashboard and install frontend dependencies
cd dashboard
npm install
cd ..
```

#### Step 2: Install Ollama (Optional, for local LLM)

**Linux:**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

**macOS:**
```bash
brew install ollama
```

**Windows:**
Download from: https://ollama.ai/download

**Start Ollama and download models:**
```bash
# Start Ollama service (in a separate terminal)
ollama serve

# In another terminal, download models
ollama pull llama2
ollama pull mistral  # Optional
ollama pull codellama  # Optional
```

#### Step 3: Start the Backend Server

```bash
# For production mode
npm start

# Or for development mode (with auto-reload)
npm run dev
```

You should see:
```
AI Orchestra Server running on port 3000
Dashboard available at http://localhost:3001
```

#### Step 4: Start the Dashboard (In a new terminal)

```bash
# Open a new terminal in the project directory
cd dashboard

# For production
npm run build
npm start

# Or for development
npm run dev
```

**Native installation is now ready!** Proceed to [Accessing the Dashboard](#accessing-the-dashboard).

---

## Accessing the Dashboard

### Open the Dashboard

1. Open your web browser
2. Navigate to: **http://localhost:3001**

### Dashboard Features

You should see the **FusionForge Dashboard** with:

- **Overview**: System metrics and recent activity
- **Build Pipeline**: Trigger new LLM queries
- **Agent Logs**: Real-time log streaming
- **Artifacts**: View generated files
- **Agents**: Monitor agent status
- **Configuration**: Manage LLM providers

### Test the API

```bash
# Health check
curl http://localhost:3000/health

# Should return: {"status":"ok","timestamp":"..."}

# Query an LLM
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Hello! Can you introduce yourself?",
    "provider": "openai"
  }'
```

---

## Verification

### Verify Everything is Working

#### 1. Check Docker Containers (Docker method)

```bash
docker compose ps

# All services should show "Up" status
```

#### 2. Check Server Logs

**Docker:**
```bash
docker compose logs ai-orchestra
```

**Native:**
Check the terminal where you ran `npm start`

#### 3. Check Available Providers

```bash
curl http://localhost:3000/api/providers
```

Should return a list of enabled providers:
```json
{
  "providers": [
    {
      "name": "openai",
      "enabled": true,
      "available": true
    },
    {
      "name": "ollama",
      "enabled": true,
      "available": true
    }
  ]
}
```

#### 4. Test a Query in the Dashboard

1. Go to **Build Pipeline** in the dashboard
2. Enter a prompt: "Write a hello world function in Python"
3. Select your provider (OpenAI, Grok, or Ollama)
4. Click "Submit"
5. Watch the response stream in real-time!

---

## Troubleshooting

### Common Issues

#### Issue: "Cannot connect to Docker daemon"

**Solution:**
```bash
# Start Docker service
sudo systemctl start docker

# Or on macOS/Windows, start Docker Desktop
```

#### Issue: "Port 3000 or 3001 already in use"

**Solution:**
```bash
# Find what's using the port
sudo lsof -i :3000
# or
sudo netstat -tulpn | grep 3000

# Kill the process or change ports in .env
PORT=3002
WEBSOCKET_PORT=3003
```

#### Issue: "OPENAI_API_KEY is not set"

**Solution:**
```bash
# Make sure you have a .env file
ls -la .env

# Check that the API key is set
cat .env | grep OPENAI_API_KEY

# If missing, edit .env and add:
OPENAI_API_KEY=sk-your-key-here
```

#### Issue: "Ollama connection refused"

**Solution for Docker:**
```bash
# Check if ollama container is running
docker compose ps

# Restart ollama service
docker compose restart ollama
```

**Solution for Native:**
```bash
# Start ollama service
ollama serve

# In another terminal, check if it's running
curl http://localhost:11434/api/tags
```

#### Issue: Dashboard shows "Cannot connect to server"

**Solution:**
```bash
# Check if backend is running
curl http://localhost:3000/health

# Check CORS settings in .env
CORS_ENABLED=true
CORS_ORIGIN=http://localhost:3001

# Restart services
docker compose restart  # Docker
# or
npm start  # Native
```

#### Issue: "Module not found" errors

**Solution:**
```bash
# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# For dashboard
cd dashboard
rm -rf node_modules package-lock.json
npm install
```

### Getting Help

If you encounter issues not covered here:

1. **Check the logs**:
   ```bash
   # Docker
   docker compose logs -f

   # Native
   tail -f logs/orchestra.log
   ```

2. **Check existing issues**: https://github.com/mikeychann-hash/AI-Orchestra/issues

3. **Create a new issue** with:
   - Your operating system
   - Installation method (Docker or Native)
   - Error messages
   - Steps to reproduce

---

## Next Steps

### 1. Explore the Dashboard

- Try different LLM providers
- Test the Build Pipeline with various prompts
- Monitor agent logs in real-time
- Check out the system metrics

### 2. Configure Multiple Providers

Enable multiple providers for fallback and load balancing:

```bash
# Edit .env
OPENAI_ENABLED=true
GROK_ENABLED=true
OLLAMA_ENABLED=true
LLM_ENABLE_FALLBACK=true
```

### 3. Read the Documentation

- [Architecture Overview](AI%20Orchestra.md)
- [Dashboard Guide](docs/DASHBOARD.md)
- [Production Deployment](docs/PRODUCTION.md)
- [Deployment Guide](docs/DEPLOYMENT.md)

### 4. Develop Custom Agents

Check out the `agents/` directory for examples of autonomous agents.

### 5. Integrate with GitHub

Enable GitHub integration for automated PR reviews and issue management:

```bash
# Get a GitHub Personal Access Token
# https://github.com/settings/tokens

# Add to .env
GITHUB_ENABLED=true
GITHUB_TOKEN=your_token_here
GITHUB_OWNER=your-username
GITHUB_REPO=your-repo
```

### 6. Set Up Production Deployment

When you're ready to deploy:

```bash
# Use production docker-compose
docker compose -f docker-compose.prod.yml up -d

# See docs/PRODUCTION.md for full guide including:
# - SSL/TLS setup
# - Nginx reverse proxy
# - Monitoring with Prometheus/Grafana
# - Automated backups
# - CI/CD with GitHub Actions
```

---

## Quick Reference

### Docker Commands

```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# View logs
docker compose logs -f

# Restart services
docker compose restart

# Rebuild and start
docker compose up -d --build

# Check status
docker compose ps

# Execute command in container
docker exec -it ai-orchestra-app sh
```

### Native Commands

```bash
# Start backend
npm start

# Start in dev mode
npm run dev

# Run tests
npm test

# Start dashboard
cd dashboard && npm run dev
```

### API Endpoints

```bash
# Health check
GET http://localhost:3000/health

# Query LLM
POST http://localhost:3000/api/query

# Stream response
POST http://localhost:3000/api/stream

# List providers
GET http://localhost:3000/api/providers

# List models
GET http://localhost:3000/api/models

# System status
GET http://localhost:3000/api/status
```

---

## Congratulations!

You've successfully set up AI Orchestra! 🎉

You now have a powerful multi-LLM development system with:
- ✅ Multiple LLM providers configured
- ✅ Web dashboard running
- ✅ API server ready
- ✅ Distributed agent orchestration

**Happy orchestrating!** 🎼🤖

---

**Need help?** Open an issue: https://github.com/mikeychann-hash/AI-Orchestra/issues

**Want to contribute?** Check out our [Contributing Guidelines](CONTRIBUTING.md)
