// The mock backend: everything the Go service will provide, simulated in memory.
// Methods return plain data (the API layer copies it and adds latency); changes are announced through onChange().
import { kindOfExt } from '../domain/fileKinds.js';
import { seedLibrary, buildPost, BUILTIN_PLATFORMS, daysAgo, isoOf } from './seed.js';
import { loadConfig, saveConfig, loadDbPrefs, saveDbPrefs, DEFAULT_DB_PATH } from './persist.js';
import { customKeys, AGG_GROUPS, DATA_GROUPS, DATE_FORMAT_LABEL, pickLang } from '../domain/keys.js';
import { selectFiles, planTree } from '../domain/exportPlan.js';
import { searchLibrary, norm } from '../domain/search.js';
import { hashString } from '../domain/random.js';

// ------------------------------------------------------------------ change feed
const listeners = new Set();
export const emit = (topic) => { for (const fn of listeners) fn(topic); };
export const onChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
let libTimer = null;
const emitLibrarySoon = () => { if (!libTimer) libTimer = setTimeout(() => { libTimer = null; emit('library'); }, 700); };

// ------------------------------------------------------------------ libraries (one per database directory)
let config = loadConfig();
const libraries = new Map();
const nowIso = () => isoOf(new Date());

/** config.toml, for the other parts of the mock (access, snapshots). */
export const getConfig = () => config;
export function patchConfig(patch) { config = { ...config, ...patch }; saveConfig(config); }

function emptyLibrary() {
  let p = 5000, f = 50000;
  return { platforms: [], authors: [], posts: [], files: [], remote: {}, checklists: {}, specs: {}, nextPostId: () => `p_${++p}`, nextFileId: () => `f_${++f}` };
}
function initialConnections(seededLib) {
  if (!seededLib) return Object.fromEntries(BUILTIN_PLATFORMS.map((p) => [p.id, { status: 'disconnected' }]));
  return {
    fanbox: { status: 'connected', account: 'mio_collects', since: daysAgo(15, 21, 2) },
    fantia: { status: 'expired', account: 'mio_collects', since: daysAgo(64, 20, 31) },
    patreon: { status: 'disconnected' },
    x: { status: 'disconnected' },
  };
}

function indexLibrary(L) {
  L.authorsById = new Map(L.authors.map((a) => [a.id, a]));
  L.postsById = new Map(L.posts.map((p) => [p.id, p]));
  L.filesById = new Map(L.files.map((f) => [f.id, f]));
  L.postsByAuthor = new Map(L.authors.map((a) => [a.id, []]));
  for (const p of L.posts) L.postsByAuthor.get(p.authorId)?.push(p);
  for (const list of L.postsByAuthor.values()) list.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  L.filesByPost = new Map();
  for (const f of L.files) { if (!L.filesByPost.has(f.postId)) L.filesByPost.set(f.postId, []); L.filesByPost.get(f.postId).push(f); }
  L.docs = null;
}

function openLibrary(path) {
  let L = libraries.get(path);
  if (!L) {
    const seededLib = path === DEFAULT_DB_PATH;
    L = { path, seeded: seededLib, ...(seededLib ? seedLibrary() : emptyLibrary()), prefs: loadDbPrefs(path), connections: initialConnections(seededLib), edits: newEdits() };
    indexLibrary(L);
    // the sample library remembers a post you were reading earlier today
    if (seededLib && !L.prefs.lastViewed) L.prefs.lastViewed = { postId: L.postsByAuthor.get('a_kotori')?.[1]?.id, at: daysAgo(0, Math.max(0, new Date().getHours() - 2), 14) };
    libraries.set(path, L);
    if (seededLib) seedTasks(L);
  }
  return L;
}
const lib = () => openLibrary(config.dbPath);
const savePrefs = (L) => { L.edits.prefs = true; saveDbPrefs(L.path, L.prefs); };
export { lib as currentLibrary, indexLibrary as reindex };

/**
 * What changed since the library last matched a snapshot: the earlier values of edited posts and authors, and
 * whether page settings changed. Added and removed items are found by comparing with the snapshot itself.
 */
function newEdits() { return { posts: new Map(), authors: new Map(), prefs: false }; }
const POST_FIELDS = ['title', 'subtitle', 'publishedAt', 'archivedAt'];
const AUTHOR_FIELDS = ['platformId', 'name', 'handle', 'url', 'bio', 'avatar', 'banner', 'cover', 'coverFocus'];
const pick = (o, keys) => Object.fromEntries(keys.map((k) => [k, o[k]]));
function noteEdit(map, item, fields) { if (!map.has(item.id)) map.set(item.id, pick(item, fields)); }
export { newEdits };

// ------------------------------------------------------------------ views of the data
/** Platforms in the user's order (set by dragging on the home page); ones never placed keep their default order. */
/** Built-in platforms with the user's own name, colour, icon and links on top (their connector stays the same). */
const builtins = (L) => BUILTIN_PLATFORMS.map((p) => ({ ...p, ...L.platformEdits?.[p.id] }));
function platformsOf(L) {
  const all = [...builtins(L), ...L.platforms];
  const order = L.prefs.platformOrder;
  if (!order?.length) return all;
  const at = new Map(order.map((id, i) => [id, i]));
  return all.map((p, i) => [p, at.has(p.id) ? at.get(p.id) : order.length + i]).sort((a, b) => a[1] - b[1]).map(([p]) => p);
}
const platformById = (L, id) => platformsOf(L).find((p) => p.id === id);
const authorUrl = (L, a) => a.url || (platformById(L, a.platformId)?.authorUrl || '').replace('{handle}', a.handle);

function platformView(L, p) {
  const c = p.kind === 'builtin' ? L.connections[p.id] : null;
  return { id: p.id, name: p.name, kind: p.kind, color: p.color, site: p.site, authorUrl: p.authorUrl ?? '', icon: p.icon ?? null, connection: c ? c.status : null };
}
function authorView(L, a) {
  const posts = L.postsByAuthor.get(a.id) ?? [];
  return {
    id: a.id, platformId: a.platformId, name: a.name, handle: a.handle, url: authorUrl(L, a), bio: a.bio,
    avatar: a.avatar, banner: a.banner, cover: a.cover, coverFocus: a.coverFocus ?? null,
    postCount: posts.length, lastPostAt: posts[0]?.publishedAt ?? null,
  };
}
function postView(L, p) {
  const files = L.filesByPost.get(p.id) ?? [];
  const cover = L.filesById.get(p.coverFileId);
  const count = (r) => files.filter((f) => f.resource === r).length;
  return {
    id: p.id, authorId: p.authorId, platformId: p.platformId, remoteId: p.remoteId,
    title: p.title, subtitle: p.subtitle, publishedAt: p.publishedAt, archivedAt: p.archivedAt,
    cover: cover ? { url: cover.url, width: cover.width, height: cover.height } : null,
    counts: { images: count('image'), videos: count('video'), audio: count('audio'), files: count('attachment') },
  };
}
const authorChip = (L, id) => { const a = L.authorsById.get(id); return a ? { id: a.id, name: a.name, avatar: a.avatar, platformId: a.platformId } : null; };

function resolveBlocks(L, post) {
  return post.blocks.map((b) => {
    if (b.fileId) {
      const f = L.filesById.get(b.fileId);
      return { ...b, file: f ? { id: f.id, name: f.name, ext: f.ext, size: f.size, url: f.url, width: f.width, height: f.height, alt: f.alt, poster: f.poster, cover: f.cover } : null };
    }
    if (b.type === 'linkCard' && b.postId) {
      const target = L.postsById.get(b.postId);
      if (!target) return { type: 'linkCard', postId: b.postId, missing: true };
      const cover = L.filesById.get(target.coverFileId);
      const text = target.blocks.find((x) => x.type === 'paragraph')?.children.map((c) => c.text).join('') ?? '';
      return { type: 'linkCard', postId: target.id, title: target.title, description: target.subtitle || text.slice(0, 80), image: cover?.url ?? null };
    }
    return b;
  });
}

// ------------------------------------------------------------------ library endpoints
export function getHome() {
  const L = lib();
  const posts = L.posts;
  const last = L.prefs.lastViewed && L.postsById.get(L.prefs.lastViewed.postId);
  return {
    platforms: platformsOf(L).map((p) => platformView(L, p)),
    authors: L.authors.map((a) => authorView(L, a)),
    view: getHomeView(),
    lastViewed: last ? { post: postView(L, last), author: authorChip(L, last.authorId), viewedAt: L.prefs.lastViewed.at } : null,
    stats: {
      authors: L.authors.length, posts: posts.length, files: L.files.length,
      bytes: L.files.reduce((s, f) => s + f.size, 0),
      thisWeek: posts.filter((p) => p.archivedAt >= daysAgo(7, 0, 0)).length,
    },
  };
}

export function getPlatforms() { const L = lib(); return platformsOf(L).map((p) => platformView(L, p)); }

export function getAuthor(id) {
  const L = lib();
  const a = L.authorsById.get(id);
  if (!a) return null;
  const files = (L.postsByAuthor.get(id) ?? []).flatMap((p) => L.filesByPost.get(p.id) ?? []);
  const cl = L.checklists[id];
  return {
    ...authorView(L, a),
    platform: platformView(L, platformById(L, a.platformId)),
    stats: { files: files.length, bytes: files.reduce((s, f) => s + f.size, 0), checkedAt: cl?.checkedAt ?? null, unsynced: cl ? cl.items.filter((i) => i.status === 'unsynced').length : null },
  };
}

export function listAuthors() { const L = lib(); return L.authors.map((a) => authorChip(L, a.id)); }

/** Every platform and author, with what a picker needs to search and label them (MCP key scopes). */
export function getAuthorDirectory() {
  const L = lib();
  return {
    platforms: platformsOf(L).map((p) => platformView(L, p)),
    authors: L.authors.map((a) => ({ ...authorChip(L, a.id), handle: a.handle, postCount: L.postsByAuthor.get(a.id)?.length ?? 0 })),
  };
}

const SORTS = {
  'published-desc': (a, b) => b.publishedAt.localeCompare(a.publishedAt),
  'published-asc': (a, b) => a.publishedAt.localeCompare(b.publishedAt),
  'archived-desc': (a, b) => b.archivedAt.localeCompare(a.archivedAt),
  title: (a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }),
};
export function listPosts(authorId, { page = 1, pageSize = 12, sort = 'published-desc' } = {}) {
  const L = lib();
  const all = [...(L.postsByAuthor.get(authorId) ?? [])].sort(SORTS[sort] ?? SORTS['published-desc']);
  const pageCount = Math.max(1, Math.ceil(all.length / pageSize));
  const p = Math.min(Math.max(1, page), pageCount);
  return { items: all.slice((p - 1) * pageSize, p * pageSize).map((x) => postView(L, x)), total: all.length, page: p, pageCount, pageSize };
}

export function getPost(id) {
  const L = lib();
  const p = L.postsById.get(id);
  if (!p) return null;
  const siblings = L.postsByAuthor.get(p.authorId) ?? [];
  const k = siblings.indexOf(p);
  const files = L.filesByPost.get(p.id) ?? [];
  return {
    ...postView(L, p),
    lang: p.lang,
    blocks: resolveBlocks(L, p),
    author: authorView(L, L.authorsById.get(p.authorId)),
    platform: platformView(L, platformById(L, p.platformId)),
    size: files.reduce((s, f) => s + f.size, 0),
    newer: k > 0 ? postView(L, siblings[k - 1]) : null,
    older: k >= 0 && k < siblings.length - 1 ? postView(L, siblings[k + 1]) : null,
  };
}

export function recordView(postId) {
  const L = lib();
  if (!L.postsById.has(postId)) return;
  L.prefs.lastViewed = { postId, at: nowIso() };
  saveDbPrefs(L.path, L.prefs);   // reading history is not an edit
}

export function randomPost(excludeId) {
  const L = lib();
  const pool = L.posts.filter((p) => p.id !== excludeId);
  if (!pool.length) return null;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return postView(L, pick);
}

/** A handful of posts to shuffle through while a random pick is being drawn. */
export function sampleCovers(n = 8) {
  const L = lib();
  return [...L.posts].sort(() => Math.random() - 0.5).slice(0, n).map((p) => postView(L, p).cover?.url).filter(Boolean);
}

export function createAuthor(input) {
  const L = lib();
  const id = `a_u${hashString(`${input.name}|${Date.now()}`).toString(36)}`;
  const a = {
    id, platformId: input.platformId, name: input.name.trim(), handle: (input.handle || '').trim(), url: (input.url || '').trim() || null,
    bio: (input.bio || '').trim(), avatar: input.avatar || null, banner: input.banner, cover: input.cover || null, coverFocus: input.coverFocus ?? null,
    createdAt: nowIso(),
  };
  L.authors.push(a);
  indexLibrary(L);
  emit('library');
  return authorView(L, a);
}

export function updateAuthor(id, patch) {
  const L = lib();
  const a = L.authorsById.get(id);
  if (!a) return null;
  noteEdit(L.edits.authors, a, AUTHOR_FIELDS);
  for (const k of AUTHOR_FIELDS) if (k in patch) a[k] = patch[k];
  indexLibrary(L);
  emit('library');
  return getAuthor(id);
}

export function createPlatform(input) {
  const L = lib();
  const id = `custom_${hashString(`${input.name}|${Date.now()}`).toString(36)}`;
  const p = { id, name: input.name.trim(), kind: 'custom', color: input.color, icon: input.icon ?? null, site: (input.site || '').trim(), authorUrl: (input.authorUrl || '').trim(), i18n: {} };
  L.platforms.push(p);
  emit('library');
  return platformView(L, p);
}

const PLATFORM_FIELDS = ['name', 'color', 'icon', 'site', 'authorUrl'];
/** Name, colour, icon and links of any platform. Custom ones change in place; built-in ones keep the change beside them. */
export function updatePlatform(id, patch) {
  const L = lib();
  const clean = Object.fromEntries(PLATFORM_FIELDS.filter((k) => k in patch).map((k) => [k, typeof patch[k] === 'string' && k !== 'icon' ? patch[k].trim() : patch[k] ?? null]));
  if ('name' in clean && !clean.name) return null;
  const custom = L.platforms.find((p) => p.id === id);
  if (custom) Object.assign(custom, clean);
  else if (BUILTIN_PLATFORMS.some((p) => p.id === id)) L.platformEdits = { ...L.platformEdits, [id]: { ...L.platformEdits?.[id], ...clean } };
  else return null;
  emit('library'); emit('connections');
  return platformView(L, platformById(L, id));
}

/** A post added by hand: blocks may carry new files ({ upload: { url, name, ext, size, width, height } }). */
export function createPost(authorId, input) {
  const L = lib();
  const a = L.authorsById.get(authorId);
  if (!a) return null;
  const id = L.nextPostId();
  const files = [];
  let indexInPost = 0, imageIndex = 0;
  const add = (u, resource) => {
    const f = { id: L.nextFileId(), postId: id, name: u.name, ext: u.ext, size: u.size, url: u.url, resource, width: u.width, height: u.height, indexInPost: ++indexInPost, alt: u.name };
    if (resource === 'image') f.imageIndex = ++imageIndex;
    files.push(f);
    return f.id;
  };
  const coverFileId = input.cover ? add(input.cover, 'cover') : null;
  const blocks = input.blocks.map((b) => {
    if (b.type === 'paragraph') return { type: 'paragraph', children: b.children };
    if (b.type === 'linkCard') return { type: 'linkCard', href: b.href || undefined, postId: b.postId || undefined, title: b.title, description: b.description, image: b.image?.url ?? null };
    const resource = b.type === 'file' ? 'attachment' : b.type;
    return { type: b.type, fileId: add(b.upload, resource), caption: b.caption || null, title: b.title };
  });
  const firstImage = files.find((f) => f.resource === 'image');
  const post = {
    id, authorId, platformId: a.platformId, remoteId: input.remoteId || id.slice(2),
    title: input.title.trim(), subtitle: (input.subtitle || '').trim(), publishedAt: input.publishedAt, archivedAt: nowIso(),
    coverFileId: coverFileId ?? firstImage?.id ?? null, custom: { agg: {}, data: {} }, blocks, lang: 'zh',
  };
  L.posts.push(post); L.files.push(...files);
  indexLibrary(L);
  emit('library');
  return postView(L, post);
}

export function updatePost(id, patch) {
  const L = lib();
  const p = L.postsById.get(id);
  if (!p) return null;
  noteEdit(L.edits.posts, p, POST_FIELDS);
  for (const k of POST_FIELDS) if (k in patch) p[k] = patch[k];
  if (patch.cover) {
    const f = { id: L.nextFileId(), postId: id, name: patch.cover.name, ext: patch.cover.ext, size: patch.cover.size, url: patch.cover.url, resource: 'cover', width: patch.cover.width, height: patch.cover.height, indexInPost: 0 };
    L.files = L.files.filter((x) => x.id !== p.coverFileId || x.resource !== 'cover');
    L.files.push(f);
    p.coverFileId = f.id;
  }
  indexLibrary(L);
  emit('library');
  return getPost(id);
}

/** Hand a saved file to the operating system (open with its default app, or show it in File Explorer). */
export function openFile(fileId) { return { ok: lib().filesById.has(fileId) }; }
export function revealFile(fileId) { return { ok: lib().filesById.has(fileId) }; }

// ------------------------------------------------------------------ page settings (optimistic on the client)
export function setPlatformOrder(ids) {
  const L = lib();
  L.prefs.platformOrder = ids.filter((id) => platformById(L, id));
  savePrefs(L);
  emit('library');
  return { ok: true };
}
/** Home page: author sort ('recent' | 'name' | 'posts' | 'custom') and the custom order, per platform. */
const DEFAULT_HOME_VIEW = { sort: 'recent', authorOrder: {} };
export function getHomeView() { return { ...DEFAULT_HOME_VIEW, ...(lib().prefs.home ?? {}) }; }
export function saveHomeView(view) { const L = lib(); L.prefs.home = { ...getHomeView(), ...view }; savePrefs(L); }

const DEFAULT_VIEW = { sort: 'published-desc', columns: 2 };
export function getAuthorView(authorId) { return { ...DEFAULT_VIEW, ...(lib().prefs.views[authorId] ?? {}) }; }
export function saveAuthorView(authorId, view) { const L = lib(); L.prefs.views[authorId] = { ...getAuthorView(authorId), ...view }; savePrefs(L); }

// ------------------------------------------------------------------ search
function searchDocs(L) {
  if (L.docs) return L.docs;
  L.docs = L.posts.map((post) => {
    const body = post.blocks.filter((b) => b.type === 'paragraph').map((b) => b.children.map((c) => c.text).join('')).join(' ');
    const imgs = (L.filesByPost.get(post.id) ?? []).filter((f) => f.resource === 'image' || f.resource === 'cover');
    const imageNames = imgs.map((f) => `${f.name}.${f.ext}`).concat(imgs.map((f) => f.alt).filter(Boolean));
    const title = `${post.title} ${post.subtitle}`;
    return { post, title, body, imageNames, nTitle: norm(title), nBody: norm(body), nImages: norm(imageNames.join(' ')) };
  });
  return L.docs;
}
export function search(text, domains) {
  const L = lib();
  const res = searchLibrary(searchDocs(L), L.authors, text, domains);
  return {
    total: res.total,
    authors: res.authors.map((id) => authorView(L, L.authorsById.get(id))),
    posts: res.posts.map((h) => ({ ...h, post: postView(L, L.postsById.get(h.postId)), author: authorChip(L, L.postsById.get(h.postId).authorId) })),
  };
}

// ------------------------------------------------------------------ connections
export function getConnections() {
  const L = lib();
  return builtins(L).map((p) => ({ platformId: p.id, name: p.name, color: p.color, icon: p.icon ?? null, ...L.connections[p.id] }));
}
export function startLogin(platformId) {
  const c = lib().connections[platformId];
  if (c.status === 'awaiting' || c.status === 'verifying') return;
  c.prev = c.status; c.status = 'awaiting';
  emit('connections');
}
export function cancelLogin(platformId) {
  const c = lib().connections[platformId];
  if (c.status !== 'awaiting') return;
  c.status = c.prev ?? 'disconnected';
  emit('connections');
}
export function confirmLogin(platformId) {
  const L = lib();
  const c = L.connections[platformId];
  if (c.status !== 'awaiting') return;
  c.status = 'verifying';
  emit('connections');
  setTimeout(() => {
    c.status = 'connected'; c.account = c.account || 'mio_collects'; c.since = nowIso(); delete c.prev;
    emit('connections'); emit('library');
  }, 1900);
}
export function disconnect(platformId) {
  const c = lib().connections[platformId];
  c.status = 'disconnected'; delete c.account; delete c.since;
  emit('connections'); emit('library');
}

// ------------------------------------------------------------------ tasks
const tasks = [];
let taskSeq = 100;
let ticker = null;

export function newTask(L, t) {
  const task = { id: `t_${++taskSeq}`, lib: L, state: 'queued', stage: 'queued', processed: 0, total: 0, createdAt: nowIso(), ...t };
  tasks.push(task);
  emit('tasks');
  if (!ticker) ticker = setInterval(tick, 120);
  return task;
}
const threads = () => config.syncThreads;
export function finish(t, state, extra = {}) {
  Object.assign(t, { state, stage: state, finishedAt: nowIso() }, extra);
  emit('tasks'); emit('checklists'); emit('library');
}

/** Other parts of the mock add task types: { firstStage, step(task) } — step is called whenever task.nextAt passes. */
const RUNNERS = {};
export function registerTaskType(type, runner) { RUNNERS[type] = runner; }

// Two lanes, one task at a time in each: library work (sync, checks, export) and snapshot work, which never waits
// behind a long sync.
const LANES = [(x) => !RUNNERS[x.type], (x) => !!RUNNERS[x.type]];
function tick() {
  for (const inLane of LANES) {
    let t = tasks.find((x) => x.state === 'running' && inLane(x));
    if (!t) {
      t = tasks.find((x) => x.state === 'queued' && inLane(x));
      if (!t) continue;
      const first = RUNNERS[t.type]?.firstStage ?? (t.type === 'export' ? 'preparing' : 'connecting');
      Object.assign(t, { state: 'running', stage: first, startedAt: nowIso(), nextAt: Date.now() + (RUNNERS[t.type] ? 500 : 1100) });
      emit('tasks');
      continue;
    }
    if (Date.now() >= t.nextAt) advance(t);
  }
  if (!tasks.some((x) => x.state === 'running' || x.state === 'queued')) { clearInterval(ticker); ticker = null; }
}

function advance(t) {
  if (RUNNERS[t.type]) { RUNNERS[t.type].step(t); return; }
  const L = t.lib;
  if (t.stage === 'connecting') {
    const bad = [...new Set(t.authorIds.map((id) => L.authorsById.get(id)?.platformId))].find((pid) => L.connections[pid]?.status !== 'connected');
    if (bad) return finish(t, 'failed', { error: { code: L.connections[bad]?.status === 'expired' ? 'expired' : 'notConnected', platformId: bad } });
    t.stage = t.type === 'status-check' ? 'listing' : 'downloading';
    t.nextAt = Date.now() + 300; emit('tasks'); return;
  }
  if (t.stage === 'preparing') { t.stage = 'copying'; t.nextAt = Date.now() + 200; emit('tasks'); return; }

  if (t.type === 'status-check') {
    if (t.stage === 'comparing') {
      for (const id of t.authorIds) refreshChecklist(L, id);
      const items = t.authorIds.flatMap((id) => L.checklists[id]?.items ?? []);
      const n = (s) => items.filter((i) => i.status === s).length;
      return finish(t, 'done', { result: { synced: n('synced'), unsynced: n('unsynced'), expired: n('expired') } });
    }
    t.processed++;
    if (t.processed >= t.total) t.stage = 'comparing';
    t.nextAt = Date.now() + 650; emit('tasks'); return;
  }

  if (t.type === 'sync') {
    const it = t.items[t.processed];
    const meta = L.remote[it.authorId]?.find((m) => m.remoteId === it.remoteId);
    if (!meta || meta.status === 'expired') { t.failed = (t.failed ?? 0) + 1; setItemStatus(L, it, 'expired'); }
    else { savePost(L, it.authorId, meta); setItemStatus(L, it, 'synced'); t.saved = (t.saved ?? 0) + 1; }
    t.processed++;
    emitLibrarySoon(); emit('checklists');
    if (t.processed >= t.total) return finish(t, t.saved ? 'done' : 'failed', { result: { saved: t.saved ?? 0, failed: t.failed ?? 0 }, ...(t.saved ? {} : { error: { code: 'nothingSaved' } }) });
    t.nextAt = Date.now() + 1500 / threads(); emit('tasks'); return;
  }

  if (t.type === 'update-check') {
    if (t.stage === 'hashing') {
      const r = { updated: 0, unchanged: 0, missing: 0 };
      for (const it of t.items) {
        const local = L.remote[it.authorId]?.find((m) => m.remoteId === it.remoteId)?.postId;
        if (!local || !L.postsById.has(local)) { r.missing++; setItemStatus(L, it, 'unsynced'); }
        else if (hashString(`${it.remoteId}|${t.id}`) % 100 < 9) { r.updated++; setItemStatus(L, it, 'updated'); }
        else r.unchanged++;
      }
      return finish(t, 'done', { result: r });
    }
    t.processed++;
    if (t.processed >= t.total) t.stage = 'hashing';
    t.nextAt = Date.now() + 900 / threads(); emit('tasks'); return;
  }

  if (t.type === 'export') {
    t.processed = Math.min(t.total, t.processed + Math.max(1, Math.ceil(t.total / 45)));
    if (t.processed >= t.total) return finish(t, 'done', { result: { files: t.total, bytes: t.bytes, dir: t.dir } });
    t.nextAt = Date.now() + 110; emit('tasks');
  }
}

function setItemStatus(L, it, status) {
  const meta = L.remote[it.authorId]?.find((m) => m.remoteId === it.remoteId);
  if (meta && status !== 'updated') meta.status = status;
  const item = L.checklists[it.authorId]?.items.find((i) => i.remoteId === it.remoteId);
  if (item) item.status = status;
}
function savePost(L, authorId, meta) {
  if (meta.postId && L.postsById.has(meta.postId)) return;
  const spec = L.specs[authorId];
  const author = L.authorsById.get(authorId);
  const id = L.nextPostId();
  meta.postId = id;
  const { post, files } = buildPost(spec, author, meta, id, L.nextFileId);
  post.archivedAt = nowIso();
  L.posts.push(post); L.files.push(...files);
  indexLibrary(L);
}
function refreshChecklist(L, authorId) {
  const remote = L.remote[authorId];
  if (!remote) { L.checklists[authorId] = { authorId, checkedAt: nowIso(), items: [] }; return; }
  const prev = new Map((L.checklists[authorId]?.items ?? []).map((i) => [i.remoteId, i.status]));
  const statusOf = (m) => {
    if (m.postId && L.postsById.has(m.postId)) return prev.get(m.remoteId) === 'updated' ? 'updated' : 'synced';
    return m.status === 'expired' ? 'expired' : 'unsynced';
  };
  L.checklists[authorId] = {
    authorId, checkedAt: nowIso(),
    items: remote.map((m) => ({ remoteId: m.remoteId, title: m.title, publishedAt: m.publishedAt, plan: m.plan, status: statusOf(m) })),
  };
}

function taskView(t) {
  const L = t.lib;
  return {
    id: t.id, type: t.type, state: t.state, stage: t.stage, processed: t.processed, total: t.total,
    createdAt: t.createdAt, startedAt: t.startedAt ?? null, finishedAt: t.finishedAt ?? null,
    label: t.label ?? null,
    authors: (t.authorIds ?? []).map((id) => authorChip(L, id)).filter(Boolean),
    result: t.result ?? null, error: t.error ?? null,
  };
}
export const getTasks = () => tasks.map(taskView);
export function clearTaskHistory() {
  for (let i = tasks.length - 1; i >= 0; i--) if (['done', 'failed', 'canceled'].includes(tasks[i].state)) tasks.splice(i, 1);
  emit('tasks');
}
export function cancelTask(id) {
  const t = tasks.find((x) => x.id === id);
  if (t && (t.state === 'queued' || t.state === 'running')) finish(t, 'canceled');
}

function seedTasks(L) {
  const fanbox = L.authors.filter((a) => a.platformId === 'fanbox').map((a) => a.id);
  const fantia = L.authors.filter((a) => a.platformId === 'fantia').map((a) => a.id);
  const past = (type, authorIds, d, h, extra) => tasks.push({
    id: `t_${++taskSeq}`, lib: L, type, authorIds, createdAt: daysAgo(d, h, 2), startedAt: daysAgo(d, h, 3), finishedAt: daysAgo(d, h, 9),
    processed: extra.total, ...extra,
  });
  past('export', ['a_kotori', 'a_hiyori'], 3, 20, { state: 'done', stage: 'done', total: 230, result: { files: 230, bytes: 1_284_000_000, dir: 'D:\\Exports\\PostPock' } });
  past('status-check', fanbox, 2, 21, { state: 'done', stage: 'done', total: fanbox.length, result: { synced: 314, unsynced: 36, expired: 7 } });
  past('sync', ['a_akari'], 1, 22, { state: 'done', stage: 'done', total: 12, result: { saved: 12, failed: 0 } });
  past('status-check', fantia, 1, 23, { state: 'failed', stage: 'failed', total: fantia.length, processed: 0, error: { code: 'expired', platformId: 'fantia' } });
  // in flight: Noa's new posts are downloading; Kotori's update check waits behind it
  const noa = (L.checklists.a_noa?.items ?? []).filter((i) => i.status === 'unsynced').map((i) => ({ authorId: 'a_noa', remoteId: i.remoteId }));
  const kotori = (L.checklists.a_kotori?.items ?? []).filter((i) => i.status === 'synced').map((i) => ({ authorId: 'a_kotori', remoteId: i.remoteId }));
  const run = newTask(L, { type: 'sync', authorIds: ['a_noa'], items: noa, total: noa.length });
  Object.assign(run, { state: 'running', stage: 'downloading', startedAt: nowIso(), nextAt: Date.now() + 900 });
  for (let k = 0; k < 4 && k < noa.length; k++) { advance(run); run.nextAt = Date.now() + 900; }
  newTask(L, { type: 'update-check', authorIds: ['a_kotori'], items: kotori, total: kotori.length });
}

// ------------------------------------------------------------------ sync
export function getSyncScope() {
  const L = lib();
  return {
    platforms: platformsOf(L).map((p) => ({ ...platformView(L, p), syncable: p.kind === 'builtin' })),
    authors: L.authors.map((a) => {
      const cl = L.checklists[a.id];
      const n = (s) => cl?.items.filter((i) => i.status === s).length ?? 0;
      return { ...authorChip(L, a.id), postCount: L.postsByAuthor.get(a.id)?.length ?? 0, checkedAt: cl?.checkedAt ?? null,
        counts: cl ? { synced: n('synced'), unsynced: n('unsynced'), expired: n('expired'), updated: n('updated') } : null };
    }),
  };
}
export function getChecklists(authorIds) {
  const L = lib();
  const lang = config.language;
  return authorIds.map((id) => {
    const cl = L.checklists[id];
    const a = L.authorsById.get(id);
    const plat = platformById(L, a?.platformId);
    const planKey = Object.keys(plat?.i18n ?? {}).find((k) => !k.includes('='));
    return {
      author: authorChip(L, id),
      checkedAt: cl?.checkedAt ?? null,
      items: (cl?.items ?? []).map((i) => {
        const postId = L.remote[id]?.find((m) => m.remoteId === i.remoteId)?.postId;
        return { key: `${id}:${i.remoteId}`, authorId: id, remoteId: i.remoteId, title: i.title, publishedAt: i.publishedAt, status: i.status,
          plan: i.plan ? pickLang(plat.i18n[`${planKey}=${i.plan}`], lang, i.plan) : null,
          postId: postId && L.postsById.has(postId) ? postId : null };
      }),
    };
  });
}
export function checkStatus(authorIds) {
  const L = lib();
  const t = newTask(L, { type: 'status-check', authorIds, total: authorIds.length });
  return { taskId: t.id };
}
/** type: 'sync' keeps only posts that are not saved; 'update-check' keeps only saved ones. */
export function submitSync(type, items) {
  const L = lib();
  const statusOf = (it) => L.checklists[it.authorId]?.items.find((i) => i.remoteId === it.remoteId)?.status;
  const keep = items.filter((it) => (type === 'sync' ? ['unsynced', 'updated'].includes(statusOf(it)) : ['synced', 'updated'].includes(statusOf(it))));
  if (!keep.length) return { taskId: null, accepted: 0, skipped: items.length };
  const t = newTask(L, { type, authorIds: [...new Set(keep.map((i) => i.authorId))], items: keep, total: keep.length });
  return { taskId: t.id, accepted: keep.length, skipped: items.length - keep.length };
}

// ------------------------------------------------------------------ export
function exportEntries(L) {
  const out = [];
  for (const f of L.files) {
    const post = L.postsById.get(f.postId);
    if (!post) continue;
    out.push({ file: f, post, author: L.authorsById.get(post.authorId) });
  }
  return out;
}
const scopeAuthors = (L, ids) => (ids?.length ? ids : L.authors.map((a) => a.id));

export function getExportOptions({ authorIds, scope }) {
  const L = lib();
  const lang = config.language;
  const chosen = new Set(authorIds ?? []);
  const typeScope = scope === 'home' ? L.authors.map((a) => a.id) : [...chosen];
  const counts = new Map();
  for (const id of typeScope) for (const p of L.postsByAuthor.get(id) ?? []) for (const f of L.filesByPost.get(p.id) ?? []) counts.set(f.ext, (counts.get(f.ext) ?? 0) + 1);
  const platforms = new Set([...chosen].map((id) => L.authorsById.get(id)?.platformId).filter(Boolean));
  const single = platforms.size === 1 ? platformById(L, [...platforms][0]) : null;
  const custom = single ? customKeys(L.posts.filter((p) => p.platformId === single.id), single.i18n) : { agg: [], data: [] };
  const label = (k) => ({ ...k, label: pickLang(k.label, lang, k.id), ...(k.formats ? { formats: k.formats.map((f) => ({ id: f, label: pickLang(DATE_FORMAT_LABEL[f], lang) })) } : {}) });
  const groups = (G) => G.map((g) => ({ id: g.id, label: pickLang(g.label, lang), keys: g.keys.map(label) }));
  const customLabel = (k) => ({ id: k.id, label: pickLang(k.label, lang, k.id), values: k.values.map((v) => pickLang(v.label, lang, v.id)) });
  const calendar = {};
  for (const id of scopeAuthors(L, [...chosen])) for (const p of L.postsByAuthor.get(id) ?? []) { const d = p.publishedAt.slice(0, 10); calendar[d] = (calendar[d] ?? 0) + 1; }
  return {
    authors: L.authors.map((a) => ({ ...authorChip(L, a.id), postCount: L.postsByAuthor.get(a.id)?.length ?? 0 })),
    fileTypes: [...counts].sort((a, b) => b[1] - a[1]).map(([ext, count]) => ({ ext, count, kind: kindOfExt(ext) })),
    keys: {
      agg: groups(AGG_GROUPS), data: groups(DATA_GROUPS),
      custom: { platform: single ? single.name : null, enabled: platforms.size <= 1, agg: custom.agg.map(customLabel), data: custom.data.map(customLabel) },
    },
    calendar,
  };
}
export function getDayPosts({ authorIds, day }) {
  const L = lib();
  return scopeAuthors(L, authorIds).flatMap((id) => (L.postsByAuthor.get(id) ?? []).filter((p) => p.publishedAt.startsWith(day)))
    .sort((a, b) => a.publishedAt.localeCompare(b.publishedAt))
    .map((p) => ({ ...postView(L, p), author: authorChip(L, p.authorId) }));
}
function planFor(L, cfg, maxPerDir) {
  const entries = selectFiles(exportEntries(L), { ...cfg, authorIds: cfg.authorIds });
  const plats = new Set(cfg.authorIds.map((id) => L.authorsById.get(id)?.platformId));
  const i18n = plats.size === 1 ? platformById(L, [...plats][0])?.i18n : {};
  return { entries, plan: planTree(entries, { template: cfg.template, lang: config.language, now: new Date(), maxPerDir, rootName: cfg.outputDir || '…', i18n }) };
}
export function previewExport(cfg, { maxPerDir = 5 } = {}) {
  return planFor(lib(), cfg, maxPerDir).plan;
}
export function startExport(cfg) {
  const L = lib();
  const { plan } = planFor(L, cfg, 0);
  const t = newTask(L, { type: 'export', authorIds: cfg.authorIds, total: plan.files, bytes: plan.bytes, dir: cfg.outputDir });
  return { taskId: t.id, files: plan.files };
}
export function getLastExportConfig(scope) { return lib().prefs.exports[scope] ?? null; }
export function saveLastExportConfig(scope, cfg) { const L = lib(); L.prefs.exports[scope] = cfg; savePrefs(L); }

// ------------------------------------------------------------------ file system (folder browsing for pickers)
// The Go service lists real directories; the mock keeps a small believable tree in memory.
const FS = {
  'C:\\': ['Program Files', 'Users'],
  'C:\\Program Files': ['PostPock'],
  'C:\\Program Files\\PostPock': ['data'],
  'C:\\Program Files\\PostPock\\data': [],
  'C:\\Users': ['Mio'],
  'C:\\Users\\Mio': ['Desktop', 'Documents', 'Downloads', 'Pictures'],
  'C:\\Users\\Mio\\Desktop': [], 'C:\\Users\\Mio\\Documents': ['PostPock'], 'C:\\Users\\Mio\\Documents\\PostPock': [],
  'C:\\Users\\Mio\\Downloads': [], 'C:\\Users\\Mio\\Pictures': ['Screenshots', 'Wallpapers'],
  'C:\\Users\\Mio\\Pictures\\Screenshots': [], 'C:\\Users\\Mio\\Pictures\\Wallpapers': [],
  'D:\\': ['Exports', 'Games', 'PostPock'],
  'D:\\Exports': ['PostPock', 'Old'], 'D:\\Exports\\PostPock': [], 'D:\\Exports\\Old': [], 'D:\\Games': [],
  'D:\\PostPock': ['data', 'backup'], 'D:\\PostPock\\data': [], 'D:\\PostPock\\backup': [],
  'E:\\': ['Archive', 'Illustrations'],
  'E:\\Archive': ['PostPock', '2025'], 'E:\\Archive\\PostPock': [], 'E:\\Archive\\2025': [],
  'E:\\Illustrations': ['References'], 'E:\\Illustrations\\References': [],
};
/** Files the pickers can choose (snapshot archives); folder → [{ name, size, modifiedAt, ...payload }]. */
const FILES = {};
const parentOf = (path) => { const i = path.replace(/\\$/, '').lastIndexOf('\\'); return i < 0 ? null : i === 2 ? path.slice(0, 3) : path.slice(0, i); };
const joinPath = (dir, name) => (dir.endsWith('\\') ? dir + name : `${dir}\\${name}`);

/** Place a file in the mock disk; a taken name gets " (2)", " (3)"… like Explorer does. Returns its full path. */
export function fsAddFile(dir, file) {
  const list = FILES[dir] ?? (FILES[dir] = []);
  const dot = file.name.lastIndexOf('.');
  let name = file.name;
  for (let n = 2; list.some((f) => f.name === name); n++) name = `${file.name.slice(0, dot)} (${n})${file.name.slice(dot)}`;
  list.push({ ...file, name });
  return joinPath(dir, name);
}
export function fsFile(path) {
  const dir = parentOf(path);
  const name = path.slice(path.lastIndexOf('\\') + 1);
  return FILES[dir]?.find((f) => f.name === name) ?? null;
}

/** Drives and the current user's common folders. */
export function fsRoots() {
  return {
    drives: Object.keys(FS).filter((p) => p.length === 3).map((p) => ({ name: p.slice(0, 2), path: p })),
    places: [
      { id: 'desktop', path: 'C:\\Users\\Mio\\Desktop' }, { id: 'documents', path: 'C:\\Users\\Mio\\Documents' },
      { id: 'downloads', path: 'C:\\Users\\Mio\\Downloads' }, { id: 'pictures', path: 'C:\\Users\\Mio\\Pictures' },
    ],
  };
}
/**
 * Sub-folders of a folder; `library` marks folders that already hold a PostPock database.
 * With `accept` (extensions), the files of those types are listed too.
 */
export function fsList(path, { accept } = {}) {
  let dir = String(path ?? '').trim().replace(/\//g, '\\');
  if (/^[a-z]:\\?$/i.test(dir)) dir = `${dir.slice(0, 2).toUpperCase()}\\`;
  else dir = dir.replace(/\\+$/, '');
  if (dir) dir = dir[0].toUpperCase() + dir.slice(1);
  const children = FS[dir];
  if (!children) return { ok: false, path: dir };
  const ext = (n) => n.slice(n.lastIndexOf('.') + 1).toLowerCase();
  return {
    ok: true, path: dir, parent: parentOf(dir),
    entries: [...children].sort((a, b) => a.localeCompare(b)).map((name) => {
      const full = joinPath(dir, name);
      return { name, path: full, library: libraries.has(full) || full === DEFAULT_DB_PATH, empty: !FS[full]?.length && !FILES[full]?.length };
    }),
    files: accept ? (FILES[dir] ?? []).filter((f) => accept.includes(ext(f.name)))
      .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt))
      .map((f) => ({ name: f.name, path: joinPath(dir, f.name), size: f.size, modifiedAt: f.modifiedAt })) : [],
  };
}
export function fsCreateFolder(dir, name) {
  const clean = name.replace(/[<>:"/\\|?*]/g, '').trim();
  if (!clean || !FS[dir] || FS[dir].includes(clean)) return { ok: false };
  FS[dir].push(clean);
  FS[joinPath(dir, clean)] = [];
  return { ok: true, path: joinPath(dir, clean) };
}

// ------------------------------------------------------------------ settings
// Only the general settings travel through here; password, server and MCP have their own endpoints (access.js).
const GENERAL = ['language', 'theme', 'dbPath', 'syncThreads'];
export const getSettings = () => ({ ...pick(config, GENERAL), defaultDbPath: DEFAULT_DB_PATH });
export function updateSettings(patch) {
  const prevPath = config.dbPath;
  config = { ...config, ...pick({ ...config, ...patch }, GENERAL), syncThreads: Math.min(8, Math.max(1, Math.round(patch.syncThreads ?? config.syncThreads))) };
  saveConfig(config);
  emit('settings');
  if (config.dbPath !== prevPath) { openLibrary(config.dbPath); emit('library'); emit('connections'); emit('tasks'); emit('checklists'); emit('snapshots'); }
  return getSettings();
}

