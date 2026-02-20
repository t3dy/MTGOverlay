import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron';
import path from 'path';
import { LogTailer, GameStateStore, ScryfallClient, GameOrchestrator, CardCache } from '@mtga-overlay/core';
import { StoreSnapshot } from '@mtga-overlay/shared';
import os from 'os';

let mainWindow: BrowserWindow | null = null;

const stateStore = new GameStateStore();
// Assuming default log path for MVP; normally we'd detect or ask user
const logPath = path.join(os.homedir(), 'AppData', 'LocalLow', 'Wizards Of The Coast', 'MTGA', 'Player.log');
const tailer = new LogTailer(logPath);
const scryfall = new ScryfallClient();
const cache = new CardCache(app.getPath('userData'));

const orchestrator = new GameOrchestrator(tailer, stateStore, scryfall, cache);

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 400,
        height: 600,
        x: 50,
        y: 50,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:5173');
        // mainWindow.webContents.openDevTools({ mode: 'detach' });
    } else {
        mainWindow.loadFile(path.join(__dirname, '../index.html'));
    }

    // Pass click-through by default? Maybe start interactive
    mainWindow.setIgnoreMouseEvents(false);
}

app.whenReady().then(() => {
    createWindow();

    // Wiring: Listen to Orchestrator snapshots (which listen to Store updates)
    orchestrator.onSnapshot((snapshot: StoreSnapshot) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('store:snapshot', snapshot);
        }
    });

    orchestrator.start();

    // Global Shortcuts
    globalShortcut.register('CommandOrControl+Shift+O', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            if (mainWindow.isVisible()) mainWindow.hide();
            else mainWindow.show();
        }
    });

    globalShortcut.register('CommandOrControl+Shift+C', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.setIgnoreMouseEvents(false);
        }
    });

    // IPC Handlers
    ipcMain.on('toggle-overlay', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            if (mainWindow.isVisible()) mainWindow.hide();
            else mainWindow.show();
        }
    });

    ipcMain.on('toggle-click-through', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.setIgnoreMouseEvents(false);
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
    tailer.stop();
});

