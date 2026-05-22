import { useDownloadQueue } from "../hooks/useDownloadQueue";
import { useClickOutside } from "../hooks/useClickOutside";
import "../css/Panels.css";

interface DownloadQueueProps {
  visible: boolean;
  onClose: () => void;
}

const statusLabels: Record<DownloadTaskStatus, string> = {
  waiting: "等待中",
  downloading: "下载中",
  completed: "已完成",
  cancelled: "已取消",
  error: "失败",
};

function DownloadQueue({ visible, onClose }: DownloadQueueProps) {
  const modalRef = useClickOutside<HTMLDivElement>(visible, onClose);
  const { queue, handleCancel, handleRetry, handleClear } = useDownloadQueue(visible);

  if (!visible) {
    return null;
  }

  const hasItems = queue.length > 0;

  return (
    <div className="modal-layer">
      <div className="modal-panel queue-panel glass-panel" ref={modalRef}>
        <header className="panel-header">下载{hasItems ? ` (${queue.length})` : ""}</header>

        <div className="panel-scroll">
          {!hasItems ? (
            <div className="panel-empty">当前并无下载视频</div>
          ) : (
            queue.map((task) => {
              const isTerminal = task.status === "completed" || task.status === "error" || task.status === "cancelled";
              const isMerging = task.status === "downloading" && task.progress >= 70;
              const isRetrying = task.status === "downloading" && (task.retryCount ?? 0) > 0;
              const displayStatus = isMerging
                ? "合并中"
                : isRetrying
                  ? `重试 (${task.retryCount}/3)`
                  : statusLabels[task.status];
              const statusClass = isMerging ? "merging" : task.status;

              return (
                <div
                  className={`queue-item${task.status === "completed" ? " queue-item--done" : ""}${task.status === "error" ? " queue-item--fail" : ""}`}
                  key={task.id}
                >
                  <div className="queue-item__info">
                    <div className="queue-item__header">
                      <span className="queue-item__title" title={task.title}>
                        {task.title}
                      </span>
                      <span className={`queue-item__status queue-item__status--${statusClass}`}>
                        {displayStatus}
                      </span>
                    </div>
                    {!isTerminal && (
                      <div className="queue-item__progress-row">
                        <div className="queue-item__progress-track">
                          <div
                            className="queue-item__progress-bar"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                        <span className="queue-item__progress-text">{task.progress}%</span>
                      </div>
                    )}
                  </div>
                  {task.status === "waiting" || task.status === "downloading" ? (
                    <button
                      className="queue-item__cancel"
                      onClick={() => handleCancel(task.id)}
                      title="取消"
                      type="button"
                    >
                      &#x2715;
                    </button>
                  ) : task.status === "error" ? (
                    <button
                      className="queue-item__retry"
                      onClick={() => handleRetry(task)}
                      title="重试"
                      type="button"
                    >
                      重试
                    </button>
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        <div className="modal-actions">
          <button
            className="modal-button modal-button--danger"
            onClick={onClose}
            type="button"
          >
            返回
          </button>
          <button
            className="modal-button modal-button--danger"
            disabled={!hasItems}
            onClick={handleClear}
            type="button"
          >
            清空下载队列
          </button>
        </div>
      </div>
    </div>
  );
}

export default DownloadQueue;
