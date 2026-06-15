import { useCallback, useRef, useState } from "react";
import { validateShareLink } from "../utils/shareLinkValidator";
import {
  fetchCachedUserVideoPage,
  fetchCachedUserCard,
} from "../stores/videoInfoCache";

type AlertHandler = (message: string) => void;

const PAGE_SIZE = 30;

function parseDurationToSeconds(length: string): number {
  const parts = length.split(":");
  if (parts.length !== 2) return 0;
  const minutes = Number(parts[0]) || 0;
  const seconds = Number(parts[1]) || 0;
  return minutes * 60 + seconds;
}

export function useUserVideo(showAlert: AlertHandler) {
  const [userVideoData, setUserVideoData] =
    useState<UserVideoListData | null>(null);
  const [selectedBvids, setSelectedBvids] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const currentMidRef = useRef<number>(0);
  const currentPageRef = useRef<number>(1);
  const totalCountRef = useRef<number>(0);

  const fetchAndShowUserVideo = useCallback(
    async (shareLink: string) => {
      if (!shareLink.trim()) return;

      const validation = validateShareLink(shareLink);
      if (!validation.valid) {
        showAlert(validation.error);
        return;
      }
      if (validation.type !== "space") {
        showAlert("该分享链接不包含用户空间标识");
        return;
      }

      const mid = validation.id as number;
      currentMidRef.current = mid;
      currentPageRef.current = 1;
      totalCountRef.current = 0;
      setIsLoading(true);
      try {
        const [pageResult, userInfo] = await Promise.all([
          fetchCachedUserVideoPage(mid, 1, PAGE_SIZE),
          fetchCachedUserCard(mid),
        ]);

        if (!pageResult || pageResult.videos.length === 0) {
          showAlert("该用户暂无投稿视频");
          setUserVideoData(null);
        } else {
          totalCountRef.current = pageResult.page.count;
          setUserVideoData({
            userInfo: userInfo ?? { name: "", face: "", mid },
            videos: pageResult.videos,
            totalCount: pageResult.page.count,
          });
          setSelectedBvids(new Set());
        }
      } catch {
        showAlert("获取用户投稿视频失败");
        setUserVideoData(null);
      } finally {
        setIsLoading(false);
      }
    },
    [showAlert]
  );

  const loadMore = useCallback(async () => {
    const mid = currentMidRef.current;
    if (!mid || !userVideoData) return;
    if (isLoadingMore) return;

    const nextPage = currentPageRef.current + 1;
    setIsLoadingMore(true);
    try {
      const pageResult = await fetchCachedUserVideoPage(
        mid,
        nextPage,
        PAGE_SIZE
      );
      if (!pageResult || pageResult.videos.length === 0) {
        return;
      }

      currentPageRef.current = nextPage;
      setUserVideoData((prev) => {
        if (!prev) return prev;
        const existingBvids = new Set(prev.videos.map((v) => v.bvid));
        const newVideos = pageResult.videos.filter(
          (v) => !existingBvids.has(v.bvid)
        );
        return {
          ...prev,
          videos: [...prev.videos, ...newVideos],
        };
      });
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, userVideoData]);

  const hasMore = userVideoData
    ? userVideoData.videos.length < totalCountRef.current
    : false;

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
    if (!userVideoData) return;
    setSelectedBvids(new Set(userVideoData.videos.map((v) => v.bvid)));
  }, [userVideoData]);

  const deselectAll = useCallback(() => {
    setSelectedBvids(new Set());
  }, []);

  const closeUserVideo = useCallback(() => {
    setUserVideoData(null);
    setSelectedBvids(new Set());
    currentMidRef.current = 0;
    currentPageRef.current = 1;
    totalCountRef.current = 0;
  }, []);

  const confirmDownload = useCallback(
    (savePath: string) => {
      if (!userVideoData) return 0;

      const tasks: DownloadTask[] = [];
      for (const video of userVideoData.videos) {
        if (selectedBvids.has(video.bvid)) {
          tasks.push({
            id: 0,
            bvid: video.bvid,
            title: video.title,
            duration: parseDurationToSeconds(video.length),
            progress: 0,
            status: "waiting",
            filePath: savePath,
          });
        }
      }

      if (tasks.length > 0) {
        window.electron.enqueueBulk(tasks);
      }

      setUserVideoData(null);
      setSelectedBvids(new Set());
      currentMidRef.current = 0;
      currentPageRef.current = 1;
      totalCountRef.current = 0;
      return tasks.length;
    },
    [userVideoData, selectedBvids]
  );

  return {
    userVideoData,
    selectedBvids,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    fetchAndShowUserVideo,
    toggleVideoSelection,
    selectAll,
    deselectAll,
    closeUserVideo,
    confirmDownload,
  };
}
