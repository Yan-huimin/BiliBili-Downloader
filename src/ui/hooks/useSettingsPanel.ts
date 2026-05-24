import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_DOWNLOAD_PATH,
  DEFAULT_USER_INFO,
  useSettingsStore,
} from '../stores/settingsStore';

export function useSettingsPanel(visible: boolean, setMainPageStatus: () => void) {
  const {
    cachedUserInfo,
    loadSettings,
    loadUserInfo,
    resetUserInfo,
    saveSettings: saveSettingsCache,
    settings,
  } = useSettingsStore();

  const [loginStatus, setLoginStatus] = useState(cachedUserInfo?.loginStatus ?? false);
  const [userInfo, setUserInfo] = useState(cachedUserInfo?.userInfo ?? DEFAULT_USER_INFO);
  const [selectedQuality, setSelectedQuality] = useState<number | null>(settings?.videoQuality ?? 64);
  const [systemNotification, setSystemNotification] = useState(settings?.systemNotification ?? false);
  const [fireworkParticles, setFireworkParticles] = useState(settings?.fireworkParticles ?? false);
  const [defaultDownloadPath, setDefaultDownloadPath] = useState(settings?.downloadPath ?? DEFAULT_DOWNLOAD_PATH);

  const handleFolderSelect = useCallback(async () => {
    const path = await window.electron.setVideoFolder();
    setDefaultDownloadPath(path);
  }, []);

  const handleLogout = useCallback(async () => {
    await window.biliApi.logOut();
    resetUserInfo();
    setLoginStatus(false);
    setMainPageStatus();
    setUserInfo(DEFAULT_USER_INFO);
  }, [resetUserInfo, setMainPageStatus]);

  const saveSettings = useCallback(() => {
    saveSettingsCache({
      videoQuality: selectedQuality,
      downloadPath: defaultDownloadPath,
      systemNotification,
      fireworkParticles,
    });
  }, [defaultDownloadPath, fireworkParticles, saveSettingsCache, selectedQuality, systemNotification]);

  useEffect(() => {
    if (!visible) return;

    void loadSettings();
    void loadUserInfo();
  }, [loadSettings, loadUserInfo, visible]);

  useEffect(() => {
    if (!settings) return;

    setSelectedQuality(settings.videoQuality);
    setDefaultDownloadPath(settings.downloadPath);
    setSystemNotification(settings.systemNotification ?? false);
    setFireworkParticles(settings.fireworkParticles ?? false);
  }, [settings]);

  useEffect(() => {
    if (!cachedUserInfo) return;

    setLoginStatus(cachedUserInfo.loginStatus);
    setUserInfo(cachedUserInfo.userInfo);
  }, [cachedUserInfo]);

  return {
    defaultDownloadPath,
    fireworkParticles,
    handleFolderSelect,
    handleLogout,
    loginStatus,
    saveSettings,
    selectedQuality,
    setFireworkParticles,
    setSelectedQuality,
    setSystemNotification,
    systemNotification,
    userInfo,
  };
}
