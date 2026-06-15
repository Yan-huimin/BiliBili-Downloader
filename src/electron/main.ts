import { app } from 'electron'
import { APP_NAME, APP_USER_MODEL_ID } from './appIdentity.js';
import { registerBiliImageHeaders, registerVideoDownloader } from './utils.js';
import { createMainWindow } from './createWindows.js';
import { setupIpcHandlers } from './ipcEventHandler.js';
import { restoreBiliLoginFromStorage } from './bilibiliAuthService.js';
import { createAppTray, destroyTray, getIsQuitting, showMainWindow } from './tray.js';

app.setName(APP_NAME);

if (process.platform === 'win32') {
  app.setAppUserModelId(APP_USER_MODEL_ID);
  // 允许 Windows 在后台空闲时自动将进程置于效率模式（EcoQoS）
  app.commandLine.appendSwitch('enable-features', 'UseEcoQoSForBackgroundProcess');
}

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
