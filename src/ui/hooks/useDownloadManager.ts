import confetti from 'canvas-confetti';
import { useCallback, useEffect, useRef, useState } from 'react';

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

  const startDownload = useCallback(async (link: dashUrl): Promise<boolean> => {
    if (isDownloading) {
      return false;
    }

    const fileExists = await window.electron.checkFileExist(savePath) === 'YES';

    if (!link.video_url || !fileExists) {
      showAlertMessage('下载失败,请检查文件路径或链接');
      setDownloadProgress(0);
      setIsDownloading(false);
      return false;
    }

    window.electron.startDownload({
      video_url: link.video_url,
      audio_url: link.audio_url,
      filePath: savePath,
    });

    return true;
  }, [isDownloading, savePath, showAlertMessage]);

  const handleDownload = useCallback(async () => {
    if (!shareLink.trim()) {
      showAlertMessage('请输入分享链接');
      return;
    }

    if (!savePath.trim()) {
      showAlertMessage('请输入保存地址');
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      const result = await window.electron.sendLinkAndDownloadMp4({
        video_url: shareLink,
        audio_url: '',
      });

      console.log(result);

      if (result === null) {
        showAlertMessage('下载失败...');
        setIsDownloading(false);
        setDownloadProgress(0);
        return;
      }

      await startDownload(result);
    } catch {
      showAlertMessage('下载失败...');
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  }, [savePath, shareLink, showAlertMessage, startDownload]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings, settingsRefreshKey]);

  useEffect(() => {
    if (!hasDownloadApi()) {
      console.warn('electron API not available');
      return;
    }

    window.biliApi.checkLogin().then((isLoggedIn) => {
      setLoginStatus(isLoggedIn);
    });

    window.electron.onDownloadProgress((percent) => {
      setDownloadProgress(percent * 100);
    });

    window.electron.on('download-complete', (filePath: string) => {
      showAlertMessage('下载完成');
      setIsDownloading(false);
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

    window.electron.on('download-error', (message: string) => {
      console.log(message);
      showAlertMessage(`下载失败:${message}`);
      setIsDownloading(false);
      setDownloadProgress(0);
    });
  }, [showAlertMessage]);

  return {
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
