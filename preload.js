// Electron Preload Script
// Exposes secure API to renderer process

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // SensiScan API
    sensiScan: (filePath) => ipcRenderer.invoke('sensi-scan', filePath),

    // PixelPurge API
    pixelPurge: (inputPath, outputPath) => ipcRenderer.invoke('pixel-purge', inputPath, outputPath),

    // Code Audit API (Python Backend)
    llmAudit: (payload) => ipcRenderer.invoke('llm-audit', payload),

    // Platform info
    platform: process.platform,

    // File dialog (if needed in future)
    // selectFile: () => ipcRenderer.invoke('dialog:openFile')
});
