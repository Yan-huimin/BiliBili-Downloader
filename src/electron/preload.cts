import { ipcRenderer } from "electron";

const electron = require('electron')

function ipcSend<Key extends keyof EventPayloadMapping>(
    key: Key,
    payload: EventPayloadMapping[Key]
  ) {
    electron.ipcRenderer.send(key, payload);
}

function ipcInvoke<Key extends keyof EventPayloadMapping>(
    key: Key,
  ): Promise<EventPayloadMapping[Key]> {
    return electron.ipcRenderer.invoke(key);
}

function ipcInvoke_1<Key extends keyof EventPayloadMapping>(
    key: Key,
    payload: EventPayloadMapping[Key]
  ): Promise<EventPayloadMapping[Key]> {
    return electron.ipcRenderer.invoke(key, payload);
}

electron.contextBridge.exposeInMainWorld(
  "electron",
  {
    sendFrameAction: (payload: FrameWindowAction) => ipcSend('sendFrameAction', payload),
    sendLinkAndDownloadMp4: (payload: url) => ipcInvoke_1('sendLink', payload),
    startDownload: (args: { url: string; filePath: string }) => ipcInvoke_1('start_download', args),
    onDownloadProgress: (callback: (progress: number) => void) =>
      electron.ipcRenderer.on('download-progress', (_e: Electron.IpcRendererEvent, progress: number) => callback(progress)),
    setVideoFolder: () => ipcInvoke('setVideoFolder'),
    openPage: (payload: url) => ipcSend('urlPage', payload),
    checkFileExist: (payload: filePathExist) => ipcInvoke_1('filePath', payload),
    on: (channel, callback) => {
      ipcRenderer.on(channel, (_event, ...args) => callback(...args));
    },
  } satisfies Window["electron"] & {
    on: (channel: string, callback: (...args: any[]) => void) => void;
  }
);