// biliClient.ts
import axios from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";

export const jar = new CookieJar();

export const userAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export const client = wrapper(
  axios.create({
    jar,
    withCredentials: true,
    timeout: 15000,
    maxRedirects: 10,
    proxy: false,
    headers: {
      "User-Agent": userAgent,
      Referer: "https://www.bilibili.com/",
    },
  })
);
