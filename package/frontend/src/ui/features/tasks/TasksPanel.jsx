import { useConnections, useTasks, taskActions } from '../../../bridge/index.js';
import { useT } from '../../../i18n/index.jsx';
import { useFormat } from '../../lib/format.js';
import { Icon } from '../../icons/Icon.jsx';
import { Button, IconButton } from '../../components/controls.jsx';
import { ProgressBar, toast } from '../../components/feedback.jsx';
import { Avatar } from '../../components/media.jsx';
import s from './TasksPanel.module.css';

const TYPE_ICON = { 'status-check': 'refresh', sync: 'sync', 'update-check': 'layers', export: 'export', snapshot: 'frame', 'snapshot-export': 'export', 'snapshot-import': 'import' };
const WAITING = new Set(['connecting', 'preparing', 'scanning', 'reading']);

export function useTaskText() {
  const t = useT();
  const fmt = useFormat();
  const conns = useConnections();
  const platformName = (id) => conns.find((c) => c.platformId === id)?.name ?? id;
  return {
    scope: (task) => {
      const [first] = task.authors;
      if (!first) return task.label ?? '';
      return task.authors.length > 1 ? t('tasks.scope.many', { name: first.name, n: task.authors.length }) : t('tasks.scope.one', { name: first.name });
    },
    result: (task) => {
      const r = task.result;
      if (!r) return '';
      if (task.type === 'sync') return t('tasks.result.sync', r) + (r.failed ? t('tasks.result.syncFailed', r) : '');
      if (task.type === 'update-check') return t('tasks.result.update-check', r) + (r.missing ? t('tasks.result.missing', r) : '');
      if (task.type === 'export') return t('tasks.result.export', { files: fmt.number(r.files), size: fmt.bytes(r.bytes) });
      if (task.type === 'snapshot') return t('tasks.result.snapshot', { changes: fmt.number(r.changes) });
      if (task.type === 'snapshot-export') return t('tasks.result.snapshot-export', { count: r.count, file: r.file.slice(r.file.lastIndexOf('\\') + 1) });
      if (task.type === 'snapshot-import') return t('tasks.result.snapshot-import', r) + (r.skipped ? t('tasks.result.importSkipped', r) : '');
      return t('tasks.result.status-check', r);
    },
    error: (task) => t(`tasks.errors.${task.error?.code}`, { platform: platformName(task.error?.platformId) }),
  };
}

export function TasksPanel() {
  const t = useT();
  const fmt = useFormat();
  const tasks = useTasks();
  const text = useTaskText();
  const running = tasks.filter((x) => x.state === 'running');
  const queued = tasks.filter((x) => x.state === 'queued');
  const history = tasks.filter((x) => ['done', 'failed', 'canceled'].includes(x.state)).sort((a, b) => (b.finishedAt ?? '').localeCompare(a.finishedAt ?? ''));

  const clear = async () => { await taskActions.clearHistory(); toast(t('tasks.cleared'), { tone: 'ok' }); };

  const row = (task, i) => (
    <li key={task.id} className={s.task} data-state={task.state}>
      <span className={s.typeIcon}><Icon name={TYPE_ICON[task.type]} size={17} /></span>
      <div className={s.body}>
        <div className={s.line}>
          <span className={s.type}>{t(`tasks.types.${task.type}`)}</span>
          <span className={s.scope}>
            {task.authors.length > 0 && <span className={s.avStack}>{task.authors.slice(0, 3).map((a) => <Avatar key={a.id} src={a.avatar} name={a.name} size={16} className={s.miniAv} />)}</span>}
            <span className={s.scopeText}>{text.scope(task)}</span>
          </span>
        </div>
        {task.state === 'running' && (
          <>
            <div className={s.meta}>
              <span className={s.stage}>{t(`tasks.stages.${task.stage}`)}</span>
              {task.total > 0 && <span className="num">{fmt.number(task.processed)} / {fmt.number(task.total)}</span>}
            </div>
            <ProgressBar value={task.processed} max={task.total || 1} indeterminate={WAITING.has(task.stage)} className={s.bar} />
          </>
        )}
        {task.state === 'queued' && <div className={s.meta}><span>{t('tasks.stages.queued')}</span><span>{t('tasks.positions', { n: i + 1 })}</span></div>}
        {task.state === 'done' && <div className={s.meta}><span className={s.result}>{text.result(task)}</span><span className={s.time}>{fmt.relative(task.finishedAt)}</span></div>}
        {task.state === 'failed' && <div className={s.meta}><span className={s.error}><Icon name="alert" size={13} />{task.error ? text.error(task) : t('tasks.stages.failed')}</span><span className={s.time}>{fmt.relative(task.finishedAt)}</span></div>}
        {task.state === 'canceled' && <div className={s.meta}><span>{t('tasks.stages.canceled')}</span><span className={s.time}>{fmt.relative(task.finishedAt)}</span></div>}
      </div>
      {(task.state === 'running' || task.state === 'queued') && (
        <IconButton icon="close" size="sm" label={t('tasks.cancel')} className={s.cancel} onClick={() => taskActions.cancel(task.id)} />
      )}
    </li>
  );

  return (
    <div className={s.panel}>
      <header className={s.head}>
        <h3 className={s.title}>{t('tasks.title')}</h3>
        <Button variant="ghost" size="sm" icon="trash" disabled={!history.length} onClick={clear}>{t('tasks.clearHistory')}</Button>
      </header>
      <div className={s.scroll}>
        {!tasks.length && <div className={s.empty}><Icon name="check-circle" size={22} />{t('tasks.empty')}</div>}
        {running.length > 0 && <section><h4 className={s.section}>{t('tasks.running')}</h4><ul>{running.map(row)}</ul></section>}
        {queued.length > 0 && <section><h4 className={s.section}>{t('tasks.queued')}</h4><ul>{queued.map(row)}</ul></section>}
        {history.length > 0 && <section><h4 className={s.section}>{t('tasks.history')}</h4><ul>{history.map(row)}</ul></section>}
      </div>
    </div>
  );
}
