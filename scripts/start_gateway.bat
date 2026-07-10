@echo off
title Hermes Gateway :%GATEWAY_PORT%
cd /d "%~dp0..\runtime"
if "%GATEWAY_HOST%"=="" set GATEWAY_HOST=127.0.0.1
if "%GATEWAY_PORT%"=="" set GATEWAY_PORT=8080
echo [Gateway] Starting on %GATEWAY_HOST%:%GATEWAY_PORT%...
.venv\Scripts\uvicorn gateway.main:app --host %GATEWAY_HOST% --port %GATEWAY_PORT% --log-level info
if errorlevel 1 pause
