import { useMemo } from 'react';
import { FaFolder, FaSignOutAlt } from 'react-icons/fa';
import { IoCopy, IoDiamondOutline } from 'react-icons/io5';
import { VscTools } from 'react-icons/vsc';
import defaultImg from '../assets/defaultHead.jpeg';
import { VIDEO_QUALITY_OPTIONS } from '../constants/videoQualityOptions';
import '../css/Modal.css';
import { useClickOutside } from '../hooks/useClickOutside';
import { useSettingsPanel } from '../hooks/useSettingsPanel';

interface SettingsProps {
  visible: boolean;
  onClose: () => void;
  setMainPageStatus: () => void;
  noticeSettingsSaved: () => void;
}

const Settings = ({ visible, onClose, setMainPageStatus, noticeSettingsSaved }: SettingsProps) => {
  const modalRef = useClickOutside<HTMLDivElement>(visible, onClose);
  const {
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
  } = useSettingsPanel(visible, setMainPageStatus);

  const availableQualityOptions = useMemo(
    () => VIDEO_QUALITY_OPTIONS.filter((item) => userInfo.vip || !item.vip),
    [userInfo.vip],
  );

  if (!visible) {
    return null;
  }

  return (
    <div className="modal-layer">
      <div className="modal-panel settings-panel glass-panel" ref={modalRef}>
        <div className="settings-scroll custom-scrollbar">
          <header className="settings-user">
            <img
              alt="head"
              className="settings-user__avatar"
              src={loginStatus && userInfo.head ? userInfo.head : defaultImg}
            />
            <div className="settings-user__meta">
              <span>{loginStatus && userInfo.uname ? userInfo.uname : '未登录'}</span>
              <IoDiamondOutline className={loginStatus && userInfo.vip ? 'vip-icon' : 'vip-icon vip-icon--muted'} />
            </div>
            {loginStatus && userInfo.uname && (
              <button
                aria-label="退出登录"
                className="settings-user__logout"
                onClick={handleLogout}
                title="退出登录"
                type="button"
              >
                <FaSignOutAlt />
              </button>
            )}
          </header>

          <section className="settings-section">
            <h2>清晰度</h2>
            <div className="quality-grid">
              {availableQualityOptions.map((item) => (
                <label
                  className={selectedQuality === item.qn ? 'quality-option is-selected' : 'quality-option'}
                  key={item.qn}
                >
                  <input
                    checked={selectedQuality === item.qn}
                    onChange={() => setSelectedQuality(item.qn)}
                    type="checkbox"
                  />
                  <span>{item.text}</span>
                  {item.vip && <IoDiamondOutline className="vip-icon" />}
                </label>
              ))}
            </div>
          </section>

          <section className="settings-section">
            <h2>其他设置</h2>
            <label className="settings-row">
              <input
                checked={systemNotification}
                onChange={() => setSystemNotification(!systemNotification)}
                type="checkbox"
              />
              <span>系统通知</span>
            </label>
            <label className="settings-row">
              <input
                checked={fireworkParticles}
                onChange={() => setFireworkParticles(!fireworkParticles)}
                type="checkbox"
              />
              <span>彩带特效</span>
            </label>
          </section>

          <section className="settings-section">
            <h2>开发者工具</h2>
            <button
              className="settings-action-btn"
              onClick={() => window.electron.openDevTools()}
              type="button"
            >
              <VscTools />
              <span>打开开发者工具</span>
            </button>
          </section>

          <section className="settings-section">
            <h2>默认下载路径</h2>
            <div className="path-row">
              <span className="path-row__value" title={defaultDownloadPath}>
                {defaultDownloadPath}
              </span>
              <button aria-label="选择文件夹" onClick={handleFolderSelect} title="选择文件夹" type="button">
                <FaFolder />
              </button>
              <button
                aria-label="复制路径"
                onClick={() => navigator.clipboard.writeText(defaultDownloadPath)}
                title="复制路径"
                type="button"
              >
                <IoCopy />
              </button>
            </div>
          </section>
        </div>

        <div className="modal-actions settings-actions">
          <button
            className="modal-button modal-button--primary"
            onClick={() => {
              saveSettings();
              noticeSettingsSaved();
              onClose();
            }}
            type="button"
          >
            保存配置
          </button>
          <button className="modal-button modal-button--danger" onClick={onClose} type="button">
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
