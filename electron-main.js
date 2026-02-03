const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      // workers: true 
    }
  });

  // In production (built .exe), load the file. In dev, load localhost.
  if (!app.isPackaged) {
    win.loadURL('http://localhost:5173');
    // win.webContents.openDevTools(); // Optional: Open DevTools for debugging
  } else {
    win.loadFile(path.join(__dirname, 'frontend/dist/index.html'));
  }
}

const { ipcMain } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');

// IPC Handler for Sensi-Scan
ipcMain.handle('sensi-scan:analyze', async (event, filePath) => {
  return new Promise((resolve, reject) => {
    // Determine paths
    // In Dev: Relative to project root
    // In Prod: Needs handling (omitted for strictly Dev setup per instructions)
    const pythonPath = path.join(__dirname, 'backend/sensi_scan/venv/Scripts/python.exe'); // Windows specifics
    const scriptPath = path.join(__dirname, 'backend/sensi_scan'); // Run as module
    
    // Construct Redacted Path: file.docx -> file.redacted.<timestamp>.docx
    const ext = path.extname(filePath);
    const base = filePath.substring(0, filePath.length - ext.length);
    const timestamp = Date.now();
    const outputPath = `${base}.redacted.${timestamp}${ext}`;
    
    console.log(`[Electron] Spawning Sensi-Scan on: ${filePath} -> ${outputPath}`);

    const sensi = spawn(pythonPath, [
      '-m', 'sensi_scan', 
      'analyze', 
      filePath, 
      '--out', outputPath
    ], {
        cwd: path.join(__dirname, 'backend/sensi_scan')
    });

    let outputData = '';
    let errorData = '';

    sensi.stdout.on('data', (data) => {
      outputData += data.toString();
    });

    sensi.stderr.on('data', (data) => {
      errorData += data.toString();
      console.error(`[Sensi-Scan Stderr]: ${data}`);
    });

    sensi.on('close', (code) => {
      console.log(`[Electron] Sensi-Scan exited with code ${code}`);
      if (code === 0) {
        try {
          // Parse the JSON from stdout
          const result = JSON.parse(outputData);
          resolve(result);
        } catch (e) {
          reject(`Failed to parse JSON output: ${e.message}`);
        }
      } else {
        reject(`Sensi-Scan failed (Code ${code}): ${errorData}`);
      }
    });

    sensi.on('error', (err) => {
        reject(`Failed to spawn process: ${err.message}`);
    });
  });
});

// IPC Handler for Pixel-Purge (Rust)
ipcMain.handle('pixel-purge:clean', async (event, filePath) => {
  return new Promise((resolve) => {
    // Path to Rust binary (Dev layout)
    const binaryPath = path.join(__dirname, 'backend/pixel_purge/target/release/pixel-purge.exe');
    const outputPath = filePath.replace(/(\.[^.]+)$/, '_clean$1');

    console.log(`[Pixel-Purge] Request: ${filePath} -> ${outputPath}`);

    // Check if binary exists
    if (!fs.existsSync(binaryPath)) {
        console.error(`[Pixel-Purge] Binary not found at: ${binaryPath}`);
        return resolve({ 
            success: false, 
            error: "Rust binary not found. Please compile 'pixel-purge' or install C++ Build Tools." 
        });
    }

    const purge = spawn(binaryPath, ['--input', filePath, '--output', outputPath]);

    let stderr = '';
    
    purge.stderr.on('data', (d) => stderr += d.toString());

    purge.on('close', (code) => {
        if (code === 0) {
            resolve({ success: true, outputPath });
        } else {
            resolve({ success: false, error: `Process failed (Code ${code}): ${stderr}` });
        }
    });
    
    purge.on('error', (err) => {
        resolve({ success: false, error: err.message });
    });
  });
});

// IPC Handler for Opening Files
ipcMain.handle('shell:open', async (event, filePath) => {
  const { shell } = require('electron');
  try {
    await shell.openPath(filePath);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

app.whenReady().then(createWindow);


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
