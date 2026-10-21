@echo off
rem Double-click to build and start the BOTA site, then open it in the browser.
chcp 65001 >nul
cd /d "%~dp0"
if "%PORT%"=="" set PORT=3000
echo.
echo  BOTA: сборка сайта, подождите...
echo.
call npm.cmd run build
if errorlevel 1 (
  echo.
  echo  Сборка не удалась. Пришлите текст ошибки выше.
  pause
  exit /b 1
)
echo.
echo  Сайт запускается: http://127.0.0.1:%PORT%
echo  Чтобы остановить сайт, закройте это окно или нажмите Ctrl + C.
echo.
if not "%BOTA_NO_BROWSER%"=="1" start "" cmd /c "timeout /t 4 >nul & start http://127.0.0.1:%PORT%"
call npm.cmd start
pause
