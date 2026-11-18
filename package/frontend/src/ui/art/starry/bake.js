// Bake every layer of the home-page Starry Night at S px/unit.
// Returns [{ id, kind, ...placement, canvas }]: one static picture plus the small layers that move.
import { Painter, litCanvas, vnoise, smoothstep } from './engine.js';
import {
  W, H, C0, COIL_R, COIL_F, RING_R0, RING_R1, RING_F, SMALL, MOON, STARS, CYP_REG,
} from './composition.js';
import {
  weaveTiles, paintGround, paintSky, paintHills, paintVillage, paintField, paintCoil, paintRing, paintStar,
  paintFlare, paintMoonHalo, paintCrescent, buildCypress, paintCypress, windowGroup,
} from './paint.js';

/** Sway phases of the cypress frames (a closed loop). */
export const CYPRESS_FRAMES = 8;

export function bakeStarry(S, onLayer) {
  const emit = (layer) => { onLayer(layer); };

  // ---- the static picture
  const P = new Painter(S, 0, 0, W, H);
  P.thin = (x, y) => smoothstep(0.62, 0.8, vnoise(x / 70 + 3.1, y / 55, 33)) * (y < 430 ? 0.75 : 0.85);
  paintGround(P, weaveTiles(S));
  paintSky(P);
  paintHills(P);
  paintVillage(P);
  paintField(P);
  emit({ id: 'main', kind: 'main', x: 0, y: 0, w: W, h: H, canvas: litCanvas(P, { relief: 0.022 }) });

  // ---- discs that turn (whole-dash discs with ragged edges, so no disc edge is visible)
  const disc = (rad, paint) => {
    const D = new Painter(S, -rad, -rad, rad * 2, rad * 2);
    D.clear(); paint(D);
    return litCanvas(D, { relief: 0.02 });
  };
  const ringPad = RING_F + 10, coilPad = COIL_F + 10;
  emit({ id: 'ring', kind: 'spin', cx: C0.x, cy: C0.y, half: ringPad, rate: 0.5, canvas: disc(ringPad, (D) => paintRing(D, 'ring', RING_R0, RING_R1, RING_F)) });
  emit({ id: 'coil', kind: 'spin', cx: C0.x, cy: C0.y, half: coilPad, rate: 1, canvas: disc(coilPad, (D) => paintCoil(D, 'coil', COIL_R, COIL_F, 72, 1)) });
  SMALL.forEach((sm, k) => {
    const pad = sm.f + 8;
    emit({ id: `small${k}`, kind: 'spin', cx: sm.x, cy: sm.y, half: pad, rate: -sm.k, canvas: disc(pad, (D) => paintCoil(D, 'small' + k, sm.r, sm.f, sm.lam, -1)) });
  });
  emit({ id: 'moonHalo', kind: 'halo', cx: MOON.x, cy: MOON.y, half: MOON.halo + 8, rate: 0.15, canvas: disc(MOON.halo + 8, (D) => paintMoonHalo(D)) });
  emit({ id: 'crescent', kind: 'moon', cx: MOON.x, cy: MOON.y, half: MOON.r + 6, rate: 0, canvas: disc(MOON.r + 6, (D) => paintCrescent(D)) });
  STARS.forEach((st, k) => {
    emit({ id: `star${k}`, kind: 'star', index: k, cx: st.x, cy: st.y, r: st.r, half: st.R, rate: 0.3 * st.dir, phase: k * 0.7, canvas: disc(st.R, (D) => paintStar(D, st)) });
  });
  STARS.forEach((st, k) => {
    emit({ id: `flare${k}`, kind: 'flare', index: k, cx: st.x, cy: st.y, half: st.F, rate: -0.4 * st.dir, phase: k, canvas: disc(st.F, (D) => paintFlare(D, st)) });
  });

  // ---- village windows that light up, group by group
  [1, 2, 3].forEach((g) => {
    const wg = windowGroup(S, g);
    emit({ id: `win${g}`, kind: 'window', group: g, x: wg.x0, y: wg.y0, w: wg.w, h: wg.h, canvas: litCanvas(wg.painter, { relief: 0.02 }) });
  });

  // ---- the cypress: a short loop of sway frames (cross-faded on screen)
  const list = buildCypress();
  const Pc = new Painter(S, CYP_REG.x0, CYP_REG.y0, CYP_REG.w, CYP_REG.h);
  for (let f = 0; f < CYPRESS_FRAMES; f++) {
    Pc.clear();
    paintCypress(Pc, list, (f / CYPRESS_FRAMES) * Math.PI * 2);
    emit({ id: `cypress${f}`, kind: 'cypress', frame: f, x: CYP_REG.x0, y: CYP_REG.y0, w: CYP_REG.w, h: CYP_REG.h, canvas: litCanvas(Pc, { relief: 0.022 }) });
  }
}

export const STAGE = { W, H };
