import { useEffect, useRef } from 'react';
import { useConnections, connectionActions } from '../../../bridge/index.js';
import { useT } from '../../../i18n/index.jsx';
import { useFormat } from '../../lib/format.js';
import { Icon } from '../../icons/Icon.jsx';
import { Button } from '../../components/controls.jsx';
import { ProgressBar, StatusDot, toast } from '../../components/feedback.jsx';
import { PlatformMark } from '../../components/platform.jsx';
import s from './ConnectionsPanel.module.css';

/** Every supported platform with its connection, and the sign-in flow: open browser → "I've signed in" → verifying → connected. */
export function ConnectionsPanel({ focus }) {
  const t = useT();
  const fmt = useFormat();
  const list = useConnections();
  const prev = useRef(new Map());

  // celebrate a fresh connection
  useEffect(() => {
    for (const c of list) {
      if (prev.current.get(c.platformId) === 'verifying' && c.status === 'connected') toast(t('connections.connected', { platform: c.name }), { tone: 'ok', icon: 'plug' });
      prev.current.set(c.platformId, c.status);
    }
  }, [list, t]);

  return (
    <div className={s.panel}>
      <header className={s.head}>
        <h3 className={s.title}>{t('connections.title')}</h3>
      </header>
      <ul className={s.list}>
        {list.map((c) => {
          const flow = c.status === 'awaiting' || c.status === 'verifying';
          return (
            <li key={c.platformId} className={`${s.item} ${focus === c.platformId ? s.focus : ''} ${flow ? s.inFlow : ''}`} data-status={c.status}>
              <div className={s.row}>
                <PlatformMark platform={{ name: c.name, color: c.color }} size={34} />
                <div className={s.info}>
                  <div className={s.name}>{c.name}</div>
                  <div className={s.status}>
                    <StatusDot status={c.status} />
                    <span>{t(`status.${c.status}`)}</span>
                    {c.status === 'connected' && c.account && <span className={s.account}>· {c.account}</span>}
                  </div>
                </div>
                {c.status === 'connected' && <Button variant="ghost" size="sm" onClick={() => connectionActions.disconnect(c.platformId)}>{t('connections.disconnect')}</Button>}
                {c.status === 'disconnected' && <Button variant="secondary" size="sm" onClick={() => connectionActions.startLogin(c.platformId)}>{t('connections.signIn', { platform: c.name })}</Button>}
                {c.status === 'expired' && <Button variant="primary" size="sm" onClick={() => connectionActions.startLogin(c.platformId)}>{t('connections.signInAgain')}</Button>}
              </div>

              {c.status === 'expired' && <p className={s.note}>{t('connections.expiredBody')}</p>}
              {c.status === 'connected' && c.since && <p className={s.since}>{t('connections.since', { date: fmt.date(c.since) })}</p>}

              {flow && (
                <div className={s.flow}>
                  <ol className={s.steps}>
                    <li data-done="true"><span className={s.stepDot}><Icon name="check" size={11} stroke={2.4} /></span>{t('connections.signIn', { platform: c.name })}</li>
                    <li data-done={c.status === 'verifying'} data-current={c.status === 'awaiting'}><span className={s.stepDot}>{c.status === 'verifying' ? <Icon name="check" size={11} stroke={2.4} /> : 2}</span>{t('connections.iSignedIn')}</li>
                    <li data-current={c.status === 'verifying'}><span className={s.stepDot}>3</span>{t('status.verifying')}</li>
                  </ol>
                  {c.status === 'awaiting' ? (
                    <>
                      <div className={s.browser}>
                        <span className={s.browserBar}><i /><i /><i /><span className={s.url}>{c.name.toLowerCase()}</span></span>
                        <p>{t('connections.awaiting', { platform: c.name })}</p>
                      </div>
                      <div className={s.flowActions}>
                        <Button variant="primary" size="sm" icon="check" onClick={() => connectionActions.confirmLogin(c.platformId)} data-autofocus>{t('connections.iSignedIn')}</Button>
                        <Button variant="ghost" size="sm" onClick={() => connectionActions.startLogin(c.platformId)}>{t('connections.reopen')}</Button>
                        <Button variant="quiet" size="sm" onClick={() => connectionActions.cancelLogin(c.platformId)}>{t('common.cancel')}</Button>
                      </div>
                    </>
                  ) : (
                    <div className={s.verifying}>
                      <span>{t('connections.verifying')}</span>
                      <ProgressBar indeterminate tone="accent" />
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
