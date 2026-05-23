import { BrowserWindow, Notification, ipcMain, shell } from "electron";
import fs from "fs";
import {
  checkBiliLogin,
  getBiliUserInfo,
  getQrLoginInfo,
  logoutBili,
  pollQrLoginStatus,
} from "./bilibiliAuthService.js";
import { fetchBangumiEpisodes } from "./bangumiService.js";
import { fetchCollection } from "./collectionService.js";
import {
  cancelDownload,
  clearQueue,
  enqueueBulk,
  enqueueOne,
  getQueue,
  removeTask,
} from "./downloadQueue.js";
import { IpcMainHandle, IpcMainOn } from "./ipcTools.js";
import { getDefaultVideoPath, getSettingsPath } from "./pathResolver.js";
import {
  ensureExistSettingsFile,
  extractBV,
  getCid,
  getPlayUrl,
  setSaveFolder,
} from "./utils.js";

/**
 * 注册 Bilibili 认证相关的 IPC handlers。
 * 包括：获取二维码信息、轮询扫码状态、检查登录、获取用户信息、退出登录。
 */
function registerBiliAuthHandlers() {
  ipcMain.handle("getQr", async () => getQrLoginInfo());
  ipcMain.handle("poll_qrcode_status", async (_event, qrcodeKey: string) =>
    pollQrLoginStatus(qrcodeKey)
  );
  ipcMain.handle("check_login", async () => checkBiliLogin());
  ipcMain.handle("getUserInfo", async () => getBiliUserInfo());
  ipcMain.handle("logOut", async () => logoutBili());
}

/**
 * 为 Electron 主进程注册所有 IPC 事件处理器。
 * 处理窗口控制、视频链接解析、文件下载、文件夹选择、文件存在性检查、
 * URL 打开、系统通知、设置读写以及 Bilibili 认证等交互。
 * @param win - 当前的主窗口 BrowserWindow 实例，用于窗口操作和 WebContents 通信。
 */
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

  IpcMainHandle("openDevTools", async () => {
    return openDeveloperTools(win);
  });

  ipcMain.handle("fetchCollection", async (_e, bvid: string) => {
    return await fetchCollection(bvid);
  });

  ipcMain.handle("fetchBangumiEpisodes", async (_e, epId: number) => {
    return await fetchBangumiEpisodes(epId);
  });

  IpcMainOn("enqueueBulk", (tasks: DownloadTask[]) => {
    enqueueBulk(tasks, win);
  });

  IpcMainOn("enqueueSingle", (task: DownloadTask) => {
    enqueueOne(task, win);
  });

  IpcMainOn("cancelDownload", (taskId: number) => {
    cancelDownload(taskId, win);
  });

  IpcMainOn("clearQueue", () => {
    clearQueue(win);
  });

  IpcMainOn("removeTask", (taskId: number) => {
    removeTask(taskId, win);
  });

  IpcMainHandle("getQueue", async () => {
    return getQueue();
  });
}

/**
 * 为指定窗口打开 Chrome Developer Tools。
 * 内部会校验窗口是否已销毁，并捕获可能出现的异常。
 * @param win - 当前主窗口 BrowserWindow 实例。
 * @returns 成功打开返回 true，失败时返回 false。
 */
function openDeveloperTools(win: BrowserWindow): boolean {
  try {
    if (win.isDestroyed()) {
      console.error("无法打开开发者工具：窗口已销毁");
      return false;
    }

    if (win.webContents.isDestroyed()) {
      console.error("无法打开开发者工具：webContents 已销毁");
      return false;
    }

    win.webContents.openDevTools({ mode: "detach" });
    return true;
  } catch (error) {
    console.error("打开开发者工具时发生异常:", error);
    return false;
  }
}
