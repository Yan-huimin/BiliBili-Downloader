import { BrowserWindow, ipcMain, shell, Notification } from "electron";
import { IpcMainHandle, IpcMainOn } from "./ipcTools.js";
import { ensureExistCookiesFile, ensureExistSettingsFile, extractBV, getCid, getPlayUrl, loadCookies, logout, saveCookies, setSaveFolder } from "./utils.js";
import { getDefaultVideoPath, getFfmpegPath, getSettingsPath } from "./pathResolver.js";
import fs from 'fs';
import { client, jar } from "./bilibiliClient.js";
import ffmpegPath from 'ffmpeg-static';
import { get } from "http";

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

    IpcMainHandle('sendLink', async (v_url: dashUrl) => {
        const bv = extractBV(v_url.video_url);

        if(bv === null) return { video_url: "", audio_url: "" };

        const cid = await getCid(bv);

        if(cid === null)    return { video_url: "", audio_url: "" };

        const url = await getPlayUrl(bv, cid);
        return url ?? { video_url: "", audio_url: "" };
    });

    IpcMainHandle('setVideoFolder', async () => {
        const result = await setSaveFolder();

        if(result === null) return getDefaultVideoPath();

        return result;
    });

    IpcMainHandle('filePath', async (fileName) => {
        const res = fs.existsSync(fileName) ? "YES" : "NO";
        return res;
    });

      IpcMainOn('urlPage', async (payload: url) => {
            shell.openExternal(payload);
    });

    IpcMainOn('sendSuccessInfo', (payload: downloadSuccess) => {
        const notification = new Notification({ title: payload.types, body: payload.message });
        notification.show();
        setTimeout(() => {
          notification.close();
        }, 2500);
    });

    IpcMainOn('setSettings', (payload: Settings) => {
        ensureExistSettingsFile();
        fs.writeFileSync(getSettingsPath(), JSON.stringify(payload, null, 2), 'utf-8');
    });

    ipcMain.handle("getQr", async () => {
        const res = await client.get("https://passport.bilibili.com/x/passport-login/web/qrcode/generate");
        return res.data.data; // { url, qrcode_key }
    });

    ipcMain.handle("poll_qrcode_status", async (event, qrcodeKey) => {
        
        const res = await client.get(`https://passport.bilibili.com/x/passport-login/web/qrcode/poll?qrcode_key=${qrcodeKey}`);

        ensureExistCookiesFile();

        const code = res.data.data.code;

        if(code === 0){
            const userInfo = await client.get("https://api.bilibili.com/x/web-interface/nav");
            saveCookies();
            console.log("jar: \n" + jar);
            jar.getCookies('https://www.bilibili.com', (err, cookies) => {
                if (err) {
                    console.error(err);
                    return;
                }
                console.log(cookies); // 输出 Cookie 对象数组
            });
        }

        return res.data.data.code;
    });

    IpcMainHandle('check_login', async () => {
        const res = await client.get("https://api.bilibili.com/x/web-interface/nav");
        return res.data.code === 0;
    });

    IpcMainHandle('getUserInfo', async () => {
        const res = await client.get("https://api.bilibili.com/x/web-interface/nav");
        return res.data.data;
    });

    IpcMainHandle('logOut', async () => {
        const res = await client.post("https://passport.bilibili.com/login/exit/v2");
        logout();
        return res.data.code === 0;
    });

    IpcMainHandle('loadSettings', async () => {
        ensureExistSettingsFile();
        const data = fs.readFileSync(getSettingsPath(), 'utf-8');
        return JSON.parse(data) as Settings;
    });
}
