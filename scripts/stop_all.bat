@echo off
title Stopping Services

echo ========================================
echo  Stopping all services + freeing ports
echo ========================================
echo.

:: -- Kill by window title (safety) ------------------------------------
taskkill /fi "WINDOWTITLE eq Hermes Gateway*" /f 2>nul && echo [OK] Gateway stopped || echo [--] Gateway not found
taskkill /fi "WINDOWTITLE eq Hermes Core*" /f 2>nul && echo [OK] Core stopped || echo [--] Core not found
taskkill /fi "WINDOWTITLE eq Hermes Telegram*" /f 2>nul && echo [OK] Telegram Bot stopped || echo [--] Telegram Bot not found
taskkill /fi "WINDOWTITLE eq Book Intelligence*" /f 2>nul && echo [OK] Book API (standalone) stopped || echo [--] Book API not found

echo.
:: -- Force-free ports -------------------------------------------------
echo Freeing ports 8080, 8642, 9090...

for %%p in (8080 8642 9090) do (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%%p "') do (
        if not "%%a"=="" (
            taskkill /f /pid %%a >nul 2>&1 && echo   Port %%p freed (PID %%a)
        )
    )
)

echo.
echo =============================================
echo  All services stopped. Ports are free.
echo =============================================
pause
