import {app} from 'electron'
import { registerVideoDownloader } from './utils.js';
import { createMainWindow } from './createWindows.js';
import { setupIpcHandlers } from './ipcEventHandler.js';

app.whenReady().then(() => {
    const mainWindow = createMainWindow();
    setupIpcHandlers(mainWindow);
    registerVideoDownloader(mainWindow);
})