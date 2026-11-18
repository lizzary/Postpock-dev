// Export template keys.
//
// Aggregate keys organise files: placed in a directory segment they group, placed in the last segment they name.
// Data keys are single values of one file. Platforms add their own keys through their connectors; those are derived
// from the posts (distinct key ids and value ids), never declared up front.

const L = (zh, en) => ({ 'zh-CN': zh, en });
export const pickLang = (labels, lang, fallback = '') => (labels && (labels[lang] ?? labels.en ?? labels['zh-CN'])) ?? fallback;

export const DATE_FORMATS = ['YMD', 'YM', 'Y', 'MD', 'M', 'D'];
export const DATE_FORMAT_LABEL = {
  Y: L('年', 'Year'), M: L('月', 'Month'), D: L('日', 'Day'),
  YM: L('年月', 'Year–month'), MD: L('月日', 'Month–day'), YMD: L('年月日', 'Full date'),
};

export const AGG_GROUPS = [
  { id: 'post', label: L('投稿', 'Post'), keys: [
    { id: 'post.title', label: L('投稿标题', 'Post title') },
    { id: 'post.id', label: L('投稿 ID', 'Post ID') },
  ] },
  { id: 'date', label: L('日期', 'Date'), keys: [
    { id: 'date.published', label: L('发布日期', 'Published'), formats: DATE_FORMATS },
    { id: 'date.archived', label: L('保存日期', 'Saved'), formats: DATE_FORMATS },
  ] },
  { id: 'resource', label: L('资源', 'Resource'), keys: [
    { id: 'resource.type', label: L('资源类型', 'Resource type') },
    { id: 'file.ext', label: L('文件扩展名', 'Extension') },
  ] },
  { id: 'author', label: L('作者', 'Author'), keys: [
    { id: 'author.name', label: L('作者名', 'Author name') },
    { id: 'author.id', label: L('作者 ID', 'Author ID') },
  ] },
];

export const DATA_GROUPS = [
  { id: 'name', label: L('文件名称', 'File name'), keys: [
    { id: 'file.name', label: L('原文件名', 'Original name') },
    { id: 'file.ext', label: L('扩展名', 'Extension') },
  ] },
  { id: 'attr', label: L('文件属性', 'File'), keys: [
    { id: 'file.size', label: L('文件大小', 'Size in bytes') },
    { id: 'resource.type', label: L('资源类型', 'Resource type') },
  ] },
  { id: 'image', label: L('图片属性', 'Image'), keys: [
    { id: 'image.width', label: L('图片宽度', 'Width') },
    { id: 'image.height', label: L('图片高度', 'Height') },
  ] },
  { id: 'post', label: L('所属投稿', 'Post'), keys: [
    { id: 'post.id', label: L('投稿 ID', 'Post ID') },
    { id: 'post.title', label: L('投稿标题', 'Post title') },
  ] },
  { id: 'author', label: L('所属作者', 'Author'), keys: [
    { id: 'author.name', label: L('作者名', 'Author name') },
    { id: 'author.id', label: L('作者 ID', 'Author ID') },
  ] },
  { id: 'published', label: L('发布时间', 'Published'), keys: [
    { id: 'published.year', label: L('发布年', 'Year') },
    { id: 'published.month', label: L('发布月', 'Month') },
    { id: 'published.day', label: L('发布日', 'Day') },
    { id: 'published.date', label: L('发布日期', 'Date') },
  ] },
  { id: 'saved', label: L('保存时间', 'Saved'), keys: [
    { id: 'archived.date', label: L('归档日期', 'Archived on') },
    { id: 'export.date', label: L('导出日期', 'Export date') },
    { id: 'export.time', label: L('导出时间', 'Export time') },
  ] },
  { id: 'index', label: L('文件序号', 'Numbering'), keys: [
    { id: 'index.inPost', label: L('投稿内序号', 'No. in post') },
    { id: 'index.image', label: L('图片序号', 'Image no.') },
    { id: 'index.export', label: L('导出序号', 'Export no.') },
  ] },
];

export const RESOURCE_LABEL = {
  cover: L('封面', 'Cover'), image: L('正文图片', 'Image'), attachment: L('附件', 'Attachment'),
  audio: L('音频', 'Audio'), video: L('视频', 'Video'),
};

// ------------------------------------------------------------------ custom keys (from connectors)

/**
 * Custom keys of a set of posts: distinct key ids and their distinct value ids.
 * posts: [{ custom: { agg: {keyId: valueId}, data: {keyId: valueId} } }]; i18n: connector name tables.
 */
export function customKeys(posts, i18n = {}) {
  const collect = (kind) => {
    const keys = new Map();
    for (const p of posts) {
      for (const [k, v] of Object.entries(p.custom?.[kind] ?? {})) {
        if (!keys.has(k)) keys.set(k, new Set());
        keys.get(k).add(v);
      }
    }
    return [...keys].map(([id, values]) => ({
      id: `custom:${id}`,
      label: i18n[id] ?? { 'zh-CN': id, en: id },
      values: [...values].map((v) => ({ id: v, label: i18n[`${id}=${v}`] ?? { 'zh-CN': v, en: v } })),
    }));
  };
  return { agg: collect('agg'), data: collect('data') };
}

// ------------------------------------------------------------------ expansion

const pad = (n, w = 2) => String(n).padStart(w, '0');

function dateAgg(iso, fmt, lang) {
  const y = iso.slice(0, 4), m = iso.slice(5, 7), d = iso.slice(8, 10);
  if (lang === 'zh-CN') {
    const M = `${+m}月`, D = `${+d}日`;
    return { Y: `${y}年`, M, D, YM: `${y}年${M}`, MD: `${M}${D}`, YMD: `${y}年${M}${D}` }[fmt] ?? `${y}年${M}${D}`;
  }
  return { Y: y, M: m, D: d, YM: `${y}-${m}`, MD: `${m}-${d}`, YMD: `${y}-${m}-${d}` }[fmt] ?? `${y}-${m}-${d}`;
}

const stamp = (now) => ({
  date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
  time: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`,
});

/**
 * Value of one key for one file.
 * ctx: { file, post, author, lang, now, seq, width, i18n }
 */
export function resolveKey(tok, ctx) {
  const { file, post, author, lang } = ctx;
  if (tok.id.startsWith('custom:')) {
    const k = tok.id.slice(7);
    const v = post.custom?.[tok.kind]?.[k];
    if (v == null) return '';
    return pickLang(ctx.i18n?.[`${k}=${v}`], lang, v);
  }
  switch (tok.id) {
    case 'post.title': return post.title;
    case 'post.id': return post.remoteId;
    case 'date.published': return dateAgg(post.publishedAt, tok.fmt, lang);
    case 'date.archived': return dateAgg(post.archivedAt, tok.fmt, lang);
    case 'resource.type': return pickLang(RESOURCE_LABEL[file.resource], lang, file.resource);
    case 'file.ext': return file.ext;
    case 'file.name': return file.name;
    case 'file.size': return String(file.size);
    case 'image.width': return file.width ? String(file.width) : '';
    case 'image.height': return file.height ? String(file.height) : '';
    case 'author.name': return author.name;
    case 'author.id': return author.handle;
    case 'published.year': return post.publishedAt.slice(0, 4);
    case 'published.month': return post.publishedAt.slice(5, 7);
    case 'published.day': return post.publishedAt.slice(8, 10);
    case 'published.date': return post.publishedAt.slice(0, 10);
    case 'archived.date': return post.archivedAt.slice(0, 10);
    case 'export.date': return stamp(ctx.now).date;
    case 'export.time': return stamp(ctx.now).time;
    case 'index.inPost': return pad(file.indexInPost, 3);
    case 'index.image': return file.imageIndex ? pad(file.imageIndex, 3) : '';
    case 'index.export': return pad(ctx.seq, ctx.width);
    default: return '';
  }
}
