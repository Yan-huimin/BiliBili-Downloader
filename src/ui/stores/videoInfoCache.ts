const VIDEO_INFO_CACHE_TTL_MS = 10 * 60 * 1000;

type CacheEntry<T> = {
  expiresAt: number;
  value: T | null;
};

const collectionCache = new Map<string, CacheEntry<CollectionInfo>>();
const collectionRequests = new Map<string, Promise<CollectionInfo | null>>();
const bangumiCache = new Map<number, CacheEntry<BangumiInfo>>();
const bangumiRequests = new Map<number, Promise<BangumiInfo | null>>();

function getFreshCacheValue<K extends string | number, T>(cache: Map<K, CacheEntry<T>>, key: K) {
  const cached = cache.get(key);
  if (!cached || cached.expiresAt <= Date.now()) {
    return undefined;
  }
  return cached.value;
}

function setCacheValue<K extends string | number, T>(cache: Map<K, CacheEntry<T>>, key: K, value: T | null) {
  cache.set(key, {
    expiresAt: Date.now() + VIDEO_INFO_CACHE_TTL_MS,
    value,
  });
}

export async function fetchCachedCollection(bvid: string) {
  const cached = getFreshCacheValue(collectionCache, bvid);
  if (cached !== undefined) {
    return cached;
  }

  const pending = collectionRequests.get(bvid);
  if (pending) {
    return pending;
  }

  const request = window.electron.fetchCollection(bvid)
    .then((result) => {
      setCacheValue(collectionCache, bvid, result);
      return result;
    })
    .finally(() => {
      collectionRequests.delete(bvid);
    });

  collectionRequests.set(bvid, request);
  return request;
}

export async function fetchCachedBangumiEpisodes(epId: number) {
  const cached = getFreshCacheValue(bangumiCache, epId);
  if (cached !== undefined) {
    return cached;
  }

  const pending = bangumiRequests.get(epId);
  if (pending) {
    return pending;
  }

  const request = window.electron.fetchBangumiEpisodes(epId)
    .then((result) => {
      setCacheValue(bangumiCache, epId, result);
      return result;
    })
    .finally(() => {
      bangumiRequests.delete(epId);
    });

  bangumiRequests.set(epId, request);
  return request;
}

const userVideoPageCache = new Map<string, CacheEntry<UserVideoPageResult>>();
const userVideoPageRequests = new Map<string, Promise<UserVideoPageResult | null>>();
const userCardCache = new Map<number, CacheEntry<UserCardInfo>>();
const userCardRequests = new Map<number, Promise<UserCardInfo | null>>();

function userVideoPageCacheKey(mid: number, pn: number, ps: number): string {
  return `${mid}-${pn}-${ps}`;
}

export async function fetchCachedUserVideoPage(
  mid: number,
  pn: number,
  ps: number
): Promise<UserVideoPageResult | null> {
  const cacheKey = userVideoPageCacheKey(mid, pn, ps);
  const cached = getFreshCacheValue(userVideoPageCache, cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const pending = userVideoPageRequests.get(cacheKey);
  if (pending) {
    return pending;
  }

  const request = window.electron
    .fetchUserVideoPage({ mid, pn, ps })
    .then((result) => {
      setCacheValue(userVideoPageCache, cacheKey, result);
      return result;
    })
    .finally(() => {
      userVideoPageRequests.delete(cacheKey);
    });

  userVideoPageRequests.set(cacheKey, request);
  return request;
}

export async function fetchCachedUserCard(
  mid: number
): Promise<UserCardInfo | null> {
  const cached = getFreshCacheValue(userCardCache, mid);
  if (cached !== undefined) {
    return cached;
  }

  const pending = userCardRequests.get(mid);
  if (pending) {
    return pending;
  }

  const request = window.electron
    .fetchUserCard(mid)
    .then((result) => {
      setCacheValue(userCardCache, mid, result);
      return result;
    })
    .finally(() => {
      userCardRequests.delete(mid);
    });

  userCardRequests.set(mid, request);
  return request;
}
