import { randomUUID } from "crypto";
import fs from "fs";
import { client } from "./bilibiliClient.js";
import { getDownloadHistoryPath } from "./pathResolver.js";

const MAX_HISTORY_ITEMS = 30;

function isHistoryType(value: unknown): value is DownloadHistoryType {
  return value === "video" || value === "collection" || value === "bangumi" || value === "user";
}

function isHistoryItem(value: unknown): value is DownloadHistoryItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<DownloadHistoryItem>;
  return (
    typeof item.id === "string" &&
    typeof item.shareLink === "string" &&
    typeof item.title === "string" &&
    typeof item.createdAt === "string" &&
    isHistoryType(item.type)
  );
}

export function ensureDownloadHistoryFile(): void {
  const historyPath = getDownloadHistoryPath();
  if (!fs.existsSync(historyPath)) {
    fs.writeFileSync(historyPath, "[]", "utf-8");
  }
}

function writeHistory(items: DownloadHistoryItem[]): void {
  ensureDownloadHistoryFile();
  const historyPath = getDownloadHistoryPath();
  const temporaryPath = `${historyPath}.tmp`;
  try {
    fs.writeFileSync(temporaryPath, JSON.stringify(items, null, 2), "utf-8");
    fs.renameSync(temporaryPath, historyPath);
  } finally {
    if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
  }
}

export function getDownloadHistory(): DownloadHistoryItem[] {
  ensureDownloadHistoryFile();
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(getDownloadHistoryPath(), "utf-8"));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isHistoryItem).slice(0, MAX_HISTORY_ITEMS);
  } catch {
    writeHistory([]);
    return [];
  }
}

async function resolveVideoTitle(bvid: string): Promise<string> {
  try {
    const response = await client.get("https://api.bilibili.com/x/web-interface/view", {
      params: { bvid },
    });
    const title = response.data?.data?.title;
    return typeof title === "string" && title.trim() ? title.trim() : `视频 ${bvid}`;
  } catch {
    return `视频 ${bvid}`;
  }
}

export async function addDownloadHistory(
  payload: AddDownloadHistoryPayload,
): Promise<DownloadHistoryItem[]> {
  const shareLink = payload.shareLink.trim();
  if (!shareLink || shareLink.length > 4096 || !isHistoryType(payload.type)) {
    throw new Error("无效的历史记录参数");
  }

  let title = payload.title?.trim() ?? "";
  if (!title && payload.type === "video" && payload.bvid) {
    title = await resolveVideoTitle(payload.bvid);
  }
  if (!title) title = "未命名内容";

  const existing = getDownloadHistory();
  const previous = existing.find((item) => item.shareLink === shareLink);
  const item: DownloadHistoryItem = {
    id: previous?.id ?? randomUUID(),
    shareLink,
    title: title.slice(0, 300),
    type: payload.type,
    createdAt: new Date().toISOString(),
  };
  const next = [item, ...existing.filter((entry) => entry.shareLink !== shareLink)]
    .slice(0, MAX_HISTORY_ITEMS);
  writeHistory(next);
  return next;
}

export function deleteDownloadHistory(id: string): DownloadHistoryItem[] {
  if (!id) throw new Error("无效的历史记录 ID");
  const next = getDownloadHistory().filter((item) => item.id !== id);
  writeHistory(next);
  return next;
}

export function clearDownloadHistory(): DownloadHistoryItem[] {
  writeHistory([]);
  return [];
}
