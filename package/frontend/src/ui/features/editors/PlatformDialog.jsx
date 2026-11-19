import { useEffect, useState } from 'react';
import { libraryActions } from '../../../bridge/index.js';
import { useT } from '../../../i18n/index.jsx';
import { Icon } from '../../icons/Icon.jsx';
import { Button, Field, Segmented, TextInput } from '../../components/controls.jsx';
import { Dialog, Tooltip } from '../../components/overlay.jsx';
import { toast } from '../../components/feedback.jsx';
import { PlatformMark } from '../../components/platform.jsx';
import s from './PlatformDialog.module.css';

const COLORS = ['#d98a4e', '#de7a5c', '#d4697f', '#c46f9e', '#9a72c4', '#6f7fcf', '#4a8fd0', '#4f86b8', '#4f9a86', '#5aa38a', '#8aa65a', '#c9a24a', '#b0805a', '#6b7280', '#5d6676'];
const LETTERS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map((c) => `letter:${c}`);
const SYMBOLS = [
  'globe', 'home', 'bag', 'gift', 'ticket', 'mail', 'chat', 'heart', 'star',
  'sparkle', 'crown', 'gem', 'bolt', 'moon', 'sun', 'cloud', 'leaf', 'flower',
  'paw', 'coffee', 'book', 'feather', 'pen', 'brush', 'palette', 'image', 'camera',
  'film', 'video', 'music', 'mic', 'gamepad',
];
const blank = () => ({ name: '', color: COLORS[Math.floor(Math.random() * COLORS.length)], icon: null, site: '', authorUrl: '' });
const tabOf = (icon) => (icon && !icon.startsWith('letter:') ? 'symbols' : 'letters');

/** New custom platform (no `platform`), or edit any platform's name, colour, icon and links. */
export default function PlatformDialog({ open, onClose, platform, nonce }) {
  const t = useT();
  const editing = !!platform;
  const [form, setForm] = useState(blank);
  const [tab, setTab] = useState('letters');
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return;
    const f = platform ? { name: platform.name, color: platform.color, icon: platform.icon ?? null, site: platform.site ?? '', authorUrl: platform.authorUrl ?? '' } : blank();
    setForm(f); setTab(tabOf(f.icon)); setTried(false);
  }, [open, nonce]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const missing = !form.name.trim();
  const colors = COLORS.includes(form.color) || !form.color ? COLORS : [form.color, ...COLORS];

  const submit = async () => {
    setTried(true);
    if (missing) return;
    setSaving(true);
    if (editing) {
      await libraryActions.updatePlatform(platform.id, form);
      toast(t('editor.platformSaved'), { tone: 'ok', icon: 'check' });
    } else {
      const p = await libraryActions.createPlatform(form);
      toast(t('editor.platformCreated', { name: p.name }), { tone: 'ok', icon: 'globe' });
    }
    setSaving(false);
    onClose();
  };

  const mark = { name: form.name || t('fields.platformName'), color: form.color, icon: form.icon };
  const initial = (form.name.trim() || '?').slice(0, 1).toUpperCase();
  return (
    <Dialog open={open} onClose={onClose} title={editing ? t('editor.editPlatform') : t('editor.newPlatform')} size="lg"
      footer={<>
        <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="primary" icon={editing ? 'check' : 'plus'} loading={saving} onClick={submit}>{editing ? t('common.save') : t('editor.createPlatform')}</Button>
      </>}>
      {/* how it will look: large, and as the tab it becomes on the home page */}
      <div className={s.preview} style={{ '--c': form.color }}>
        <span className={s.bigMark} key={`${form.icon}|${form.color}`}><PlatformMark platform={mark} size={52} /></span>
        <span className={s.previewName} data-empty={!form.name}>{mark.name}</span>
        <span className={s.inContext} aria-hidden="true">
          <span className={s.tabChip}><PlatformMark platform={mark} size={16} /><span>{mark.name}</span></span>
          <span className={s.wingChip}><PlatformMark platform={mark} size={22} /><span>{mark.name}</span></span>
        </span>
      </div>

      <div className={s.cols}>
        <div className={s.col}>
          <Field label={t('fields.platformName')} error={tried && missing ? t('editor.required', { field: t('fields.platformName') }) : null}>
            <TextInput value={form.name} onChange={(e) => set({ name: e.target.value })} invalid={tried && missing} data-autofocus maxLength={40} />
          </Field>
          <Field label={t('fields.site')}>
            <TextInput icon="globe" value={form.site} onChange={(e) => set({ site: e.target.value })} placeholder="https://" spellCheck={false} />
          </Field>
          <Field label={t('fields.authorUrl')}>
            <TextInput icon="link" value={form.authorUrl} onChange={(e) => set({ authorUrl: e.target.value })} placeholder="https://example.com/{handle}" spellCheck={false} />
          </Field>
          <Field label={t('fields.color')}>
            <div className={s.swatches} role="radiogroup" aria-label={t('fields.color')}>
              {colors.map((c) => (
                <button key={c} type="button" role="radio" aria-checked={form.color === c} aria-label={c} className={s.swatch} style={{ '--c': c }} onClick={() => set({ color: c })}>
                  {form.color === c && <Icon name="check" size={13} stroke={2.4} />}
                </button>
              ))}
            </div>
          </Field>
        </div>

        <div className={s.col}>
          <Field label={t('fields.icon')} aside={(
            <Segmented size="sm" value={tab} onChange={setTab} label={t('fields.icon')}
              options={[{ value: 'letters', label: t('fields.iconLetters') }, { value: 'symbols', label: t('fields.iconSymbols') }]} />
          )}>
            <div className={s.iconPanel} style={{ '--c': form.color }}>
              <div className={s.iconGrid} role="radiogroup" aria-label={t('fields.icon')} key={tab}>
                {tab === 'letters' && (
                  <Tooltip label={t('fields.iconInitial')}>
                    <button type="button" role="radio" aria-checked={form.icon === null} className={`${s.iconOpt} ${s.auto}`} onClick={() => set({ icon: null })} style={{ '--k': 0 }}>
                      <span className={s.letter}>{initial}</span><i className={s.autoDot} />
                    </button>
                  </Tooltip>
                )}
                {(tab === 'letters' ? LETTERS : SYMBOLS).map((ic, i) => (
                  <button key={ic} type="button" role="radio" aria-checked={form.icon === ic} className={s.iconOpt} onClick={() => set({ icon: ic })}
                    aria-label={ic.startsWith('letter:') ? ic.slice(7) : ic} style={{ '--k': i + 1 }}>
                    {ic.startsWith('letter:') ? <span className={s.letter}>{ic.slice(7)}</span> : <Icon name={ic} size={18} />}
                  </button>
                ))}
              </div>
            </div>
          </Field>
        </div>
      </div>
    </Dialog>
  );
}
