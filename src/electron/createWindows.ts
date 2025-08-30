import { BrowserWindow, globalShortcut, session } from "electron";
import { getPreloadPath, getUiPath } from "./pathResolver.js";
import { isDev, loadCookies } from "./utils.js";

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

    loadCookies();

    globalShortcut.register('F12', () => {});
    globalShortcut.register('Control+Shift+I', () => {});

    mainWindow.webContents.once('did-finish-load', () => {
        mainWindow.show();
    });
  return mainWindow;
}