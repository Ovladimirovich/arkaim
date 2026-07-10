@echo off
title Hermes Launcher

set RUNTIME=%~dp0..\runtime

:: env support
if "%GATEWAY_HOST%"=="" set GATEWAY_HOST=127.0.0.1
if "%GATEWAY_PORT%"=="" set GATEWAY_PORT=8080
if "%CORE_HOST%"=="" set CORE_HOST=127.0.0.1
if "%CORE_PORT%"=="" set CORE_PORT=8642

echo ========================================
echo  Starting all services (port cleanup)
echo ========================================
echo.

:: -- Kill processes on target ports --------------------------------
echo [1/4] Freeing ports %GATEWAY_PORT%, %CORE_PORT%, 9090...

for %%p in (%GATEWAY_PORT% %CORE_PORT% 9090) do (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%%p "') do (
        if not "%%a"=="" (
            taskkill /f /pid %%a >nul 2>&1 && echo   Port %%p freed (PID %%a)
        )
    )
)
timeout /t 2 /nobreak >nul

:: -- Start Gateway -------------------------------------------------
echo [2/4] Starting Gateway (:%GATEWAY_PORT%)...
start "Hermes Gateway :%GATEWAY_PORT%" cmd /c "cd /d %RUNTIME% && .venv\Scripts\uvicorn gateway.main:app --host %GATEWAY_HOST% --port %GATEWAY_PORT% --log-level info"
timeout /t 3 /nobreak >nul

:: -- Start Core + Book API -----------------------------------------
echo [3/4] Starting Core (:%CORE_PORT%, includes Book API)...
start "Hermes Core :%CORE_PORT% (Book API)" cmd /c "cd /d %RUNTIME% && .venv\Scripts\uvicorn core.main:app --host %CORE_HOST% --port %CORE_PORT% --log-level info"
timeout /t 3 /nobreak >nul

:: -- Start Telegram Bot --------------------------------------------
echo [4/4] Starting Telegram Bot...
start "Hermes Telegram Bot" cmd /c "cd /d %RUNTIME% && .venv\Scripts\python -m integrations.telegram.run"

:: -- Status check --------------------------------------------------
timeout /t 2 /nobreak >nul
echo.
echo =============================================
echo  Status:
for %%a in (
    "8080:Gateway"
    "8642:Core (includes Book API)"
) do (
    for /f "tokens=1,2 delims=:" %%p in (%%a) do (
        netstat -ano | findstr ":%%p " >nul && echo  [OK] Port %%p -- %%q || echo  [--] Port %%p -- %%q
    )
)
echo =============================================
echo.
echo  Book Intelligence:  http://%CORE_HOST%:%CORE_PORT%/book
echo  X-Ray Dashboard:    http://%CORE_HOST%:%CORE_PORT%/_ui/index.html
echo  Book UI:            http://%CORE_HOST%:%CORE_PORT%/_ui/book.html
echo  Gateway Health:     http://%GATEWAY_HOST%:%GATEWAY_PORT%/health
echo.
timeout /t 1 /nobreak >nul

:: -- Open browser tabs ------------------------------------------------
echo Opening browser tabs...
start "" "http://%CORE_HOST%:%CORE_PORT%/_ui/book.html"
start "" "http://%CORE_HOST%:%CORE_PORT%/_ui/index.html"
start "" "http://%CORE_HOST%:%CORE_PORT%/book"

echo.
echo Done. Close this window to keep services running.
echo To stop all services, run stop_all.bat
pause
