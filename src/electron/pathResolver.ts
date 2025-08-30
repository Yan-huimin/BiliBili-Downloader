import path from 'path';
import { app } from 'electron';
import { isDev } from './utils.js';
import ffmpegPath from 'ffmpeg-static';

export function getUiPath(){
    return path.join(app.getAppPath(), "/dist-react/index.html");
}

export function getPreloadPath(){
    return path.join(
        app.getAppPath(),
        isDev() ? '.' : '..',
        '/dist-electron/preload.cjs'
    );
}

export function getFfmpegPath(){
    return isDev() ? (ffmpegPath as unknown as string) : path.join(
      process.resourcesPath,
      "app.asar.unpacked",
      "node_modules",
      "ffmpeg-static",
      "ffmpeg.exe"
    );
}

export function getDefaultVideoPath() {
    const videoPath = app.getPath('videos');
    return videoPath;
}

export function getCookiesPath() {
    return path.join(app.getPath('userData'), 'biliCookies.json');
}

export function getSettingsPath() {
    return path.join(app.getPath('userData'), 'Settings.json');
}