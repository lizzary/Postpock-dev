// The bridge: React hooks and actions over the data layer. UI components import from here and nowhere else.
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import * as api from '../data/api/index.js';
import { useQuery, useSuspenseQuery, useDebounced, preloadSuspense } from './query.js';

export { useDebounced };
export const FILE_KINDS = api.FILE_KINDS;

// ------------------------------------------------------------------ library
// Page data suspends (see useSuspenseQuery); smaller pieces load in place.
export const useHome = () => useSuspenseQuery('home', api.library.home, ['library', 'connections']);
/** Start loading the home page before it is shown (after signing in), so it opens without a placeholder. */
export const preloadHome = () => preloadSuspense('home', api.library.home, ['library', 'connections']);
export const useAuthor = (id) => useSuspenseQuery(`author:${id}`, () => api.library.author(id), ['library', 'connections', 'checklists']);
export const usePost = (id) => useSuspenseQuery(`post:${id}`, () => api.library.post(id), ['library']);
export function usePosts(authorId, { page, pageSize, sort }) {
  return useSuspenseQuery(`posts:${authorId}:${page}:${pageSize}:${sort}`, () => api.library.posts(authorId, { page, pageSize, sort }), ['library']);
}
export const usePlatforms = () => useQuery('platforms', api.library.platforms, ['library', 'connections']);
export const useAuthorList = () => useQuery('authors', api.library.authors, ['library']);

export const libraryActions = {
  recordView: api.library.recordView,
  randomPost: api.library.randomPost,
  sampleCovers: api.library.sampleCovers,
  createAuthor: api.library.createAuthor,
  updateAuthor: api.library.updateAuthor,
  createPlatform: api.library.createPlatform,
  updatePlatform: api.library.updatePlatform,
  createPost: api.library.createPost,
  updatePost: api.library.updatePost,
  openFile: api.library.openFile,
  revealFile: api.library.revealFile,
  setPlatformOrder: api.library.setPlatformOrder,
  saveHomeView: api.homeView.save,
  importImage: api.importImage,
  importFile: api.importFile,
};

/**
 * Page settings of one author, updated optimistically: the UI changes at once, the save is fire-and-forget,
 * and the stored value is only read again the next time the page loads.
 */
export function useAuthorView(authorId) {
  const { data } = useQuery(authorId ? `view:${authorId}` : null, () => api.views.get(authorId), []);
  const [local, setLocal] = useState(null);
  useEffect(() => { setLocal(null); }, [authorId]);
  const view = local ?? data ?? null;
  const current = useRef(view);
  current.current = view;
  const update = useCallback((patch) => {
    const next = { ...(current.current ?? {}), ...patch };
    setLocal(next);
    api.views.save(authorId, next);
  }, [authorId]);
  return [view, update];
}

// ------------------------------------------------------------------ search
const EMPTY_RESULT = { authors: [], posts: [], total: 0 };
export function useSearch(text, domains) {
  const q = useDebounced(text.trim(), 140);
  const key = q ? `search:${q}:${JSON.stringify(domains)}` : null;
  const res = useQuery(key, () => api.search.query(q, domains), ['library']);
  return { ...res, data: (q && res.data) || EMPTY_RESULT, settledText: q };
}

// ------------------------------------------------------------------ live stores
const useLive = (store) => useSyncExternalStore(store.subscribe, store.getSnapshot);

export const useConnections = () => useLive(api.connections);
export const connectionActions = {
  startLogin: api.connections.startLogin,
  confirmLogin: api.connections.confirmLogin,
  cancelLogin: api.connections.cancelLogin,
  disconnect: api.connections.disconnect,
};

export const useTasks = () => useLive(api.tasks);
export const taskActions = { clearHistory: api.tasks.clearHistory, cancel: api.tasks.cancel };

export const useSettings = () => useLive(api.settings);
export const settingsActions = { update: api.settings.update };
export const folderActions = { roots: api.folders.roots, list: api.folders.list, create: api.folders.create };

// ------------------------------------------------------------------ access: sign-in, server mode, MCP, first run
export const useAccess = () => useLive(api.access);
export const accessActions = {
  login: api.access.login,
  lock: api.access.lock,
  setPassword: api.access.setPassword,
  disablePassword: api.access.disablePassword,
  setServer: api.access.setServer,
  setMcp: api.access.setMcp,
  completeSetup: api.access.completeSetup,
};

// ------------------------------------------------------------------ MCP keys
export const MCP_PERMISSIONS = api.mcp.PERMISSIONS;
export const useMcpKeys = () => useQuery('mcp-keys', api.mcp.keys, ['mcp']);
export const useAuthorDirectory = () => useQuery('author-directory', api.mcp.directory, ['library']);
export const mcpActions = { create: api.mcp.create, update: api.mcp.update, remove: api.mcp.remove, regenerate: api.mcp.regenerate };
export const mcpClientConfig = api.mcp.clientConfig;

// ------------------------------------------------------------------ snapshots (data security)
export const useBackup = () => useQuery('backup', api.backup.overview, ['snapshots', 'library']);
export const useBackupChanges = (id) => useQuery(id ? `backup-changes:${id}` : null, () => api.backup.changes(id), ['snapshots', 'library']);
export const backupActions = {
  create: api.backup.create,
  load: api.backup.load,
  remove: api.backup.remove,
  restore: api.backup.restore,
  exportTo: api.backup.exportTo,
  inspect: api.backup.inspect,
  importFrom: api.backup.importFrom,
};

// ------------------------------------------------------------------ sync
export const useSyncScope = () => useQuery('sync-scope', api.sync.scope, ['library', 'connections', 'checklists']);
export function useChecklists(authorIds) {
  const key = authorIds.length ? `checklists:${[...authorIds].sort().join(',')}` : null;
  return useQuery(key, () => api.sync.checklists(authorIds), ['checklists', 'library']);
}
export const syncActions = { checkStatus: api.sync.checkStatus, submit: api.sync.submit };

// ------------------------------------------------------------------ export
export function useExportOptions(scope, authorIds) {
  const ids = useDebounced(authorIds, 120);
  return useQuery(`export-options:${scope}:${[...ids].sort().join(',')}`, () => api.exporter.options({ scope, authorIds: ids }), ['library']);
}
export function useDayPosts(authorIds, day) {
  return useQuery(day ? `day-posts:${day}:${[...authorIds].sort().join(',')}` : null, () => api.exporter.dayPosts({ authorIds, day }), ['library']);
}
export function useExportPreview(config, maxPerDir) {
  const debounced = useDebounced(config, 160);
  const key = debounced ? `export-preview:${maxPerDir}:${JSON.stringify(debounced)}` : null;
  return useQuery(key, () => api.exporter.preview(debounced, { maxPerDir }), ['library']);
}
export const useLastExportConfig = (scope) => useQuery(`export-last:${scope}`, () => api.exporter.lastConfig(scope), []);
export const exportActions = {
  start: api.exporter.start,
  saveConfig: api.exporter.saveConfig,
  filterText: api.exporter.filterText,
  validate: api.exporter.validate,
};

/** Re-run an effect whenever the data layer announces a topic (e.g. to reset state after a database switch). */
export function useDataEvent(topic, fn) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => api.events.subscribe((t) => { if (t === topic) ref.current(); }), [topic]);
}
