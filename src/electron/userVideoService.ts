import { client } from "./bilibiliClient.js";
import { encWbi, getWbiKeys } from "./wbiSign.js";

async function fetchUserCard(
  mid: number
): Promise<UserCardInfo | null> {
  try {
    const url = `https://api.bilibili.com/x/web-interface/card?mid=${mid}`;
    const response = await client.get(url);

    if (response.data.code !== 0) {
      return null;
    }

    const card = response.data.data?.card;
    if (!card) {
      return null;
    }

    return {
      name: card.name ?? "",
      face: card.face ?? "",
      mid,
    };
  } catch {
    return null;
  }
}

async function fetchUserVideoPage(
  mid: number,
  pn: number,
  ps: number
): Promise<UserVideoPageResult | null> {
  try {
    const keys = await getWbiKeys();
    if (!keys) {
      return null;
    }

    const params: Record<string, unknown> = { mid, pn, ps, order: "pubdate" };
    const query = encWbi(params, keys.img_key, keys.sub_key);
    const url = `https://api.bilibili.com/x/space/wbi/arc/search?${query}`;
    const response = await client.get(url);

    if (response.data.code !== 0) {
      return null;
    }

    const listData = response.data.data?.list;
    const pageData = response.data.data?.page;

    if (!listData || !pageData) {
      return null;
    }

    const vlist: UserVideoApiItem[] = listData.vlist ?? [];
    const videos: UserVideoItem[] = vlist.map((item) => ({
      aid: item.aid,
      bvid: item.bvid,
      title: item.title,
      author: item.author,
      mid: item.mid,
      pic: item.pic,
      play: item.play,
      comment: item.comment,
      created: item.created,
      description: item.description,
      length: item.length,
      typeid: item.typeid,
    }));

    return {
      videos,
      page: {
        pn: pageData.pn ?? pn,
        ps: pageData.ps ?? ps,
        count: pageData.count ?? 0,
      },
    };
  } catch {
    return null;
  }
}

async function fetchAllUserVideos(
  mid: number
): Promise<UserVideoListData | null> {
  try {
    const pageSize = 50;
    const allVideos: UserVideoItem[] = [];
    let pn = 1;
    let totalCount = 0;

    while (true) {
      const pageResult = await fetchUserVideoPage(mid, pn, pageSize);
      if (!pageResult || pageResult.videos.length === 0) {
        break;
      }

      totalCount = pageResult.page.count;
      for (const v of pageResult.videos) {
        allVideos.push(v);
      }

      if (allVideos.length >= totalCount) break;
      pn++;
    }

    const userInfo = await fetchUserCard(mid);
    return {
      userInfo: userInfo ?? { name: "", face: "", mid },
      videos: allVideos,
      totalCount,
    };
  } catch {
    return null;
  }
}

export { fetchAllUserVideos, fetchUserVideoPage, fetchUserCard };
