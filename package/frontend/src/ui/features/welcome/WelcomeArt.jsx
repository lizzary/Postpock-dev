// The night window on the left of the first-run dialog: a slice of sky in the painting's palette, a line drawing
// for each step (drawn in when the step opens), and the setup's progress as a small constellation.
import s from './Welcome.module.css';

const CREAM = '#f6f0de';
const STAR = '#f1d35a';
const MOON = '#e8b84e';

/** A spiral stroke, like the sky of the home painting. */
function swirl(cx, cy, r, turns, squash = 0.86) {
  const pts = [];
  for (let i = 0; i <= 80; i++) {
    const t = i / 80, a = t * turns * Math.PI * 2, rr = r * t;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)} ${(cy + rr * Math.sin(a) * squash).toFixed(1)}`);
  }
  return `M${pts.join('L')}`;
}
const SKY = [
  { d: swirl(250, 92, 70, 2.4), w: 7, c: '#7fa9c8', o: 0.28 },
  { d: swirl(250, 92, 52, 2.2), w: 4, c: '#e7eedc', o: 0.22 },
  { d: swirl(54, 236, 46, 2.1), w: 5, c: '#7fa9c8', o: 0.2 },
];
const DOTS = [[34, 54, 1.6], [120, 30, 1.2], [300, 186, 1.4], [76, 132, 1], [178, 74, 1.3], [292, 310, 1.1], [26, 360, 1.3], [210, 388, 1], [140, 440, 1.2]];

export function WelcomeArt({ step, total }) {
  return (
    <div className={s.art} aria-hidden="true">
      <svg className={s.sky} viewBox="0 0 340 600" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="ppw-glow" cx="0.74" cy="0.16" r="0.5">
            <stop offset="0" stopColor="#f4d77a" stopOpacity="0.32" />
            <stop offset="1" stopColor="#f4d77a" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="340" height="600" fill="url(#ppw-glow)" />
        <g className={s.swirls}>
          {SKY.map((p, i) => <path key={i} d={p.d} fill="none" stroke={p.c} strokeWidth={p.w} strokeLinecap="round" opacity={p.o} />)}
        </g>
        {DOTS.map(([x, y, r], i) => <circle key={i} className={s.twinkle} style={{ '--d': `${(i * 0.53) % 3}s` }} cx={x} cy={y} r={r} fill={CREAM} />)}
      </svg>
      <div className={s.scene} key={step}>
        <svg viewBox="0 0 300 300" className={s.drawing}>{SCENES[step]?.()}</svg>
      </div>
      <Constellation step={step} total={total} />
    </div>
  );
}

const line = { fill: 'none', stroke: CREAM, strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round', pathLength: 1 };
const Draw = ({ d, delay = 0, ...rest }) => <path d={d} {...line} className={s.draw} style={{ '--delay': `${delay}ms` }} {...rest} />;
const Star = ({ x, y, r = 6, delay = 0 }) => (
  <path className={s.pop} style={{ '--delay': `${delay}ms`, transformOrigin: `${x}px ${y}px` }} fill={STAR}
    d={`M${x} ${y - r}c${r * 0.08} ${r * 0.62} ${r * 0.3} ${r * 0.84} ${r} ${r}c${-r * 0.7} ${r * 0.16} ${-r * 0.92} ${r * 0.38} ${-r} ${r}c${-r * 0.08} ${-r * 0.62} ${-r * 0.3} ${-r * 0.84} ${-r} ${-r}c${r * 0.7} ${-r * 0.16} ${r * 0.92} ${-r * 0.38} ${r} ${-r}Z`} />
);
const Moon = ({ x, y, r = 16, delay = 0 }) => (
  <path className={s.pop} style={{ '--delay': `${delay}ms`, transformOrigin: `${x}px ${y}px` }} fill={MOON}
    d={`M${x} ${y - r}a${r} ${r} 0 1 0 ${r * 0.82} ${r * 1.6} ${r * 0.8} ${r * 0.8} 0 1 1 ${-r * 0.82} ${-r * 1.6}Z`} />
);

const SCENES = [
  // welcome: the pocket that keeps the moon, and little framed works falling into it
  () => (
    <>
      <Moon x={176} y={66} r={22} delay={500} />
      <Draw d="M72 140h156v44a78 78 0 0 1-156 0Z" />
      <path d="M90 162h120" fill="none" stroke={CREAM} strokeWidth="1.6" strokeDasharray="3 7" strokeLinecap="round" opacity=".7" className={s.fade} style={{ '--delay': '700ms' }} />
      <g className={s.fall} style={{ '--delay': '900ms' }}><rect x="98" y="88" width="30" height="24" rx="2" {...line} transform="rotate(-12 113 100)" /></g>
      <g className={s.fall} style={{ '--delay': '1150ms' }}><rect x="190" y="104" width="24" height="19" rx="2" {...line} transform="rotate(10 202 113)" /></g>
      <Star x={240} y={58} r={6} delay={1300} />
      <Star x={62} y={92} r={4} delay={1450} />
    </>
  ),
  // password: an arched gallery door, its keyhole lit
  () => (
    <>
      <Moon x={214} y={62} r={16} delay={600} />
      <Draw d="M100 244V136a50 50 0 0 1 100 0v108" />
      <Draw d="M116 244V142a34 34 0 0 1 68 0v102" delay={200} />
      <Draw d="M70 244h160" delay={350} />
      <circle cx="150" cy="186" r="7.5" fill={STAR} className={s.pop} style={{ '--delay': '900ms', transformOrigin: '150px 190px' }} />
      <path d="M146.5 190h7l-1.8 15h-3.4Z" fill={STAR} className={s.pop} style={{ '--delay': '900ms', transformOrigin: '150px 190px' }} />
      <circle cx="150" cy="190" r="26" fill={STAR} opacity=".12" className={s.glow} />
      <Star x={74} y={88} r={5} delay={1100} />
    </>
  ),
  // server mode: the computer and a phone, the light carried between them by a row of stars
  () => (
    <>
      <Draw d="M50 150h104a6 6 0 0 1 6 6v58H44v-58a6 6 0 0 1 6-6Z" />
      <Draw d="M30 224h144l-8 10H38Z" delay={150} />
      <Draw d="M210 140h40a9 9 0 0 1 9 9v84a9 9 0 0 1-9 9h-40a9 9 0 0 1-9-9v-84a9 9 0 0 1 9-9Z" delay={250} />
      <Draw d="M222 230h16" delay={400} />
      <path d="M104 140C122 72 196 66 230 132" fill="none" stroke={STAR} strokeWidth="3.2" strokeLinecap="round" strokeDasharray="0.1 13" className={s.travel} />
      <Star x={168} y={84} r={6} delay={900} />
      <Moon x={66} y={70} r={14} delay={700} />
    </>
  ),
  // MCP: a key with a star for a bow, reaching only the works it is allowed to
  () => (
    <>
      <Draw d="M96 126a28 28 0 1 1 0 48a28 28 0 1 1 0-48Z" />
      <Star x={96} y={150} r={9} delay={700} />
      <Draw d="M124 150h76" delay={200} />
      <Draw d="M180 150v14M194 150v10" delay={350} />
      <path d="M200 150 236 104M200 150l42 32M200 150l14 64" fill="none" stroke={CREAM} strokeWidth="1.2" strokeDasharray="2 5" opacity=".6" className={s.fade} style={{ '--delay': '800ms' }} />
      <rect x="228" y="84" width="30" height="24" rx="2" {...line} className={s.draw} style={{ '--delay': '900ms' }} />
      <rect x="238" y="172" width="30" height="24" rx="2" {...line} className={s.draw} style={{ '--delay': '1000ms' }} />
      <rect x="200" y="210" width="30" height="24" rx="2" {...line} className={s.draw} style={{ '--delay': '1100ms' }} opacity=".45" />
      <Star x={60} y={84} r={4} delay={1200} />
    </>
  ),
  // done: the wall, the rail, the works hung, the moon up
  () => (
    <>
      <Moon x={222} y={56} r={20} delay={800} />
      <Draw d="M30 126h240" />
      <Draw d="M74 166 92 126l18 40M138 160l14-34 14 34M196 170l18-44 18 44" delay={200} />
      <rect x="62" y="166" width="60" height="46" rx="3" {...line} className={s.draw} style={{ '--delay': '400ms' }} />
      <rect x="128" y="160" width="48" height="60" rx="3" {...line} className={s.draw} style={{ '--delay': '520ms' }} />
      <rect x="184" y="170" width="60" height="44" rx="3" {...line} className={s.draw} style={{ '--delay': '640ms' }} />
      <circle cx="92" cy="189" r="5" fill={STAR} className={s.pop} style={{ '--delay': '1000ms', transformOrigin: '92px 189px' }} />
      <path d="M140 210c8-14 16-20 24-24" fill="none" stroke={STAR} strokeWidth="2.2" strokeLinecap="round" className={s.fade} style={{ '--delay': '1100ms' }} />
      <path d="M194 204l12-12 10 9 10-12 10 15" fill="none" stroke={STAR} strokeWidth="2" strokeLinejoin="round" className={s.fade} style={{ '--delay': '1200ms' }} />
      <Star x={54} y={70} r={5} delay={1300} />
      <Star x={150} y={44} r={3.5} delay={1400} />
    </>
  ),
];

/** Progress as Cassiopeia: one star per step, joined as you go. */
const W = [[14, 22], [66, 50], [116, 24], [166, 54], [218, 16]];
function Constellation({ step, total }) {
  const pts = W.slice(0, total);
  return (
    <svg className={s.constellation} viewBox="0 0 232 70">
      {pts.slice(1).map(([x, y], i) => (
        <line key={i} x1={pts[i][0]} y1={pts[i][1]} x2={x} y2={y} className={s.cLine} data-on={i < step} />
      ))}
      {pts.map(([x, y], i) => (
        <g key={i} className={s.cStar} data-state={i < step ? 'past' : i === step ? 'now' : 'future'} style={{ transformOrigin: `${x}px ${y}px` }}>
          {i === step && <circle cx={x} cy={y} r="11" className={s.cHalo} />}
          <circle cx={x} cy={y} r={i === step ? 4.2 : i < step ? 3.2 : 2.2} />
        </g>
      ))}
    </svg>
  );
}
