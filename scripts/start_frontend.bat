@echo off
title Arkaim Frontend :3000
cd /d "%~dp0..\arkaim-web"
echo [Frontend] Starting Next.js on http://localhost:3000...
npm run dev
if errorlevel 1 (
    echo.
    echo [Frontend] Exited with error. Make sure Node.js is installed.
    pause
)