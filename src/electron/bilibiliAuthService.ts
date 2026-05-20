import { client, jar, userAgent } from "./bilibiliClient.js";
import {
  clearBiliLoginCookies,
  getBiliCookieString,
  loadCookiesIntoJar,
  saveCookies,
} from "./cookieStore.js";

const BILI_WWW_URL = "https://www.bilibili.com/";
const BILI_API_URL = "https://api.bilibili.com/";
const PASSPORT_URL = "https://passport.bilibili.com/";
const QR_GENERATE_URL = `${PASSPORT_URL}x/passport-login/web/qrcode/generate`;
const QR_POLL_URL = `${PASSPORT_URL}x/passport-login/web/qrcode/poll`;
const NAV_URL = `${BILI_API_URL}x/web-interface/nav`;
const LOGOUT_URL = `${PASSPORT_URL}login/exit/v2`;

export const QR_LOGIN_CODE = {
  SUCCESS: 0,
  EXPIRED: 86038,
  CONFIRMED: 86090,
  WAITING: 86101,
  ERROR: -1,
} as const;

type BiliNavResponse = {
  code?: number;
  data?: UserInfo;
};

/**
 * 构建请求头信息。
 * @param referer - 请求来源页面 URL，默认为 Bilibili 主站地址。
 * @param cookie - 可选的 Cookie 字符串，用于已登录状态的请求。
 * @returns 包含 User-Agent、Referer 和可选 Cookie 的请求头对象。
 */
function createHeaders(referer = BILI_WWW_URL, cookie?: string) {
  return {
    "User-Agent": userAgent,
    Referer: referer,
    ...(cookie ? { Cookie: cookie } : {}),
  };
}

/**
 * 检查 CookieJar 中是否存在 SESSDATA 键。
 * SESSDATA 是 Bilibili 登录态的核心凭证，存在即视为已登录。
 * @returns 是否包含 SESSDATA 键的布尔值。
 */
async function hasSessdataCookie() {
  const cookies = await jar.getCookies(BILI_WWW_URL);
  return cookies.some((cookie) => cookie.key === "SESSDATA");
}

/**
 * 访问登录重定向 URL，使服务器通过 Set-Cookie 响应头设置 Cookie。
 * @param loginUrl - Bilibili 登录成功后的重定向 URL。
 */
async function visitLoginRedirect(loginUrl: string) {
  await client.get(loginUrl, {
    maxRedirects: 10,
    validateStatus: (status) => status >= 200 && status < 400,
    headers: createHeaders(PASSPORT_URL),
  });
}

/**
 * 从登录 URL 的查询参数中提取用户凭证并写入 CookieJar。
 * 提取的字段包括 DedeUserID、DedeUserID__ckMd5、SESSDATA、bili_jct。
 * @param loginUrl - 包含登录凭证查询参数的 URL。
 */
async function setCookiesFromLoginUrl(loginUrl: string) {
  const urlParams = new URL(loginUrl).searchParams;
  const expires = urlParams.get("Expires");
  const expiresPart = expires
    ? `; Expires=${new Date(Number(expires) * 1000).toUTCString()}`
    : "";

  const cookieData: Record<string, string | null> = {
    DedeUserID: urlParams.get("DedeUserID"),
    DedeUserID__ckMd5: urlParams.get("DedeUserID__ckMd5"),
    SESSDATA: urlParams.get("SESSDATA"),
    bili_jct: urlParams.get("bili_jct"),
  };

  for (const [name, value] of Object.entries(cookieData)) {
    if (!value) {
      continue;
    }

    await jar.setCookie(
      `${name}=${value}; Domain=.bilibili.com; Path=/; Secure${expiresPart}`,
      BILI_WWW_URL
    );
  }
}

/**
 * 同步登录 Cookie 到 CookieJar。
 * 先尝试通过访问重定向 URL 让服务器自动写入 Cookie，
 * 若失败则回退到从 URL 参数中手动提取并写入。
 * @param loginUrl - 登录成功后的重定向 URL。
 * @returns 同步是否成功（即 CookieJar 中是否存在 SESSDATA）。
 */
async function syncLoginCookies(loginUrl: string) {
  await visitLoginRedirect(loginUrl);

  if (await hasSessdataCookie()) {
    return true;
  }

  console.warn("[bilibiliAuth] redirect did not set SESSDATA, fallback to URL cookies");
  await setCookiesFromLoginUrl(loginUrl);

  return hasSessdataCookie();
}

/**
 * 向 Bilibili API 请求生成二维码登录信息。
 * @returns 包含二维码 URL 和 qrcode_key 的 QRInfo 对象。
 */
export async function getQrLoginInfo(): Promise<QRInfo> {
  const response = await client.get(QR_GENERATE_URL);
  return response.data.data;
}

/**
 * 从本地存储中恢复 Bilibili 登录态的 Cookie。
 * 将持久化的 Cookie 加载到内存 CookieJar 中，并验证是否存在 SESSDATA。
 * @returns 是否成功恢复有效的登录态（Cookie 中包含 SESSDATA）。
 */
export async function restoreBiliLoginFromStorage() {
  const hasStoredCookies = await loadCookiesIntoJar(jar);

  if (!hasStoredCookies) {
    await saveCookies(jar);
    return false;
  }

  const cookie = await getBiliCookieString(jar);
  return cookie.includes("SESSDATA");
}

/**
 * 轮询 Bilibili 二维码扫码状态。
 * 扫码成功后会自动同步 Cookie 并持久化到本地存储。
 * @param qrcodeKey - 二维码唯一标识 key。
 * @returns 轮询结果码，QR_LOGIN_CODE.SUCCESS (0) 表示扫码成功，其他值表示等待/过期/错误。
 */
export async function pollQrLoginStatus(qrcodeKey: string): Promise<number> {
  const pollResponse = await client.get(QR_POLL_URL, {
    params: { qrcode_key: qrcodeKey },
    headers: createHeaders(PASSPORT_URL),
  });

  const data = pollResponse.data?.data;
  const code = Number(data?.code ?? QR_LOGIN_CODE.ERROR);

  if (code !== QR_LOGIN_CODE.SUCCESS) {
    return code;
  }

  const loginUrl = data?.url;
  if (!loginUrl) {
    console.error("[bilibiliAuth] QR poll succeeded but login URL is empty");
    return QR_LOGIN_CODE.ERROR;
  }

  const cookiesSynced = await syncLoginCookies(loginUrl);
  if (!cookiesSynced) {
    console.error("[bilibiliAuth] SESSDATA is missing after QR login");
    return QR_LOGIN_CODE.ERROR;
  }

  const userInfo = await getBiliUserInfo();
  if (!userInfo?.isLogin) {
    console.error("[bilibiliAuth] nav check failed after QR login");
    return QR_LOGIN_CODE.ERROR;
  }

  await saveCookies(jar);
  return QR_LOGIN_CODE.SUCCESS;
}

/**
 * 获取当前登录用户的 Bilibili 账户信息。
 * 通过 /nav 接口获取用户昵称、头像、VIP 状态等信息。
 * @returns 用户信息对象（含 uname、face、vipStatus、isLogin 字段），未登录或请求失败时返回 null。
 */
export async function getBiliUserInfo(): Promise<UserInfo | null> {
  const cookie = await getBiliCookieString(jar);

  if (!cookie.includes("SESSDATA")) {
    return null;
  }

  const response = await client.get<BiliNavResponse>(NAV_URL, {
    headers: createHeaders(BILI_WWW_URL, cookie),
  });

  const data = response.data?.data;
  return data?.isLogin ? data : null;
}

/**
 * 检查当前 Bilibili 登录状态是否有效。
 * @returns true 表示已登录且会话有效，false 表示未登录或会话已过期。
 */
export async function checkBiliLogin() {
  const userInfo = await getBiliUserInfo();
  return userInfo?.isLogin === true;
}

/**
 * 退出 Bilibili 登录。
 * 向服务器发送退出请求，并清除本地所有 Cookie 数据。
 * @returns 服务端退出请求是否成功（code === 0）。无论成功与否，本地 Cookie 都会被清除。
 */
export async function logoutBili() {
  try {
    const response = await client.post(LOGOUT_URL);
    return response.data?.code === 0;
  } finally {
    await clearBiliLoginCookies(jar);
  }
}
