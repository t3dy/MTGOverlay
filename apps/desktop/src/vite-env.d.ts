/// <reference types="vite/client" />

interface ElectronAPI {
    onUpdate: (callback: (event: any, data: any) => void) => void;
    toggleOverlay: () => void;
    toggleClickThrough: () => void;
}

interface Window {
    electronAPI: ElectronAPI;
}
