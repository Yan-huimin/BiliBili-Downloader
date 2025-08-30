import {app} from 'electron'
import { registerBiliImageHeaders, registerVideoDownloader } from './utils.js';
import { createMainWindow } from './createWindows.js';
import { setupIpcHandlers } from './ipcEventHandler.js';

app.whenReady().then(() => {
    const mainWindow = createMainWindow();
    setupIpcHandlers(mainWindow);
    registerBiliImageHeaders();
    registerVideoDownloader(mainWindow);
})
