// The snapshot timeline as a picture rail: each snapshot hangs from the rail as a small framed collage of what it
// saved, oldest on the left; the last frame is empty and dashed — "now", the folder as it is, not yet saved.
// The stretch of rail between the snapshot the library is based on and "now" is drawn in starlight.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useT } from '../../../i18n/index.jsx';
import { useFormat } from '../../lib/format.js';
import { Icon } from '../../icons/Icon.jsx';
import { Tooltip } from '../../components/overlay.jsx';
import s from './BackupSheet.module.css';

const SLOT = 168;           // px per frame on the rail (frame + gap)

export function snapshotTitle(t, fmt, snap) {
  return snap.name || t('backup.untitled', { date: fmt.dateSmart(snap.createdAt) });
}

export function PictureRail({ snapshots, head, pending, selected, onSelect, developing, fresh, leaving }) {
  const t = useT();
  const fmt = useFormat();
  const scroller = useRef(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const headIndex = snapshots.findIndex((x) => x.id === head);

  const measure = () => {
    const el = scroller.current;
    if (el) setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  };
  // open at "now", the right end of the rail
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return undefined;
    el.scrollLeft = el.scrollWidth;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => { measure(); }, [snapshots.length]);
  // the vertical wheel moves along the rail
  useEffect(() => {
    const el = scroller.current;
    const onWheel = (e) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || el.scrollWidth <= el.clientWidth) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);
  // keep the chosen frame in view (scrolling the rail only, never the sheet around it)
  useEffect(() => {
    const el = scroller.current, f = el?.querySelector('[data-on="true"]');
    if (!f) return;
    const left = f.offsetLeft, right = left + f.offsetWidth, m = 48;
    if (left < el.scrollLeft + m) el.scrollTo({ left: left - m, behavior: 'smooth' });
    else if (right > el.scrollLeft + el.clientWidth - m) el.scrollTo({ left: right - el.clientWidth + m, behavior: 'smooth' });
  }, [selected]);
  const nudge = (d) => scroller.current.scrollBy({ left: d * scroller.current.clientWidth * 0.7, behavior: 'smooth' });

  // month labels sit above the first frame of each month
  let lastMonth = '';
  const monthOf = (iso) => iso.slice(0, 7);
  const count = snapshots.length + 1;

  return (
    <div className={s.railWrap} data-left={edges.left} data-right={edges.right}>
      {edges.left && <button type="button" className={`${s.edge} ${s.edgeL}`} onClick={() => nudge(-1)} aria-label={t('common.prev')}><Icon name="chevron-left" size={16} /></button>}
      <div ref={scroller} className={s.railScroll} onScroll={measure}>
        <div className={s.railTrack} style={{ '--n': count, '--slot': `${SLOT}px` }} role="listbox" aria-label={t('backup.title')}>
          <span className={s.rail} aria-hidden="true" />
          {headIndex >= 0 && (
            <span className={s.railSince} aria-hidden="true" style={{ left: `calc(var(--pad) + ${headIndex + 0.5} * var(--slot))`, width: `calc(${snapshots.length - headIndex} * var(--slot))` }} />
          )}
          {snapshots.map((snap, i) => {
            const month = monthOf(snap.createdAt);
            const showMonth = month !== lastMonth;
            lastMonth = month;
            return (
              <Frame key={snap.id} snap={snap} order={snapshots.length - i} month={showMonth ? fmt.month(new Date(`${snap.createdAt.slice(0, 10)}T00:00`)) : null}
                on={selected === snap.id} head={snap.id === head} fresh={fresh.has(snap.id)} leaving={leaving === snap.id} onSelect={() => onSelect(snap.id)} />
            );
          })}
          <NowFrame on={selected === 'now'} pending={pending} developing={developing} onSelect={() => onSelect('now')}
            empty={!snapshots.length} />
        </div>
      </div>
      {edges.right && <button type="button" className={`${s.edge} ${s.edgeR}`} onClick={() => nudge(1)} aria-label={t('common.next')}><Icon name="chevron-right" size={16} /></button>}
    </div>
  );
}

function Wire({ head }) {
  const t = useT();
  return (
    <svg className={s.wire} viewBox="0 0 120 36" aria-hidden="true">
      <path className={s.wireLine} d="M22 35 60 9 98 35" />
      {head
        ? <path className={s.moon} d="M62.6 2.2a6 6 0 1 0 3.7 9.6 4.8 4.8 0 1 1-3.7-9.6Z" aria-label={t('backup.basedOn')} />
        : <circle className={s.nail} cx="60" cy="8" r="3" />}
    </svg>
  );
}

function Frame({ snap, order, month, on, head, fresh, leaving, onSelect }) {
  const t = useT();
  const fmt = useFormat();
  const title = snapshotTitle(t, fmt, snap);
  const piece = (
    <button type="button" role="option" aria-selected={on} className={s.hang} data-on={on} data-head={head} data-fresh={fresh} data-leaving={leaving}
      style={{ '--i': order }} onClick={onSelect} aria-label={`${title} · ${fmt.dateTime(snap.createdAt)}`}>
      {month && <span className={s.month}>{month}</span>}
      <span className={s.piece}>
        <Wire head={head} />
        <span className={s.frame}>
          <span className={s.mat}>
            <span className={s.collage} data-n={Math.min(4, snap.previews.length)}>
              {snap.previews.slice(0, 4).map((url, k) => <img key={k} src={url} alt="" draggable={false} loading="lazy" />)}
            </span>
          </span>
        </span>
      </span>
      <span className={s.caption}>
        <span className={`${s.capDate} num`}>{fmt.dateSmart(snap.createdAt)}<span>{fmt.time(snap.createdAt)}</span></span>
        <span className={s.capName}>{snap.name || ' '}{snap.source === 'imported' && <i className={s.importTag}>{t('backup.imported')}</i>}</span>
      </span>
    </button>
  );
  return head ? <Tooltip label={t('backup.basedOn')} placement="top">{piece}</Tooltip> : piece;
}

/** "Now": an empty dashed frame waiting for the next snapshot; while one is being written it fills in. */
function NowFrame({ on, pending, developing, onSelect, empty }) {
  const t = useT();
  const fmt = useFormat();
  const p = developing ? (developing.total ? developing.processed / developing.total : 0) : 0;
  return (
    <button type="button" role="option" aria-selected={on} className={`${s.hang} ${s.now}`} data-on={on} data-pending={pending > 0} data-developing={!!developing}
      style={{ '--i': 0, '--p': p }} onClick={onSelect} data-empty={empty}>
      <span className={s.piece}>
        <Wire />
        <span className={s.frame}>
          <span className={s.mat}>
            {developing ? (
              <span className={s.developing}>
                <span className={s.devFill} />
                <span className={`${s.devText} num`}>{Math.round(p * 100)}%</span>
              </span>
            ) : pending > 0 ? (
              <span className={s.nowInner}><Icon name="sparkle" size={18} /><span className="num">{t('backup.changesN', { n: fmt.number(pending) })}</span></span>
            ) : (
              <span className={s.nowInner} data-clean="true"><Icon name="check-circle" size={18} /><span>{t('backup.allSaved')}</span></span>
            )}
          </span>
        </span>
      </span>
      <span className={s.caption}>
        <span className={s.capDate}>{developing ? t('backup.creating') : t('backup.now')}</span>
        <span className={s.capName}>{' '}</span>
      </span>
    </button>
  );
}
