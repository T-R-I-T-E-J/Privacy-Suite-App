# Complete Setup Guide

This guide walks you through setting up all missing components for the Privacy Suite project.

## 📋 Quick Start

Run these scripts in order:

```powershell
# 1. Check system dependencies
.\check-system-dependencies.ps1

# 2. Install Rust/Cargo
.\setup-rust.ps1

# 3. Download WebLLM models (optional, ~3 GB)
.\setup-webllm-models.ps1
```

---

## 🦀 Part 1: Rust/Cargo Installation

### Automated Installation
```powershell
.\setup-rust.ps1
```

This script will:
- Check if Rust is already installed
- Download and run the official Rust installer
- Install Visual Studio C++ Build Tools (if needed)
- Configure your PATH automatically

### After Installation
You may need to **restart PowerShell** or run:
```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')
```

### Build Rust Dependencies
```powershell
cargo build          # Build in debug mode
cargo build --release  # Build optimized version
```

### Manual Installation
If the script fails, install manually:
1. Visit: https://rustup.rs/
2. Download `rustup-init.exe`
3. Run and follow prompts
4. Restart PowerShell

---

## 🔧 Part 2: System Dependencies

### Check Dependencies
```powershell
.\check-system-dependencies.ps1
```

This checks for:
- **OpenSSL 3.0+** (required)
- **zlib** (bundled with Python)
- **Visual C++ Redistributables** (recommended)
- **CMake** (optional, for libheif)

### Install Missing Dependencies

#### OpenSSL (if missing)
1. Download from: https://slproweb.com/products/Win32OpenSSL.html
2. Install "Win64 OpenSSL v3.x.x"
3. Add to PATH: `C:\Program Files\OpenSSL-Win64\bin`

#### Visual C++ Redistributable (if missing)
Download and install:
https://aka.ms/vs/17/release/vc_redist.x64.exe

#### CMake (optional, for libheif compilation)
1. Download from: https://cmake.org/download/
2. Install with "Add to PATH" option

---

## 🤖 Part 3: WebLLM Models

### Automated Download
```powershell
.\setup-webllm-models.ps1
```

This will:
- Create `frontend/public/airgap/models/` directory
- Download 2 AI models (~3 GB total)
- Verify SHA-256 checksums
- Support resuming interrupted downloads

### Models Downloaded

| Model | Size | Purpose |
|-------|------|---------|
| phi3-mini-4k-instruct | ~2.4 GB | General-purpose LLM |
| tinyllama-1.1b | ~669 MB | Lightweight chat model |

### Manual Download
If the script fails, download manually:

1. **Phi-3 Mini**
   - URL: https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf
   - Save as: `frontend/public/airgap/models/phi3-mini-4k-instruct-ggml-q4_0.bin`

2. **TinyLlama**
   - URL: https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF
   - Save as: `frontend/public/airgap/models/tinyllama-1.1b-ggml-q4_0.bin`

---

## 📦 Part 4: Verify Everything

Run the verification script:
```powershell
.\verify-installation.ps1
```

Expected output:
- ✅ Node modules: 475 packages
- ✅ Python env: 48 packages
- ✅ Cargo: Installed + dependencies built
- ✅ Models: 2 files downloaded

---

## 🚀 Testing Your Setup

### Test Node.js/Electron
```powershell
npm run dev
```

### Test Python
```powershell
.\env\Scripts\Activate.ps1
python -c "import pandas; import numpy; print('Python OK')"
```

### Test Rust
```powershell
cargo run --release
```

### Test WebLLM Models
Check if files exist:
```powershell
Get-ChildItem .\frontend\public\airgap\models\
```

---

## ⚙️ Optional Components

### FFmpeg (for media processing)

**Download Static Binary:**
1. Visit: https://www.gyan.dev/ffmpeg/builds/
2. Download: `ffmpeg-release-essentials.zip`
3. Extract to: `.\tools\ffmpeg-6.0-win-static\`
4. Add to PATH or reference directly

**Verify:**
```powershell
.\tools\ffmpeg-6.0-win-static\bin\ffmpeg.exe -version
```

### libheif (for HEIF image support)

**⚠️ Advanced: Requires CMake and C++ compiler**

This is complex and only needed for HEIF/HEIC image format support.

**Prerequisites:**
- CMake installed
- Visual Studio Build Tools or MinGW
- Git

**Build Steps:**
```powershell
# Clone libheif
git clone https://github.com/strukturag/libheif.git
cd libheif
mkdir build
cd build

# Configure
cmake -DCMAKE_BUILD_TYPE=Release `
      -DBUILD_SHARED_LIBS=OFF `
      -DCMAKE_POSITION_INDEPENDENT_CODE=ON ..

# Build
cmake --build . --config Release

# Copy to project
copy Release\libheif.a ..\..\lib\libheif.a
```

**Alternative:** Skip HEIF support and remove the `heif` dependency from `Cargo.toml`:
```toml
# Comment out this line:
# heif = { version = "0.2.1", features = ["libheif"] }
```

---

## 🐛 Troubleshooting

### Rust Build Failures
```powershell
# Update Rust
rustup update

# Clean and rebuild
cargo clean
cargo build
```

### Python Package Issues
```powershell
# Activate environment
.\env\Scripts\Activate.ps1

# Reinstall problematic package
pip install --upgrade --force-reinstall package_name
```

### npm Install Issues
```powershell
# Clear cache
npm cache clean --force

# Delete and reinstall
Remove-Item .\node_modules -Recurse -Force
Remove-Item .\package-lock.json
npm install --legacy-peer-deps
```

### Model Download Failures
- **Slow download:** Models are large; use a stable connection
- **Checksum mismatch:** Re-run the script to redownload
- **Out of space:** Ensure ~5 GB free disk space

---

## 📚 Additional Resources

- **Rust Documentation:** https://doc.rust-lang.org/
- **WebLLM Guide:** https://mlc.ai/web-llm/
- **Electron Docs:** https://www.electronjs.org/docs
- **Python venv Guide:** https://docs.python.org/3/library/venv.html

---

## ✅ Final Checklist

Before starting development, ensure:

- [ ] Rust/Cargo installed (`cargo --version`)
- [ ] Rust dependencies built (`cargo build`)
- [ ] OpenSSL available (if needed)
- [ ] Python virtual env activated
- [ ] WebLLM models downloaded (optional)
- [ ] Node packages installed (`node_modules/`)
- [ ] Verification script passes

---

Need help? Check `INSTALLATION_SUMMARY.md` for package details.
