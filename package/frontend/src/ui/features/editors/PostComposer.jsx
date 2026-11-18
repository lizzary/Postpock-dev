import { useEffect, useRef, useState } from 'react';
import { libraryActions, useAuthorList } from '../../../bridge/index.js';
import { useT } from '../../../i18n/index.jsx';
import { dayKey, useFormat } from '../../lib/format.js';
import { Icon } from '../../icons/Icon.jsx';
import { Button, Field, IconButton, TextArea, TextInput } from '../../components/controls.jsx';
import { DateField } from '../../components/calendar.jsx';
import { Dialog, Popover } from '../../components/overlay.jsx';
import { toast } from '../../components/feedback.jsx';
import s from './PostComposer.module.css';

const BLOCKS = [
  { type: 'paragraph', icon: 'text' }, { type: 'image', icon: 'image' }, { type: 'video', icon: 'video' },
  { type: 'audio', icon: 'audio' }, { type: 'file', icon: 'file' }, { type: 'linkCard', icon: 'link-card' },
];
const ACCEPT = { image: 'image/*', video: 'video/*', audio: 'audio/*', file: '*/*' };
let uid = 0;
const newBlock = (type) => ({ id: ++uid, type, text: '', caption: '', title: '', href: '', description: '', upload: null, image: null });

/** Plain text with web addresses and in-app post links turned into link segments. */
const LINK = /(https?:\/\/[^\s]+|#\/post\/[\w-]+)/g;
function toChildren(text) {
  const out = [];
  let at = 0;
  for (const m of text.matchAll(LINK)) {
    if (m.index > at) out.push({ text: text.slice(at, m.index) });
    const raw = m[0];
    out.push(raw.startsWith('#/post/') ? { text: raw, postId: raw.slice(7) } : { text: raw, href: raw });
    at = m.index + raw.length;
  }
  if (at < text.length) out.push({ text: text.slice(at) });
  return out;
}

export default function PostComposer({ open, onClose, authorId, nonce }) {
  const t = useT();
  const fmt = useFormat();
  const { data: authors } = useAuthorList();
  const author = authors?.find((a) => a.id === authorId);
  const [form, setForm] = useState(null);
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const [menu, setMenu] = useState(false);
  const addBtn = useRef(null);

  useEffect(() => {
    if (open) { setForm({ title: '', subtitle: '', publishedAt: `${dayKey(new Date())}T12:00`, cover: null, blocks: [newBlock('paragraph')] }); setTried(false); }
  }, [open, nonce]);
  if (!form) return null;
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setBlock = (id, patch) => setForm((f) => ({ ...f, blocks: f.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)) }));
  const move = (i, d) => setForm((f) => { const b = [...f.blocks]; [b[i], b[i + d]] = [b[i + d], b[i]]; return { ...f, blocks: b }; });
  const remove = (id) => setForm((f) => ({ ...f, blocks: f.blocks.filter((b) => b.id !== id) }));
  const add = (type) => { setForm((f) => ({ ...f, blocks: [...f.blocks, newBlock(type)] })); setMenu(false); };
  const missing = !form.title.trim();

  const submit = async () => {
    setTried(true);
    if (missing) return;
    setSaving(true);
    const blocks = form.blocks.flatMap((b) => {
      if (b.type === 'paragraph') return b.text.trim() ? b.text.split(/\n{2,}/).map((para) => ({ type: 'paragraph', children: toChildren(para.trim()) })) : [];
      if (b.type === 'linkCard') {
        if (!b.href.trim()) return [];
        const internal = b.href.match(/#\/post\/([\w-]+)/);
        return [{ type: 'linkCard', href: internal ? undefined : b.href.trim(), postId: internal?.[1], title: b.title || b.href, description: b.description, image: b.image }];
      }
      return b.upload ? [{ type: b.type, upload: b.upload, caption: b.caption, title: b.title }] : [];
    });
    await libraryActions.createPost(authorId, { title: form.title, subtitle: form.subtitle, publishedAt: form.publishedAt, cover: form.cover, blocks });
    setSaving(false);
    toast(t('editor.postCreated'), { tone: 'ok', icon: 'check-circle' });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} size="xl" title={<>{t('editor.addPost')}{author && <span className={s.for}> · {author.name}</span>}</>}
      footer={<>
        <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="primary" icon="plus" loading={saving} onClick={submit}>{t('editor.createPost')}</Button>
      </>}>
      <div className={s.head}>
        <Drop className={s.cover} accept="image/*" onFile={async (f) => set({ cover: await libraryActions.importImage(f) })}>
          {form.cover ? <img src={form.cover.url} alt="" /> : <span className={s.dropHint}><Icon name="image" size={24} />{t('fields.cover')}</span>}
        </Drop>
        <div className={s.headFields}>
          <Field label={t('fields.title')} error={tried && missing ? t('editor.required', { field: t('fields.title') }) : null}>
            <TextInput value={form.title} onChange={(e) => set({ title: e.target.value })} invalid={tried && missing} data-autofocus />
          </Field>
          <Field label={t('fields.subtitle')}>
            <TextArea value={form.subtitle} onChange={(e) => set({ subtitle: e.target.value })} rows={2} className={s.subtitle} />
          </Field>
          <Field label={t('fields.published')}>
            <DateField value={form.publishedAt} label={t('fields.published')} onChange={(d) => set({ publishedAt: `${d}T12:00` })} />
          </Field>
        </div>
      </div>

      <div className={s.content}>
        <div className={s.contentTitle}>{t('editor.content')}</div>
        <ol className={s.blocks}>
          {form.blocks.map((b, i) => (
            <li key={b.id} className={s.block}>
              <span className={s.blockIcon}><Icon name={BLOCKS.find((x) => x.type === b.type).icon} size={17} /></span>
              <div className={s.blockBody}>
                {b.type === 'paragraph' && <TextArea value={b.text} onChange={(e) => setBlock(b.id, { text: e.target.value })} placeholder={t('editor.textPlaceholder')} rows={3} />}
                {['image', 'video', 'audio', 'file'].includes(b.type) && (
                  <div className={s.media}>
                    <Drop className={`${s.drop} ${b.type === 'image' && b.upload ? s.dropImage : ''}`} accept={ACCEPT[b.type]}
                      onFile={async (f) => setBlock(b.id, { upload: b.type === 'image' ? await libraryActions.importImage(f) : await libraryActions.importFile(f) })}>
                      {b.upload
                        ? (b.type === 'image' ? <img src={b.upload.url} alt="" /> : <span className={s.fileChip}><Icon name={BLOCKS.find((x) => x.type === b.type).icon} size={16} />{b.upload.name}.{b.upload.ext}<em>{fmt.bytes(b.upload.size)}</em></span>)
                        : <span className={s.dropHint}><Icon name="upload" size={20} />{t('editor.drop')}</span>}
                    </Drop>
                    {b.type === 'image' && <TextInput value={b.caption} onChange={(e) => setBlock(b.id, { caption: e.target.value })} placeholder={t('common.optional')} />}
                    {b.type === 'audio' && <TextInput value={b.title} onChange={(e) => setBlock(b.id, { title: e.target.value })} placeholder={t('fields.title')} />}
                  </div>
                )}
                {b.type === 'linkCard' && (
                  <div className={s.card}>
                    <TextInput icon="link" value={b.href} onChange={(e) => setBlock(b.id, { href: e.target.value })} placeholder={t('editor.cardUrl')} spellCheck={false} />
                    <div className={s.cardRow}>
                      <Drop className={s.cardImg} accept="image/*" onFile={async (f) => setBlock(b.id, { image: await libraryActions.importImage(f) })}>
                        {b.image ? <img src={b.image.url} alt="" /> : <Icon name="image" size={20} />}
                      </Drop>
                      <div className={s.cardFields}>
                        <TextInput value={b.title} onChange={(e) => setBlock(b.id, { title: e.target.value })} placeholder={t('editor.cardTitle')} />
                        <TextInput value={b.description} onChange={(e) => setBlock(b.id, { description: e.target.value })} placeholder={t('editor.cardDesc')} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className={s.blockTools}>
                <IconButton icon="chevron-up" size="sm" label={t('editor.moveUp')} disabled={i === 0} onClick={() => move(i, -1)} />
                <IconButton icon="chevron-down" size="sm" label={t('editor.moveDown')} disabled={i === form.blocks.length - 1} onClick={() => move(i, 1)} />
                <IconButton icon="trash" size="sm" label={t('common.remove')} onClick={() => remove(b.id)} />
              </div>
            </li>
          ))}
        </ol>
        <Button ref={addBtn} icon="plus" variant="secondary" onClick={() => setMenu((v) => !v)}>{t('editor.addBlock')}</Button>
        <Popover open={menu} onClose={() => setMenu(false)} anchor={addBtn} placement="top-start" label={t('editor.addBlock')}>
          <div className={s.menu}>
            {BLOCKS.map((b) => (
              <button key={b.type} type="button" className={s.menuItem} onClick={() => add(b.type)}>
                <Icon name={b.icon} size={18} /><span>{t(`editor.blocks.${b.type}`)}</span>
              </button>
            ))}
          </div>
        </Popover>
      </div>
    </Dialog>
  );
}

/** Click or drop a file. */
function Drop({ accept, onFile, className, children }) {
  const input = useRef(null);
  const [over, setOver] = useState(false);
  return (
    <div className={`${className} ${over ? s.over : ''}`} role="button" tabIndex={0}
      onClick={() => input.current.click()} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') input.current.click(); }}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files?.[0]; if (f) onFile(f); }}>
      {children}
      <input ref={input} type="file" accept={accept} hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
    </div>
  );
}
