import { useCallback, useState } from "react";
import { validateShareLink } from "../utils/shareLinkValidator";

type AlertHandler = (message: string) => void;

export function useBangumi(showAlert: AlertHandler) {
  const [bangumiData, setBangumiData] = useState<BangumiInfo | null>(null);
  const [selectedEpIds, setSelectedEpIds] = useState<Set<string>>(new Set());

  const fetchAndShowBangumi = useCallback(async (shareLink: string) => {
    if (!shareLink.trim()) return;

    const validation = validateShareLink(shareLink);
    if (!validation.valid) {
      showAlert(validation.error);
      return;
    }
    if (validation.type !== 'ep') {
      showAlert("该分享链接不包含番剧ep号");
      return;
    }

    const epId = validation.id as number;
    try {
      const result = await window.electron.fetchBangumiEpisodes(epId);
      if (!result || result.episodes.length === 0) {
        showAlert("未获取到该番剧的正片内容");
        setBangumiData(null);
      } else {
        setBangumiData(result);
        const selected = new Set<string>();
        selected.add(String(epId));
        setSelectedEpIds(selected);
      }
    } catch {
      showAlert("获取番剧信息失败");
      setBangumiData(null);
    }
  }, [showAlert]);

  const toggleEpisodeSelection = useCallback((key: string) => {
    setSelectedEpIds((prev) => {
      if (!bangumiData) return prev;

      const episode = bangumiData.episodes.find((ep) => String(ep.ep_id) === key);
      if (!episode) return prev;

      const isVipOnly = episode.episodeStatus === 'vip' && !bangumiData.isVip;
      if (isVipOnly) return prev;

      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, [bangumiData]);

  const selectAll = useCallback(() => {
    if (!bangumiData) return;
    const keys = bangumiData.episodes
      .filter((ep) => !(ep.episodeStatus === 'vip' && !bangumiData.isVip))
      .map((ep) => String(ep.ep_id));
    setSelectedEpIds(new Set(keys));
  }, [bangumiData]);

  const deselectAll = useCallback(() => {
    setSelectedEpIds(new Set());
  }, []);

  const closeBangumi = useCallback(() => {
    setBangumiData(null);
    setSelectedEpIds(new Set());
  }, []);

  const confirmDownload = useCallback((savePath: string) => {
    if (!bangumiData) return 0;

    const tasks: DownloadTask[] = [];
    for (const ep of bangumiData.episodes) {
      const key = String(ep.ep_id);
      if (!selectedEpIds.has(key)) continue;

      const isVipOnly = ep.episodeStatus === 'vip' && !bangumiData.isVip;
      if (isVipOnly) continue;

      tasks.push({
        id: 0,
        bvid: ep.bvid,
        title: ep.show_title || ep.title,
        duration: ep.duration,
        progress: 0,
        status: "waiting",
        filePath: savePath,
      });
    }

    if (tasks.length > 0) {
      window.electron.enqueueBulk(tasks);
    }

    setBangumiData(null);
    setSelectedEpIds(new Set());
    return tasks.length;
  }, [bangumiData, selectedEpIds]);

  return {
    bangumiData,
    selectedEpIds,
    fetchAndShowBangumi,
    toggleEpisodeSelection,
    selectAll,
    deselectAll,
    closeBangumi,
    confirmDownload,
  };
}
