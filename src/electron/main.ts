import {app} from 'electron'
import { registerBiliImageHeaders, registerVideoDownloader } from './utils.js';
import { createMainWindow } from './createWindows.js';
import { setupIpcHandlers } from './ipcEventHandler.js';
import { restoreBiliLoginFromStorage } from './bilibiliAuthService.js';

app.whenReady().then(async () => {
    await restoreBiliLoginFromStorage();
    const mainWindow = createMainWindow();
    setupIpcHandlers(mainWindow);
    registerBiliImageHeaders();
    registerVideoDownloader(mainWindow);
})
