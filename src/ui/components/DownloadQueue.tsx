import { useCallback } from "react";
import QueueTaskItem from "./QueueTaskItem";
import { useDownloadQueue } from "../hooks/useDownloadQueue";
import { useClickOutside } from "../hooks/useClickOutside";
import "../css/Panels.css";

interface DownloadQueueProps {
  visible: boolean;
  onClose: () => void;
}

function DownloadQueue({ visible, onClose }: DownloadQueueProps) {
  const modalRef = useClickOutside<HTMLDivElement>(visible, onClose);
  const { queue, handleCancel, handleRetry, handleClear } = useDownloadQueue(visible);

  const onCancel = useCallback((id: number) => {
    handleCancel(id);
  }, [handleCancel]);

  const onRetry = useCallback((task: DownloadTask) => {
    handleRetry(task);
  }, [handleRetry]);

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
            queue.map((task) => (
              <QueueTaskItem
                key={task.id}
                task={task}
                onCancel={onCancel}
                onRetry={onRetry}
              />
            ))
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
