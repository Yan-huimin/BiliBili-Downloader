import { BrowserWindow, ipcMain, shell } from "electron";
import { IpcMainHandle, IpcMainOn } from "./ipcTools.js";
import { extractBV, getCid, getPlayUrl, setSaveFolder } from "./utils.js";
import { getDefaultVideoPath } from "./pathResolver.js";
import fs from 'fs';

export function setupIpcHandlers(win: BrowserWindow){
    // 监听窗口打开、最小化、最大化事件
    IpcMainOn('sendFrameAction', (payload) => {
        switch (payload) {
            case 'CLOSE':
            win.close();
            break;
            case 'MAXIMIZE':
            win.maximize();
            break;
            case 'MINIMIZE':
            win.minimize();
            break;
        }
    });

    IpcMainHandle('sendLink', async (v_url) => {
        const bv = extractBV(v_url);

        if(bv === null) return "";

        const cid = await getCid(bv);

        if(cid === null)    return "";

        const video_durl = await getPlayUrl(bv, cid);
        return video_durl ?? "";
    })

    IpcMainHandle('setVideoFolder', async () => {
        const result = await setSaveFolder();

        if(result === null) return getDefaultVideoPath();

        return result;
    })

    IpcMainHandle('filePath', async (fileName) => {
        const res = fs.existsSync(fileName) ? "YES" : "NO";
        return res;
    })

      IpcMainOn('urlPage', async (payload: url) => {
            shell.openExternal(payload);
    })
}
