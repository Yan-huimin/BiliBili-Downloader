import { useMemo, useState } from 'react';
import AlertToast from './components/AlertToast';
import DownloadPanel from './components/DownloadPanel';
import DownloadQueue from './components/DownloadQueue';
import FloatingActions from './components/FloatingActions';
import Header from './components/Header';
import LoginBili from './components/LoginBili';
import Settings from './components/Settings';
import VideoListPanel from './components/VideoListPanel';
import './css/App.css';
import { useCollection } from './hooks/useCollection';
import { useBangumi } from './hooks/useBangumi';
import { useDownloadManager } from './hooks/useDownloadManager';
import { useProductionGuards } from './hooks/useProductionGuards';
import { useTransientAlert } from './hooks/useTransientAlert';
import { getShareLinkType } from './utils/shareLinkValidator';
import { useBackgroundMode } from './hooks/useBackgroundMode';
import { useAppRuntimeStore } from './stores/useAppRuntimeStore';

function getStatusBadge(episodeStatus: BangumiEpisodeStatus): VideoListItem['statusBadge'] {
  switch (episodeStatus) {
    case 'free':
      return { text: '免费', bgColor: '#52c41a' };
    case 'limited_free':
      return { text: '限免', bgColor: '#FF7F24' };
    case 'vip':
      return { text: '会员', bgColor: '#FB7299' };
    case 'preview':
      return { text: '预告', bgColor: '#1890ff' };
    case 'restricted':
      return { text: '受限', bgColor: '#999' };
  }
}

function App() {
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const { alertMessage, showAlert, showAlertMessage } = useTransientAlert();

  useProductionGuards();
  useBackgroundMode();
  const { isBackgroundMode } = useAppRuntimeStore();

  const {
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
  } = useDownloadManager(showAlertMessage);

  const {
    collectionData,
    selectedBvids,
    fetchAndShowCollection,
    toggleVideoSelection: toggleBvidSelection,
    selectAll: selectAllBvids,
    deselectAll: deselectAllBvids,
    closeCollection,
    confirmDownload: confirmCollectionDownload,
  } = useCollection(showAlertMessage);

  const {
    bangumiData,
    selectedEpIds,
    fetchAndShowBangumi,
    toggleEpisodeSelection,
    selectAll: selectAllEps,
    deselectAll: deselectAllEps,
    closeBangumi,
    confirmDownload: confirmBangumiDownload,
  } = useBangumi(showAlertMessage);

  const shareLinkType = getShareLinkType(shareLink);

  // 当前活跃面板
  const activePanel: 'collection' | 'bangumi' | null =
    collectionData ? 'collection' : bangumiData ? 'bangumi' : null;

  // 将活跃数据转换为 VideoListItem[]
  const videoListItems = useMemo<VideoListItem[]>(() => {
    if (activePanel === 'collection' && collectionData) {
      return collectionData.videos.map((v) => ({
        key: v.bvid,
        title: v.title,
        duration: v.duration,
        selectable: true,
        subtitle: v.author,
      }));
    }
    if (activePanel === 'bangumi' && bangumiData) {
      return bangumiData.episodes.map((ep) => ({
        key: String(ep.ep_id),
        title: ep.show_title || ep.title,
        duration: ep.duration,
        selectable: !(ep.episodeStatus === 'vip' && !bangumiData.isVip),
        statusBadge: getStatusBadge(ep.episodeStatus),
      }));
    }
    return [];
  }, [activePanel, collectionData, bangumiData]);

  // 面板标题
  const videoListTitle = activePanel === 'collection'
    ? collectionData?.title ?? ''
    : bangumiData?.title ?? '';

  // 活跃的 selected keys
  const activeSelectedKeys =
    activePanel === 'collection' ? selectedBvids : selectedEpIds;

  // 活跃的 toggle
  const handleToggle = activePanel === 'collection'
    ? toggleBvidSelection
    : toggleEpisodeSelection;

  const handleSelectAll = activePanel === 'collection'
    ? selectAllBvids
    : selectAllEps;

  const handleDeselectAll = activePanel === 'collection'
    ? deselectAllBvids
    : deselectAllEps;

  const handleClose = activePanel === 'collection' ? closeCollection : closeBangumi;

  const handleConfirm = () => {
    if (activePanel === 'collection') {
      const count = confirmCollectionDownload(savePath);
      if (count > 0) {
        showAlertMessage(`已添加 ${count} 个视频至下载队列`);
      }
    } else if (activePanel === 'bangumi') {
      const count = confirmBangumiDownload(savePath);
      if (count > 0) {
        showAlertMessage(`已添加 ${count} 个视频至下载队列`);
      }
    }
  };

  const handleOpenCollection = () => {
    setActionsOpen(false);
    fetchAndShowCollection(shareLink);
  };

  const handleOpenBangumi = () => {
    setActionsOpen(false);
    fetchAndShowBangumi(shareLink);
  };

  const handleToggleOpen = () => {
    setActionsOpen((open) => !open);
  };

  const handleCloseActions = () => {
    setActionsOpen(false);
  };

  return (
    <div className="app-shell" data-theme={isDarkTheme ? 'dark' : 'light'}>
      <Header isActive={loginStatus} />

      <main className="app-stage">
        <DownloadPanel
          currentDownloadTitle={currentDownloadTitle}
          downloadProgress={downloadProgress}
          isBackgroundMode={isBackgroundMode}
          isDownloading={isDownloading}
          onDownload={handleDownload}
          onFolderSelect={handleFolderSelect}
          onSavePathChange={setSavePath}
          onShareLinkChange={setShareLink}
          savePath={savePath}
          shareLink={shareLink}
        />
      </main>

      <FloatingActions
        isDarkTheme={isDarkTheme}
        loginStatus={loginStatus}
        onAlreadyLoggedIn={() => showAlertMessage('已登录,别点了!!!')}
        onClose={handleCloseActions}
        onOpenBangumi={handleOpenBangumi}
        onOpenCollection={handleOpenCollection}
        onOpenLogin={() => setShowLogin((visible) => !visible)}
        onOpenQueue={() => {
          setActionsOpen(false);
          setShowQueue((v) => !v);
        }}
        onOpenSettings={() => setShowSettings((visible) => !visible)}
        onShowCurrentTime={() => showAlertMessage('当前时间: ' + new Date().toLocaleTimeString())}
        onToggleOpen={handleToggleOpen}
        onToggleTheme={() => setIsDarkTheme((dark) => !dark)}
        open={actionsOpen}
        shareLinkType={shareLinkType}
      />

      <VideoListPanel
        items={videoListItems}
        onClose={handleClose}
        onConfirm={handleConfirm}
        onDeselectAll={handleDeselectAll}
        onSelectAll={handleSelectAll}
        onToggle={handleToggle}
        selectedKeys={activeSelectedKeys}
        title={videoListTitle}
        visible={activePanel !== null}
      />

      <DownloadQueue
        visible={showQueue}
        onClose={() => setShowQueue(false)}
      />

      <AlertToast message={alertMessage} visible={showAlert} />

      {showLogin && (
        <LoginBili
          LoginSuccessNotic={() => showAlertMessage('登录成功')}
          onClose={() => setShowLogin(false)}
          setLoginstatus={() => setLoginStatus(true)}
          visible={showLogin}
        />
      )}

      {showSettings && (
        <Settings
          noticeSettingsSaved={() => showAlertMessage('设置已保存')}
          onClose={() => setShowSettings(false)}
          setMainPageStatus={() => setLoginStatus(false)}
          visible={showSettings}
        />
      )}
    </div>
  );
}

export default App;
