import { formatDuration } from "../hooks/useDownloadQueue";
import { useClickOutside } from "../hooks/useClickOutside";
import "../css/Panels.css";

interface CollectionPanelProps {
  visible: boolean;
  collection: CollectionInfo | null;
  selectedBvids: Set<string>;
  initialBvid: string;
  onToggleVideo: (bvid: string) => void;
  onSelectAll: () => void;
  onClose: () => void;
  onConfirm: () => void;
}

function CollectionPanel({
  visible,
  collection,
  selectedBvids,
  onToggleVideo,
  onSelectAll,
  onClose,
  onConfirm,
}: CollectionPanelProps) {
  const modalRef = useClickOutside<HTMLDivElement>(visible, onClose);

  if (!visible || !collection) {
    return null;
  }

  const totalCount = collection.videos.length;
  const allSelected = selectedBvids.size === totalCount;

  return (
    <div className="modal-layer">
      <div className="modal-panel collection-panel glass-panel" ref={modalRef}>
        <header className="panel-header">
          {collection.title}
          <span className="panel-header__count">({totalCount})</span>
        </header>

        <div className="panel-scroll">
          {collection.videos.map((video, index) => {
            const isChecked = selectedBvids.has(video.bvid);
            return (
              <label className="collection-item" key={video.bvid}>
                <span className="collection-item__index">{index + 1}</span>
                <input
                  checked={isChecked}
                  onChange={() => onToggleVideo(video.bvid)}
                  type="checkbox"
                />
                <div className="collection-item__info">
                  <span className="collection-item__title" title={video.title}>
                    {video.title}
                  </span>
                  <div className="collection-item__meta">
                    <span>{formatDuration(video.duration)}</span>
                    <span title={video.author}>{video.author}</span>
                  </div>
                </div>
              </label>
            );
          })}
        </div>

        <div className="modal-actions">
          <button
            className="modal-button modal-button--success"
            disabled={selectedBvids.size === 0}
            onClick={onConfirm}
            type="button"
          >
            下载 ({selectedBvids.size})
          </button>
          <button
            className={allSelected ? "modal-button modal-button--danger" : "modal-button modal-button--primary"}
            onClick={onSelectAll}
            type="button"
          >
            {allSelected ? "取消全选" : "全选"}
          </button>
          <button
            className="modal-button modal-button--muted"
            onClick={onClose}
            type="button"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}

export default CollectionPanel;
