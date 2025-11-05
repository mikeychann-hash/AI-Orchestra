#!/bin/bash

# ============================================
# AI Orchestra - Quick Start Script (Unix/Linux/Mac)
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print banner
print_banner() {
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════╗"
    echo "║                                        ║"
    echo "║         AI Orchestra Setup             ║"
    echo "║     Quick Start Installation           ║"
    echo "║                                        ║"
    echo "╚════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Print section header
print_header() {
    echo -e "\n${BLUE}==>${NC} $1"
}

# Print success message
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Print error message
print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Print warning message
print_warning() {
    echo -e "${YELLOW}!${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking prerequisites..."

    local all_ok=true

    # Check Docker
    if command_exists docker; then
        print_success "Docker is installed"
    else
        print_error "Docker is not installed"
        echo "  Please install Docker from: https://docs.docker.com/get-docker/"
        all_ok=false
    fi

    # Check Docker Compose
    if command_exists docker-compose || docker compose version >/dev/null 2>&1; then
        print_success "Docker Compose is installed"
    else
        print_error "Docker Compose is not installed"
        echo "  Please install Docker Compose from: https://docs.docker.com/compose/install/"
        all_ok=false
    fi

    # Check Node.js (optional)
    if command_exists node; then
        NODE_VERSION=$(node --version)
        print_success "Node.js is installed ($NODE_VERSION)"
    else
        print_warning "Node.js is not installed (optional for development)"
    fi

    if [ "$all_ok" = false ]; then
        print_error "Prerequisites check failed. Please install required software."
        exit 1
    fi
}

# Setup environment
setup_environment() {
    print_header "Setting up environment..."

    if [ ! -f .env ]; then
        print_warning ".env file not found, creating from template..."
        cp config/.env.example .env
        print_success "Created .env file"
        echo ""
        print_warning "IMPORTANT: Please edit .env and add your API keys"
        echo "  Required: At least one LLM provider API key"
        echo "  - OpenAI: OPENAI_API_KEY"
        echo "  - Grok: GROK_API_KEY"
        echo "  - Ollama: Will start automatically with Docker"
        echo ""
        read -p "Press Enter to continue after editing .env (or Ctrl+C to exit)..."
    else
        print_success ".env file already exists"
    fi
}

# Create directories
create_directories() {
    print_header "Creating required directories..."

    mkdir -p database logs

    print_success "Created database directory"
    print_success "Created logs directory"
}

# Pull Ollama model
pull_ollama_model() {
    print_header "Setting up Ollama..."

    echo "Do you want to pull an Ollama model? (recommended: llama2)"
    echo "  1) llama2 (7B - recommended for getting started)"
    echo "  2) mistral (7B - fast and capable)"
    echo "  3) codellama (7B - specialized for code)"
    echo "  4) Skip for now"
    read -p "Enter your choice (1-4): " choice

    case $choice in
        1)
            print_success "Pulling llama2 model..."
            docker exec ai-orchestra-ollama ollama pull llama2
            print_success "Model pulled successfully"
            ;;
        2)
            print_success "Pulling mistral model..."
            docker exec ai-orchestra-ollama ollama pull mistral
            print_success "Model pulled successfully"
            ;;
        3)
            print_success "Pulling codellama model..."
            docker exec ai-orchestra-ollama ollama pull codellama
            print_success "Model pulled successfully"
            ;;
        4)
            print_warning "Skipped Ollama model download"
            ;;
        *)
            print_warning "Invalid choice, skipping model download"
            ;;
    esac
}

# Start services
start_services() {
    print_header "Starting AI Orchestra services..."

    # Check if services are already running
    if docker ps | grep -q "ai-orchestra-app"; then
        print_warning "Services are already running"
        read -p "Do you want to restart them? (y/N): " restart
        if [[ $restart =~ ^[Yy]$ ]]; then
            docker-compose down
        else
            return
        fi
    fi

    # Start services
    print_success "Building and starting containers..."
    docker-compose up -d --build

    # Wait for services to be healthy
    print_success "Waiting for services to start..."
    sleep 10

    # Check service status
    if docker ps | grep -q "ai-orchestra-app.*healthy"; then
        print_success "Services started successfully!"
    else
        print_warning "Services are starting... (health check in progress)"
    fi
}

# Run tests
run_tests() {
    print_header "Running integration tests..."

    if docker exec ai-orchestra-app npm test; then
        print_success "Tests passed!"
    else
        print_warning "Some tests failed. Check logs for details."
    fi
}

# Print status
print_status() {
    print_header "Service Status"

    docker-compose ps

    echo ""
    print_header "Access Information"
    echo "  🌐 Application:     http://localhost:3000"
    echo "  ❤️  Health Check:   http://localhost:3000/health"
    echo "  🔌 WebSocket:       ws://localhost:3001"
    echo "  🤖 Ollama:          http://localhost:11434"

    echo ""
    print_header "Useful Commands"
    echo "  View logs:          docker-compose logs -f"
    echo "  Stop services:      docker-compose down"
    echo "  Restart services:   docker-compose restart"
    echo "  Run tests:          docker exec ai-orchestra-app npm test"

    echo ""
}

# Main setup flow
main() {
    print_banner

    # Check if running from correct directory
    if [ ! -f "package.json" ]; then
        print_error "Please run this script from the AI Orchestra root directory"
        exit 1
    fi

    check_prerequisites
    setup_environment
    create_directories
    start_services

    # Ask about Ollama model
    echo ""
    read -p "Do you want to pull an Ollama model now? (y/N): " pull_model
    if [[ $pull_model =~ ^[Yy]$ ]]; then
        pull_ollama_model
    fi

    # Ask about tests
    echo ""
    read -p "Do you want to run integration tests? (y/N): " run_test
    if [[ $run_test =~ ^[Yy]$ ]]; then
        run_tests
    fi

    print_status

    print_success "Setup complete! AI Orchestra is ready to use."
    echo ""
}

# Run main function
main
