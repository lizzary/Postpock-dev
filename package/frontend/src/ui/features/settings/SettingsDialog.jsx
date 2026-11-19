import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { settingsActions, useAccess, useBackup, useSettings } from '../../../bridge/index.js';
import { useOverlays } from '../../../app/shell.jsx';
import { useT } from '../../../i18n/index.jsx';
import { useFormat } from '../../lib/format.js';
import { Icon } from '../../icons/Icon.jsx';
import { Button, IconButton, Segmented } from '../../components/controls.jsx';
import { Dialog } from '../../components/overlay.jsx';
import { Spinner, toast } from '../../components/feedback.jsx';
import { navigate, paths } from '../../../app/router.jsx';
import { FolderPicker } from '../folders/FolderPicker.jsx';
import { PasswordSetting, ServerSetting } from './AccessSettings.jsx';
import { McpSetting } from './McpSettings.jsx';
import s from './SettingsDialog.module.css';

/** Swap the theme with a circle that grows from where it was asked for. */
function switchTheme(theme, from) {
  const apply = () => { document.documentElement.dataset.theme = theme; };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!document.startViewTransition || reduce) { apply(); return; }
  const r = from?.getBoundingClientRect();
  const x = r ? r.left + r.width / 2 : innerWidth / 2, y = r ? r.top + r.height / 2 : 0;
  const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const root = document.documentElement;
  root.classList.add('vt-theme');
  const vt = document.startViewTransition(() => flushSync(apply));
  vt.finished.finally(() => root.classList.remove('vt-theme'));
  vt.ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
      { duration: 620, easing: 'cubic-bezier(.65,0,.35,1)', pseudoElement: '::view-transition-new(root)' },
    );
  }).catch(() => {});
}

const SECTIONS = [
  { id: 'general', icon: 'sliders' },
  { id: 'data', icon: 'database' },
  { id: 'access', icon: 'lock' },
  { id: 'mcp', icon: 'mcp' },
];

/** Settings, grouped by what they are about. `section` opens a group directly; `focus` highlights one setting in it. */
export default function SettingsDialog({ open, onClose, section = 'general', focus, nonce }) {
  const t = useT();
  const access = useAccess();
  const { open: openOverlay } = useOverlays();
  const [current, setCurrent] = useState(section);
  const [spot, setSpot] = useState(null);          // { id, n }: a setting to bring forward
  useEffect(() => { if (open) { setCurrent(section); setSpot(focus ? { id: focus, n: Date.now() } : null); } }, [open, nonce]); // eslint-disable-line react-hooks/exhaustive-deps
  const go = (id, f = null) => { setCurrent(id); setSpot(f ? { id: f, n: Date.now() } : null); };
  // the big work surfaces open on their own; settings steps aside for them
  const handOff = (name) => { onClose(); openOverlay(name); };

  const status = {
    access: [access.password.enabled && 'lock', (access.server.enabled || access.server.running) && 'broadcast'].filter(Boolean),
    mcp: access.mcp.enabled ? ['dot'] : [],
  };

  return (
    <Dialog open={open} onClose={onClose} bare label={t('settings.title')} className={s.dialog}>
      <div className={s.layout}>
        <nav className={s.nav} aria-label={t('settings.title')}>
          <h2 className={s.title}>{t('settings.title')}</h2>
          <ul className={s.navList}>
            {SECTIONS.map((x) => (
              <li key={x.id}>
                <button type="button" className={s.navItem} data-on={current === x.id} aria-current={current === x.id ? 'page' : undefined} onClick={() => go(x.id)}>
                  <Icon name={x.icon} size={17} />
                  <span className={s.navLabel}>{t(`settings.sections.${x.id}`)}</span>
                  {status[x.id]?.length > 0 && (
                    <span className={s.navStatus}>
                      {status[x.id].map((k) => (k === 'dot' ? <i key={k} className={s.onDot} /> : <Icon key={k} name={k} size={13} />))}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
          <div className={s.about}>{t('settings.about', { version: '0.1.0' })}</div>
        </nav>
        <div className={s.pane}>
          <header className={s.paneHead}>
            <h3 className={s.paneTitle}>{t(`settings.sections.${current}`)}</h3>
            <IconButton icon="close" label={t('common.close')} onClick={onClose} />
          </header>
          <div className={s.paneBody} key={current}>
            {current === 'general' && <General />}
            {current === 'data' && <Data onOpenBackup={() => handOff('backup')} />}
            {current === 'access' && (
              <>
                <PasswordSetting highlight={spot?.id === 'password' ? spot.n : 0} />
                <ServerSetting onSuggestPassword={() => go('access', 'password')} />
              </>
            )}
            {current === 'mcp' && <McpSetting onManage={() => handOff('mcp')} />}
          </div>
        </div>
      </div>
    </Dialog>
  );
}

function General() {
  const t = useT();
  const settings = useSettings();
  const themeRef = useRef(null);
  const setTheme = (theme) => {
    switchTheme(theme, themeRef.current?.querySelector(`[data-selected="false"]`));
    settingsActions.update({ theme });
  };
  return (
    <section className={s.group}>
      <div className={s.row}>
        <div className={s.label}><Icon name="language" size={18} />{t('settings.language')}</div>
        <Segmented value={settings.language} onChange={(v) => settingsActions.update({ language: v })} label={t('settings.language')}
          options={[{ value: 'en', label: 'English' }, { value: 'zh-CN', label: '简体中文' }]} />
      </div>
      <div className={s.row}>
        <div className={s.label}><Icon name="palette" size={18} />{t('settings.theme')}</div>
        <div ref={themeRef}>
          <Segmented value={settings.theme} onChange={setTheme} label={t('settings.theme')}
            options={[{ value: 'light', label: t('settings.light'), icon: 'sun' }, { value: 'dark', label: t('settings.dark'), icon: 'moon' }]} />
        </div>
      </div>
    </section>
  );
}

function Data({ onOpenBackup }) {
  const t = useT();
  const settings = useSettings();
  const [picking, setPicking] = useState(false);
  const [browsing, setBrowsing] = useState(false);
  const [threads, setThreads] = useState(settings.syncThreads);
  useEffect(() => setThreads(settings.syncThreads), [settings.syncThreads]);
  // switching databases re-reads everything; start again from the home page of the new library
  const applyDb = async (path) => {
    if (!path || path === settings.dbPath) return;
    setPicking(true);
    await settingsActions.update({ dbPath: path });
    setPicking(false);
    navigate(paths.home());
    toast(t('settings.dbSwitched'), { tone: 'ok', icon: 'database' });
  };
  const setLanes = (n) => { setThreads(n); settingsActions.update({ syncThreads: n }); };

  return (
    <section className={s.group}>
      <div className={s.stack}>
        <div className={s.label}><Icon name="database" size={18} />{t('settings.dbPath')}</div>
        <button type="button" className={s.path} onClick={() => setBrowsing(true)} disabled={picking} title={settings.dbPath}>
          <Icon name="folder" size={17} />
          <span className={s.pathText}>{settings.dbPath}</span>
          {picking ? <Spinner size={15} /> : <span className={s.pathAction}>{t('settings.dbChange')}</span>}
        </button>
        {settings.dbPath !== settings.defaultDbPath && (
          <Button variant="quiet" size="sm" icon="undo" className={s.reset} onClick={() => applyDb(settings.defaultDbPath)}>{t('common.reset')}</Button>
        )}
      </div>
      <div className={s.row}>
        <div className={s.label}><Icon name="layers" size={18} />{t('settings.threads')}</div>
        <div className={s.lanesWrap}>
          <IconButton icon="minus" size="sm" label="−" tip={false} disabled={threads <= 1} onClick={() => setLanes(threads - 1)} />
          <div className={s.lanes} role="slider" aria-label={t('settings.threads')} aria-valuemin={1} aria-valuemax={8} aria-valuenow={threads} tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowUp') setLanes(Math.min(8, threads + 1)); if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') setLanes(Math.max(1, threads - 1)); }}>
            {Array.from({ length: 8 }, (_, i) => (
              <button key={i} type="button" tabIndex={-1} className={s.lane} data-on={i < threads} style={{ '--i': i }} onClick={() => setLanes(i + 1)} aria-label={String(i + 1)} />
            ))}
          </div>
          <IconButton icon="plus" size="sm" label="+" tip={false} disabled={threads >= 8} onClick={() => setLanes(threads + 1)} />
          <span className={`${s.lanesValue} num`}>{t('settings.threadsValue', { n: threads })}</span>
        </div>
      </div>
      <BackupCard onOpen={onOpenBackup} />
      <FolderPicker open={browsing} onClose={() => setBrowsing(false)} onPick={applyDb} initialPath={settings.dbPath} kind="database" />
    </section>
  );
}

/**
 * The data-backup entry: the recent snapshots as a small timeline — each one placed by its date, its bar showing how
 * much it saved — ending in "now" with what is still unsaved.
 */
function BackupCard({ onOpen }) {
  const t = useT();
  const fmt = useFormat();
  const { data } = useBackup();
  const snaps = data?.snapshots ?? [];
  const last = snaps.at(-1);
  const pending = data?.pending.total ?? 0;
  const shown = snaps.slice(-8);
  const W = 140, AXIS = 34, X0 = 6, X1 = W - 8;
  const t0 = shown.length ? Date.parse(shown[0].createdAt) : Date.now(), t1 = Date.now();
  const xOf = (iso) => X0 + ((Date.parse(iso) - t0) / Math.max(1, t1 - t0)) * (X1 - X0 - 16);
  const max = Math.max(1, pending, ...shown.map((x) => x.changes.total));
  const h = (n) => (n ? 4 + 18 * Math.sqrt(n / max) : 0);
  const lastX = last ? xOf(last.createdAt) : X0;
  return (
    <button type="button" className={s.backup} onClick={onOpen}>
      <svg className={s.mini} viewBox={`0 0 ${W} 44`} aria-hidden="true">
        <path d={`M2 ${AXIS}H${W - 2}`} className={s.miniAxis} />
        {last && <path d={`M${lastX} ${AXIS}H${X1}`} className={s.miniLit} data-pending={pending > 0} />}
        {shown.map((x, i) => {
          const cx = xOf(x.createdAt);
          return (
            <g key={x.id} className={s.miniSnap} style={{ '--k': i }}>
              <rect x={cx - 2} y={AXIS - 5 - h(x.changes.total)} width={4} height={h(x.changes.total)} rx={1.5} />
              <circle cx={cx} cy={AXIS} r={2.6} />
            </g>
          );
        })}
        <g className={s.miniNow} data-pending={pending > 0} style={{ '--k': shown.length }}>
          {pending > 0 && <rect x={X1 - 2.5} y={AXIS - 5 - h(pending)} width={5} height={h(pending)} rx={1.5} />}
          <circle cx={X1} cy={AXIS} r={3.4} />
        </g>
      </svg>
      <span className={s.backupText}>
        <span className={s.backupTitle}><Icon name="snapshot" size={16} />{t('backup.entry')}</span>
        <span className={s.backupMeta}>{data ? (last ? t('settings.backupMeta', { n: snaps.length, date: fmt.relative(last.createdAt) }) : t('settings.backupNone')) : ' '}</span>
        {data && (pending > 0 || last) && <span className={s.backupState} data-pending={pending > 0}><i />{pending > 0 ? t('settings.backupPending', { n: fmt.number(pending) }) : t('settings.backupClean')}</span>}
      </span>
      <span className={s.backupGo}>{t('settings.open')}<Icon name="arrow-right" size={15} /></span>
    </button>
  );
}
