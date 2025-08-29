// biliClient.ts
import axios from "axios";
import { wrapper } from "axios-cookiejar-support";
import { loadCookies } from "./utils.js";
import { CookieJar } from "tough-cookie";

export const jar = await loadCookies() || new CookieJar();

const headers = {
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36",
  Referer: "https://www.bilibili.com",
  Origin: "https://www.bilibili.com",
};

export const client = wrapper(
  axios.create({
    jar,
    withCredentials: true,
    headers,
  })
);
