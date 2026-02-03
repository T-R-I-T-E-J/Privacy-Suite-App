# Package Installation Verification Script
# Run this to verify all installations

Write-Host "`n=== Node.js Package Verification ===" -ForegroundColor Cyan
if (Test-Path ".\node_modules") {
    $nodePackages = (Get-ChildItem ".\node_modules" -Directory).Count
    Write-Host "Success: Node modules installed - $nodePackages packages" -ForegroundColor Green
    
    $keyPackages = @("react", "electron", "@mlc-ai", "vite", "typescript")
    foreach ($pkg in $keyPackages) {
        $found = Get-ChildItem ".\node_modules" -Filter "*$pkg*" -Directory -ErrorAction SilentlyContinue
        if ($found) {
            Write-Host "   OK: $pkg" -ForegroundColor Green
        } else {
            Write-Host "   MISSING: $pkg" -ForegroundColor Red
        }
    }
} else {
    Write-Host "ERROR: node_modules not found" -ForegroundColor Red
}

Write-Host "`n=== Python Package Verification ===" -ForegroundColor Cyan
if (Test-Path ".\env") {
    Write-Host "Success: Python virtual environment exists" -ForegroundColor Green
    Write-Host "   Activate with: .\env\Scripts\Activate.ps1" -ForegroundColor White
    Write-Host "   Then run: pip list" -ForegroundColor White
} else {
    Write-Host "ERROR: Python virtual environment not found" -ForegroundColor Red
}

Write-Host "`n=== Rust/Cargo Verification ===" -ForegroundColor Cyan
if (Test-Path ".\Cargo.toml") {
    Write-Host "Success: Cargo.toml exists" -ForegroundColor Green
    
    $cargoInstalled = Get-Command cargo -ErrorAction SilentlyContinue
    if ($cargoInstalled) {
        Write-Host "   OK: Cargo is installed" -ForegroundColor Green
        Write-Host "   Run: cargo build" -ForegroundColor White
    } else {
        Write-Host "   WARNING: Cargo not installed" -ForegroundColor Yellow
        Write-Host "   Install from: https://rustup.rs/" -ForegroundColor White
    }
} else {
    Write-Host "ERROR: Cargo.toml not found" -ForegroundColor Red
}

Write-Host "`n=== Summary ===" -ForegroundColor Cyan
Write-Host "See INSTALLATION_SUMMARY.md for detailed information" -ForegroundColor White
Write-Host ""
Write-Host "All packages are installed in LOCAL environments:" -ForegroundColor Green
Write-Host "  - Node.js: ./node_modules/" -ForegroundColor White
Write-Host "  - Python: ./env/" -ForegroundColor White
Write-Host "  - Rust: Will be in ./target/ after cargo build" -ForegroundColor White
Write-Host ""
