@echo off
REM Pixel Purge - Quick Launcher (assumes dependencies are installed)

setlocal

echo ========================================
echo   Pixel Purge - Quick Launch
echo ========================================
echo.

REM Get the directory where this batch file is located
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

REM Start frontend dev server in background
echo [INFO] Starting frontend server...
start "Pixel Purge - Frontend" cmd /k "cd /d "%SCRIPT_DIR%frontend" && npm run dev"

REM Wait a few seconds for server to start
timeout /t 3 /nobreak >nul

REM Start Electron
echo [INFO] Starting Electron...
call npm run dev

endlocal
