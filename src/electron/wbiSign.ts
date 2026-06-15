import md5 from "md5";
import { client } from "./bilibiliClient.js";

const mixinKeyEncTab: readonly number[] = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
  33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40,
  61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11,
  36, 20, 34, 44, 52,
];

function getMixinKey(orig: string): string {
  return mixinKeyEncTab.map((n) => orig[n]).join("").slice(0, 32);
}

function encWbi(
  params: Record<string, unknown>,
  img_key: string,
  sub_key: string
): string {
  const mixin_key = getMixinKey(img_key + sub_key);
  const curr_time = Math.round(Date.now() / 1000);
  const chr_filter = /[!'()*]/g;

  const signedParams: Record<string, string> = { wts: String(curr_time) };
  for (const [k, v] of Object.entries(params)) {
    signedParams[k] = String(v ?? "");
  }

  const query = Object.keys(signedParams)
    .sort()
    .map((key) => {
      const value = signedParams[key].replace(chr_filter, "");
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    })
    .join("&");

  const w_rid = md5(query + mixin_key);
  return `${query}&w_rid=${w_rid}`;
}

async function getWbiKeys(): Promise<{
  img_key: string;
  sub_key: string;
} | null> {
  try {
    const res = await client.get(
      "https://api.bilibili.com/x/web-interface/nav"
    );

    const wbiImg = res.data?.data?.wbi_img;
    if (!wbiImg?.img_url || !wbiImg?.sub_url) {
      return null;
    }

    const img_url: string = wbiImg.img_url;
    const sub_url: string = wbiImg.sub_url;

    return {
      img_key: img_url.slice(
        img_url.lastIndexOf("/") + 1,
        img_url.lastIndexOf(".")
      ),
      sub_key: sub_url.slice(
        sub_url.lastIndexOf("/") + 1,
        sub_url.lastIndexOf(".")
      ),
    };
  } catch {
    return null;
  }
}

export { encWbi, getWbiKeys };
