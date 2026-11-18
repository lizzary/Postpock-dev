import { useEffect, useMemo, useRef, useState } from 'react';
import { exportActions, useDayPosts, useExportOptions, useExportPreview, useLastExportConfig, usePlatforms } from '../../../bridge/index.js';
import { useT } from '../../../i18n/index.jsx';
import { dayKey, useFormat } from '../../lib/format.js';
import { Icon } from '../../icons/Icon.jsx';
import { Button, Checkbox, Chip, IconButton, TextInput } from '../../components/controls.jsx';
import { Calendar } from '../../components/calendar.jsx';
import { Popover, Sheet } from '../../components/overlay.jsx';
import { Spinner, toast } from '../../components/feedback.jsx';
import { Avatar, Picture } from '../../components/media.jsx';
import { AuthorPicker } from '../search/SearchPalette.jsx';
import { TemplateInput } from './TemplateInput.jsx';
import { TreePreview } from './TreePreview.jsx';
import s from './ExportSheet.module.css';

const DEFAULT_TEMPLATE = [
  { type: 'key', kind: 'agg', id: 'author.name' }, { type: 'text', text: '/' },
  { type: 'key', kind: 'agg', id: 'date.published', fmt: 'YM' }, { type: 'text', text: '/' },
  { type: 'key', kind: 'data', id: 'post.title' }, { type: 'text', text: '_' }, { type: 'key', kind: 'data', id: 'index.inPost' },
];
const PRESETS = ['today', 'd7', 'd30', 'month', 'year', 'all'];
function presetRange(key) {
  const now = new Date(), today = dayKey(now);
  const back = (n) => { const d = new Date(now); d.setDate(d.getDate() - n); return dayKey(d); };
  return {
    today: { mode: 'range', from: today, to: today },
    d7: { mode: 'range', from: back(6), to: today },
    d30: { mode: 'range', from: back(29), to: today },
    month: { mode: 'range', from: dayKey(new Date(now.getFullYear(), now.getMonth(), 1)), to: today },
    year: { mode: 'range', from: `${now.getFullYear()}-01-01`, to: today },
    all: { mode: 'all' },
  }[key];
}
const sameDates = (a, b) => a.mode === b.mode && (a.mode === 'all' || (a.from === b.from && a.to === b.to));

export default function ExportSheet({ open, onClose, scope = 'home', authorId, postId, postDay, nonce }) {
  const t = useT();
  const fmt = useFormat();
  const scopeKey = scope === 'home' ? 'home' : `author:${authorId}`;
  const { data: last, loading: lastLoading } = useLastExportConfig(scopeKey);
  const [cfg, setCfg] = useState(null);
  const [starting, setStarting] = useState(false);
  const inited = useRef(null);

  // each opening: the page's last configuration; the author page always includes its author; a post selects itself
  useEffect(() => {
    if (!open || lastLoading || inited.current === nonce) return;
    inited.current = nonce;
    const base = { authorIds: scope === 'home' ? [] : [authorId], outputDir: 'D:\\Exports\\PostPock', dates: { mode: 'all' }, dayPosts: null, fileTypes: null, template: DEFAULT_TEMPLATE, maxPerDir: 5, ...(last ?? {}) };
    if (scope !== 'home' && !base.authorIds.includes(authorId)) base.authorIds = [authorId, ...base.authorIds];
    if (postId && postDay) Object.assign(base, { dates: { mode: 'range', from: postDay, to: postDay }, dayPosts: [postId] });
    setCfg(base);
  }, [open, lastLoading, last, nonce, scope, authorId, postId, postDay]);

  useEffect(() => {
    if (!cfg) return undefined;
    const id = setTimeout(() => exportActions.saveConfig(scopeKey, cfg), 500);
    return () => clearTimeout(id);
  }, [cfg, scopeKey]);

  const set = (patch) => setCfg((c) => ({ ...c, ...patch }));
  const { data: options } = useExportOptions(scope, cfg?.authorIds ?? []);
  const allTypes = options?.fileTypes.map((f) => f.ext) ?? [];
  const errors = useMemo(() => (cfg ? exportActions.validate(cfg.template) : []), [cfg]);
  const resolved = cfg && options ? {
    authorIds: cfg.authorIds, outputDir: cfg.outputDir, dates: cfg.dates, dayPosts: cfg.dayPosts,
    fileTypes: (cfg.fileTypes ?? allTypes).filter((x) => allTypes.includes(x)), template: cfg.template,
  } : null;
  const previewable = resolved && !errors.length && resolved.authorIds.length > 0;
  const { data: plan, loading: planning } = useExportPreview(previewable ? resolved : null, cfg?.maxPerDir ?? 5);
  const problems = [...errors.map((e) => t(`export.errors.${e.code}`)), ...(cfg && !cfg.outputDir.trim() ? [t('export.errors.noDir')] : [])];
  const canStart = previewable && !problems.length && plan?.files > 0 && !starting;

  const start = async () => {
    setStarting(true);
    const res = await exportActions.start(resolved);
    setStarting(false);
    toast(t('export.started', { n: fmt.number(res.files) }), { tone: 'ok', icon: 'export' });
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} label={t('export.title')}>
      <div className={s.sheet}>
        <header className={s.head}>
          <span className={s.mark}><Icon name="export" size={19} /></span>
          <h2 className={s.title}>{scope === 'home' ? t('export.homeTitle') : t('export.authorTitle')}</h2>
          <IconButton icon="close" label={t('common.close')} onClick={onClose} />
        </header>
        {!cfg ? <div className={s.wait}><Spinner size={22} /></div> : (
          <div className={s.main}>
            <div className={s.config}>
              <Section n={1} title={t('export.authors')}>
                <AuthorsField ids={cfg.authorIds} options={options?.authors ?? []} onChange={(authorIds) => set({ authorIds, dayPosts: null })} />
              </Section>
              <Section n={2} title={t('export.outputDir')}>
                <DirField value={cfg.outputDir} onChange={(outputDir) => set({ outputDir })} />
              </Section>
              <Section n={3} title={t('export.dates')}>
                <DatesField cfg={cfg} set={set} marks={options?.calendar} />
              </Section>
              <Section n={4} title={t('export.fileTypes')} aside={allTypes.length > 0 && (
                <span className={s.miniActions}>
                  <button type="button" onClick={() => set({ fileTypes: null })}>{t('common.selectAll')}</button>
                  <button type="button" onClick={() => set({ fileTypes: [] })}>{t('common.selectNone')}</button>
                </span>
              )}>
                <div className={s.types}>
                  {(options?.fileTypes ?? []).map(({ ext, count }) => {
                    const on = (cfg.fileTypes ?? allTypes).includes(ext);
                    return (
                      <Chip key={ext} selected={on} count={fmt.number(count)} className={s.typeChip}
                        onClick={() => { const cur = cfg.fileTypes ?? allTypes; set({ fileTypes: on ? cur.filter((x) => x !== ext) : [...cur, ext] }); }}>
                        .{ext}
                      </Chip>
                    );
                  })}
                </div>
              </Section>
            </div>

            <div className={s.result}>
              <div className={s.nameBlock}>
                <div className={s.nameHead}><span className={s.step}>5</span>{t('export.fileName')}</div>
                <TemplateInput value={cfg.template} onChange={(template) => set({ template })} catalog={options?.keys} prefix={cfg.outputDir || '…'} suffix=".png" invalid={errors.length > 0} />
                {errors.length > 0 && <ul className={s.errors}>{errors.map((e) => <li key={e.code}><Icon name="alert" size={14} />{t(`export.errors.${e.code}`)}</li>)}</ul>}
              </div>
              <TreePreview plan={previewable ? plan : null} loading={planning} maxPerDir={cfg.maxPerDir} onMaxPerDir={(maxPerDir) => set({ maxPerDir })} />
            </div>
          </div>
        )}
        <footer className={s.foot}>
          <div className={s.summary}>
            {plan && previewable && <span className="num">{t('export.summary', { files: fmt.number(plan.files), size: fmt.bytes(plan.bytes) })}</span>}
            {problems.length > 0 && cfg?.authorIds.length > 0 && !errors.length && <span className={s.problem}><Icon name="alert" size={14} />{problems[0]}</span>}
          </div>
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" icon="export" disabled={!canStart} loading={starting} onClick={start}>{t('export.start')}</Button>
        </footer>
      </div>
    </Sheet>
  );
}

function Section({ n, title, aside, children }) {
  return (
    <section className={s.section}>
      <div className={s.sectionHead}>
        <span className={s.step}>{n}</span>
        <h3 className={s.sectionTitle}>{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

function AuthorsField({ ids, options, onChange }) {
  const t = useT();
  const { data: platforms } = usePlatforms();
  const [open, setOpen] = useState(false);
  const btn = useRef(null);
  const chosen = ids.map((id) => options.find((a) => a.id === id)).filter(Boolean);
  const toggle = (id) => onChange(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  return (
    <div className={s.authors}>
      {chosen.map((a) => (
        <span key={a.id} className={s.authorChip}>
          <Avatar src={a.avatar} name={a.name} size={22} />
          <span>{a.name}</span>
          <button type="button" onClick={() => toggle(a.id)} aria-label={t('common.remove')}><Icon name="close" size={12} /></button>
        </span>
      ))}
      <button ref={btn} type="button" className={s.addAuthor} onClick={() => setOpen((v) => !v)}>
        <Icon name="plus" size={15} />{t('export.addAuthors')}
      </button>
      <Popover open={open} onClose={() => setOpen(false)} anchor={btn} placement="bottom-start" trapFocus={false} label={t('export.addAuthors')}>
        <AuthorPicker authors={options} chosen={ids} onToggle={toggle} platforms={platforms} />
        <div className={s.pickerFoot}>
          <button type="button" onClick={() => onChange(options.map((a) => a.id))}>{t('common.selectAll')}</button>
          <button type="button" onClick={() => onChange([])}>{t('common.clear')}</button>
        </div>
      </Popover>
    </div>
  );
}

function DirField({ value, onChange }) {
  const t = useT();
  const [picking, setPicking] = useState(false);
  const pick = async () => { setPicking(true); const p = await exportActions.pickDirectory(); setPicking(false); if (p) onChange(p); };
  return (
    <div className={s.dir}>
      <TextInput icon="folder" value={value} onChange={(e) => onChange(e.target.value)} spellCheck={false} className={s.dirInput} />
      <Button icon={picking ? undefined : 'folder-open'} loading={picking} onClick={pick}>{t('export.chooseDir')}</Button>
    </div>
  );
}

function DatesField({ cfg, set, marks }) {
  const t = useT();
  const fmt = useFormat();
  const d = cfg.dates;
  const single = d.mode === 'range' && d.from === d.to ? d.from : null;
  const days = d.mode === 'range' ? Math.round((new Date(`${d.to}T00:00`) - new Date(`${d.from}T00:00`)) / 86400000) + 1 : 0;
  return (
    <div className={s.dates}>
      <div className={s.presets}>
        {PRESETS.map((p) => (
          <Chip key={p} selected={sameDates(d, presetRange(p))} onClick={() => set({ dates: presetRange(p), dayPosts: null })}>{t(`export.presets.${p}`)}</Chip>
        ))}
      </div>
      <div className={s.calRow}>
        <div className={s.calBox}>
          <Calendar mode="range" value={d.mode === 'range' ? { from: d.from, to: d.to } : null} marks={marks} maxDay={dayKey(new Date())}
            onChange={(r) => set({ dates: { mode: 'range', from: r.from, to: r.to }, dayPosts: null })} />
        </div>
        <div className={s.rangeInfo}>
          {d.mode === 'all'
            ? <span className={s.rangeBig}>{t('export.allDates')}</span>
            : <>
                <span className={s.rangeBig}>{single ? fmt.date(single) : `${fmt.date(d.from)} – ${fmt.date(d.to)}`}</span>
                {!single && <span className={s.rangeSmall}>{t('export.days', { n: days })}</span>}
              </>}
        </div>
      </div>
      {single && <DayPosts day={single} cfg={cfg} set={set} />}
    </div>
  );
}

/** One day picked: every post of that day, all ticked unless the user says otherwise. */
function DayPosts({ day, cfg, set }) {
  const t = useT();
  const { data: posts, loading } = useDayPosts(cfg.authorIds, day);
  if (!posts) return loading ? <Spinner size={16} /> : null;
  const chosen = cfg.dayPosts ?? posts.map((p) => p.id);
  const n = posts.filter((p) => chosen.includes(p.id)).length;
  const setChosen = (ids) => set({ dayPosts: ids.length === posts.length ? null : ids });
  return (
    <div className={s.day}>
      <div className={s.dayHead}>
        <Checkbox checked={n === posts.length && n > 0} indeterminate={n > 0 && n < posts.length} disabled={!posts.length}
          onChange={(on) => setChosen(on ? posts.map((p) => p.id) : [])} label={t('export.dayPosts', { n: posts.length })} />
        {posts.length > 0 && <span className={`${s.dayCount} num`}>{t('export.selectedPosts', { n, total: posts.length })}</span>}
      </div>
      <ul className={s.dayList}>
        {posts.map((p) => (
          <li key={p.id}>
            <Checkbox className={s.dayRow} checked={chosen.includes(p.id)} onChange={(on) => setChosen(on ? [...chosen, p.id] : chosen.filter((x) => x !== p.id))}
              label={
                <span className={s.dayItem}>
                  <Picture src={p.cover?.url} className={s.dayCover} />
                  <span className={s.dayText}>
                    <span className={s.dayTitle}>{p.title}</span>
                    <span className={s.dayAuthor}><Avatar src={p.author.avatar} name={p.author.name} size={14} />{p.author.name}</span>
                  </span>
                </span>
              } />
          </li>
        ))}
      </ul>
    </div>
  );
}
