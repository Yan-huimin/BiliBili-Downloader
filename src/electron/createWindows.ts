import { BrowserWindow, globalShortcut } from "electron";
import { getPreloadPath, getUiPath } from "./pathResolver.js";
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
            webSecurity: false,
            preload: getPreloadPath(),
            // session: session.fromPartition('persist:bili'),
        },
        resizable: false,
        width: 400,
        height: 500,
        frame: false,
        show: false,
    });  // 在其中可以设置窗口初始位置，大小以及是否显示默认的菜单栏等内容

    // registerBiliImageHeaders();

    if(isDev()){
        mainWindow.loadURL('http://localhost:5123');
    }else{
        mainWindow.loadFile(getUiPath());
    }

    if(isDev()){
        mainWindow.webContents.openDevTools();
    }else{
        mainWindow.webContents.on('devtools-opened', () => {
            mainWindow.webContents.closeDevTools();
        });
    }

    // mainWindow.webContents.openDevTools();

    globalShortcut.register('F12', () => {});
    globalShortcut.register('Control+Shift+I', () => {});

    mainWindow.webContents.once('did-finish-load', () => {
        mainWindow.show();
    });
  return mainWindow;
}
