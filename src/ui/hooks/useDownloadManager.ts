import confetti from 'canvas-confetti';
import { useCallback, useEffect, useRef, useState } from 'react';
import { validateShareLink } from '../utils/shareLinkValidator';
import { useAppRuntimeStore } from '../stores/useAppRuntimeStore';
import { markQueueNeedsRefresh, setCachedQueue } from '../stores/queueStore';
import { useSettingsStore } from '../stores/settingsStore';
import { recordDownloadHistory } from '../utils/downloadHistory';

type AlertHandler = (message: string) => void;

function hasDownloadApi() {
  const runtimeWindow = window as unknown as {
    biliApi?: Partial<Window['biliApi']>;
    electron?: Partial<Window['electron']>;
  };

  return Boolean(
    runtimeWindow.electron?.checkFileExist &&
      runtimeWindow.biliApi?.checkLogin &&
      runtimeWindow.electron?.onDownloadProgress &&
      runtimeWindow.electron?.on &&
      runtimeWindow.electron?.sendSuccessInfo &&
      runtimeWindow.electron?.startDownload &&
      runtimeWindow.electron?.sendLinkAndDownloadMp4 &&
      runtimeWindow.electron?.openPage &&
      runtimeWindow.electron?.setVideoFolder &&
      runtimeWindow.electron?.loadSettings,
  );
}

export function useDownloadManager(showAlertMessage: AlertHandler) {
  const [shareLink, setShareLink] = useState('');
  const [savePath, setSavePath] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [currentDownloadTitle, setCurrentDownloadTitle] = useState('');
  const [loginStatus, setLoginStatus] = useState(false);
  const fireworkParticlesRef = useRef(false);
  const systemNotificationRef = useRef(false);

  const { isBackgroundMode } = useAppRuntimeStore();
  const { loadSettings, settings } = useSettingsStore();
  const isBackgroundModeRef = useRef(false);
  const latestQueueRef = useRef<DownloadTask[]>([]);

  const applyQueueState = useCallback((queue: DownloadTask[]) => {
    latestQueueRef.current = queue;
    setCachedQueue(queue);

    const downloadingTask = queue.find((t) => t.status === 'downloading');
    if (downloadingTask) {
      setDownloadProgress(downloadingTask.progress);
      setCurrentDownloadTitle(downloadingTask.title);
      setIsDownloading(true);
      return;
    }

    const hasPending = queue.some((t) => t.status === 'waiting');
    setIsDownloading(hasPending);
    if (!hasPending) {
      setDownloadProgress(0);
      setCurrentDownloadTitle('');
    }
  }, []);

  // 保持 ref 与 state 同步，供 IPC 回调中检查
  useEffect(() => {
    isBackgroundModeRef.current = isBackgroundMode;
  }, [isBackgroundMode]);

  // 离开后台模式时恢复 UI 状态
  useEffect(() => {
    if (isBackgroundMode || !window.electron?.getQueue) return;

    let mounted = true;
    window.electron.getQueue().then((queue) => {
      if (mounted) {
        applyQueueState(queue);
      }
    });

    return () => {
      mounted = false;
    };
  }, [applyQueueState, isBackgroundMode]);

  const handleFolderSelect = useCallback(async () => {
    try {
      const path = await window.electron.setVideoFolder();
      setSavePath(path);
    } catch {
      showAlertMessage('用户取消选择文件夹');
    }
  }, [showAlertMessage]);

  const handleDownload = useCallback(async () => {
    if (!shareLink.trim()) {
      showAlertMessage('请输入分享链接');
      return;
    }

    if (!savePath.trim()) {
      showAlertMessage('请输入保存地址');
      return;
    }

    const validation = validateShareLink(shareLink);
    if (!validation.valid) {
      showAlertMessage(validation.error);
      return;
    }
    if (validation.type !== 'bv') {
      showAlertMessage('单集下载仅支持BV号，ep号请使用番剧功能');
      return;
    }

    const bvid = validation.id as string;

    setIsDownloading(true);
    setDownloadProgress(0);

    window.electron.enqueueSingle({
      id: 0,
      bvid,
      title: shareLink,
      duration: 0,
      progress: 0,
      status: 'waiting',
      filePath: savePath,
    });

    void recordDownloadHistory({
      bvid,
      shareLink: shareLink.trim(),
      type: 'video',
    });

    showAlertMessage('已添加到下载队列');
  }, [savePath, shareLink, showAlertMessage]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (!settings) return;

    if (settings.downloadPath) {
      setSavePath(settings.downloadPath);
    }
    if (settings.fireworkParticles !== undefined) {
      fireworkParticlesRef.current = settings.fireworkParticles;
    }
    if (settings.systemNotification !== undefined) {
      systemNotificationRef.current = settings.systemNotification;
    }
  }, [settings]);

  useEffect(() => {
    if (isBackgroundMode) {
      markQueueNeedsRefresh();
    }
  }, [isBackgroundMode]);

  useEffect(() => {
    if (!hasDownloadApi()) {
      console.warn('electron API not available');
      return;
    }

    let mounted = true;
    window.biliApi.checkLogin().then((isLoggedIn) => {
      if (mounted) {
        setLoginStatus(isLoggedIn);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hasDownloadApi() || isBackgroundMode) {
      return;
    }

    const offDownloadProgress = window.electron.onDownloadProgress((percent) => {
      setDownloadProgress(percent * 100);
    });

    const offQueueUpdated = window.electron.onQueueUpdated((queue: DownloadTask[]) => {
      applyQueueState(queue);
    });

    const offDownloadComplete = window.electron.on('download-complete', (filePath: string) => {
      setDownloadProgress(0);

      if (isBackgroundModeRef.current) return;

      showAlertMessage('下载完成');

      if (systemNotificationRef.current) {
        window.electron.sendSuccessInfo({
          types: '下载成功',
          message: `文件已下载到: ${filePath}`,
        });
      }

      if (fireworkParticlesRef.current) {
        confetti({
          particleCount: 150,
          spread: 30,
          origin: { y: 0.8 },
        });
      }
    });

    const offDownloadError = window.electron.on('download-error', (message: string) => {
      console.log(message);
      if (isBackgroundModeRef.current) return;
      showAlertMessage(`下载失败:${message}`);
      setDownloadProgress(0);
    });

    return () => {
      offDownloadProgress();
      offQueueUpdated();
      offDownloadComplete();
      offDownloadError();
    };
  }, [applyQueueState, isBackgroundMode, showAlertMessage]);

  return {
    currentDownloadTitle,
    downloadProgress,
    handleDownload,
    handleFolderSelect,
    isDownloading,
    loginStatus,
    savePath,
    setLoginStatus,
    setSavePath,
    setShareLink,
    shareLink,
  };
}
