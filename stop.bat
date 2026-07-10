@echo off
chcp 65001 >nul
echo ========================================
echo   Arkaim Digital Consciousness
echo   Server Shutdown
echo ========================================
echo.

:: ── Остановка по портам ──────────────────────────
echo Checking ports...

set "FOUND="
for %%p in (8642 8080) do (
    netstat -ano | findstr ":%%p " | findstr LISTENING >nul 2>&1
    if not errorlevel 1 (
        echo   Port %%p: in use
        set "FOUND=1"
    ) else (
        echo   Port %%p: free
    )
)

if not defined FOUND (
    echo.
    echo No Arkaim services running.
    goto :end
)

echo.
set /p CONFIRM="Stop all Arkaim services? (Y/N): "
if /i not "%CONFIRM%"=="Y" (
    echo Cancelled.
    goto :end
)

echo.
echo Stopping services...

:: ── Остановка по имени окна (безопасно) ──────────
taskkill /fi "WINDOWTITLE eq Hermes Core*" /f >nul 2>&1 && echo   [OK] Core stopped || echo   [--] Core not found
taskkill /fi "WINDOWTITLE eq Hermes Gateway*" /f >nul 2>&1 && echo   [OK] Gateway stopped || echo   [--] Gateway not found
taskkill /fi "WINDOWTITLE eq Hermes Telegram*" /f >nul 2>&1 && echo   [OK] Telegram Bot stopped || echo   [--] Telegram Bot not found

:: ── Остановка uvicorn по портам (если окно не найдено) ──
echo.
echo Freeing ports...

for %%p in (8642 8080) do (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%%p " ^| findstr LISTENING 2^>nul') do (
        if not "%%a"=="0" (
            echo   Killing PID %%a on port %%p
            taskkill /f /pid %%a >nul 2>&1
        )
    )
)

:: ── Проверка ─────────────────────────────────────
echo.
timeout /t 2 /nobreak >nul

set "STILL_BUSY="
netstat -ano | findstr ":8642 " | findstr LISTENING >nul 2>&1 && set STILL_BUSY=1
netstat -ano | findstr ":8080 " | findstr LISTENING >nul 2>&1 && set STILL_BUSY=1

if defined STILL_BUSY (
    echo WARNING: Some ports still in use.
    echo   Run 'netstat -ano ^| findstr ":8642"' to check.
) else (
    echo All ports free.
)

:end
echo.
echo ========================================
echo   Done.
echo ========================================
