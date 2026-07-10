@echo off
chcp 65001 > nul
title Arkaim Digital Consciousness
echo ========================================
echo   Arkaim Digital Consciousness
echo ========================================
echo.
echo [1] Запустить Core Runtime (порт 8642) -- РЕКОМЕНДУЕТСЯ
echo [2] Запустить Book Intelligence API (порт 9090) -- DEPRECATED
echo [3] Перегенерировать геном
echo [4] Проиндексировать книгу в ChromaDB
echo [5] Запустить тесты
echo [6] Запустить Auto Recovery Monitor
echo [7] Выйти
echo.

set /p choice="Выберите действие (1-7): "

if "%choice%"=="1" (
    echo Запуск Core Runtime (порт 8642)...
    cd /d "%~dp0..\runtime"
    python -m core.main
    cd /d "%~dp0"
    pause
)
if "%choice%"=="2" (
    echo Запуск Book Intelligence API (порт 9090)
    echo ВНИМАНИЕ: этот режим устарел. Используйте Core Runtime (порт 8642).
    timeout /t 3 /nobreak > nul
    python run_api.py
    pause
)
if "%choice%"=="3" (
    echo Перегенерация генома...
    python run_extractor.py
    pause
)
if "%choice%"=="4" (
    echo Индексация книги...
    python run_index_book.py
    pause
)
if "%choice%"=="5" (
    echo Запуск тестов...
    python -m pytest TESTS/ -v
    pause
)
if "%choice%"=="6" (
    echo Запуск Auto Recovery Monitor...
    python CORE/service_auto_recovery.py
    pause
)
if "%choice%"=="7" (
    echo До свидания!
    exit /b
)