// Electron Main Process Entry Point
// Spawns child processes and manages the application lifecycle

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// Disable cache to prevent file locking issues
app.commandLine.appendSwitch('disable-http-cache');

let mainWindow;
let pythonProcess;

// Path to bundled executables
const PYTHON_EXEC = path.join(__dirname, 'backend', 'sensi_scan', 'build', `sensi-scan-${process.platform}.exe`);
const RUST_EXEC = path.join(__dirname, 'backend', 'pixel_purge', 'target', 'release', 'pixel-purge.exe');

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            // Disable cache for robust file loading and to prevent issues with updates
            disableBlinkFeatures: 'OutOfBlinkCors', // This is often used to disable cache, though not its primary purpose
            webSecurity: false // Temporarily disable for local file access, consider re-enabling with proper CSP
        }
    });

    // Load the frontend
    const distPath = path.join(__dirname, 'frontend', 'dist', 'index.html');
    const distUrl = require('url').pathToFileURL(distPath).href;

    console.log('Debug: __dirname:', __dirname);
    console.log('Debug: Exact Path:', distPath);
    console.log('Debug: Loading URL:', distUrl);

    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:5173').catch(e => {
            console.error('Failed to load local dev server:', e);
            console.log('Falling back to dist URL:', distUrl);
            mainWindow.loadURL(distUrl);
        });
    } else {
        console.log('Loading production dist...');
        mainWindow.loadURL(distUrl);
    }

    // Open the DevTools.
    mainWindow.webContents.openDevTools();

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('Failed to load:', errorCode, errorDescription);
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// IPC Handlers for spawning backend processes

// IPC Handler for SensiScan (Python)
ipcMain.handle('sensi-scan', async (event, filePath) => {
    return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python', [
            path.join(__dirname, 'backend', 'sensi_scan', 'sensi_scan', '__main__.py'),
            'scan',
            filePath,
            '--json'
        ]);

        let dataString = '';
        let errorString = '';

        pythonProcess.stdout.on('data', (data) => {
            dataString += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorString += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`SensiScan process exited with code ${code}: ${errorString}`));
            } else {
                try {
                    const result = JSON.parse(dataString);
                    resolve(result);
                } catch (e) {
                    reject(new Error(`Failed to parse SensiScan output: ${e.message}`));
                }
            }
        });
    });
});

// IPC Handler for LLM Code Audit (Python Backend)
ipcMain.handle('llm-audit', async (event, { code, language }) => {
    return new Promise((resolve, reject) => {
        // We use the reviewer.py script directly or via a wrapper
        // Ensuring we use the virtual environment python
        const pythonPath = path.join(__dirname, 'backend', 'sensi_scan', 'env', 'Scripts', 'python.exe');
        const scriptPath = path.join(__dirname, 'backend', 'llm_reviewer', 'reviewer.py');
        const modelPath = path.join(__dirname, 'backend', 'airgap_model', 'models', 'phi3-mini-4k-instruct-ggml-q4_0.bin');

        // Note: passing code via stdin or temp file is safer for large blocks
        // Here we'll use a temp file structure for robustness
        const tempDir = app.getPath('temp');
        const tempFile = path.join(tempDir, `audit_${Date.now()}.txt`);
        fs.writeFileSync(tempFile, code);

        const pythonProcess = spawn(pythonPath, [
            scriptPath,
            tempFile,
            '--model', modelPath,
            '--language', language
        ]);

        let resultString = '';
        let errorString = '';

        pythonProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log('[Python Frontend]:', output); // Log to terminal
            resultString += output;
        });

        pythonProcess.stderr.on('data', (data) => {
            const output = data.toString();
            console.error('[Python Error]:', output); // Log to terminal
            errorString += output;
        });

        pythonProcess.on('close', (code) => {
            // Cleanup temp file
            try { fs.unlinkSync(tempFile); } catch (e) { }

            if (code !== 0) {
                reject(new Error(`LLM Reviewer exited with code ${code}: ${errorString}`));
            } else {
                resolve({ analysis: resultString });
            }
        });
    });
});

// PixelPurge (Rust) - EXIF removal
ipcMain.handle('pixel-purge', async (event, inputPath, outputPath) => {
    return new Promise((resolve, reject) => {
        const process = spawn(RUST_EXEC, ['-i', inputPath, '-o', outputPath]);
        let output = '';

        process.stdout.on('data', (data) => {
            output += data.toString();
        });

        process.on('close', (code) => {
            if (code === 0) {
                resolve({ success: true, output });
            } else {
                reject(new Error(`PixelPurge exited with code ${code}`));
            }
        });
    });
});

// App lifecycle
app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

// Cleanup on quit
app.on('before-quit', () => {
    if (pythonProcess) {
        pythonProcess.kill();
    }
});
