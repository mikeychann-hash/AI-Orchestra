#!/bin/bash
# AI-Orchestra Quick Start Script
# Automates the setup process for new installations

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ${NC} $1"; }
print_warn() { echo -e "${YELLOW}⚠${NC} $1"; }

# Check if command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Banner
echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║                                                       ║"
echo "║         AI-Orchestra Quick Start Setup                ║"
echo "║              Phase 9: Visual Canvas                   ║"
echo "║                                                       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Check prerequisites
print_info "Checking prerequisites..."

if ! command_exists node; then
  print_error "Node.js is not installed. Please install Node.js v18.0.0 or higher."
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  print_error "Node.js version must be 18.0.0 or higher. Current: $(node -v)"
  exit 1
fi
print_success "Node.js $(node -v) detected"

if ! command_exists npm; then
  print_error "npm is not installed."
  exit 1
fi
print_success "npm $(npm -v) detected"

if ! command_exists git; then
  print_error "Git is not installed."
  exit 1
fi
print_success "Git $(git --version | awk '{print $3}') detected"

# Install backend dependencies
print_info "Installing backend dependencies..."
npm install --silent
if [ $? -eq 0 ]; then
  print_success "Backend dependencies installed"
else
  print_error "Failed to install backend dependencies"
  exit 1
fi

# Install dashboard dependencies
print_info "Installing dashboard dependencies..."
cd dashboard
npm install --silent
cd ..
if [ $? -eq 0 ]; then
  print_success "Dashboard dependencies installed"
else
  print_error "Failed to install dashboard dependencies"
  exit 1
fi

# Setup environment file
if [ ! -f ".env" ]; then
  print_info "Creating .env file from template..."
  cp .env.example .env
  print_success ".env file created"
  print_warn "Please edit .env and add your LLM provider API key"
else
  print_warn ".env file already exists, skipping..."
fi

# Check for API keys
if [ -f ".env" ]; then
  if grep -q "OPENAI_API_KEY=sk-" .env || grep -q "ANTHROPIC_API_KEY=sk-ant-" .env; then
    print_success "API key found in .env"
  else
    print_warn "No API key detected in .env. You'll need to add one before running."
    echo ""
    echo "  Supported providers:"
    echo "    - OPENAI_API_KEY=sk-xxx"
    echo "    - ANTHROPIC_API_KEY=sk-ant-xxx"
    echo "    - CLAUDE_API_KEY=sk-ant-xxx"
    echo ""
  fi
fi

# Run Phase 9 migration
print_info "Running Phase 9 database migration..."
node scripts/migrate_to_phase9.js migrate
if [ $? -eq 0 ]; then
  print_success "Phase 9 migration completed"
else
  print_warn "Phase 9 migration failed or already completed"
fi

# Verify migration
print_info "Verifying database setup..."
node scripts/migrate_to_phase9.js verify
if [ $? -eq 0 ]; then
  print_success "Database verification passed"
else
  print_warn "Database verification had issues (this may be OK)"
fi

# Create necessary directories
print_info "Creating directories..."
mkdir -p .worktrees
mkdir -p data
mkdir -p logs
print_success "Directories created"

# Success message
echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║                                                       ║"
echo "║          ✨ Setup Complete! ✨                        ║"
echo "║                                                       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
print_success "AI-Orchestra is ready to use!"
echo ""
echo "Next steps:"
echo ""
echo "  1. Add your API key to .env file:"
echo "     ${YELLOW}nano .env${NC}  or  ${YELLOW}vim .env${NC}"
echo ""
echo "  2. Start the backend server:"
echo "     ${YELLOW}npm start${NC}"
echo ""
echo "  3. In a new terminal, start the dashboard:"
echo "     ${YELLOW}cd dashboard && npm run dev${NC}"
echo ""
echo "  4. Access the application:"
echo "     ${BLUE}Backend:${NC}  http://localhost:3000"
echo "     ${BLUE}Dashboard:${NC} http://localhost:3001"
echo ""
echo "  5. Read the startup guide for more details:"
echo "     ${YELLOW}cat STARTUP_GUIDE.md${NC}"
echo ""
echo "For documentation, visit: ${BLUE}/docs/PHASE_9_DOCUMENTATION_INDEX.md${NC}"
echo ""
print_info "Need help? Open an issue at: https://github.com/mikeychann-hash/AI-Orchestra/issues"
echo ""
