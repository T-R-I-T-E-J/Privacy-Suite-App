<#
.SYNOPSIS
Starts the Privacy Suite application in development mode.

.DESCRIPTION
This script launches:
1. The Vite frontend development server (in a separate window)
2. The Electron main process (connected to the Vite server)

It assumes dependencies are installed in the 'frontend' directory.
#>

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$FrontendDir = Join-Path $ScriptDir "frontend"
$ElectronBin = Join-Path $FrontendDir "node_modules\.bin\electron.cmd"

# Check for Node.js dependencies
if (-not (Test-Path $ElectronBin)) {
    Write-Host "Error: Electron not found. Please run 'npm install' in the frontend directory." -ForegroundColor Red
    exit 1
}

# 1. Start Vite Frontend
Write-Host "Starting Vite Frontend Server..." -ForegroundColor Cyan
try {
    # Start npm run dev in a new window so it stays alive
    Start-Process -FilePath "npm.cmd" -ArgumentList "run dev" -WorkingDirectory $FrontendDir
}
catch {
    Write-Host "Failed to start Vite. Ensure npm is in your PATH." -ForegroundColor Red
    exit 1
}

# Wait for Vite to spin up
Write-Host "Waiting 5 seconds for frontend to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# 2. Start Electron
Write-Host "Starting Electron App..." -ForegroundColor Cyan
try {
    # Run Electron pointing to the main script in the root
    & $ElectronBin "electron-main.js"
}
catch {
    Write-Host "Failed to start Electron: $_" -ForegroundColor Red
    exit 1
}

Write-Host "App session ended." -ForegroundColor Green
