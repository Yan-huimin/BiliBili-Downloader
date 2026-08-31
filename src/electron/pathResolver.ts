import path from 'path';
import { app } from 'electron';
import ffmpegPath from 'ffmpeg-static';

function isDev(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * 获取 React 前端入口 HTML 文件的绝对路径。
 * @returns 路径字符串，指向 dist-react/index.html。
 */
export function getUiPath(){
    return path.join(app.getAppPath(), "/dist-react/index.html");
}

/**
 * 获取 Electron preload 脚本的绝对路径。
 * 开发模式下从项目根目录获取，生产模式下从上级目录获取。
 * @returns preload.cjs 文件的绝对路径。
 */
export function getPreloadPath(){
    return path.join(
        app.getAppPath(),
        isDev() ? '.' : '..',
        '/dist-electron/preload.cjs'
    );
}

/**
 * 获取 FFmpeg 可执行文件的绝对路径。
 */
export function getFfmpegPath(): string {
  if (isDev()) {
    if (typeof ffmpegPath !== "string" || !ffmpegPath) {
      throw new Error("ffmpeg-static 未返回有效路径");
    }

    return ffmpegPath;
  }

  const executableName =
    process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";

  return path.join(
    process.resourcesPath,
    "app.asar.unpacked",
    "node_modules",
    "ffmpeg-static",
    executableName,
  );
}

/**
 * 获取操作系统默认的视频文件夹路径。
 * @returns 系统视频目录的绝对路径。
 */
export function getDefaultVideoPath() {
    const videoPath = app.getPath('videos');
    return videoPath;
}

/**
 * 获取 Bilibili Cookie 持久化文件的路径。
 * @returns 路径字符串，位于 Electron userData 目录下的 biliCookies.json。
 */
export function getCookiesPath() {
    return path.join(app.getPath('userData'), 'biliCookies.json');
}

/**
 * 获取应用设置持久化文件的路径。
 * @returns 路径字符串，位于 Electron userData 目录下的 Settings.json。
 */
export function getSettingsPath() {
    return path.join(app.getPath('userData'), 'Settings.json');
}

/** 获取下载历史记录持久化文件的路径。 */
export function getDownloadHistoryPath() {
    return path.join(app.getPath('userData'), 'downloadHistory.json');
}

/**
 * 获取应用图标路径，用于窗口、托盘和系统通知。
 * @returns icon.ico 的绝对路径。
 */
export function getAppIconPath() {
    return isDev()
      ? path.join(app.getAppPath(), "src/ui/assets/icon.ico")
      : path.join(process.resourcesPath, "icon.ico");
}
