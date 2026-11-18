import { useMemo, useRef, useState } from 'react';
import { libraryActions } from '../../../bridge/index.js';
import { Link, paths } from '../../../app/router.jsx';
import { useT } from '../../../i18n/index.jsx';
import { useFormat } from '../../lib/format.js';
import { resolveArt } from '../../art/banners/banners.js';
import { Icon } from '../../icons/Icon.jsx';
import { Button, IconButton } from '../../components/controls.jsx';
import { toast } from '../../components/feedback.jsx';
import { Picture } from '../../components/media.jsx';
import { ImageViewer } from './ImageViewer.jsx';
import s from './PostBody.module.css';

/** The body of a post, block by block, in the order of the original. */
export function PostBody({ post }) {
  const images = useMemo(() => post.blocks.filter((b) => b.type === 'image' && b.file), [post.blocks]);
  const [viewer, setViewer] = useState(null);
  const origin = useRef(null);
  let imageIndex = -1;
  return (
    <article className={s.body} lang={post.lang === 'ja' ? 'ja' : post.lang === 'en' ? 'en' : 'zh-CN'}>
      {post.blocks.map((b, i) => {
        switch (b.type) {
          case 'paragraph': return <Paragraph key={i} block={b} />;
          case 'image': {
            if (!b.file) return null;
            const k = ++imageIndex;
            return <Figure key={i} block={b} onOpen={(el) => { origin.current = el; setViewer(k); }} />;
          }
          case 'video': return b.file && <VideoPlayer key={i} file={b.file} />;
          case 'audio': return b.file && <AudioPlayer key={i} file={b.file} title={b.title} />;
          case 'file': return b.file && <Attachment key={i} file={b.file} />;
          case 'linkCard': return <LinkCard key={i} block={b} />;
          default: return null;
        }
      })}
      <ImageViewer images={images} index={viewer} origin={origin} onIndex={setViewer} onClose={() => setViewer(null)} />
    </article>
  );
}

function Paragraph({ block }) {
  return (
    <p className={s.p}>
      {block.children.map((c, i) => {
        if (c.postId) return <Link key={i} to={paths.post(c.postId)} className={s.inLink}>{c.text}</Link>;
        if (c.href) return <a key={i} href={c.href} target="_blank" rel="noreferrer" className={s.exLink}>{c.text}<Icon name="arrow-up-right" size={13} /></a>;
        return <span key={i}>{c.text}</span>;
      })}
    </p>
  );
}

function Figure({ block, onOpen }) {
  const { file } = block;
  const ratio = file.width && file.height ? file.width / file.height : 1.5;
  const wide = ratio >= 1.25;
  return (
    <figure className={`${s.figure} ${wide ? s.wide : ''}`}>
      <button type="button" className={s.imgBtn} onClick={(e) => onOpen(e.currentTarget)} style={{ '--ratio': ratio }} aria-label={file.alt ?? file.name}>
        <Picture src={file.url} alt={file.alt ?? ''} ratio={`${file.width} / ${file.height}`} className={s.img} />
        <span className={s.zoomHint}><Icon name="expand" size={16} /></span>
      </button>
      {block.caption && <figcaption className={s.caption}>{block.caption}</figcaption>}
    </figure>
  );
}

// ------------------------------------------------------------------ video
function VideoPlayer({ file }) {
  const t = useT();
  const fmt = useFormat();
  const ref = useRef(null);
  const box = useRef(null);
  const [state, setState] = useState({ playing: false, started: false, time: 0, dur: 0, muted: false });
  const v = () => ref.current;
  const toggle = () => { if (v().paused) v().play(); else v().pause(); };
  return (
    <div ref={box} className={s.video} data-playing={state.playing} data-started={state.started}>
      <video ref={ref} src={file.url} poster={resolveArt(file.poster)} preload="metadata" playsInline onClick={toggle}
        onPlay={() => setState((x) => ({ ...x, playing: true, started: true }))} onPause={() => setState((x) => ({ ...x, playing: false }))}
        onTimeUpdate={(e) => { const time = e.currentTarget.currentTime; setState((x) => ({ ...x, time })); }}
        onLoadedMetadata={(e) => {
          const el = e.currentTarget;
          // streamed recordings may not state their length: seek to the end once to learn it
          if (el.duration === Infinity) el.currentTime = 1e9;
          else { const dur = el.duration; setState((x) => ({ ...x, dur })); }
        }}
        onDurationChange={(e) => {
          const el = e.currentTarget;
          if (Number.isFinite(el.duration) && el.currentTime > el.duration - 0.05 && !state.started) el.currentTime = 0;
          if (Number.isFinite(el.duration)) { const dur = el.duration; setState((x) => ({ ...x, dur })); }
        }}
        onEnded={() => setState((x) => ({ ...x, playing: false }))} />
      {!state.started && (
        <button type="button" className={s.bigPlay} onClick={toggle} aria-label={t('post.play')}>
          <Icon name="play" size={28} />
        </button>
      )}
      <div className={s.controls}>
        <IconButton icon={state.playing ? 'pause' : 'play'} size="sm" tone="art" label={state.playing ? t('post.pause') : t('post.play')} onClick={toggle} />
        <span className={`${s.time} num`}>{fmt.duration(state.time)}</span>
        <Scrubber value={state.dur ? state.time / state.dur : 0} onSeek={(p) => { v().currentTime = p * (state.dur || 0); }} />
        <span className={`${s.time} num`}>{fmt.duration(state.dur)}</span>
        <IconButton icon={state.muted ? 'volume-off' : 'volume'} size="sm" tone="art" label={state.muted ? t('post.unmute') : t('post.mute')}
          onClick={() => { v().muted = !v().muted; setState((x) => ({ ...x, muted: v().muted })); }} />
        <IconButton icon="expand" size="sm" tone="art" label={t('post.fullscreen')} onClick={() => box.current.requestFullscreen?.()} />
      </div>
    </div>
  );
}

function Scrubber({ value, onSeek, className }) {
  const ref = useRef(null);
  const seek = (e) => { const r = ref.current.getBoundingClientRect(); onSeek(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))); };
  return (
    <div ref={ref} className={`${s.scrub} ${className ?? ''}`} role="slider" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)} tabIndex={0}
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); seek(e); }}
      onPointerMove={(e) => { if (e.buttons) seek(e); }}
      onKeyDown={(e) => { if (e.key === 'ArrowRight') onSeek(Math.min(1, value + 0.05)); if (e.key === 'ArrowLeft') onSeek(Math.max(0, value - 0.05)); }}>
      <span className={s.scrubFill} style={{ transform: `scaleX(${value})` }} />
      <span className={s.scrubKnob} style={{ left: `${value * 100}%` }} />
    </div>
  );
}

// ------------------------------------------------------------------ audio
function AudioPlayer({ file, title }) {
  const t = useT();
  const fmt = useFormat();
  const ref = useRef(null);
  const [st, setSt] = useState({ playing: false, time: 0, dur: 0 });
  const bars = useMemo(() => {
    let h = [...file.id].reduce((a, c) => (a * 33 + c.charCodeAt(0)) >>> 0, 5381);
    return Array.from({ length: 72 }, (_, i) => { h = (h * 1664525 + 1013904223) >>> 0; return 0.25 + 0.75 * Math.abs(Math.sin(i * 0.37)) * (0.45 + 0.55 * (h / 4294967296)); });
  }, [file.id]);
  const p = st.dur ? st.time / st.dur : 0;
  const toggle = () => { const a = ref.current; if (a.paused) a.play(); else a.pause(); };
  const seekAt = (e) => { const r = e.currentTarget.getBoundingClientRect(); ref.current.currentTime = ((e.clientX - r.left) / r.width) * (st.dur || 0); };
  return (
    <div className={s.audio} data-playing={st.playing}>
      <audio ref={ref} src={file.url} preload="metadata"
        onPlay={() => setSt((x) => ({ ...x, playing: true }))} onPause={() => setSt((x) => ({ ...x, playing: false }))} onEnded={() => setSt((x) => ({ ...x, playing: false }))}
        onTimeUpdate={(e) => { const time = e.currentTarget.currentTime; setSt((x) => ({ ...x, time })); }}
        onLoadedMetadata={(e) => { const dur = e.currentTarget.duration; setSt((x) => ({ ...x, dur })); }} />
      <div className={s.audioArt}>
        {file.cover && <img src={resolveArt(file.cover)} alt="" />}
        <button type="button" className={s.audioPlay} onClick={toggle} aria-label={st.playing ? t('post.pause') : t('post.play')}>
          <Icon name={st.playing ? 'pause' : 'play'} size={20} />
        </button>
      </div>
      <div className={s.audioMain}>
        <div className={s.audioHead}>
          <span className={s.audioTitle}>{title || file.name}</span>
          <span className={`${s.audioTime} num`}>{fmt.duration(st.time)} / {fmt.duration(st.dur)}</span>
        </div>
        <div className={s.wave} onPointerDown={seekAt} role="slider" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p * 100)}>
          {bars.map((b, i) => <span key={i} style={{ height: `${b * 100}%` }} data-on={i / bars.length < p} />)}
        </div>
        <div className={s.audioFile}>{file.name}.{file.ext} · {fmt.bytes(file.size)}</div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ attachments & link cards
const EXT_TINT = { zip: '#c99a4a', rar: '#c99a4a', '7z': '#c99a4a', psd: '#4f7fbf', clip: '#5f9a78', pdf: '#c46a5e', mp4: '#8a6fc0', mp3: '#c0708f' };

function Attachment({ file }) {
  const t = useT();
  const fmt = useFormat();
  const open = async () => { await libraryActions.openFile(file.id); toast(t('post.opened'), { tone: 'ok', icon: 'file' }); };
  const reveal = async () => { await libraryActions.revealFile(file.id); toast(t('post.revealed'), { tone: 'ok', icon: 'folder-open' }); };
  return (
    <div className={s.file}>
      <span className={s.ext} style={{ '--tint': EXT_TINT[file.ext] ?? '#8a8f99' }}>
        <Icon name={file.ext === 'zip' ? 'archive' : 'file'} size={20} />
        <b>{file.ext}</b>
      </span>
      <div className={s.fileInfo}>
        <div className={s.fileName}>{file.name}.{file.ext}</div>
        <div className={`${s.fileSize} num`}>{fmt.bytes(file.size)}</div>
      </div>
      <Button variant="ghost" size="sm" icon="reveal" onClick={reveal}>{t('post.reveal')}</Button>
      <Button variant="secondary" size="sm" onClick={open}>{t('post.open')}</Button>
    </div>
  );
}

function LinkCard({ block }) {
  const t = useT();
  if (block.missing) {
    return <div className={`${s.card} ${s.cardMissing}`}><Icon name="link" size={18} />{t('post.missing')}</div>;
  }
  const inner = (
    <>
      {block.image && <span className={s.cardImg}><img src={resolveArt(block.image)} alt="" /></span>}
      <span className={s.cardText}>
        <span className={s.cardTitle}>{block.title}</span>
        {block.description && <span className={`${s.cardDesc} clamp-2`}>{block.description}</span>}
        <span className={s.cardHost}>
          {block.postId ? <><Icon name="sparkle" size={13} />{t('post.inLibrary')}</> : <><Icon name="link" size={13} />{hostOf(block.href)}</>}
        </span>
      </span>
    </>
  );
  return (
    <div className={s.cardRow}>
      {block.postId
        ? <Link to={paths.post(block.postId)} className={s.card}>{inner}</Link>
        : <a href={block.href} target="_blank" rel="noreferrer" className={s.card}>{inner}</a>}
    </div>
  );
}
const hostOf = (href) => { try { return new URL(href).host; } catch { return href; } };
