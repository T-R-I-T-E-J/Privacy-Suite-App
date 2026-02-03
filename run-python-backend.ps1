# Helper script to run the Python LLM Backend
# Assumes env is set up and model is downloaded

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $ScriptDir "backend\llm_reviewer"
$EnvScript = Join-Path $ScriptDir "backend\sensi_scan\env\Scripts\Activate.ps1"
$ModelPath = Join-Path $ScriptDir "backend\airgap_model\models\phi3-mini-4k-instruct-ggml-q4_0.bin"

# Check if environment exists
if (-not (Test-Path $EnvScript)) {
    Write-Host "Error: Python environment not found. Please run setup first." -ForegroundColor Red
    exit 1
}

# Check if model exists
if (-not (Test-Path $ModelPath)) {
    Write-Host "Warning: Model file not found at $ModelPath" -ForegroundColor Yellow
    Write-Host "Please run setup-webllm-models.ps1 to download it." -ForegroundColor Yellow
    Write-Host "Attempting to run anyway (script might download it)..." -ForegroundColor Gray
}

# Activate env and run
Write-Host "Activating Python environment..." -ForegroundColor Cyan
. $EnvScript

Write-Host "Starting LLM Reviewer..." -ForegroundColor Cyan
cd $BackendDir

# Run example or main script
# You can change this to run your API server or CLI
python example.py

# Deactivate (optional, script ending does this for local scope)
