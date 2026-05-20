import { app, BrowserWindow, dialog, ipcMain, session } from "electron";
import { client, jar } from "./bilibiliClient.js";
import {
  clearBiliLoginCookies,
  clearCookieJar,
  clearCookiesFile as clearStoredCookiesFile,
  clearElectronCookies as clearStoredElectronCookies,
  ensureCookiesFile,
  getBiliCookieString as readBiliCookieString,
  loadCookies as loadStoredCookies,
  saveCookies as saveStoredCookies,
} from "./cookieStore.js";
import fs from 'fs';
import path from "path";
import os from 'os';
import { getDefaultVideoPath, getFfmpegPath, getSettingsPath } from "./pathResolver.js";
import type { CookieJar } from "tough-cookie";
import { spawn } from "child_process";

/**
 * 判断当前是否处于开发模式。
 * @returns NODE_ENV 为 'development' 时返回 true。
 */
export function isDev(): boolean {
 return process.env.NODE_ENV === 'development';
}

/**
 * 从视频链接中提取 BV 号。
 * Bilibili BV 号以 "BV" 开头，后跟字母数字组合。
 * @param url - 包含 BV 号的完整 URL 或字符串。
 * @returns 提取到的 BV 号字符串（如 "BV1xx411c7mD"），未找到时返回 null。
 */
export function extractBV(url: url): url | null {
  const match = url.match(/BV([a-zA-Z0-9]+)/);
  return match ? `BV${match[1]}` : null;
}

/**
 * 从本地文件读取并解析用户设置。
 * @returns 反序列化后的 Settings 对象。
 */
function getSettings() {
    ensureExistSettingsFile();
    const data = fs.readFileSync(getSettingsPath(), 'utf-8');
    return JSON.parse(data) as Settings;
}

/**
 * 根据 BV 号查询视频的分 P 列表，获取第一个分 P 的 cid。
 * cid 是 Bilibili 视频播放页面的唯一标识符，用于获取播放流地址。
 * @param bid - 视频的 BV 号。
 * @returns 第一个分 P 的 cid 数值，请求失败或无数据时返回 null。
 */
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

type BiliDashMedia = {
  id?: number;
  bandwidth?: number;
  baseUrl?: string;
  base_url?: string;
};

type BiliDash = {
  video: BiliDashMedia[];
  audio?: BiliDashMedia[];
};

/**
 * 根据 BV 号和 cid 获取视频的 DASH 播放流地址。
 * 根据设置中选择的画质，向 Bilibili API 请求对应清晰度的视频流和音频流地址。
 * 低画质（qn <= 32）时使用 durl 模式（音视频合一的 MP4），高画质时使用 DASH 分离流。
 * @param bvid - 视频的 BV 号。
 * @param cid - 视频分 P 的 cid。
 * @returns 包含 video_url 和 audio_url 的对象，低画质时两者相同，失败时两个字段均为空字符串。
 */
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

    const dash = response.data.data.dash as BiliDash | undefined;
    if (!dash) throw new Error('no dash data returned');

    // 视频轨道：按清晰度选择
    let videoUrl = '';
    const targetVideo = dash.video.find((v) => v.id === videoQuality);
    if (targetVideo) {
      videoUrl = targetVideo.baseUrl ?? targetVideo.base_url ?? '';
    } else {
      const fallbackVideo = dash.video[0];
      videoUrl = fallbackVideo?.baseUrl ?? fallbackVideo?.base_url ?? '';
    }

    // 音频轨道：一般 dash.audio 里有多个，选码率最高的
    let audioUrl = '';
    if (dash.audio && dash.audio.length > 0) {
      const bestAudio = dash.audio.reduce((a, b) =>
        ((a.bandwidth ?? 0) > (b.bandwidth ?? 0) ? a : b)
      );
      audioUrl = bestAudio.baseUrl ?? bestAudio.base_url ?? '';
    }

    const result_video = videoUrl.replace('\\u002f', '/');
    const result_audio = audioUrl.replace('\\u002f', '/');
    return { video_url: result_video, audio_url: result_audio };
  } catch (err) {
    console.error('get video direct link fail:', err);
    throw err;
  }
}

/**
 * 打开系统文件夹选择对话框，让用户选择视频下载保存目录。
 * @returns 用户选择的文件夹路径字符串，用户取消选择时返回 null。
 */
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

/**
 * 通用文件下载函数，支持单线程和多线程分片下载。
 * 小文件（≤5MB）直接单线程下载；大文件优先尝试多线程 Range 分片下载，
 * 若服务器不支持 Range 则降级为单线程。
 * 多线程下载时会将文件分片写入临时目录，然后合并为完整文件。
 * @param url - 要下载文件的 URL。
 * @param targetPath - 下载完成后保存文件的完整路径。
 * @param win - 当前主窗口 BrowserWindow 实例，用于向渲染进程推送下载进度。
 */
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
    } catch {
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

/**
 * 注册视频下载的 IPC handler（start_download 通道）。
 * 处理视频/音频的下载、合并流程：
 * - 若视频和音频 URL 相同（低画质），直接下载单个文件。
 * - 若不同（高画质 DASH），分别下载视频流和音频流后调用 ffmpeg 合并。
 * - 下载完成后通过 webContents.send 通知渲染进程。
 * @param win - 当前主窗口 BrowserWindow 实例。
 */
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


/**
 * 确保 Bilibili Cookie 持久化文件存在，不存在则用当前 jar 的状态初始化。
 */
export async function ensureExistCookiesFile() {
  await ensureCookiesFile(jar);
}

/**
 * 将当前内存 CookieJar 的状态持久化到本地文件。
 */
export async function saveCookies() {
  await saveStoredCookies(jar);
}

/**
 * 从本地文件加载 Cookie 并反序列化为新的 CookieJar。
 * @returns 包含已存储 Cookie 的 CookieJar 实例，失败时返回 null。
 */
export async function loadCookies(): Promise<CookieJar | null> {
  return loadStoredCookies();
}

// export function registerReferFromBili() {
//     session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
//     if (details.url.includes("i0.hdslb.com") || details.url.includes("i1.hdslb.com")) {
//       details.requestHeaders["Referer"] = "https://www.bilibili.com/";
//     }
//     callback({ requestHeaders: details.requestHeaders });
//   });
// }

/**
 * 为 Electron session 注册 Bilibili 图片域名的请求头拦截。
 * 自动为 i0.hdslb.com 和 i1.hdslb.com 的请求添加 Referer 和 User-Agent 头，
 * 以绕过 Bilibili 的防盗链限制。
 * @param targetSession - 要注册拦截的 Electron Session，默认为 defaultSession。
 */
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
/**
 * 清空本地 Cookie 持久化文件中的内容（写入空 Cookie 数组）。
 */
export async function clearCookiesFile() {
  await clearStoredCookiesFile(jar);
}

// 清空 CookieJar（内存）
/**
 * 清空内存 CookieJar 中的所有 Cookie。
 */
export function clearJar() {
  clearCookieJar(jar);
}

// 清空 Electron session cookies
/**
 * 清除 Electron 默认会话中所有存储的 Cookie。
 */
export async function clearElectronCookies() {
  await clearStoredElectronCookies();
}

// ---------------- 统一退出登录 ----------------
/**
 * 统一退出 Bilibili 登录：清除内存、文件和 Electron 会话中的所有 Cookie。
 */
export async function logout() {
  await clearBiliLoginCookies(jar);
}

/**
 * 检查本地设置文件是否存在。
 * @returns 文件存在返回 true，否则返回 false。
 */
function isExistSettingsFile(): boolean{
    return fs.existsSync(getSettingsPath());
}

/**
 * 确保本地设置文件存在。
 * 若文件不存在，则用默认设置（画质 64、默认视频路径、关闭通知和特效）创建一个新文件。
 */
export async function ensureExistSettingsFile() {
    if(!isExistSettingsFile()){
        const defaultSettings: Settings = {
            videoQuality: 64,
            downloadPath: getDefaultVideoPath(),
            systemNotification: false,
            fireworkParticles: false,
        };
        fs.writeFileSync(getSettingsPath(), JSON.stringify(defaultSettings, null, 2), 'utf-8');
    }
}

/**
 * 获取当前 CookieJar 中适用于 Bilibili API 的 Cookie 字符串。
 * @returns Cookie 键值对字符串，如 "SESSDATA=xxx; bili_jct=yyy"。
 */
export async function getBiliCookieString() {
  return readBiliCookieString(jar);
}
