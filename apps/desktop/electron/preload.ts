import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    onUpdate: (callback: (event: any, data: any) => void) => ipcRenderer.on('game-state-update', callback),
    toggleOverlay: () => ipcRenderer.send('toggle-overlay'),
    toggleClickThrough: () => ipcRenderer.send('toggle-click-through')
});
