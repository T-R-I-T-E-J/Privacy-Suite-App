export const electronAPI = {
  analyzeFile: async (filePath: string): Promise<any> => {
    // Check if running in Electron
    if (window.require) {
      const { ipcRenderer } = window.require('electron');
      return ipcRenderer.invoke('sensi-scan:analyze', filePath);
    } else {
      console.warn("Not running in Electron. Mocking response.");
      // Mock response for browser dev
      return new Promise(resolve => setTimeout(() => resolve({
        privacy_score: 85,
        detected_items: [
          { type: 'MOCK_EMAIL', count: 2, context: 'text' }
        ],
        redacted_file: filePath + '.mock.redacted'
      }), 1000));
    }
  },
  cleanImage: async (filePath: string): Promise<{ success: boolean; outputPath?: string; error?: string }> => {
    if (window.require) {
      const { ipcRenderer } = window.require('electron');
      return ipcRenderer.invoke('pixel-purge:clean', filePath);
    } else {
      console.warn("Not in Electron. Mocking Pixel-Purge.");
      return new Promise(resolve => setTimeout(() => resolve({
        success: true,
        outputPath: filePath.replace('.', '_clean.')
      }), 1000));
    }
  },
  openFile: async (filePath: string): Promise<void> => {
    if (window.require) {
      const { ipcRenderer } = window.require('electron');
      await ipcRenderer.invoke('shell:open', filePath);
    } else {
      console.log("Mock Open: " + filePath);
    }
  }
};
