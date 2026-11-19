// Who may open the library, and from where: password login, server mode, MCP keys and the first-run setup.
// The Go service keeps these in config.toml (the password and keys only as hashes) and checks the session cookie;
// the mock keeps them in the browser. Changes are announced on the 'access' and 'mcp' topics.
import { emit, getConfig, patchConfig, currentLibrary } from './backend.js';
import { hasSession, setSession } from './persist.js';
import { daysAgo, isoOf } from './seed.js';
import { hashString } from '../domain/random.js';

const nowIso = () => isoOf(new Date());
const MIN_PASSWORD = 4;
const port = () => Number(typeof location !== 'undefined' && location.port) || 80;

// ------------------------------------------------------------------ server mode
// The service reads server mode when it starts, so turning it on or off waits for a restart. A page load stands in
// for one here: what was saved before it is what "runs".
const RUNNING_SERVER = getConfig().server.enabled;
const INTERFACES = [
  { id: 'wlan', kind: 'wifi', name: 'Wi-Fi', ip: '192.168.1.23' },
  { id: 'eth', kind: 'ethernet', name: 'Ethernet', ip: '10.0.0.86' },
];

export function getAccess() {
  const c = getConfig();
  const keys = mcpKeys();
  const lastUsed = keys.map((k) => k.lastUsedAt).filter(Boolean).sort().pop() ?? null;
  return {
    locked: c.password.enabled && !hasSession(),
    firstRun: !c.setupDone,
    password: { enabled: c.password.enabled, changedAt: c.password.changedAt, minLength: MIN_PASSWORD },
    server: {
      enabled: c.server.enabled, running: RUNNING_SERVER, port: port(),
      addresses: INTERFACES.map((i) => ({ ...i, url: `http://${i.ip}:${port()}` })),
    },
    mcp: { enabled: c.mcp.enabled, endpoint: `http://127.0.0.1:${port()}/mcp`, keys: keys.length, lastUsedAt: lastUsed },
  };
}

// ------------------------------------------------------------------ password login
let failures = 0, blockedUntil = 0;

/** → { ok } | { ok: false, retryIn? } — five wrong tries in a row wait 30 seconds. */
export function login(password) {
  const c = getConfig();
  const now = Date.now();
  if (now < blockedUntil) return { ok: false, retryIn: Math.ceil((blockedUntil - now) / 1000) };
  if (c.password.enabled && password !== c.password.secret) {
    if (++failures >= 5) { failures = 0; blockedUntil = now + 30_000; return { ok: false, retryIn: 30 }; }
    return { ok: false };
  }
  failures = 0;
  setSession(true);
  emit('access');
  return { ok: true };
}

export function lock() { setSession(false); emit('access'); }

/** Turn password login on (no `current` needed) or change the password. Takes effect as soon as it is saved. */
export function setPassword({ current, next }) {
  const c = getConfig();
  if (c.password.enabled && current !== c.password.secret) return { ok: false, error: 'wrong' };
  if (!next || next.length < MIN_PASSWORD) return { ok: false, error: 'tooShort' };
  patchConfig({ password: { enabled: true, secret: next, changedAt: nowIso() } });
  setSession(true);                              // whoever set it stays signed in here
  emit('access');
  return { ok: true };
}

export function disablePassword(current) {
  const c = getConfig();
  if (c.password.enabled && current !== c.password.secret) return { ok: false, error: 'wrong' };
  patchConfig({ password: { enabled: false, secret: null, changedAt: null } });
  emit('access');
  return { ok: true };
}

// ------------------------------------------------------------------ server mode & MCP service
export function setServer(enabled) { patchConfig({ server: { ...getConfig().server, enabled: !!enabled } }); emit('access'); }
export function setMcp(enabled) { patchConfig({ mcp: { ...getConfig().mcp, enabled: !!enabled } }); emit('access'); emit('mcp'); }

// ------------------------------------------------------------------ MCP keys
/** Every permission a key can hold; off unless granted. */
export const PERMISSIONS = {
  platform: ['query', 'create', 'edit', 'delete'],
  author: ['query', 'create', 'edit', 'delete'],
  post: ['view', 'create', 'editMeta', 'editContent', 'delete'],
};
const grant = (on) => ({
  platform: Object.fromEntries(PERMISSIONS.platform.map((p) => [p, on.includes(`platform.${p}`)])),
  author: Object.fromEntries(PERMISSIONS.author.map((p) => [p, on.includes(`author.${p}`)])),
  post: Object.fromEntries(PERMISSIONS.post.map((p) => [p, on.includes(`post.${p}`)])),
  export: on.includes('export'),
});

const SAMPLE_KEYS = () => [
  { id: 'k_desktop', name: 'Claude Desktop', last4: '7f3a', secret: 'pp_sample_desktop_7f3a', createdAt: daysAgo(46, 22, 8), lastUsedAt: daysAgo(1, 23, 41),
    scope: { authorIds: currentLibrary().authors.map((a) => a.id), future: true }, permissions: grant(['platform.query', 'author.query', 'post.view']) },
  { id: 'k_tidy', name: '整理脚本', last4: 'c21e', secret: 'pp_sample_tidy_c21e', createdAt: daysAgo(19, 20, 55), lastUsedAt: daysAgo(6, 21, 12),
    scope: { authorIds: ['a_kotori', 'a_noa', 'a_akari', 'a_mizuha', 'a_hiyori', 'a_sora'], future: false },
    permissions: grant(['platform.query', 'author.query', 'author.edit', 'post.view', 'post.editMeta', 'export']) },
  { id: 'k_cursor', name: 'Cursor', last4: '90bd', secret: 'pp_sample_cursor_90bd', createdAt: daysAgo(4, 15, 30), lastUsedAt: null,
    scope: { authorIds: ['a_linden', 'a_mossy', 'a_clem'], future: true },
    permissions: grant(['platform.query', 'author.query', 'post.view', 'post.create', 'post.editMeta', 'post.editContent']) },
];

function mcpKeys() {
  const c = getConfig();
  if (!c.mcp.keys) patchConfig({ mcp: { ...c.mcp, keys: SAMPLE_KEYS() } });
  return getConfig().mcp.keys;
}
const saveKeys = (keys) => { patchConfig({ mcp: { ...getConfig().mcp, keys } }); emit('mcp'); emit('access'); };
const keyView = ({ secret, ...k }) => k;   // the secret never leaves
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
function newSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return `pp_${[...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join('')}`;
}
const clean = (input) => ({
  name: String(input.name ?? '').trim(),
  scope: { authorIds: [...new Set(input.scope?.authorIds ?? [])], future: !!input.scope?.future },
  permissions: grant([
    ...Object.entries(PERMISSIONS).flatMap(([cat, list]) => list.filter((p) => input.permissions?.[cat]?.[p]).map((p) => `${cat}.${p}`)),
    ...(input.permissions?.export ? ['export'] : []),
  ]),
});

export const listKeys = () => mcpKeys().map(keyView);

/** → { key, secret } — the full secret is handed out only here and on regenerate. */
export function createKey(input) {
  const secret = newSecret();
  const k = { id: `k_${hashString(`${secret}|${Date.now()}`).toString(36)}`, ...clean(input), secret, last4: secret.slice(-4), createdAt: nowIso(), lastUsedAt: null };
  if (!k.name) return { ok: false, error: 'name' };
  saveKeys([...mcpKeys(), k]);
  return { ok: true, key: keyView(k), secret };
}
export function updateKey(id, input) {
  const next = clean(input);
  if (!next.name) return { ok: false, error: 'name' };
  const keys = mcpKeys().map((k) => (k.id === id ? { ...k, ...next } : k));
  saveKeys(keys);
  return { ok: true, key: keyView(keys.find((k) => k.id === id)) };
}
export function deleteKey(id) { saveKeys(mcpKeys().filter((k) => k.id !== id)); return { ok: true }; }
export function regenerateKey(id) {
  const secret = newSecret();
  const keys = mcpKeys().map((k) => (k.id === id ? { ...k, secret, last4: secret.slice(-4) } : k));
  saveKeys(keys);
  return { ok: true, key: keyView(keys.find((k) => k.id === id)), secret };
}

// ------------------------------------------------------------------ first launch
/** choices: { password?: string, server: bool, mcp: bool } — anything not chosen stays off. */
export function completeSetup({ password, server, mcp }) {
  if (password) setPassword({ next: password });
  const c = getConfig();
  patchConfig({ setupDone: true, server: { ...c.server, enabled: !!server }, mcp: { ...c.mcp, enabled: !!mcp } });
  emit('access'); emit('mcp');
  return { ok: true };
}
