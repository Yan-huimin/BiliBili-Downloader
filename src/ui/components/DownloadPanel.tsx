import { AiOutlineBilibili } from 'react-icons/ai';
import { FaFolderOpen, FaGithub } from 'react-icons/fa';
import { RiBilibiliFill } from 'react-icons/ri';

type DownloadPanelProps = {
  currentDownloadTitle: string;
  downloadProgress: number;
  isDownloading: boolean;
  onDownload: () => void;
  onFolderSelect: () => void;
  onSavePathChange: (value: string) => void;
  onShareLinkChange: (value: string) => void;
  savePath: string;
  shareLink: string;
};

function DownloadPanel({
  currentDownloadTitle,
  downloadProgress,
  isDownloading,
  onDownload,
  onFolderSelect,
  onSavePathChange,
  onShareLinkChange,
  savePath,
  shareLink,
}: DownloadPanelProps) {
  const roundedProgress = Math.round(downloadProgress);

  return (
    <section className="download-panel flex min-h-[398px] w-[360px] flex-col px-5 py-5" aria-label="下载面板">
      <div className="app-brand">
        <div className="app-brand__icon">
          <RiBilibiliFill />
        </div>
        <div className="app-brand__copy">
          <p className="app-brand__eyebrow">BiliDownload</p>
          <h1 className="app-brand__title">视频下载</h1>
        </div>
      </div>

      <div className="download-form">
        <label className="form-field" data-testid="shareLinkLabel">
          <span className="form-field__label">分享链接</span>
          <input
            className="input-base"
            data-testid="shareLink"
            maxLength={500}
            name="shareLink"
            onChange={(event) => onShareLinkChange(event.target.value)}
            placeholder="请输入分享链接..."
            required
            type="url"
            value={shareLink}
          />
        </label>

        <label className="form-field" data-testid="folderAddreeLabel">
          <span className="form-field__label">保存地址</span>
          <span className="input-row">
            <input
              className="input-base"
              data-testid="folderAddress"
              maxLength={200}
              name="savePath"
              onChange={(event) => onSavePathChange(event.target.value)}
              placeholder="请输入保存路径..."
              required
              type="text"
              value={savePath}
            />
            <button
              aria-label="选择文件夹"
              className="icon-button"
              data-testid="chooseFolderBtn"
              onClick={onFolderSelect}
              title="选择文件夹"
              type="button"
            >
              <FaFolderOpen />
            </button>
          </span>
        </label>

        <div className="progress-slot" aria-live="polite">
          {isDownloading && (
            <div className="progress-block" id="progressBar">
              <div className="progress-block__meta">
                <span>下载进度</span>
                <span>{roundedProgress}%</span>
              </div>
              <div className="progress-track">
                <div className="progress-track__bar" style={{ width: `${downloadProgress}%` }} />
              </div>
            </div>
          )}
        </div>

        <button
          className="download-button"
          data-testid="downloadBtn"
          disabled={isDownloading}
          onClick={onDownload}
          type="button"
        >
          {isDownloading && currentDownloadTitle ? (
            <span className="download-title-scroll" aria-label="下载中">
              <span className="download-title-scroll__text">
                {currentDownloadTitle}
              </span>
            </span>
          ) : isDownloading ? (
            <span className="loading-dots" aria-label="下载中">
              <span />
              <span />
              <span />
            </span>
          ) : (
            '开始下载'
          )}
        </button>
      </div>

      <footer className="download-footer">
        <p data-testid="firstInfo">
          仅支持
          <span className="bili-inline">
            <AiOutlineBilibili />
          </span>
          视频下载
        </p>
        <p className="download-footer__email" data-testid="secondInfo">
          yanhuimin434@gmail.com
        </p>
        <p className="download-footer__author" data-testid="thirdInfo">
          <span className="gradient-text-animate">&copy; 2025 yhm</span>
          <a
            aria-label="GitHub"
            data-testid="authorLink"
            href="https://github.com/Yan-huimin"
            onClick={(event) => {
              event.preventDefault();
              window.electron.openPage('https://github.com/Yan-huimin');
            }}
            rel="noopener noreferrer"
            target="_blank"
            title="GitHub"
          >
            <FaGithub />
          </a>
        </p>
      </footer>
    </section>
  );
}

export default DownloadPanel;
