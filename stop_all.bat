@echo off
chcp 65001 >nul
echo ========================================
echo   Arkaim - Stopping All Services
echo ========================================
echo.

:: =============================================
:: 1. Stop Backend (port 8642)
:: =============================================
echo [1/3] Stopping Core...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8642 " ^| findstr LISTENING 2^>nul') do (
    if not "%%a"=="0" (
        echo   Killing PID %%a on port 8642
        taskkill /f /pid %%a >nul 2>&1
    )
)
taskkill /fi "WINDOWTITLE eq Arkaim Core*" /f >nul 2>&1

:: =============================================
:: 2. Stop Frontend (port 3000)
:: =============================================
echo [2/3] Stopping Frontend...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " ^| findstr LISTENING 2^>nul') do (
    if not "%%a"=="0" (
        echo   Killing PID %%a on port 3000
        taskkill /f /pid %%a >nul 2>&1
    )
)
taskkill /fi "WINDOWTITLE eq Arkaim Frontend*" /f >nul 2>&1

:: =============================================
:: 3. Verify
:: =============================================
echo [3/3] Verifying...
timeout /t 2 /nobreak >nul

set "STILL="
netstat -ano | findstr ":8642 " | findstr LISTENING >nul 2>&1 && set STILL=1
netstat -ano | findstr ":3000 " | findstr LISTENING >nul 2>&1 && set STILL=1

if defined STILL (
    echo WARNING: Some ports still in use.
) else (
    echo All ports free.
)

echo.
echo ========================================
echo   All services stopped.
echo ========================================
pause
