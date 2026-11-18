import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { settingsActions, useSettings } from '../../../bridge/index.js';
import { useT } from '../../../i18n/index.jsx';
import { Icon } from '../../icons/Icon.jsx';
import { Button, IconButton, Segmented } from '../../components/controls.jsx';
import { Dialog } from '../../components/overlay.jsx';
import { Spinner, toast } from '../../components/feedback.jsx';
import { navigate, paths } from '../../../app/router.jsx';
import { FolderPicker } from '../folders/FolderPicker.jsx';
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

export default function SettingsDialog({ open, onClose }) {
  const t = useT();
  const settings = useSettings();
  const themeRef = useRef(null);
  const [picking, setPicking] = useState(false);
  const [threads, setThreads] = useState(settings.syncThreads);
  useEffect(() => setThreads(settings.syncThreads), [settings.syncThreads]);

  const setTheme = (theme) => {
    switchTheme(theme, themeRef.current?.querySelector(`[data-selected="false"]`));
    settingsActions.update({ theme });
  };
  const [browsing, setBrowsing] = useState(false);
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
    <Dialog open={open} onClose={onClose} title={t('settings.title')} size="md">
      <section className={s.group}>
        <h3 className={s.groupTitle}>{t('settings.general')}</h3>
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

      <section className={s.group}>
        <h3 className={s.groupTitle}>{t('settings.data')}</h3>
        <div className={s.stack}>
          <div className={s.label}><Icon name="database" size={18} />{t('settings.dbPath')}</div>
          <div className={s.pathRow}>
            <button type="button" className={s.path} onClick={() => setBrowsing(true)} disabled={picking} title={settings.dbPath}>
              <Icon name="folder" size={17} />
              <span className={s.pathText}>{settings.dbPath}</span>
              {picking ? <Spinner size={15} /> : <span className={s.pathAction}>{t('settings.dbChange')}</span>}
            </button>
          </div>
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
      </section>
      <FolderPicker open={browsing} onClose={() => setBrowsing(false)} onPick={applyDb} initialPath={settings.dbPath} kind="database" />
      <footer className={s.about}>{t('settings.about', { version: '0.1.0' })}</footer>
    </Dialog>
  );
}
