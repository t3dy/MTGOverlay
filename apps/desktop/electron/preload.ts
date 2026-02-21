import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    onSnapshot: (callback: (snapshot: any) => void) => ipcRenderer.on('store:snapshot', (_event, value) => callback(value)),
    cycleArt: (key: string, direction?: 'next' | 'prev') => ipcRenderer.send('card:cycle-art', { key, direction }),
    onVisibility: (callback: (visible: boolean) => void) => ipcRenderer.on('state:visibility', (_event, value) => callback(value)),
    onClickThrough: (callback: (enabled: boolean) => void) => ipcRenderer.on('state:click-through', (_event, value) => callback(value)),
});
