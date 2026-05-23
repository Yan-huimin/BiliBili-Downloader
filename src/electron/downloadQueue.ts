import { BrowserWindow } from "electron";
import fs from "fs";
import path from "path";
import os from "os";
import { client } from "./bilibiliClient.js";
import { downloadFile, getCid, getPlayUrl, mergeWithFfmpeg } from "./utils.js";

const MAX_RETRIES = 3;

let queue: DownloadTask[] = [];
let nextId = 1;
let isProcessing = false;
let currentAbortController: AbortController | null = null;

const headers = {
  "User-Agent": "Mozilla/5.0",
  Referer: "https://www.bilibili.com",
  Origin: "https://www.bilibili.com",
};

function notifyQueue(win: BrowserWindow) {
  if (!win.isDestroyed() && !win.webContents.isDestroyed()) {
    win.webContents.send("queue-updated", [...queue]);
  }
}

export function enqueueBulk(tasks: DownloadTask[], win: BrowserWindow) {
  for (const task of tasks) {
    task.id = nextId++;
    task.status = "waiting";
    task.progress = 0;
    task.retryCount = 0;
    queue.push(task);
  }
  notifyQueue(win);
  processQueue(win);
}

export function enqueueOne(task: DownloadTask, win: BrowserWindow) {
  task.id = nextId++;
  task.status = "waiting";
  task.progress = 0;
  task.retryCount = 0;
  queue.push(task);
  notifyQueue(win);
  processQueue(win);
}

export function cancelDownload(taskId: number, win: BrowserWindow) {
  const task = queue.find((t) => t.id === taskId);
  if (!task) return;

  if (task.status === "waiting") {
    task.status = "cancelled";
    notifyQueue(win);
    processQueue(win);
  } else if (task.status === "downloading") {
    task.status = "cancelled";
    if (currentAbortController) {
      currentAbortController.abort();
    }
    notifyQueue(win);
    isProcessing = false;
    setTimeout(() => processQueue(win), 500);
  }
}

export function clearQueue(win: BrowserWindow) {
  if (currentAbortController) {
    currentAbortController.abort();
  }
  isProcessing = false;
  queue = [];
  notifyQueue(win);
}

export function removeTask(taskId: number, win: BrowserWindow) {
  queue = queue.filter((t) => t.id !== taskId);
  notifyQueue(win);
}

export function getQueue(): DownloadTask[] {
  return [...queue];
}

async function processQueue(win: BrowserWindow) {
  if (isProcessing) return;

  const task = queue.find((t) => t.status === "waiting");
  if (!task) return;

  isProcessing = true;
  task.status = "downloading";
  task.progress = 0;
  currentAbortController = new AbortController();
  notifyQueue(win);

  let stalled = false;
  const stallTimer = setTimeout(() => {
    if (task.status === "downloading" && task.progress === 0) {
      stalled = true;
      currentAbortController?.abort();
    }
  }, 20000);

  try {
    const cid = await getCid(task.bvid);
    if (!cid) throw new Error("获取 cid 失败");

    const playUrl = await getPlayUrl(task.bvid, cid);
    if (!playUrl.video_url) throw new Error("获取播放地址失败");

    const downloadDir = task.filePath || path.join(os.homedir(), "Videos");
    const safeTitle = (task.title || task.bvid).replace(/[<>:"/\\|?*]/g, "_");
    const finalPath = path.join(downloadDir, `${safeTitle}_${Date.now()}.mp4`);

    if (playUrl.video_url === playUrl.audio_url) {
      await downloadFile(
        playUrl.video_url,
        finalPath,
        (progress) => {
          task.progress = Math.round(progress * 100);
          notifyQueue(win);
        },
        currentAbortController.signal,
      );
    } else {
      const videoPath = path.join(downloadDir, "video.m4s");
      const audioPath = path.join(downloadDir, "audio.m4s");

      await downloadFile(
        playUrl.video_url,
        videoPath,
        (progress) => {
          task.progress = Math.round(progress * 50);
          notifyQueue(win);
        },
        currentAbortController.signal,
      );

      const audioResp = await client.get(playUrl.audio_url, {
        headers: {
          "User-Agent": headers["User-Agent"],
          Referer: headers["Referer"],
        },
        responseType: "arraybuffer",
        signal: currentAbortController.signal,
      });
      fs.writeFileSync(audioPath, audioResp.data);

      task.progress = 70;
      notifyQueue(win);

      await mergeWithFfmpeg(videoPath, audioPath, finalPath, currentAbortController.signal);

      try { fs.unlinkSync(videoPath); } catch {}
      try { fs.unlinkSync(audioPath); } catch {}
    }

    if ((task as DownloadTask).status === "cancelled") {
      try { fs.unlinkSync(finalPath); } catch {}
    } else {
      task.status = "completed";
      task.progress = 100;
      notifyQueue(win);
      if (!win.isDestroyed() && !win.webContents.isDestroyed()) {
        win.webContents.send("download-complete", finalPath);
      }
    }
  } catch (err) {
    if ((task as DownloadTask).status !== "cancelled") {
      const currentRetry = (task.retryCount ?? 0) + 1;
      task.retryCount = currentRetry;

      if (currentRetry < MAX_RETRIES && !stalled) {
        task.status = "waiting";
        task.progress = 0;
        task.errorMessage = `第 ${currentRetry} 次重试失败: ${(err as Error).message}`;
        notifyQueue(win);
        if (!win.isDestroyed() && !win.webContents.isDestroyed()) {
          win.webContents.send("download-error", task.errorMessage);
        }
      } else {
        task.status = "error";
        if (stalled) {
          task.errorMessage = "下载超时：进度长时间为0";
        } else {
          task.errorMessage = `已重试 ${currentRetry - 1} 次均失败: ${(err as Error).message}`;
        }
        notifyQueue(win);
        if (!win.isDestroyed() && !win.webContents.isDestroyed()) {
          win.webContents.send("download-error", "下载失败: " + (task.errorMessage ?? ""));
        }
      }
    }
  } finally {
    clearTimeout(stallTimer);
    currentAbortController = null;
    isProcessing = false;
    notifyQueue(win);
    processQueue(win);
  }
}
