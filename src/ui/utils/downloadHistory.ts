export async function recordDownloadHistory(
  payload: AddDownloadHistoryPayload,
): Promise<void> {
  try {
    await window.electron.addDownloadHistory(payload);
  } catch (error) {
    console.error("保存下载历史失败", error);
  }
}
