import { BrowserWindow, globalShortcut } from "electron";
import { APP_NAME } from "./appIdentity.js";
import { getAppIconPath, getPreloadPath, getUiPath } from "./pathResolver.js";
import { isDev } from "./utils.js";

/**
 * 创建 Electron 主窗口。
 * 配置无边框、固定尺寸的 BrowserWindow，并根据环境加载开发服务器或生产构建的 HTML。
 * 在开发模式下会打开 DevTools，生产模式下则禁止打开 DevTools。
 * @returns 创建并配置完成的 BrowserWindow 实例。
 */
export function createMainWindow() {
    const mainWindow = new BrowserWindow({
        webPreferences: {
            // devTools: true,
            backgroundThrottling: true,
            webSecurity: false,
            preload: getPreloadPath(),
            // session: session.fromPartition('persist:bili'),
        },
        resizable: false,
        maximizable: false,
        fullscreenable: false,
        width: 400,
        height: 500,
        frame: false,
        show: false,
        title: APP_NAME,
        icon: getAppIconPath(),
    });  // 在其中可以设置窗口初始位置，大小以及是否显示默认的菜单栏等内容

    // registerBiliImageHeaders();

    if(isDev()){
        mainWindow.loadURL('http://localhost:5123');
    }else{
        mainWindow.loadFile(getUiPath());
    }

    mainWindow.setMaximizable(false);
    mainWindow.setFullScreenable(false);

    const enforceFixedWindowState = () => {
        if (mainWindow.isDestroyed()) return;
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        }
        if (mainWindow.isFullScreen()) {
            mainWindow.setFullScreen(false);
        }
    };

    mainWindow.on("maximize", enforceFixedWindowState);
    mainWindow.on("enter-full-screen", enforceFixedWindowState);
    mainWindow.on("enter-html-full-screen", enforceFixedWindowState);

    globalShortcut.register('F12', () => {});
    globalShortcut.register('F11', () => {});
    globalShortcut.register('Control+Shift+I', () => {});

    mainWindow.webContents.once('did-finish-load', () => {
        mainWindow.setTitle(APP_NAME);
        mainWindow.show();
    });

    mainWindow.webContents.on("page-title-updated", (event) => {
        event.preventDefault();
        mainWindow.setTitle(APP_NAME);
    });

    mainWindow.webContents.on("render-process-gone", (_event, details) => {
        console.error("Renderer process exited:", details);
        if (!mainWindow.isDestroyed() && details.reason !== "clean-exit") {
            mainWindow.reload();
        }
    });

  return mainWindow;
}
