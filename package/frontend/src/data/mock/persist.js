// Stand-ins for the backend's storage: config.toml (app settings) and the per-database settings tables.
// Browser storage keeps the mock's settings across reloads; any failure just means starting fresh.

const CONFIG_KEY = 'postpock.mock.config';
const SESSION_KEY = 'postpock.mock.session';
const dbKey = (path) => `postpock.mock.db:${path}`;

function read(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? { ...fallback, ...JSON.parse(raw) } : fallback; } catch { return fallback; }
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable: keep in memory only */ }
}

export const DEFAULT_DB_PATH = 'D:\\PostPock\\data';

/**
 * config.toml. The mock keeps the password itself so it can check it; the Go service stores only a hash.
 * `?first-run` in the address shows the first-launch setup again.
 */
export function loadConfig() {
  const sysDark = typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
  const cfg = read(CONFIG_KEY, {
    language: 'en', theme: sysDark ? 'dark' : 'light', dbPath: DEFAULT_DB_PATH, syncThreads: 4,
    setupDone: false,
    password: { enabled: false, secret: null, changedAt: null },
    server: { enabled: false },
    mcp: { enabled: false, keys: null },
  });
  if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('first-run')) cfg.setupDone = false;
  return cfg;
}
export const saveConfig = (cfg) => write(CONFIG_KEY, cfg);

/** Page settings, last export configurations and the last viewed post of one database. */
export function loadDbPrefs(path) {
  return read(dbKey(path), { views: {}, exports: {}, lastViewed: null });
}
export const saveDbPrefs = (path, prefs) => write(dbKey(path), prefs);

/** A signed-in browser tab (the Go service uses a session cookie). */
export function hasSession() {
  try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch { return false; }
}
export function setSession(on) {
  try { if (on) sessionStorage.setItem(SESSION_KEY, '1'); else sessionStorage.removeItem(SESSION_KEY); } catch { /* per page load only */ }
}
