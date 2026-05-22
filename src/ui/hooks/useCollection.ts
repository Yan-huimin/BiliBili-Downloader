import { useCallback, useState } from "react";

type AlertHandler = (message: string) => void;

export function useCollection(showAlert: AlertHandler) {
  const [collectionData, setCollectionData] = useState<CollectionInfo | null>(null);
  const [selectedBvids, setSelectedBvids] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [initialBvid, setInitialBvid] = useState<string>("");

  const fetchAndShowCollection = useCallback(async (shareLink: string) => {
    if (!shareLink.trim()) return;

    const match = shareLink.match(/BV([a-zA-Z0-9]+)/);
    const bvid = match ? `BV${match[1]}` : null;
    if (!bvid) {
      showAlert("无法识别分享链接中的BV号");
      return;
    }

    setIsLoading(true);
    try {
      const result = await window.electron.fetchCollection(bvid);
      if (!result || result.videos.length === 0) {
        showAlert("当前视频并不存在于任何合集中");
        setCollectionData(null);
      } else {
        setCollectionData(result);
        const selected = new Set<string>();
        selected.add(bvid);
        setSelectedBvids(selected);
        setInitialBvid(bvid);
      }
    } catch {
      showAlert("获取合集信息失败");
      setCollectionData(null);
    } finally {
      setIsLoading(false);
    }
  }, [showAlert]);

  const toggleVideoSelection = useCallback((bvid: string) => {
    setSelectedBvids((prev) => {
      const next = new Set(prev);
      if (next.has(bvid)) {
        next.delete(bvid);
      } else {
        next.add(bvid);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (!collectionData) return;
    setSelectedBvids(new Set(collectionData.videos.map((v) => v.bvid)));
  }, [collectionData]);

  const closeCollection = useCallback(() => {
    setCollectionData(null);
    setSelectedBvids(new Set());
    setInitialBvid("");
  }, []);

  const confirmDownload = useCallback((savePath: string) => {
    if (!collectionData) return 0;

    const tasks: DownloadTask[] = [];
    for (const video of collectionData.videos) {
      if (selectedBvids.has(video.bvid)) {
        tasks.push({
          id: 0,
          bvid: video.bvid,
          title: video.title,
          duration: video.duration,
          progress: 0,
          status: "waiting",
          filePath: savePath,
        });
      }
    }

    if (tasks.length > 0) {
      window.electron.enqueueBulk(tasks);
    }

    setCollectionData(null);
    setSelectedBvids(new Set());
    setInitialBvid("");
    return tasks.length;
  }, [collectionData, selectedBvids]);

  return {
    collectionData,
    selectedBvids,
    isLoading,
    initialBvid,
    fetchAndShowCollection,
    toggleVideoSelection,
    selectAll,
    closeCollection,
    confirmDownload,
  };
}
