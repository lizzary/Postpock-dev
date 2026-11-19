import { ViewTransition, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useOverlays } from '../../../app/shell.jsx';
import { libraryActions } from '../../../bridge/index.js';
import { Link, cameBack, paths } from '../../../app/router.jsx';
import { useT } from '../../../i18n/index.jsx';
import { useFormat } from '../../lib/format.js';
import { Icon } from '../../icons/Icon.jsx';
import { Button, IconButton, Select } from '../../components/controls.jsx';
import { Popover, Portal } from '../../components/overlay.jsx';
import { Empty, StatusDot, toast } from '../../components/feedback.jsx';
import { moveTo, useReorder } from '../../lib/useReorder.js';
import { Avatar, Picture } from '../../components/media.jsx';
import { PlatformMark } from '../../components/platform.jsx';
import s from './Library.module.css';

const CARD_MIN = 190, GAP = 20; // compact overview cards
const norm = (x) => (x || '').normalize('NFKC').toLowerCase();
// the open tab survives a trip to an author page and back
const remembered = { get: () => { try { return sessionStorage.getItem('postpock.ui.homeTab') || 'all'; } catch { return 'all'; } },
  set: (v) => { try { sessionStorage.setItem('postpock.ui.homeTab', v); } catch { /* per-visit only */ } } };
const SORTS = {
  recent: (a, b) => (b.lastPostAt ?? '').localeCompare(a.lastPostAt ?? ''),
  name: (a, b) => a.name.localeCompare(b.name),
  posts: (a, b) => b.postCount - a.postCount,
};
/** Sort one platform's authors; 'custom' follows the saved order, newcomers go last (most recent first). */
function sortAuthors(list, sort, order) {
  if (sort !== 'custom' || !order?.length) return [...list].sort(SORTS[sort] ?? SORTS.recent);
  const at = new Map(order.map((id, i) => [id, i]));
  return [...list].sort((a, b) => (at.get(a.id) ?? 1e9) - (at.get(b.id) ?? 1e9) || SORTS.recent(a, b));
}
const NAV_H = 64 + 54;   // the top bar and the sticky platform bar cover this much of the page

/** The insertion line shown while dragging (in a portal: the sticky bars' backdrop filters would trap it). */
function DropMarker({ marker }) {
  if (!marker) return null;
  return <Portal><span className={s.marker} style={{ left: marker.left, top: marker.top, width: marker.width, height: marker.height }} /></Portal>;
}

/** How many cards fit on one row of the library grid (`shown` re-attaches once the grid exists, e.g. after the empty state). */
function useColumns(ref, shown) {
  const [cols, setCols] = useState(4);
  useLayoutEffect(() => {
    if (!ref.current) return undefined;
    const ro = new ResizeObserver(([e]) => setCols(Math.max(1, Math.floor((e.contentRect.width + GAP) / (CARD_MIN + GAP)))));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [ref, shown]);
  return cols;
}

export function Library({ home }) {
  const t = useT();
  const { open } = useOverlays();
  const [tab, setTabState] = useState(remembered.get);
  const [query, setQuery] = useState('');
  // sort + custom author order, and the platform order: both change at once and save in the background
  const [viewLocal, setViewLocal] = useState(null);
  const view = viewLocal ?? home.view ?? { sort: 'recent', authorOrder: {} };
  const setView = (patch) => { const next = { ...view, ...patch }; setViewLocal(next); libraryActions.saveHomeView(next); };
  const [orderLocal, setOrderLocal] = useState(null);
  const platforms = useMemo(() => {
    if (!orderLocal) return home.platforms;
    const at = new Map(orderLocal.map((id, i) => [id, i]));
    return home.platforms.map((p, i) => [p, at.get(p.id) ?? orderLocal.length + i]).sort((a, b) => a[1] - b[1]).map(([p]) => p);
  }, [home.platforms, orderLocal]);
  const top = useRef(null);
  const body = useRef(null);
  const cols = useColumns(body, home.authors.length > 0 || home.platforms.some((p) => p.kind === 'custom'));

  const groups = useMemo(() => {
    const q = norm(query.trim());
    return platforms.map((p) => {
      const all = sortAuthors(home.authors.filter((a) => a.platformId === p.id), view.sort, view.authorOrder?.[p.id]);
      const shown = q && !norm(p.name).includes(q) ? all.filter((a) => norm(a.name).includes(q) || norm(a.handle).includes(q)) : all;
      return { platform: p, all, shown };
    }).filter((g) => g.all.length || g.platform.kind === 'custom');
  }, [home.authors, platforms, query, view.sort, view.authorOrder]);

  const reorderPlatforms = (id, index) => {
    const ids = moveTo(groups.map((g) => g.platform.id), id, index);
    const full = [...ids, ...platforms.map((p) => p.id).filter((x) => !ids.includes(x))];
    setOrderLocal(full);
    libraryActions.setPlatformOrder(full);
  };
  const reorderAuthors = (platformId, ids) => {
    if (view.sort !== 'custom') toast(t('home.customOrder'), { icon: 'sort' });
    setView({ sort: 'custom', authorOrder: { ...view.authorOrder, [platformId]: ids } });
  };

  const current = groups.find((g) => g.platform.id === tab);
  useEffect(() => { if (tab !== 'all' && !current) setTabState('all'); }, [tab, current]);
  // where to land when going back to the overview: the platform you were on, at the height you left it
  const returnTo = useRef(null);
  const placing = useRef(false);                    // a tab was switched: place the page once the new content is in
  const [flash, setFlash] = useState(null);
  // back in the overview it is simply there again: its entrance stays off until you leave it (switching an
  // animation back on would replay it)
  const [quiet, setQuiet] = useState(cameBack);
  const setTab = (id) => {
    if (id === tab) return;
    if (id === 'all') returnTo.current = { id: tab, offset: returnTo.current?.id === tab ? returnTo.current.offset : NAV_H + 8 };
    else if (tab === 'all') returnTo.current = null;
    setTabState(id); remembered.set(id);
    setQuiet(id === 'all');
    placing.current = true;
  };
  /** "See all" from the overview: remember where that platform sat on screen, so coming back puts it there again. */
  const seeAll = (id, el) => {
    const offset = Math.max(NAV_H + 8, el.getBoundingClientRect().top);
    setTab(id);
    returnTo.current = { id, offset };
  };
  useLayoutEffect(() => {
    if (!placing.current) return undefined;          // only after a switch — never on mount, so page restores win
    placing.current = false;
    const back = returnTo.current;
    if (tab !== 'all' || !back) {
      // another view of the library: start it right under the bars, if the page was further down
      const y = top.current.getBoundingClientRect().top + window.scrollY - 64;
      if (window.scrollY > y) window.scrollTo({ top: y });
      return undefined;
    }
    returnTo.current = null;
    const el = body.current?.querySelector(`[data-wing="${CSS.escape(back.id)}"]`);
    if (!el) return undefined;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - back.offset });
    setFlash(back.id);
    const id = setTimeout(() => setFlash(null), 1400);
    return () => clearTimeout(id);
  }, [tab]);

  if (!home.authors.length && !groups.length) {
    return (
      <section className={s.library}>
        <Empty title={t('home.emptyTitle')} action={<>
          <Button variant="primary" icon="user-plus" onClick={() => open('newAuthor')}>{t('home.addAuthor')}</Button>
          <Button icon="sync" onClick={() => open('sync', { scope: 'home' })}>{t('bar.sync')}</Button>
        </>}>{t('home.emptyBody')}</Empty>
      </section>
    );
  }

  const searching = !!query.trim();
  const visible = (current ? [current] : groups).filter((g) => g.shown.length || (!searching && (current || g.platform.kind === 'custom')));
  const total = groups.reduce((n, g) => n + g.shown.length, 0);
  return (
    <section className={s.library}>
      <div ref={top} />
      <Navigator groups={groups} tab={tab} setTab={setTab} total={home.authors.length} matched={searching ? total : null}
        query={query} setQuery={setQuery} sort={view.sort} setSort={(sort) => setView({ sort })} onReorder={reorderPlatforms} />
      <div ref={body} className={s.wings} data-quiet={quiet}>
        {current
          ? <Wing group={current} full onReorder={reorderAuthors} onBack={() => setTab('all')} />
          : visible.map((g, gi) => <Wing key={g.platform.id} group={g} index={gi} limit={searching ? null : cols} flash={flash === g.platform.id}
              onMore={(el) => seeAll(g.platform.id, el)} onReorder={reorderAuthors} />)}
        {!visible.length && <Empty compact title={t('picker.none')} />}
      </div>
    </section>
  );
}

/** Sticky platform tabs + the jump index, search, sort and "new platform". */
function Navigator({ groups, tab, setTab, total, matched, query, setQuery, sort, setSort, onReorder }) {
  const t = useT();
  const { open } = useOverlays();
  const strip = useRef(null);
  const indexBtn = useRef(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const [index, setIndex] = useState(false);
  const measure = () => { const el = strip.current; if (el) setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 }); };
  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(strip.current);
    return () => ro.disconnect();
  }, [groups.length]);
  // bring the chosen tab into view by scrolling the strip only (scrollIntoView would move the page too)
  useEffect(() => {
    const el = strip.current, on = el?.querySelector('[data-on="true"]');
    if (!on) return;
    const pad = 40, left = on.offsetLeft - el.offsetLeft, right = left + on.offsetWidth;
    if (left < el.scrollLeft + pad) el.scrollTo({ left: left - pad, behavior: 'smooth' });
    else if (right > el.scrollLeft + el.clientWidth - pad) el.scrollTo({ left: right - el.clientWidth + pad, behavior: 'smooth' });
  }, [tab]);
  const nudge = (d) => strip.current.scrollBy({ left: d * strip.current.clientWidth * 0.7, behavior: 'smooth' });
  const drag = useReorder({ listRef: strip, scrollRef: strip, mode: 'row', axis: 'x', onDrop: onReorder });

  return (
    <div className={s.nav}>
      {/* "All" stays put while the platforms scroll beside it: the way back is always one click */}
      <button type="button" role="tab" aria-selected={tab === 'all'} data-on={tab === 'all'} className={`${s.tab} ${s.allTab}`} onClick={() => setTab('all')}>
        <span className={s.allMark}><Icon name="layers" size={12} /></span>{t('home.allPlatforms')}<span className={`${s.tabCount} num`}>{matched ?? total}</span>
      </button>
      <span className={s.tabSep} />
      <div className={s.tabsWrap} data-left={edges.left} data-right={edges.right}>
        {edges.left && <button type="button" className={`${s.edge} ${s.edgeL}`} onClick={() => nudge(-1)} aria-label={t('common.prev')}><Icon name="chevron-left" size={16} /></button>}
        <div ref={strip} className={s.tabs} role="tablist" onScroll={measure}>
          {groups.map((g) => (
            <button key={g.platform.id} type="button" role="tab" aria-selected={tab === g.platform.id} data-on={tab === g.platform.id} data-empty={matched != null && !g.shown.length}
              className={s.tab} onClick={() => setTab(g.platform.id)} {...drag.handle(g.platform.id)}>
              <PlatformMark platform={g.platform} size={16} />{g.platform.name}
              <span className={`${s.tabCount} num`}>{matched != null ? g.shown.length : g.all.length}</span>
            </button>
          ))}
        </div>
        {edges.right && <button type="button" className={`${s.edge} ${s.edgeR}`} onClick={() => nudge(1)} aria-label={t('common.next')}><Icon name="chevron-right" size={16} /></button>}
      </div>
      <IconButton ref={indexBtn} icon="layers" label={t('home.platformIndex')} active={index} onClick={() => setIndex((v) => !v)} />
      <Popover open={index} onClose={() => setIndex(false)} anchor={indexBtn} placement="bottom-end" label={t('home.platformIndex')} trapFocus={false}>
        <PlatformIndex groups={groups} tab={tab} onPick={(id) => { setTab(id); setIndex(false); }} onReorder={onReorder} />
      </Popover>
      <DropMarker marker={drag.marker} />
      <span className={s.navSep} />
      <label className={s.find}>
        <Icon name="search" size={15} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('home.findAuthor')} spellCheck={false} />
        {query && <button type="button" onClick={() => setQuery('')} aria-label={t('common.clear')}><Icon name="close" size={12} /></button>}
      </label>
      <Select size="sm" icon="sort" value={sort} onChange={setSort} label={t('author.sort.label')}
        options={['recent', 'name', 'posts', 'custom'].map((v) => ({ value: v, label: t(`home.sort.${v}`) }))} />
      <IconButton icon="plus" label={t('home.addPlatform')} onClick={() => open('newPlatform')} />
    </div>
  );
}

/** Every platform at a glance, searchable: the quickest way to one of dozens. */
function PlatformIndex({ groups, tab, onPick, onReorder }) {
  const t = useT();
  const [q, setQ] = useState('');
  const grid = useRef(null);
  const shown = groups.filter((g) => !q || norm(g.platform.name).includes(norm(q)));
  // reordering needs the whole list in view, so it pauses while a search narrows it
  const drag = useReorder({ listRef: grid, scrollRef: grid, mode: 'grid', axis: 'y', onDrop: onReorder, disabled: !!q });
  return (
    <div className={s.index}>
      <label className={s.indexSearch}>
        <Icon name="search" size={14} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('home.findPlatform')} autoFocus />
      </label>
      <div ref={grid} className={s.indexGrid}>
        {shown.map((g) => (
          <button key={g.platform.id} type="button" className={s.indexItem} data-on={tab === g.platform.id} onClick={() => onPick(g.platform.id)} {...drag.handle(g.platform.id)}>
            <PlatformMark platform={g.platform} size={22} />
            <span className={s.indexText}>
              <span className={s.indexName}>{g.platform.name}</span>
              <span className={s.indexMeta}>
                {t('home.authors', { n: g.all.length })}
                {g.platform.kind === 'builtin' && <StatusDot status={g.platform.connection} />}
              </span>
            </span>
          </button>
        ))}
      </div>
      {!q && <div className={s.indexHint}><Icon name="grip" size={13} />{t('home.dragHint')}</div>}
      <DropMarker marker={drag.marker} />
    </div>
  );
}

/** One platform: a header, then its authors (one row in the overview, all of them on its own tab). */
function Wing({ group, full, limit, onMore, onBack, onReorder, flash, index = 0 }) {
  const t = useT();
  const { open } = useOverlays();
  const gridRef = useRef(null);
  const { platform: p, shown, all } = group;
  const cards = limit ? shown.slice(0, limit) : shown;
  const hidden = shown.length - cards.length;
  // a drop among the visible cards places the author next to the same neighbour in the full list
  const drag = useReorder({
    listRef: gridRef, mode: 'grid', axis: 'y', inset: { top: NAV_H },
    onDrop: (id, at) => {
      const others = cards.map((a) => a.id).filter((x) => x !== id);
      const next = all.map((a) => a.id).filter((x) => x !== id);
      const pos = at < others.length ? next.indexOf(others[at]) : next.indexOf(others[others.length - 1]) + 1;
      next.splice(pos, 0, id);
      onReorder(p.id, next);
    },
  });
  return (
    <div className={`${s.wing} ${full ? s.full : ''}`} style={{ '--delay': `${Math.min(index, 8) * 50}ms` }} data-wing={p.id} data-flash={!!flash}>
      {full && onBack && (
        <button type="button" className={s.back} onClick={onBack}><Icon name="arrow-left" size={15} />{t('home.backToAll')}</button>
      )}
      <div className={s.wingHead}>
        <PlatformMark platform={p} size={full ? 30 : 24} />
        <h2 className={s.wingName}>{p.name}</h2>
        <span className={`${s.wingMeta} num`}>{t('home.authors', { n: all.length })}</span>
        {p.kind === 'builtin'
          ? <span className={s.conn} data-status={p.connection}><StatusDot status={p.connection} />{t(`status.${p.connection}`)}</span>
          : <span className={s.wingMeta}>{t('status.custom')}</span>}
        <span className={s.wingActions}>
          <IconButton icon="edit" size="sm" label={t('editor.editPlatform')} className={s.editPlatform} onClick={() => open('editPlatform', { platform: p })} />
          <button type="button" className={s.textBtn} onClick={() => open('newAuthor', { platformId: p.id })}><Icon name="plus" size={14} />{t('home.addAuthor')}</button>
          {hidden > 0 && <button type="button" className={s.more} onClick={(e) => onMore(e.currentTarget.closest('[data-wing]'))}>{t('home.seeAll', { n: shown.length })}<Icon name="arrow-right" size={14} /></button>}
        </span>
      </div>
      <div ref={gridRef} className={s.grid}>
        {cards.map((a, i) => <AuthorCard key={a.id} author={a} index={i} compact={!full} drag={drag.handle(a.id)} />)}
        {(full || !shown.length) && (
          <button type="button" className={s.addTile} onClick={() => open('newAuthor', { platformId: p.id })}>
            <span className={s.addPlus}><Icon name="plus" size={22} /></span>
            <span>{t('home.addAuthor')}</span>
          </button>
        )}
      </div>
      <DropMarker marker={drag.marker} />
    </div>
  );
}

function AuthorCard({ author, index, compact, drag }) {
  const t = useT();
  const fmt = useFormat();
  return (
    <Link to={paths.author(author.id)} className={`${s.card} ${compact ? s.compact : ''}`} style={{ '--i': Math.min(index, 12) }} draggable={false} {...drag}>
      <div className={s.coverWrap}>
        <ViewTransition name={`author-art-${author.id}`} share="morph">
          <Picture src={author.cover ?? author.banner} focus={author.cover ? null : author.coverFocus ?? { x: 0.5, y: 0.5 }} className={s.cover} />
        </ViewTransition>
      </div>
      <div className={s.cardBody}>
        <Avatar src={author.avatar} name={author.name} size={compact ? 38 : 48} ring className={s.avatar} />
        <h3 className={s.name}>{author.name}</h3>
        <div className={s.foot}>
          <span className="num">{t('home.posts', { n: author.postCount })}</span>
          {author.lastPostAt && <span>{t('home.updated', { date: fmt.relative(author.lastPostAt) })}</span>}
        </div>
        {!compact && <p className={`${s.bio} clamp-2`}>{author.bio}</p>}
      </div>
    </Link>
  );
}
