// Export planning: which files are in scope, and where each one lands under the export directory.
//
// Scope = selected authors ∩ date range (∩ picked posts when a single day is chosen) ∩ file types.
// Every file expands the template with its own values, so linked keys stay consistent by construction:
// in "author/title-post/…", each author directory only ever contains that author's posts.
import { sanitizeValue, finishSegment, splitPath, uniqueName } from './filename.js';
import { resolveKey } from './keys.js';

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

/** entries: [{ file, post, author }] → the subset in scope, in export order. */
export function selectFiles(entries, { authorIds, dates, dayPosts, fileTypes }) {
  const authors = new Set(authorIds);
  const types = new Set(fileTypes.map((t) => t.toLowerCase()));
  const from = dates.mode === 'range' ? dates.from : null;
  const to = dates.mode === 'range' ? dates.to : null;
  const single = from && from === to;
  const picked = single && dayPosts ? new Set(dayPosts) : null;
  return entries
    .filter(({ file, post }) => {
      if (!authors.has(post.authorId)) return false;
      if (!types.has(file.ext.toLowerCase())) return false;
      const day = post.publishedAt.slice(0, 10);
      if (from && (day < from || day > to)) return false;
      if (picked && !picked.has(post.id)) return false;
      return true;
    })
    .sort((a, b) =>
      collator.compare(a.author.name, b.author.name)
      || a.post.publishedAt.localeCompare(b.post.publishedAt)
      || a.file.indexInPost - b.file.indexInPost);
}

/**
 * Lay the files out as a directory tree.
 * Returns { root, files, bytes, dirs }; root = { name, path, count, bytes, dirs: [...], files: [first maxPerDir], hidden }.
 */
export function planTree(entries, { template, lang, now, maxPerDir, rootName, i18n }) {
  const width = Math.max(3, String(entries.length).length);
  const mkDir = (name, path) => ({ name, path, dirs: new Map(), files: [], taken: new Set(), count: 0, bytes: 0 });
  const root = mkDir(rootName, '');
  let dirCount = 0;

  entries.forEach((entry, i) => {
    const ctx = { ...entry, lang, now, seq: i + 1, width, i18n };
    let s = '';
    for (const tok of template) s += tok.type === 'text' ? tok.text : sanitizeValue(resolveKey(tok, ctx));
    const parts = splitPath(s).map((p) => finishSegment(p.trim()));
    let base = parts.pop() || '';
    const ext = entry.file.ext;
    if (ext && base.toLowerCase().endsWith(`.${ext.toLowerCase()}`)) base = base.slice(0, -(ext.length + 1));
    if (!base) base = sanitizeValue(entry.file.name) || 'file';

    let node = root;
    node.count++; node.bytes += entry.file.size;
    for (const d of parts) {
      if (!d) continue;
      const key = d.toLowerCase();
      let child = node.dirs.get(key);
      if (!child) { child = mkDir(d, `${node.path}/${d}`); node.dirs.set(key, child); dirCount++; }
      node = child;
      node.count++; node.bytes += entry.file.size;
    }
    node.files.push({
      name: uniqueName(base, ext, node.taken),
      size: entry.file.size, ext, resource: entry.file.resource,
    });
  });

  const out = (n) => ({
    name: n.name,
    path: n.path,
    count: n.count,
    bytes: n.bytes,
    dirs: [...n.dirs.values()].sort((a, b) => collator.compare(a.name, b.name)).map(out),
    files: n.files.slice(0, maxPerDir),
    hidden: Math.max(0, n.files.length - maxPerDir),
  });
  return { root: out(root), files: entries.length, bytes: root.bytes, dirs: dirCount };
}
