import { session } from "electron";
import fs from "fs";
import { CookieJar, type SerializedCookieJar } from "tough-cookie";
import { getCookiesPath } from "./pathResolver.js";

const BILI_API_COOKIE_URL = "https://api.bilibili.com/";

/**
 * 检查本地 Cookie 持久化文件是否存在。
 * @returns 文件存在返回 true，否则返回 false。
 */
function isCookiesFileExists(): boolean {
  return fs.existsSync(getCookiesPath());
}

/**
 * 从本地文件读取序列化的 Cookie 数据。
 * @returns 反序列化前的 CookieJar JSON 对象，文件不存在或读取失败时返回 null。
 */
function readCookiesFile(): SerializedCookieJar | null {
  const cookiesPath = getCookiesPath();

  if (!fs.existsSync(cookiesPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(cookiesPath, "utf-8")) as SerializedCookieJar;
  } catch (error) {
    console.error("[cookieStore] failed to read cookies:", error);
    return null;
  }
}

/**
 * 从本地文件加载 Cookie 并反序列化为新的 CookieJar 实例。
 * @returns 包含已存储 Cookie 的新 CookieJar，文件不存在或反序列化失败时返回 null。
 */
export async function loadCookies(): Promise<CookieJar | null> {
  const data = readCookiesFile();

  if (!data) {
    return null;
  }

  try {
    return CookieJar.deserialize(data);
  } catch (error) {
    console.error("[cookieStore] failed to deserialize cookies:", error);
    return null;
  }
}

/**
 * 将本地文件中持久化的 Cookie 加载到指定的 CookieJar 实例中。
 * 会先清空目标 Jar 再写入，避免重复。
 * @param targetJar - 要写入 Cookie 的目标 CookieJar 实例。
 * @returns 是否成功加载并写入 Cookie。
 */
export async function loadCookiesIntoJar(targetJar: CookieJar) {
  const data = readCookiesFile();

  if (!data) {
    return false;
  }

  try {
    targetJar.removeAllCookiesSync();
    CookieJar.deserializeSync(data, targetJar.store);
    return true;
  } catch (error) {
    console.error("[cookieStore] failed to restore cookies:", error);
    return false;
  }
}

/**
 * 确保本地 Cookie 持久化文件已创建。
 * 若文件不存在，则用当前 CookieJar 的状态初始化一个新文件。
 * @param jar - 用于初始化文件的 CookieJar 实例。
 */
export async function ensureCookiesFile(jar: CookieJar) {
  if (!isCookiesFileExists()) {
    await saveCookies(jar);
  }
}

/**
 * 将 CookieJar 中的 Cookie 序列化并写入本地持久化文件。
 * @param jar - 要持久化的 CookieJar 实例。
 */
export async function saveCookies(jar: CookieJar) {
  const serialized = await jar.serialize();
  fs.writeFileSync(getCookiesPath(), JSON.stringify(serialized, null, 2), "utf-8");
}

/**
 * 清空本地 Cookie 持久化文件（写入空 Cookie 数组）。
 * 注意：此方法仅清空文件，不影响传入的 CookieJar 内存实例。
 * @param jar - 用于序列化空结构的 CookieJar 实例。
 */
export async function clearCookiesFile(jar: CookieJar) {
  const empty = await jar.serialize();
  empty.cookies = [];
  fs.writeFileSync(getCookiesPath(), JSON.stringify(empty, null, 2), "utf-8");
}

/**
 * 清空内存中的 CookieJar 实例（移除所有 Cookie）。
 * @param jar - 要清空的 CookieJar 实例。
 */
export function clearCookieJar(jar: CookieJar) {
  jar.removeAllCookiesSync();
}

/**
 * 清除 Electron 默认会话中所有存储的 Cookie。
 * 遍历所有 Cookie 并逐一移除。
 */
export async function clearElectronCookies() {
  const allCookies = await session.defaultSession.cookies.get({});

  for (const cookie of allCookies) {
    const domain = cookie.domain ?? "";
    const host = domain.startsWith(".") ? domain.slice(1) : domain;
    const url = `${cookie.secure ? "https" : "http"}://${host}${cookie.path}`;

    try {
      await session.defaultSession.cookies.remove(url, cookie.name);
    } catch (error) {
      console.error("[cookieStore] failed to remove electron cookie:", error);
    }
  }
}

/**
 * 统一清除所有 Bilibili 登录态 Cookie。
 * 依次清除内存 CookieJar、本地持久化文件和 Electron 会话 Cookie。
 * @param jar - 要清除的 CookieJar 实例。
 */
export async function clearBiliLoginCookies(jar: CookieJar) {
  clearCookieJar(jar);
  await clearCookiesFile(jar);
  await clearElectronCookies();
}

/**
 * 从 CookieJar 中获取适用于目标 URL 的 Cookie 字符串。
 * @param jar - 要读取的 CookieJar 实例。
 * @param targetUrl - 目标请求 URL，默认为 https://api.bilibili.com/。
 * @returns 符合目标 URL 域名的 Cookie 键值对字符串。
 */
export async function getBiliCookieString(jar: CookieJar, targetUrl = BILI_API_COOKIE_URL) {
  return jar.getCookieString(targetUrl);
}
