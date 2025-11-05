@echo off
REM Start the AI Orchestra Orchestration Service (Windows)

echo 🎼 Starting AI Orchestra Orchestration Service...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed!
    echo Please install Python 3.10 or higher
    pause
    exit /b 1
)

echo ✓ Python found
echo.

REM Navigate to orchestrator directory
cd orchestrator

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
    echo ✓ Virtual environment created
    echo.
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing dependencies...
pip install -q -r requirements.txt
echo ✓ Dependencies installed
echo.

REM Check if .env file exists
if not exist ".env" (
    echo ⚠️  No .env file found!
    echo Creating .env from .env.example...
    copy .env.example .env
    echo.
    echo ⚠️  IMPORTANT: Please edit .env and add your API keys!
    echo    - OPENAI_API_KEY
    echo    - ANTHROPIC_API_KEY (optional)
    echo    - GROK_API_KEY (optional)
    echo.
    pause
)

REM Start the service
echo.
echo 🚀 Starting orchestration service on http://localhost:8000
echo.
echo API Documentation:
echo   - Swagger UI: http://localhost:8000/docs
echo   - ReDoc: http://localhost:8000/redoc
echo.
echo Press Ctrl+C to stop the service
echo.

python main.py
