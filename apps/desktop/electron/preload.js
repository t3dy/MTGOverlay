import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('electronAPI', {
    onUpdate: (callback) => ipcRenderer.on('game-state-update', callback),
    toggleOverlay: () => ipcRenderer.send('toggle-overlay'),
    toggleClickThrough: () => ipcRenderer.send('toggle-click-through')
});
