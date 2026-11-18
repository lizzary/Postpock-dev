import { ViewTransition, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useOverlays } from '../../../app/shell.jsx';
import { Link, paths } from '../../../app/router.jsx';
import { useT } from '../../../i18n/index.jsx';
import { useFormat } from '../../lib/format.js';
import { Icon } from '../../icons/Icon.jsx';
import { Button, IconButton, Select } from '../../components/controls.jsx';
import { Popover } from '../../components/overlay.jsx';
import { Empty, StatusDot } from '../../components/feedback.jsx';
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

/** How many cards fit on one row of the library grid. */
function useColumns(ref) {
  const [cols, setCols] = useState(4);
  useLayoutEffect(() => {
    const ro = new ResizeObserver(([e]) => setCols(Math.max(1, Math.floor((e.contentRect.width + GAP) / (CARD_MIN + GAP)))));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [ref]);
  return cols;
}

export function Library({ home }) {
  const t = useT();
  const { open } = useOverlays();
  const [tab, setTabState] = useState(remembered.get);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('recent');
  const top = useRef(null);
  const body = useRef(null);
  const cols = useColumns(body);

  const groups = useMemo(() => {
    const q = norm(query.trim());
    return home.platforms.map((p) => {
      const all = home.authors.filter((a) => a.platformId === p.id);
      const shown = (q && !norm(p.name).includes(q) ? all.filter((a) => norm(a.name).includes(q) || norm(a.handle).includes(q)) : all).sort(SORTS[sort]);
      return { platform: p, all, shown };
    }).filter((g) => g.all.length || g.platform.kind === 'custom');
  }, [home, query, sort]);

  const current = groups.find((g) => g.platform.id === tab);
  useEffect(() => { if (tab !== 'all' && !current) setTabState('all'); }, [tab, current]);
  const setTab = (id) => {
    setTabState(id); remembered.set(id);
    const y = top.current.getBoundingClientRect().top + window.scrollY - 64;
    if (window.scrollY > y) window.scrollTo({ top: y, behavior: 'smooth' });
  };

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
        query={query} setQuery={setQuery} sort={sort} setSort={setSort} />
      <div ref={body} className={s.wings}>
        {current
          ? <Wing group={current} full />
          : visible.map((g, gi) => <Wing key={g.platform.id} group={g} index={gi} limit={searching ? null : cols} onMore={() => setTab(g.platform.id)} />)}
        {!visible.length && <Empty compact title={t('picker.none')} />}
      </div>
    </section>
  );
}

/** Sticky platform tabs + the jump index, search, sort and "new platform". */
function Navigator({ groups, tab, setTab, total, matched, query, setQuery, sort, setSort }) {
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
  useEffect(() => { strip.current?.querySelector('[data-on="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' }); }, [tab]);
  const nudge = (d) => strip.current.scrollBy({ left: d * strip.current.clientWidth * 0.7, behavior: 'smooth' });

  return (
    <div className={s.nav}>
      <div className={s.tabsWrap} data-left={edges.left} data-right={edges.right}>
        {edges.left && <button type="button" className={`${s.edge} ${s.edgeL}`} onClick={() => nudge(-1)} aria-label={t('common.prev')}><Icon name="chevron-left" size={16} /></button>}
        <div ref={strip} className={s.tabs} role="tablist" onScroll={measure}>
          <button type="button" role="tab" aria-selected={tab === 'all'} data-on={tab === 'all'} className={s.tab} onClick={() => setTab('all')}>
            <span className={s.allMark}><Icon name="layers" size={12} /></span>{t('home.allPlatforms')}<span className={`${s.tabCount} num`}>{matched ?? total}</span>
          </button>
          {groups.map((g) => (
            <button key={g.platform.id} type="button" role="tab" aria-selected={tab === g.platform.id} data-on={tab === g.platform.id} data-empty={matched != null && !g.shown.length}
              className={s.tab} onClick={() => setTab(g.platform.id)}>
              <PlatformMark platform={g.platform} size={16} />{g.platform.name}
              <span className={`${s.tabCount} num`}>{matched != null ? g.shown.length : g.all.length}</span>
            </button>
          ))}
        </div>
        {edges.right && <button type="button" className={`${s.edge} ${s.edgeR}`} onClick={() => nudge(1)} aria-label={t('common.next')}><Icon name="chevron-right" size={16} /></button>}
      </div>
      <IconButton ref={indexBtn} icon="layers" label={t('home.platformIndex')} active={index} onClick={() => setIndex((v) => !v)} />
      <Popover open={index} onClose={() => setIndex(false)} anchor={indexBtn} placement="bottom-end" label={t('home.platformIndex')} trapFocus={false}>
        <PlatformIndex groups={groups} tab={tab} onPick={(id) => { setTab(id); setIndex(false); }} />
      </Popover>
      <span className={s.navSep} />
      <label className={s.find}>
        <Icon name="search" size={15} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('home.findAuthor')} spellCheck={false} />
        {query && <button type="button" onClick={() => setQuery('')} aria-label={t('common.clear')}><Icon name="close" size={12} /></button>}
      </label>
      <Select size="sm" icon="sort" value={sort} onChange={setSort} label={t('author.sort.label')}
        options={[{ value: 'recent', label: t('home.sort.recent') }, { value: 'name', label: t('home.sort.name') }, { value: 'posts', label: t('home.sort.posts') }]} />
      <IconButton icon="plus" label={t('home.addPlatform')} onClick={() => open('newPlatform')} />
    </div>
  );
}

/** Every platform at a glance, searchable: the quickest way to one of dozens. */
function PlatformIndex({ groups, tab, onPick }) {
  const t = useT();
  const [q, setQ] = useState('');
  const shown = groups.filter((g) => !q || norm(g.platform.name).includes(norm(q)));
  return (
    <div className={s.index}>
      <label className={s.indexSearch}>
        <Icon name="search" size={14} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('home.findPlatform')} autoFocus />
      </label>
      <div className={s.indexGrid}>
        {shown.map((g) => (
          <button key={g.platform.id} type="button" className={s.indexItem} data-on={tab === g.platform.id} onClick={() => onPick(g.platform.id)}>
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
    </div>
  );
}

/** One platform: a header, then its authors (one row in the overview, all of them on its own tab). */
function Wing({ group, full, limit, onMore, index = 0 }) {
  const t = useT();
  const { open } = useOverlays();
  const { platform: p, shown, all } = group;
  const cards = limit ? shown.slice(0, limit) : shown;
  const hidden = shown.length - cards.length;
  return (
    <div className={`${s.wing} ${full ? s.full : ''}`} style={{ '--delay': `${Math.min(index, 8) * 50}ms` }}>
      <div className={s.wingHead}>
        <PlatformMark platform={p} size={full ? 30 : 24} />
        <h2 className={s.wingName}>{p.name}</h2>
        <span className={`${s.wingMeta} num`}>{t('home.authors', { n: all.length })}</span>
        {p.kind === 'builtin'
          ? <span className={s.conn} data-status={p.connection}><StatusDot status={p.connection} />{t(`status.${p.connection}`)}</span>
          : <span className={s.wingMeta}>{t('status.custom')}</span>}
        <span className={s.wingActions}>
          <button type="button" className={s.textBtn} onClick={() => open('newAuthor', { platformId: p.id })}><Icon name="plus" size={14} />{t('home.addAuthor')}</button>
          {hidden > 0 && <button type="button" className={s.more} onClick={onMore}>{t('home.seeAll', { n: shown.length })}<Icon name="arrow-right" size={14} /></button>}
        </span>
      </div>
      <div className={s.grid}>
        {cards.map((a, i) => <AuthorCard key={a.id} author={a} index={i} compact={!full} />)}
        {(full || !shown.length) && (
          <button type="button" className={s.addTile} onClick={() => open('newAuthor', { platformId: p.id })}>
            <span className={s.addPlus}><Icon name="plus" size={22} /></span>
            <span>{t('home.addAuthor')}</span>
          </button>
        )}
      </div>
    </div>
  );
}

function AuthorCard({ author, index, compact }) {
  const t = useT();
  const fmt = useFormat();
  return (
    <Link to={paths.author(author.id)} className={`${s.card} ${compact ? s.compact : ''}`} style={{ '--i': Math.min(index, 12) }}>
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
