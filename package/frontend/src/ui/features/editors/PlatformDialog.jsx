import { useEffect, useState } from 'react';
import { libraryActions } from '../../../bridge/index.js';
import { useT } from '../../../i18n/index.jsx';
import { Icon } from '../../icons/Icon.jsx';
import { Button, Field, TextInput } from '../../components/controls.jsx';
import { Dialog } from '../../components/overlay.jsx';
import { toast } from '../../components/feedback.jsx';
import { PlatformMark } from '../../components/platform.jsx';
import s from './PlatformDialog.module.css';

const COLORS = ['#d98a4e', '#c9a24a', '#8aa65a', '#4f9a86', '#4a8fd0', '#6f7fcf', '#9a72c4', '#c46f9e', '#d4697f', '#6b7280'];
const ICONS = [null, 'globe', 'bag', 'heart', 'leaf', 'star', 'book', 'music', 'camera', 'brush', 'cloud'];

export default function PlatformDialog({ open, onClose, nonce }) {
  const t = useT();
  const [form, setForm] = useState({ name: '', color: COLORS[0], icon: null, site: '', authorUrl: '' });
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) { setForm({ name: '', color: COLORS[Math.floor(Math.random() * COLORS.length)], icon: null, site: '', authorUrl: '' }); setTried(false); } }, [open, nonce]);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const missing = !form.name.trim();

  const submit = async () => {
    setTried(true);
    if (missing) return;
    setSaving(true);
    const p = await libraryActions.createPlatform(form);
    setSaving(false);
    toast(t('editor.platformCreated', { name: p.name }), { tone: 'ok', icon: 'globe' });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title={t('editor.newPlatform')} size="md"
      footer={<>
        <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="primary" icon="plus" loading={saving} onClick={submit}>{t('editor.createPlatform')}</Button>
      </>}>
      <div className={s.preview}>
        <PlatformMark platform={{ name: form.name || '?', color: form.color, icon: form.icon }} size={34} />
        <span className={s.previewName}>{form.name || t('fields.platformName')}</span>
      </div>
      <div className={s.fields}>
        <Field label={t('fields.platformName')} error={tried && missing ? t('editor.required', { field: t('fields.platformName') }) : null}>
          <TextInput value={form.name} onChange={(e) => set({ name: e.target.value })} invalid={tried && missing} data-autofocus />
        </Field>
        <Field label={t('fields.color')}>
          <div className={s.swatches} role="radiogroup" aria-label={t('fields.color')}>
            {COLORS.map((c) => (
              <button key={c} type="button" role="radio" aria-checked={form.color === c} className={s.swatch} style={{ '--c': c }} onClick={() => set({ color: c })}>
                {form.color === c && <Icon name="check" size={14} stroke={2.4} />}
              </button>
            ))}
          </div>
        </Field>
        <Field label={t('fields.icon')}>
          <div className={s.icons} role="radiogroup" aria-label={t('fields.icon')}>
            {ICONS.map((ic) => (
              <button key={ic ?? 'letter'} type="button" role="radio" aria-checked={form.icon === ic} className={s.iconOpt} onClick={() => set({ icon: ic })}>
                {ic ? <Icon name={ic} size={18} /> : <span className={s.letter}>{(form.name || 'A').slice(0, 1).toUpperCase()}</span>}
              </button>
            ))}
          </div>
        </Field>
        <Field label={t('fields.site')}>
          <TextInput value={form.site} onChange={(e) => set({ site: e.target.value })} placeholder="https://" spellCheck={false} />
        </Field>
        <Field label={t('fields.authorUrl')}>
          <TextInput value={form.authorUrl} onChange={(e) => set({ authorUrl: e.target.value })} placeholder="https://example.com/{handle}" spellCheck={false} />
        </Field>
      </div>
    </Dialog>
  );
}
