import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    onSnapshot: (callback: (snapshot: any) => void) => {
        const listener = (_event: any, value: any) => callback(value);
        ipcRenderer.on('store:snapshot', listener);
        return () => ipcRenderer.removeListener('store:snapshot', listener);
    },
    cycleArt: (key: string, direction?: 'next' | 'prev') => ipcRenderer.send('card:cycle-art', { key, direction }),
    resetArt: (key: string) => ipcRenderer.send('card:reset-art', key),
    onVisibility: (callback: (visible: boolean) => void) => {
        const listener = (_event: any, value: any) => callback(value);
        ipcRenderer.on('state:visibility', listener);
        return () => ipcRenderer.removeListener('state:visibility', listener);
    },
    onClickThrough: (callback: (enabled: boolean) => void) => {
        const listener = (_event: any, value: any) => callback(value);
        ipcRenderer.on('state:click-through', listener);
        return () => ipcRenderer.removeListener('state:click-through', listener);
    },
});
