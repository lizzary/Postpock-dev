// Stand-ins for the backend's storage: config.toml (app settings) and the per-database settings tables.
// Browser storage keeps the mock's settings across reloads; any failure just means starting fresh.

const CONFIG_KEY = 'postpock.mock.config';
const dbKey = (path) => `postpock.mock.db:${path}`;

function read(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? { ...fallback, ...JSON.parse(raw) } : fallback; } catch { return fallback; }
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable: keep in memory only */ }
}

export const DEFAULT_DB_PATH = 'D:\\PostPock\\data';

export function loadConfig() {
  const sysDark = typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
  return read(CONFIG_KEY, { language: 'zh-CN', theme: sysDark ? 'dark' : 'light', dbPath: DEFAULT_DB_PATH, syncThreads: 4 });
}
export const saveConfig = (cfg) => write(CONFIG_KEY, cfg);

/** Page settings, last export configurations and the last viewed post of one database. */
export function loadDbPrefs(path) {
  return read(dbKey(path), { views: {}, exports: {}, lastViewed: null });
}
export const saveDbPrefs = (path, prefs) => write(dbKey(path), prefs);
