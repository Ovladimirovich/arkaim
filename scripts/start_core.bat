@echo off
chcp 65001 >nul
title Hermes Core :%CORE_PORT%
cd /d "%~dp0..\runtime"

if "%CORE_HOST%"=="" set CORE_HOST=127.0.0.1
if "%CORE_PORT%"=="" set CORE_PORT=8642
set PYTHONPATH=%CD%

echo [Core] Starting on %CORE_HOST%:%CORE_PORT%...
.venv\Scripts\python -m uvicorn core.main:app --host %CORE_HOST% --port %CORE_PORT% --log-level info
if errorlevel 1 (
    echo.
    echo [Core] Exited with error. Check logs\
    pause
)
