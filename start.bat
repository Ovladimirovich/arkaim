@echo off
chcp 65001 >nul
echo ========================================
echo   Arkaim Digital Consciousness
echo   Server Startup
echo ========================================
echo.

cd /d "%~dp0runtime"

:: ── Проверка Python ──────────────────────────────
echo [1/4] Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found! Install Python 3.10+
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('python --version 2^>^&1') do echo   %%v

:: ── Проверка venv ────────────────────────────────
echo [2/4] Checking virtual environment...
if not exist ".venv\Scripts\python.exe" (
    echo Creating virtual environment...
    python -m venv .venv
    if errorlevel 1 (
        echo ERROR: Failed to create venv!
        pause
        exit /b 1
    )
    echo Installing dependencies...
    .venv\Scripts\pip install -r requirements.txt
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies!
        pause
        exit /b 1
    )
)
echo   venv OK.

:: ── Проверка .env ────────────────────────────────
echo [3/4] Checking configuration...
if not exist ".env" (
    if exist ".env.example" (
        echo WARNING: .env not found! Copying from .env.example...
        copy .env.example .env >nul
        echo   Please edit .env with your values.
        echo.
    ) else (
        echo WARNING: .env file not found!
        echo Create .env with required variables (see .env.example^).
        echo.
    )
)

:: Проверка критических переменных
for /f "tokens=1,* delims==" %%a in (.env 2^>nul) do (
    if "%%a"=="SESSION_SECRET" (
        if "%%b"=="change-me-in-production" (
            echo WARNING: SESSION_SECRET is default value!
            echo   Generate a secure key: python -c "import secrets; print(secrets.token_urlsafe(48))"
            echo.
        )
    )
)

:: ── Запуск сервера ───────────────────────────────
echo [4/4] Starting server...
echo.
if "%CORE_HOST%"=="" set CORE_HOST=127.0.0.1
if "%CORE_PORT%"=="" set CORE_PORT=8642
set PYTHONPATH=%CD%

echo   Server:   http://%CORE_HOST%:%CORE_PORT%
echo   API Docs: http://%CORE_HOST%:%CORE_PORT%/docs
echo   Web UI:   http://%CORE_HOST%:%CORE_PORT%/_ui/book
echo.
echo   Press Ctrl+C to stop the server.
echo.

.venv\Scripts\python -m uvicorn core.main:app --host %CORE_HOST% --port %CORE_PORT% --log-level info
if errorlevel 1 (
    echo.
    echo Server exited with error. Check logs in runtime\logs\
)
pause
