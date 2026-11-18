import { ViewTransition, useLayoutEffect, useRef, useState, useTransition } from 'react';
import { useAuthor, useAuthorView, usePosts, useTasks } from '../../../bridge/index.js';
import { useOverlays, usePageMeta } from '../../../app/shell.jsx';
import { Link, paths } from '../../../app/router.jsx';
import { useT } from '../../../i18n/index.jsx';
import { useFormat } from '../../lib/format.js';
import { Icon } from '../../icons/Icon.jsx';
import { Button, Segmented, Select } from '../../components/controls.jsx';
import { Empty, ProgressBar, StatusDot } from '../../components/feedback.jsx';
import { Avatar, Pagination, Picture } from '../../components/media.jsx';
import { PlatformMark } from '../../components/platform.jsx';
import { NotFound } from '../../layout/PageStates.jsx';
import { useTaskText } from '../../features/tasks/TasksPanel.jsx';
import s from './AuthorPage.module.css';

const PAGE_SIZE = 12;

export function AuthorPage({ id }) {
  const t = useT();
  const author = useAuthor(id);
  const banner = useRef(null);
  const [artHeight, setArtHeight] = useState(420);
  useLayoutEffect(() => {
    if (!banner.current) return undefined;
    const ro = new ResizeObserver(([e]) => setArtHeight(e.contentRect.height));
    ro.observe(banner.current);
    return () => ro.disconnect();
  }, [author]);
  usePageMeta(author
    ? { scope: 'author', authorId: id, platformId: author.platformId, overArt: true, artHeight, crumbs: [{ label: author.platform.name }, { label: author.name }] }
    : { scope: 'home', overArt: false, artHeight: 0 });
  if (!author) return <NotFound title={t('author.notFound')} />;

  return (
    <div className={s.page}>
      <div ref={banner} className={s.banner}>
        <ViewTransition name={`author-art-${id}`} share="morph">
          <Picture src={author.banner} className={s.bannerImg} eager />
        </ViewTransition>
        <div className={s.bannerShade} />
      </div>
      <Profile author={author} />
      <ActiveTasks authorId={id} />
      <Posts author={author} />
    </div>
  );
}

function Profile({ author }) {
  const t = useT();
  const fmt = useFormat();
  const { open } = useOverlays();
  const [more, setMore] = useState(false);
  const p = author.platform;
  return (
    <section className={s.profile}>
      <Avatar src={author.avatar} name={author.name} size={124} ring className={s.avatar} />
      <div className={s.identity}>
        <div className={s.nameRow}>
          <h1 className={s.name}>{author.name}</h1>
          <Button variant="secondary" size="sm" icon="edit" className={s.edit} onClick={() => open('newAuthor', { author })}>{t('author.editProfile')}</Button>
        </div>
        <div className={s.platformRow}>
          <a className={s.platform} href={author.url || p.site} target="_blank" rel="noreferrer" title={t('author.openOn', { platform: p.name })}>
            <PlatformMark platform={p} size={20} />
            <span>{p.name}</span>
            {author.handle && <span className={s.handle}>{author.handle}</span>}
            <Icon name="arrow-up-right" size={14} className={s.out} />
          </a>
          {p.kind === 'builtin' && (
            <span className={s.conn} data-status={p.connection}><StatusDot status={p.connection} />{t(`status.${p.connection}`)}</span>
          )}
        </div>
        {author.bio && (
          <p className={`${s.bio} ${more ? '' : 'clamp-3'}`} onClick={() => setMore((m) => !m)}>{author.bio}</p>
        )}
        {(author.stats.checkedAt || author.stats.unsynced > 0) && (
          <div className={s.syncLine}>
            {author.stats.checkedAt && <span><Icon name="clock" size={14} />{t('author.checkedAt', { date: fmt.relative(author.stats.checkedAt) })}</span>}
            {author.stats.unsynced > 0 && (
              <button type="button" className={s.unsynced} onClick={() => open('sync', { scope: 'author', authorId: author.id })}>
                {t('author.unsynced', { n: author.stats.unsynced })}<Icon name="arrow-right" size={14} />
              </button>
            )}
          </div>
        )}
      </div>
      <dl className={s.stats}>
        <div><dd className="num">{fmt.number(author.postCount)}</dd><dt>{t('author.statPosts')}</dt></div>
        <div><dd className="num">{fmt.number(author.stats.files)}</dd><dt>{t('author.statFiles')}</dt></div>
        <div><dd className="num">{fmt.bytes(author.stats.bytes)}</dd><dt>{t('author.statSize')}</dt></div>
      </dl>
    </section>
  );
}

/** Work in progress for this author, right under the profile. */
function ActiveTasks({ authorId }) {
  const t = useT();
  const fmt = useFormat();
  const text = useTaskText();
  const tasks = useTasks().filter((x) => (x.state === 'running' || x.state === 'queued') && x.authors.some((a) => a.id === authorId));
  if (!tasks.length) return null;
  return (
    <div className={s.tasks}>
      {tasks.map((task) => (
        <div key={task.id} className={s.task} data-state={task.state}>
          <Icon name={task.type === 'export' ? 'export' : 'sync'} size={16} className={s.taskIcon} />
          <span className={s.taskName}>{t(`tasks.types.${task.type}`)}</span>
          <span className={s.taskStage}>{t(`tasks.stages.${task.stage}`)}</span>
          {task.state === 'running' && task.total > 0 && task.stage !== 'connecting' && <span className={`${s.taskCount} num`}>{fmt.number(task.processed)} / {fmt.number(task.total)}</span>}
          <ProgressBar value={task.processed} max={task.total || 1} indeterminate={task.state === 'queued' || task.stage === 'connecting'} className={s.taskBar} />
          {task.authors.length > 1 && <span className={s.taskScope}>{text.scope(task)}</span>}
        </div>
      ))}
    </div>
  );
}

function Posts({ author }) {
  const t = useT();
  const { open } = useOverlays();
  const [view, setView] = useAuthorView(author.id);
  const [page, setPage] = useState(1);
  const [pending, startTransition] = useTransition();
  const head = useRef(null);
  const sentinel = useRef(null);
  const [stuck, setStuck] = useState(false);
  useLayoutEffect(() => {
    const io = new IntersectionObserver(([e]) => setStuck(!e.isIntersecting), { rootMargin: '-65px 0px 0px 0px' });
    io.observe(sentinel.current);
    return () => io.disconnect();
  }, []);
  const sort = view?.sort ?? 'published-desc';
  const columns = view?.columns ?? 2;
  const data = usePosts(author.id, { page, pageSize: PAGE_SIZE, sort });

  const go = (p) => {
    startTransition(() => setPage(p));
    const top = head.current.getBoundingClientRect().top + window.scrollY - 90;
    if (window.scrollY > top) window.scrollTo({ top, behavior: 'smooth' });
  };
  const sortOptions = ['published-desc', 'published-asc', 'archived-desc', 'title'].map((v) => ({ value: v, label: t(`author.sort.${v}`) }));

  return (
    <section className={s.posts}>
      <div ref={sentinel} aria-hidden="true" />
      <header ref={head} className={`${s.toolbar} ${stuck ? s.stuck : ''}`}>
        <h2 className={s.postsTitle}>{t('author.posts')}<span className={`${s.count} num`}>{data.total}</span></h2>
        <div className={s.tools}>
          <Select size="sm" icon="sort" value={sort} options={sortOptions} label={t('author.sort.label')} onChange={(v) => { setView({ sort: v }); startTransition(() => setPage(1)); }} />
          <Segmented size="sm" iconOnly label={t('author.layout.label')} value={columns} onChange={(v) => setView({ columns: v })}
            options={[{ value: 1, label: t('author.layout.single'), icon: 'cols-1' }, { value: 2, label: t('author.layout.double'), icon: 'cols-2' }]} />
          <Button variant="primary" size="sm" icon="plus" onClick={() => open('addPost', { authorId: author.id })}>{t('author.addPost')}</Button>
        </div>
      </header>

      {data.total === 0
        ? <Empty title={t('author.emptyTitle')} action={<>
            <Button icon="sync" onClick={() => open('sync', { scope: 'author', authorId: author.id })}>{t('bar.sync')}</Button>
            <Button variant="primary" icon="plus" onClick={() => open('addPost', { authorId: author.id })}>{t('author.addPost')}</Button>
          </>}>{t('author.emptyBody')}</Empty>
        : (
          <div className={`${s.grid} ${columns === 1 ? s.single : s.double} ${pending ? s.pending : ''}`} key={`${page}-${sort}`}>
            {data.items.map((post, i) => <PostCard key={post.id} post={post} index={i} single={columns === 1} />)}
          </div>
        )}

      <div className={s.pager}>
        <Pagination page={data.page} pageCount={data.pageCount} onChange={go} labels={{ nav: t('common.pages'), prev: t('common.prev'), next: t('common.next') }} />
      </div>
    </section>
  );
}

function PostCard({ post, index, single }) {
  const t = useT();
  const fmt = useFormat();
  const c = post.counts;
  return (
    <Link to={paths.post(post.id)} className={s.card} style={{ '--i': index }}>
      <div className={s.coverWrap}>
        <ViewTransition name={`post-art-${post.id}`} share="morph">
          <Picture src={post.cover?.url} className={s.cover} />
        </ViewTransition>
        <span className={s.badges}>
          {c.images > 0 && <span><Icon name="image" size={13} />{c.images}</span>}
          {c.videos > 0 && <span><Icon name="video" size={13} />{c.videos}</span>}
          {c.audio > 0 && <span><Icon name="audio" size={13} />{c.audio}</span>}
          {c.files > 0 && <span><Icon name="file" size={13} />{c.files}</span>}
        </span>
      </div>
      <div className={s.cardBody}>
        <time className={s.date} dateTime={post.publishedAt}>{fmt.date(post.publishedAt)}</time>
        <h3 className={s.title}>{post.title}</h3>
        {post.subtitle && <p className={`${s.subtitle} ${single ? 'clamp-3' : 'clamp-2'}`}>{post.subtitle}</p>}
        {single && <span className={s.read}>{t('post.open')}<Icon name="arrow-right" size={15} /></span>}
      </div>
    </Link>
  );
}
