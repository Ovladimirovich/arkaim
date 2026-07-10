@echo off
chcp 65001 >nul
echo Stopping Arkaim server and freeing ports 8642 8188...

:: Kill python processes running uvicorn (our server)
for /f "tokens=2 delims=," %%a in ('tasklist /fi "imagename eq python.exe" /fo csv /nh 2^>nul') do (
    tasklist /fi "pid eq %%a" /fi "modules eq uvicorn" 2>nul | findstr /i "python" >nul && (
        echo Killing python process %%a
        taskkill /f /pid %%a >nul 2>&1
    )
)

:: Force kill any process on port 8642 (our server)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8642 " ^| findstr LISTENING') do (
    echo Killing process %%a on port 8642
    taskkill /f /pid %%a >nul 2>&1
)

:: Force kill any process on port 8188 (ComfyUI)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8188 " ^| findstr LISTENING') do (
    echo Killing process %%a on port 8188
    taskkill /f /pid %%a >nul 2>&1
)

:: Kill all remaining python.exe processes (safety net)
taskkill /f /im python.exe >nul 2>&1

timeout /t 2 /nobreak >nul

:: Verify
set "BUSY="
netstat -ano | findstr ":8642 " | findstr LISTENING >nul && set BUSY=1
netstat -ano | findstr ":8188 " | findstr LISTENING >nul && set BUSY=1
if defined BUSY (
    echo WARNING: Some ports still in use. Run again.
) else (
    echo Ports 8642 and 8188 are free.
)
