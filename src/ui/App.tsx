import { useState } from 'react';
import AlertToast from './components/AlertToast';
import CollectionPanel from './components/CollectionPanel';
import DownloadPanel from './components/DownloadPanel';
import DownloadQueue from './components/DownloadQueue';
import FloatingActions from './components/FloatingActions';
import Header from './components/Header';
import LoginBili from './components/LoginBili';
import Settings from './components/Settings';
import './css/App.css';
import { useCollection } from './hooks/useCollection';
import { useDownloadManager } from './hooks/useDownloadManager';
import { useProductionGuards } from './hooks/useProductionGuards';
import { useTransientAlert } from './hooks/useTransientAlert';

function App() {
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const { alertMessage, showAlert, showAlertMessage } = useTransientAlert();

  useProductionGuards();

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
  } = useDownloadManager(showAlertMessage, showSettings);

  const {
    collectionData,
    selectedBvids,
    initialBvid,
    fetchAndShowCollection,
    toggleVideoSelection,
    selectAll,
    closeCollection,
    confirmDownload,
  } = useCollection(showAlertMessage);

  const handleOpenCollection = () => {
    setActionsOpen(false);
    fetchAndShowCollection(shareLink);
  };

  const handleConfirmCollection = () => {
    const count = confirmDownload(savePath);
    if (count > 0) {
      showAlertMessage(`已添加 ${count} 个视频至下载队列`);
    }
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
        hasShareLink={shareLink.trim().length > 0}
        isDarkTheme={isDarkTheme}
        loginStatus={loginStatus}
        onAlreadyLoggedIn={() => showAlertMessage('已登录,别点了!!!')}
        onOpenCollection={handleOpenCollection}
        onOpenLogin={() => setShowLogin((visible) => !visible)}
        onOpenQueue={() => {
          setActionsOpen(false);
          setShowQueue((v) => !v);
        }}
        onOpenSettings={() => setShowSettings((visible) => !visible)}
        onShowCurrentTime={() => showAlertMessage('当前时间: ' + new Date().toLocaleTimeString())}
        onClose={handleCloseActions}
        onToggleOpen={handleToggleOpen}
        onToggleTheme={() => setIsDarkTheme((dark) => !dark)}
        open={actionsOpen}
      />

      <CollectionPanel
        collection={collectionData}
        initialBvid={initialBvid}
        onClose={closeCollection}
        onConfirm={handleConfirmCollection}
        onSelectAll={selectAll}
        onToggleVideo={toggleVideoSelection}
        selectedBvids={selectedBvids}
        visible={collectionData !== null}
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
