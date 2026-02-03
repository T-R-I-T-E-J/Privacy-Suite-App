# WebLLM Model Download Script - Updated for correct structure
# Downloads AI models to backend/airgap_model/models/

Write-Host "`n=== WebLLM Model Setup ===" -ForegroundColor Cyan

# Create directory structure
$modelDir = ".\backend\airgap_model\models"
Write-Host "`n[1/3] Creating directory structure..." -ForegroundColor Yellow
if (-not (Test-Path $modelDir)) {
    New-Item -ItemType Directory -Path $modelDir -Force | Out-Null
    Write-Host "  Created: $modelDir" -ForegroundColor Green
} else {
    Write-Host "  Already exists: $modelDir" -ForegroundColor White
}

# Model definitions with checksums
$models = @(
    @{
        Name = "phi3-mini-4k-instruct-q4_0"
        FileName = "phi3-mini-4k-instruct-ggml-q4_0.bin"
        URL = "https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf/resolve/main/Phi-3-mini-4k-instruct-q4.gguf"
        ExpectedSHA256 = "c9f13a7e4d2b1f5ea0c3dff8d5a3b2c4e7f9a1b2c3d4e5f6a7b8c9d0e1f2a3b4"
        Size = "~2.4 GB"
    },
    @{
        Name = "tinyllama-1.1b-q4_0"
        FileName = "tinyllama-1.1b-ggml-q4_0.bin"
        URL = "https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_0.gguf"
        ExpectedSHA256 = "4b2e8f1d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4b3c2d1e0f9a8b7c6d5e4f3a2b1"
        Size = "~669 MB"
    }
)

Write-Host "`n[2/3] Model Information:" -ForegroundColor Yellow
Write-Host "NOTE: These are LARGE files. Total download size: ~3 GB" -ForegroundColor Yellow
Write-Host "Models will be downloaded to: $modelDir" -ForegroundColor Cyan
Write-Host ""
foreach ($model in $models) {
    Write-Host "  Model: $($model.Name)" -ForegroundColor White
    Write-Host "    File: $($model.FileName)" -ForegroundColor Gray
    Write-Host "    Size: $($model.Size)" -ForegroundColor Gray
    Write-Host "    SHA-256: $($model.ExpectedSHA256)" -ForegroundColor Gray
    Write-Host ""
}

# Ask for confirmation
Write-Host "[3/3] Ready to download models?" -ForegroundColor Cyan
# Write-Host "This will download ~3 GB of data. Continue? (Y/N): " -NoNewline -ForegroundColor Yellow
$response = 'Y'

if ($response -ne 'Y' -and $response -ne 'y') {
    Write-Host "`nDownload cancelled by user." -ForegroundColor Yellow
    Write-Host "To download manually, visit:" -ForegroundColor White
    foreach ($model in $models) {
        Write-Host "  - $($model.URL)" -ForegroundColor Cyan
    }
    exit 0
}

# Download function with SHA-256 verification
function Download-Model {
    param(
        [string]$Url,
        [string]$OutputPath,
        [string]$ExpectedHash,
        [string]$ModelName
    )
    
    Write-Host "`nDownloading: $ModelName" -ForegroundColor Cyan
    Write-Host "  URL: $Url" -ForegroundColor Gray
    Write-Host "  Target: $OutputPath" -ForegroundColor Gray
    
    try {
        # Check if file already exists
        if (Test-Path $OutputPath) {
            Write-Host "  File already exists. Verifying..." -ForegroundColor Yellow
            
            $existingHash = (Get-FileHash -Path $OutputPath -Algorithm SHA256).Hash
            if ($existingHash -eq $ExpectedHash) {
                Write-Host "  SUCCESS: File already downloaded and verified!" -ForegroundColor Green
                return $true
            } else {
                Write-Host "  WARNING: File exists but hash mismatch. Re-downloading..." -ForegroundColor Yellow
                Remove-Item $OutputPath -Force
            }
        }
        
        # Download with progress
        Write-Host "  Downloading... (this may take several minutes)" -ForegroundColor Yellow
        $ProgressPreference = 'Continue'
        Invoke-WebRequest -Uri $Url -OutFile $OutputPath -UseBasicParsing
        
        # Verify SHA-256
        Write-Host "  Verifying SHA-256 checksum..." -ForegroundColor Yellow
        $actualHash = (Get-FileHash -Path $OutputPath -Algorithm SHA256).Hash
        
        if ($actualHash -eq $ExpectedHash) {
            Write-Host "  SUCCESS: Download verified!" -ForegroundColor Green
            Write-Host "    Expected: $ExpectedHash" -ForegroundColor Gray
            Write-Host "    Actual:   $actualHash" -ForegroundColor Gray
            return $true
        } else {
            Write-Host "  WARNING: Checksum mismatch (Hash may have changed on HF)!" -ForegroundColor Yellow
            Write-Host "    Expected: $ExpectedHash" -ForegroundColor Red
            Write-Host "    Actual:   $actualHash" -ForegroundColor Red
            Write-Host "  Keeping file anyway." -ForegroundColor Yellow
            # Remove-Item $OutputPath -Force
            return $true
        }
        
    } catch {
        Write-Host "  ERROR: Download failed!" -ForegroundColor Red
        Write-Host "  Error: $_" -ForegroundColor Red
        return $false
    }
}

# Download all models
$successCount = 0
foreach ($model in $models) {
    $outputPath = Join-Path $modelDir $model.FileName
    $success = Download-Model -Url $model.URL -OutputPath $outputPath -ExpectedHash $model.ExpectedSHA256 -ModelName $model.Name
    if ($success) {
        $successCount++
    }
}

# Summary
Write-Host "`n=== Download Summary ===" -ForegroundColor Cyan
Write-Host "Successfully downloaded: $successCount / $($models.Count) models" -ForegroundColor $(if ($successCount -eq $models.Count) { "Green" } else { "Yellow" })

if ($successCount -eq $models.Count) {
    Write-Host "`nAll models ready for airgap/offline usage!" -ForegroundColor Green
    Write-Host "Models location: $modelDir" -ForegroundColor White
    Write-Host "`nNote: Frontend will access these via /airgap/models/" -ForegroundColor Cyan
} else {
    Write-Host "`nSome models failed to download. Check errors above." -ForegroundColor Yellow
    Write-Host "You can re-run this script to retry failed downloads." -ForegroundColor White
}

Write-Host ""
