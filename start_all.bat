@echo off
chcp 65001 >nul
echo ========================================
echo   Arkaim Digital Consciousness
echo   Full Stack Startup
echo ========================================
echo.

:: =============================================
:: 1. BACKEND (FastAPI)
:: =============================================
echo [1/5] Starting Backend (FastAPI)...
cd /d "%~dp0runtime"

if not exist ".venv\Scripts\python.exe" (
    echo ERROR: Python venv not found in runtime\
    echo Run: cd runtime ^&^& python -m venv .venv ^&^& .venv\Scripts\pip install -r requirements.txt
    pause
    exit /b 1
)

if not exist ".env" (
    if exist ".env.example" (
        echo WARNING: .env not found! Copying from .env.example...
        copy .env.example .env >nul
    )
)

set PYTHONPATH=%CD%
start "Arkaim Backend :8642" cmd /c ".venv\Scripts\python.exe -m uvicorn core.main:app --host 127.0.0.1 --port 8642 --log-level info"
echo   Backend starting on http://127.0.0.1:8642
timeout /t 3 /nobreak >nul

:: =============================================
:: 2. FRONTEND (Next.js)
:: =============================================
echo [2/5] Starting Frontend (Next.js)...
cd /d "%~dp0arkaim-web"

if not exist "node_modules\.package-lock.json" (
    echo Installing frontend dependencies...
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install frontend dependencies!
        pause
        exit /b 1
    )
)

start "Arkaim Frontend :3000" cmd /c "npm run dev"
echo   Frontend starting on http://localhost:3000
timeout /t 5 /nobreak >nul

:: =============================================
:: 3. OPEN BROWSER
:: =============================================
echo [3/5] Opening browser...
start http://localhost:3000

:: =============================================
:: 4. STATUS
:: =============================================
echo [4/5] Checking services...
timeout /t 2 /nobreak >nul

set "BACKEND_OK="
set "FRONTEND_OK="
netstat -ano | findstr ":8642 " | findstr LISTENING >nul 2>&1 && set BACKEND_OK=1
netstat -ano | findstr ":3000 " | findstr LISTENING >nul 2>&1 && set FRONTEND_OK=1

if defined BACKEND_OK (
    echo   [OK] Backend:  http://127.0.0.1:8642
) else (
    echo   [..] Backend:  starting...
)

if defined FRONTEND_OK (
    echo   [OK] Frontend: http://localhost:3000
) else (
    echo   [..] Frontend: starting...
)

:: =============================================
:: 5. DONE
:: =============================================
echo.
echo ========================================
echo   All services started!
echo.
echo   Frontend:  http://localhost:3000
echo   Backend:   http://127.0.0.1:8642
echo   API Docs:  http://127.0.0.1:8642/docs
echo.
echo   Run stop_all.bat to stop everything.
echo ========================================
echo.
pause
