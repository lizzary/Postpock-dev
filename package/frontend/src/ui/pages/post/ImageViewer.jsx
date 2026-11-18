import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useT } from '../../../i18n/index.jsx';
import { Icon } from '../../icons/Icon.jsx';
import { IconButton } from '../../components/controls.jsx';
import { Portal, usePresence, useScrollLock } from '../../components/overlay.jsx';
import s from './ImageViewer.module.css';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/** Full-screen viewer for the images of one post. index = null when closed. */
export function ImageViewer({ images, index, onIndex, onClose, origin }) {
  const t = useT();
  const open = index != null;
  const { mounted, state } = usePresence(open, 280);
  const [view, setView] = useState({ z: 1, x: 0, y: 0 });
  const stage = useRef(null);
  const img = useRef(null);
  const drag = useRef(null);
  const shown = useRef(index);
  if (open) shown.current = index;
  const i = shown.current ?? 0;
  const file = images[i]?.file;
  useScrollLock(mounted);
  useEffect(() => { setView({ z: 1, x: 0, y: 0 }); }, [i]);

  // open from where the picture sits on the page
  useLayoutEffect(() => {
    if (state !== 'enter' || !origin.current || !img.current) return;
    const a = origin.current.getBoundingClientRect(), b = img.current.getBoundingClientRect();
    if (!b.width) return;
    img.current.animate([
      { transform: `translate(${a.left + a.width / 2 - (b.left + b.width / 2)}px, ${a.top + a.height / 2 - (b.top + b.height / 2)}px) scale(${a.width / b.width})` },
      { transform: 'none' },
    ], { duration: 460, easing: 'cubic-bezier(.22,1,.36,1)' });
  }, [state, origin]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') onIndex((k) => Math.min(images.length - 1, k + 1));
      else if (e.key === 'ArrowLeft') onIndex((k) => Math.max(0, k - 1));
      else if (e.key === '+' || e.key === '=') setView((v) => ({ ...v, z: clamp(v.z * 1.25, 1, 6) }));
      else if (e.key === '-') setView((v) => ({ ...v, z: clamp(v.z / 1.25, 1, 6) }));
      else if (e.key === '0') setView({ z: 1, x: 0, y: 0 });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, images.length, onIndex, onClose]);

  if (!mounted || !file) return null;

  const zoomAt = (factor, cx, cy) => setView((v) => {
    const z = clamp(v.z * factor, 1, 6);
    if (z === 1) return { z: 1, x: 0, y: 0 };
    const r = stage.current.getBoundingClientRect();
    const px = cx - (r.left + r.width / 2), py = cy - (r.top + r.height / 2);
    const k = z / v.z;
    return { z, x: px - (px - v.x) * k, y: py - (py - v.y) * k };
  });

  return (
    <Portal>
      <div className={s.viewer} data-state={state} role="dialog" aria-modal="true" aria-label={file.alt ?? file.name}>
        <div className={s.backdrop} onClick={onClose} />
        <header className={s.top}>
          <span className={`${s.counter} num`}>{i + 1} / {images.length}</span>
          <span className={s.name}>{file.name}.{file.ext}{file.width ? ` · ${file.width} × ${file.height}` : ''}</span>
          <div className={s.tools}>
            <IconButton icon="zoom-out" tone="art" label={t('post.viewer.zoomOut')} onClick={() => zoomAt(1 / 1.3, innerWidth / 2, innerHeight / 2)} disabled={view.z <= 1} />
            <span className={`${s.zoom} num`}>{Math.round(view.z * 100)}%</span>
            <IconButton icon="zoom-in" tone="art" label={t('post.viewer.zoomIn')} onClick={() => zoomAt(1.3, innerWidth / 2, innerHeight / 2)} disabled={view.z >= 6} />
            <IconButton icon="expand" tone="art" label={t('post.viewer.fit')} onClick={() => setView({ z: 1, x: 0, y: 0 })} />
            <IconButton icon="close" tone="art" label={t('post.viewer.close')} onClick={onClose} />
          </div>
        </header>
        <div
          ref={stage}
          className={s.stage}
          data-zoomed={view.z > 1}
          onWheel={(e) => zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX, e.clientY)}
          onDoubleClick={(e) => (view.z > 1 ? setView({ z: 1, x: 0, y: 0 }) : zoomAt(2.2, e.clientX, e.clientY))}
          onPointerDown={(e) => { if (view.z > 1) { drag.current = { x: e.clientX - view.x, y: e.clientY - view.y }; e.currentTarget.setPointerCapture(e.pointerId); } }}
          onPointerMove={(e) => { if (drag.current) setView((v) => ({ ...v, x: e.clientX - drag.current.x, y: e.clientY - drag.current.y })); }}
          onPointerUp={() => { drag.current = null; }}
          onClick={(e) => { if (e.target === e.currentTarget && view.z === 1) onClose(); }}
        >
          <img
            key={file.id}
            ref={img}
            src={file.url}
            alt={file.alt ?? ''}
            draggable={false}
            className={s.img}
            style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})`, transition: drag.current ? 'none' : undefined }}
          />
        </div>
        {images.length > 1 && (
          <>
            <button type="button" className={`${s.arrow} ${s.prev}`} disabled={i === 0} onClick={() => onIndex(i - 1)} aria-label="previous"><Icon name="chevron-left" size={26} /></button>
            <button type="button" className={`${s.arrow} ${s.next}`} disabled={i === images.length - 1} onClick={() => onIndex(i + 1)} aria-label="next"><Icon name="chevron-right" size={26} /></button>
            <nav className={s.strip}>
              {images.map((b, k) => (
                <button key={b.file.id} type="button" className={s.thumb} data-on={k === i} onClick={() => onIndex(k)} aria-label={`${k + 1}`}>
                  <img src={b.file.url} alt="" draggable={false} />
                </button>
              ))}
            </nav>
          </>
        )}
      </div>
    </Portal>
  );
}
