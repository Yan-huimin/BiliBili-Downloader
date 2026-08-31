import fs from "fs";
import { getDefaultVideoPath, getSettingsPath } from "./pathResolver.js";

const DEFAULT_CLOSE_BEHAVIOR: CloseBehavior = "hide-to-tray";
let cachedSettings: Settings | null = null;

function getDefaultSettings(): Settings {
  return {
    videoQuality: 64,
    downloadPath: getDefaultVideoPath(),
    systemNotification: false,
    fireworkParticles: false,
    closeBehavior: DEFAULT_CLOSE_BEHAVIOR,
  };
}

function normalizeSettings(value: unknown): Settings {
  const defaults = getDefaultSettings();
  if (!value || typeof value !== "object") return defaults;
  const source = value as Partial<Settings>;
  return {
    videoQuality: source.videoQuality === null || typeof source.videoQuality === "number"
      ? source.videoQuality : defaults.videoQuality,
    downloadPath: typeof source.downloadPath === "string" && source.downloadPath.trim()
      ? source.downloadPath : defaults.downloadPath,
    systemNotification: typeof source.systemNotification === "boolean"
      ? source.systemNotification : defaults.systemNotification,
    fireworkParticles: typeof source.fireworkParticles === "boolean"
      ? source.fireworkParticles : defaults.fireworkParticles,
    closeBehavior: source.closeBehavior === "quit" || source.closeBehavior === "hide-to-tray"
      ? source.closeBehavior : defaults.closeBehavior,
  };
}

function writeSettings(settings: Settings): void {
  fs.writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2), "utf-8");
}

export function ensureSettingsFile(): Settings {
  const settingsPath = getSettingsPath();
  if (!fs.existsSync(settingsPath)) {
    const defaults = getDefaultSettings();
    writeSettings(defaults);
    cachedSettings = defaults;
    return defaults;
  }
  try {
    const settings = normalizeSettings(JSON.parse(fs.readFileSync(settingsPath, "utf-8")));
    writeSettings(settings);
    cachedSettings = settings;
    return settings;
  } catch {
    const defaults = getDefaultSettings();
    writeSettings(defaults);
    cachedSettings = defaults;
    return defaults;
  }
}

export function loadSettings(): Settings {
  return cachedSettings ?? ensureSettingsFile();
}

export function saveSettings(value: unknown): Settings {
  const settings = normalizeSettings(value);
  writeSettings(settings);
  cachedSettings = settings;
  return settings;
}

export function getCloseBehavior(): CloseBehavior {
  return loadSettings().closeBehavior;
}
