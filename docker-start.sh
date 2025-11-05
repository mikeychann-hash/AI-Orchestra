#!/bin/bash
# AI Orchestra Docker Startup Script

echo "🎵 Starting AI Orchestra..."
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Creating from .env.example..."
    cp .env.example .env
    echo "📝 Please edit .env with your API keys before continuing."
    echo ""
    exit 1
fi

# Start services
echo "🐳 Starting Docker services..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be healthy..."
echo ""

# Wait for Ollama
echo "  📡 Waiting for Ollama..."
until docker-compose exec -T ollama curl -s http://localhost:11434/api/tags > /dev/null 2>&1; do
    echo "     Still waiting for Ollama..."
    sleep 2
done
echo "  ✅ Ollama is ready"

# Pull required models
echo ""
echo "🔄 Pulling required Ollama models..."
echo "  This may take a while on first run..."
echo ""

docker-compose exec -T ollama ollama pull qwen2.5:1.5b
docker-compose exec -T ollama ollama pull mistral:7b
docker-compose exec -T ollama ollama pull codellama:13b

echo ""
echo "✅ All models pulled successfully"

# Wait for orchestrator
echo ""
echo "  📡 Waiting for Orchestrator..."
until docker-compose exec -T orchestrator curl -s http://localhost:8000/health > /dev/null 2>&1; do
    echo "     Still waiting for Orchestrator..."
    sleep 2
done
echo "  ✅ Orchestrator is ready"

# Wait for dashboard
echo ""
echo "  📡 Waiting for Dashboard..."
until docker-compose exec -T dashboard curl -s http://localhost:3000/api/health > /dev/null 2>&1; do
    echo "     Still waiting for Dashboard..."
    sleep 2
done
echo "  ✅ Dashboard is ready"

echo ""
echo "🎉 AI Orchestra is now running!"
echo ""
echo "📊 Dashboard:      http://localhost:3000"
echo "🔧 Orchestrator:   http://localhost:8000"
echo "🤖 Ollama:         http://localhost:11434"
echo ""
echo "To view logs:"
echo "  docker-compose logs -f"
echo ""
echo "To stop:"
echo "  docker-compose down"
echo ""
