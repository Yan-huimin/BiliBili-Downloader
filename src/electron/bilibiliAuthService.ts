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

function createHeaders(referer = BILI_WWW_URL, cookie?: string) {
  return {
    "User-Agent": userAgent,
    Referer: referer,
    ...(cookie ? { Cookie: cookie } : {}),
  };
}

async function hasSessdataCookie() {
  const cookies = await jar.getCookies(BILI_WWW_URL);
  return cookies.some((cookie) => cookie.key === "SESSDATA");
}

async function visitLoginRedirect(loginUrl: string) {
  await client.get(loginUrl, {
    maxRedirects: 10,
    validateStatus: (status) => status >= 200 && status < 400,
    headers: createHeaders(PASSPORT_URL),
  });
}

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

async function syncLoginCookies(loginUrl: string) {
  await visitLoginRedirect(loginUrl);

  if (await hasSessdataCookie()) {
    return true;
  }

  console.warn("[bilibiliAuth] redirect did not set SESSDATA, fallback to URL cookies");
  await setCookiesFromLoginUrl(loginUrl);

  return hasSessdataCookie();
}

export async function getQrLoginInfo(): Promise<QRInfo> {
  const response = await client.get(QR_GENERATE_URL);
  return response.data.data;
}

export async function restoreBiliLoginFromStorage() {
  const hasStoredCookies = await loadCookiesIntoJar(jar);

  if (!hasStoredCookies) {
    await saveCookies(jar);
    return false;
  }

  const cookie = await getBiliCookieString(jar);
  return cookie.includes("SESSDATA");
}

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

export async function checkBiliLogin() {
  const userInfo = await getBiliUserInfo();
  return userInfo?.isLogin === true;
}

export async function logoutBili() {
  try {
    const response = await client.post(LOGOUT_URL);
    return response.data?.code === 0;
  } finally {
    await clearBiliLoginCookies(jar);
  }
}
