// Library search. Each selected domain is a place to look; the result is the union of all of them.
//   platforms: posts on that platform whose title or body matches
//   title / body / image: posts whose title, body text or image names match
//   authors: posts by those authors whose title or body matches
// With no domain selected, title and body are searched.

export const norm = (s) => (s || '').normalize('NFKC').toLowerCase();

function ranges(hay, q) {
  const out = [];
  if (!q) return out;
  let i = hay.indexOf(q);
  while (i !== -1 && out.length < 8) { out.push([i, i + q.length]); i = hay.indexOf(q, i + q.length); }
  return out;
}

function snippet(text, normText, q, radius = 34) {
  const i = normText.indexOf(q);
  if (i < 0) return null;
  const a = Math.max(0, i - radius), b = Math.min(text.length, i + q.length + radius);
  return { text: (a > 0 ? '…' : '') + text.slice(a, b) + (b < text.length ? '…' : ''), ranges: [[i - a + (a > 0 ? 1 : 0), i - a + (a > 0 ? 1 : 0) + q.length]] };
}

/**
 * docs: [{ post, author, title, body, images }] with plain-text fields precomputed (and their normalised copies).
 * domains: { platforms: [], authors: [], title, body, image }
 */
export function searchLibrary(docs, authors, text, domains, limit = 60) {
  const q = norm(text.trim());
  if (!q) return { authors: [], posts: [], total: 0 };
  const any = domains.platforms.length || domains.authors.length || domains.title || domains.body || domains.image;
  const D = any ? domains : { ...domains, title: true, body: true };
  const plats = new Set(D.platforms), auths = new Set(D.authors);

  const hits = [];
  for (const d of docs) {
    const inTitle = d.nTitle.includes(q);
    const inBody = d.nBody.includes(q);
    const inImage = d.nImages.includes(q);
    const content = inTitle || inBody;
    const matched = new Set();
    if (D.title && inTitle) matched.add('title');
    if (D.body && inBody) matched.add('body');
    if (D.image && inImage) matched.add('image');
    if (plats.has(d.post.platformId) && content) { matched.add(inTitle ? 'title' : 'body'); }
    if (auths.has(d.post.authorId) && content) { matched.add(inTitle ? 'title' : 'body'); }
    if (!matched.size) continue;
    const score = (matched.has('title') ? 4 : 0) + (matched.has('body') ? 2 : 0) + (matched.has('image') ? 1 : 0);
    hits.push({ d, matched: [...matched], score });
  }
  hits.sort((a, b) => b.score - a.score || b.d.post.publishedAt.localeCompare(a.d.post.publishedAt));

  const posts = hits.slice(0, limit).map(({ d, matched }) => ({
    postId: d.post.id,
    matched,
    titleRanges: ranges(d.nTitle, q),
    snippet: matched.includes('body') ? snippet(d.body, d.nBody, q) : null,
    image: matched.includes('image') ? d.imageNames.find((n) => norm(n).includes(q)) ?? null : null,
  }));
  const people = authors.filter((a) => norm(a.name).includes(q) || norm(a.handle).includes(q)).slice(0, 6).map((a) => a.id);
  return { authors: people, posts, total: hits.length };
}
