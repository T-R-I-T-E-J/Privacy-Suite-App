# 🔐 Privacy Suite App

A comprehensive, local-first privacy toolkit designed to protect your data without uploading it to the cloud.

## 🚀 Key Features

### 1. 🛡️ Sensi-Scan (Documents)

- **Scanning**: Detects PII (Emails, Phone Numbers, Credit Cards) in `.txt`, `.docx`, and `.pdf` files.
- **Redaction**: Automatically creates a redacted copy of the document.
- **Privacy Score**: Rates your document's privacy level (0-100).
- **Technology**: Python, TensorFlow Lite, Regular Expressions.

### 2. 🧹 Pixel-Purge (Images)

- **Scrubbing**: Removes hidden EXIF metadata (GPS, Camera Model, Time) from photos.
- **Instant**: Runs entirely in the browser/app using JavaScript (no upload).
- **Technology**: `piexifjs` (Client-side metadata editing).

### 3. 🤖 AI Code Review (WebLLM)

- **Analysis**: Reviews code snippets for security vulnerabilities locally.
- **Model**: Runs `TinyLlama-1.1B` directly on your GPU via WebGPU.
- **Offline**: Works completely offline after the initial model weight download.
- **Technology**: `@mlc-ai/web-llm`, WebGPU.

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, Vite
- **Desktop Wrapper**: Electron
- **Backend**: Python (Flask-like CLI architecture)
- **Styling**: Modern Dark Mode with Glassmorphism (CSS Variables)

## 📦 Installation & Running

1. **Install Dependencies**:

   ```powershell
   npm install
   ```

2. **Setup Python Backend**:

   ```powershell
   ./install.ps1
   ```

3. **Run the App**:
   Open two terminals:

   **Terminal 1 (Frontend):**

   ```powershell
   cd frontend
   npm run dev
   ```

   **Terminal 2 (Electron):**

   ```powershell
   npm run electron
   ```

## 🔒 Privacy Guarantee

- **Local Execution**: All processing happens on your device.
- **No Cloud**: No files are ever uploaded to a server.
- **Open Source**: Verify the code yourself!

---

_Created by [Your Name] & Antigravity (Google DeepMind)_
