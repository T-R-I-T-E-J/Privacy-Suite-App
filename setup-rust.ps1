# Rust/Cargo Installation Script
# Automatically downloads and installs Rust toolchain

Write-Host "`n=== Rust/Cargo Installation ===" -ForegroundColor Cyan
Write-Host "This will install Rust toolchain (rustc, cargo, rustup)`n" -ForegroundColor White

# Check if Rust is already installed
$cargoExists = Get-Command cargo -ErrorAction SilentlyContinue
if ($cargoExists) {
    $version = cargo --version
    Write-Host "SUCCESS: Rust is already installed!" -ForegroundColor Green
    Write-Host "  Version: $version" -ForegroundColor White
    Write-Host "`nTo update Rust, run: rustup update" -ForegroundColor Yellow
    
    Write-Host "`n=== Installing Rust Dependencies ===" -ForegroundColor Cyan
    Write-Host "Running: cargo build" -ForegroundColor White
    cargo build
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`nSUCCESS: Rust dependencies installed!" -ForegroundColor Green
    } else {
        Write-Host "`nWARNING: Build had issues. Check errors above." -ForegroundColor Yellow
    }
    exit 0
}

# Rust not installed - download installer
Write-Host "Rust is not installed. Downloading installer..." -ForegroundColor Yellow

$rustupUrl = "https://win.rustup.rs/x86_64"
$rustupInstaller = "$env:TEMP\rustup-init.exe"

try {
    Write-Host "Downloading from: $rustupUrl" -ForegroundColor White
    Invoke-WebRequest -Uri $rustupUrl -OutFile $rustupInstaller -UseBasicParsing
    
    Write-Host "`nDownload complete! Starting installer..." -ForegroundColor Green
    Write-Host "NOTE: The installer will:" -ForegroundColor Yellow
    Write-Host "  1. Install Rust toolchain (rustc, cargo, rustup)" -ForegroundColor White
    Write-Host "  2. Modify your PATH environment variable" -ForegroundColor White
    Write-Host "  3. Install Visual Studio C++ Build Tools (if needed)" -ForegroundColor White
    Write-Host "`nPress Enter to continue or Ctrl+C to cancel..." -ForegroundColor Cyan
    Read-Host
    
    # Run installer with default settings
    & $rustupInstaller -y
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`nSUCCESS: Rust installed successfully!" -ForegroundColor Green
        Write-Host "`nIMPORTANT: You need to restart your PowerShell session or run:" -ForegroundColor Yellow
        Write-Host "  `$env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')" -ForegroundColor White
        Write-Host "`nThen run: cargo build" -ForegroundColor Cyan
    } else {
        Write-Host "`nERROR: Installation failed!" -ForegroundColor Red
        Write-Host "Manual installation: Visit https://rustup.rs/" -ForegroundColor Yellow
    }
} catch {
    Write-Host "`nERROR: Failed to download installer" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "`nPlease install manually from: https://rustup.rs/" -ForegroundColor Yellow
} finally {
    # Cleanup
    if (Test-Path $rustupInstaller) {
        Remove-Item $rustupInstaller -Force -ErrorAction SilentlyContinue
    }
}

Write-Host ""
