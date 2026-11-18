// Built-in author banners, drawn as SVG. Authors created without a banner get one of these at random.
// Each is 1800 × 600 and keeps its subject near the middle, so the centre crop works as a card cover.

const W = 1800, H = 600;
const f1 = (n) => Math.round(n * 10) / 10;

function rand(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function smooth(pts) {
  let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    d += `C${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])} ${f1(p2[1])}`;
  }
  return d;
}
const ridge = (base, amp, k, ph, steps = 24) => Array.from({ length: steps + 1 }, (_, i) => {
  const t = i / steps;
  return [t * W, base - amp * Math.sin(t * k * Math.PI + ph) - amp * 0.32 * Math.sin(t * k * 2.7 * Math.PI + ph * 1.7)];
});
const hill = (base, amp, k, ph, fill) => `<path d="${smooth(ridge(base, amp, k, ph))}L${W} ${H}L0 ${H}Z" fill="${fill}"/>`;
const grad = (id, stops, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;
const glow = (id, c) => `<radialGradient id="${id}"><stop offset="0" stop-color="${c}" stop-opacity=".55"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;
const stars = (r, n, yMax, col = '#f7efcf') => Array.from({ length: n }, () => `<circle cx="${f1(r() * W)}" cy="${f1(r() * yMax)}" r="${f1(0.8 + r() * 1.9)}" fill="${col}" opacity="${f1(0.35 + r() * 0.6)}"/>`).join('');

/** Archimedean swirl strokes around (cx, cy). */
function swirl(cx, cy, R, turns, col, width, opacity) {
  const pts = [];
  for (let i = 0; i <= 90; i++) { const t = i / 90, a = t * turns * Math.PI * 2, r = R * t; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a) * 0.86]); }
  return `<path d="${smooth(pts)}" fill="none" stroke="${col}" stroke-width="${width}" stroke-linecap="round" opacity="${opacity}"/>`;
}

const SCENES = {
  swirl() {
    const r = rand(11);
    let s = `<defs>${grad('g', [[0, '#14204a'], [0.62, '#2a4684'], [1, '#4c78a8']])}${glow('m', '#f4d77a')}</defs><rect width="${W}" height="${H}" fill="url(#g)"/>`;
    s += stars(r, 70, 330);
    for (const [cx, cy, R, t, w] of [[880, 230, 150, 2.6, 9], [880, 230, 190, 2.9, 5], [420, 160, 70, 2.2, 6], [1320, 300, 80, 2.3, 6]]) {
      s += swirl(cx, cy, R, t, '#a9cfd0', w, 0.55) + swirl(cx, cy, R * 0.78, t * 0.9, '#e7eedc', w * 0.6, 0.45);
    }
    s += `<path d="${smooth([[0, 300], [300, 330], [600, 372], [900, 392], [1200, 376], [1500, 330], [1800, 310]])}" fill="none" stroke="#c7e0d6" stroke-width="14" stroke-linecap="round" opacity=".35"/>`;
    s += `<circle cx="1530" cy="118" r="110" fill="url(#m)"/><circle cx="1530" cy="118" r="38" fill="#f2c45c"/><circle cx="1514" cy="104" r="32" fill="#22346c"/>`;
    s += hill(470, 22, 2.2, 0.6, '#264378') + hill(520, 18, 3.1, 2.2, '#1d3550') + hill(570, 12, 2.5, 1.2, '#18292e');
    s += `<path d="M1660 600C1640 470 1652 330 1672 190c14 120 30 260 22 410Z" fill="#101a16"/>`;
    return s;
  },
  dawnhills() {
    let s = `<defs>${grad('g', [[0, '#fbe4d2'], [0.6, '#f4c3b0'], [1, '#e9a99f']])}${glow('m', '#fff4e2')}</defs><rect width="${W}" height="${H}" fill="url(#g)"/>`;
    s += `<circle cx="900" cy="300" r="260" fill="url(#m)"/><circle cx="900" cy="300" r="64" fill="#fff7ea"/>`;
    s += hill(330, 34, 1.6, 0.4, '#e7b1a6') + hill(390, 30, 2.1, 1.9, '#cf9298') + hill(450, 26, 2.6, 0.9, '#a97890') + hill(520, 22, 1.9, 2.6, '#7a5f7e') + hill(575, 14, 2.8, 1.4, '#55465f');
    s += `<path d="M760 180q12-10 24 0q12-10 24 0M840 150q9-8 18 0q9-8 18 0" fill="none" stroke="#7a5f7e" stroke-width="3" stroke-linecap="round" opacity=".6"/>`;
    return s;
  },
  tide() {
    const r = rand(23);
    let s = `<defs>${grad('g', [[0, '#e9f2f1'], [1, '#b7d6dd']])}${grad('w', [[0, '#5f97ae'], [1, '#24506a']])}${glow('m', '#fff3d6')}</defs><rect width="${W}" height="${H}" fill="url(#g)"/>`;
    s += `<circle cx="900" cy="260" r="210" fill="url(#m)"/><circle cx="900" cy="262" r="58" fill="#fff6e0"/>`;
    s += `<rect y="330" width="${W}" height="270" fill="url(#w)"/>`;
    for (let k = 0; k < 10; k++) { const y = 346 + k * 24, w = 150 - k * 11 + r() * 40; s += `<rect x="${f1(900 - w / 2)}" y="${y}" width="${f1(w)}" height="6" rx="3" fill="#fff4dc" opacity="${f1(0.75 - k * 0.06)}"/>`; }
    for (let k = 0; k < 26; k++) { const x = r() * W, y = 350 + r() * 240, l = 40 + r() * 90; s += `<path d="M${f1(x)} ${f1(y)}h${f1(l)}" stroke="#9cc4d0" stroke-width="3" stroke-linecap="round" opacity=".45"/>`; }
    s += `<path d="M260 330q60-40 130-30q50 8 90 30Z" fill="#3e6f86" opacity=".8"/><path d="M1380 330q40-22 92-18q30 4 60 18Z" fill="#3e6f86" opacity=".7"/>`;
    return s;
  },
  snowfield() {
    const r = rand(37);
    let s = `<defs>${grad('g', [[0, '#dfe7f0'], [1, '#c4d2e2']])}</defs><rect width="${W}" height="${H}" fill="url(#g)"/>`;
    s += `<circle cx="1260" cy="170" r="54" fill="#f7f4ec" opacity=".9"/>`;
    s += hill(360, 40, 1.4, 0.2, '#b6c5d8') + hill(430, 30, 2.2, 1.3, '#d2dce8');
    for (let k = 0; k < 14; k++) {
      const x = 120 + k * 120 + r() * 50, h = 70 + r() * 70, y = 430 - r() * 20;
      s += `<path d="M${f1(x)} ${f1(y - h)}l${f1(h * 0.28)} ${f1(h * 0.55)}h${f1(-h * 0.12)}l${f1(h * 0.2)} ${f1(h * 0.45)}h${f1(-h * 0.72)}l${f1(h * 0.2)} ${f1(-h * 0.45)}h${f1(-h * 0.12)}Z" fill="#7d90aa" opacity="${f1(0.55 + r() * 0.3)}"/>`;
    }
    s += hill(500, 22, 1.8, 2.4, '#eef2f6') + hill(560, 14, 2.6, 0.7, '#f8f8f6');
    s += Array.from({ length: 90 }, () => `<circle cx="${f1(r() * W)}" cy="${f1(r() * H)}" r="${f1(1.2 + r() * 2.4)}" fill="#fff" opacity="${f1(0.5 + r() * 0.5)}"/>`).join('');
    return s;
  },
  cloudland() {
    const r = rand(41);
    let s = `<defs>${grad('g', [[0, '#d9cdec'], [0.65, '#f1d3dd'], [1, '#fbe6dc']])}</defs><rect width="${W}" height="${H}" fill="url(#g)"/>`;
    const cloud = (x, y, k, c, o) => {
      let d = '';
      for (let i = 0; i < 6; i++) d += `<circle cx="${f1(x + (i - 2.5) * 46 * k)}" cy="${f1(y - Math.sin((i / 5) * Math.PI) * 38 * k)}" r="${f1((44 + r() * 20) * k)}"/>`;
      return `<g fill="${c}" opacity="${o}">${d}<rect x="${f1(x - 150 * k)}" y="${f1(y)}" width="${f1(300 * k)}" height="${f1(46 * k)}" rx="${f1(23 * k)}"/></g>`;
    };
    s += `<circle cx="560" cy="200" r="70" fill="#fff6ee" opacity=".85"/>`;
    s += cloud(330, 330, 1.2, '#efe2f3', 0.9) + cloud(1450, 260, 1.4, '#f6e8f0', 0.95) + cloud(900, 420, 1.8, '#fbf1f2', 1) + cloud(240, 520, 1.6, '#fff8f6', 1) + cloud(1600, 520, 1.5, '#fff8f6', 1);
    return s;
  },
  mosaic() {
    const r = rand(53);
    const C = ['#cfd9c4', '#9fb59a', '#6f8f74', '#e2c38e', '#d79f73', '#f3ece0', '#41594a'];
    let s = `<rect width="${W}" height="${H}" fill="#f3ece0"/>`;
    const cell = 150;
    for (let j = 0; j < 4; j++) for (let i = 0; i < 12; i++) {
      const x = i * cell, y = j * cell, bg = C[Math.floor(r() * C.length)];
      let fg = C[Math.floor(r() * C.length)]; if (fg === bg) fg = '#41594a';
      const k = Math.floor(r() * 5), rot = Math.floor(r() * 4) * 90, cx0 = x + cell / 2, cy0 = y + cell / 2;
      s += `<rect x="${x}" y="${y}" width="${cell + 0.5}" height="${cell + 0.5}" fill="${bg}"/>`;
      const g = (inner) => `<g transform="rotate(${rot} ${cx0} ${cy0})">${inner}</g>`;
      if (k === 0) s += g(`<path d="M${x} ${y + cell}A${cell} ${cell} 0 0 1 ${x + cell} ${y}V${y + cell}Z" fill="${fg}"/>`);
      else if (k === 1) s += `<circle cx="${cx0}" cy="${cy0}" r="${cell * 0.32}" fill="${fg}"/>`;
      else if (k === 2) s += g(`<path d="M${x} ${cy0}A${cell / 2} ${cell / 2} 0 0 1 ${x + cell} ${cy0}Z" fill="${fg}"/>`);
      else if (k === 3) s += g(`<path d="M${x} ${y + cell}L${cx0} ${y}L${x + cell} ${y + cell}Z" fill="${fg}"/>`);
      else s += `<rect x="${x + cell * 0.25}" y="${y + cell * 0.25}" width="${cell * 0.5}" height="${cell * 0.5}" fill="${fg}"/>`;
    }
    return s;
  },
  meadow() {
    const r = rand(67);
    let s = `<defs>${grad('g', [[0, '#eef1dc'], [1, '#d8e3c1']])}</defs><rect width="${W}" height="${H}" fill="url(#g)"/>`;
    s += `<circle cx="1320" cy="150" r="60" fill="#fff8e0"/>`;
    s += hill(370, 30, 1.5, 0.6, '#bcd0a2') + hill(430, 26, 2.2, 2.1, '#9cba86');
    s += `<g><path d="M612 420c-4-60 2-120 6-170" stroke="#5e5040" stroke-width="10" stroke-linecap="round"/><circle cx="618" cy="236" r="66" fill="#6f9a66"/><circle cx="572" cy="268" r="48" fill="#7fa874"/><circle cx="664" cy="270" r="50" fill="#5f8a5a"/></g>`;
    s += hill(500, 22, 1.8, 1.0, '#7ea56f') + hill(560, 14, 2.4, 2.8, '#6a915e');
    s += Array.from({ length: 140 }, () => { const x = r() * W, y = 470 + r() * 130; return `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(2.2 + r() * 3)}" fill="${['#f4e7a1', '#f6c6c6', '#fbf5ea', '#d9c3ef'][Math.floor(r() * 4)]}" opacity=".9"/>`; }).join('');
    return s;
  },
  lanterns() {
    const r = rand(79);
    let s = `<defs>${grad('g', [[0, '#2a2747'], [0.6, '#5a3f62'], [1, '#c27a6a']])}${glow('l', '#ffcf86')}</defs><rect width="${W}" height="${H}" fill="url(#g)"/>`;
    s += stars(r, 40, 220);
    s += hill(420, 18, 1.8, 0.4, '#3a2c48') + `<rect y="440" width="${W}" height="160" fill="#2a2240"/>`;
    for (let k = 0; k < 18; k++) {
      const x = 80 + r() * 1640, y = 90 + r() * 300, sc = 0.6 + r() * 0.8;
      s += `<circle cx="${f1(x)}" cy="${f1(y + 16 * sc)}" r="${f1(46 * sc)}" fill="url(#l)"/><path d="M${f1(x - 12 * sc)} ${f1(y)}h${f1(24 * sc)}l${f1(4 * sc)} ${f1(30 * sc)}h${f1(-32 * sc)}Z" fill="#f6b46a"/><rect x="${f1(x - 13 * sc)}" y="${f1(y - 3 * sc)}" width="${f1(26 * sc)}" height="${f1(4 * sc)}" rx="${f1(2 * sc)}" fill="#c9774a"/>`;
      s += `<rect x="${f1(x - 10 * sc)}" y="${f1(452 + (y / H) * 120)}" width="${f1(20 * sc)}" height="${f1(4 * sc)}" rx="2" fill="#f6b46a" opacity=".35"/>`;
    }
    return s;
  },
};

export const DEFAULT_BANNERS = Object.keys(SCENES);
const cache = new Map();

/** Data URI of a built-in banner. */
export function bannerUri(id) {
  if (!cache.has(id)) {
    const body = (SCENES[id] ?? SCENES.swirl)();
    cache.set(id, `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice">${body}</svg>`)}`);
  }
  return cache.get(id);
}

/** "default:<id>" → built-in art; anything else is already a URL. */
export const resolveArt = (src) => (typeof src === 'string' && src.startsWith('default:') ? bannerUri(src.slice(8)) : src);
export const randomBanner = () => `default:${DEFAULT_BANNERS[Math.floor(Math.random() * DEFAULT_BANNERS.length)]}`;
