// loop's hand-drawn illustration kit. Plain SVG, no client code.
// The look comes from two filters defined once per page (<PaintFilters />):
//   loop-paint  : wobbly edges + pigment granulation, for painted shapes
//   loop-wobble : wobbly edges only, for ink lines
// These are stand-ins drawn in code. Real hand-painted artwork can replace any of them later.

export const PALETTE = {
  ink: "#3A2417",
  paper: "#F6EFDF",
  chartreuse: "#C8D44A",
  yellowGreen: "#A9C23F",
  leaf: "#6E9A3F",
  tomato: "#D9452B",
  coral: "#EE7F62",
  orange: "#C9652E",
  apricot: "#F2B98A",
  lavender: "#B7A6D9",
  powder: "#A8C6DE",
  pink: "#E7A8B3",
  brown: "#6B4027",
  wood: "#C99B5F",
};

export function mixHex(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => [(s >> 16) & 255, (s >> 8) & 255, s & 255];
  const [r1, g1, b1] = ch(pa), [r2, g2, b2] = ch(pb);
  const m = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, "0");
  return `#${m(r1, r2)}${m(g1, g2)}${m(b1, b2)}`;
}

export function PaintFilters() {
  return (
    <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute" }} focusable="false">
      <defs>
        <filter id="loop-wobble" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="4" result="w" />
          <feDisplacementMap in="SourceGraphic" in2="w" scale="3.2" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="loop-paint" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="11" result="warp" />
          <feDisplacementMap in="SourceGraphic" in2="warp" scale="4" xChannelSelector="R" yChannelSelector="G" result="shape" />
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="2" result="grain" />
          <feColorMatrix in="grain" type="matrix" values="0.28 0 0 0 0.74  0.28 0 0 0 0.74  0.28 0 0 0 0.74  0 0 0 0 1" result="grainGrey" />
          <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="8" result="pool" />
          <feColorMatrix in="pool" type="matrix" values="0.35 0 0 0 0.72  0.35 0 0 0 0.72  0.35 0 0 0 0.72  0 0 0 0 1" result="poolGrey" />
          <feBlend in="grainGrey" in2="poolGrey" mode="multiply" result="pigment" />
          <feComposite in="pigment" in2="shape" operator="in" result="pigmentClip" />
          <feBlend in="shape" in2="pigmentClip" mode="multiply" />
        </filter>
      </defs>
    </svg>
  );
}

// ---------- Creatures ----------
type Pattern = "stripes" | "dots" | "bands";

export function Caterpillar({
  x, y, seg = 6, r = 7, rot = 0, body, accent, pattern = "stripes", arch = 0.6, flip = false, asleep = false,
}: {
  x: number; y: number; seg?: number; r?: number; rot?: number; body: string; accent: string;
  pattern?: Pattern; arch?: number; flip?: boolean; asleep?: boolean;
}) {
  const pts = Array.from({ length: seg }, (_, i) => ({
    cx: i * r * 0.92,
    cy: -Math.sin((i / Math.max(1, seg - 1)) * Math.PI) * r * arch,
  }));
  const head = pts[pts.length - 1];
  const ink = PALETTE.ink;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${flip ? -1 : 1} 1)`}>
      <g filter="url(#loop-paint)">
        {pts.slice(0, -1).map((p, i) => (
          i % 2 === 0 ? <circle key={`l${i}`} cx={p.cx} cy={p.cy + r * 1.0} r={r * 0.2} fill={ink} /> : null
        ))}
        {pts.slice(0, -1).map((p, i) => (
          <g key={i}>
            <circle cx={p.cx} cy={p.cy} r={r} fill={body} />
          </g>
        ))}
        {/* one smooth outline round the whole body */}
        <path d={bodyPath(pts, r)} fill="none" stroke={ink} strokeWidth={1.3} strokeLinejoin="round" />
        {pts.slice(0, -1).map((p, i) => (
          <g key={`p${i}`}>
            {pattern === "stripes" && i % 2 === 1 && <path d={`M${p.cx - r * 0.18} ${p.cy - r * 0.95} q ${r * 0.3} ${r * 0.95} 0 ${r * 1.9}`} stroke={accent} strokeWidth={r * 0.42} fill="none" />}
            {pattern === "dots" && i % 2 === 0 && <circle cx={p.cx} cy={p.cy - r * 0.3} r={r * 0.24} fill={accent} />}
            {pattern === "bands" && i % 2 === 1 && <path d={`M${p.cx - r * 0.1} ${p.cy - r * 0.97} q ${r * 0.24} ${r * 0.97} 0 ${r * 1.94}`} stroke={accent} strokeWidth={r * 0.3} fill="none" />}
          </g>
        ))}
        <circle cx={head.cx + r * 0.25} cy={head.cy} r={r * 1.0} fill={mixHex(body, ink, 0.45)} stroke={ink} strokeWidth={1.3} />
      </g>
      {asleep ? (
        <path d={`M${head.cx + r * 0.1} ${head.cy - r * 0.15} q ${r * 0.25} ${r * 0.22} ${r * 0.5} 0`} stroke={PALETTE.paper} strokeWidth={1.2} fill="none" strokeLinecap="round" />
      ) : (
        <circle cx={head.cx + r * 0.55} cy={head.cy - r * 0.2} r={r * 0.2} fill={PALETTE.paper} />
      )}
    </g>
  );
}

// Outline of a chain of overlapping circles: top edge forward, bottom edge back.
function bodyPath(pts: { cx: number; cy: number }[], r: number) {
  const top = pts.map((p) => `${p.cx.toFixed(1)} ${(p.cy - r).toFixed(1)}`);
  const bottom = [...pts].reverse().map((p) => `${p.cx.toFixed(1)} ${(p.cy + r).toFixed(1)}`);
  const first = pts[0], last = pts[pts.length - 1];
  return `M ${top.join(" L ")} A ${r} ${r} 0 0 1 ${last.cx.toFixed(1)} ${(last.cy + r).toFixed(1)} L ${bottom.join(" L ")} A ${r} ${r} 0 0 1 ${first.cx.toFixed(1)} ${(first.cy - r).toFixed(1)} Z`;
}

// Strands wound round a ball: each is a tilted great circle, seen as a rotated ellipse.
const WRAPS = [
  [-32, 0.34], [-28, 0.62], [-36, 0.86], [24, 0.28], [30, 0.55], [20, 0.8], [86, 0.42], [92, 0.7], [-62, 0.5],
] as const;
export function BallWraps({ cx, cy, R, seed = 0, dark, light, width = 2.4 }: { cx: number; cy: number; R: number; seed?: number; dark: string; light: string; width?: number }) {
  const shift = (seed * 13) % 40 - 20;
  return (
    <g fill="none" strokeLinecap="round" filter="url(#loop-wobble)">
      {WRAPS.map(([rot, k], i) => (
        <ellipse key={i} cx={cx} cy={cy} rx={R * 0.99} ry={R * k} transform={`rotate(${rot + shift} ${cx} ${cy})`} stroke={dark} strokeWidth={width} opacity={0.85} />
      ))}
      <ellipse cx={cx} cy={cy} rx={R * 0.92} ry={R * 0.46} transform={`rotate(${-30 + shift} ${cx} ${cy})`} stroke={light} strokeWidth={width * 1.3} strokeDasharray={`${R * 0.9} ${R * 6}`} strokeDashoffset={R * 1.6} opacity={0.9} />
    </g>
  );
}

// A worm leaning out of a hole.
export function PeekingWorm({ x, y, rot = 0, body, accent, s = 1 }: { x: number; y: number; rot?: number; body: string; accent: string; s?: number }) {
  const ink = PALETTE.ink;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <ellipse cx="0" cy="2" rx="11" ry="4.5" fill={ink} filter="url(#loop-wobble)" />
      <g filter="url(#loop-paint)">
        <path d="M0 2 C 0 -10, 2 -20, 12 -24" stroke={ink} strokeWidth="11.5" fill="none" strokeLinecap="round" />
        <path d="M0 2 C 0 -10, 2 -20, 12 -24" stroke={body} strokeWidth="9" fill="none" strokeLinecap="round" />
        <path d="M0 2 C 0 -10, 2 -20, 12 -24" stroke={accent} strokeWidth="9" fill="none" strokeDasharray="2.2 4.5" />
      </g>
      <circle cx="14" cy="-26" r="1.6" fill={ink} />
    </g>
  );
}

// ---------- Logo: a little striped worm curled into a loop ----------
export function LoopMark({ size = 40 }: { size?: number }) {
  const d = "M4 31 C 12 31, 21 27, 22 18 C 23 10, 14 8, 13 14 C 12 21, 22 31, 34 30";
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <g filter="url(#loop-paint)">
        <path d={d} stroke={PALETTE.ink} strokeWidth="8.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d={d} stroke={PALETTE.chartreuse} strokeWidth="5.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d={d} stroke={PALETTE.tomato} strokeWidth="5.8" fill="none" strokeDasharray="1.8 4.4" strokeDashoffset="2" />
        <circle cx="34.6" cy="29.8" r="3.9" fill={PALETTE.brown} stroke={PALETTE.ink} strokeWidth="1.2" />
      </g>
      <circle cx="35.8" cy="28.8" r="1" fill={PALETTE.paper} />
    </svg>
  );
}

// ---------- Yarn ball (product placeholder) ----------
const CREATURE_COLOURS: [string, string, Pattern][] = [
  [PALETTE.lavender, PALETTE.ink, "bands"],
  [PALETTE.apricot, PALETTE.tomato, "stripes"],
  [PALETTE.powder, PALETTE.tomato, "dots"],
  [PALETTE.pink, PALETTE.leaf, "stripes"],
  [PALETTE.chartreuse, PALETTE.brown, "dots"],
];

export function PaintedYarnBall({ hex, alt, seed = 0, className = "" }: { hex: string; alt: string; seed?: number; className?: string }) {
  const ink = PALETTE.ink;
  const dark = mixHex(hex, ink, 0.38);
  const light = mixHex(hex, "#FFFFFF", 0.32);
  const id = `yb-${hex.slice(1)}`;
  const variant = seed % 5; // 0 caterpillar on top · 1 worm in a hole · 3 one on the strand · others empty
  const [body, accent, pattern] = CREATURE_COLOURS[(seed * 7) % CREATURE_COLOURS.length];
  return (
    <svg viewBox="22 18 174 164" role="img" aria-label={alt} className={`h-auto w-[80%] overflow-visible ${className}`}>
      <defs>
        <clipPath id={id}><circle cx="96" cy="100" r="60" /></clipPath>
      </defs>
      <ellipse cx="98" cy="170" rx="54" ry="5" fill={ink} opacity="0.1" filter="url(#loop-wobble)" />
      {/* loose strand curling into a little loop */}
      <path d="M140 136 C 160 150, 150 172, 168 170 C 182 168, 178 152, 168 156 C 160 160, 172 176, 190 172" stroke={ink} strokeWidth="5.2" fill="none" strokeLinecap="round" filter="url(#loop-wobble)" />
      <path d="M140 136 C 160 150, 150 172, 168 170 C 182 168, 178 152, 168 156 C 160 160, 172 176, 190 172" stroke={hex} strokeWidth="3" fill="none" strokeLinecap="round" filter="url(#loop-wobble)" />
      <circle cx="96" cy="100" r="60" fill={hex} stroke={ink} strokeWidth="2" filter="url(#loop-paint)" />
      <g clipPath={`url(#${id})`}>
        <BallWraps cx={96} cy={100} R={60} seed={seed} dark={dark} light={light} width={2.2} />
      </g>
      {variant === 0 && <Caterpillar x={60} y={38} seg={7} r={8} rot={-8} body={body} accent={accent} pattern={pattern} arch={0.45} />}
      {variant === 1 && <PeekingWorm x={134} y={88} rot={16} s={1.25} body={body} accent={accent} />}
      {variant === 3 && <Caterpillar x={146} y={164} seg={6} r={6} rot={-14} body={body} accent={accent} pattern={pattern} arch={0.7} />}
    </svg>
  );
}

// ---------- Fig. 1: an ordinary ball of yarn and its residents ----------
export function YarnBallFigure({ labels }: { labels: [string, string, string, string] }) {
  const ink = PALETTE.ink;
  const ball = PALETTE.chartreuse;
  const dark = mixHex(ball, ink, 0.35);
  const light = mixHex(ball, "#FFFFFF", 0.4);
  const hand = { fontFamily: "var(--font-hand)", fontSize: 21, fill: PALETTE.ink } as const;
  return (
    <svg viewBox="0 0 560 470" role="img" aria-label={labels.join(", ")} className="h-auto w-full overflow-visible">
      <defs>
        <clipPath id="fig1-ball"><circle cx="262" cy="232" r="168" /></clipPath>
      </defs>
      {/* knitting needles */}
      <g filter="url(#loop-paint)">
        <path d="M70 40 L 238 196" stroke={ink} strokeWidth="9" strokeLinecap="round" />
        <path d="M70 40 L 238 196" stroke={PALETTE.wood} strokeWidth="6" strokeLinecap="round" />
        <circle cx="66" cy="36" r="10" fill={PALETTE.tomato} stroke={ink} strokeWidth="1.6" />
        <path d="M150 22 L 262 200" stroke={ink} strokeWidth="9" strokeLinecap="round" />
        <path d="M150 22 L 262 200" stroke={PALETTE.wood} strokeWidth="6" strokeLinecap="round" />
        <circle cx="147" cy="16" r="10" fill={PALETTE.powder} stroke={ink} strokeWidth="1.6" />
      </g>
      {/* trailing strand with a loop, ending in a tidy knot */}
      <g filter="url(#loop-wobble)" fill="none" strokeLinecap="round">
        <path d="M380 340 C 420 380, 390 430, 440 432 C 486 434, 482 392, 452 398 C 424 404, 444 446, 520 444" stroke={ink} strokeWidth="7" />
        <path d="M380 340 C 420 380, 390 430, 440 432 C 486 434, 482 392, 452 398 C 424 404, 444 446, 520 444" stroke={ball} strokeWidth="4.4" />
      </g>
      {/* the ball */}
      <circle cx="262" cy="232" r="168" fill={ball} stroke={ink} strokeWidth="2.6" filter="url(#loop-paint)" />
      <g clipPath="url(#fig1-ball)">
        <BallWraps cx={262} cy={232} R={168} seed={3} dark={dark} light={light} width={3.4} />
      </g>
      {/* a. reading, on top, with a very small book */}
      <Caterpillar x={262} y={74} seg={8} r={15} rot={12} body={PALETTE.lavender} accent={PALETTE.ink} pattern="bands" arch={0.35} />
      <g filter="url(#loop-paint)">
        <path d="M398 96 l 20 -13 l 6 18 l -20 12 z" fill={PALETTE.tomato} stroke={ink} strokeWidth="1.3" />
        <path d="M408 90 l 7 21" stroke={PALETTE.paper} strokeWidth="1" />
      </g>
      {/* b. commuting, round the right side */}
      <Caterpillar x={414} y={158} seg={8} r={14} rot={72} body={PALETTE.apricot} accent={PALETTE.tomato} pattern="stripes" arch={0.55} />
      {/* c. resting, out of a hole on the left */}
      <PeekingWorm x={140} y={272} rot={-24} s={2.4} body={PALETTE.pink} accent={PALETTE.leaf} />
      {/* d. the night shift, pulling the loose end */}
      <Caterpillar x={470} y={428} seg={7} r={11} rot={-6} body={PALETTE.powder} accent={PALETTE.tomato} pattern="dots" arch={0.6} />
      {/* labels, naturalist style */}
      <g stroke={ink} strokeWidth="1" fill="none" filter="url(#loop-wobble)" opacity="0.8">
        <path d="M356 52 L 392 20" />
        <path d="M470 170 L 512 150" />
        <path d="M96 226 L 52 206" />
        <path d="M534 404 L 542 384" />
      </g>
      <text x="396" y="16" style={hand}>a.</text>
      <text x="516" y="150" style={hand}>b.</text>
      <text x="30" y="204" style={hand}>c.</text>
      <text x="538" y="380" style={hand}>d.</text>
    </svg>
  );
}

// A small caterpillar walking along the footer.
export function FooterCaterpillar() {
  return (
    <svg viewBox="0 0 120 40" width="120" height="40" aria-hidden="true" className="overflow-visible">
      <Caterpillar x={12} y={28} seg={9} r={8.5} body={PALETTE.chartreuse} accent={PALETTE.tomato} pattern="stripes" arch={0.9} />
    </svg>
  );
}
