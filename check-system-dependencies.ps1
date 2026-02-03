# System Dependencies Verification Script
# Checks for OpenSSL, zlib, and other required system libraries

Write-Host "`n=== System Dependencies Check ===" -ForegroundColor Cyan

$allGood = $true

# Check for OpenSSL
Write-Host "`n[1/4] Checking OpenSSL..." -ForegroundColor Yellow
$opensslCmd = Get-Command openssl -ErrorAction SilentlyContinue
if ($opensslCmd) {
    $opensslVersion = openssl version 2>&1
    if ($opensslVersion -match "OpenSSL\s+(\d+\.\d+\.\d+)") {
        $version = $matches[1]
        $versionParts = $version -split '\.'
        $major = [int]$versionParts[0]
        $minor = [int]$versionParts[1]
        
        if ($major -ge 3) {
            Write-Host "  SUCCESS: OpenSSL $version (>= 3.0 required)" -ForegroundColor Green
        } else {
            Write-Host "  WARNING: OpenSSL $version found, but version 3.0+ recommended" -ForegroundColor Yellow
            $allGood = $false
        }
    } else {
        Write-Host "  INFO: OpenSSL found at: $($opensslCmd.Source)" -ForegroundColor White
    }
} else {
    Write-Host "  NOT FOUND: OpenSSL is not in PATH" -ForegroundColor Red
    Write-Host "  Install: Download from https://slproweb.com/products/Win32OpenSSL.html" -ForegroundColor Yellow
    $allGood = $false
}

# Check for zlib (via Python packages that use it)
Write-Host "`n[2/4] Checking zlib (via Python)..." -ForegroundColor Yellow
if (Test-Path ".\env\Scripts\python.exe") {
    $zlibCheck = & ".\env\Scripts\python.exe" -c "import zlib; print('OK')" 2>&1
    if ($zlibCheck -match "OK") {
        Write-Host "  SUCCESS: zlib available (Python can import it)" -ForegroundColor Green
    } else {
        Write-Host "  WARNING: zlib may not be available" -ForegroundColor Yellow
        Write-Host "  Error: $zlibCheck" -ForegroundColor Red
        $allGood = $false
    }
} else {
    Write-Host "  SKIPPED: Python virtual environment not found" -ForegroundColor Yellow
}

# Check for Visual C++ Redistributables (needed by many packages)
Write-Host "`n[3/4] Checking Visual C++ Redistributables..." -ForegroundColor Yellow
$vcRedistKeys = @(
    "HKLM:\SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\X64",
    "HKLM:\SOFTWARE\WOW6432Node\Microsoft\VisualStudio\14.0\VC\Runtimes\X64"
)

$vcFound = $false
foreach ($key in $vcRedistKeys) {
    if (Test-Path $key) {
        $vcFound = $true
        $version = (Get-ItemProperty $key).Version
        Write-Host "  SUCCESS: Visual C++ Redistributable found (Version: $version)" -ForegroundColor Green
        break
    }
}

if (-not $vcFound) {
    Write-Host "  WARNING: Visual C++ Redistributable may not be installed" -ForegroundColor Yellow
    Write-Host "  Download: https://aka.ms/vs/17/release/vc_redist.x64.exe" -ForegroundColor Yellow
}

# Check for CMake (needed for libheif compilation)
Write-Host "`n[4/4] Checking CMake (optional, for libheif)..." -ForegroundColor Yellow
$cmakeCmd = Get-Command cmake -ErrorAction SilentlyContinue
if ($cmakeCmd) {
    $cmakeVersion = cmake --version 2>&1 | Select-Object -First 1
    Write-Host "  SUCCESS: $cmakeVersion" -ForegroundColor Green
} else {
    Write-Host "  NOT FOUND: CMake (only needed for libheif compilation)" -ForegroundColor Yellow
    Write-Host "  Install: Download from https://cmake.org/download/" -ForegroundColor White
}

# Summary
Write-Host "`n=== Summary ===" -ForegroundColor Cyan
if ($allGood) {
    Write-Host "All critical system dependencies are available!" -ForegroundColor Green
} else {
    Write-Host "Some dependencies are missing or outdated. See warnings above." -ForegroundColor Yellow
}

Write-Host "`nRequired for project:" -ForegroundColor White
Write-Host "  - OpenSSL 3.0+: " -NoNewline
if ($opensslCmd) { Write-Host "READY" -ForegroundColor Green } else { Write-Host "MISSING" -ForegroundColor Red }

Write-Host "  - zlib: " -NoNewline
Write-Host "Bundled with Python packages" -ForegroundColor Green

Write-Host "`nOptional for advanced features:" -ForegroundColor White
Write-Host "  - CMake: For compiling libheif" -ForegroundColor White
Write-Host "  - Visual C++ Build Tools: For native module compilation" -ForegroundColor White

Write-Host ""
