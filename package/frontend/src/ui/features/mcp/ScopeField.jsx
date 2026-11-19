import { useRef, useState } from 'react';
import { useT } from '../../../i18n/index.jsx';
import { Icon } from '../../icons/Icon.jsx';
import { Switch } from '../../components/controls.jsx';
import { Popover } from '../../components/overlay.jsx';
import { Avatar } from '../../components/media.jsx';
import { AuthorSelector } from '../../components/AuthorSelector.jsx';
import s from './McpSheet.module.css';

/** How a scope reads in a sentence. */
export function scopeText(t, scope, total) {
  const n = scope.authorIds.length;
  if (n >= total && total > 0) return scope.future ? t('mcp.scopeSummary.allFuture') : t('mcp.scopeSummary.all', { n: total });
  if (n === 0) return scope.future ? t('mcp.scopeSummary.futureOnly') : t('mcp.scopeSummary.none');
  return scope.future ? t('mcp.scopeSummary.someFuture', { n }) : t('mcp.scopeSummary.some', { n });
}

/**
 * The authors a key may reach: a summary that opens the shared author picker (whole platforms, ranges, search),
 * a one-click "all authors", and whether authors added later join automatically.
 */
export function ScopeField({ value, onChange, directory }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const btn = useRef(null);
  const authors = directory?.authors ?? [];
  const chosen = value.authorIds.map((id) => authors.find((a) => a.id === id)).filter(Boolean);
  const all = authors.length > 0 && chosen.length >= authors.length;
  const nPlatforms = new Set(chosen.map((a) => a.platformId)).size;
  const SHOW = 4;
  return (
    <div className={s.scope}>
      <div className={s.scopeLine}>
        <button ref={btn} type="button" className={s.scopeField} data-empty={!chosen.length} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {chosen.length ? (
            <>
              <span className={s.stackAv}>{chosen.slice(0, SHOW).map((a) => <Avatar key={a.id} src={a.avatar} name={a.name} size={24} />)}</span>
              <span className={s.scopeSummary}>
                <span className={s.scopeNames}>{all ? t('mcp.scopeAll') : `${chosen.slice(0, 2).map((a) => a.name).join(t('common.and'))}${chosen.length > 2 ? ` +${chosen.length - 2}` : ''}`}</span>
                <span className={s.scopeMeta}>{t('picker.authorsCount', { n: chosen.length })} · {t('picker.platformsCount', { n: nPlatforms })}</span>
              </span>
            </>
          ) : (
            <span className={s.scopeSummary}><span className={s.scopeNames}>{t('mcp.scopePick')}</span></span>
          )}
          <Icon name="chevron-down" size={15} className={s.scopeChev} />
        </button>
        <button type="button" className={s.allBtn} data-on={all} disabled={!authors.length}
          onClick={() => onChange({ ...value, authorIds: all ? [] : authors.map((a) => a.id) })}>
          {all ? <Icon name="check" size={14} /> : <Icon name="users" size={14} />}{t('mcp.scopeAll')}
        </button>
      </div>
      <label className={s.futureRow}>
        <Switch size="sm" checked={value.future} label={t('mcp.future')} onChange={(future) => onChange({ ...value, future })} />
        <span>{t('mcp.future')}</span>
      </label>
      <Popover open={open} onClose={() => setOpen(false)} anchor={btn} placement="bottom-start" trapFocus={false} label={t('mcp.scopePick')}>
        <AuthorSelector authors={authors} platforms={directory?.platforms ?? []} value={value.authorIds} onChange={(authorIds) => onChange({ ...value, authorIds })} autoFocus />
      </Popover>
    </div>
  );
}
