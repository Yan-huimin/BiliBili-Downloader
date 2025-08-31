import { app, BrowserWindow, dialog, ipcMain, session, shell } from "electron";
import { client, jar } from "./bilibiliClient.js";
import fs from 'fs';
import path from "path";
import os from 'os';
import { getCookiesPath, getDefaultVideoPath, getFfmpegPath, getSettingsPath } from "./pathResolver.js";
import { promisify } from "util";
import { CookieJar } from "tough-cookie";
import { spawn } from "child_process";
import _ffmpegPath from "ffmpeg-static";

export function isDev(): boolean {
 return process.env.NODE_ENV === 'development';
}

// 从链接中提取出视频的BV号
export function extractBV(url: url): url | null {
  const match = url.match(/BV([a-zA-Z0-9]+)/);
  return match ? `BV${match[1]}` : null;
}

function getSettings() {
    ensureExistSettingsFile();
    const data = fs.readFileSync(getSettingsPath(), 'utf-8');
    return JSON.parse(data) as Settings;
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

export async function getPlayUrl(bvid: bvid, cid: cid): Promise<dashUrl> {
  try {
    const { videoQuality, downloadPath } = getSettings();

    const qn = videoQuality; // 例如 6、32、64、80、112、116、120
    const fnval = qn! <= 32 ? 0 : 80; 
    const fourk = qn === 120 ? 1 : 0;

    console.log('Settings:', { videoQuality, downloadPath });
    const api = `https://api.bilibili.com/x/player/playurl?bvid=${bvid}&cid=${cid}&qn=${qn}&fnval=${fnval}&fourk=${fourk}&otype=json`;
    console.log('Requesting play URL from API:', api);

    const response = await client.get(api);
    console.log(response.data);

    if (response.data.code !== 0) {
      throw new Error(`request error, code=${response.data.code}`);
    }

    // 低清晰度（360p/480p）走 durl
    if (qn! <= 32 && response.data.data.durl && response.data.data.durl.length > 0) {
      const url = response.data.data.durl[0].url.replace('\\u002f', '/');
      console.log('Using durl for low quality video:', url);
      return { video_url: url, audio_url: url }; // durl 是 MP4 已经整合音视频
    }

    const dash = response.data.data.dash;
    if (!dash) throw new Error('no dash data returned');

    // 视频轨道：按清晰度选择
    let videoUrl = '';
    const targetVideo = dash.video.find((v: any) => v.id === videoQuality);
    if (targetVideo) {
      videoUrl = targetVideo.baseUrl || targetVideo.base_url;
    } else {
      videoUrl = dash.video[0].baseUrl || dash.video[0].base_url; // fallback
    }

    // 音频轨道：一般 dash.audio 里有多个，选码率最高的
    let audioUrl = '';
    if (dash.audio && dash.audio.length > 0) {
      const bestAudio = dash.audio.reduce((a: any, b: any) =>
        (a.bandwidth > b.bandwidth ? a : b)
      );
      audioUrl = bestAudio.baseUrl || bestAudio.base_url;
    }

    const result_video = videoUrl.replace('\\u002f', '/');
    const result_audio = audioUrl.replace('\\u002f', '/');
    return { video_url: result_video, audio_url: result_audio };
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

// export function registerVideoDownloader(win: BrowserWindow) {
//   ipcMain.handle('start_download', async (_e, { video_url, audio_url, filePath }) => {
//     try {
//         const head = await client.head(video_url, {
//         headers: {
//           'User-Agent': headers['User-Agent'],
//           'Referer': headers['Referer'],
//           'Origin': headers['Origin'],
//         }
//       });

//       const totalSize = parseInt(head.headers['content-length'] || '0', 10);
//       if (!head.headers['accept-ranges']?.includes('bytes')) {
//         throw new Error('server does not support Range multi-threaded download');
//       }

//       const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bili-download-'));
//       const partSize = Math.ceil(totalSize / THREAD_COUNT);
//       let downloaded = 0;

//       const downloadPart = async (start: number, end: number, index: number) => {
//         const response = await client.get(video_url, {
//           headers: {
//             'Range': `bytes=${start}-${end}`,
//             'User-Agent': headers['User-Agent'],
//             'Referer': headers['Referer'],
//             'Origin': headers['Origin'],
//           },
//           responseType: 'stream',
//         });

//         const partPath = path.join(tempDir, `part_${index}`);
//         const writer = fs.createWriteStream(partPath);
//         activeStreams.push(writer); // 加入活跃写入列表

//         return new Promise<void>((resolve, reject) => {
//           response.data.on('data', (chunk: Buffer) => {
//             downloaded += chunk.length;
//             const progress = totalSize > 0 ? downloaded / totalSize : 0;
//             win.webContents.send('download-progress', progress);
//           });

//           response.data.on('error', (err: Error) => {
//             win.webContents.send('download-error', '下载失败: ' + err.message);
//             reject(err);
//           });

//           writer.on('error', (err: Error) => {
//             win.webContents.send('download-error', '写入文件失败: ' + err.message);
//             reject(err);
//           });

//           writer.on('finish', () => {
//             writer.close((err) => {
//               if (err) {
//                 reject(err);
//               } else {
//                 resolve();
//               }
//             });
//           });

//           response.data.pipe(writer);
//         });
//       };

//       const tasks: Promise<void>[] = [];
//       for (let i = 0; i < THREAD_COUNT; i++) {
//         const start = i * partSize;
//         const end = Math.min((i + 1) * partSize - 1, totalSize - 1);
//         tasks.push(downloadPart(start, end, i));
//       }

//       await Promise.all(tasks);

//       const finalPath = path.join(filePath, `video_${Date.now()}.mp4`);
//       const writeStream = fs.createWriteStream(finalPath);
//       currentWriteStream = writeStream;

//       for (let i = 0; i < THREAD_COUNT; i++) {
//         const partPath = path.join(tempDir, `part_${i}`);
//         const data = fs.readFileSync(partPath);
//         writeStream.write(data);
//         fs.unlinkSync(partPath);
//       }

//       writeStream.end();

//       writeStream.on('finish', () => {
//         writeStream.close(() => {
//           fs.rmdirSync(tempDir);
//           win.webContents.send('download-complete', finalPath);
//         });
//       });

//       writeStream.on('error', (err) => {
//         fs.rmdirSync(tempDir, { recursive: true });
//         win.webContents.send('download-error', '合并文件失败: ' + err.message);
//       });

//     } catch (err) {
//       win.webContents.send('download-error', '下载失败: ' + (err as Error).message);
//     } finally {
//       // 清空流列表
//       activeStreams = [];
//       currentWriteStream = null;
//     }
//   });
// }

// 通用下载函数，支持 video/audio
// 修改后的 downloadFile
async function downloadFile(url: string, targetPath: string, win: BrowserWindow) {
  const head = await client.head(url, {
    headers: {
      'User-Agent': headers['User-Agent'],
      'Referer': headers['Referer'],
    }
  });

  const totalSize = parseInt(head.headers['content-length'] || '0', 10);

  // 🔥 如果文件小于等于 5MB，直接单线程下载（适合音频）
  if (totalSize <= 5 * 1024 * 1024) {
    const resp = await client.get(url, {
      headers: {
        'User-Agent': headers['User-Agent'],
        'Referer': headers['Referer'],
      },
      responseType: 'arraybuffer',
    });
    fs.writeFileSync(targetPath, resp.data);
    return;
  }

  // 🔥 否则走原来的多线程下载逻辑
    try {
      if (!head.headers['accept-ranges']?.includes('bytes')) {
        throw new Error('server does not support Range');
      }
    } catch (e) {
      // 如果下载失败，就走单线程，降级为单线程下载
      const resp = await client.get(url, {
        headers: {
          'User-Agent': headers['User-Agent'],
          'Referer': headers['Referer'],
        },
        responseType: 'arraybuffer',
      });
      fs.writeFileSync(targetPath, resp.data);
      return;
    }

  const partSize = Math.ceil(totalSize / THREAD_COUNT);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bili-download-'));
  tempDirs.push(tempDir); // ✅ 记录临时目录
  let downloaded = 0;

  const downloadPart = async (start: number, end: number, index: number) => {
    const response = await client.get(url, {
      headers: {
        'Range': `bytes=${start}-${end}`,
        'User-Agent': headers['User-Agent'],
        'Referer': headers['Referer'],
      },
      responseType: 'stream',
    });

    const partPath = path.join(tempDir, `part_${index}`);
    const writer = fs.createWriteStream(partPath);
    activeStreams.push(writer); // ✅ 记录流
    pendingFiles.push(partPath);

    return new Promise<void>((resolve, reject) => {
      response.data.on('data', (chunk: Buffer) => {
        downloaded += chunk.length;
        const progress = totalSize > 0 ? downloaded / totalSize : 0;

        if (!win.isDestroyed() && !win.webContents.isDestroyed()) {
          win.webContents.send('download-progress', progress);
        }
      });

      writer.on('error', reject);
      writer.on('finish', () => resolve());
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

  // 合并分片
  // 合并分片（流式写入，避免内存爆掉）
  const writeStream = fs.createWriteStream(targetPath);
  currentWriteStream = writeStream;

  for (let i = 0; i < THREAD_COUNT; i++) {
    const partPath = path.join(tempDir, `part_${i}`);
    await new Promise<void>((resolve, reject) => {
      const readStream = fs.createReadStream(partPath);
      readStream.on("error", reject);
      readStream.on("end", () => {
        fs.unlinkSync(partPath);  // 删除分片
        resolve();
      });
      readStream.pipe(writeStream, { end: false }); // 不要关闭主写流
    });
  }

  writeStream.end();
  fs.rmdirSync(tempDir);
}


// 666
const ffmpegPath: string = getFfmpegPath();

// 注册下载逻辑
export function registerVideoDownloader(win: BrowserWindow) {
  ipcMain.handle("start_download", async (_e, { video_url, audio_url, filePath }) => {
    try {
      const finalPath = path.join(filePath, `video_${Date.now()}.mp4`);

      // 如果视频和音频 URL 相同，只下载一次
      if (video_url === audio_url) {
        await downloadFile(video_url, finalPath, win);
        win.webContents.send("download-complete", finalPath);
        return;
      }

      const videoPath = path.join(filePath, "video.m4s");
      const audioPath = path.join(filePath, "audio.m4s");

      // 1. 下载视频和音频
      await downloadFile(video_url, videoPath, win);
      console.log("video downloaded");
      const audioResp = await client.get(audio_url, {
        headers: {
          'User-Agent': headers['User-Agent'],
          'Referer': headers['Referer'],
        },
        responseType: 'arraybuffer',
      });
      fs.writeFileSync(audioPath, audioResp.data);
      console.log("audio downloaded");

      // 2. 调用 ffmpeg 合并
      await new Promise<void>((resolve, reject) => {
        if (!ffmpegPath) {
          return reject(new Error("未找到 ffmpeg 可执行文件"));
        }

        console.log(ffmpegPath);

        const ff = spawn(ffmpegPath, [
          "-i", videoPath,
          "-i", audioPath,
          "-c:v", "copy",
          "-c:a", "aac",
          finalPath
        ], { shell: true });

        ff.stderr.on("data", (data) => {
          console.log("ffmpeg:", data.toString());
        });

        ff.on("error", reject);

        ff.on("close", (code) => {
          if (code === 0) resolve();
          else reject(new Error(`ffmpeg exited with code ${code}`));
        });
      });

      // 3. 删除临时文件
      fs.unlinkSync(videoPath);
      fs.unlinkSync(audioPath);

      win.webContents.send("download-complete", finalPath);
    } catch (err) {
      win.webContents.send("download-error", "下载失败: " + (err as Error).message);
    }
  });
}


let activeStreams: fs.WriteStream[] = [];
let currentWriteStream: fs.WriteStream | null = null;

// 记录下载时的临时目录和未完成文件
let tempDirs: string[] = [];
let pendingFiles: string[] = [];

// ✅ 应用退出时清理未关闭流 & 临时文件
app.on('before-quit', () => {
  // 1. 清理活跃写入流
  activeStreams.forEach((stream) => {
    if (!stream.destroyed) {
      try { stream.destroy(); } catch (e) {
        console.error('关闭写入流失败:', e);
      }
    }
  });

  if (currentWriteStream && !currentWriteStream.destroyed) {
    try { currentWriteStream.destroy(); } catch (e) {
      console.error('关闭主写入流失败:', e);
    }
  }

  // 2. 清理下载时创建的临时目录
  tempDirs.forEach((dir) => {
    if (fs.existsSync(dir)) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
        console.log('已清理临时目录:', dir);
      } catch (e) {
        console.error('清理临时目录失败:', e);
      }
    }
  });

  // 3. 清理未完成的临时文件
  pendingFiles.forEach((file) => {
    if (fs.existsSync(file)) {
      try {
        fs.unlinkSync(file);
        console.log('已删除未完成文件:', file);
      } catch (e) {
        console.error('删除文件失败:', e);
      }
    }
  });

  // 4. 清空记录，避免内存泄漏
  activeStreams = [];
  currentWriteStream = null;
  tempDirs = [];
  pendingFiles = [];
});


function isExistCookiesFile(): boolean{
    return fs.existsSync(getCookiesPath());
}

export async function ensureExistCookiesFile() {
    if(!isExistCookiesFile()){
        const serialized = await promisify(jar.serialize.bind(jar))();
        fs.writeFileSync(getCookiesPath(), JSON.stringify(serialized, null, 2), 'utf-8');
    }
}

export async function saveCookies() {
  const serialized = await jar.serialize();
  fs.writeFileSync(getCookiesPath(), JSON.stringify(serialized, null, 2), 'utf-8');
}

export async function loadCookies(): Promise<CookieJar | null> {
  const path = getCookiesPath();
  if (!fs.existsSync(path)) return null;

  const data = JSON.parse(fs.readFileSync(path, 'utf-8'));
  // 使用静态方法反序列化
  const jar = CookieJar.deserialize(data);
  return jar;
}

// export function registerReferFromBili() {
//     session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
//     if (details.url.includes("i0.hdslb.com") || details.url.includes("i1.hdslb.com")) {
//       details.requestHeaders["Referer"] = "https://www.bilibili.com/";
//     }
//     callback({ requestHeaders: details.requestHeaders });
//   });
// }

export function registerBiliImageHeaders(targetSession?: Electron.Session) {
  const s = targetSession || session.defaultSession;

  // 白名单 URL，拦截 i0 / i1 域名
  const filter = {
    urls: [
      '*://i0.hdslb.com/*',
      '*://i1.hdslb.com/*'
    ]
  };

  s.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
    // 设置必需的请求头
    details.requestHeaders['Referer'] = 'https://www.bilibili.com/';
    details.requestHeaders['User-Agent'] = details.requestHeaders['User-Agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36';
    callback({ requestHeaders: details.requestHeaders });
  });
}

// 退出登录清空cookie
// ---------------- 清空操作 ----------------
// 清空 Cookie 文件内容（覆盖为空）
export async function clearCookiesFile() {
  const empty = await jar.serialize();
  empty.cookies = [];
  fs.writeFileSync(getCookiesPath(), JSON.stringify(empty, null, 2), "utf-8");
}

// 清空 CookieJar（内存）
export function clearJar() {
  jar.removeAllCookiesSync();
}

// 清空 Electron session cookies
export async function clearElectronCookies() {
  const ses = session.defaultSession;
  const allCookies = await ses.cookies.get({});

  for (const cookie of allCookies) {
    const domain = cookie.domain ?? "";
    const url = `${cookie.secure ? "https" : "http"}://${domain.startsWith(".") ? domain.slice(1) : domain}${cookie.path}`;
    try {
      await ses.cookies.remove(url, cookie.name);
    } catch (err) {
      console.error("Failed to remove cookie:", err);
    }
  }
}

// ---------------- 统一退出登录 ----------------
export async function logout() {
  clearJar();                // 1. 清空内存中的 cookie
  await clearCookiesFile();  // 2. 清空持久化文件
  await clearElectronCookies(); // 3. 清空 electron 的 session cookie
}

function isExistSettingsFile(): boolean{
    return fs.existsSync(getSettingsPath());
}

export async function ensureExistSettingsFile() {
    if(!isExistSettingsFile()){
        const defaultSettings: Settings = {
            videoQuality: 64,
            downloadPath: getDefaultVideoPath()
        };
        fs.writeFileSync(getSettingsPath(), JSON.stringify(defaultSettings, null, 2), 'utf-8');
    }
}