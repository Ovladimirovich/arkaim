@echo off
title Hermes Launcher
echo ========================================
echo  Запуск всех сервисов проекта
echo ========================================
echo.
echo  Book Intelligence встроен в Core (:8642)
echo  Эндпоинты: /book/...
echo ========================================
echo.

start "Hermes Gateway :8080" "%~dp0start_gateway.bat"
timeout /t 2 /nobreak >nul
start "Hermes Core :8642 (вкл. Book API)" "%~dp0start_core.bat"
timeout /t 2 /nobreak >nul
start "Hermes Telegram Bot" "%~dp0start_telegram.bat"

echo.
echo Все сервисы запущены (3 процесса вместо 4).
echo Для остановки запусти stop_all.bat
echo.
pause
