const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openInEdge: (url) => ipcRenderer.invoke('open-in-edge', url),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  platform: process.platform
});
