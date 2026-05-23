import { app } from 'electron'
import { registerBiliImageHeaders, registerVideoDownloader } from './utils.js';
import { createMainWindow } from './createWindows.js';
import { setupIpcHandlers } from './ipcEventHandler.js';
import { restoreBiliLoginFromStorage } from './bilibiliAuthService.js';
import { createAppTray, destroyTray, getIsQuitting, showMainWindow } from './tray.js';

// 单实例锁：防止后台运行时多开
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    showMainWindow();
  });

  app.whenReady().then(async () => {
    await restoreBiliLoginFromStorage();
    const mainWindow = createMainWindow();
    setupIpcHandlers(mainWindow);
    registerBiliImageHeaders();
    registerVideoDownloader(mainWindow);

    createAppTray(mainWindow);

    // 关闭窗口 → 隐藏到托盘，不退出
    mainWindow.on('close', (event) => {
      if (!getIsQuitting()) {
        event.preventDefault();
        mainWindow.hide();
        mainWindow.setSkipTaskbar(true);
        if (!mainWindow.webContents.isDestroyed()) {
          mainWindow.webContents.send('app:enter-background-mode');
          mainWindow.webContents.setBackgroundThrottling(true);
        }
      }
    });
  });

  app.on('before-quit', () => {
    // ensure isQuitting is set for clean exit
  });

  app.on('will-quit', () => {
    destroyTray();
  });
}
