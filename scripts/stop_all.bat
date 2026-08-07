@echo off
chcp 65001 >nul
echo ========================================
echo   Остановка всех сервисов Arkaim
echo ========================================
echo.

:: -- Остановка по имени окна -----------------------------------------------
taskkill /fi "WINDOWTITLE eq Arkaim Core*" /f >nul 2>&1 && echo   [OK] Core stopped || echo   [--] Core not found
taskkill /fi "WINDOWTITLE eq Arkaim Frontend*" /f >nul 2>&1 && echo   [OK] Frontend stopped || echo   [--] Frontend not found

:: -- Остановка по портам ---------------------------------------------------
echo.
echo Освобождение портов 8642, 3000...

for %%p in (8642 3000) do (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%%p " ^| findstr LISTENING 2^>nul') do (
        if not "%%a"=="0" (
            taskkill /f /pid %%a >nul 2>&1 && echo   Порт %%p освобождён (PID %%a)
        )
    )
)

:: -- Проверка ---------------------------------------------------------------
echo.
timeout /t 2 /nobreak >nul

set "STILL_BUSY="
for %%p in (8642 3000) do (
    netstat -ano | findstr ":%%p " | findstr LISTENING >nul 2>&1 && set STILL_BUSY=1
)

if defined STILL_BUSY (
    echo WARNING: Некоторые порты ещё заняты. Запусти снова.
) else (
    echo Все порты свободны.
)

echo.
echo ========================================
echo   Готово.
echo ========================================
pause