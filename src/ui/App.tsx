import { useState } from 'react';
import AlertToast from './components/AlertToast';
import DownloadPanel from './components/DownloadPanel';
import FloatingActions from './components/FloatingActions';
import Header from './components/Header';
import LoginBili from './components/LoginBili';
import Settings from './components/Settings';
import './css/App.css';
import { useDownloadManager } from './hooks/useDownloadManager';
import { useProductionGuards } from './hooks/useProductionGuards';
import { useTransientAlert } from './hooks/useTransientAlert';

function App() {
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const { alertMessage, showAlert, showAlertMessage } = useTransientAlert();

  useProductionGuards();

  const {
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

  return (
    <div className="app-shell" data-theme={isDarkTheme ? 'dark' : 'light'}>
      <Header isActive={loginStatus} />

      <main className="app-stage">
        <DownloadPanel
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
        isDarkTheme={isDarkTheme}
        loginStatus={loginStatus}
        onAlreadyLoggedIn={() => showAlertMessage('已登录,别点了!!!')}
        onOpenLogin={() => setShowLogin((visible) => !visible)}
        onOpenSettings={() => setShowSettings((visible) => !visible)}
        onShowCurrentTime={() => showAlertMessage('当前时间: ' + new Date().toLocaleTimeString())}
        onClose={() => setActionsOpen(false)}
        onToggleOpen={() => setActionsOpen((open) => !open)}
        onToggleTheme={() => setIsDarkTheme((dark) => !dark)}
        open={actionsOpen}
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
