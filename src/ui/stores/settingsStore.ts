import { useCallback, useSyncExternalStore } from 'react';

export type UserInfoState = {
  head: string;
  uname: string;
  vip: boolean;
};

export const DEFAULT_DOWNLOAD_PATH = 'C:\\Users\\Username\\Downloads';
export const DEFAULT_USER_INFO: UserInfoState = {
  head: 'null',
  uname: '未登录',
  vip: false,
};

const USER_INFO_TTL_MS = 5 * 60 * 1000;

type CachedUserInfo = {
  fetchedAt: number;
  loginStatus: boolean;
  userInfo: UserInfoState;
};

type SettingsSnapshot = {
  settings: Settings | null;
  userInfo: CachedUserInfo | null;
};

let snapshot: SettingsSnapshot = {
  settings: null,
  userInfo: null,
};
let settingsPromise: Promise<Settings> | null = null;
let userInfoPromise: Promise<CachedUserInfo> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function setSnapshot(next: Partial<SettingsSnapshot>) {
  snapshot = { ...snapshot, ...next };
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return snapshot;
}

export async function loadCachedSettings(force = false) {
  if (!force && snapshot.settings) {
    return snapshot.settings;
  }

  if (!force && settingsPromise) {
    return settingsPromise;
  }

  settingsPromise = window.electron.loadSettings()
    .then((settings) => {
      setSnapshot({ settings });
      return settings;
    })
    .finally(() => {
      settingsPromise = null;
    });

  return settingsPromise;
}

export async function saveCachedSettings(settings: Settings) {
  const savedSettings = await window.electron.setSettings(settings);
  setSnapshot({ settings: savedSettings });
  return savedSettings;
}

export async function loadCachedUserInfo(force = false) {
  const now = Date.now();
  const cached = snapshot.userInfo;

  if (!force && cached && now - cached.fetchedAt < USER_INFO_TTL_MS) {
    return cached;
  }

  if (!force && userInfoPromise) {
    return userInfoPromise;
  }

  userInfoPromise = window.biliApi.getUserInfo()
    .then((info) => {
      const next: CachedUserInfo = info?.isLogin
        ? {
            fetchedAt: Date.now(),
            loginStatus: true,
            userInfo: {
              head: info.face,
              uname: info.uname,
              vip: info.vipStatus === 1,
            },
          }
        : {
            fetchedAt: Date.now(),
            loginStatus: false,
            userInfo: DEFAULT_USER_INFO,
          };

      setSnapshot({ userInfo: next });
      return next;
    })
    .finally(() => {
      userInfoPromise = null;
    });

  return userInfoPromise;
}

export function resetCachedUserInfo() {
  setSnapshot({
    userInfo: {
      fetchedAt: Date.now(),
      loginStatus: false,
      userInfo: DEFAULT_USER_INFO,
    },
  });
}

export function invalidateCachedUserInfo() {
  setSnapshot({ userInfo: null });
}

export function useSettingsStore() {
  const currentSnapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return {
    settings: currentSnapshot.settings,
    cachedUserInfo: currentSnapshot.userInfo,
    loadSettings: useCallback((force = false) => loadCachedSettings(force), []),
    loadUserInfo: useCallback((force = false) => loadCachedUserInfo(force), []),
    resetUserInfo: useCallback(resetCachedUserInfo, []),
    saveSettings: useCallback(saveCachedSettings, []),
  };
}
