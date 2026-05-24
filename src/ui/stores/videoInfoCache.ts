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
