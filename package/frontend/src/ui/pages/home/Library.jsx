import { ViewTransition } from 'react';
import { useOverlays } from '../../../app/shell.jsx';
import { Link, paths } from '../../../app/router.jsx';
import { useT } from '../../../i18n/index.jsx';
import { useFormat } from '../../lib/format.js';
import { Icon } from '../../icons/Icon.jsx';
import { Button } from '../../components/controls.jsx';
import { Empty, StatusDot } from '../../components/feedback.jsx';
import { Avatar, Picture } from '../../components/media.jsx';
import { PlatformMark } from '../../components/platform.jsx';
import s from './Library.module.css';

export function Library({ home }) {
  const t = useT();
  const { open } = useOverlays();
  const byPlatform = new Map(home.platforms.map((p) => [p.id, []]));
  for (const a of home.authors) byPlatform.get(a.platformId)?.push(a);
  const groups = home.platforms
    .filter((p) => p.kind === 'custom' || byPlatform.get(p.id).length)
    .map((p) => ({ platform: p, authors: [...byPlatform.get(p.id)].sort((a, b) => (b.lastPostAt ?? '').localeCompare(a.lastPostAt ?? '')) }));

  if (!home.authors.length && !groups.length) {
    return (
      <section className={s.library}>
        <Empty title={t('home.emptyTitle')} action={<>
          <Button variant="primary" icon="user-plus" onClick={() => open('newAuthor')}>{t('home.addAuthor')}</Button>
          <Button icon="sync" onClick={() => open('sync', { scope: 'home' })}>{t('bar.sync')}</Button>
        </>}>{t('home.emptyBody')}</Empty>
        <AddPlatform />
      </section>
    );
  }

  return (
    <section className={s.library}>
      {groups.map(({ platform, authors }, gi) => (
        <div key={platform.id} className={s.group} style={{ '--delay': `${gi * 70}ms` }}>
          <aside className={s.label}>
            <div className={s.labelInner}>
              <PlatformMark platform={platform} size={30} />
              <h2 className={s.platformName}>{platform.name}</h2>
              <div className={s.platformMeta}>
                <span className="num">{t('home.authors', { n: authors.length })}</span>
                {platform.kind === 'builtin'
                  ? <span className={s.conn} data-status={platform.connection}><StatusDot status={platform.connection} />{t(`status.${platform.connection}`)}</span>
                  : <span className={s.conn}>{t('status.custom')}</span>}
              </div>
              <button type="button" className={s.addInline} onClick={() => open('newAuthor', { platformId: platform.id })}>
                <Icon name="plus" size={15} />{t('home.addAuthor')}
              </button>
            </div>
          </aside>
          <div className={s.grid}>
            {authors.map((a, i) => <AuthorCard key={a.id} author={a} index={i} />)}
            {!authors.length && <div className={s.groupEmpty}>{t('home.emptyPlatform')}</div>}
            <button type="button" className={s.addTile} onClick={() => open('newAuthor', { platformId: platform.id })}>
              <span className={s.addPlus}><Icon name="plus" size={22} /></span>
              <span>{t('home.addAuthor')}</span>
            </button>
          </div>
        </div>
      ))}
      <AddPlatform />
    </section>
  );
}

function AddPlatform() {
  const t = useT();
  const { open } = useOverlays();
  return (
    <div className={s.footer}>
      <button type="button" className={s.addPlatform} onClick={() => open('newPlatform')}>
        <Icon name="plus" size={16} />{t('home.addPlatform')}
      </button>
    </div>
  );
}

function AuthorCard({ author, index }) {
  const t = useT();
  const fmt = useFormat();
  return (
    <Link to={paths.author(author.id)} className={s.card} style={{ '--i': index }}>
      <div className={s.coverWrap}>
        <ViewTransition name={`author-art-${author.id}`} share="morph">
          <Picture src={author.cover ?? author.banner} focus={author.cover ? null : author.coverFocus ?? { x: 0.5, y: 0.5 }} className={s.cover} />
        </ViewTransition>
      </div>
      <div className={s.body}>
        <Avatar src={author.avatar} name={author.name} size={52} ring className={s.avatar} />
        <h3 className={s.name}>{author.name}</h3>
        <p className={`${s.bio} clamp-2`}>{author.bio}</p>
        <div className={s.foot}>
          <span className="num">{t('home.posts', { n: author.postCount })}</span>
          {author.lastPostAt && <span>{t('home.updated', { date: fmt.relative(author.lastPostAt) })}</span>}
        </div>
      </div>
    </Link>
  );
}
