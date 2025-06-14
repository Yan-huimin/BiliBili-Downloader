import path from 'path';
import { app } from 'electron';
import { isDev } from './utils.js';

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

export function getDefaultVideoPath() {
    const videoPath = app.getPath('videos');
    return videoPath;
}