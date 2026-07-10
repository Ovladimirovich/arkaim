@echo off
title Hermes Telegram Bot
cd /d "%~dp0..\runtime"
echo [Telegram] Starting bot...
.venv\Scripts\python -m integrations.telegram.run
if errorlevel 1 pause
