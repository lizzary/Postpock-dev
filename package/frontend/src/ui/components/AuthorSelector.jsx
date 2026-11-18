// Picking authors out of dozens of platforms with dozens of authors each.
//   layout 'split'   — platform column + author column + tray of the chosen ones (popovers, dialogs)
//   layout 'stacked' — collapsible platform sections in one column (narrow side panes)
// Search matches author names, IDs and platform names. Shift-click picks a range.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '../../i18n/index.jsx';
import { Icon } from '../icons/Icon.jsx';
import { Tick } from './controls.jsx';
import { Avatar } from './media.jsx';
import { PlatformMark } from './platform.jsx';
import s from './AuthorSelector.module.css';

const norm = (x) => (x || '').normalize('NFKC').toLowerCase();
const tickState = (n, total) => (!n ? 'off' : n === total ? 'on' : 'mixed');

function useGroups(authors, platforms, query, isDisabled) {
  return useMemo(() => {
    const q = norm(query.trim());
    return platforms.map((p) => {
      const all = authors.filter((a) => a.platformId === p.id);
      const platformHit = q && norm(p.name).includes(q);
      const shown = !q || platformHit ? all : all.filter((a) => norm(a.name).includes(q) || norm(a.handle).includes(q));
      return { p, all, shown, usable: all.filter((a) => !isDisabled?.(a)) };
    }).filter((g) => g.all.length && g.shown.length);
  }, [authors, platforms, query, isDisabled]);
}

export function AuthorSelector({ authors, platforms, value, onChange, layout = 'split', isDisabled, platformAside, authorMeta, autoFocus, className }) {
  const t = useT();
  const [query, setQuery] = useState('');
  const groups = useGroups(authors, platforms, query, isDisabled);
  const chosen = useMemo(() => new Set(value), [value]);
  const last = useRef(null);

  const setMany = (ids, on) => {
    const next = new Set(chosen);
    for (const id of ids) (on ? next.add(id) : next.delete(id));
    onChange([...next]);
  };
  // a click toggles one author; shift extends from the last one within the visible order
  const clickAuthor = (e, a, order) => {
    if (isDisabled?.(a)) return;
    if (e.shiftKey && last.current) {
      const i = order.indexOf(last.current), j = order.indexOf(a.id);
      if (i >= 0 && j >= 0) {
        setMany(order.slice(Math.min(i, j), Math.max(i, j) + 1).filter((id) => !isDisabled?.(authors.find((x) => x.id === id))), true);
        last.current = a.id;
        return;
      }
    }
    setMany([a.id], !chosen.has(a.id));
    last.current = a.id;
  };

  const search = (
    <label className={s.search}>
      <Icon name="search" size={15} />
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('picker.search')} autoFocus={autoFocus} spellCheck={false} />
      {query && <button type="button" onClick={() => setQuery('')} aria-label={t('common.clear')}><Icon name="close" size={13} /></button>}
    </label>
  );
  const row = (a, order) => {
    const off = isDisabled?.(a);
    return (
      <button key={a.id} type="button" role="checkbox" aria-checked={chosen.has(a.id)} disabled={off} className={s.author} data-on={chosen.has(a.id)}
        onClick={(e) => clickAuthor(e, a, order)}>
        <Tick state={chosen.has(a.id) ? 'on' : 'off'} size={16} />
        <Avatar src={a.avatar} name={a.name} size={26} />
        <span className={s.authorText}>
          <span className={s.authorName}>{a.name}</span>
          {authorMeta ? authorMeta(a) : a.postCount != null && <span className={s.authorMeta}>{t('home.posts', { n: a.postCount })}</span>}
        </span>
      </button>
    );
  };
  const groupTick = (g) => {
    const n = g.usable.filter((a) => chosen.has(a.id)).length;
    return (
      <span role="checkbox" aria-checked={n === g.usable.length && n > 0} tabIndex={g.usable.length ? 0 : -1} className={s.groupTick} data-off={!g.usable.length}
        onClick={(e) => { e.stopPropagation(); if (g.usable.length) setMany(g.usable.map((a) => a.id), n !== g.usable.length); }}
        onKeyDown={(e) => { if ((e.key === ' ' || e.key === 'Enter') && g.usable.length) { e.preventDefault(); e.stopPropagation(); setMany(g.usable.map((a) => a.id), n !== g.usable.length); } }}>
        <Tick state={tickState(n, g.usable.length)} size={16} />
      </span>
    );
  };

  if (layout === 'stacked') return <Stacked {...{ t, groups, chosen, query, search, row, groupTick, platformAside, className, onClear: () => onChange([]) }} />;
  return <Split {...{ t, groups, chosen, query, search, row, groupTick, platformAside, className, authors, onChange, setMany, isDisabled }} />;
}

function Split({ t, groups, chosen, query, search, row, groupTick, platformAside, className, authors, onChange, setMany, isDisabled }) {
  const [focus, setFocus] = useState('all');
  const list = useRef(null);
  useEffect(() => { list.current?.scrollTo(0, 0); }, [focus, query]);
  const focused = focus === 'all' ? groups : groups.filter((g) => g.p.id === focus);
  const visible = focused.flatMap((g) => g.shown);
  const order = visible.map((a) => a.id);
  const total = groups.reduce((n, g) => n + g.shown.length, 0);
  const picked = authors.filter((a) => chosen.has(a.id));
  const visibleUsable = visible.filter((a) => !isDisabled?.(a));
  const nVis = visibleUsable.filter((a) => chosen.has(a.id)).length;
  useEffect(() => { if (focus !== 'all' && !groups.some((g) => g.p.id === focus)) setFocus('all'); }, [groups, focus]);

  return (
    <div className={`${s.split} ${className ?? ''}`}>
      <div className={s.top}>{search}</div>
      <div className={s.cols}>
        <ul className={s.platforms} role="listbox" aria-label={t('picker.platforms')}>
          <li>
            <button type="button" className={s.platform} data-on={focus === 'all'} onClick={() => setFocus('all')}>
              <span className={s.allMark}><Icon name="layers" size={13} /></span>
              <span className={s.platformName}>{t('picker.all')}</span>
              <span className={`${s.count} num`}>{chosen.size ? `${chosen.size}/` : ''}{total}</span>
            </button>
          </li>
          {groups.map((g) => {
            const n = g.all.filter((a) => chosen.has(a.id)).length;
            return (
              <li key={g.p.id} className={s.platformItem}>
                <button type="button" className={s.platform} data-on={focus === g.p.id} onClick={() => setFocus(g.p.id)}>
                  {groupTick(g)}
                  <PlatformMark platform={g.p} size={16} />
                  <span className={s.platformName}>{g.p.name}</span>
                  <span className={`${s.count} num`} data-some={n > 0}>{n ? `${n}/` : ''}{query ? g.shown.length : g.all.length}</span>
                </button>
              </li>
            );
          })}
          {!groups.length && <li className={s.none}>{t('picker.none')}</li>}
        </ul>
        <div ref={list} className={s.authors}>
          <div className={s.listHead}>
            <span className={s.listTitle}>{focus === 'all' ? t('picker.all') : groups.find((g) => g.p.id === focus)?.p.name}</span>
            {platformAside && focus !== 'all' && platformAside(groups.find((g) => g.p.id === focus)?.p)}
            <span className={s.listActions}>
              <button type="button" disabled={!visibleUsable.length || nVis === visibleUsable.length} onClick={() => setMany(visibleUsable.map((a) => a.id), true)}>{t('common.selectAll')}</button>
              <button type="button" disabled={!nVis} onClick={() => setMany(visibleUsable.map((a) => a.id), false)}>{t('common.selectNone')}</button>
            </span>
          </div>
          {focused.map((g) => (
            <section key={g.p.id}>
              {focus === 'all' && (
                <div className={s.subhead}>
                  <PlatformMark platform={g.p} size={14} />
                  <span>{g.p.name}</span>
                  {platformAside?.(g.p)}
                </div>
              )}
              <div className={s.grid}>{g.shown.map((a) => row(a, order))}</div>
            </section>
          ))}
          {!visible.length && <div className={s.none}>{t('picker.none')}</div>}
        </div>
      </div>
      <div className={s.tray} data-empty={!picked.length}>
        <span className={`${s.trayCount} num`}>{t('picker.selected', { n: picked.length })}</span>
        <div className={s.trayChips}>
          {picked.map((a) => (
            <button key={a.id} type="button" className={s.chip} onClick={() => setMany([a.id], false)} title={t('common.remove')}>
              <Avatar src={a.avatar} name={a.name} size={16} />{a.name}<Icon name="close" size={11} />
            </button>
          ))}
        </div>
        {picked.length > 0 && <button type="button" className={s.clear} onClick={() => onChange([])}>{t('common.clear')}</button>}
      </div>
    </div>
  );
}

function Stacked({ t, groups, chosen, query, search, row, groupTick, platformAside, className, onClear }) {
  // sections open where something is chosen; searching opens every match
  const [open, setOpen] = useState(() => new Set(groups.filter((g) => g.all.some((a) => chosen.has(a.id))).map((g) => g.p.id)));
  // the first time something is chosen from outside (e.g. preselected by the page), reveal it
  const revealed = useRef(chosen.size > 0);
  useEffect(() => {
    if (revealed.current || !chosen.size) return;
    revealed.current = true;
    setOpen(new Set(groups.filter((g) => g.all.some((a) => chosen.has(a.id))).map((g) => g.p.id)));
  }, [chosen, groups]);
  const toggle = (id) => setOpen((cur) => { const n = new Set(cur); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const order = groups.flatMap((g) => g.shown.map((a) => a.id));
  return (
    <div className={`${s.stacked} ${className ?? ''}`}>
      <div className={s.top}>{search}</div>
      <div className={s.sections}>
        {groups.map((g) => {
          const isOpen = !!query || open.has(g.p.id);
          const n = g.all.filter((a) => chosen.has(a.id)).length;
          return (
            <section key={g.p.id} className={s.section} data-open={isOpen}>
              <div className={s.sectionHead} role="button" tabIndex={0} aria-expanded={isOpen}
                onClick={() => toggle(g.p.id)} onKeyDown={(e) => { if (e.key === 'Enter') toggle(g.p.id); }}>
                {groupTick(g)}
                <PlatformMark platform={g.p} size={18} />
                <span className={s.platformName}>{g.p.name}</span>
                <span className={`${s.count} num`} data-some={n > 0}>{n ? `${n}/` : ''}{g.all.length}</span>
                {platformAside?.(g.p)}
                <Icon name="chevron-down" size={15} className={s.chev} />
              </div>
              {isOpen && <div className={s.sectionBody}>{g.shown.map((a) => row(a, order))}</div>}
            </section>
          );
        })}
        {!groups.length && <div className={s.none}>{t('picker.none')}</div>}
      </div>
      {chosen.size > 0 && (
        <div className={s.stackFoot}>
          <span className="num">{t('picker.selected', { n: chosen.size })}</span>
          <button type="button" className={s.clear} onClick={onClear}>{t('common.clear')}</button>
        </div>
      )}
    </div>
  );
}
