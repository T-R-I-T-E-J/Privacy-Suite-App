const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const os = require('os');
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

const execAsync = promisify(exec);

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Suppress DevTools protocol errors (like Autofill.enable)
  mainWindow.webContents.on('console-message', (event, level, message) => {
    if (message.includes('Autofill.enable') || message.includes('wasn\'t found')) {
      return; // Suppress harmless DevTools protocol warnings
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../frontend/dist/index.html'));
  }
}

// Get pixel-purge binary path
function getPixelPurgePath() {
  if (isDev) {
    // Development: use release binary from pixel-purge/target/release
    const binaryName = process.platform === 'win32' ? 'pixel-purge.exe' : 'pixel-purge';
    return path.join(__dirname, '..', 'pixel-purge', 'target', 'release', binaryName);
  } else {
    // Production: binary should be bundled with the app
    const binaryName = process.platform === 'win32' ? 'pixel-purge.exe' : 'pixel-purge';
    return path.join(process.resourcesPath, 'pixel-purge', binaryName);
  }
}

// Clear Windows file attributes (owner and computer info)
async function clearWindowsFileAttributes(filePath) {
  if (process.platform !== 'win32') {
    return { success: true }; // Not Windows, skip
  }

  try {
    // Use PowerShell to remove owner/computer info
    // This requires running as administrator or having proper permissions
    const escapedPath = filePath.replace(/"/g, '`"');
    const psCommand = `
      $file = Get-Item "${escapedPath}"
      $acl = $file.GetAccessControl()
      $acl.SetOwner([System.Security.Principal.NTAccount]"Everyone")
      $file.SetAccessControl($acl)
      # Clear extended attributes that might contain computer info
      (Get-Item $file.FullName).Attributes = "Archive"
    `;
    
    await execAsync(`powershell -Command "${psCommand}"`);
    return { success: true };
  } catch (error) {
    // If we can't change ownership, at least try to clear some attributes
    console.warn('Could not clear Windows file attributes:', error.message);
    return { success: false, error: error.message };
  }
}

// IPC handler for saving uploaded file to temp directory
ipcMain.handle('pixel-purge:save-file', async (event, fileData) => {
  try {
    if (!fileData || !fileData.buffer || !fileData.fileName) {
      return { success: false, error: 'Invalid file data provided' };
    }

    const { buffer, fileName } = fileData;
    
    // Validate file size (max 100MB)
    if (buffer.length > 100 * 1024 * 1024) {
      return { success: false, error: 'File size exceeds 100MB limit' };
    }

    // Sanitize filename
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    
    const tempDir = path.join(os.tmpdir(), 'pixel-purge');
    await fs.mkdir(tempDir, { recursive: true });
    
    const filePath = path.join(tempDir, sanitizedFileName);
    await fs.writeFile(filePath, Buffer.from(buffer));
    
    return { success: true, filePath };
  } catch (error) {
    return { success: false, error: `Failed to save file: ${error.message}` };
  }
});

// IPC handler for pixel-purge processing
ipcMain.handle('pixel-purge:process', async (event, options) => {
  const {
    inputPath,
    outputPath,
    stripTags = ['GPS', 'DateTime', 'Make', 'Model', 'Software'],
    fakeGps = null,
    forceExiftool = false,
    quality = 100,
  } = options;

  try {
    // Validate input parameters
    if (!inputPath || !outputPath) {
      return {
        success: false,
        error: 'Input and output paths are required',
      };
    }

    // Validate input file exists
    try {
      await fs.access(inputPath);
    } catch {
      return {
        success: false,
        error: `Input file not found: ${inputPath}`,
      };
    }

    // Validate file path security (prevent directory traversal)
    if (inputPath.includes('..') || outputPath.includes('..')) {
      return {
        success: false,
        error: 'Invalid file path: directory traversal not allowed',
      };
    }
    
    // Create output directory if it doesn't exist
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });

    // Prepare binary path
    const binaryPath = getPixelPurgePath();
    
    // Check if binary exists
    try {
      await fs.access(binaryPath);
    } catch {
      return {
        success: false,
        error: `Pixel-purge binary not found at: ${binaryPath}. Please build it first with 'cargo build --release' in the pixel-purge directory.`,
      };
    }

    // Build command arguments
    const args = [
      '--input', inputPath,
      '--output', outputPath,
      '--strip-tags', stripTags.join(','),
      '--quality', quality.toString(),
    ];

    if (fakeGps && fakeGps.lat !== undefined && fakeGps.lon !== undefined) {
      args.push('--fake-gps', `${fakeGps.lat},${fakeGps.lon}`);
    }

    if (forceExiftool) {
      args.push('--force-exiftool');
    }

    // Execute binary
    return new Promise((resolve) => {
      const process = spawn(binaryPath, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', async (code) => {
        if (code !== 0) {
          resolve({
            success: false,
            error: `Process exited with code ${code}. ${stderr}`,
          });
          return;
        }

        try {
          // Parse JSON output from binary
          const result = JSON.parse(stdout);
          // Transform snake_case to camelCase for TypeScript compatibility
          const transformedResult = {
            success: result.success,
            outputPath: result.output_path || result.outputPath,
            error: result.error,
          };
          
          // Clear Windows file attributes if processing succeeded
          if (transformedResult.success && transformedResult.outputPath) {
            await clearWindowsFileAttributes(transformedResult.outputPath);
          }
          
          resolve(transformedResult);
        } catch (e) {
          resolve({
            success: false,
            error: `Failed to parse output: ${e.message}. Output: ${stdout}`,
          });
        }
      });

      process.on('error', (error) => {
        resolve({
          success: false,
          error: `Failed to spawn process: ${error.message}`,
        });
      });
    });
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
});

// IPC handler for opening file in system file manager
ipcMain.handle('pixel-purge:open-file', async (event, filePath) => {
  try {
    await shell.showItemInFolder(filePath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// IPC handler for reading processed file for download
ipcMain.handle('pixel-purge:read-file', async (event, filePath) => {
  try {
    const buffer = await fs.readFile(filePath);
    return {
      success: true,
      buffer: Array.from(buffer),
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
