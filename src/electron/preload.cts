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

  onDownloadProgress: (callback: (progress: number) => void) =>
    ipcRenderer.on("download-progress", (_e, progress) =>
      callback(progress)
    ),

  setVideoFolder: () => ipcRenderer.invoke("setVideoFolder"),

  openPage: (payload: url) =>
    ipcRenderer.send("urlPage", payload),

  checkFileExist: (payload: filePathExist) =>
    ipcRenderer.invoke("filePath", payload),

  sendSuccessInfo: (payload: downloadSuccess) =>
    ipcRenderer.send("sendSuccessInfo", payload),

  on: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.on(channel, (_event, ...args) => callback(...args));
  },

  setSettings: (payload: Settings) =>
    ipcRenderer.send("setSettings", payload),

  loadSettings: () => ipcRenderer.invoke("loadSettings"),

  openDevTools: () => ipcRenderer.invoke("openDevTools", true),
});

contextBridge.exposeInMainWorld("biliApi", {
  getQr: () => ipcRenderer.invoke("getQr"),
  pollQRCodeStatus: (payload: qrcode_key) =>
    ipcRenderer.invoke("poll_qrcode_status", payload),
  checkLogin: () => ipcRenderer.invoke("check_login"),
  getUserInfo: () => ipcRenderer.invoke("getUserInfo"),
  logOut: () => ipcRenderer.invoke("logOut"),
});
