import { useEffect, useRef, useState } from 'react';
import { syncActions, useChecklists, useSyncScope, useTasks } from '../../../bridge/index.js';
import { useT } from '../../../i18n/index.jsx';
import { useFormat } from '../../lib/format.js';
import { Icon } from '../../icons/Icon.jsx';
import { Button, Checkbox, IconButton } from '../../components/controls.jsx';
import { Popover, Sheet } from '../../components/overlay.jsx';
import { Empty, ProgressBar, StatusDot } from '../../components/feedback.jsx';
import { Avatar } from '../../components/media.jsx';
import { PlatformMark } from '../../components/platform.jsx';
import { ConnectionsPanel } from '../connections/ConnectionsPanel.jsx';
import { Checklist } from './Checklist.jsx';
import s from './SyncSheet.module.css';

export default function SyncSheet({ open, onClose, scope, authorId, nonce }) {
  const t = useT();
  const { data: scopeData } = useSyncScope();
  const [chosen, setChosen] = useState(new Set());
  const [checkId, setCheckId] = useState(null);
  const inited = useRef(null);

  // each opening starts from its page: the author's own list, or everything that was checked before
  useEffect(() => {
    if (!open || !scopeData || inited.current === nonce) return;
    inited.current = nonce;
    const usable = (a) => scopeData.platforms.find((p) => p.id === a.platformId)?.syncable;
    setChosen(new Set(scope === 'author' && authorId ? [authorId] : scopeData.authors.filter((a) => usable(a) && a.checkedAt).map((a) => a.id)));
    setCheckId(null);
  }, [open, scopeData, scope, authorId, nonce]);

  const platforms = scopeData?.platforms ?? [];
  const connected = (pid) => platforms.find((p) => p.id === pid)?.connection === 'connected';
  const chosenList = [...chosen];
  const checkable = (scopeData?.authors ?? []).filter((a) => chosen.has(a.id) && connected(a.platformId)).map((a) => a.id);

  const runCheck = async () => {
    if (!checkable.length) return;
    const { taskId } = await syncActions.checkStatus(checkable);
    setCheckId(taskId);
  };

  return (
    <Sheet open={open} onClose={onClose} label={t('sync.title')}>
      <div className={s.sheet}>
        <header className={s.head}>
          <span className={s.mark}><Icon name="sync" size={20} /></span>
          <h2 className={s.title}>{t('sync.title')}</h2>
          <IconButton icon="close" label={t('common.close')} onClick={onClose} className={s.close} />
        </header>
        <div className={s.main}>
          <ScopePane data={scopeData} chosen={chosen} setChosen={setChosen} onCheck={runCheck} checkable={checkable.length} checkId={checkId} />
          <ChecklistPane authorIds={chosenList} onCheck={runCheck} checkable={checkable.length}
            blocked={[...new Set((scopeData?.authors ?? []).filter((a) => chosen.has(a.id) && !connected(a.platformId)).map((a) => a.platformId))]
              .map((pid) => platforms.find((p) => p.id === pid)).filter((p) => p?.syncable)} />
        </div>
      </div>
    </Sheet>
  );
}

function ScopePane({ data, chosen, setChosen, onCheck, checkable, checkId }) {
  const t = useT();
  const fmt = useFormat();
  const tasks = useTasks();
  const task = checkId ? tasks.find((x) => x.id === checkId) : null;
  const running = task && (task.state === 'running' || task.state === 'queued');
  const [connectFor, setConnectFor] = useState(null);
  const connectAnchor = useRef(null);
  if (!data) return <aside className={s.scope} />;

  const toggle = (ids, on) => setChosen((cur) => { const n = new Set(cur); for (const id of ids) (on ? n.add(id) : n.delete(id)); return n; });
  const groups = data.platforms.map((p) => ({ p, authors: data.authors.filter((a) => a.platformId === p.id) })).filter((g) => g.authors.length);

  return (
    <aside className={s.scope}>
      <div className={s.paneTitle}><span className={s.step}>1</span>{t('sync.scope')}</div>
      <div className={s.scopeList}>
        {groups.map(({ p, authors }) => {
          const usable = p.syncable && p.connection === 'connected';
          const ids = authors.map((a) => a.id);
          const n = ids.filter((id) => chosen.has(id)).length;
          return (
            <section key={p.id} className={s.platform} data-usable={usable}>
              <div className={s.platformHead}>
                <Checkbox checked={n === ids.length} indeterminate={n > 0 && n < ids.length} disabled={!usable} onChange={(on) => toggle(ids, on)}
                  label={<span className={s.platformName}><PlatformMark platform={p} size={20} />{p.name}</span>} />
                {p.kind === 'builtin'
                  ? (usable
                    ? <span className={s.connOk}><StatusDot status="connected" /></span>
                    : <Button size="sm" variant="ghost" className={s.connect} data-status={p.connection} onClick={(e) => { connectAnchor.current = e.currentTarget; setConnectFor(p.id); }}>
                        <StatusDot status={p.connection} />{t('sync.connect')}
                      </Button>)
                  : <span className={s.customNote}>{t('status.custom')}</span>}
              </div>
              {p.syncable && (
                <ul className={s.authors}>
                  {authors.map((a) => (
                    <li key={a.id}>
                      <Checkbox className={s.authorRow} checked={chosen.has(a.id)} disabled={!usable && !chosen.has(a.id)} onChange={(on) => toggle([a.id], on)}
                        label={
                          <span className={s.author}>
                            <Avatar src={a.avatar} name={a.name} size={30} />
                            <span className={s.authorText}>
                              <span className={s.authorName}>{a.name}</span>
                              <span className={s.authorMeta}>{a.checkedAt ? t('sync.checkedAt', { date: fmt.relative(a.checkedAt) }) : t('sync.neverChecked')}</span>
                            </span>
                            {a.counts?.unsynced > 0 && <span className={`${s.badge} num`}>{a.counts.unsynced}</span>}
                          </span>
                        } />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
      <div className={s.scopeFoot}>
        {running ? (
          <div className={s.checking}>
            <div className={s.checkingHead}>
              <span>{t(`tasks.stages.${task.stage}`)}</span>
              <span className="num">{t('sync.authorProgress', { done: task.processed, total: task.total })}</span>
            </div>
            <ProgressBar value={task.processed} max={task.total} indeterminate={task.stage === 'connecting' || task.state === 'queued'} />
          </div>
        ) : task?.state === 'failed' ? (
          <div className={s.failed}><Icon name="alert" size={15} />{t(`tasks.errors.${task.error?.code}`, { platform: data.platforms.find((p) => p.id === task.error?.platformId)?.name })}</div>
        ) : null}
        <Button variant="primary" size="lg" icon="refresh" className={s.checkBtn} disabled={!checkable || running} loading={running} onClick={onCheck}>
          {t('sync.check')}{checkable > 0 && <span className={s.btnCount}>{checkable}</span>}
        </Button>
      </div>
      <Popover open={!!connectFor} onClose={() => setConnectFor(null)} anchor={connectAnchor} placement="right-start" label={t('connections.title')} className={s.connPop}>
        <ConnectionsPanel focus={connectFor} />
      </Popover>
    </aside>
  );
}

function ChecklistPane({ authorIds, onCheck, checkable, blocked }) {
  const t = useT();
  const { data: lists, loading } = useChecklists(authorIds);
  const [connect, setConnect] = useState(null);
  const anchor = useRef(null);
  const checked = (lists ?? []).filter((l) => l.checkedAt);

  if (!authorIds.length) return <section className={s.listPane}><div className={s.center}><Empty title={t('sync.pickHint')} /></div></section>;
  if (!lists && loading) return <section className={s.listPane} />;
  if (!checked.length) {
    // nothing to show yet: either check now, or connect the platform first
    const first = !checkable && blocked[0];
    return (
      <section className={s.listPane}>
        <div className={s.center}>
          {first ? (
            <Empty title={t('sync.notConnected', { platform: first.name })} action={
              <Button ref={anchor} variant="primary" icon="plug" onClick={() => setConnect(first.id)}>{t('sync.connect')}</Button>
            } />
          ) : (
            <Empty title={t('sync.emptyList')} action={<Button variant="primary" icon="refresh" disabled={!checkable} onClick={onCheck}>{t('sync.check')}</Button>} />
          )}
        </div>
        <Popover open={!!connect} onClose={() => setConnect(null)} anchor={anchor} placement="bottom-center" label={t('connections.title')} className={s.connPop}>
          <ConnectionsPanel focus={connect} />
        </Popover>
      </section>
    );
  }
  return <Checklist lists={checked} />;
}
