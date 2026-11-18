import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuthorList, usePlatforms, useSearch } from '../../../bridge/index.js';
import { navigate, paths } from '../../../app/router.jsx';
import { useT } from '../../../i18n/index.jsx';
import { useFormat } from '../../lib/format.js';
import { Icon } from '../../icons/Icon.jsx';
import { Checkbox, Chip } from '../../components/controls.jsx';
import { Popover, Portal, usePresence, useScrollLock } from '../../components/overlay.jsx';
import { Spinner } from '../../components/feedback.jsx';
import { Avatar, Picture } from '../../components/media.jsx';
import s from './SearchPalette.module.css';

function Marked({ text, ranges }) {
  if (!ranges?.length) return text;
  const out = [];
  let at = 0;
  ranges.forEach(([a, b], i) => { out.push(text.slice(at, a), <mark key={i}>{text.slice(a, b)}</mark>); at = b; });
  out.push(text.slice(at));
  return out;
}

const initialDomains = (authorId) => (authorId
  ? { platforms: [], authors: [authorId], title: false, body: false, image: false }
  : { platforms: [], authors: [], title: true, body: true, image: false });

export default function SearchPalette({ open, onClose, authorId, nonce }) {
  const t = useT();
  const fmt = useFormat();
  const { mounted, state } = usePresence(open, 220);
  const [text, setText] = useState('');
  const [domains, setDomains] = useState(() => initialDomains(authorId));
  const [active, setActive] = useState(0);
  const [pickAuthors, setPickAuthors] = useState(false);
  const input = useRef(null);
  const authorChip = useRef(null);
  const list = useRef(null);
  const { data: platforms } = usePlatforms();
  const { data: authors } = useAuthorList();
  const { data, loading, settledText } = useSearch(text, domains);
  useScrollLock(mounted);

  // every opening starts from its page's scope
  useEffect(() => { if (open) { setDomains(initialDomains(authorId)); setText(''); setActive(0); setTimeout(() => input.current?.focus(), 30); } }, [open, nonce, authorId]);
  useEffect(() => { setActive(0); }, [settledText, domains]);

  const items = useMemo(() => [
    ...data.authors.map((a) => ({ kind: 'author', id: a.id, go: () => navigate(paths.author(a.id)) })),
    ...data.posts.map((p) => ({ kind: 'post', id: p.post.id, go: () => navigate(paths.post(p.post.id)) })),
  ], [data]);
  const choose = (item) => { if (!item) return; onClose(); item.go(); };
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(items.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(items[active]); }
  };
  useEffect(() => { list.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' }); }, [active]);

  if (!mounted) return null;
  const toggle = (k) => setDomains((d) => ({ ...d, [k]: !d[k] }));
  const togglePlatform = (id) => setDomains((d) => ({ ...d, platforms: d.platforms.includes(id) ? d.platforms.filter((x) => x !== id) : [...d.platforms, id] }));
  const toggleAuthor = (id) => setDomains((d) => ({ ...d, authors: d.authors.includes(id) ? d.authors.filter((x) => x !== id) : [...d.authors, id] }));
  const chosenAuthors = (authors ?? []).filter((a) => domains.authors.includes(a.id));
  let k = -1;

  return (
    <Portal>
      <div className={s.layer} data-state={state}>
        <div className={s.scrim} onPointerDown={onClose} />
        <div className={s.palette} role="dialog" aria-modal="true" aria-label={t('bar.search')} onKeyDown={onKey}>
          <div className={s.inputRow}>
            {loading ? <Spinner size={20} className={s.lead} /> : <Icon name="search" size={21} className={s.lead} />}
            <input ref={input} className={s.input} value={text} onChange={(e) => setText(e.target.value)} placeholder={t('search.placeholder')} spellCheck={false} />
            <kbd className={s.esc} onClick={onClose}>Esc</kbd>
          </div>

          <div className={s.domains}>
            <span className={s.domainsLabel}>{t('search.domains')}</span>
            <div className={s.domainChips}>
              {(platforms ?? []).map((p) => (
                <Chip key={p.id} color={p.color} selected={domains.platforms.includes(p.id)} onClick={() => togglePlatform(p.id)}>{p.name}</Chip>
              ))}
              <span className={s.sep} />
              <Chip icon="text" selected={domains.title} onClick={() => toggle('title')}>{t('search.title')}</Chip>
              <Chip icon="file" selected={domains.body} onClick={() => toggle('body')}>{t('search.body')}</Chip>
              <Chip ref={authorChip} icon="user" selected={domains.authors.length > 0} onClick={() => setPickAuthors((v) => !v)}>
                {domains.authors.length ? t('search.authorsCount', { n: domains.authors.length }) : t('search.author')}
              </Chip>
              <Chip icon="image" selected={domains.image} onClick={() => toggle('image')}>{t('search.image')}</Chip>
            </div>
            {chosenAuthors.length > 0 && (
              <div className={s.picked}>
                {chosenAuthors.map((a) => (
                  <button key={a.id} type="button" className={s.pickedAuthor} onClick={() => toggleAuthor(a.id)}>
                    <Avatar src={a.avatar} name={a.name} size={18} />{a.name}<Icon name="close" size={12} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div ref={list} className={s.results}>
            {!settledText && <div className={s.hint}><Icon name="sparkle" size={18} />{t('search.idle')}</div>}
            {settledText && !loading && !items.length && <div className={s.hint}><Icon name="search" size={18} />{t('search.none')}</div>}
            {data.authors.length > 0 && (
              <section>
                <h4 className={s.section}>{t('search.resultsAuthors')}</h4>
                <div className={s.authors}>
                  {data.authors.map((a) => {
                    const idx = ++k;
                    return (
                      <button key={a.id} type="button" className={s.authorHit} data-active={idx === active} onPointerEnter={() => setActive(idx)} onClick={() => choose(items[idx])}>
                        <Avatar src={a.avatar} name={a.name} size={34} />
                        <span className={s.authorName}>{a.name}</span>
                        <span className={s.authorMeta}>{t('home.posts', { n: a.postCount })}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
            {data.posts.length > 0 && (
              <section>
                <h4 className={s.section}>{t('search.resultsPosts')}<span className={s.count}>{t('search.results', { n: data.total })}</span></h4>
                <ul>
                  {data.posts.map((h) => {
                    const idx = ++k;
                    return (
                      <li key={h.post.id}>
                        <button type="button" className={s.hit} data-active={idx === active} onPointerEnter={() => setActive(idx)} onClick={() => choose(items[idx])}>
                          <Picture src={h.post.cover?.url} className={s.hitCover} />
                          <span className={s.hitBody}>
                            <span className={s.hitTitle}><Marked text={h.post.title} ranges={h.titleRanges} /></span>
                            {h.snippet && <span className={s.snippet}><Marked text={h.snippet.text} ranges={h.snippet.ranges} /></span>}
                            {h.image && <span className={s.snippet}><Icon name="image" size={13} /> {h.image}</span>}
                            <span className={s.hitMeta}>
                              <Avatar src={h.author.avatar} name={h.author.name} size={16} />{h.author.name}
                              <span className={s.dot}>·</span>{fmt.dateSmart(h.post.publishedAt)}
                              {h.matched.map((m) => <span key={m} className={s.badge}>{t(`search.matched.${m}`)}</span>)}
                            </span>
                          </span>
                          <Icon name="arrow-right" size={16} className={s.go} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </div>
        </div>

        <Popover open={pickAuthors} onClose={() => setPickAuthors(false)} anchor={authorChip} placement="bottom-start" label={t('search.chooseAuthors')} trapFocus={false}>
          <AuthorPicker authors={authors ?? []} chosen={domains.authors} onToggle={toggleAuthor} />
        </Popover>
      </div>
    </Portal>
  );
}

export function AuthorPicker({ authors, chosen, onToggle, platforms }) {
  const t = useT();
  const [q, setQ] = useState('');
  const shown = authors.filter((a) => !q || a.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className={s.picker}>
      <div className={s.pickerSearch}>
        <Icon name="search" size={15} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search.chooseAuthors')} autoFocus />
      </div>
      <ul className={s.pickerList}>
        {shown.map((a) => (
          <li key={a.id}>
            <Checkbox className={s.pickerRow} checked={chosen.includes(a.id)} onChange={() => onToggle(a.id)} label={
              <span className={s.pickerItem}>
                <Avatar src={a.avatar} name={a.name} size={24} />
                <span className={s.pickerName}>{a.name}</span>
                {platforms && <span className={s.pickerPlat}>{platforms.find((p) => p.id === a.platformId)?.name}</span>}
              </span>
            } />
          </li>
        ))}
      </ul>
    </div>
  );
}
