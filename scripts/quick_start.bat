@echo off
REM ============================================
REM AI Orchestra - Quick Start Script (Windows)
REM ============================================

setlocal enabledelayedexpansion

echo.
echo ╔════════════════════════════════════════╗
echo ║                                        ║
echo ║         AI Orchestra Setup             ║
echo ║     Quick Start Installation           ║
echo ║                                        ║
echo ╚════════════════════════════════════════╝
echo.

REM Check if running from correct directory
if not exist "package.json" (
    echo [ERROR] Please run this script from the AI Orchestra root directory
    pause
    exit /b 1
)

REM Check prerequisites
echo ==^> Checking prerequisites...
echo.

where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo [X] Docker is not installed
    echo     Please install Docker Desktop from: https://docs.docker.com/desktop/windows/install/
    pause
    exit /b 1
) else (
    echo [OK] Docker is installed
)

docker compose version >nul 2>nul
if %errorlevel% neq 0 (
    docker-compose --version >nul 2>nul
    if %errorlevel% neq 0 (
        echo [X] Docker Compose is not installed
        echo     Please install Docker Compose from: https://docs.docker.com/compose/install/
        pause
        exit /b 1
    ) else (
        echo [OK] Docker Compose is installed
    )
) else (
    echo [OK] Docker Compose is installed
)

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Node.js is not installed (optional for development)
) else (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo [OK] Node.js is installed (!NODE_VERSION!)
)

echo.

REM Setup environment
echo ==^> Setting up environment...
echo.

if not exist ".env" (
    echo [!] .env file not found, creating from template...
    copy "config\.env.example" ".env" >nul
    echo [OK] Created .env file
    echo.
    echo [!] IMPORTANT: Please edit .env and add your API keys
    echo     Required: At least one LLM provider API key
    echo     - OpenAI: OPENAI_API_KEY
    echo     - Grok: GROK_API_KEY
    echo     - Ollama: Will start automatically with Docker
    echo.
    echo Press any key to continue after editing .env...
    pause >nul
) else (
    echo [OK] .env file already exists
)

echo.

REM Create directories
echo ==^> Creating required directories...
echo.

if not exist "database" mkdir database
if not exist "logs" mkdir logs

echo [OK] Created required directories
echo.

REM Start services
echo ==^> Starting AI Orchestra services...
echo.

docker ps | findstr "ai-orchestra-app" >nul 2>nul
if %errorlevel% equ 0 (
    echo [!] Services are already running
    set /p restart="Do you want to restart them? (y/N): "
    if /i "!restart!"=="y" (
        docker-compose down
    ) else (
        goto :skip_start
    )
)

echo [OK] Building and starting containers...
docker-compose up -d --build

echo [OK] Waiting for services to start...
timeout /t 10 /nobreak >nul

docker ps | findstr "ai-orchestra-app.*healthy" >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Services started successfully!
) else (
    echo [!] Services are starting... (health check in progress)
)

:skip_start
echo.

REM Ask about Ollama model
set /p pull_model="Do you want to pull an Ollama model now? (y/N): "
if /i "!pull_model!"=="y" (
    echo.
    echo Which model do you want to pull?
    echo   1) llama2 (7B - recommended for getting started)
    echo   2) mistral (7B - fast and capable)
    echo   3) codellama (7B - specialized for code)
    echo   4) Skip for now
    set /p model_choice="Enter your choice (1-4): "

    if "!model_choice!"=="1" (
        echo [OK] Pulling llama2 model...
        docker exec ai-orchestra-ollama ollama pull llama2
        echo [OK] Model pulled successfully
    ) else if "!model_choice!"=="2" (
        echo [OK] Pulling mistral model...
        docker exec ai-orchestra-ollama ollama pull mistral
        echo [OK] Model pulled successfully
    ) else if "!model_choice!"=="3" (
        echo [OK] Pulling codellama model...
        docker exec ai-orchestra-ollama ollama pull codellama
        echo [OK] Model pulled successfully
    ) else (
        echo [!] Skipped Ollama model download
    )
)

echo.

REM Ask about tests
set /p run_tests="Do you want to run integration tests? (y/N): "
if /i "!run_tests!"=="y" (
    echo.
    echo ==^> Running integration tests...
    docker exec ai-orchestra-app npm test
)

echo.

REM Print status
echo ==^> Service Status
echo.
docker-compose ps

echo.
echo ==^> Access Information
echo   Application:     http://localhost:3000
echo   Health Check:    http://localhost:3000/health
echo   WebSocket:       ws://localhost:3001
echo   Ollama:          http://localhost:11434

echo.
echo ==^> Useful Commands
echo   View logs:          docker-compose logs -f
echo   Stop services:      docker-compose down
echo   Restart services:   docker-compose restart
echo   Run tests:          docker exec ai-orchestra-app npm test

echo.
echo [OK] Setup complete! AI Orchestra is ready to use.
echo.

pause
