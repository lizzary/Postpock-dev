import { useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '../../../i18n/index.jsx';
import { useFormat } from '../../lib/format.js';
import { Icon } from '../../icons/Icon.jsx';
import { Button, Chip, Tick } from '../../components/controls.jsx';
import { Avatar } from '../../components/media.jsx';
import { Popover } from '../../components/overlay.jsx';
import { AuthorSelector } from '../../components/AuthorSelector.jsx';
import { useStatusCounts, useSyncSubmit } from './syncHooks.js';
import s from './SyncSheet.module.css';

const STATUSES = ['unsynced', 'synced', 'updated', 'expired'];
const tickState = (n, total) => (n === 0 ? 'off' : n === total ? 'on' : 'mixed');

/**
 * The checklist of a status check: pick posts to sync or to check for updates.
 * Built for many authors: groups fold away (their header still shows counts and the timeline), an author filter narrows
 * the list, and bulk tools work at every level — author ticks, shift-click ranges, press-and-drag, timeline drags.
 */
export function Checklist({ lists, platforms }) {
  const t = useT();
  const fmt = useFormat();
  const submit = useSyncSubmit();
  const counts = useStatusCounts(lists);
  const [filter, setFilter] = useState(counts.unsynced ? 'unsynced' : 'all');
  const [query, setQuery] = useState('');
  const [focus, setFocus] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [open, setOpen] = useState(() => new Set(lists.length <= 3 ? lists.map((l) => l.author.id) : []));
  const [picking, setPicking] = useState(false);
  const focusBtn = useRef(null);
  const last = useRef(null);
  const paint = useRef(null);

  useEffect(() => {
    const up = () => { paint.current = null; };
    window.addEventListener('pointerup', up);
    return () => window.removeEventListener('pointerup', up);
  }, []);

  const byKey = useMemo(() => new Map(lists.flatMap((l) => l.items.map((i) => [i.key, i]))), [lists]);
  const q = query.trim().toLowerCase();
  const narrowed = q || focus.length > 0;
  const groups = lists
    .filter((l) => !focus.length || focus.includes(l.author.id))
    .map((l) => ({ ...l, shown: l.items.filter((i) => (filter === 'all' || i.status === filter) && (!q || i.title.toLowerCase().includes(q))) }))
    .filter((g) => g.shown.length || (filter === 'all' && !q));
  const isOpen = (id) => open.has(id) || (narrowed && groups.length <= 6);
  const order = groups.filter((g) => isOpen(g.author.id)).flatMap((g) => g.shown.map((i) => i.key));
  const allOpen = groups.length > 0 && groups.every((g) => isOpen(g.author.id));

  const setMany = (keys, on) => setSelected((cur) => { const n = new Set(cur); for (const k of keys) (on ? n.add(k) : n.delete(k)); return n; });
  const toggleOpen = (id) => setOpen((cur) => { const n = new Set(cur); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const rowDown = (e, key) => {
    if (e.button !== 0) return;
    e.preventDefault();
    if (e.shiftKey && last.current && order.includes(last.current)) {
      const a = order.indexOf(last.current), b = order.indexOf(key);
      setMany(order.slice(Math.min(a, b), Math.max(a, b) + 1), true);
    } else {
      const on = !selected.has(key);
      paint.current = { on };
      setMany([key], on);
    }
    last.current = key;
  };
  const rowEnter = (key) => { if (paint.current) setMany([key], paint.current.on); };

  const chosen = [...selected].map((k) => byKey.get(k)).filter(Boolean);
  const forSync = chosen.filter((i) => i.status === 'unsynced' || i.status === 'updated');
  const forUpdate = chosen.filter((i) => i.status === 'synced' || i.status === 'updated');
  const run = async (type, items) => {
    if (await submit(type, items.map((i) => ({ authorId: i.authorId, remoteId: i.remoteId })))) setSelected(new Set());
  };
  const listAuthors = lists.map((l) => ({ ...l.author, postCount: l.items.length }));
  const focusLabel = !focus.length ? t('picker.allAuthors')
    : focus.length === 1 ? lists.find((l) => l.author.id === focus[0])?.author.name : t('picker.authorsCount', { n: focus.length });

  return (
    <section className={s.listPane}>
      <div className={s.listHead}>
        <div className={s.headRow}>
          <div className={s.paneTitle}><span className={s.step}>2</span>{t('sync.list')}</div>
          <span className={`${s.headMeta} num`}>{t('picker.authorsCount', { n: lists.length })} · {t('home.posts', { n: counts.all })}</span>
          <span className={s.headTools}>
            <button ref={focusBtn} type="button" className={s.focusBtn} data-on={focus.length > 0} onClick={() => setPicking((v) => !v)} aria-expanded={picking}>
              <Icon name="user" size={14} /><span>{focusLabel}</span><Icon name="chevron-down" size={13} />
            </button>
            {focus.length > 0 && <button type="button" className={s.textBtn} onClick={() => setFocus([])}>{t('common.clear')}</button>}
            <button type="button" className={s.textBtn} onClick={() => setOpen(allOpen ? new Set() : new Set(groups.map((g) => g.author.id)))}>
              <Icon name={allOpen ? 'chevron-up' : 'chevron-down'} size={13} />{allOpen ? t('sync.collapseAll') : t('sync.expandAll')}
            </button>
          </span>
        </div>
        <div className={s.statusBar} role="group">
          {STATUSES.map((st) => counts[st] > 0 && (
            <button key={st} type="button" className={s.seg} data-status={st} data-on={filter === st} style={{ flexGrow: counts[st] }}
              onClick={() => setFilter(filter === st ? 'all' : st)} aria-label={`${t(`sync.statuses.${st}`)} ${counts[st]}`} />
          ))}
        </div>
        <div className={s.filters}>
          {['all', ...STATUSES].map((st) => (
            <Chip key={st} selected={filter === st} onClick={() => setFilter(st)} count={counts[st]} className={s.filterChip} data-status={st}>
              {st !== 'all' && <span className={s.legend} data-status={st} />}{t(`sync.statuses.${st}`)}
            </Chip>
          ))}
          <label className={s.search}>
            <Icon name="search" size={14} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('sync.filter')} />
          </label>
        </div>
      </div>
      <Popover open={picking} onClose={() => setPicking(false)} anchor={focusBtn} placement="bottom-end" trapFocus={false} label={t('picker.authors')}>
        <AuthorSelector authors={listAuthors} platforms={platforms} value={focus} onChange={setFocus} autoFocus />
      </Popover>

      <div className={s.listBody}>
        {!groups.length && <div className={s.noneHere}>{t('sync.noneInFilter')}</div>}
        {groups.map((g) => {
          const keys = g.shown.map((i) => i.key);
          const n = keys.filter((k) => selected.has(k)).length;
          const opened = isOpen(g.author.id);
          const un = g.items.filter((i) => i.status === 'unsynced').length;
          return (
            <section key={g.author.id} className={s.group} data-open={opened}>
              <header className={s.groupHead} onClick={() => toggleOpen(g.author.id)}>
                <Icon name="chevron-right" size={14} className={s.groupChev} />
                <button type="button" className={s.groupTick} onClick={(e) => { e.stopPropagation(); setMany(keys, n !== keys.length); }} disabled={!keys.length} aria-label={t('common.selectAll')}>
                  <Tick state={tickState(n, keys.length)} size={16} />
                </button>
                <Avatar src={g.author.avatar} name={g.author.name} size={24} />
                <div className={s.groupName}>
                  <span>{g.author.name}</span>
                  <span className={s.groupMeta}>{t('sync.checkedAt', { date: fmt.relative(g.checkedAt) })}</span>
                </div>
                <span className={`${s.groupCounts} num`}>
                  {n > 0 && <span className={s.groupSel}>{t('sync.selected', { n })}</span>}
                  {un > 0 && <span className={s.badge}>{t('sync.unsyncedN', { n: un })}</span>}
                  <span>{filter === 'all' && !q ? g.items.length : `${g.shown.length}/${g.items.length}`}</span>
                </span>
                <Strip items={g.items} selected={selected} onRange={setMany} />
              </header>
              {opened && (
                <div role="list" className={s.rows}>
                  {g.shown.map((i) => (
                    <div key={i.key} role="checkbox" aria-checked={selected.has(i.key)} tabIndex={0} className={s.row} data-on={selected.has(i.key)} data-status={i.status}
                      onPointerDown={(e) => rowDown(e, i.key)} onPointerEnter={() => rowEnter(i.key)}
                      onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setMany([i.key], !selected.has(i.key)); last.current = i.key; } }}>
                      <Tick state={selected.has(i.key) ? 'on' : 'off'} size={16} />
                      <span className={s.status} data-status={i.status}><i />{t(`sync.statuses.${i.status}`)}</span>
                      <span className={s.rowTitle}>{i.title}</span>
                      {i.plan && <span className={s.plan}>{i.plan}</span>}
                      <time className={`${s.rowDate} num`}>{fmt.dateNum(i.publishedAt)}</time>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      <footer className={s.actions} data-active={chosen.length > 0}>
        <div className={s.selInfo}>
          <span className={`${s.selCount} num`}>{t('sync.selected', { n: chosen.length })}</span>
          {counts.unsynced > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setMany(groups.flatMap((g) => g.items.filter((i) => i.status === 'unsynced').map((i) => i.key)), true)}>
              {t('sync.selectStatus', { status: t('sync.statuses.unsynced') })}
            </Button>
          )}
          {chosen.length > 0 && <Button variant="quiet" size="sm" onClick={() => setSelected(new Set())}>{t('common.clear')}</Button>}
        </div>
        <div className={s.go}>
          <Button icon="layers" disabled={!forUpdate.length} onClick={() => run('update-check', forUpdate)}>{t('sync.updateN', { n: forUpdate.length })}</Button>
          <Button variant="primary" icon="sync" disabled={!forSync.length} onClick={() => run('sync', forSync)}>{t('sync.syncN', { n: forSync.length })}</Button>
        </div>
      </footer>
    </section>
  );
}

/** Every post of an author on one line, oldest → newest. Drag along it to pick a stretch of time (Alt to unpick). */
function Strip({ items, selected, onRange }) {
  const fmt = useFormat();
  const t = useT();
  const ref = useRef(null);
  const [drag, setDrag] = useState(null);
  const [hover, setHover] = useState(null);
  const sorted = useMemo(() => [...items].sort((a, b) => a.publishedAt.localeCompare(b.publishedAt)), [items]);
  const at = (e) => { const r = ref.current.getBoundingClientRect(); return Math.max(0, Math.min(sorted.length - 1, Math.floor(((e.clientX - r.left) / r.width) * sorted.length))); };
  const [lo, hi] = drag ? [Math.min(drag.a, drag.b), Math.max(drag.a, drag.b)] : [-1, -2];
  const tip = hover != null ? sorted[hover] : null;
  return (
    <div ref={ref} className={s.strip} role="presentation" onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); const i = at(e); setDrag({ a: i, b: i, off: e.altKey }); }}
      onPointerMove={(e) => { const i = at(e); setHover(i); if (drag) setDrag((d) => ({ ...d, b: i })); }}
      onPointerLeave={() => setHover(null)}
      onPointerUp={() => { if (drag) onRange(sorted.slice(lo, hi + 1).map((i) => i.key), !drag.off); setDrag(null); }}>
      {sorted.map((i, k) => <span key={i.key} data-status={i.status} data-on={selected.has(i.key)} data-range={k >= lo && k <= hi} />)}
      {tip && (
        <span className={s.stripTip} style={{ left: `${((hover + 0.5) / sorted.length) * 100}%` }}>
          <b>{tip.title}</b>{fmt.dateNum(tip.publishedAt)} · {t(`sync.statuses.${tip.status}`)}
        </span>
      )}
    </div>
  );
}
