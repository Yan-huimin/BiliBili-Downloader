import confetti from 'canvas-confetti';
import { useCallback, useEffect, useRef, useState } from 'react';
import { validateShareLink } from '../utils/shareLinkValidator';

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

export function useDownloadManager(showAlertMessage: AlertHandler, settingsRefreshKey: boolean) {
  const [shareLink, setShareLink] = useState('');
  const [savePath, setSavePath] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [currentDownloadTitle, setCurrentDownloadTitle] = useState('');
  const [loginStatus, setLoginStatus] = useState(false);
  const fireworkParticlesRef = useRef(false);
  const systemNotificationRef = useRef(false);

  const loadSettings = useCallback(async () => {
    if (!window.electron?.loadSettings) {
      console.warn('electron API not available, skip loadSettings');
      return;
    }

    const settings = await window.electron.loadSettings();
    console.log('设置：' + JSON.stringify(settings));

    if (settings.downloadPath) {
      setSavePath(settings.downloadPath);
    }
    if (settings.fireworkParticles !== undefined) {
      fireworkParticlesRef.current = settings.fireworkParticles;
    }
    if (settings.systemNotification !== undefined) {
      systemNotificationRef.current = settings.systemNotification;
    }
  }, []);

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

    showAlertMessage('已添加到下载队列');
  }, [savePath, shareLink, showAlertMessage]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings, settingsRefreshKey]);

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

    const offDownloadProgress = window.electron.onDownloadProgress((percent) => {
      setDownloadProgress(percent * 100);
    });

    const offQueueUpdated = window.electron.onQueueUpdated((queue: DownloadTask[]) => {
      const downloadingTask = queue.find((t) => t.status === 'downloading');
      if (downloadingTask) {
        setDownloadProgress(downloadingTask.progress);
        setCurrentDownloadTitle(downloadingTask.title);
        setIsDownloading(true);
      } else {
        const hasPending = queue.some((t) => t.status === 'waiting');
        setIsDownloading(hasPending);
        if (!hasPending) {
          setDownloadProgress(0);
          setCurrentDownloadTitle('');
        }
      }
    });

    const offDownloadComplete = window.electron.on('download-complete', (filePath: string) => {
      showAlertMessage('下载完成');
      setDownloadProgress(0);

      if (systemNotificationRef.current) {
        console.log('发送系统通知');
        window.electron.sendSuccessInfo({
          types: '下载成功',
          message: `文件已下载到: ${filePath}`,
        });
      } else {
        console.log('未启用系统通知');
      }

      if (fireworkParticlesRef.current) {
        console.log('播放彩带特效');
        confetti({
          particleCount: 150,
          spread: 30,
          origin: { y: 0.8 },
        });
      } else {
        console.log('未启用彩带特效');
      }
    });

    const offDownloadError = window.electron.on('download-error', (message: string) => {
      console.log(message);
      showAlertMessage(`下载失败:${message}`);
      setDownloadProgress(0);
    });

    return () => {
      mounted = false;
      offDownloadProgress();
      offQueueUpdated();
      offDownloadComplete();
      offDownloadError();
    };
  }, [showAlertMessage]);

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
