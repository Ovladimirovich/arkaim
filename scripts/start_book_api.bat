@echo off
title Book Intelligence (merged into Core) :8642
echo ========================================
echo  Book Intelligence теперь встроен в Core
echo  Запускай через start_core.bat
echo  Эндпоинты доступны по:
echo    GET  /book                     - список
echo    POST /book/ask                 - вопрос
echo    GET  /book/genome              - геном
echo    GET  /book/layers              - слои
echo    POST /book/generate            - генерация
echo    GET  /book/drafts              - черновики
echo ========================================
if errorlevel 1 pause
