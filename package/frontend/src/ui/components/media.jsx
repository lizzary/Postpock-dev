import { useLayoutEffect, useRef, useState } from 'react';
import { resolveArt } from '../art/banners/banners.js';
import { Icon } from '../icons/Icon.jsx';
import s from './media.module.css';

const cx = (...a) => a.filter(Boolean).join(' ');

/** Images already shown in this session: they appear at once, without the fade. */
const shown = new Set();

/**
 * An image that fades in once decoded. `focus` = { x, y } in 0–1 picks the crop.
 * An image already shown in this session appears at once: coming back to a page its covers are simply there, and a
 * cover morphing between pages (home card ↔ author banner, post card ↔ post cover) finds its other end visible.
 */
export function Picture({ src, alt = '', ratio, fit = 'cover', focus, className, imgClassName, eager, style, children, onLoad }) {
  const url = resolveArt(src);
  const [loadedUrl, setLoadedUrl] = useState(() => (shown.has(url) ? url : null));
  const img = useRef(null);
  useLayoutEffect(() => {
    const el = img.current;
    if (shown.has(url) || (el?.complete && el.naturalWidth > 0)) { shown.add(url); setLoadedUrl(url); }
  }, [url]);
  return (
    <div className={cx(s.pic, loadedUrl === url && s.loaded, className)} style={{ aspectRatio: ratio, ...style }}>
      {url && (
        <img
          key={url}
          ref={img}
          src={url}
          alt={alt}
          className={imgClassName}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          draggable={false}
          onLoad={(e) => { shown.add(url); setLoadedUrl(url); onLoad?.(e); }}
          style={{ objectFit: fit, objectPosition: focus ? `${(focus.x * 100).toFixed(1)}% ${(focus.y * 100).toFixed(1)}%` : undefined }}
        />
      )}
      {children}
    </div>
  );
}

const TINTS = ['#c98b9a', '#7fa0b8', '#8fb39a', '#c9a46a', '#9a8cc0', '#c7866e'];
const tintOf = (name = '') => TINTS[[...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % TINTS.length];

export function Avatar({ src, name, size = 40, className, ring }) {
  const [failed, setFailed] = useState(false);
  const url = resolveArt(src);
  return (
    <span className={cx(s.avatar, ring && s.ring, className)} style={{ width: size, height: size, '--tint': tintOf(name) }}>
      {url && !failed
        ? <img src={url} alt="" draggable={false} onError={() => setFailed(true)} />
        : <span className={s.initial} style={{ fontSize: size * 0.42 }}>{(name || '?').trim().slice(0, 1).toUpperCase()}</span>}
    </span>
  );
}

/** Page numbers with gaps: 1 … 4 5 [6] 7 8 … 20 */
function pages(cur, n) {
  if (n <= 7) return Array.from({ length: n }, (_, i) => i + 1);
  const out = [1];
  const a = Math.max(2, cur - 1), b = Math.min(n - 1, cur + 1);
  if (a > 2) out.push('…a');
  for (let i = a; i <= b; i++) out.push(i);
  if (b < n - 1) out.push('…b');
  out.push(n);
  return out;
}

export function Pagination({ page, pageCount, onChange, labels }) {
  if (pageCount <= 1) return null;
  return (
    <nav className={s.pager} aria-label={labels.nav}>
      <button type="button" className={s.pageArrow} disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label={labels.prev}>
        <Icon name="chevron-left" size={17} />
      </button>
      {pages(page, pageCount).map((p) => (typeof p === 'string'
        ? <span key={p} className={s.pageGap}>…</span>
        : <button key={p} type="button" className={cx(s.page, 'num', p === page && s.pageOn)} aria-current={p === page ? 'page' : undefined} onClick={() => onChange(p)}>{p}</button>))}
      <button type="button" className={s.pageArrow} disabled={page >= pageCount} onClick={() => onChange(page + 1)} aria-label={labels.next}>
        <Icon name="chevron-right" size={17} />
      </button>
    </nav>
  );
}
