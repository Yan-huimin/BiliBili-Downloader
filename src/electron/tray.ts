import { app, BrowserWindow, dialog, Menu, nativeImage, Tray } from 'electron';
import path from 'path';

/** Tray 下载状态 */
export interface DownloadTrayStatus {
  isDownloading: boolean;
  taskName?: string;
  progress?: number; // 0–100
}

let tray: Tray | null = null;
let mainWindowRef: BrowserWindow | null = null;
let currentStatus: DownloadTrayStatus = { isDownloading: false };
let lastMenuUpdate = 0;
let _isQuitting = false;

const FOREGROUND_MENU_THROTTLE_MS = 500;
const BACKGROUND_MENU_THROTTLE_MS = 3000;

function getTrayIconPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'icon.ico');
  }
  return path.join(app.getAppPath(), 'src/ui/assets/icon.ico');
}

function getStatusLabel(): string {
  if (!currentStatus.isDownloading || !currentStatus.taskName) {
    return '无下载';
  }
  const pct = currentStatus.progress ?? 0;
  return `正在下载：${currentStatus.taskName} ${pct}%`;
}

function rebuildMenu(): void {
  if (!tray || tray.isDestroyed()) return;

  const menu = Menu.buildFromTemplate([
    {
      label: getStatusLabel(),
      enabled: false,
    },
    { type: 'separator' },
    {
      label: '打开主窗口',
      click: () => showMainWindow(),
    },
    {
      label: '退出软件',
      click: () => quitApp(),
    },
  ]);

  tray.setContextMenu(menu);
}

function getMenuThrottleMs(): number {
  return mainWindowRef?.isVisible() ? FOREGROUND_MENU_THROTTLE_MS : BACKGROUND_MENU_THROTTLE_MS;
}

function rebuildMenuNow(): void {
  lastMenuUpdate = Date.now();
  rebuildMenu();
}

function throttledRebuildMenu(): void {
  const now = Date.now();
  if (now - lastMenuUpdate < getMenuThrottleMs()) return;
  lastMenuUpdate = now;
  rebuildMenu();
}

/**
 * 更新 Tray 菜单中显示的下载状态。
 * 状态无变化时跳过，避免无效重建。
 */
export function updateTrayDownloadStatus(status: DownloadTrayStatus): void {
  const prev = currentStatus;
  const hasModeChanged = prev.isDownloading !== status.isDownloading || prev.taskName !== status.taskName;

  if (
    prev.isDownloading === status.isDownloading &&
    prev.taskName === status.taskName &&
    prev.progress === status.progress
  ) {
    return;
  }

  currentStatus = { ...status };

  if (hasModeChanged || !status.isDownloading) {
    rebuildMenuNow();
    return;
  }

  throttledRebuildMenu();
}

/**
 * 显示/恢复主窗口并退出后台模式。
 */
export function showMainWindow(): void {
  const win = mainWindowRef;

  if (!win || win.isDestroyed()) {
    return;
  }

  win.setSkipTaskbar(false);
  if (win.isMinimized()) {
    win.restore();
  }
  win.show();
  win.focus();

  if (!win.webContents.isDestroyed()) {
    win.webContents.send('app:leave-background-mode');
    win.webContents.setBackgroundThrottling(true);
  }
}

/**
 * 退出应用。如果有下载任务则先弹出确认框。
 */
export async function quitApp(): Promise<void> {
  if (currentStatus.isDownloading) {
    const result = await dialog.showMessageBox({
      type: 'warning',
      title: '确认退出',
      message: '当前仍有下载任务，确定要退出软件吗？',
      buttons: ['取消', '退出'],
      defaultId: 0,
      cancelId: 0,
    });

    if (result.response !== 1) return;
  }

  _isQuitting = true;
  app.quit();
}

/**
 * 销毁 Tray 并清理资源。
 */
export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}

/** 是否正在执行退出流程 */
export function getIsQuitting(): boolean {
  return _isQuitting;
}

/**
 * 创建系统托盘，设置图标、菜单和双击打开行为。
 * @param mainWindow 主窗口实例
 */
export function createAppTray(mainWindow: BrowserWindow): Tray {
  mainWindowRef = mainWindow;

  const iconPath = getTrayIconPath();
  const icon = nativeImage.createFromPath(iconPath);

  tray = new Tray(icon);
  tray.setToolTip('biliDownload');

  rebuildMenu();

  tray.on('double-click', () => {
    showMainWindow();
  });

  return tray;
}
