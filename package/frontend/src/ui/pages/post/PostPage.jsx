import { ViewTransition, useEffect, useRef, useState } from 'react';
import { libraryActions, usePost } from '../../../bridge/index.js';
import { useOverlays, usePageMeta } from '../../../app/shell.jsx';
import { Link, paths } from '../../../app/router.jsx';
import { useT } from '../../../i18n/index.jsx';
import { useFormat } from '../../lib/format.js';
import { Icon } from '../../icons/Icon.jsx';
import { Button, TextArea } from '../../components/controls.jsx';
import { DateField } from '../../components/calendar.jsx';
import { toast } from '../../components/feedback.jsx';
import { Avatar, Picture } from '../../components/media.jsx';
import { PlatformMark } from '../../components/platform.jsx';
import { Portal } from '../../components/overlay.jsx';
import { NotFound } from '../../layout/PageStates.jsx';
import { PostBody } from './PostBody.jsx';
import s from './PostPage.module.css';

const withDay = (iso, day) => `${day}${iso.slice(10)}`;

export function PostPage({ id }) {
  const t = useT();
  const post = usePost(id);
  usePageMeta(post
    ? { scope: 'author', authorId: post.authorId, platformId: post.platformId, postId: id, postDay: post.publishedAt.slice(0, 10), overArt: false, artHeight: 0,
        crumbs: [{ label: post.platform.name }, { label: post.author.name, to: paths.author(post.authorId) }] }
    : { scope: 'home', overArt: false, artHeight: 0 });
  useEffect(() => { if (post) libraryActions.recordView(id); }, [id, post]);
  if (!post) return <NotFound title={t('post.notFound')} />;
  return <PostView key={id} post={post} />;
}

function PostView({ post }) {
  const t = useT();
  const fmt = useFormat();
  const { open } = useOverlays();
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const file = useRef(null);
  const editing = draft != null;
  const cur = draft ?? post;
  const cover = draft?.cover ?? post.cover;

  const titleBlock = useRef(null);
  const startEdit = () => {
    setDraft({ title: post.title, subtitle: post.subtitle, publishedAt: post.publishedAt, archivedAt: post.archivedAt, cover: null });
    requestAnimationFrame(() => titleBlock.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  };
  const save = async () => {
    if (!draft.title.trim()) return;
    setSaving(true);
    const patch = { title: draft.title.trim(), subtitle: draft.subtitle.trim(), publishedAt: draft.publishedAt, archivedAt: draft.archivedAt };
    if (draft.cover) patch.cover = draft.cover;
    await libraryActions.updatePost(post.id, patch);
    setSaving(false);
    setDraft(null);
    toast(t('post.saved'), { tone: 'ok' });
  };
  const pickCover = async (f) => { if (f) { const img = await libraryActions.importImage(f); setDraft((d) => ({ ...d, cover: img })); } };

  const c = post.counts;
  return (
    <div className={`${s.page} ${editing ? s.editing : ''}`}>
      <header className={s.head}>
        {cover && (
          <div className={s.coverFrame} style={{ '--ratio': cover.width && cover.height ? cover.width / cover.height : 1.9 }}>
            <ViewTransition name={`post-art-${post.id}`} share="morph">
              <Picture src={cover.url} ratio={`${cover.width || 19} / ${cover.height || 10}`} className={s.cover} eager />
            </ViewTransition>
            {editing && (
              <button type="button" className={s.coverEdit} onClick={() => file.current.click()}>
                <Icon name="image" size={17} />{t('post.changeCover')}
              </button>
            )}
            <input ref={file} type="file" accept="image/*" hidden onChange={(e) => pickCover(e.target.files?.[0])} />
          </div>
        )}

        <div ref={titleBlock} className={s.titleBlock}>
          <div className={s.byline}>
            <Link to={paths.author(post.authorId)} className={s.author}>
              <Avatar src={post.author.avatar} name={post.author.name} size={26} />
              <span>{post.author.name}</span>
            </Link>
            <span className={s.platform}><PlatformMark platform={post.platform} size={16} />{post.platform.name}</span>
          </div>

          {editing
            ? <TextArea className={s.titleInput} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder={t('fields.title')} rows={1} data-autofocus />
            : <h1 className={s.title}>{post.title}</h1>}
          {editing
            ? <TextArea className={s.subtitleInput} value={draft.subtitle} onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })} placeholder={t('fields.subtitle')} rows={1} />
            : post.subtitle && <p className={s.subtitle}>{post.subtitle}</p>}

          <div className={s.meta}>
            <span className={s.metaItem}>
              {!editing && <Icon name="calendar" size={15} />}
              {editing ? <><span>{t('fields.published')}</span><DateField value={cur.publishedAt} label={t('fields.published')} onChange={(d) => setDraft({ ...draft, publishedAt: withDay(draft.publishedAt, d) })} /></>
                : t('post.published', { date: fmt.date(post.publishedAt) })}
            </span>
            <span className={s.metaItem}>
              {!editing && <Icon name="archive" size={15} />}
              {editing ? <><span>{t('fields.archived')}</span><DateField value={cur.archivedAt} label={t('fields.archived')} onChange={(d) => setDraft({ ...draft, archivedAt: withDay(draft.archivedAt, d) })} /></>
                : t('post.archived', { date: fmt.date(post.archivedAt) })}
            </span>
            {!editing && (
              <span className={`${s.metaItem} ${s.muted}`}>
                {c.images > 0 && <span><Icon name="image" size={14} />{c.images}</span>}
                {c.videos > 0 && <span><Icon name="video" size={14} />{c.videos}</span>}
                {c.audio > 0 && <span><Icon name="audio" size={14} />{c.audio}</span>}
                {c.files > 0 && <span><Icon name="file" size={14} />{c.files}</span>}
                <span className="num">{fmt.bytes(post.size)}</span>
              </span>
            )}
          </div>

          {!editing && (
            <div className={s.actions}>
              <Button icon="edit" onClick={startEdit}>{t('post.edit')}</Button>
              <Button icon="export" onClick={() => open('export', { scope: 'author', authorId: post.authorId, postId: post.id, postDay: post.publishedAt.slice(0, 10) })}>{t('bar.export')}</Button>
            </div>
          )}
        </div>
      </header>

      <PostBody post={post} />

      {(post.newer || post.older) && (
        <nav className={s.neighbors}>
          {[['newer', post.newer, 'arrow-left'], ['older', post.older, 'arrow-right']].map(([k, p, icon]) => (p ? (
            <Link key={k} to={paths.post(p.id)} className={`${s.neighbor} ${s[k]}`}>
              <Picture src={p.cover?.url} className={s.nCover} />
              <span className={s.nText}>
                <span className={s.nKicker}>{k === 'newer' && <Icon name={icon} size={14} />}{t(`post.${k}`)}{k === 'older' && <Icon name={icon} size={14} />}</span>
                <span className={s.nTitle}>{p.title}</span>
                <span className={s.nDate}>{fmt.date(p.publishedAt)}</span>
              </span>
            </Link>
          ) : <span key={k} />))}
        </nav>
      )}

      {editing && (
        <Portal>
          <div className={s.saveBar}>
            <span className={s.saveLabel}><Icon name="edit" size={15} />{t('post.edit')}</span>
            <Button variant="ghost" onClick={() => setDraft(null)}>{t('common.cancel')}</Button>
            <Button variant="primary" icon="check" loading={saving} disabled={!draft.title.trim()} onClick={save}>{t('common.save')}</Button>
          </div>
        </Portal>
      )}
    </div>
  );
}
