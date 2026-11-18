// The generated library behind the mock backend. Deterministic: the same day always produces the same library.
import { seeded } from '../domain/random.js';
import { artwork, avatar } from './art.js';
import { TITLES, SUBTITLES, PARAGRAPHS, LINK_TEXT, CAPTIONS } from './content.js';

const L = (zh, en) => ({ 'zh-CN': zh, en });

export const BUILTIN_PLATFORMS = [
  { id: 'fanbox', name: 'Fanbox', kind: 'builtin', color: '#4a8fd0', site: 'https://www.fanbox.cc', authorUrl: 'https://{handle}.fanbox.cc',
    i18n: {
      'fanbox.plan': L('支援方案', 'Plan'), 'fanbox.plan=free': L('全体公开', 'Public'), 'fanbox.plan=300': L('300 日元方案', '¥300 plan'),
      'fanbox.plan=500': L('500 日元方案', '¥500 plan'), 'fanbox.plan=1000': L('1000 日元方案', '¥1000 plan'),
      'fanbox.type': L('投稿类型', 'Post type'), 'fanbox.type=image': L('图片', 'Image'), 'fanbox.type=article': L('文章', 'Article'), 'fanbox.type=file': L('文件', 'File'),
    } },
  { id: 'fantia', name: 'Fantia', kind: 'builtin', color: '#d4697f', site: 'https://fantia.jp', authorUrl: 'https://fantia.jp/fanclubs/{handle}',
    i18n: {
      'fantia.plan': L('粉丝团方案', 'Fan club plan'), 'fantia.plan=free': L('免费', 'Free'), 'fantia.plan=500': L('500 日元', '¥500'),
      'fantia.plan=1000': L('1000 日元', '¥1000'), 'fantia.plan=3000': L('3000 日元', '¥3000'),
    } },
  { id: 'patreon', name: 'Patreon', kind: 'builtin', color: '#de7a5c', site: 'https://www.patreon.com', authorUrl: 'https://www.patreon.com/{handle}',
    i18n: {
      'patreon.tier': L('赞助档位', 'Tier'), 'patreon.tier=public': L('公开', 'Public'),
      'patreon.tier=supporter': L('支持者', 'Supporter'), 'patreon.tier=collector': L('收藏家', 'Collector'),
    } },
  { id: 'x', name: 'X', kind: 'builtin', color: '#5d6676', site: 'https://x.com', authorUrl: 'https://x.com/{handle}', i18n: {} },
];

const PLAN = {
  fanbox: { key: 'fanbox.plan', values: ['free', '300', '500', '500', '1000'] },
  fantia: { key: 'fantia.plan', values: ['free', '500', '1000', '1000', '3000'] },
  patreon: { key: 'patreon.tier', values: ['public', 'supporter', 'supporter', 'collector'] },
};

const AUTHORS = [
  { key: 'kotori', platform: 'fanbox', name: '雨宮ことり', handle: 'amamiya-kotori', lang: 'ja', bio: '女の子と花と、ときどき猫を描いています。毎月8〜10件更新。高解像度版と差分は500円プランで公開しています。', avatar: ['cat', 'sakura'], banner: { art: ['hills', 'dusk'] }, palettes: ['sakura', 'dusk', 'peach'], styles: ['botanic', 'hills', 'moonlit'], count: 86, newest: 1, gap: [2, 8], unsynced: 9, expired: 2, checked: 2 },
  { key: 'noa', platform: 'fanbox', name: '白樺ノア', handle: 'shirakaba-noa', lang: 'ja', bio: '冬と雪と制服が好き。月2〜3回、線画・PSD付きで更新します。', avatar: ['rabbit', 'slate'], banner: { default: 'snowfield' }, palettes: ['slate', 'lavender', 'lagoon'], styles: ['hills', 'moonlit', 'waves'], count: 42, newest: 3, gap: [6, 16], unsynced: 12, expired: 1, checked: 1 },
  { key: 'akari', platform: 'fanbox', name: '灯里', handle: 'akari-lamp', lang: 'zh', bio: '画灯光、街道和夜晚的人。这里会放高清原图、过程视频和一些碎碎念。', avatar: ['owl', 'night'], banner: { art: ['town', 'amber'] }, palettes: ['amber', 'night', 'deep'], styles: ['town', 'moonlit', 'sea'], count: 58, newest: 0, gap: [3, 11], unsynced: 4, expired: 0, checked: 2 },
  { key: 'mizuha', platform: 'fanbox', name: 'Mizuha', handle: 'mizuha', lang: 'en', bio: 'Quiet seas, lighthouses and small towns, painted slowly. Process notes in every post.', avatar: ['penguin', 'lagoon'], banner: { default: 'tide' }, cover: ['sea', 'lagoon'], palettes: ['lagoon', 'deep', 'mint'], styles: ['sea', 'waves', 'hills'], count: 34, newest: 6, gap: [5, 14], unsynced: 3, expired: 1, checked: 2 },
  { key: 'hiyori', platform: 'fanbox', name: '青葉ひより', handle: 'aoba-hiyori', lang: 'ja', bio: 'ゆるい日常漫画と季節のイラスト。四コマは毎週金曜日に更新します。', avatar: ['chick', 'sage'], banner: { art: ['botanic', 'sage'] }, palettes: ['sage', 'forest', 'peach'], styles: ['botanic', 'bauhaus', 'hills'], count: 120, newest: 2, gap: [1, 6], unsynced: 6, expired: 3, checked: 2 },
  { key: 'sora', platform: 'fanbox', name: '宵待そら', handle: 'yoimachi-sora', lang: 'zh', bio: '同人与原创。主要更新长篇插画与设定集，偶尔有语音和 BGM。', avatar: ['fox', 'lavender'], banner: { default: 'swirl' }, palettes: ['lavender', 'night', 'dusk'], styles: ['moonlit', 'waves', 'bauhaus'], count: 27, newest: 9, gap: [8, 20], unsynced: 2, expired: 0, checked: 2 },
  { key: 'yotaka', platform: 'fantia', name: '夜鷹堂', handle: '41827', lang: 'ja', bio: '夜の街と少女のイラストサークル。月刊でイラスト集を配信しています。', avatar: ['owl', 'deep'], banner: { art: ['town', 'deep'] }, palettes: ['deep', 'night', 'amber'], styles: ['town', 'moonlit'], count: 64, newest: 24, gap: [3, 9], unsynced: 5, expired: 0, checked: 23 },
  { key: 'nemu', platform: 'fantia', name: 'ねむいろ', handle: '27315', lang: 'ja', bio: 'ゆめかわ系の女の子とぬいぐるみ。ボイス付きの作品もあります。', avatar: ['bear', 'lavender'], banner: { default: 'cloudland' }, palettes: ['lavender', 'sakura', 'dawn'], styles: ['botanic', 'hills', 'bauhaus'], count: 45, newest: 26, gap: [4, 12], unsynced: 0, expired: 0, checked: 25 },
  { key: 'tsuki', platform: 'fantia', name: '月見坂スタジオ', handle: '50944', lang: 'zh', bio: '小型动画工作室，在这里发布短片的分镜、原画和完整视频。', avatar: ['frog', 'mint'], banner: { art: ['waves', 'mint'] }, palettes: ['mint', 'lagoon', 'sage'], styles: ['waves', 'sea', 'hills'], count: 19, newest: 30, gap: [10, 24], unsynced: 0, expired: 0, checked: null },
  { key: 'linden', platform: 'patreon', name: 'Linden Atelier', handle: 'lindenatelier', lang: 'en', bio: 'Botanical illustration and slow-living comics. New pages every other Sunday.', avatar: ['rabbit', 'forest'], banner: { art: ['botanic', 'forest'] }, palettes: ['forest', 'sage', 'amber'], styles: ['botanic', 'hills'], count: 52, newest: 12, gap: [7, 15], unsynced: 0, expired: 0, checked: null },
  { key: 'mossy', platform: 'patreon', name: 'Mossy Pixel', handle: 'mossypixel', lang: 'en', bio: 'Pixel-adjacent landscapes, game assets and a wallpaper pack every month.', avatar: ['frog', 'sage'], banner: { default: 'mosaic' }, palettes: ['sage', 'mint', 'amber'], styles: ['bauhaus', 'hills', 'town'], count: 73, newest: 15, gap: [4, 10], unsynced: 0, expired: 0, checked: null },
  { key: 'clem', platform: 'patreon', name: 'Clementine Ray', handle: 'clementineray', lang: 'en', bio: 'Character design, fashion studies and the occasional short story.', avatar: ['fox', 'peach'], banner: { art: ['hills', 'peach'] }, cover: ['botanic', 'peach'], palettes: ['peach', 'dawn', 'sakura'], styles: ['hills', 'botanic', 'sea'], count: 38, newest: 18, gap: [6, 14], unsynced: 0, expired: 0, checked: null },
  { key: 'kiri', platform: 'x', name: '霧島ゆう', handle: 'kiri_sketch', lang: 'ja', bio: '落書きと進捗。お仕事のご依頼はDMまで。', avatar: ['cat', 'slate'], banner: { default: 'dawnhills' }, palettes: ['slate', 'dawn'], styles: ['hills', 'moonlit'], count: 23, newest: 20, gap: [2, 9], unsynced: 0, expired: 0, checked: null },
  { key: 'papel', platform: 'booth', name: '紙月工房', handle: 'papel-moon', lang: 'zh', bio: '手作文具与插画周边。这里存档每一期的数字版图包。', avatar: ['penguin', 'amber'], banner: { art: ['bauhaus', 'amber'] }, palettes: ['amber', 'peach', 'sage'], styles: ['bauhaus', 'botanic'], count: 12, newest: 33, gap: [14, 40], unsynced: 0, expired: 0, checked: null },
];

export const CUSTOM_PLATFORMS = [
  { id: 'booth', name: 'BOOTH', kind: 'custom', color: '#d98a4e', site: 'https://booth.pm', authorUrl: 'https://{handle}.booth.pm', i18n: {} },
  ...[
    ['ci-en', 'Ci-en', '#c46f9e', 'heart'], ['skeb', 'Skeb', '#4f9a86', null], ['gumroad', 'Gumroad', '#d4697f', 'bag'],
    ['pixiv', 'pixiv', '#4a8fd0', null], ['kofi', 'Ko-fi', '#6f7fcf', 'heart'], ['subscribestar', 'SubscribeStar', '#c9a24a', 'star'],
    ['dlsite', 'DLsite', '#5f7fb0', 'book'], ['itch', 'itch.io', '#d9665a', null], ['lofter', 'LOFTER', '#5aa38a', 'leaf'],
    ['bilibili', 'bilibili', '#6aa6d6', null], ['mihuashi', '米画师', '#e0904f', 'brush'], ['afdian', '爱发电', '#9a72c4', 'heart'],
    ['youtube', 'YouTube', '#c9605a', 'music'], ['twitch', 'Twitch', '#8a6fc0', null], ['misskey', 'Misskey', '#8aa65a', 'cloud'],
    ['bluesky', 'Bluesky', '#5b8fd6', 'cloud'], ['tumblr', 'Tumblr', '#4b5f80', null], ['artstation', 'ArtStation', '#4f86b8', 'camera'],
    ['personal', '个人网站', '#6b7280', 'globe'], ['comiket', 'Comiket 通贩', '#b0805a', 'book'],
  ].map(([id, name, color, icon]) => ({ id, name, kind: 'custom', color, icon, site: '', authorUrl: '', i18n: {} })),
];

// ------------------------------------------------------------------ a larger crowd of authors
// Generated, lighter-weight authors so the library behaves like a real one with dozens of platforms.
const JA_FAMILY = ['桜井', '柚木', '綾瀬', '七瀬', '夏目', '朝比奈', '星野', '月島', '一ノ瀬', '藤宮', '白石', '水瀬', '小鳥遊', '神楽', '真白', '鳴海', '橘', '早乙女'];
const JA_GIVEN = ['ことね', 'みお', 'ゆい', 'しずく', 'ひなた', 'りん', 'かえで', 'つむぎ', 'のどか', 'まひろ', 'すず', 'あおい'];
const ZH_NAMES = ['青柚', '南栀', '鹿野', '小满', '阿槐', '星屿', '雾灯', '橘子汽水', '山茶', '半夏', '纸鸢', '白露', '听雨', '木棉', '秋刀鱼', '晚风'];
const EN_A = ['Maple', 'Juniper', 'Willow', 'Hazel', 'Rowan', 'Saffron', 'Indigo', 'Marigold', 'Cobalt', 'Fennel', 'Briar', 'Sorrel'];
const EN_B = ['Studio', 'Atelier', 'Works', 'Ink', 'Press', 'Garden', 'Lane', 'Draws'];
const BIOS = {
  ja: ['季節のイラストとキャラクターデザイン。', '同人誌の進捗と過去作のまとめ。', '女の子と背景をゆっくり描いています。', '月に数回、高解像度版を更新します。'],
  zh: ['画一些安静的风景和女孩子。', '同人与原创插画，偶尔更新教程。', '每月整理一次高清图包。', '喜欢画猫、花和下雨天。'],
  en: ['Illustration, character design and monthly packs.', 'Cozy comics and process videos.', 'Landscapes, little towns and quiet rooms.', 'Sketches, studies and the occasional zine.'],
};
const CROWD = [
  ['fanbox', 26, 'ja'], ['fantia', 14, 'ja'], ['patreon', 9, 'en'], ['x', 8, 'ja'], ['booth', 4, 'zh'],
  ['ci-en', 6, 'ja'], ['skeb', 5, 'ja'], ['gumroad', 4, 'en'], ['pixiv', 9, 'ja'], ['kofi', 4, 'en'], ['subscribestar', 3, 'en'],
  ['dlsite', 3, 'ja'], ['itch', 3, 'en'], ['lofter', 6, 'zh'], ['bilibili', 5, 'zh'], ['mihuashi', 4, 'zh'], ['afdian', 7, 'zh'],
  ['youtube', 2, 'en'], ['twitch', 2, 'en'], ['misskey', 3, 'ja'], ['bluesky', 3, 'en'], ['tumblr', 2, 'en'], ['artstation', 4, 'en'],
  ['personal', 3, 'zh'], ['comiket', 2, 'ja'],
];
const ANIMALS = ['cat', 'rabbit', 'bear', 'fox', 'owl', 'penguin', 'frog', 'chick'];
const PALS = ['dusk', 'dawn', 'mint', 'lagoon', 'lavender', 'sakura', 'forest', 'amber', 'night', 'slate', 'peach', 'sage', 'deep'];
const STYLES = ['hills', 'moonlit', 'sea', 'botanic', 'bauhaus', 'waves', 'town'];
const BANNERS = ['swirl', 'dawnhills', 'tide', 'snowfield', 'cloudland', 'mosaic', 'meadow', 'lanterns'];
const SYNCABLE = new Set(['fanbox', 'fantia', 'patreon', 'x']);
let crowdSeq = 0;
const usedNames = new Set();
for (const [platform, n, lang] of CROWD) {
  for (let k = 0; k < n; k++) {
    const i = crowdSeq++;
    const r = seeded(`crowd|${i}`);
    const name = lang === 'ja' ? `${JA_FAMILY[(i * 7) % JA_FAMILY.length]}${JA_GIVEN[(i * 7 + Math.floor(i / 4)) % JA_GIVEN.length]}`
      : lang === 'zh' ? `${ZH_NAMES[(i * 3 + k) % ZH_NAMES.length]}${k > 1 ? `_${k}` : ''}`
        : `${EN_A[(i * 5) % EN_A.length]} ${EN_B[(i + k) % EN_B.length]}`;
    let unique = name, dup = 2;
    while (usedNames.has(unique)) unique = lang === 'en' ? `${name} ${dup++}` : `${name}${'あいうえおかきくけこ'[dup++ % 10]}`;
    usedNames.add(unique);
    const pal = PALS[i % PALS.length], pal2 = PALS[(i + 4) % PALS.length];
    const checked = SYNCABLE.has(platform) && platform !== 'patreon' && platform !== 'x' ? (platform === 'fantia' ? 24 : r.int(1, 6)) : null;
    AUTHORS.push({
      key: `c${i}`, platform, name: unique, handle: `${platform}-${i}`, lang, bio: BIOS[lang][i % 4],
      avatar: [ANIMALS[i % ANIMALS.length], pal], banner: i % 3 ? { default: BANNERS[i % BANNERS.length] } : { art: [STYLES[i % STYLES.length], pal] },
      palettes: [pal, pal2], styles: [STYLES[i % STYLES.length], STYLES[(i + 2) % STYLES.length]],
      count: r.int(3, 14), newest: r.int(0, 60), gap: [3, 18], unsynced: checked != null ? r.int(0, 4) : 0, expired: checked != null && r.chance(0.3) ? 1 : 0, checked,
    });
  }
}

// ------------------------------------------------------------------ dates
const pad = (n) => String(n).padStart(2, '0');
export const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
export function daysAgo(n, h = 12, m = 0) {
  const d = new Date(); d.setHours(h, m, 0, 0); d.setDate(d.getDate() - n);
  return isoOf(d);
}

// ------------------------------------------------------------------ remote ids
// Platform post ids shrink as posts get older; each author walks down from its own start, so ids never repeat.
const REMOTE_START = { fanbox: 8_420_000, fantia: 2_960_000, patreon: 118_400_000, booth: 6_210_000 };
const X_EPOCH = 1_890_000_000_000_000_000n;
const xId = (age, i) => (X_EPOCH - BigInt(age) * 86_400_000_000_000n - BigInt(i) * 7_919n).toString();

// ------------------------------------------------------------------ media
const MEDIA = { video: 'mock/loop.webm', audio: 'mock/theme.wav' };
const IMAGE_DIMS = [[2480, 3508], [2894, 4093], [3840, 2160], [3000, 3000], [2048, 2732], [3508, 2480]];
const COVER_DIMS = { fanbox: [1200, 630], fantia: [1000, 640], patreon: [1280, 720], x: [1600, 900], booth: [1200, 900] };
const ATTACHMENTS = [
  { name: 'psd_set', ext: 'zip', mb: [140, 620] }, { name: 'layered', ext: 'psd', mb: [80, 310] },
  { name: 'wallpapers', ext: 'zip', mb: [40, 120] }, { name: 'notes', ext: 'pdf', mb: [2, 12] }, { name: 'brushes', ext: 'clip', mb: [30, 90] },
  { name: 'sketches', ext: 'rar', mb: [20, 80] }, { name: 'timelapse', ext: 'mov', mb: [60, 240] }, { name: 'voice', ext: 'wav', mb: [8, 40] },
  { name: 'story', ext: 'txt', mb: [1, 1] }, { name: 'layers', ext: 'sai2', mb: [40, 160] }, { name: 'loop', ext: 'gif', mb: [3, 18] },
  { name: 'novel', ext: 'epub', mb: [1, 6] }, { name: 'textures', ext: '7z', mb: [30, 140] }, { name: 'stills', ext: 'webp', mb: [1, 4] },
];

/**
 * Build one author's library.
 * Returns { author, posts (local, full), remote (metadata of every post on the platform), checklist }.
 */
function buildAuthor(spec, index) {
  const r = seeded(`author|${spec.key}`);
  const id = `a_${spec.key}`;
  const art = (kind, w, h, seed) => artwork(seed, kind[0], kind[1], w, h);
  const banner = spec.banner.default ? `default:${spec.banner.default}` : art(spec.banner.art, 3, 1, `${spec.key}-banner`);
  const author = {
    id, platformId: spec.platform, name: spec.name, handle: spec.handle, lang: spec.lang, bio: spec.bio,
    avatar: avatar(spec.avatar[0], spec.avatar[1]),
    banner,
    cover: spec.cover ? art(spec.cover, 16, 10, `${spec.key}-cover`) : null,
    createdAt: daysAgo(160 + index * 9, 20, 15),
  };

  // every post on the platform, newest first
  const total = spec.count + spec.unsynced + spec.expired;
  const metas = [];
  let age = spec.newest;
  let rid = (REMOTE_START[spec.platform] ?? 5_400_000) - index * 1_037 - spec.newest * 900;
  for (let i = 0; i < total; i++) {
    const tr = seeded(`${spec.key}|meta|${i}`);
    rid -= tr.int(180, 1_300);
    const t = TITLES[(i * 7 + index * 3 + tr.int(0, 3)) % TITLES.length];
    const plan = PLAN[spec.platform];
    metas.push({
      i, remoteId: spec.platform === 'x' ? xId(age, i) : String(rid), titleRef: t,
      title: t[spec.lang] + (tr.chance(0.18) ? ` ${spec.lang === 'en' ? 'Vol.' : 'Vol.'}${Math.max(1, Math.floor((total - i) / 6))}` : ''),
      publishedAt: daysAgo(age, tr.int(9, 23), tr.int(0, 59)),
      age,
      plan: plan ? tr.pick(plan.values) : null,
    });
    age += r.int(spec.gap[0], spec.gap[1]);
  }
  // which ones are not saved locally: the newest few plus some scattered; expired ones are older
  const status = new Array(total).fill('synced');
  const newestUnsynced = Math.min(spec.unsynced, 3);
  for (let k = 0; k < newestUnsynced; k++) status[k] = 'unsynced';
  let left = spec.unsynced - newestUnsynced;
  while (left > 0) { const k = r.int(4, total - 1); if (status[k] === 'synced') { status[k] = 'unsynced'; left--; } }
  left = spec.expired;
  while (left > 0) { const k = r.int(Math.floor(total / 3), total - 1); if (status[k] === 'synced') { status[k] = 'expired'; left--; } }

  const remote = metas.map((m, k) => ({ ...m, status: status[k] }));
  const checkedAt = spec.checked == null ? null : daysAgo(spec.checked, 21, 40);
  const checklist = checkedAt ? {
    authorId: id, checkedAt,
    items: remote.filter((m) => m.publishedAt <= checkedAt).map((m) => ({ remoteId: m.remoteId, title: m.title, publishedAt: m.publishedAt, status: m.status, plan: m.plan })),
  } : null;
  return { author, spec, remote, checklist };
}

/** Full content of a post (deterministic from its metadata). Files are returned alongside the post. */
export function buildPost(spec, author, meta, postId, nextFileId) {
  const r = seeded(`${spec.key}|post|${meta.remoteId}`);
  const lang = spec.lang;
  const slug = meta.titleRef.slug;
  const palette = r.pick(spec.palettes), style = r.pick(spec.styles);
  const files = [];
  let indexInPost = 0, imageIndex = 0;
  const addFile = (f) => { const file = { id: nextFileId(), postId, ...f, indexInPost: ++indexInPost }; files.push(file); return file.id; };

  const [cw, ch] = COVER_DIMS[spec.platform] ?? [1200, 760];
  const coverId = addFile({ name: 'cover', ext: 'jpg', size: r.int(180, 640) * 1024, resource: 'cover', width: cw, height: ch, url: artwork(`${meta.remoteId}-cover`, style, palette, cw, ch) });

  const p = (k) => PARAGRAPHS[lang][(meta.i + k) % PARAGRAPHS[lang].length];
  const blocks = [{ type: 'paragraph', children: [{ text: p(0) }] }];
  if (r.chance(0.55)) blocks.push({ type: 'paragraph', children: [{ text: p(3) }] });

  const kind = slug;
  const nImages = kind === 'comic' ? 4 : kind === 'qa' ? 0 : ['voice_drama', 'bgm', 'timelapse'].includes(kind) ? 1 : r.int(1, 5);
  for (let k = 0; k < nImages; k++) {
    const [w, h] = r.pick(IMAGE_DIMS);
    const n = ++imageIndex;
    const fileId = addFile({
      name: `${slug}_${String(n).padStart(2, '0')}`, ext: r.chance(0.75) ? 'png' : 'jpg', size: Math.round(w * h * r.range(0.35, 0.8)),
      resource: 'image', width: w, height: h, imageIndex: n,
      url: artwork(`${meta.remoteId}-img${n}`, k % 2 && spec.styles.length > 1 ? spec.styles[(spec.styles.indexOf(style) + 1) % spec.styles.length] : style, palette, w, h),
      alt: `${meta.title} · ${CAPTIONS[lang][k % CAPTIONS[lang].length]}`,
    });
    blocks.push({ type: 'image', fileId, caption: k > 0 && r.chance(0.4) ? CAPTIONS[lang][k % CAPTIONS[lang].length] : null });
    if (k === 0 && nImages > 2 && r.chance(0.6)) blocks.push({ type: 'paragraph', children: [{ text: p(1) }] });
  }
  if (kind === 'timelapse' || kind === 'process' || r.chance(0.07)) {
    const fileId = addFile({ name: kind === 'timelapse' ? 'timelapse' : 'making_of', ext: 'mp4', size: r.int(60, 320) * 1024 * 1024, resource: 'video', width: 1280, height: 720, url: MEDIA.video, poster: artwork(`${meta.remoteId}-poster`, style, palette, 16, 9) });
    blocks.push({ type: 'paragraph', children: [{ text: p(2) }] });
    blocks.push({ type: 'video', fileId });
  }
  if (kind === 'voice_drama' || kind === 'bgm' || r.chance(0.06)) {
    const fileId = addFile({ name: kind === 'voice_drama' ? 'voice_drama_ep2' : 'bgm_for_drawing', ext: 'mp3', size: r.int(18, 64) * 1024 * 1024, resource: 'audio', url: MEDIA.audio, cover: artwork(`${meta.remoteId}-audio`, style, palette, 1, 1) });
    blocks.push({ type: 'audio', fileId, title: meta.title });
  }
  if (['psd_release', 'wallpaper', 'uniform_set', 'character_sheet'].includes(kind) || r.chance(0.22)) {
    const a = ['psd_release', 'character_sheet'].includes(kind) ? ATTACHMENTS[0] : kind === 'wallpaper' ? ATTACHMENTS[2] : r.pick(ATTACHMENTS);
    const fileId = addFile({ name: `${slug}_${a.name}`, ext: a.ext, size: r.int(a.mb[0], a.mb[1]) * 1024 * 1024, resource: 'attachment', url: null });
    blocks.push({ type: 'file', fileId });
    if (r.chance(0.3)) {
      const b = ATTACHMENTS[3];
      blocks.push({ type: 'file', fileId: addFile({ name: `${slug}_${b.name}`, ext: b.ext, size: r.int(b.mb[0], b.mb[1]) * 1024 * 1024, resource: 'attachment', url: null }) });
    }
  }
  if (r.chance(0.35)) blocks.push({ type: 'paragraph', children: [{ text: p(6) }] });

  return {
    post: {
      id: postId, authorId: author.id, platformId: author.platformId, remoteId: meta.remoteId,
      title: meta.title,
      subtitle: r.chance(0.62) ? SUBTITLES[lang][(meta.i + 2) % SUBTITLES[lang].length] : '',
      publishedAt: meta.publishedAt,
      archivedAt: (() => { const d = Math.max(0, meta.age - r.int(0, Math.min(meta.age, 12))); return daysAgo(d, 22, r.int(0, 59)); })(),
      coverFileId: coverId,
      custom: {
        agg: meta.plan ? { [PLAN[spec.platform].key]: meta.plan } : {},
        data: spec.platform === 'fanbox' ? { 'fanbox.type': nImages ? 'image' : files.some((f) => f.resource === 'attachment') ? 'file' : 'article' } : {},
      },
      blocks,
      lang,
    },
    files,
  };
}

/** Links between posts of one author: a sentence linking to an older post, and occasionally a link card. */
function weaveLinks(posts, spec, r) {
  const lt = LINK_TEXT[spec.lang];
  posts.forEach((post, k) => {
    const older = posts[k + 1 + r.int(0, 3)];
    if (older && r.chance(0.3)) {
      post.blocks.splice(1, 0, { type: 'paragraph', children: [{ text: spec.lang === 'en' ? 'By the way, ' : spec.lang === 'ja' ? 'ちなみに、' : '顺便一提，' }, { text: lt.prev, postId: older.id }, { text: spec.lang === 'en' ? '.' : '。' }] });
    }
    if (older && r.chance(0.14)) {
      post.blocks.push({ type: 'linkCard', postId: older.id });
    } else if (r.chance(0.12)) {
      post.blocks.push({
        type: 'linkCard', href: `https://portfolio.example.com/${spec.handle}`,
        title: `${spec.name} — ${lt.ext}`,
        description: spec.bio,
        image: artwork(`${spec.key}-portfolio`, spec.styles[0], spec.palettes[0], 16, 10),
      });
      post.blocks.splice(post.blocks.length - 1, 0, { type: 'paragraph', children: [{ text: spec.lang === 'en' ? 'Everything older lives on ' : spec.lang === 'ja' ? '過去作は' : '更早的作品都放在' }, { text: lt.ext, href: `https://portfolio.example.com/${spec.handle}` }, { text: spec.lang === 'en' ? '.' : spec.lang === 'ja' ? 'にまとめています。' : '。' }] });
    }
  });
}

/** The whole seeded library. */
export function seedLibrary() {
  let postSeq = 1000, fileSeq = 1;
  const nextPostId = () => `p_${++postSeq}`;
  const nextFileId = () => `f_${fileSeq++}`;
  const authors = [], posts = [], files = [], remote = {}, checklists = {}, specs = {};
  AUTHORS.forEach((spec, index) => {
    const built = buildAuthor(spec, index);
    authors.push(built.author);
    specs[built.author.id] = spec;
    remote[built.author.id] = built.remote;
    if (built.checklist) checklists[built.author.id] = built.checklist;
    const mine = [];
    for (const meta of built.remote) {
      if (meta.status !== 'synced') continue;
      const id = nextPostId();
      meta.postId = id;
      const { post, files: fs } = buildPost(spec, built.author, meta, id, nextFileId);
      mine.push(post); files.push(...fs);
    }
    weaveLinks(mine, spec, seeded(`${spec.key}|links`));
    posts.push(...mine);
  });
  return {
    platforms: [...CUSTOM_PLATFORMS],
    authors, posts, files, remote, checklists, specs,
    nextPostId, nextFileId,
  };
}
