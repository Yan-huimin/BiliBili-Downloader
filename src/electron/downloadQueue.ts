import { BrowserWindow } from "electron";
import fs from "fs";
import path from "path";
import os from "os";
import { downloadFile, getCid, getPlayUrl, mergeWithFfmpeg } from "./utils.js";
import { updateTrayDownloadStatus } from "./tray.js";

const MAX_RETRIES = 3;
const DOWNLOAD_STALL_TIMEOUT_MS = 60_000;
const STALL_CHECK_INTERVAL_MS = 10_000;

let queue: DownloadTask[] = [];
let nextId = 1;
let isProcessing = false;
let currentAbortController: AbortController | null = null;

function canNotifyRenderer(win: BrowserWindow) {
  return !win.isDestroyed() && win.isVisible() && !win.webContents.isDestroyed();
}

function notifyQueue(win: BrowserWindow) {
  if (canNotifyRenderer(win)) {
    win.webContents.send("queue-updated", [...queue]);
  }

  // 同步下载状态到 Tray
  const downloadingTask = queue.find((t) => t.status === "downloading");
  if (downloadingTask) {
    updateTrayDownloadStatus({
      isDownloading: true,
      taskName: downloadingTask.title || downloadingTask.bvid,
      progress: downloadingTask.progress,
    });
  } else {
    const hasPending = queue.some((t) => t.status === "waiting");
    if (!hasPending) {
      updateTrayDownloadStatus({ isDownloading: false });
    }
  }
}

function safeUnlink(filePath: string) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // Best-effort cleanup; Windows may keep the handle alive briefly.
  }
}

function createStallWatch(
  task: DownloadTask,
  controller: AbortController,
  onStall: () => void,
) {
  let lastActivityAt = Date.now();

  const timer = setInterval(() => {
    if (
      task.status === "downloading" &&
      !controller.signal.aborted &&
      Date.now() - lastActivityAt >= DOWNLOAD_STALL_TIMEOUT_MS
    ) {
      onStall();
      controller.abort();
    }
  }, STALL_CHECK_INTERVAL_MS);

  return {
    report() {
      lastActivityAt = Date.now();
    },
    stop() {
      clearInterval(timer);
    },
  };
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
  const abortController = currentAbortController;
  notifyQueue(win);

  let stalled = false;
  const stallWatch = createStallWatch(task, abortController, () => {
    stalled = true;
  });

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
          stallWatch.report();
          task.progress = Math.round(progress * 100);
          notifyQueue(win);
        },
        abortController.signal,
      );
    } else {
      const tempSuffix = `${task.id}_${Date.now()}`;
      const videoPath = path.join(downloadDir, `video_${tempSuffix}.m4s`);
      const audioPath = path.join(downloadDir, `audio_${tempSuffix}.m4s`);

      await downloadFile(
        playUrl.video_url,
        videoPath,
        (progress) => {
          stallWatch.report();
          task.progress = Math.round(progress * 50);
          notifyQueue(win);
        },
        abortController.signal,
      );

      await downloadFile(
        playUrl.audio_url,
        audioPath,
        (progress) => {
          stallWatch.report();
          task.progress = 50 + Math.round(progress * 20);
          notifyQueue(win);
        },
        abortController.signal,
      );

      task.progress = 70;
      notifyQueue(win);
      stallWatch.stop();

      try {
        await mergeWithFfmpeg(videoPath, audioPath, finalPath, abortController.signal);
      } finally {
        safeUnlink(videoPath);
        safeUnlink(audioPath);
      }
    }

    if ((task as DownloadTask).status === "cancelled") {
      safeUnlink(finalPath);
    } else {
      task.status = "completed";
      task.progress = 100;
      notifyQueue(win);
      if (canNotifyRenderer(win)) {
        win.webContents.send("download-complete", finalPath);
      }
    }
  } catch (err) {
    if ((task as DownloadTask).status !== "cancelled") {
      const currentRetry = (task.retryCount ?? 0) + 1;
      task.retryCount = currentRetry;

      if (currentRetry < MAX_RETRIES) {
        task.status = "waiting";
        task.progress = 0;
        task.errorMessage = stalled
          ? `下载停滞，准备第 ${currentRetry} 次重试`
          : `第 ${currentRetry} 次重试: ${(err as Error).message}`;
        notifyQueue(win);
        if (canNotifyRenderer(win)) {
          win.webContents.send("download-error", task.errorMessage);
        }
      } else {
        task.status = "error";
        if (stalled) {
          task.errorMessage = "下载超时：进度长时间没有变化";
        } else {
          task.errorMessage = `已重试 ${currentRetry - 1} 次仍失败: ${(err as Error).message}`;
        }
        notifyQueue(win);
        if (canNotifyRenderer(win)) {
          win.webContents.send("download-error", "下载失败: " + (task.errorMessage ?? ""));
        }
      }
    }
  } finally {
    stallWatch.stop();
    currentAbortController = null;
    isProcessing = false;
    notifyQueue(win);
    processQueue(win);
  }
}
