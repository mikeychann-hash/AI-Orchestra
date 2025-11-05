#!/bin/bash
# Start the AI Orchestra Orchestration Service

echo "🎼 Starting AI Orchestra Orchestration Service..."
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed!"
    echo "Please install Python 3.10 or higher"
    exit 1
fi

# Check Python version
python_version=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
required_version="3.10"

if (( $(echo "$python_version < $required_version" | bc -l) )); then
    echo "❌ Python version $python_version is too old!"
    echo "Please install Python 3.10 or higher"
    exit 1
fi

echo "✓ Python $python_version found"
echo ""

# Navigate to orchestrator directory
cd orchestrator || exit 1

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    echo "✓ Virtual environment created"
    echo ""
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -q -r requirements.txt
echo "✓ Dependencies installed"
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found!"
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo ""
    echo "⚠️  IMPORTANT: Please edit .env and add your API keys!"
    echo "   - OPENAI_API_KEY"
    echo "   - ANTHROPIC_API_KEY (optional)"
    echo "   - GROK_API_KEY (optional)"
    echo ""
    read -p "Press Enter after you've updated .env..."
fi

# Start the service
echo ""
echo "🚀 Starting orchestration service on http://localhost:8000"
echo ""
echo "API Documentation:"
echo "  - Swagger UI: http://localhost:8000/docs"
echo "  - ReDoc: http://localhost:8000/redoc"
echo ""
echo "Press Ctrl+C to stop the service"
echo ""

python main.py
