import { session } from "electron";
import fs from "fs";
import { CookieJar, type SerializedCookieJar } from "tough-cookie";
import { getCookiesPath } from "./pathResolver.js";

const BILI_API_COOKIE_URL = "https://api.bilibili.com/";

function isCookiesFileExists(): boolean {
  return fs.existsSync(getCookiesPath());
}

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

export async function ensureCookiesFile(jar: CookieJar) {
  if (!isCookiesFileExists()) {
    await saveCookies(jar);
  }
}

export async function saveCookies(jar: CookieJar) {
  const serialized = await jar.serialize();
  fs.writeFileSync(getCookiesPath(), JSON.stringify(serialized, null, 2), "utf-8");
}

export async function clearCookiesFile(jar: CookieJar) {
  const empty = await jar.serialize();
  empty.cookies = [];
  fs.writeFileSync(getCookiesPath(), JSON.stringify(empty, null, 2), "utf-8");
}

export function clearCookieJar(jar: CookieJar) {
  jar.removeAllCookiesSync();
}

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

export async function clearBiliLoginCookies(jar: CookieJar) {
  clearCookieJar(jar);
  await clearCookiesFile(jar);
  await clearElectronCookies();
}

export async function getBiliCookieString(jar: CookieJar, targetUrl = BILI_API_COOKIE_URL) {
  return jar.getCookieString(targetUrl);
}
