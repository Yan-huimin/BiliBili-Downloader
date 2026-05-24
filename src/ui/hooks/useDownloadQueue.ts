import { useCallback, useEffect, useRef, useState } from "react";
import { useAppRuntimeStore } from "../stores/useAppRuntimeStore";
import {
  getCachedQueue,
  hasQueueCache,
  setCachedQueue,
  shouldRefreshQueue,
} from "../stores/queueStore";

export function useDownloadQueue(visible: boolean) {
  const [queue, setQueue] = useState<DownloadTask[]>(() => getCachedQueue());

  const { isBackgroundMode } = useAppRuntimeStore();
  const isBackgroundModeRef = useRef(false);
  const latestQueueRef = useRef<DownloadTask[]>([]);

  useEffect(() => {
    isBackgroundModeRef.current = isBackgroundMode;
  }, [isBackgroundMode]);

  // 离开后台模式时恢复队列状态
  useEffect(() => {
    if (isBackgroundMode || !visible) return;

    if (hasQueueCache()) {
      setQueue(getCachedQueue());
    }

    if (!shouldRefreshQueue()) {
      return;
    }

    let mounted = true;
    window.electron.getQueue().then((currentQueue) => {
      if (mounted) {
        setCachedQueue(currentQueue);
        setQueue(currentQueue);
      }
    });

    return () => {
      mounted = false;
    };
  }, [isBackgroundMode, visible]);

  useEffect(() => {
    if (!visible || isBackgroundMode) return;

    const offQueueUpdated = window.electron.onQueueUpdated((updatedQueue) => {
      latestQueueRef.current = updatedQueue;
      setCachedQueue(updatedQueue);
      setQueue([...updatedQueue]);
    });

    return offQueueUpdated;
  }, [isBackgroundMode, visible]);

  const handleCancel = useCallback((taskId: number) => {
    window.electron.cancelDownload(taskId);
  }, []);

  const handleRetry = useCallback((task: DownloadTask) => {
    window.electron.removeTask(task.id);
    window.electron.enqueueSingle({
      id: 0,
      bvid: task.bvid,
      title: task.title,
      duration: task.duration,
      progress: 0,
      status: "waiting",
      filePath: task.filePath,
    });
  }, []);

  const handleClear = useCallback(() => {
    window.electron.clearQueue();
    setCachedQueue([]);
    setQueue([]);
  }, []);

  return {
    queue,
    handleCancel,
    handleRetry,
    handleClear,
  };
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}
