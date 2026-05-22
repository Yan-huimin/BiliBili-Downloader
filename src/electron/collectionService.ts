import { client } from "./bilibiliClient.js";

/**
 * 根据 BV 号获取视频所在合集的信息。
 * 调用 Bilibili 视频详情接口，从响应中的 ugc_season 字段解析合集数据。
 * @param bvid - 视频的 BV 号。
 * @returns 合集信息（标题和视频列表），若视频不属于任何合集则返回 null。
 */
export async function fetchCollection(bvid: string): Promise<CollectionInfo | null> {
  try {
    const url = `https://api.bilibili.com/x/web-interface/wbi/view/detail?bvid=${bvid}`;
    const response = await client.get(url);

    if (response.data.code !== 0) {
      console.error("fetchCollection API error, code:", response.data.code);
      return null;
    }

    const ugcSeason = response.data.data?.View?.ugc_season;
    if (!ugcSeason) {
      return null;
    }

    const title: string = ugcSeason.title ?? "";
    const sections = ugcSeason.sections;
    if (!sections || !Array.isArray(sections) || sections.length === 0) {
      return null;
    }

    const videos: CollectionVideo[] = [];
    for (const section of sections) {
      const episodes = section.episodes;
      if (!episodes || !Array.isArray(episodes)) continue;
      for (const ep of episodes) {
        videos.push({
          bvid: ep.bvid ?? "",
          title: ep.title ?? "",
          duration: ep.page?.duration ?? ep.duration ?? 0,
          author: ep.author?.name ?? "",
        });
      }
    }

    if (videos.length === 0) {
      return null;
    }

    return { title, videos };
  } catch (error) {
    console.error("fetchCollection fail:", error);
    return null;
  }
}
