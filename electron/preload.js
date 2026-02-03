const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pixelPurge', {
  saveFile: (fileData) => ipcRenderer.invoke('pixel-purge:save-file', fileData),
  processImage: (options) => ipcRenderer.invoke('pixel-purge:process', options),
  openFile: (filePath) => ipcRenderer.invoke('pixel-purge:open-file', filePath),
  readFile: (filePath) => ipcRenderer.invoke('pixel-purge:read-file', filePath),
});
