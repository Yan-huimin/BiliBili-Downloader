import { client } from "./bilibiliClient.js";

function determineEpisodeStatus(status: number, badgeType: number): BangumiEpisodeStatus {
  if (status === 13) return 'vip';
  if (badgeType === 3) return 'limited_free';
  if (badgeType === 1) return 'preview';
  return 'free';
}

/**
 * 根据 ep_id 获取番剧正片列表。
 * 调用 Bilibili PGC 接口，筛选 section_type === 0 的正片剧集。
 */
export async function fetchBangumiEpisodes(epId: number): Promise<BangumiInfo | null> {
  try {
    const url = `https://api.bilibili.com/pgc/view/web/season?ep_id=${epId}`;
    const response = await client.get(url);

    if (response.data.code !== 0) {
      console.error("fetchBangumiEpisodes API error, code:", response.data.code);
      return null;
    }

    const result = response.data.result;
    if (!result) {
      return null;
    }

    const allEpisodes = result.episodes;
    if (!allEpisodes || !Array.isArray(allEpisodes) || allEpisodes.length === 0) {
      return null;
    }

    const mainEpisodes = allEpisodes.filter(
      (ep: Record<string, unknown>) => ep.section_type === 0
    );

    if (mainEpisodes.length === 0) {
      return null;
    }

    const userVipStatus = result.user_status?.vip_info?.status ?? 0;
    const isVip = userVipStatus === 1;

    const seasonTitle: string = (result.season_title as string) ?? (result.title as string) ?? "";

    const episodes: BangumiEpisode[] = mainEpisodes.map((ep: Record<string, unknown>) => {
      const status = (ep.status as number) ?? 0;
      const badgeType = (ep.badge_type as number) ?? 0;

      return {
        ep_id: (ep.ep_id as number) ?? 0,
        bvid: (ep.bvid as string) ?? "",
        title: (ep.title as string) ?? "",
        show_title: (ep.show_title as string) ?? (ep.title as string) ?? "",
        duration: Math.floor(((ep.duration as number) ?? 0) / 1000),
        badge: (ep.badge as string) ?? "",
        badge_type: badgeType,
        status,
        episodeStatus: determineEpisodeStatus(status, badgeType),
      };
    });

    return {
      season_id: (result.season_id as number) ?? 0,
      title: seasonTitle,
      isVip,
      episodes,
    };
  } catch (error) {
    console.error("fetchBangumiEpisodes fail:", error);
    return null;
  }
}
