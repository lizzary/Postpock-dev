import { useEffect, useRef, useState } from 'react';
import { useConnections, useTasks } from '../../bridge/index.js';
import { useOverlays, usePageMetaValue } from '../../app/shell.jsx';
import { Link, paths } from '../../app/router.jsx';
import { useT } from '../../i18n/index.jsx';
import { Icon } from '../icons/Icon.jsx';
import { LogoMark } from '../icons/Logo.jsx';
import { IconButton } from '../components/controls.jsx';
import { Popover, Tooltip } from '../components/overlay.jsx';
import { ProgressRing, StatusDot } from '../components/feedback.jsx';
import { TasksPanel } from '../features/tasks/TasksPanel.jsx';
import { ConnectionsPanel } from '../features/connections/ConnectionsPanel.jsx';
import s from './TopBar.module.css';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

export function TopBar() {
  const t = useT();
  const meta = usePageMetaValue();
  const { open } = useOverlays();
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const on = () => setSolid(!meta.overArt || window.scrollY > Math.max(40, meta.artHeight - 120));
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, [meta.overArt, meta.artHeight]);

  const art = !solid;
  const scope = meta.scope === 'home' ? { scope: 'home' } : { scope: 'author', authorId: meta.authorId, postId: meta.postId, postDay: meta.postDay };

  return (
    <header className={`${s.bar} ${solid ? s.solid : s.onArt}`} style={{ viewTransitionName: 'topbar' }} data-vt-name="">
      <div className={s.inner}>
        <div className={s.left}>
          <Link to={paths.home()} className={s.brand} aria-label="PostPock">
            <LogoMark size={28} className={s.mark} />
            <span className={s.word}>PostPock</span>
          </Link>
          {meta.crumbs?.length > 0 && (
            <nav className={s.crumbs} aria-label="breadcrumb">
              {meta.crumbs.map((c) => (
                <span key={c.label} className={s.crumb}>
                  <Icon name="chevron-right" size={14} className={s.crumbSep} />
                  {c.to ? <Link to={c.to} className={s.crumbLink}>{c.label}</Link> : <span className={s.crumbText}>{c.label}</span>}
                </span>
              ))}
            </nav>
          )}
        </div>

        <button type="button" className={s.search} onClick={() => open('search', { authorId: meta.scope === 'home' ? null : meta.authorId })}>
          <Icon name="search" size={17} />
          <span className={s.searchText}>{t('bar.searchHint')}</span>
          <kbd className={s.kbd}>{isMac ? 'Cmd K' : 'Ctrl K'}</kbd>
        </button>

        <div className={s.right}>
          <button type="button" className={s.action} onClick={() => open('sync', scope)}>
            <Icon name="sync" size={18} /><span>{t('bar.sync')}</span>
          </button>
          <button type="button" className={s.action} onClick={() => open('export', scope)}>
            <Icon name="export" size={18} /><span>{t('bar.export')}</span>
          </button>
          <span className={s.divider} />
          <TasksButton art={art} />
          <ConnectionButton art={art} platformId={meta.scope === 'home' ? null : meta.platformId} />
          <IconButton icon="settings" label={t('bar.settings')} tone={art ? 'art' : undefined} onClick={() => open('settings')} />
        </div>
      </div>
    </header>
  );
}

function TasksButton({ art }) {
  const t = useT();
  const tasks = useTasks();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const running = tasks.filter((x) => x.state === 'running');
  const active = running.length + tasks.filter((x) => x.state === 'queued').length;
  const cur = running[0];
  const p = cur ? (cur.total ? cur.processed / cur.total : 0) : 0;
  return (
    <>
      <Tooltip label={active ? t('bar.running', { n: active }) : t('bar.tasks')}>
        <button ref={ref} type="button" aria-label={t('bar.tasks')} aria-expanded={open} className={`${s.iconBtn} ${art ? s.iconArt : ''} ${open ? s.iconOn : ''}`} onClick={() => setOpen((o) => !o)}>
          {cur
            ? <ProgressRing value={p} size={30} stroke={2}><Icon name="tasks" size={16} /></ProgressRing>
            : <Icon name="tasks" size={19} />}
          {active > 0 && <span className={s.count}>{active}</span>}
        </button>
      </Tooltip>
      <Popover open={open} onClose={() => setOpen(false)} anchor={ref} placement="bottom-end" label={t('tasks.title')} className={s.panel}>
        <TasksPanel />
      </Popover>
    </>
  );
}

/** Home: one dot per supported platform. Author / post pages: that platform, with its name. */
function ConnectionButton({ art, platformId }) {
  const t = useT();
  const list = useConnections();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const one = platformId ? list.find((c) => c.platformId === platformId) : null;
  const label = one ? `${one.name} · ${t(`status.${one.status}`)}` : list.map((c) => `${c.name} ${t(`status.${c.status}`)}`).join(' · ');
  return (
    <>
      <Tooltip label={label}>
        <button ref={ref} type="button" aria-label={t('bar.connections')} aria-expanded={open} className={`${s.conn} ${art ? s.connArt : ''} ${open ? s.iconOn : ''}`} onClick={() => setOpen((o) => !o)}>
          <Icon name="plug" size={17} />
          {one
            ? <><StatusDot status={one.status} /><span className={s.connName}>{one.name}</span></>
            : <span className={s.dots}>{list.map((c) => <StatusDot key={c.platformId} status={c.status} />)}</span>}
        </button>
      </Tooltip>
      <Popover open={open} onClose={() => setOpen(false)} anchor={ref} placement="bottom-end" label={t('connections.title')} className={s.panel}>
        <ConnectionsPanel focus={platformId} />
      </Popover>
    </>
  );
}
