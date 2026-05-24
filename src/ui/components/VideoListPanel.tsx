import { useMemo, useCallback } from "react";
import { formatDuration } from "../hooks/useDownloadQueue";
import { useClickOutside } from "../hooks/useClickOutside";
import "../css/Panels.css";

interface VideoListItemRowProps {
  item: VideoListItem;
  index: number;
  checked: boolean;
  onToggle: (key: string) => void;
}

const VideoListItemRow = ({ item, index, checked, onToggle }: VideoListItemRowProps) => {
  const handleChange = useCallback(() => onToggle(item.key), [onToggle, item.key]);
  const formattedDuration = useMemo(() => formatDuration(item.duration), [item.duration]);

  return (
    <label
      className={`video-list-item${checked ? " is-selected" : ""}${!item.selectable ? " video-list-item--disabled" : ""}`}
      key={item.key}
    >
      <span className="video-list-item__index">{index + 1}</span>
      <input
        checked={checked}
        disabled={!item.selectable}
        onChange={handleChange}
        type="checkbox"
      />
      <div className="video-list-item__info">
        <span className="video-list-item__title" title={item.title}>
          {item.title}
        </span>
        <div className="video-list-item__meta">
          <span>{formattedDuration}</span>
          {item.subtitle && <span title={item.subtitle}>{item.subtitle}</span>}
        </div>
      </div>
      {item.statusBadge && (
        <span
          className="video-list-item__badge"
          style={{ backgroundColor: item.statusBadge.bgColor }}
        >
          {item.statusBadge.text}
        </span>
      )}
    </label>
  );
};

interface VideoListPanelProps {
  visible: boolean;
  title: string;
  items: VideoListItem[];
  selectedKeys: Set<string>;
  onToggle: (key: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onClose: () => void;
  onConfirm: () => void;
}

function VideoListPanel({
  visible,
  title,
  items,
  selectedKeys,
  onToggle,
  onSelectAll,
  onDeselectAll,
  onClose,
  onConfirm,
}: VideoListPanelProps) {
  const modalRef = useClickOutside<HTMLDivElement>(visible, onClose);

  const selectableKeys = useMemo(
    () => items.filter((i) => i.selectable).map((i) => i.key),
    [items]
  );

  const allSelected = useMemo(
    () => selectableKeys.length > 0 && selectableKeys.every((k) => selectedKeys.has(k)),
    [selectableKeys, selectedKeys]
  );

  const selectedCount = useMemo(() => {
    let count = 0;
    for (const k of selectedKeys) {
      const item = items.find((i) => i.key === k);
      if (item?.selectable) count++;
    }
    return count;
  }, [selectedKeys, items]);

  if (!visible) {
    return null;
  }

  const handleSelectAllToggle = () => {
    if (allSelected) {
      onDeselectAll();
    } else {
      onSelectAll();
    }
  };

  return (
    <div className="modal-layer">
      <div className="modal-panel collection-panel glass-panel" ref={modalRef}>
        <header className="panel-header">
          {title}
          <span className="panel-header__count">({items.length})</span>
        </header>

        <div className="panel-scroll">
          {items.map((item, index) => (
            <VideoListItemRow
              checked={selectedKeys.has(item.key)}
              index={index}
              item={item}
              key={item.key}
              onToggle={onToggle}
            />
          ))}
        </div>

        <div className="modal-actions">
          <button
            className="modal-button modal-button--success"
            disabled={selectedCount === 0}
            onClick={onConfirm}
            type="button"
          >
            下载 ({selectedCount})
          </button>
          <button
            className={
              allSelected
                ? "modal-button modal-button--danger"
                : "modal-button modal-button--primary"
            }
            onClick={handleSelectAllToggle}
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

export default VideoListPanel;
