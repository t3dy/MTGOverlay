/// <reference types="vite/client" />

interface ElectronAPI {
    onSnapshot: (callback: (snapshot: any) => void) => void;
    cycleArt: (key: string) => void;
    resetArt: (key: string) => void;
    onVisibility: (callback: (visible: boolean) => void) => void;
    onClickThrough: (callback: (enabled: boolean) => void) => void;
}

interface Window {
    electronAPI: ElectronAPI;
}
