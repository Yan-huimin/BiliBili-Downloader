import { useCallback, useEffect, useState } from "react";

type AlertHandler = (message: string) => void;

export function useDownloadHistory(visible: boolean, showAlert: AlertHandler) {
  const [history, setHistory] = useState<DownloadHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let mounted = true;
    setIsLoading(true);
    window.electron.getDownloadHistory()
      .then((items) => {
        if (mounted) setHistory(items);
      })
      .catch(() => showAlert("加载历史记录失败"))
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [showAlert, visible]);

  const deleteItem = useCallback(async (id: string) => {
    try {
      setHistory(await window.electron.deleteDownloadHistory(id));
    } catch {
      showAlert("删除历史记录失败");
    }
  }, [showAlert]);

  const copyLink = useCallback(async (link: string) => {
    try {
      const copied = await window.electron.copyHistoryLink(link);
      showAlert(copied ? "链接已复制" : "复制链接失败");
    } catch {
      showAlert("复制链接失败");
    }
  }, [showAlert]);

  const clearAll = useCallback(async () => {
    if (history.length === 0 || !window.confirm("确定要清空全部历史记录吗？")) return;
    try {
      setHistory(await window.electron.clearDownloadHistory());
    } catch {
      showAlert("清空历史记录失败");
    }
  }, [history.length, showAlert]);

  return { clearAll, copyLink, deleteItem, history, isLoading };
}
