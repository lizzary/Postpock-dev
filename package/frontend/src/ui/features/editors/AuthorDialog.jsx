import { useEffect, useRef, useState } from 'react';
import { libraryActions, usePlatforms } from '../../../bridge/index.js';
import { navigate, paths } from '../../../app/router.jsx';
import { useT } from '../../../i18n/index.jsx';
import { DEFAULT_BANNERS, bannerUri, randomBanner, resolveArt } from '../../art/banners/banners.js';
import { Icon } from '../../icons/Icon.jsx';
import { Button, Field, Segmented, Select, TextArea, TextInput } from '../../components/controls.jsx';
import { Dialog, Popover } from '../../components/overlay.jsx';
import { toast } from '../../components/feedback.jsx';
import { Avatar } from '../../components/media.jsx';
import s from './AuthorDialog.module.css';

const COVER_RATIO = 16 / 10;

/** New author (no `author`) or edit an existing one. */
export default function AuthorDialog({ open, onClose, author, platformId, nonce }) {
  const t = useT();
  const { data: platforms } = usePlatforms();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [tried, setTried] = useState(false);
  const [bannerMenu, setBannerMenu] = useState(false);
  const bannerBtn = useRef(null);
  const bannerFile = useRef(null);
  const avatarFile = useRef(null);
  const coverFile = useRef(null);
  const editing = !!author;

  useEffect(() => {
    if (!open) return;
    setTried(false);
    setForm(author
      ? { platformId: author.platformId, name: author.name, handle: author.handle ?? '', url: author.url ?? '', bio: author.bio ?? '', avatar: author.avatar, banner: author.banner, cover: author.cover, coverFocus: author.coverFocus ?? { x: 0.5, y: 0.5 } }
      : { platformId: platformId ?? platforms?.[0]?.id ?? 'fanbox', name: '', handle: '', url: '', bio: '', avatar: null, banner: randomBanner(), cover: null, coverFocus: { x: 0.5, y: 0.5 } });
  }, [open, nonce]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!form) return null;
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const platform = platforms?.find((p) => p.id === form.platformId);
  const nameMissing = !form.name.trim();
  const upload = async (file, key) => { if (!file) return; const img = await libraryActions.importImage(file); set({ [key]: img.url }); };

  const submit = async () => {
    setTried(true);
    if (nameMissing) return;
    setSaving(true);
    const input = { ...form, cover: form.cover || null };
    if (editing) {
      await libraryActions.updateAuthor(author.id, input);
      toast(t('author.edit.saved'), { tone: 'ok' });
      onClose();
    } else {
      const created = await libraryActions.createAuthor(input);
      toast(t('editor.authorCreated', { name: created.name }), { tone: 'ok', icon: 'user-plus' });
      onClose();
      navigate(paths.author(created.id));
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onClose={onClose} title={editing ? t('author.editProfile') : t('editor.newAuthor')} size="lg"
      footer={<>
        <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="primary" icon={editing ? 'check' : 'user-plus'} loading={saving} onClick={submit}>{editing ? t('common.save') : t('editor.createAuthor')}</Button>
      </>}>
      <div className={s.preview}>
        <div className={s.banner}>
          <img src={resolveArt(form.banner)} alt="" draggable={false} />
          <button ref={bannerBtn} type="button" className={s.overlayBtn} onClick={() => setBannerMenu((v) => !v)}>
            <Icon name="image" size={16} />{t('author.edit.banner')}
          </button>
        </div>
        <button type="button" className={s.avatarBtn} onClick={() => avatarFile.current.click()} aria-label={t('author.edit.avatar')}>
          <Avatar src={form.avatar} name={form.name || '?'} size={88} ring />
          <span className={s.avatarHover}><Icon name="camera" size={20} /></span>
        </button>
      </div>
      <input ref={bannerFile} type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0], 'banner')} />
      <input ref={avatarFile} type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0], 'avatar')} />
      <input ref={coverFile} type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0], 'cover')} />

      <Popover open={bannerMenu} onClose={() => setBannerMenu(false)} anchor={bannerBtn} placement="bottom-end" label={t('fields.banner')}>
        <div className={s.bannerMenu}>
          <div className={s.menuTitle}>{t('fields.builtIn')}</div>
          <div className={s.bannerGrid}>
            {DEFAULT_BANNERS.map((id) => (
              <button key={id} type="button" className={s.bannerOpt} data-on={form.banner === `default:${id}`} onClick={() => { set({ banner: `default:${id}` }); setBannerMenu(false); }}>
                <img src={bannerUri(id)} alt="" />
              </button>
            ))}
          </div>
          <Button size="sm" icon="upload" className={s.menuUpload} onClick={() => { setBannerMenu(false); bannerFile.current.click(); }}>{t('common.upload')}</Button>
        </div>
      </Popover>

      <div className={s.fields}>
        <Field label={t('fields.platform')}>
          <Select value={form.platformId} onChange={(v) => set({ platformId: v })} label={t('fields.platform')}
            options={(platforms ?? []).map((p) => ({ value: p.id, label: p.name }))} />
        </Field>
        <Field label={t('fields.name')} error={tried && nameMissing ? t('editor.required', { field: t('fields.name') }) : null}>
          <TextInput value={form.name} onChange={(e) => set({ name: e.target.value })} invalid={tried && nameMissing} data-autofocus />
        </Field>
        <Field label={t('fields.handle')}>
          <TextInput value={form.handle} onChange={(e) => set({ handle: e.target.value })} spellCheck={false} />
        </Field>
        <Field label={t('fields.url')}>
          <TextInput value={form.url} onChange={(e) => set({ url: e.target.value })} spellCheck={false}
            placeholder={platform?.site ? (form.handle ? (platform.authorUrl || platform.site).replace('{handle}', form.handle) : platform.site) : 'https://'} />
        </Field>
        <Field label={t('fields.bio')} className={s.wide}>
          <TextArea value={form.bio} onChange={(e) => set({ bio: e.target.value })} rows={3} />
        </Field>
        <Field label={t('fields.cover')} className={s.wide}
          aside={<Segmented size="sm" value={form.cover ? 'custom' : 'auto'} label={t('fields.cover')}
            onChange={(v) => (v === 'auto' ? set({ cover: null }) : coverFile.current.click())}
            options={[{ value: 'auto', label: t('fields.coverAuto') }, { value: 'custom', label: t('common.upload') }]} />}>
          <CoverPicker form={form} set={set} />
        </Field>
      </div>
    </Dialog>
  );
}

/** Choose the card cover: a 16:10 frame dragged over the banner, or the uploaded cover as it will look. */
function CoverPicker({ form, set }) {
  const box = useRef(null);
  const [ratio, setRatio] = useState(3);
  const drag = useRef(null);
  const src = resolveArt(form.cover ?? form.banner);
  const f = form.coverFocus;
  const horizontal = ratio >= COVER_RATIO;
  const fw = horizontal ? COVER_RATIO / ratio : 1, fh = horizontal ? 1 : ratio / COVER_RATIO;
  const frame = { left: `${f.x * (1 - fw) * 100}%`, top: `${f.y * (1 - fh) * 100}%`, width: `${fw * 100}%`, height: `${fh * 100}%` };

  const move = (e) => {
    if (!drag.current) return;
    const r = box.current.getBoundingClientRect();
    const dx = (e.clientX - drag.current.x) / r.width, dy = (e.clientY - drag.current.y) / r.height;
    set({ coverFocus: {
      x: fw < 1 ? Math.max(0, Math.min(1, drag.current.fx + dx / (1 - fw))) : 0.5,
      y: fh < 1 ? Math.max(0, Math.min(1, drag.current.fy + dy / (1 - fh))) : 0.5,
    } });
  };
  return (
    <div className={s.cover}>
      {form.cover ? (
        <div className={s.coverResult}><img src={src} alt="" /></div>
      ) : (
        <>
          <div ref={box} className={s.cropBox} style={{ aspectRatio: ratio }}>
            <img src={src} alt="" draggable={false} onLoad={(e) => setRatio(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight || 3)} />
            <div className={s.cropFrame} style={frame}
              onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, fx: f.x, fy: f.y }; }}
              onPointerMove={move} onPointerUp={() => { drag.current = null; }}>
              <span className={s.cropGrip}><Icon name="grip" size={16} /></span>
            </div>
          </div>
          <div className={s.coverResult}>
            <img src={src} alt="" style={{ objectPosition: `${f.x * 100}% ${f.y * 100}%` }} />
          </div>
        </>
      )}
    </div>
  );
}
