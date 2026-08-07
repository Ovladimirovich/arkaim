@echo off
chcp 65001 >nul
title Arkaim Launcher
echo ========================================
echo   Arkaim Digital Consciousness
echo   Запуск всех сервисов
echo ========================================
echo.

set ROOT=%~dp0
set RUNTIME=%ROOT%runtime
set WEB=%ROOT%arkaim-web

:: -- Проверка виртуального окружения Python --------------------------------
if not exist "%RUNTIME%\.venv\Scripts\python.exe" (
    echo [ERROR] Python .venv не найден: %RUNTIME%\.venv
    echo   Создай его:
    echo     cd runtime
    echo     python -m venv .venv
    echo     .venv\Scripts\pip install -r requirements.txt
    pause
    exit /b 1
)

:: -- Проверка node_modules фронтенда ---------------------------------------
if not exist "%WEB%\node_modules" (
    echo [ERROR] node_modules не найден: %WEB%\node_modules
    echo   Установи зависимости:
    echo     cd arkaim-web
    echo     npm install
    pause
    exit /b 1
)

:: -- Переменные окружения (значения по умолчанию) --------------------------
if "%CORE_HOST%"=="" set CORE_HOST=127.0.0.1
if "%CORE_PORT%"=="" set CORE_PORT=8642

:: -- Очистка портов перед запуском -----------------------------------------
echo [1/3] Очистка портов %CORE_PORT%, 3000...
for %%p in (%CORE_PORT% 3000) do (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%%p " ^| findstr "LISTENING"') do (
        if not "%%a"=="" (
            taskkill /f /pid %%a >nul 2>&1 && echo   Порт %%p освобождён (PID %%a)
        )
    )
)
timeout /t 2 /nobreak >nul

:: -- Запуск Core (Backend :8642) -------------------------------------------
echo [2/3] Запуск Core (:%CORE_PORT%)...
start "Arkaim Core :%CORE_PORT%" cmd /c "cd /d %RUNTIME% & set PYTHONPATH=%RUNTIME% & .venv\Scripts\python.exe -m uvicorn core.main:app --host %CORE_HOST% --port %CORE_PORT% --log-level info"
timeout /t 3 /nobreak >nul

:: -- Запуск Frontend (Next.js :3000) ---------------------------------------
echo [3/3] Запуск Frontend (Next.js :3000)...
start "Arkaim Frontend :3000" cmd /c "cd /d %WEB% & npm run dev"

:: -- Проверка статуса ------------------------------------------------------
timeout /t 3 /nobreak >nul
echo.
echo ========================================
echo  Статус запуска:
netstat -ano | findstr ":%CORE_PORT% " | findstr "LISTENING" >nul && echo   [OK] Core    :%CORE_PORT% || echo   [--] Core    :%CORE_PORT%
netstat -ano | findstr ":3000 " | findstr "LISTENING" >nul && echo   [OK] Frontend :3000 || echo   [--] Frontend :3000
echo ========================================
echo.
echo  Backend:  http://%CORE_HOST%:%CORE_PORT%
echo  API Docs: http://%CORE_HOST%:%CORE_PORT%/docs
echo  Web UI:   http://%CORE_HOST%:%CORE_PORT%/_ui/book
echo  Frontend: http://localhost:3000
echo.
echo  Закрой это окно, чтобы оставить сервисы работать в фоне.
echo  Для остановки закрой окны "Arkaim Core" и "Arkaim Frontend".
echo.
start http://localhost:3000
pause