import { useCallback, useEffect, useState } from 'react';

type UserInfoState = {
  head: string;
  uname: string;
  vip: boolean;
};

const DEFAULT_DOWNLOAD_PATH = 'C:\\Users\\Username\\Downloads';
const DEFAULT_USER_INFO: UserInfoState = {
  head: 'null',
  uname: '未登录',
  vip: false,
};

export function useSettingsPanel(visible: boolean, setMainPageStatus: () => void) {
  const [loginStatus, setLoginStatus] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfoState>(DEFAULT_USER_INFO);
  const [selectedQuality, setSelectedQuality] = useState<number | null>(64);
  const [systemNotification, setSystemNotification] = useState(false);
  const [fireworkParticles, setFireworkParticles] = useState(false);
  const [defaultDownloadPath, setDefaultDownloadPath] = useState(DEFAULT_DOWNLOAD_PATH);

  const loadSettings = useCallback(async () => {
    const settings = await window.electron.loadSettings();
    console.log(settings);
    setSelectedQuality(settings.videoQuality);
    setDefaultDownloadPath(settings.downloadPath);
    setSystemNotification(settings.systemNotification);
    setFireworkParticles(settings.fireworkParticles);
  }, []);

  const fetchUserInfo = useCallback(async () => {
    const info = await window.biliApi.getUserInfo();
    setLoginStatus(info.isLogin);
    setUserInfo({
      head: info.face,
      uname: info.uname,
      vip: info.vipStatus === 1,
    });
  }, []);

  const handleFolderSelect = useCallback(async () => {
    const path = await window.electron.setVideoFolder();
    setDefaultDownloadPath(path);
  }, []);

  const handleLogout = useCallback(async () => {
    await window.biliApi.logOut();
    setLoginStatus(false);
    setMainPageStatus();
    setUserInfo(DEFAULT_USER_INFO);
  }, [setMainPageStatus]);

  const saveSettings = useCallback(() => {
    window.electron.setSettings({
      videoQuality: selectedQuality,
      downloadPath: defaultDownloadPath,
      systemNotification,
      fireworkParticles,
    });
  }, [defaultDownloadPath, fireworkParticles, selectedQuality, systemNotification]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (visible) {
      void fetchUserInfo();
    }
  }, [fetchUserInfo, visible]);

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
