let cachedQueue: DownloadTask[] = [];
let hasCachedQueue = false;
let needsQueueRefresh = true;

export function getCachedQueue() {
  return cachedQueue;
}

export function hasQueueCache() {
  return hasCachedQueue;
}

export function shouldRefreshQueue() {
  return needsQueueRefresh || !hasCachedQueue;
}

export function setCachedQueue(queue: DownloadTask[]) {
  cachedQueue = [...queue];
  hasCachedQueue = true;
  needsQueueRefresh = false;
}

export function markQueueNeedsRefresh() {
  needsQueueRefresh = true;
}
