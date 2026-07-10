@echo off
echo ========================================
echo   Arkaim - Stopping services
echo ========================================
echo.

echo Stopping by window title...
taskkill /fi "WINDOWTITLE eq Hermes Core*" /f >nul 2>&1 && echo   [OK] Core stopped || echo   [--] Core not found
taskkill /fi "WINDOWTITLE eq Hermes Gateway*" /f >nul 2>&1 && echo   [OK] Gateway stopped || echo   [--] Gateway not found
taskkill /fi "WINDOWTITLE eq Hermes Telegram*" /f >nul 2>&1 && echo   [OK] Telegram Bot stopped || echo   [--] Telegram Bot not found

echo.
echo Freeing ports 8642, 8080...

for %%p in (8642 8080) do (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%%p " ^| findstr LISTENING 2^>nul') do (
        if not "%%a"=="0" (
            echo   Killing PID %%a on port %%p
            taskkill /f /pid %%a >nul 2>&1
        )
    )
)

timeout /t 2 /nobreak >nul

set "STILL="
netstat -ano | findstr ":8642 " | findstr LISTENING >nul 2>&1 && set STILL=1
netstat -ano | findstr ":8080 " | findstr LISTENING >nul 2>&1 && set STILL=1

if defined STILL (
    echo WARNING: Some ports still in use.
) else (
    echo All ports free.
)

echo.
echo Done.
