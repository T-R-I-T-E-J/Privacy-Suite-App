@echo off
REM Pixel Purge - Electron Application Launcher
REM This batch file starts the Electron pixel-purge application

setlocal enabledelayedexpansion

echo ========================================
echo   Pixel Purge - Electron Launcher
echo ========================================
echo.

REM Get the directory where this batch file is located
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

REM Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [INFO] Node.js found
node --version
echo.

REM Check if npm is installed
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm is not installed or not in PATH.
    pause
    exit /b 1
)

echo [INFO] Checking dependencies...
echo.

REM Check if node_modules exists in root
if not exist "node_modules" (
    echo [INFO] Installing root dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install root dependencies
        pause
        exit /b 1
    )
)

REM Check if frontend node_modules exists
if not exist "frontend\node_modules" (
    echo [INFO] Installing frontend dependencies...
    cd frontend
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install frontend dependencies
        pause
        exit /b 1
    )
    cd ..
)

REM Check if Rust binary exists
if not exist "pixel-purge\target\release\pixel-purge.exe" (
    echo [WARNING] Rust binary not found. Building...
    echo [INFO] This may take a few minutes...
    cd pixel-purge
    call cargo build --release
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to build Rust binary
        echo [INFO] Make sure Rust is installed: https://rustup.rs/
        pause
        exit /b 1
    )
    cd ..
    echo [INFO] Rust binary built successfully
)

echo.
echo [INFO] Starting frontend development server...
echo [INFO] Frontend will run on http://localhost:5173
echo.

REM Start frontend dev server in a new window
start "Pixel Purge - Frontend Server" cmd /k "cd /d "%SCRIPT_DIR%frontend" && npm run dev"

REM Wait for frontend server to start (give it 5 seconds)
echo [INFO] Waiting for frontend server to start...
timeout /t 5 /nobreak >nul

REM Check if port 5173 is accessible (optional check)
echo [INFO] Starting Electron application...
echo.

REM Start Electron
call npm run dev

REM If Electron closes, keep the window open to see any errors
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Electron application exited with an error
    pause
)

REM Cleanup: Close the frontend server window when Electron closes
REM Note: This is optional - you may want to keep it running
echo.
echo [INFO] Application closed.
echo [INFO] Frontend server is still running in a separate window.
echo [INFO] You can close it manually when done.

endlocal
