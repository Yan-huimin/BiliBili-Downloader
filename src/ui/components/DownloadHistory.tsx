import { useClickOutside } from "../hooks/useClickOutside";
import { useDownloadHistory } from "../hooks/useDownloadHistory";
import "../css/Panels.css";
import HistoryItem from "./HistoryItem";

type DownloadHistoryProps = {
  visible: boolean;
  onClose: () => void;
  showAlert: (message: string) => void;
};

function DownloadHistory({ visible, onClose, showAlert }: DownloadHistoryProps) {
  const modalRef = useClickOutside<HTMLDivElement>(visible, onClose);
  const { clearAll, copyLink, deleteItem, history, isLoading } = useDownloadHistory(visible, showAlert);
  if (!visible) return null;

  return (
    <div className="modal-layer">
      <div className="modal-panel history-panel glass-panel" data-testid="history-panel" ref={modalRef}>
        <header className="panel-header">下载历史<span className="panel-header__count">{history.length}</span></header>
        <div className="panel-scroll">
          {isLoading ? (
            <div className="panel-empty">正在加载...</div>
          ) : history.length === 0 ? (
            <div className="panel-empty" data-testid="history-empty">暂无下载历史</div>
          ) : history.map((item) => (
            <HistoryItem item={item} key={item.id} onCopy={copyLink} onDelete={deleteItem} />
          ))}
        </div>
        <div className="modal-actions">
          <button className="modal-button modal-button--muted" onClick={onClose} type="button">关闭</button>
          <button className="modal-button modal-button--danger" disabled={history.length === 0} onClick={clearAll} type="button">清空全部历史记录</button>
        </div>
      </div>
    </div>
  );
}

export default DownloadHistory;
