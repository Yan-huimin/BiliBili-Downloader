import axios from "axios";
import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { client } from "./bilibiliClient.js";
import fs from 'fs';
import path from "path";
import os from 'os';

export function isDev(): boolean {
 return process.env.NODE_ENV === 'development';
}

// 从链接中提取出视频的BV号
export function extractBV(url: url): url | null {
  const match = url.match(/BV([a-zA-Z0-9]+)/);
  return match ? `BV${match[1]}` : null;
}

export async function getCid(bid: bvid): Promise<cid | null> {
    try {
        const url = `https://api.bilibili.com/x/player/pagelist?bvid=${bid}`;
        const response = await client.get(url);

        if (response.data.code !== 0) {
            throw new Error(`API request error, code: ${response.data.code}`);
        }

        const cid = response.data.data[0].cid || null;

        return cid;
    } catch (error) {
        console.error('get cid fail:', error);
        throw error;
  }
}

// 用户标头
const headers = {
  'User-Agent': 'Mozilla/5.0',
  'Referer': 'https://www.bilibili.com',
  'Origin': 'https://www.bilibili.com',
};

export async function getPlayUrl(bvid: bvid, cid: cid): Promise<string> {
  try {
    const api = `https://api.bilibili.com/x/player/playurl?bvid=${bvid}&cid=${cid}&qn=116&fnval=80&otype=json`;
    const response = await client.get(api);

    if (response.data.code !== 0) {
      throw new Error(`request error, code=${response.data.code}`);
    }

    const dashVideos = response.data.data.dash?.video;
    const durlVideos = response.data.data.durl;

    let url = '';

    if (dashVideos && dashVideos.length > 0) {
      url = dashVideos[0].baseUrl;
    } else if (durlVideos && durlVideos.length > 0) {
      url = durlVideos[0].url;
    }

    const result = url.replace('\\u002f', '&');
    return result;
  } catch (err) {
    console.error('get video direct link fail:', err);
    throw err;
  }
}

export async function setSaveFolder(){

  const result = await dialog.showOpenDialog({
    title: '选择保存文件夹',
    properties: ['openDirectory'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
}

const THREAD_COUNT = 4;

// 全局变量用于管理退出时清理资源
let activeStreams: fs.WriteStream[] = [];
let currentWriteStream: fs.WriteStream | null = null;

export function registerVideoDownloader(win: BrowserWindow) {
  ipcMain.handle('start_download', async (_e, { url, filePath }) => {
    try {
        const head = await client.head(url, {
        headers: {
          'User-Agent': headers['User-Agent'],
          'Referer': headers['Referer'],
          'Origin': headers['Origin'],
        }
      });

      const totalSize = parseInt(head.headers['content-length'] || '0', 10);
      if (!head.headers['accept-ranges']?.includes('bytes')) {
        throw new Error('server does not support Range multi-threaded download');
      }

      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bili-download-'));
      const partSize = Math.ceil(totalSize / THREAD_COUNT);
      let downloaded = 0;

      const downloadPart = async (start: number, end: number, index: number) => {
        const response = await client.get(url, {
          headers: {
            'Range': `bytes=${start}-${end}`,
            'User-Agent': headers['User-Agent'],
            'Referer': headers['Referer'],
            'Origin': headers['Origin'],
          },
          responseType: 'stream',
        });

        const partPath = path.join(tempDir, `part_${index}`);
        const writer = fs.createWriteStream(partPath);
        activeStreams.push(writer); // 加入活跃写入列表

        return new Promise<void>((resolve, reject) => {
          response.data.on('data', (chunk: Buffer) => {
            downloaded += chunk.length;
            const progress = totalSize > 0 ? downloaded / totalSize : 0;
            win.webContents.send('download-progress', progress);
          });

          response.data.on('error', (err: Error) => {
            win.webContents.send('download-error', '下载失败: ' + err.message);
            reject(err);
          });

          writer.on('error', (err: Error) => {
            win.webContents.send('download-error', '写入文件失败: ' + err.message);
            reject(err);
          });

          writer.on('finish', () => {
            writer.close((err) => {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            });
          });

          response.data.pipe(writer);
        });
      };

      const tasks: Promise<void>[] = [];
      for (let i = 0; i < THREAD_COUNT; i++) {
        const start = i * partSize;
        const end = Math.min((i + 1) * partSize - 1, totalSize - 1);
        tasks.push(downloadPart(start, end, i));
      }

      await Promise.all(tasks);

      const finalPath = path.join(filePath, `video_${Date.now()}.mp4`);
      const writeStream = fs.createWriteStream(finalPath);
      currentWriteStream = writeStream;

      for (let i = 0; i < THREAD_COUNT; i++) {
        const partPath = path.join(tempDir, `part_${i}`);
        const data = fs.readFileSync(partPath);
        writeStream.write(data);
        fs.unlinkSync(partPath);
      }

      writeStream.end();

      writeStream.on('finish', () => {
        writeStream.close(() => {
          fs.rmdirSync(tempDir);
          win.webContents.send('download-complete', finalPath);
        });
      });

      writeStream.on('error', (err) => {
        fs.rmdirSync(tempDir, { recursive: true });
        win.webContents.send('download-error', '合并文件失败: ' + err.message);
      });

    } catch (err) {
      win.webContents.send('download-error', '下载失败: ' + (err as Error).message);
    } finally {
      // 清空流列表
      activeStreams = [];
      currentWriteStream = null;
    }
  });
}

// ✅ 应用退出时清理未关闭流
app.on('before-quit', () => {
  activeStreams.forEach((stream) => {
    if (!stream.destroyed) {
      stream.destroy();
    }
  });

  if (currentWriteStream && !currentWriteStream.destroyed) {
    currentWriteStream.destroy();
  }
});