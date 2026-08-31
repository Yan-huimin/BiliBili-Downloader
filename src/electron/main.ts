import { app } from 'electron'
import { APP_NAME, APP_USER_MODEL_ID } from './appIdentity.js';
import { registerBiliImageHeaders, registerVideoDownloader } from './utils.js';
import { createMainWindow } from './createWindows.js';
import { setupIpcHandlers } from './ipcEventHandler.js';
import { restoreBiliLoginFromStorage } from './bilibiliAuthService.js';
import { createAppTray, destroyTray, getIsQuitting, markAppQuitting, showMainWindow } from './tray.js';
import { ensureDownloadHistoryFile } from './historyService.js';
import { ensureSettingsFile, getCloseBehavior } from './settingsService.js';

const e2eUserDataPath = process.env.BILIDOWNLOAD_E2E_USER_DATA_DIR;
if (process.env.NODE_ENV === 'development' && e2eUserDataPath) {
  app.setPath('userData', e2eUserDataPath);
}

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
    ensureSettingsFile();
    ensureDownloadHistoryFile();
    const mainWindow = createMainWindow();
    setupIpcHandlers(mainWindow);
    registerBiliImageHeaders();
    registerVideoDownloader(mainWindow);

    createAppTray(mainWindow);

    // 关闭窗口 → 隐藏到托盘，不退出
    mainWindow.on('close', (event) => {
      if (getIsQuitting()) return;

      event.preventDefault();
      if (getCloseBehavior() === 'quit') {
        markAppQuitting();
        app.quit();
        return;
      }

      mainWindow.hide();
      mainWindow.setSkipTaskbar(true);
      if (!mainWindow.webContents.isDestroyed()) {
        mainWindow.webContents.send('app:enter-background-mode');
        mainWindow.webContents.setBackgroundThrottling(true);
      }
    });
  });

  app.on('before-quit', () => {
    markAppQuitting();
  });

  app.on('will-quit', () => {
    destroyTray();
  });
}
