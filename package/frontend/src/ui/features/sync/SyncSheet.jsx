import { useEffect, useRef, useState } from 'react';
import { syncActions, useChecklists, useSyncScope, useTasks } from '../../../bridge/index.js';
import { useT } from '../../../i18n/index.jsx';
import { useFormat } from '../../lib/format.js';
import { Icon } from '../../icons/Icon.jsx';
import { Button, IconButton } from '../../components/controls.jsx';
import { Popover, Sheet } from '../../components/overlay.jsx';
import { Empty, ProgressBar, StatusDot } from '../../components/feedback.jsx';
import { ConnectionsPanel } from '../connections/ConnectionsPanel.jsx';
import { AuthorSelector } from '../../components/AuthorSelector.jsx';
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
          <ChecklistPane authorIds={chosenList} onCheck={runCheck} checkable={checkable.length} platforms={platforms}
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

  const syncable = data.platforms.filter((p) => p.syncable);
  const live = (pid) => data.platforms.find((p) => p.id === pid)?.connection === 'connected';

  return (
    <aside className={s.scope}>
      <div className={s.paneTitle}><span className={s.step}>1</span>{t('sync.scope')}</div>
      <AuthorSelector layout="stacked" className={s.scopeList}
        authors={data.authors} platforms={syncable} value={[...chosen]} onChange={(ids) => setChosen(new Set(ids))}
        isDisabled={(a) => !live(a.platformId) && !chosen.has(a.id)}
        platformAside={(p) => (live(p.id)
          ? <StatusDot status="connected" />
          : <button type="button" className={s.connect} data-status={p.connection}
              onClick={(e) => { e.stopPropagation(); connectAnchor.current = e.currentTarget; setConnectFor(p.id); }}>
              <StatusDot status={p.connection} />{t('sync.connect')}
            </button>)}
        authorMeta={(a) => (
          <span className={s.authorMeta}>
            {a.checkedAt ? t('sync.checkedAt', { date: fmt.relative(a.checkedAt) }) : t('sync.neverChecked')}
            {a.counts?.unsynced > 0 && <span className={`${s.badge} num`}>{t('sync.unsyncedN', { n: a.counts.unsynced })}</span>}
          </span>
        )} />
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

function ChecklistPane({ authorIds, onCheck, checkable, blocked, platforms }) {
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
  return <Checklist lists={checked} platforms={platforms} />;
}
