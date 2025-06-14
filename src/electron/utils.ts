import axios from "axios";
import { BrowserWindow, dialog, ipcMain } from "electron";
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
        const response = await axios.get(url);

        if (response.data.code !== 0) {
            throw new Error(`API 请求失败，code: ${response.data.code}`);
        }

        const cid = response.data.data[0].cid || null;

        return cid;
    } catch (error) {
        console.error('获取 cid 失败:', error);
        throw error;
  }
}

// 用户标头
const headers = {
  'User-Agent': 'Mozilla/5.0',
  'Referer': 'https://www.bilibili.com',
  'Cookie': 'SESSDATA=d4f6abe0%2C1765342225%2C4d5e4%2A62CjDCcPPUNsV74lr5E4XcRoFjG4nrDdaITIm52-joc99aoI65gOWdrGNWKvfhF_fu1aASVlgxZTZ5RnBsTmJ5MzIwWW9FZVlPMGthR3hpU1NfeHNlN0NkNGZ3V1dST3hoRXVIcUJNMEJaZmE2NUdVSU9pNVNPNTdtRm1rU3VhSzJiMGxFeEwwdWl3IIEC',
};

export async function getPlayUrl(bvid: bvid, cid: cid): Promise<string> {
  try {
    const api = `https://api.bilibili.com/x/player/playurl?bvid=${bvid}&cid=${cid}&qn=80&fnval=0&otype=json`;
    const response = await axios.get(api, { headers });

    if (response.data.code !== 0) {
      throw new Error(`请求失败 code=${response.data.code}`);
    }

    const url = response.data.data.durl[0].url;
    const result = url.replace('\\u002f', '&');
    return result;
  } catch (err) {
    console.error('❌ 获取视频直链失败:', err);
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

export function registerVideoDownloader(win: BrowserWindow) {
  ipcMain.handle('start_download', async (_e, { url, filePath }) => {
    try {
      const head = await axios.head(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Referer': 'https://www.bilibili.com/',
        },
      });

      const totalSize = parseInt(head.headers['content-length'] || '0', 10);
      if (!head.headers['accept-ranges']?.includes('bytes')) {
        throw new Error('服务器不支持 Range 多线程下载');
      }

      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bili-download-'));
      const partSize = Math.ceil(totalSize / THREAD_COUNT);

      let downloaded = 0;

      const downloadPart = async (start: number, end: number, index: number) => {
        const response = await axios.get(url, {
          headers: {
            'Range': `bytes=${start}-${end}`,
            'User-Agent': 'Mozilla/5.0',
            'Referer': 'https://www.bilibili.com/',
          },
          responseType: 'stream',
        });

        const partPath = path.join(tempDir, `part_${index}`);
        const writer = fs.createWriteStream(partPath);

        return new Promise<void>((resolve, reject) => {
          response.data.on('data', (chunk: Buffer) => {
            downloaded += chunk.length;
            const progress = totalSize > 0 ? downloaded / totalSize : 0;
            win.webContents.send('download-progress', progress);
          });

          response.data.on('error', reject);
          writer.on('error', reject);
          writer.on('finish', resolve);

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

      for (let i = 0; i < THREAD_COUNT; i++) {
        const partPath = path.join(tempDir, `part_${i}`);
        const data = fs.readFileSync(partPath);
        writeStream.write(data);
        fs.unlinkSync(partPath);
      }

      writeStream.end();

      // ✅ 确保完全写入并关闭句柄后通知完成
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
    }
  });
}
