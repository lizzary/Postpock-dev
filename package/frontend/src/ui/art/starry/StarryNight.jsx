// The home-page Starry Night: a baked impasto picture plus the parts that move.
//   • the spirals turn slowly; moving the pointer across the sky stirs them, scrolling spins them
//   • stars breathe; a star or the moon answers a click with a flare
//   • the cypress sways, and the village windows light up one group after another
import { useEffect, useRef } from 'react';
import { W, H, STARS, MOON } from './composition.js';
import { CYPRESS_FRAMES } from './bake.js';
import s from './StarryNight.module.css';

const ANCHOR_X = 0.72;                 // which part of the panel stays in view when the page is narrow
const BASE_SPIN = 0.045;               // rad/s of the great spiral when nothing touches it
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

export function StarryNight({ className, onReady }) {
  const wrap = useRef(null);
  const baseCv = useRef(null);
  const topCv = useRef(null);
  const readyRef = useRef(onReady);
  readyRef.current = onReady;

  useEffect(() => {
    const el = wrap.current, base = baseCv.current, top = topCv.current;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const layers = { spin: [], star: [], flare: [], halo: null, moon: null, window: [], cypress: [], main: null };
    const born = new Map();          // layer → arrival time (fade-in)
    const extra = new Map();         // spin layer id → { angle, vel }
    const flares = new Map();        // star index → start time
    let moonPulse = -10;
    let view = { w: 1, h: 1, dpr: 1, k: 1, ox: 0, oy: 0 };
    let t0 = performance.now(), last = t0, lastInput = -1e9, visible = true, raf = 0, firstFrame = 0;

    // ---------------------------------------------------------- geometry
    const measure = () => {
      const r = el.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const k = Math.max(r.width / W, r.height / H);
      view = { w: r.width, h: r.height, dpr, k, ox: (r.width - W * k) * ANCHOR_X, oy: 0 };
      for (const cv of [base, top]) {
        cv.width = Math.max(1, Math.round(r.width * dpr));
        cv.height = Math.max(1, Math.round(r.height * dpr));
      }
      drawBase();
      if (reduce) frame(performance.now());
    };
    const toUnits = (cx, cy) => {
      const r = el.getBoundingClientRect();
      return [(cx - r.left - view.ox) / view.k, (cy - r.top - view.oy) / view.k];
    };

    // ---------------------------------------------------------- drawing
    const setT = (ctx) => ctx.setTransform(view.dpr * view.k, 0, 0, view.dpr * view.k, view.dpr * view.ox, view.dpr * view.oy);
    function drawBase() {
      const ctx = base.getContext('2d');
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, base.width, base.height);
      if (!layers.main) return;
      setT(ctx);
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(layers.main.bitmap, 0, 0, W, H);
    }
    const fadeOf = (layer, now, delay = 0, dur = 900) => smooth((now - (born.get(layer) ?? now) - delay) / dur);
    const disc = (ctx, l, angle, scale = 1, alpha = 1) => {
      if (alpha <= 0.002) return;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(l.cx, l.cy);
      ctx.rotate(angle);
      if (scale !== 1) ctx.scale(scale, scale);
      ctx.drawImage(l.bitmap, -l.half, -l.half, 2 * l.half, 2 * l.half);
      ctx.restore();
    };

    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = reduce ? 0 : (now - t0) / 1000;
      const ctx = top.getContext('2d');
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, top.width, top.height);
      setT(ctx);
      ctx.imageSmoothingQuality = 'high';

      // stirred / scrolled extra spin, with friction
      for (const e of extra.values()) { e.angle += e.vel * dt; e.vel *= Math.exp(-dt / 1.3); }
      const great = (extra.get('coil')?.angle ?? 0) + BASE_SPIN * t;

      for (const l of layers.spin) {
        const own = extra.get(l.id)?.angle ?? 0;
        const a = l.id === 'ring' ? great * 0.5 : l.id === 'coil' ? great : BASE_SPIN * l.rate * 1.6 * t + own;
        disc(ctx, l, a, 1, fadeOf(l, now));
      }
      for (const l of layers.flare) {
        const f0 = flares.get(l.index);
        if (f0 == null) continue;
        const u = (now - f0) / 1700;
        if (u > 1) { flares.delete(l.index); continue; }
        const k = Math.sin(Math.PI * Math.min(1, u * 1.6)) * (1 - u * 0.4);
        disc(ctx, l, -great * 0.4 * l.rate + l.phase + u * 1.4, 0.85 + 0.35 * k, 0.92 * k);
      }
      for (const l of layers.star) {
        const st = STARS[l.index];
        const breathe = 0.5 + 0.5 * Math.sin((t / (3 + (l.index % 5) * 0.55)) * Math.PI * 2 + l.phase * 2.3);
        const f0 = flares.get(l.index);
        const pop = f0 == null ? 0 : Math.sin(Math.PI * clamp((now - f0) / 900, 0, 1));
        disc(ctx, l, great * 0.3 * st.dir + l.phase, 1 + 0.035 * breathe + 0.16 * pop, fadeOf(l, now, 260 + l.index * 70, 700));
      }
      if (layers.halo) {
        const p = Math.max(0, 1 - (now - moonPulse) / 1400);
        const throb = Math.sin(Math.PI * Math.min(1, (now - moonPulse) / 700)) * p;
        disc(ctx, layers.halo, great * 0.15, 1 + 0.02 * Math.sin(t * 1.3) + 0.09 * throb, fadeOf(layers.halo, now, 500, 1000));
      }
      if (layers.moon) disc(ctx, layers.moon, 0, 1, fadeOf(layers.moon, now, 500, 1000));
      for (const l of layers.window) {
        const a = fadeOf(l, now, 900 + (l.group - 1) * 650, 500);
        if (a <= 0) continue;
        ctx.globalAlpha = a;
        ctx.drawImage(l.bitmap, l.x, l.y, l.w, l.h);
        ctx.globalAlpha = 1;
      }
      if (layers.cypress.length === CYPRESS_FRAMES) {
        const ph = ((t / 11) % 1) * CYPRESS_FRAMES, i = Math.floor(ph), fr = smooth(ph - i);
        const A = layers.cypress[i], B = layers.cypress[(i + 1) % CYPRESS_FRAMES];
        ctx.drawImage(A.bitmap, A.x, A.y, A.w, A.h);
        if (fr > 0.01) { ctx.globalAlpha = fr; ctx.drawImage(B.bitmap, B.x, B.y, B.w, B.h); ctx.globalAlpha = 1; }
      } else if (layers.cypress[0]) {
        const A = layers.cypress[0];
        ctx.drawImage(A.bitmap, A.x, A.y, A.w, A.h);
      }
    }

    // ---------------------------------------------------------- loop (only while visible; slower when idle)
    let skip = false;
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      const idle = now - lastInput > 2500 && now - firstFrame > 4000;
      if (idle) { skip = !skip; if (skip) return; }
      frame(now);
    };
    const start = () => { if (!raf && visible && !reduce && layers.main) { last = performance.now(); raf = requestAnimationFrame(loop); } };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };

    // ---------------------------------------------------------- layers from the worker
    const worker = new Worker(new URL('./starry.worker.js', import.meta.url), { type: 'module' });
    const r0 = el.getBoundingClientRect();
    const S = clamp(Math.round(Math.max(r0.width / W, r0.height / H) * Math.min(2, window.devicePixelRatio || 1) * 2) / 2, 1, 2);
    worker.onmessage = ({ data }) => {
      if (data.type !== 'layer') return;
      const l = data.layer;
      born.set(l, performance.now());
      if (l.kind === 'main') {
        layers.main = l;
        firstFrame = performance.now();
        drawBase();
        el.dataset.ready = 'true';
        readyRef.current?.();
        start();
      } else if (l.kind === 'spin') { layers.spin.push(l); extra.set(l.id, { angle: 0, vel: 0 }); }
      else if (l.kind === 'star') layers.star.push(l);
      else if (l.kind === 'flare') layers.flare.push(l);
      else if (l.kind === 'halo') layers.halo = l;
      else if (l.kind === 'moon') layers.moon = l;
      else if (l.kind === 'window') layers.window.push(l);
      else if (l.kind === 'cypress') layers.cypress[l.frame] = l;
      if (reduce) frame(performance.now());
    };
    worker.postMessage({ S });

    // ---------------------------------------------------------- interaction
    let prev = null;
    const onMove = (e) => {
      const [x, y] = toUnits(e.clientX, e.clientY);
      const now = performance.now();
      if (prev && now - prev.t < 120) {
        const dt = Math.max(8, now - prev.t) / 1000, vx = (x - prev.x) / dt, vy = (y - prev.y) / dt;
        for (const l of layers.spin) {
          if (l.id === 'ring') continue;
          const dx = x - l.cx, dy = y - l.cy, r = Math.hypot(dx, dy), reach = l.half * 1.5;
          if (r > reach || r < 4) continue;
          const tangential = (dx * vy - dy * vx) / r;                 // + clockwise on screen
          const e2 = extra.get(l.id);
          e2.vel = clamp(e2.vel + (tangential / Math.max(r, 40)) * 0.05 * (1 - r / reach), -3, 3);
        }
        lastInput = now;
      }
      prev = { x, y, t: now };
      const hit = hitTest(x, y);
      el.style.cursor = hit ? 'pointer' : '';
    };
    const hitTest = (x, y) => {
      if (Math.hypot(x - MOON.x, y - MOON.y) < MOON.halo * 0.8) return { moon: true };
      const i = STARS.findIndex((st) => Math.hypot(x - st.x, y - st.y) < st.r * 1.25);
      return i >= 0 ? { star: i } : null;
    };
    const onClick = (e) => {
      if (e.target !== top) return;
      const hit = hitTest(...toUnits(e.clientX, e.clientY));
      if (!hit) return;
      if (hit.moon) moonPulse = performance.now();
      else flares.set(hit.star, performance.now());
      lastInput = performance.now();
    };
    let lastScroll = window.scrollY;
    const onScroll = () => {
      const dy = window.scrollY - lastScroll;
      lastScroll = window.scrollY;
      for (const [id, e2] of extra) e2.vel = clamp(e2.vel + dy * (id === 'coil' ? 0.0016 : 0.0022), -3, 3);
      lastInput = performance.now();
    };

    const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) start(); else stop(); });
    io.observe(el);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    const onVis = () => { if (document.hidden) stop(); else start(); };
    document.addEventListener('visibilitychange', onVis);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('click', onClick);
    if (!reduce) window.addEventListener('scroll', onScroll, { passive: true });
    measure();

    return () => {
      stop();
      worker.terminate();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('click', onClick);
      window.removeEventListener('scroll', onScroll);
      for (const list of [layers.spin, layers.star, layers.flare, layers.window, layers.cypress]) for (const l of list) l?.bitmap?.close?.();
      for (const l of [layers.main, layers.halo, layers.moon]) l?.bitmap?.close?.();
    };
  }, []);

  return (
    <div ref={wrap} className={`${s.wrap} ${className ?? ''}`}>
      <div className={s.underpainting} aria-hidden="true" />
      <canvas ref={baseCv} className={s.canvas} aria-hidden="true" />
      <canvas ref={topCv} className={s.canvas} aria-hidden="true" />
    </div>
  );
}
