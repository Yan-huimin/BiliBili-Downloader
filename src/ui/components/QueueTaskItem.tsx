import { useMemo } from "react";

const statusLabels: Record<DownloadTaskStatus, string> = {
  waiting: "等待中",
  downloading: "下载中",
  completed: "已完成",
  cancelled: "已取消",
  error: "失败",
};

interface QueueTaskItemProps {
  task: DownloadTask;
  onCancel: (id: number) => void;
  onRetry: (task: DownloadTask) => void;
}

const QueueTaskItem = ({ task, onCancel, onRetry }: QueueTaskItemProps) => {
  const isTerminal =
    task.status === "completed" || task.status === "error" || task.status === "cancelled";
  const isMerging = task.status === "downloading" && task.progress >= 70;
  const isRetrying = task.status === "downloading" && (task.retryCount ?? 0) > 0;

  const displayStatus = useMemo(() => {
    if (isMerging) return "合并中";
    if (isRetrying) return `重试 (${task.retryCount}/3)`;
    return statusLabels[task.status];
  }, [isMerging, isRetrying, task.status, task.retryCount]);

  const statusClass = isMerging ? "merging" : task.status;
  const itemClass = [
    "queue-item",
    `queue-item--${statusClass}`,
    task.status === "completed" ? "queue-item--done" : "",
    task.status === "error" ? "queue-item--fail" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={itemClass}>
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
          onClick={() => onCancel(task.id)}
          title="取消"
          type="button"
        >
          &#x2715;
        </button>
      ) : task.status === "error" ? (
        <button
          className="queue-item__retry"
          onClick={() => onRetry(task)}
          title="重试"
          type="button"
        >
          重试
        </button>
      ) : null}
    </div>
  );
};

export default QueueTaskItem;
