import { FiCopy, FiTrash2 } from "react-icons/fi";

const typeLabels: Record<DownloadHistoryType, string> = {
  video: "视频",
  collection: "合集",
  bangumi: "番剧",
  user: "UP 主",
};

type HistoryItemProps = {
  item: DownloadHistoryItem;
  onCopy: (link: string) => void;
  onDelete: (id: string) => void;
};

function formatHistoryTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间未知";
  return date.toLocaleString("zh-CN", { hour12: false });
}

function HistoryItem({ item, onCopy, onDelete }: HistoryItemProps) {
  return (
    <article className="history-item" data-testid="history-item">
      <div className="history-item__info">
        <div className="history-item__header">
          <span className="history-item__title" title={item.title}>{item.title}</span>
          <span className="history-item__type">{typeLabels[item.type]}</span>
        </div>
        <div className="history-item__link" title={item.shareLink}>{item.shareLink}</div>
        <time className="history-item__time" dateTime={item.createdAt}>
          {formatHistoryTime(item.createdAt)}
        </time>
      </div>
      <div className="history-item__actions">
        <button aria-label="复制链接" onClick={() => onCopy(item.shareLink)} title="复制链接" type="button"><FiCopy /></button>
        <button aria-label="删除记录" onClick={() => onDelete(item.id)} title="删除记录" type="button"><FiTrash2 /></button>
      </div>
    </article>
  );
}

export default HistoryItem;
