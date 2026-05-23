/**
 * 从分享链接中提取 BV 号。
 */
export function extractBV(url: string): string | null {
  const match = url.match(/BV([a-zA-Z0-9]+)/);
  return match ? `BV${match[1]}` : null;
}

/**
 * 从分享链接中提取 ep 号。
 */
export function extractEpId(url: string): number | null {
  const match = url.match(/ep(\d+)/i);
  return match ? Number(match[1]) : null;
}

/**
 * 判断分享链接的视频标识类型。
 */
export function getShareLinkType(url: string): ShareLinkType {
  const hasBv = extractBV(url) !== null;
  const hasEp = extractEpId(url) !== null;

  if (hasBv && hasEp) return 'both';
  if (hasBv) return 'bv';
  if (hasEp) return 'ep';
  return 'none';
}

/**
 * 校验分享链接：同时包含 BV 和 ep 号时返回错误。
 */
export function validateShareLink(url: string):
  | { valid: true; type: 'bv'; id: string }
  | { valid: true; type: 'ep'; id: number }
  | { valid: false; error: string } {
  const type = getShareLinkType(url);

  if (type === 'both') {
    return { valid: false, error: '分享链接同时包含BV号和ep号，请只输入其中一个' };
  }

  if (type === 'bv') {
    return { valid: true, type: 'bv', id: extractBV(url)! };
  }

  if (type === 'ep') {
    return { valid: true, type: 'ep', id: extractEpId(url)! };
  }

  return { valid: false, error: '无法识别分享链接中的视频标识' };
}
