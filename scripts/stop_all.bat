@echo off
chcp 65001 >nul
echo ========================================
echo   Stopping all Arkaim services
echo ========================================
echo.

:: ── Остановка по имени окна ──────────────────────
taskkill /fi "WINDOWTITLE eq Hermes Core*" /f >nul 2>&1 && echo   [OK] Core stopped || echo   [--] Core not found
taskkill /fi "WINDOWTITLE eq Hermes Gateway*" /f >nul 2>&1 && echo   [OK] Gateway stopped || echo   [--] Gateway not found
taskkill /fi "WINDOWTITLE eq Hermes Telegram*" /f >nul 2>&1 && echo   [OK] Telegram Bot stopped || echo   [--] Telegram Bot not found
taskkill /fi "WINDOWTITLE eq Hermes Book API*" /f >nul 2>&1 && echo   [OK] Book API stopped || echo   [--] Book API not found

:: ── Остановка по портам ──────────────────────────
echo.
echo Freeing ports 8080, 8642, 9090...

for %%p in (8080 8642 9090) do (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%%p " ^| findstr LISTENING 2^>nul') do (
        if not "%%a"=="0" (
            taskkill /f /pid %%a >nul 2>&1 && echo   Port %%p freed (PID %%a)
        )
    )
)

:: ── Проверка ─────────────────────────────────────
echo.
timeout /t 2 /nobreak >nul

set "STILL_BUSY="
for %%p in (8080 8642 9090) do (
    netstat -ano | findstr ":%%p " | findstr LISTENING >nul 2>&1 && set STILL_BUSY=1
)

if defined STILL_BUSY (
    echo WARNING: Some ports still in use. Run again.
) else (
    echo All ports free.
)

echo.
echo ========================================
echo   Done.
echo ========================================
pause
