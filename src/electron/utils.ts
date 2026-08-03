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
import { access } from 'node:fs/promises';
import path from "path";
import os from 'os';
import { getDefaultVideoPath, getFfmpegPath, getSettingsPath } from "./pathResolver.js";
import type { CookieJar } from "tough-cookie";
import { spawn } from "child_process";
import { pipeline } from "stream/promises";
import { constants } from "node:fs";
import { rm } from "node:fs/promises";

const ffmpegPath = getFfmpegPath();
const THREAD_COUNT = 4;
const PROGRESS_EMIT_INTERVAL_MS = 250;
const STDERR_LIMIT = 64 * 1024;

let activeStreams: fs.WriteStream[] = [];
let currentWriteStream: fs.WriteStream | null = null;

// Track temporary download artifacts for cleanup on app exit.
let tempDirs: string[] = [];
let pendingFiles: string[] = [];

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

function createProgressReporter(onProgress?: (progress: number) => void) {
  let lastEmitAt = 0;
  let latestProgress = 0;

  const emit = (progress: number, force = false) => {
    if (!onProgress) return;

    const normalizedProgress = Math.max(0, Math.min(1, progress));
    latestProgress = Math.max(latestProgress, normalizedProgress);

    const now = Date.now();
    if (force || now - lastEmitAt >= PROGRESS_EMIT_INTERVAL_MS) {
      lastEmitAt = now;
      onProgress(latestProgress);
    }
  };

  return {
    update(progress: number) {
      emit(progress);
    },
    flush(progress = latestProgress) {
      emit(progress, true);
    },
  };
}

function forgetActiveStream(stream: fs.WriteStream) {
  activeStreams = activeStreams.filter((item) => item !== stream);
  if (currentWriteStream === stream) {
    currentWriteStream = null;
  }
}

function forgetPendingFile(filePath: string) {
  pendingFiles = pendingFiles.filter((item) => item !== filePath);
}

function forgetTempDir(dir: string) {
  tempDirs = tempDirs.filter((item) => item !== dir);
}

function forgetPendingFilesInDir(dir: string) {
  const prefix = dir.endsWith(path.sep) ? dir : `${dir}${path.sep}`;
  pendingFiles = pendingFiles.filter((item) => !item.startsWith(prefix));
}

function safeUnlink(filePath: string) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // Best-effort cleanup; Windows may still hold the file briefly.
  }
}

async function writeStreamToFile(
  source: NodeJS.ReadableStream,
  targetPath: string,
) {
  const writer = fs.createWriteStream(targetPath);
  activeStreams.push(writer);
  currentWriteStream = writer;

  try {
    await pipeline(source, writer);
  } finally {
    forgetActiveStream(writer);
  }
}

async function finishWriteStream(stream: fs.WriteStream) {
  await new Promise<void>((resolve, reject) => {
    stream.once("finish", resolve);
    stream.once("error", reject);
    stream.end();
  });
}

function createLinkedAbortController(signal?: AbortSignal) {
  const controller = new AbortController();
  const onAbort = () => controller.abort();

  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener("abort", onAbort, { once: true });
    }
  }

  return {
    signal: controller.signal,
    abort: () => controller.abort(),
    dispose: () => signal?.removeEventListener("abort", onAbort),
  };
}

async function downloadSingleStream(
  url: string,
  targetPath: string,
  totalSize: number,
  onProgress: ((progress: number) => void) | undefined,
  signal: AbortSignal,
) {
  const response = await client.get(url, {
    headers: {
      "User-Agent": headers["User-Agent"],
      Referer: headers["Referer"],
    },
    responseType: "stream",
    signal,
  });

  const responseSize = parseInt(response.headers["content-length"] || "0", 10);
  const expectedSize = totalSize > 0 ? totalSize : responseSize;
  let downloaded = 0;
  const reporter = createProgressReporter(onProgress);

  response.data.on("data", (chunk: Buffer) => {
    downloaded += chunk.length;
    reporter.update(expectedSize > 0 ? downloaded / expectedSize : 0.01);
  });

  pendingFiles.push(targetPath);
  try {
    await writeStreamToFile(response.data, targetPath);
    reporter.flush(1);
  } catch (err) {
    safeUnlink(targetPath);
    throw err;
  } finally {
    forgetPendingFile(targetPath);
  }
}



/**
 * Downloads a file with range streams when possible, then falls back to a single streamed write.
 * @param url - File URL.
 * @param targetPath - Final path on disk.
 * @param onProgress - Optional progress callback, from 0 to 1.
 * @param signal - Optional abort signal used to cancel the download.
 */
export async function downloadFile(
  url: string,
  targetPath: string,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal,
) {
  const linkedAbort = createLinkedAbortController(signal);
  const requestSignal = linkedAbort.signal;

  try {
    let totalSize = 0;
    let supportsRanges = false;

    try {
      const head = await client.head(url, {
        headers: {
          "User-Agent": headers["User-Agent"],
          Referer: headers["Referer"],
        },
        signal: requestSignal,
      });

      totalSize = parseInt(head.headers["content-length"] || "0", 10);
      supportsRanges = String(head.headers["accept-ranges"] || "").includes("bytes");
    } catch (err) {
      console.warn("HEAD request failed, falling back to a single streamed download:", err);
      await downloadSingleStream(url, targetPath, 0, onProgress, requestSignal);
      return;
    }

    if (totalSize <= 5 * 1024 * 1024 || !supportsRanges) {
      await downloadSingleStream(url, targetPath, totalSize, onProgress, requestSignal);
      return;
    }

    const partSize = Math.ceil(totalSize / THREAD_COUNT);
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "bili-download-"));
    tempDirs.push(tempDir);
    let downloaded = 0;
    const reporter = createProgressReporter(onProgress);

    const downloadPart = async (start: number, end: number, index: number) => {
      const response = await client.get(url, {
        headers: {
          Range: `bytes=${start}-${end}`,
          "User-Agent": headers["User-Agent"],
          Referer: headers["Referer"],
        },
        responseType: "stream",
        signal: requestSignal,
      });

      const partPath = path.join(tempDir, `part_${index}`);
      pendingFiles.push(partPath);

      response.data.on("data", (chunk: Buffer) => {
        downloaded += chunk.length;
        reporter.update(downloaded / totalSize);
      });

      await writeStreamToFile(response.data, partPath);
    };

    try {
      const tasks: Promise<void>[] = [];
      for (let i = 0; i < THREAD_COUNT; i++) {
        const start = i * partSize;
        const end = Math.min((i + 1) * partSize - 1, totalSize - 1);
        tasks.push(downloadPart(start, end, i));
      }
      const results = await Promise.allSettled(
        tasks.map((task) =>
          task.catch((err) => {
            linkedAbort.abort();
            throw err;
          }),
        ),
      );
      const failedTask = results.find(
        (result): result is PromiseRejectedResult => result.status === "rejected",
      );
      if (failedTask) {
        throw failedTask.reason;
      }

      pendingFiles.push(targetPath);
      const writeStream = fs.createWriteStream(targetPath);
      activeStreams.push(writeStream);
      currentWriteStream = writeStream;

      try {
        for (let i = 0; i < THREAD_COUNT; i++) {
          const partPath = path.join(tempDir, `part_${i}`);
          const readStream = fs.createReadStream(partPath);
          await pipeline(readStream, writeStream, { end: false });
          safeUnlink(partPath);
          forgetPendingFile(partPath);
        }

        await finishWriteStream(writeStream);
      } finally {
        forgetActiveStream(writeStream);
        forgetPendingFile(targetPath);
      }

      fs.rmSync(tempDir, { recursive: true, force: true });
      forgetPendingFilesInDir(tempDir);
      forgetTempDir(tempDir);
      reporter.flush(1);
    } catch (err) {
      linkedAbort.abort();
      safeUnlink(targetPath);
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup failures.
      }
      forgetPendingFilesInDir(tempDir);
      forgetPendingFile(targetPath);
      forgetTempDir(tempDir);
      throw err;
    }
  } finally {
    linkedAbort.dispose();
  }
}

/**
 * 确保输出路径具有 `.mp4` 文件扩展名。
 *
 * 如果传入路径没有扩展名，则自动追加 `.mp4`；
 * 如果传入路径已有扩展名但不是 `.mp4`，则抛出错误，避免 ffmpeg 输出格式不明确。
 *
 * @param outputPath - 原始输出文件路径。
 *
 * @returns 处理后的 MP4 输出路径。
 *
 * @throws 当输出路径已有扩展名但不是 `.mp4` 时抛出错误。
 */
function ensureMp4Path(outputPath: string) {
  const ext = path.extname(outputPath).toLowerCase();

  if (!ext) {
    return `${outputPath}.mp4`;
  }

  if (ext !== ".mp4") {
    throw new Error(`输出文件必须是 .mp4 格式，当前为: ${ext}`);
  }

  return outputPath;
}



/**
 * 使用 ffmpeg 将 B 站下载得到的 m4s 视频流和音频流合并为一个 MP4 文件。
 *
 * 该函数通过调用本地 ffmpeg 可执行文件完成音视频封装，
 * 不进行重新编码，仅使用 `-c copy` 复制原始音视频流，因此速度较快且不会损失画质。
 *
 * @param videoPath - 视频 m4s 文件的完整路径。
 * @param audioPath - 音频 m4s 文件的完整路径。
 * @param outputPath - 合并完成后输出文件的完整路径，建议以 `.mp4` 结尾。
 * @param signal - 可选，AbortSignal 用于取消 ffmpeg 合并任务。
 *
 * @returns 合并成功时返回 Promise<void>。
 *
 * @throws 当未找到 ffmpeg 可执行文件时抛出错误。
 * @throws 当 ffmpeg 执行失败或被取消时抛出错误。
 */
export async function mergeWithFfmpeg(
  videoPath: string,
  audioPath: string,
  outputPath: string,
  signal?: AbortSignal,
): Promise<void> {
  // 必须在创建子进程之前检查。
  if (signal?.aborted) {
    throw new Error("ffmpeg 合并任务已取消");
  }

  const executablePath = getFfmpegPath();
  const finalOutputPath = ensureMp4Path(outputPath);

  // Windows 只检查文件存在性；
  // Linux/macOS 同时检查执行权限。
  await access(
    executablePath,
    process.platform === "win32"
      ? constants.F_OK
      : constants.X_OK,
  ).catch(() => {
    throw new Error(`未找到或无法执行 FFmpeg: ${executablePath}`);
  });

  const args = [
    "-hide_banner",
    "-loglevel", "error",
    "-nostats",

    "-y",
    "-nostdin",

    "-i", videoPath,
    "-i", audioPath,

    "-map", "0:v:0",
    "-map", "1:a:0",

    "-c:v", "copy",
    "-c:a", "copy",

    "-movflags", "+faststart",
    "-f", "mp4",

    finalOutputPath,
  ];

  return new Promise<void>((resolve, reject) => {
    let stderrTail = "";
    let aborted = false;
    let settled = false;
    let forceKillTimer: NodeJS.Timeout | undefined;

    const ff = spawn(executablePath, args, {
      shell: false,
      windowsHide: true,

      // 不使用 stdin 和 stdout，只读取错误输出。
      stdio: ["ignore", "ignore", "pipe"],
    });

    const cleanupListener = (): void => {
      signal?.removeEventListener("abort", onAbort);

      if (forceKillTimer) {
        clearTimeout(forceKillTimer);
        forceKillTimer = undefined;
      }
    };

    const cleanupOutput = async (): Promise<void> => {
      await rm(finalOutputPath, {
        force: true,
      }).catch(() => {
        // 文件仍被系统短暂占用时忽略。
      });
    };

    const rejectOnce = async (error: Error): Promise<void> => {
      if (settled) {
        return;
      }

      settled = true;
      cleanupListener();
      await cleanupOutput();
      reject(error);
    };

    const resolveOnce = (): void => {
      if (settled) {
        return;
      }

      settled = true;
      cleanupListener();
      resolve();
    };

    const onAbort = (): void => {
      if (settled || aborted) {
        return;
      }

      aborted = true;

      if (ff.exitCode !== null || ff.signalCode !== null) {
        return;
      }

      // Linux/macOS 下先发送 SIGTERM，允许进程正常退出。
      // Windows 下 Node.js 会直接终止该进程。
      ff.kill("SIGTERM");

      // 防止 Unix 平台上的进程忽略 SIGTERM。
      forceKillTimer = setTimeout(() => {
        if (ff.exitCode === null && ff.signalCode === null) {
          ff.kill("SIGKILL");
        }
      }, 1500);

      forceKillTimer.unref();
    };

    signal?.addEventListener("abort", onAbort, {
      once: true,
    });

    ff.stderr?.on("data", (data: Buffer) => {
      // 只保留最后 64 KiB，不再无限增长。
      stderrTail = (
        stderrTail + data.toString("utf8")
      ).slice(-STDERR_LIMIT);
    });

    ff.once("error", (error) => {
      void rejectOnce(
        aborted
          ? new Error("ffmpeg 合并任务已取消")
          : new Error(`无法启动 FFmpeg：${error.message}`),
      );
    });

    ff.once("close", (code, terminationSignal) => {
      if (aborted) {
        void rejectOnce(
          new Error("ffmpeg 合并任务已取消"),
        );
        return;
      }

      if (code === 0) {
        resolveOnce();
        return;
      }

      const details = stderrTail.trim()
        ? `\n\n${stderrTail.trim()}`
        : "";

      void rejectOnce(
        new Error(
          `ffmpeg 合并失败，退出码：${code ?? "unknown"}，` +
          `终止信号：${terminationSignal ?? "none"}` +
          details,
        ),
      );
    });
  });
}

/**
 * 注册视频下载的 IPC handler（start_download 通道）。
 * 现在通过下载队列统一管理，单个下载也会加入队列。
 * @param win - 当前主窗口 BrowserWindow 实例。
 */
export function registerVideoDownloader(win: BrowserWindow) {
  ipcMain.handle("start_download", async (_e, { video_url, audio_url, filePath }) => {
    try {
      const finalPath = path.join(filePath, `video_${Date.now()}.mp4`);

      if (video_url === audio_url) {
        await downloadFile(
          video_url,
          finalPath,
          (progress) => {
            if (!win.isDestroyed() && !win.webContents.isDestroyed()) {
              win.webContents.send("download-progress", progress);
            }
          }
        );
        win.webContents.send("download-complete", finalPath);
        return;
      }

      const taskSuffix = Date.now();
      const videoPath = path.join(filePath, `video_${taskSuffix}.m4s`);
      const audioPath = path.join(filePath, `audio_${taskSuffix}.m4s`);

      await downloadFile(
        video_url,
        videoPath,
        (progress) => {
          if (!win.isDestroyed() && !win.webContents.isDestroyed()) {
            win.webContents.send("download-progress", progress);
          }
        }
      );
      console.log("video downloaded");

      await downloadFile(audio_url, audioPath);
      console.log("audio downloaded");

      await mergeWithFfmpeg(videoPath, audioPath, finalPath);

      fs.unlinkSync(videoPath);
      fs.unlinkSync(audioPath);

      win.webContents.send("download-complete", finalPath);
    } catch (err) {
      win.webContents.send("download-error", "下载失败: " + (err as Error).message);
    }
  });
}


// 应用退出时清理未关闭流 & 临时文件
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
