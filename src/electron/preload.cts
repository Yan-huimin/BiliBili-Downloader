// import { ipcRenderer } from "electron";

// const electron = require('electron')

// function ipcSend<Key extends keyof EventPayloadMapping>(
//     key: Key,
//     payload: EventPayloadMapping[Key]
//   ) {
//     electron.ipcRenderer.send(key, payload);
// }

// function ipcInvoke<Key extends keyof EventPayloadMapping>(
//     key: Key,
//   ): Promise<EventPayloadMapping[Key]> {
//     return electron.ipcRenderer.invoke(key);
// }

// function ipcInvoke_1<Key extends keyof EventPayloadMapping>(
//     key: Key,
//     payload: EventPayloadMapping[Key]
//   ): Promise<EventPayloadMapping[Key]> {
//     return electron.ipcRenderer.invoke(key, payload);
// }

// electron.contextBridge.exposeInMainWorld(
//   "electron",
//   {
//     sendFrameAction: (payload: FrameWindowAction) => ipcSend('sendFrameAction', payload),
//     sendLinkAndDownloadMp4: (payload: dashUrl) => ipcInvoke_1('sendLink', payload),
//     startDownload: (args: { video_url: string; audio_url: string; filePath: string }) => ipcInvoke_1('start_download', args),
//     onDownloadProgress: (callback: (progress: number) => void) =>
//       electron.ipcRenderer.on('download-progress', (_e: Electron.IpcRendererEvent, progress: number) => callback(progress)),
//     setVideoFolder: () => ipcInvoke('setVideoFolder'),
//     openPage: (payload: url) => ipcSend('urlPage', payload),
//     checkFileExist: (payload: filePathExist) => ipcInvoke_1('filePath', payload),
//     sendSuccessInfo: (payload: downloadSuccess) => ipcSend('sendSuccessInfo', payload),
//     on: (channel, callback) => {
//       ipcRenderer.on(channel, (_event, ...args) => callback(...args));
//     },
//     setSettings: (payload: Settings) => ipcSend('setSettings', payload),
//     loadSettings: () => ipcInvoke('loadSettings'),
//   } satisfies Window["electron"] & {
//     on: (channel: string, callback: (...args: any[]) => void) => void;
//   }
// );

// electron.contextBridge.exposeInMainWorld(
//   "biliApi",{
//     getQr: () => ipcInvoke('getQr'),
//     pollQRCodeStatus: (payload: qrcode_key) => ipcInvoke_1("poll_qrcode_status", payload),
//     checkLogin: () => ipcInvoke('check_login'),
//     getUserInfo: () => ipcInvoke('getUserInfo'),
//     logOut: () => ipcInvoke('logOut'),
//   } satisfies Window["biliApi"]
// );

import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electron", {
  sendFrameAction: (payload: FrameWindowAction) =>
    ipcRenderer.send("sendFrameAction", payload),

  sendLinkAndDownloadMp4: (payload: dashUrl) =>
    ipcRenderer.invoke("sendLink", payload),

  startDownload: (args: {
    video_url: string;
    audio_url: string;
    filePath: string;
  }) => ipcRenderer.invoke("start_download", args),

  onDownloadProgress: (callback: (progress: number) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, progress: number) => callback(progress);
    ipcRenderer.on("download-progress", listener);
    return () => ipcRenderer.removeListener("download-progress", listener);
  },

  setVideoFolder: () => ipcRenderer.invoke("setVideoFolder"),

  openPage: (payload: url) =>
    ipcRenderer.send("urlPage", payload),

  checkFileExist: (payload: filePathExist) =>
    ipcRenderer.invoke("filePath", payload),

  sendSuccessInfo: (payload: downloadSuccess) =>
    ipcRenderer.send("sendSuccessInfo", payload),

  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => callback(...args);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },

  setSettings: (payload: Settings) =>
    ipcRenderer.send("setSettings", payload),

  loadSettings: () => ipcRenderer.invoke("loadSettings"),

  openDevTools: () => ipcRenderer.invoke("openDevTools", true),

  fetchCollection: (bvid: string) =>
    ipcRenderer.invoke("fetchCollection", bvid),

  fetchBangumiEpisodes: (epId: number) =>
    ipcRenderer.invoke("fetchBangumiEpisodes", epId),

  enqueueBulk: (tasks: DownloadTask[]) =>
    ipcRenderer.send("enqueueBulk", tasks),

  enqueueSingle: (task: DownloadTask) =>
    ipcRenderer.send("enqueueSingle", task),

  cancelDownload: (taskId: number) =>
    ipcRenderer.send("cancelDownload", taskId),

  clearQueue: () =>
    ipcRenderer.send("clearQueue"),

  getQueue: () =>
    ipcRenderer.invoke("getQueue"),

  onQueueUpdated: (callback: (queue: DownloadTask[]) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, queue: DownloadTask[]) => callback(queue);
    ipcRenderer.on("queue-updated", listener);
    return () => ipcRenderer.removeListener("queue-updated", listener);
  },

  removeTask: (taskId: number) =>
    ipcRenderer.send("removeTask", taskId),

  onBackgroundModeChange: (callback: (isBackgroundMode: boolean) => void) => {
    const enterListener = () => callback(true);
    const leaveListener = () => callback(false);
    ipcRenderer.on("app:enter-background-mode", enterListener);
    ipcRenderer.on("app:leave-background-mode", leaveListener);
    return () => {
      ipcRenderer.removeListener("app:enter-background-mode", enterListener);
      ipcRenderer.removeListener("app:leave-background-mode", leaveListener);
    };
  },
});

contextBridge.exposeInMainWorld("biliApi", {
  getQr: () => ipcRenderer.invoke("getQr"),
  pollQRCodeStatus: (payload: qrcode_key) =>
    ipcRenderer.invoke("poll_qrcode_status", payload),
  checkLogin: () => ipcRenderer.invoke("check_login"),
  getUserInfo: () => ipcRenderer.invoke("getUserInfo"),
  logOut: () => ipcRenderer.invoke("logOut"),
});
