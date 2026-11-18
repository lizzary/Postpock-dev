// Generated artwork standing in for downloaded images: covers, post images, banners and avatars.
// Every picture is a deterministic SVG (seeded), served as a data URI, so the mock library works offline.
import { seeded } from '../domain/random.js';

export const PALETTES = {
  dusk: { sky: ['#f6d5c3', '#e9a6a6'], layers: ['#c98b9a', '#9e6c8f', '#6d5182', '#3f3a63'], sun: '#fff1d6', accent: '#f2b880', paper: '#f7ede4', ink: '#2f2a46' },
  dawn: { sky: ['#fde9d6', '#f7c8b0'], layers: ['#e3b5a4', '#c9918f', '#8f6f7f', '#5a4e66'], sun: '#fffaf0', accent: '#e98c7a', paper: '#fbf3ea', ink: '#3b3346' },
  mint: { sky: ['#e3f1ea', '#bfe0d4'], layers: ['#9ccbbb', '#6fae9f', '#3f8580', '#245c5e'], sun: '#fffbe9', accent: '#f4c27a', paper: '#eef6f1', ink: '#1d3f45' },
  lagoon: { sky: ['#d7ecf2', '#a9d3e0'], layers: ['#7fb6ca', '#5592ad', '#346f8e', '#1f4a66'], sun: '#fff6dc', accent: '#f0a35e', paper: '#eaf4f6', ink: '#183447' },
  lavender: { sky: ['#ece6f4', '#d3c6e8'], layers: ['#b8a6d6', '#9483be', '#6b5f9c', '#463f71'], sun: '#fff8ec', accent: '#f1b3c4', paper: '#f3eff8', ink: '#2d2747' },
  sakura: { sky: ['#fdebef', '#f6cdd8'], layers: ['#ecaebf', '#d9899f', '#b46a86', '#7d4d68'], sun: '#fffaf3', accent: '#f7d38a', paper: '#fdf3f5', ink: '#4a2f3f' },
  forest: { sky: ['#eef0dc', '#d5dcb6'], layers: ['#a9bd8e', '#7f9a6c', '#56744f', '#344d38'], sun: '#fff6d8', accent: '#e8a865', paper: '#f4f3e6', ink: '#24352a' },
  amber: { sky: ['#fbe9c8', '#f3cc8e'], layers: ['#e5ab6a', '#c9854f', '#9a5d3f', '#5f3b31'], sun: '#fff8e6', accent: '#7fa0b8', paper: '#fbf2e2', ink: '#3c271f' },
  night: { sky: ['#1f2a4d', '#3d4f80'], layers: ['#3a4c7c', '#2a3c68', '#1d2c52', '#131d38'], sun: '#f6e7b4', accent: '#e8c46a', paper: '#e9e6dc', ink: '#0f1730' },
  slate: { sky: ['#eef1f4', '#d8dee6'], layers: ['#b6c0cc', '#8d9aab', '#637387', '#3d4b5e'], sun: '#ffffff', accent: '#d97d6a', paper: '#f2f4f6', ink: '#263241' },
  peach: { sky: ['#fff0e3', '#ffd9c2'], layers: ['#f5b99c', '#e8957c', '#c9746a', '#8f5560'], sun: '#fffaf0', accent: '#8fb8a8', paper: '#fff6ee', ink: '#4b2f37' },
  sage: { sky: ['#f1f3ea', '#dfe5d3'], layers: ['#c3cfb4', '#a1b394', '#7c9275', '#566b57'], sun: '#fffdf2', accent: '#e2a1a1', paper: '#f5f6ef', ink: '#2f3a31' },
  deep: { sky: ['#16324f', '#2c5576'], layers: ['#2e5b78', '#234a66', '#173750', '#0e263a'], sun: '#f3e6c0', accent: '#f0b36b', paper: '#e5ebef', ink: '#0c1d2c' },
};

const f1 = (n) => Math.round(n * 10) / 10;

/** Catmull-Rom → cubic Bézier path through pts. */
function smoothD(pts) {
  let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f1(c1[0])} ${f1(c1[1])} ${f1(c2[0])} ${f1(c2[1])} ${f1(p2[0])} ${f1(p2[1])}`;
  }
  return d;
}

const ridge = (r, w, base, amp, steps = 18) => {
  const a = r.range(1, 2.4), b = r.range(3, 6.5), p = r() * 6.3, q = r() * 6.3;
  const pts = [];
  for (let k = 0; k <= steps; k++) {
    const t = k / steps;
    pts.push([t * w, base - amp * Math.sin(t * a * Math.PI + p) - amp * 0.35 * Math.sin(t * b * Math.PI + q)]);
  }
  return pts;
};

const sky = (w, h, P, extra = '') => `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.sky[0]}"/><stop offset="1" stop-color="${P.sky[1]}"/></linearGradient>${extra}</defs><rect width="${w}" height="${h}" fill="url(#s)"/>`;

function sun(r, w, h, P, yMax = 0.42) {
  const m = Math.min(w, h), sr = m * r.range(0.07, 0.12);
  const x = w * r.range(0.16, 0.84), y = h * r.range(0.14, yMax);
  return { x, y, r: sr, svg: `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(sr * 2.3)}" fill="${P.sun}" opacity=".16"/><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(sr * 1.5)}" fill="${P.sun}" opacity=".22"/><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(sr)}" fill="${P.sun}"/>` };
}

// ------------------------------------------------------------------ styles
const STYLES = {
  hills(r, w, h, P) {
    let s = sky(w, h, P) + sun(r, w, h, P).svg;
    const n = P.layers.length;
    P.layers.forEach((c, i) => {
      s += `<path d="${smoothD(ridge(r, w, h * (0.5 + i * (0.42 / n)), h * r.range(0.04, 0.08)))}L${w} ${h}L0 ${h}Z" fill="${c}"/>`;
    });
    if (r.chance(0.6)) {                                    // a few birds
      for (let k = 0; k < r.int(2, 4); k++) {
        const x = w * r.range(0.2, 0.8), y = h * r.range(0.12, 0.36), b = Math.min(w, h) * r.range(0.012, 0.022);
        s += `<path d="M${f1(x - b)} ${f1(y)}q${f1(b / 2)} ${f1(-b * 0.6)} ${f1(b)} 0q${f1(b / 2)} ${f1(-b * 0.6)} ${f1(b)} 0" fill="none" stroke="${P.ink}" stroke-opacity=".55" stroke-width="${f1(b * 0.22)}" stroke-linecap="round"/>`;
      }
    }
    return s;
  },
  moonlit(r, w, h, P) {
    const N = PALETTES.night;
    let s = sky(w, h, N);
    for (let k = 0; k < 40; k++) s += `<circle cx="${f1(r() * w)}" cy="${f1(r() * h * 0.55)}" r="${f1(r.range(0.6, 2.2) * Math.min(w, h) / 600)}" fill="#f6efd2" opacity="${f1(r.range(0.4, 0.95))}"/>`;
    const m = Math.min(w, h), mx = w * r.range(0.55, 0.8), my = h * r.range(0.2, 0.32), mr = m * 0.16;
    s += `<circle cx="${f1(mx)}" cy="${f1(my)}" r="${f1(mr * 1.9)}" fill="${N.sun}" opacity=".08"/><circle cx="${f1(mx)}" cy="${f1(my)}" r="${f1(mr)}" fill="${P.sun === '#ffffff' ? N.sun : P.sun}"/>`;
    const hill = ridge(r, w, h * 0.78, h * 0.05, 14);
    s += `<path d="${smoothD(ridge(r, w, h * 0.68, h * 0.05))}L${w} ${h}L0 ${h}Z" fill="${N.layers[1]}"/>`;
    s += `<path d="${smoothD(hill)}L${w} ${h}L0 ${h}Z" fill="${N.layers[3]}"/>`;
    // a small figure and a cat sitting on the hill, looking at the moon
    const k = Math.round(14 * r.range(0.3, 0.45)), [fx, fy] = hill[k], u = m / 120;
    s += `<g fill="${N.layers[3]}"><circle cx="${f1(fx)}" cy="${f1(fy - 11 * u)}" r="${f1(2.6 * u)}"/><path d="M${f1(fx - 3.4 * u)} ${f1(fy + 1)}q${f1(0.2 * u)} ${f1(-8.6 * u)} ${f1(3.4 * u)} ${f1(-8.6 * u)}q${f1(3.2 * u)} 0 ${f1(3.6 * u)} ${f1(8.6 * u)}z"/>`
      + `<path d="M${f1(fx + 6 * u)} ${f1(fy + 1)}q0 ${f1(-3.4 * u)} ${f1(1.8 * u)} ${f1(-3.6 * u)}l${f1(0.3 * u)} ${f1(-1.4 * u)}l${f1(0.8 * u)} ${f1(1.1 * u)}l${f1(0.8 * u)} ${f1(-1.1 * u)}l${f1(0.3 * u)} ${f1(1.4 * u)}q${f1(1.6 * u)} ${f1(0.4 * u)} ${f1(1.4 * u)} ${f1(3.6 * u)}z"/></g>`;
    return s;
  },
  sea(r, w, h, P) {
    const hz = h * r.range(0.52, 0.62);
    const sn = sun(r, w, hz, P, 0.7);
    let s = sky(w, h, P) + sn.svg;
    s += `<rect y="${f1(hz)}" width="${w}" height="${f1(h - hz)}" fill="${P.layers[2]}"/>`;
    s += `<rect y="${f1(hz)}" width="${w}" height="${f1((h - hz) * 0.35)}" fill="${P.layers[1]}" opacity=".7"/>`;
    for (let k = 0; k < 9; k++) {                           // the sun's broken reflection
      const y = hz + (h - hz) * (0.06 + k * 0.1), ww = sn.r * (2.2 - k * 0.18) * r.range(0.7, 1.2);
      s += `<rect x="${f1(sn.x - ww / 2)}" y="${f1(y)}" width="${f1(ww)}" height="${f1(Math.max(2, (h - hz) * 0.022))}" rx="2" fill="${P.sun}" opacity="${f1(0.75 - k * 0.06)}"/>`;
    }
    for (let k = 0; k < 14; k++) {
      const y = hz + (h - hz) * r.range(0.15, 0.95), x = r() * w, l = w * r.range(0.03, 0.08);
      s += `<path d="M${f1(x)} ${f1(y)}h${f1(l)}" stroke="${P.layers[0]}" stroke-opacity=".5" stroke-width="${f1(Math.max(1.5, h / 300))}" stroke-linecap="round"/>`;
    }
    if (r.chance(0.5)) {                                    // a far island
      const x0 = w * r.range(0.05, 0.6), iw = w * r.range(0.18, 0.32);
      s += `<path d="M${f1(x0)} ${f1(hz)}q${f1(iw * 0.3)} ${f1(-h * 0.06)} ${f1(iw * 0.55)} ${f1(-h * 0.04)}q${f1(iw * 0.25)} ${f1(h * 0.01)} ${f1(iw * 0.45)} ${f1(h * 0.04)}z" fill="${P.layers[3]}" opacity=".75"/>`;
    }
    return s;
  },
  botanic(r, w, h, P) {
    let s = `<rect width="${w}" height="${h}" fill="${P.paper}"/>`;
    const m = Math.min(w, h);
    s += `<circle cx="${f1(w * r.range(0.3, 0.7))}" cy="${f1(h * r.range(0.3, 0.55))}" r="${f1(m * r.range(0.28, 0.4))}" fill="${P.sky[1]}" opacity=".7"/>`;
    const stems = r.int(3, 5);
    for (let k = 0; k < stems; k++) {
      const x0 = w * (0.2 + 0.6 * ((k + r.range(0.2, 0.8)) / stems)), x1 = x0 + w * r.range(-0.12, 0.12);
      const y1 = h * r.range(0.18, 0.5);
      const cx = (x0 + x1) / 2 + w * r.range(-0.1, 0.1);
      s += `<path d="M${f1(x0)} ${f1(h)}Q${f1(cx)} ${f1((h + y1) / 2)} ${f1(x1)} ${f1(y1)}" fill="none" stroke="${P.layers[3]}" stroke-width="${f1(m * 0.008)}" stroke-linecap="round"/>`;
      for (let j = 0; j < r.int(2, 4); j++) {               // leaves
        const t = r.range(0.25, 0.8), lx = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1, ly = (1 - t) * (1 - t) * h + 2 * (1 - t) * t * ((h + y1) / 2) + t * t * y1;
        const side = j % 2 ? 1 : -1, ll = m * r.range(0.07, 0.12), ang = side * r.range(30, 60);
        s += `<ellipse cx="${f1(lx + side * ll * 0.5)}" cy="${f1(ly)}" rx="${f1(ll * 0.55)}" ry="${f1(ll * 0.2)}" fill="${P.layers[2]}" transform="rotate(${f1(-ang)} ${f1(lx)} ${f1(ly)})"/>`;
      }
      const pr = m * r.range(0.035, 0.06), petals = r.int(5, 8), col = r.pick([P.accent, P.layers[0], P.layers[1]]);
      for (let j = 0; j < petals; j++) {
        const a = (j / petals) * 360 + r.range(0, 10);
        s += `<ellipse cx="${f1(x1)}" cy="${f1(y1 - pr)}" rx="${f1(pr * 0.55)}" ry="${f1(pr)}" fill="${col}" transform="rotate(${f1(a)} ${f1(x1)} ${f1(y1)})"/>`;
      }
      s += `<circle cx="${f1(x1)}" cy="${f1(y1)}" r="${f1(pr * 0.45)}" fill="${P.sun === '#ffffff' ? P.accent : P.ink}" opacity=".85"/>`;
    }
    return s;
  },
  bauhaus(r, w, h, P) {
    const cols = r.int(3, 5), cell = w / cols, rows = Math.ceil(h / cell);
    const C = [P.layers[0], P.layers[1], P.layers[2], P.layers[3], P.accent, P.sky[1], P.paper];
    let s = `<rect width="${w}" height="${h}" fill="${P.paper}"/>`;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const x = i * cell, y = j * cell, bg = r.pick(C);
      let fg = r.pick(C); if (fg === bg) fg = P.ink;
      s += `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(cell + 0.5)}" height="${f1(cell + 0.5)}" fill="${bg}"/>`;
      const kind = r.int(0, 4), rot = r.int(0, 3) * 90, cxp = x + cell / 2, cyp = y + cell / 2;
      const g = (inner) => `<g transform="rotate(${rot} ${f1(cxp)} ${f1(cyp)})">${inner}</g>`;
      if (kind === 0) s += g(`<path d="M${f1(x)} ${f1(y + cell)}A${f1(cell)} ${f1(cell)} 0 0 1 ${f1(x + cell)} ${f1(y)}L${f1(x + cell)} ${f1(y + cell)}Z" fill="${fg}"/>`);
      else if (kind === 1) s += `<circle cx="${f1(cxp)}" cy="${f1(cyp)}" r="${f1(cell * 0.32)}" fill="${fg}"/>`;
      else if (kind === 2) s += g(`<path d="M${f1(x)} ${f1(cyp)}A${f1(cell / 2)} ${f1(cell / 2)} 0 0 1 ${f1(x + cell)} ${f1(cyp)}Z" fill="${fg}"/>`);
      else if (kind === 3) s += g(`<path d="M${f1(x)} ${f1(y + cell)}L${f1(cxp)} ${f1(y)}L${f1(x + cell)} ${f1(y + cell)}Z" fill="${fg}"/>`);
      else s += `<rect x="${f1(x + cell * 0.22)}" y="${f1(y + cell * 0.22)}" width="${f1(cell * 0.56)}" height="${f1(cell * 0.56)}" fill="${fg}"/>`;
    }
    return s;
  },
  waves(r, w, h, P) {
    let s = sky(w, h, P);
    const rows = r.int(6, 9), band = (h * 0.62) / rows, R = band * 0.95;
    for (let j = 0; j < rows; j++) {
      const y = h * 0.38 + j * band, c = P.layers[Math.min(3, Math.floor((j / rows) * 4))];
      const off = (j % 2) * R;
      let d = `M0 ${f1(h)}L0 ${f1(y + R)}`;
      for (let x = -off; x < w + 2 * R; x += 2 * R) d += `A${f1(R)} ${f1(R)} 0 0 1 ${f1(x + 2 * R)} ${f1(y + R)}`;
      s += `<path d="${d}L${w} ${f1(h)}Z" fill="${c}"/>`;
      for (let x = -off; x < w + 2 * R; x += 2 * R) s += `<path d="M${f1(x + R * 0.35)} ${f1(y + R)}A${f1(R * 0.65)} ${f1(R * 0.65)} 0 0 1 ${f1(x + R * 1.65)} ${f1(y + R)}" fill="none" stroke="${P.paper}" stroke-opacity=".55" stroke-width="${f1(R * 0.08)}"/>`;
    }
    return s + sun(r, w, h * 0.5, P, 0.6).svg.replace(/opacity="\.(16|22)"/g, 'opacity=".12"');
  },
  town(r, w, h, P) {
    const N = PALETTES.night;
    let s = sky(w, h, N);
    for (let k = 0; k < 50; k++) s += `<circle cx="${f1(r() * w)}" cy="${f1(r() * h * 0.5)}" r="${f1(r.range(0.6, 2) * Math.min(w, h) / 600)}" fill="#f6efd2" opacity="${f1(r.range(0.35, 0.9))}"/>`;
    const mx = w * r.range(0.12, 0.88), my = h * r.range(0.12, 0.26), mr = Math.min(w, h) * 0.07;
    s += `<circle cx="${f1(mx)}" cy="${f1(my)}" r="${f1(mr)}" fill="${N.sun}"/><circle cx="${f1(mx - mr * 0.35)}" cy="${f1(my - mr * 0.2)}" r="${f1(mr * 0.9)}" fill="${N.sky[0]}"/>`;
    let x = -r.range(0, 20);
    while (x < w) {
      const bw = w * r.range(0.06, 0.12), bh = h * r.range(0.22, 0.48), y = h - bh;
      const c = r.pick([N.layers[2], N.layers[3], N.layers[1]]);
      s += `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(bw + 1)}" height="${f1(bh)}" fill="${c}"/>`;
      if (r.chance(0.4)) s += `<path d="M${f1(x)} ${f1(y)}L${f1(x + bw / 2)} ${f1(y - bw * 0.45)}L${f1(x + bw)} ${f1(y)}Z" fill="${c}"/>`;
      const ww = bw / 7;
      for (let yy = y + ww * 1.4; yy < h - ww * 2; yy += ww * 2.2) for (let xx = x + ww; xx < x + bw - ww; xx += ww * 2) {
        if (r.chance(0.45)) s += `<rect x="${f1(xx)}" y="${f1(yy)}" width="${f1(ww)}" height="${f1(ww * 1.3)}" fill="${r.chance(0.8) ? P.accent : N.sun}" opacity="${f1(r.range(0.6, 1))}"/>`;
      }
      x += bw;
    }
    return s;
  },
};
export const STYLE_NAMES = Object.keys(STYLES);

const cache = new Map();
const toUri = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/** An artwork as a data URI. w/h set the aspect (the picture is drawn at ~1200 px on its long side). */
export function artwork(seed, style, palette, w, h) {
  const key = `${seed}|${style}|${palette}|${w}x${h}`;
  let uri = cache.get(key);
  if (!uri) {
    const k = 1200 / Math.max(w, h), W = Math.round(w * k), H = Math.round(h * k);
    const body = STYLES[style](seeded(key), W, H, PALETTES[palette]);
    uri = toUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice">${body}</svg>`);
    cache.set(key, uri);
  }
  return uri;
}

// ------------------------------------------------------------------ avatars
const EYE = (x, y, c, s = 1) => `<ellipse cx="${x}" cy="${y}" rx="${3.4 * s}" ry="${4 * s}" fill="${c}"/><circle cx="${x + 1.1 * s}" cy="${y - 1.4 * s}" r="${1.2 * s}" fill="#fff" opacity=".9"/>`;
const ANIMALS = {
  cat: (P) => `<path d="M24 46 28 18 44 34Z M76 46 72 18 56 34Z" fill="${P.f}"/><path d="M29 38 31 24 40 33Z M71 38 69 24 60 33Z" fill="${P.e}"/><ellipse cx="50" cy="57" rx="31" ry="27" fill="${P.f}"/>${EYE(39, 55, P.k)}${EYE(61, 55, P.k)}<path d="M47 64h6l-3 3.4z" fill="${P.e}"/><path d="M50 67.4q-3 4-7 2M50 67.4q3 4 7 2" fill="none" stroke="${P.k}" stroke-width="1.6" stroke-linecap="round"/><path d="M20 60h11M21 66l10-2M80 60H69M79 66l-10-2" stroke="${P.k}" stroke-opacity=".45" stroke-width="1.3" stroke-linecap="round"/>`,
  rabbit: (P) => `<rect x="31" y="6" width="13" height="40" rx="6.5" fill="${P.f}" transform="rotate(-10 37 46)"/><rect x="56" y="6" width="13" height="40" rx="6.5" fill="${P.f}" transform="rotate(10 63 46)"/><rect x="34.5" y="12" width="6" height="28" rx="3" fill="${P.e}" transform="rotate(-10 37 46)"/><rect x="59.5" y="12" width="6" height="28" rx="3" fill="${P.e}" transform="rotate(10 63 46)"/><circle cx="50" cy="60" r="27" fill="${P.f}"/>${EYE(40, 58, P.k)}${EYE(60, 58, P.k)}<ellipse cx="50" cy="66" rx="3" ry="2.2" fill="${P.e}"/><circle cx="33" cy="68" r="4" fill="${P.e}" opacity=".5"/><circle cx="67" cy="68" r="4" fill="${P.e}" opacity=".5"/>`,
  bear: (P) => `<circle cx="27" cy="33" r="11" fill="${P.f}"/><circle cx="73" cy="33" r="11" fill="${P.f}"/><circle cx="27" cy="33" r="5.5" fill="${P.e}"/><circle cx="73" cy="33" r="5.5" fill="${P.e}"/><circle cx="50" cy="57" r="29" fill="${P.f}"/><ellipse cx="50" cy="66" rx="12" ry="9" fill="${P.l}"/>${EYE(39, 53, P.k, 0.9)}${EYE(61, 53, P.k, 0.9)}<ellipse cx="50" cy="62.5" rx="4.4" ry="3.2" fill="${P.k}"/><path d="M50 65.5v3.5" stroke="${P.k}" stroke-width="1.6" stroke-linecap="round"/>`,
  fox: (P) => `<path d="M20 30 32 12 44 34Z M80 30 68 12 56 34Z" fill="${P.f}"/><path d="M25 29 32 18 39 31Z M75 29 68 18 61 31Z" fill="${P.k}" opacity=".6"/><path d="M18 40Q50 26 82 40Q80 70 50 84Q20 70 18 40Z" fill="${P.f}"/><path d="M30 58Q42 60 50 84Q58 60 70 58Q62 74 50 84Q38 74 30 58Z" fill="${P.l}"/>${EYE(39, 52, P.k, 0.85)}${EYE(61, 52, P.k, 0.85)}<ellipse cx="50" cy="77" rx="3.6" ry="2.6" fill="${P.k}"/>`,
  owl: (P) => `<path d="M24 30 32 40M76 30 68 40" stroke="${P.f}" stroke-width="7" stroke-linecap="round"/><ellipse cx="50" cy="58" rx="30" ry="30" fill="${P.f}"/><circle cx="38" cy="52" r="11" fill="${P.l}"/><circle cx="62" cy="52" r="11" fill="${P.l}"/>${EYE(38, 52, P.k, 1.2)}${EYE(62, 52, P.k, 1.2)}<path d="M46 62 54 62 50 69Z" fill="${P.e}"/><path d="M36 76q4-3 7 0t7 0 7 0 7 0" fill="none" stroke="${P.k}" stroke-opacity=".3" stroke-width="1.5" stroke-linecap="round"/>`,
  penguin: (P) => `<ellipse cx="50" cy="56" rx="30" ry="31" fill="${P.k}"/><path d="M50 40C58 30 76 40 72 58 70 72 60 80 50 80 40 80 30 72 28 58 24 40 42 30 50 40Z" fill="#fbf7ee"/>${EYE(41, 55, P.k, 0.85)}${EYE(59, 55, P.k, 0.85)}<path d="M44 63h12l-6 6z" fill="${P.e}"/><circle cx="35" cy="66" r="3.6" fill="${P.e}" opacity=".45"/><circle cx="65" cy="66" r="3.6" fill="${P.e}" opacity=".45"/>`,
  frog: (P) => `<circle cx="34" cy="36" r="12" fill="${P.f}"/><circle cx="66" cy="36" r="12" fill="${P.f}"/><ellipse cx="50" cy="60" rx="33" ry="25" fill="${P.f}"/><circle cx="34" cy="36" r="7" fill="#fbf7ee"/><circle cx="66" cy="36" r="7" fill="#fbf7ee"/><circle cx="35" cy="37" r="3.6" fill="${P.k}"/><circle cx="67" cy="37" r="3.6" fill="${P.k}"/><path d="M36 64q14 10 28 0" fill="none" stroke="${P.k}" stroke-width="2" stroke-linecap="round"/><circle cx="28" cy="62" r="5" fill="${P.e}" opacity=".5"/><circle cx="72" cy="62" r="5" fill="${P.e}" opacity=".5"/>`,
  chick: (P) => `<path d="M50 22q-4-8 2-10q-1 6 3 9" fill="${P.f}"/><circle cx="50" cy="56" r="31" fill="${P.f}"/>${EYE(40, 52, P.k, 0.9)}${EYE(60, 52, P.k, 0.9)}<path d="M44 61h12l-6 7z" fill="${P.e}"/><circle cx="31" cy="64" r="5" fill="${P.e}" opacity=".4"/><circle cx="69" cy="64" r="5" fill="${P.e}" opacity=".4"/>`,
};
export const AVATAR_ANIMALS = Object.keys(ANIMALS);
const FUR = {
  cat: ['#f3e3cc', '#8a7b70', '#2a2a33'], rabbit: ['#fbf7ee', '#f2b8bf', '#3a3340'], bear: ['#b98a62', '#8a6446', '#2e2420'],
  fox: ['#e9965c', '#f8ece0', '#2e2420'], owl: ['#a98e74', '#efe2cc', '#2e2620'], penguin: ['#2f3446', '#f0a050', '#20232e'],
  frog: ['#9ccb8a', '#f2a3a3', '#24302a'], chick: ['#f6d77a', '#f0a050', '#3a3024'],
};

/** A round animal avatar on a coloured ground. */
export function avatar(animal, palette) {
  const key = `av|${animal}|${palette}`;
  let uri = cache.get(key);
  if (!uri) {
    const P = PALETTES[palette], [f, e, k] = FUR[animal];
    const parts = { f, e: animal === 'fox' ? '#f2b8a8' : e, k, l: animal === 'fox' ? e : '#f8efe2' };
    uri = toUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="200" height="200"><rect width="100" height="100" fill="${P.sky[1]}"/><circle cx="50" cy="118" r="62" fill="${P.layers[0]}" opacity=".55"/>${ANIMALS[animal](parts)}</svg>`);
    cache.set(key, uri);
  }
  return uri;
}
