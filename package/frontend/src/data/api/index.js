// The data layer's public API. The UI never talks to the backend directly: it goes through the bridge hooks,
// which call these functions. Today they are served by the in-memory mock backend; replacing `backend` with an
// HTTP/SSE client against the Go service keeps this surface unchanged.
import * as backend from '../mock/backend.js';
import { stripIllegal, validateTemplate } from '../domain/filename.js';

const LATENCY = { read: [80, 200], write: [160, 320] };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const jitter = ([a, b]) => a + Math.random() * (b - a);
const copy = (v) => (v == null ? v : structuredClone(v));

async function call(kind, fn) {
  await wait(jitter(LATENCY[kind]));
  return copy(fn());
}

/** A pushed value (tasks, connections, settings): subscribe + current snapshot, for useSyncExternalStore. */
function live(topic, read) {
  let snapshot = copy(read());
  const subs = new Set();
  backend.onChange((t) => {
    if (t !== topic) return;
    snapshot = copy(read());
    for (const fn of subs) fn();
  });
  return {
    subscribe: (fn) => { subs.add(fn); return () => subs.delete(fn); },
    getSnapshot: () => snapshot,
  };
}

// ------------------------------------------------------------------ change notifications
/** Topics: library · checklists · connections · tasks · settings */
export const events = { subscribe: (fn) => backend.onChange(fn) };

// ------------------------------------------------------------------ library
export const library = {
  home: () => call('read', backend.getHome),
  platforms: () => call('read', backend.getPlatforms),
  authors: () => call('read', backend.listAuthors),
  author: (id) => call('read', () => backend.getAuthor(id)),
  posts: (authorId, query) => call('read', () => backend.listPosts(authorId, query)),
  post: (id) => call('read', () => backend.getPost(id)),
  recordView: (postId) => call('write', () => backend.recordView(postId)),
  randomPost: (excludeId) => call('read', () => backend.randomPost(excludeId)),
  sampleCovers: (n) => call('read', () => backend.sampleCovers(n)),
  createAuthor: (input) => call('write', () => backend.createAuthor(input)),
  updateAuthor: (id, patch) => call('write', () => backend.updateAuthor(id, patch)),
  createPlatform: (input) => call('write', () => backend.createPlatform(input)),
  createPost: (authorId, input) => call('write', () => backend.createPost(authorId, input)),
  updatePost: (id, patch) => call('write', () => backend.updatePost(id, patch)),
  openFile: (fileId) => call('write', () => backend.openFile(fileId)),
  revealFile: (fileId) => call('write', () => backend.revealFile(fileId)),
};

/** Per-author page settings (sort, columns). Saved optimistically: callers never wait for the write. */
export const views = {
  get: (authorId) => call('read', () => backend.getAuthorView(authorId)),
  save: (authorId, view) => { call('write', () => backend.saveAuthorView(authorId, view)).catch(() => {}); },
};

export const search = {
  query: (text, domains) => call('read', () => backend.search(text, domains)),
};

// ------------------------------------------------------------------ connections
export const connections = {
  ...live('connections', backend.getConnections),
  startLogin: (platformId) => call('write', () => backend.startLogin(platformId)),
  confirmLogin: (platformId) => call('write', () => backend.confirmLogin(platformId)),
  cancelLogin: (platformId) => call('write', () => backend.cancelLogin(platformId)),
  disconnect: (platformId) => call('write', () => backend.disconnect(platformId)),
};

// ------------------------------------------------------------------ tasks
export const tasks = {
  ...live('tasks', backend.getTasks),
  clearHistory: () => call('write', backend.clearTaskHistory),
  cancel: (id) => call('write', () => backend.cancelTask(id)),
};

// ------------------------------------------------------------------ sync
export const sync = {
  scope: () => call('read', backend.getSyncScope),
  checklists: (authorIds) => call('read', () => backend.getChecklists(authorIds)),
  checkStatus: (authorIds) => call('write', () => backend.checkStatus(authorIds)),
  /** type: 'sync' | 'update-check'; items: [{ authorId, remoteId }] */
  submit: (type, items) => call('write', () => backend.submitSync(type, items)),
};

// ------------------------------------------------------------------ export
export const exporter = {
  options: (query) => call('read', () => backend.getExportOptions(query)),
  dayPosts: (query) => call('read', () => backend.getDayPosts(query)),
  preview: (config, opts) => call('read', () => backend.previewExport(config, opts)),
  start: (config) => call('write', () => backend.startExport(config)),
  lastConfig: (scope) => call('read', () => backend.getLastExportConfig(scope)),
  saveConfig: (scope, config) => { call('write', () => backend.saveLastExportConfig(scope, config)).catch(() => {}); },
  pickDirectory: () => call('write', () => backend.pickDirectory('export')),
  /** Free text typed into a file-name template, without the characters a file name cannot hold. */
  filterText: (text) => stripIllegal(text),
  validate: (template) => validateTemplate(template),
};

// ------------------------------------------------------------------ settings
export const settings = {
  ...live('settings', backend.getSettings),
  update: (patch) => call('write', () => backend.updateSettings(patch)),
  pickDatabaseDirectory: () => call('write', () => backend.pickDirectory('database')),
};

// ------------------------------------------------------------------ media
const splitName = (n) => { const i = n.lastIndexOf('.'); return i > 0 ? [n.slice(0, i), n.slice(i + 1).toLowerCase()] : [n, '']; };

/** Bring a local image into the library (the backend stores it); resolves with its served URL and size. */
export async function importImage(file) {
  const url = URL.createObjectURL(file);
  const [width, height] = await new Promise((res) => {
    const img = new Image();
    img.onload = () => res([img.naturalWidth, img.naturalHeight]);
    img.onerror = () => res([0, 0]);
    img.src = url;
  });
  const [name, ext] = splitName(file.name);
  return { url, width, height, name, ext, size: file.size };
}

/** Bring any local file (audio, video, attachment) into the library. */
export async function importFile(file) {
  const [name, ext] = splitName(file.name);
  return { url: URL.createObjectURL(file), name, ext, size: file.size };
}
