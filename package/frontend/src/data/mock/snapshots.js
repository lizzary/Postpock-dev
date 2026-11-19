// Snapshots of the database directory — the data-security timeline. Topic: 'snapshots'.
// The Go service keeps them as the version history of the whole folder (the storage figure is that history's size).
// Here each snapshot remembers which posts, authors and custom platforms it holds; loading one rebuilds the library
// from them, so whatever was never saved in a snapshot is gone afterwards — exactly what the UI warns about.
import {
  emit, currentLibrary, reindex, registerTaskType, newTask, finish, fsAddFile, fsFile, getConfig, newEdits,
} from './backend.js';
import { daysAgo, isoOf } from './seed.js';
import { hashString } from '../domain/random.js';

const nowIso = () => isoOf(new Date());
const LIST_LIMIT = 48;      // items returned per change group
const FILE_LIMIT = 400;     // file rows returned per change list

// ------------------------------------------------------------------ state
function state(L) {
  if (!L.backup) {
    L.backup = { snapshots: [], head: null, busy: null, vault: { posts: new Map(), authors: new Map(), platforms: new Map() } };
    if (L.seeded) seedHistory(L);
  }
  return L.backup;
}
const visible = (B) => B.snapshots.filter((s) => !s.hidden);
const snapId = (L, salt) => `s_${hashString(`${L.path}|${salt}`).toString(36)}`;
const capture = (L) => ({
  posts: new Set(L.posts.map((p) => p.id)), authors: new Set(L.authors.map((a) => a.id)), platforms: new Set(L.platforms.map((p) => p.id)),
});
/** The library as it was at `iso`, judged by when each post was saved (authors and platforms are older than the history). */
const asOf = (L, iso) => ({ ...capture(L), posts: new Set(L.posts.filter((p) => p.archivedAt <= iso).map((p) => p.id)) });
const describe = (s) => ({ id: s.id, name: s.name, createdAt: s.createdAt, posts: [...s.posts], authors: [...s.authors], platforms: [...s.platforms] });

// ------------------------------------------------------------------ the sample library's history
const HISTORY = [
  [141, 21, 12, { 'zh-CN': '第一次备份', en: 'First backup' }],
  [119, 22, 5, null],
  [97, 20, 48, { 'zh-CN': '换新电脑之前', en: 'Before moving to the new PC' }],
  [76, 23, 16, null],
  [58, 21, 37, { 'zh-CN': '大批同步之前', en: 'Before a big sync' }],
  [41, 22, 2, null],
  [27, 20, 30, { 'zh-CN': '月度备份', en: 'Monthly backup' }],
  [14, 21, 51, null],
  [3, 21, 30, null],
];
const ARCHIVED = [
  [236, 20, 40, { 'zh-CN': '整理收藏之前', en: 'Before tidying up' }],
  [205, 22, 18, null],
  HISTORY[0],
];

function seedHistory(L) {
  const B = L.backup;
  const lang = getConfig().language;
  const named = (n) => (n ? n[lang] ?? n.en : null);
  for (const [d, h, m, name] of HISTORY) {
    const at = daysAgo(d, h, m);
    B.snapshots.push({ id: snapId(L, at), name: named(name), createdAt: at, source: 'created', hidden: false, ...asOf(L, at) });
  }
  B.head = B.snapshots.at(-1).id;
  // edits made since the last snapshot, so the working state shows more than new posts
  const before = (o, keys) => Object.fromEntries(keys.map((k) => [k, o[k]]));
  for (const id of ['a_mizuha', 'a_sora']) { const a = L.authorsById.get(id); if (a) L.edits.authors.set(id, before(a, ['bio', 'avatar'])); }
  for (const p of (L.postsByAuthor.get('a_kotori') ?? []).slice(5, 7)) L.edits.posts.set(p.id, before(p, ['title', 'subtitle']));
  L.edits.prefs = true;
  // an archive exported months ago waits in the backup folder
  const old = ARCHIVED.map(([d, h, m, name]) => { const at = daysAgo(d, h, m); return { id: snapId(L, at), name: named(name), createdAt: at }; });
  fsAddFile('D:\\PostPock\\backup', { name: `PostPock-snapshots-${old.at(-1).createdAt.slice(0, 10)}.ppsnap`, size: 96_400_000_000, modifiedAt: daysAgo(140, 9, 26), snapshots: old });
}

// ------------------------------------------------------------------ lookups
const postOf = (L, id) => L.postsById.get(id) ?? L.backup.vault.posts.get(id)?.post ?? null;
const filesOf = (L, id) => L.filesByPost.get(id) ?? L.backup.vault.posts.get(id)?.files ?? [];
const authorOf = (L, id) => L.authorsById.get(id) ?? L.backup.vault.authors.get(id) ?? null;
const platformOf = (L, id) => L.platforms.find((p) => p.id === id) ?? L.backup.vault.platforms.get(id) ?? null;
const coverOf = (L, p) => filesOf(L, p.id).find((f) => f.id === p.coverFileId)?.url ?? filesOf(L, p.id).find((f) => f.resource === 'image')?.url ?? null;
const newest = (L, ids) => ids.map((id) => postOf(L, id)).filter(Boolean).sort((a, b) => b.archivedAt.localeCompare(a.archivedAt));

// ------------------------------------------------------------------ differences
const minus = (a, b) => [...a].filter((x) => !b.has(x));
const EMPTY = { posts: new Set(), authors: new Set(), platforms: new Set() };

/** What changed from `base` (a snapshot, or nothing) to `to` (a snapshot, or 'working' = the database folder now). */
function diff(L, base, to) {
  const working = to === 'working';
  const cur = working ? capture(L) : to;
  const from = base ?? EMPTY;
  const edited = working ? { posts: [...L.edits.posts.keys()], authors: [...L.edits.authors.keys()], prefs: L.edits.prefs } : (to.edited ?? { posts: [], authors: [], prefs: false });
  return {
    posts: { added: minus(cur.posts, from.posts), deleted: minus(from.posts, cur.posts), modified: edited.posts.filter((id) => from.posts.has(id) && cur.posts.has(id)) },
    authors: { added: minus(cur.authors, from.authors), deleted: minus(from.authors, cur.authors), modified: edited.authors.filter((id) => from.authors.has(id) && cur.authors.has(id)) },
    platforms: { added: minus(cur.platforms, from.platforms), deleted: minus(from.platforms, cur.platforms), modified: [] },
    prefs: !!base && edited.prefs,
  };
}
function summarize(d) {
  const sum = (k) => d.posts[k].length + d.authors[k].length + d.platforms[k].length;
  const added = sum('added'), deleted = sum('deleted'), modified = sum('modified') + (d.prefs ? 1 : 0);
  return {
    total: added + deleted + modified, added, modified, deleted,
    posts: { added: d.posts.added.length, modified: d.posts.modified.length, deleted: d.posts.deleted.length },
    authors: { added: d.authors.added.length, modified: d.authors.modified.length, deleted: d.authors.deleted.length },
  };
}

const postItem = (L, p) => {
  const a = authorOf(L, p.authorId);
  return { id: p.id, title: p.title, cover: coverOf(L, p), at: p.archivedAt, inLibrary: L.postsById.has(p.id), author: a ? { name: a.name, avatar: a.avatar } : null };
};
function groupsOf(L, d) {
  const groups = [];
  for (const change of ['added', 'modified', 'deleted']) {
    const ids = d.posts[change];
    if (ids.length) groups.push({ kind: 'post', change, count: ids.length, items: newest(L, ids).slice(0, LIST_LIMIT).map((p) => postItem(L, p)) });
  }
  for (const change of ['added', 'modified', 'deleted']) {
    const ids = d.authors[change];
    if (ids.length) groups.push({ kind: 'author', change, count: ids.length, items: ids.slice(0, LIST_LIMIT).map((id) => authorOf(L, id)).filter(Boolean).map((a) => ({ id: a.id, name: a.name, avatar: a.avatar })) });
  }
  for (const change of ['added', 'deleted']) {
    const ids = d.platforms[change];
    if (ids.length) groups.push({ kind: 'platform', change, count: ids.length, items: ids.map((id) => platformOf(L, id)).filter(Boolean).map((p) => ({ id: p.id, name: p.name, color: p.color, icon: p.icon ?? null })) });
  }
  if (d.prefs) groups.push({ kind: 'settings', change: 'modified', count: 1, items: [] });
  return groups;
}

/** The same changes as files of the database folder (the Go service reports these; the UI maps them back). */
function fileRows(L, d) {
  const rows = [];
  const media = (p, f) => {
    const a = authorOf(L, p.authorId);
    return `media\\${p.platformId}\\${a?.handle || p.authorId}\\${p.remoteId}\\${f.name}.${f.ext}`;
  };
  if (summarize(d).total) rows.push({ path: 'library.db', change: 'modified' });
  for (const change of ['added', 'deleted']) {
    for (const p of newest(L, d.posts[change])) for (const f of filesOf(L, p.id)) rows.push({ path: media(p, f), change });
  }
  return { total: rows.length, items: rows.slice(0, FILE_LIMIT) };
}

function previews(L, s, prev) {
  const added = newest(L, prev ? minus(s.posts, prev.posts) : [...s.posts]).slice(0, 4);
  if (added.length < 4) added.push(...newest(L, [...s.posts]).filter((p) => !added.includes(p)).slice(0, 4 - added.length));
  return added.map((p) => coverOf(L, p)).filter(Boolean);
}

function storageOf(L) {
  const B = state(L);
  const ids = new Set();
  for (const s of B.snapshots) for (const id of s.posts) ids.add(id);
  let bytes = 0;
  for (const id of ids) for (const f of filesOf(L, id)) bytes += f.size;
  return Math.round(bytes * 0.97) + ids.size * 2_048 + B.snapshots.length * 65_536;
}

/** Only the part of a difference that belongs to the chosen authors; platforms and page settings are library-wide. */
function scoped(L, d, sel) {
  const mine = (ids) => ids.filter((id) => sel.has(postOf(L, id)?.authorId));
  const theirs = (ids) => ids.filter((id) => sel.has(id));
  return {
    posts: { added: mine(d.posts.added), deleted: mine(d.posts.deleted), modified: mine(d.posts.modified) },
    authors: { added: theirs(d.authors.added), deleted: theirs(d.authors.deleted), modified: theirs(d.authors.modified) },
    platforms: d.platforms, prefs: d.prefs,
  };
}
/** Unsaved changes per author, and the ones that belong to the whole library. */
function pendingByAuthor(L, d) {
  const count = new Map();
  const add = (id) => { if (id) count.set(id, (count.get(id) ?? 0) + 1); };
  for (const k of ['added', 'deleted', 'modified']) {
    for (const id of d.posts[k]) add(postOf(L, id)?.authorId);
    for (const id of d.authors[k]) add(id);
  }
  return {
    authors: [...count].map(([id, changes]) => ({ id, changes })),
    shared: d.platforms.added.length + d.platforms.deleted.length + (d.prefs ? 1 : 0),
  };
}

// ------------------------------------------------------------------ reading
export function getBackup() {
  const L = currentLibrary(), B = state(L);
  const shown = visible(B);
  const head = B.snapshots.find((s) => s.id === B.head) ?? null;
  const working = diff(L, head, 'working');
  return {
    dbPath: L.path,
    storage: storageOf(L),
    head: head?.id ?? null,
    busy: B.busy,
    current: { authors: L.authors.length, posts: L.posts.length },
    pending: { ...summarize(working), ...pendingByAuthor(L, working) },
    snapshots: shown.map((s, i) => ({
      id: s.id, name: s.name, createdAt: s.createdAt, source: s.source,
      totals: { authors: s.authors.size, posts: s.posts.size },
      changes: summarize(diff(L, shown[i - 1] ?? null, s)),
      previews: previews(L, s, shown[i - 1] ?? null),
    })),
  };
}

/** id: a snapshot (what it saved compared with the one before it) or 'working' (the folder now, against the current snapshot). */
export function getChanges(id) {
  const L = currentLibrary(), B = state(L);
  const shown = visible(B);
  let base, to;
  if (id === 'working') { base = B.snapshots.find((s) => s.id === B.head) ?? null; to = 'working'; }
  else {
    const i = shown.findIndex((s) => s.id === id);
    if (i < 0) return null;
    base = shown[i - 1] ?? null; to = shown[i];
  }
  const d = diff(L, base, to);
  return { base: base ? { id: base.id, name: base.name, createdAt: base.createdAt } : null, summary: summarize(d), groups: groupsOf(L, d), files: fileRows(L, d) };
}

// ------------------------------------------------------------------ creating
/**
 * Save the chosen authors' changes on top of the current snapshot. Other authors keep what that snapshot held, and
 * their changes stay unsaved; platforms and page settings belong to the whole library and always go in.
 */
function commit(L, name, sel) {
  const B = state(L);
  const base = B.snapshots.find((x) => x.id === B.head) ?? EMPTY;
  const cur = capture(L);
  const authorOf = (id) => postOf(L, id)?.authorId;
  const posts = new Set([...base.posts].filter((id) => !sel.has(authorOf(id))));
  for (const id of cur.posts) if (sel.has(authorOf(id))) posts.add(id);
  const authors = new Set([...base.authors].filter((id) => !sel.has(id)));
  for (const id of cur.authors) if (sel.has(id)) authors.add(id);
  const editedPosts = [...L.edits.posts.keys()].filter((id) => sel.has(authorOf(id)));
  const editedAuthors = [...L.edits.authors.keys()].filter((id) => sel.has(id));
  const at = nowIso();
  const s = {
    id: snapId(L, `${at}|${B.snapshots.length}|${Math.random()}`), name: name || null, createdAt: at, source: 'created', hidden: false,
    posts, authors, platforms: cur.platforms, authorScope: [...sel],
    edited: { posts: editedPosts, authors: editedAuthors, prefs: L.edits.prefs },
  };
  B.snapshots.push(s);
  B.head = s.id;
  for (const id of editedPosts) L.edits.posts.delete(id);
  for (const id of editedAuthors) L.edits.authors.delete(id);
  L.edits.prefs = false;
  return s;
}
const everyone = (L) => new Set(L.authors.map((a) => a.id));

/** authorIds: whose changes go into the snapshot (required). */
export function createSnapshot(name, authorIds) {
  const L = currentLibrary(), B = state(L);
  if (B.busy) return { ok: false, error: 'busy' };
  const sel = new Set(authorIds ?? []);
  if (!sel.size) return { ok: false, error: 'authors' };
  const d = scoped(L, diff(L, B.snapshots.find((s) => s.id === B.head) ?? null, 'working'), sel);
  if (!summarize(d).total) return { ok: false, error: 'nothing' };
  const label = String(name ?? '').trim() || null;
  const t = newTask(L, { type: 'snapshot', label, name: label, authorIds: [...sel], total: Math.max(1, fileRows(L, d).total) });
  B.busy = t.id;
  emit('snapshots');
  return { ok: true, taskId: t.id };
}

registerTaskType('snapshot', {
  firstStage: 'scanning',
  step(t) {
    if (t.stage === 'scanning') { t.stage = 'saving'; t.nextAt = Date.now() + 500; emit('tasks'); return; }
    t.processed = Math.min(t.total, t.processed + Math.max(1, Math.ceil(t.total / 26)));
    if (t.processed < t.total) { t.nextAt = Date.now() + 110; emit('tasks'); return; }
    const s = commit(t.lib, t.name, new Set(t.authorIds));
    t.lib.backup.busy = null;
    finish(t, 'done', { result: { changes: t.total, id: s.id } });
    emit('snapshots');
  },
});

// ------------------------------------------------------------------ loading
/** Rebuild the library from a snapshot. Anything held by no snapshot is dropped; uncommitted edits are undone. */
function restore(L, s) {
  const B = state(L);
  const kept = { posts: new Set(), authors: new Set(), platforms: new Set() };
  for (const x of B.snapshots) for (const k of Object.keys(kept)) for (const id of x[k]) kept[k].add(id);

  for (const [id, before] of L.edits.posts) { const p = L.postsById.get(id); if (p) Object.assign(p, before); }
  for (const [id, before] of L.edits.authors) { const a = L.authorsById.get(id); if (a) Object.assign(a, before); }
  L.edits = newEdits();

  const posts = [], files = [];
  for (const p of L.posts) {
    const own = L.filesByPost.get(p.id) ?? [];
    if (s.posts.has(p.id)) { posts.push(p); files.push(...own); } else if (kept.posts.has(p.id)) B.vault.posts.set(p.id, { post: p, files: own });
  }
  for (const id of s.posts) {
    const v = !L.postsById.has(id) && B.vault.posts.get(id);
    if (v) { posts.push(v.post); files.push(...v.files); B.vault.posts.delete(id); }
  }
  const swap = (list, ids, vault, keep) => {
    const next = [];
    for (const x of list) { if (ids.has(x.id)) next.push(x); else if (keep.has(x.id)) vault.set(x.id, x); }
    for (const id of ids) if (!next.some((x) => x.id === id) && vault.has(id)) { next.push(vault.get(id)); vault.delete(id); }
    return next;
  };
  L.authors = swap(L.authors, s.authors, B.vault.authors, kept.authors);
  L.platforms = swap(L.platforms, s.platforms, B.vault.platforms, kept.platforms);
  L.posts = posts;
  L.files = files;
  reindex(L);
}

export function loadSnapshot(id, { saveFirst = false } = {}) {
  const L = currentLibrary(), B = state(L);
  const s = B.snapshots.find((x) => x.id === id);
  if (!s || B.busy) return { ok: false };
  if (saveFirst && summarize(diff(L, B.snapshots.find((x) => x.id === B.head) ?? null, 'working')).total) commit(L, null, everyone(L));
  restore(L, s);
  B.head = s.id;
  emit('snapshots'); emit('library'); emit('checklists');
  return { ok: true };
}

// ------------------------------------------------------------------ removing (from the timeline)
export function hideSnapshot(id) {
  const B = state(currentLibrary());
  const s = B.snapshots.find((x) => x.id === id);
  if (!s || id === B.head) return { ok: false };
  s.hidden = true;
  emit('snapshots');
  return { ok: true };
}
export function unhideSnapshot(id) {
  const s = state(currentLibrary()).snapshots.find((x) => x.id === id);
  if (s) { s.hidden = false; emit('snapshots'); }
  return { ok: !!s };
}

// ------------------------------------------------------------------ export & import
export function exportSnapshots({ ids, dir }) {
  const L = currentLibrary(), B = state(L);
  const list = visible(B).filter((s) => ids.includes(s.id));
  if (!list.length || !String(dir ?? '').trim()) return { ok: false };
  const t = newTask(L, { type: 'snapshot-export', label: null, total: list.length * 6, ids: list.map((s) => s.id), dir: dir.trim() });
  return { ok: true, taskId: t.id };
}
registerTaskType('snapshot-export', {
  firstStage: 'packing',
  step(t) {
    t.processed++;
    if (t.processed < t.total) { t.nextAt = Date.now() + 150; emit('tasks'); return; }
    const B = state(t.lib);
    const list = B.snapshots.filter((s) => t.ids.includes(s.id));
    const file = fsAddFile(t.dir, { name: `PostPock-snapshots-${nowIso().slice(0, 10)}.ppsnap`, size: storageOf(t.lib), modifiedAt: nowIso(), snapshots: list.map(describe) });
    finish(t, 'done', { result: { count: list.length, file } });
  },
});

/** What an archive holds, and which of it is already on the timeline. */
export function inspectArchive(path) {
  const f = fsFile(path);
  if (!f?.snapshots) return { ok: false };
  const B = state(currentLibrary());
  return {
    ok: true, path, name: f.name, size: f.size, modifiedAt: f.modifiedAt,
    snapshots: f.snapshots.map((d) => {
      const has = B.snapshots.find((s) => s.id === d.id);
      return { id: d.id, name: d.name, createdAt: d.createdAt, present: !!has && !has.hidden };
    }).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  };
}

export function importArchive(path) {
  const L = currentLibrary();
  const f = fsFile(path);
  if (!f?.snapshots) return { ok: false };
  const t = newTask(L, { type: 'snapshot-import', label: f.name, total: f.snapshots.length * 5, path });
  return { ok: true, taskId: t.id };
}
registerTaskType('snapshot-import', {
  firstStage: 'reading',
  step(t) {
    if (t.stage === 'reading') { t.stage = 'importing'; t.nextAt = Date.now() + 400; emit('tasks'); return; }
    t.processed++;
    if (t.processed < t.total) { t.nextAt = Date.now() + 140; emit('tasks'); return; }
    const L = t.lib, B = state(L);
    const known = (ids, has) => new Set(ids.filter(has));
    let added = 0, skipped = 0;
    for (const d of fsFile(t.path)?.snapshots ?? []) {
      const has = B.snapshots.find((s) => s.id === d.id);
      if (has && !has.hidden) { skipped++; continue; }
      added++;
      if (has) { has.hidden = false; continue; }
      const sets = d.posts
        ? { posts: known(d.posts, (id) => !!postOf(L, id)), authors: known(d.authors, (id) => !!authorOf(L, id)), platforms: known(d.platforms, (id) => !!platformOf(L, id)) }
        : asOf(L, d.createdAt);
      B.snapshots.push({ id: d.id, name: d.name, createdAt: d.createdAt, source: 'imported', hidden: false, ...sets });
    }
    B.snapshots.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    finish(t, 'done', { result: { added, skipped } });
    emit('snapshots');
  },
});
