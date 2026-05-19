import { BrowserWindow, Notification, ipcMain, shell } from "electron";
import fs from "fs";
import {
  checkBiliLogin,
  getBiliUserInfo,
  getQrLoginInfo,
  logoutBili,
  pollQrLoginStatus,
} from "./bilibiliAuthService.js";
import { IpcMainHandle, IpcMainOn } from "./ipcTools.js";
import { getDefaultVideoPath, getSettingsPath } from "./pathResolver.js";
import {
  ensureExistSettingsFile,
  extractBV,
  getCid,
  getPlayUrl,
  setSaveFolder,
} from "./utils.js";

function registerBiliAuthHandlers() {
  ipcMain.handle("getQr", async () => getQrLoginInfo());
  ipcMain.handle("poll_qrcode_status", async (_event, qrcodeKey: string) =>
    pollQrLoginStatus(qrcodeKey)
  );
  ipcMain.handle("check_login", async () => checkBiliLogin());
  ipcMain.handle("getUserInfo", async () => getBiliUserInfo());
  ipcMain.handle("logOut", async () => logoutBili());
}

export function setupIpcHandlers(win: BrowserWindow) {
  IpcMainOn("sendFrameAction", (payload) => {
    switch (payload) {
      case "CLOSE":
        win.close();
        break;
      case "MAXIMIZE":
        win.maximize();
        break;
      case "MINIMIZE":
        win.minimize();
        break;
    }
  });

  IpcMainHandle("sendLink", async (vUrl: dashUrl) => {
    const bv = extractBV(vUrl.video_url);

    if (bv === null) {
      return { video_url: "", audio_url: "" };
    }

    const cid = await getCid(bv);

    if (cid === null) {
      return { video_url: "", audio_url: "" };
    }

    const url = await getPlayUrl(bv, cid);
    return url ?? { video_url: "", audio_url: "" };
  });

  IpcMainHandle("setVideoFolder", async () => {
    const result = await setSaveFolder();
    return result ?? getDefaultVideoPath();
  });

  IpcMainHandle("filePath", async (fileName) => {
    return fs.existsSync(fileName) ? "YES" : "NO";
  });

  IpcMainOn("urlPage", async (payload: url) => {
    shell.openExternal(payload);
  });

  IpcMainOn("sendSuccessInfo", (payload: downloadSuccess) => {
    const notification = new Notification({
      title: payload.types,
      body: payload.message,
    });

    notification.show();
    setTimeout(() => {
      notification.close();
    }, 2500);
  });

  IpcMainOn("setSettings", (payload: Settings) => {
    ensureExistSettingsFile();
    fs.writeFileSync(getSettingsPath(), JSON.stringify(payload, null, 2), "utf-8");
  });

  registerBiliAuthHandlers();

  IpcMainHandle("loadSettings", async () => {
    ensureExistSettingsFile();
    const data = fs.readFileSync(getSettingsPath(), "utf-8");
    return JSON.parse(data) as Settings;
  });
}
