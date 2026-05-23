import { useCallback, useEffect, useState } from "react";

export function useDownloadQueue(visible: boolean) {
  const [queue, setQueue] = useState<DownloadTask[]>([]);

  useEffect(() => {
    window.electron.getQueue().then(setQueue);
  }, [visible]);

  useEffect(() => {
    const offQueueUpdated = window.electron.onQueueUpdated((updatedQueue) => {
      setQueue([...updatedQueue]);
    });

    return offQueueUpdated;
  }, []);

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
