@echo off
echo ========================================
echo   Arkaim Digital Consciousness
echo   Server Startup
echo ========================================
echo.

cd /d "%~dp0runtime"

echo [1/3] Checking dependencies...
python -c "import fastapi" 2>nul
if errorlevel 1 (
    echo Installing dependencies...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo Error installing dependencies!
        pause
        exit /b 1
    )
)
echo Dependencies OK.
echo.

echo [2/3] Checking .env file...
if not exist ".env" (
    echo WARNING: .env file not found!
    echo Create .env file with required variables:
    echo   HERMES_URL
    echo   HERMES_API_KEY
    echo   GIGACHAT_CLIENT_ID
    echo   GIGACHAT_CLIENT_SECRET
    echo.
    pause
)

echo [3/3] Starting server...
echo Server will be available at: http://localhost:8642
echo API Documentation: http://localhost:8642/docs
echo Web UI: http://localhost:8642/_ui/book.html
echo.
echo Press Ctrl+C to stop the server.
echo.

if "%CORE_HOST%"=="" set CORE_HOST=127.0.0.1
if "%CORE_PORT%"=="" set CORE_PORT=8642
set PYTHONPATH=%CD%
.venv\Scripts\python -m uvicorn core.main:app --host %CORE_HOST% --port %CORE_PORT%

pause
