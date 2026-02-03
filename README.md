# Privacy Suite

A comprehensive privacy-focused application suite with frontend, Electron desktop app, Python backend, and Rust tools.

## Project Structure

- `frontend/` - React + Vite frontend application
- `pixel-purge/` - Rust-based image metadata removal tool
- `electron/` - Electron main process files
- `tools/` - Optional binary tools (ffmpeg, etc.)

## Setup

### Frontend (Node.js)
```bash
cd frontend
npm install
npm run dev
```

### Electron
```bash
npm install
npm run install:all
npm run dev
```

### Python Dependencies
```bash
pip install -r requirements.txt
```

### Rust (Pixel Purge)
```bash
cd pixel-purge
cargo build --release
```

### FFmpeg (Optional but Recommended)
FFmpeg is required for video/audio metadata stripping. The pixel-purge tool will automatically use FFmpeg if available.

**Automatic Installation (Windows):**
```bash
tools\install-ffmpeg.bat
```

**Manual Installation:**
1. Download FFmpeg Windows build from [BtbN FFmpeg Builds](https://github.com/BtbN/FFmpeg-Builds/releases) or [gyan.dev](https://www.gyan.dev/ffmpeg/builds/)
2. Extract the archive and copy `ffmpeg.exe` to the `tools/` directory
3. Verify installation: `tools\ffmpeg.exe -version`

The tool will check for FFmpeg in this order:
1. `tools/ffmpeg.exe` (local project directory)
2. System PATH

## WebLLM Models

Place model files in `frontend/public/airgap/models/`:
- `phi3-mini-4k-instruct-ggml-q4_0.bin`
- `tinyllama-1.1b-ggml-q4_0.bin`

## Build Notes

### libheif (static)
Build with:
```bash
cmake -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=OFF -DCMAKE_POSITION_INDEPENDENT_CODE=ON ..
make -j$(nproc)
```
Place resulting `libheif.a` in `pixel-purge/lib/` for Cargo to find.

### System Requirements
- Node.js >= 20
- Python 3.x
- Rust toolchain
- OpenSSL >= 3.0 (3.2.3 on CI images)
- zlib (required by pdfminer.six, pandas, numpy)
