// Stitch Studio: pure chart logic and drawing. Runs in the browser; no server imports.

export const MIN_SIZE = 4;
export const MAX_SIZE = 120;
export const MAX_COLOURS = 6;

export type Chart = { width: number; height: number; cells: Uint8Array }; // row-major, row 0 = top

// A shop yarn as the studio sees it (built on the server by listStudioYarns).
export type StudioYarn = {
  id: number; slug: string; line: string; colour: string; hex: string;
  lengthM: number | null; gaugeStitches: number | null; gaugeRows: number | null;
  needle: string; price: number; stock: number; tweed: boolean;
};

// Relative brightness 0..1, used to pick a light main colour and a dark contrast.
export function luminance(hex: string) {
  const [r, g, b] = hexToRgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

export const clampSize = (n: number) => Math.max(MIN_SIZE, Math.min(MAX_SIZE, Math.round(n) || MIN_SIZE));

export function encodeCells(c: Uint8Array) {
  let s = "";
  for (let i = 0; i < c.length; i++) s += c[i];
  return s;
}

export function decodeCells(s: string, width: number, height: number) {
  const out = new Uint8Array(width * height);
  for (let i = 0; i < out.length && i < s.length; i++) out[i] = Math.min(MAX_COLOURS - 1, s.charCodeAt(i) - 48) || 0;
  return out;
}

// ---------- Starter templates ----------
export type TemplateKind = "blank" | "ulzii" | "diamonds" | "zigzag";

export function makeTemplate(kind: TemplateKind): Chart {
  if (kind === "ulzii") {
    // Ölzii (endless knot): a woven lattice inside a diamond, with a second colour at the heart.
    const w = 23, h = 23, c = 11, cells = new Uint8Array(w * h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const d = Math.abs(x - c) + Math.abs(y - c);
        const lattice = (x + y) % 4 === 2 || (x - y + 44) % 4 === 0;
        if (d === 10) cells[y * w + x] = 1;
        else if (d <= 8 && lattice) cells[y * w + x] = d <= 2 ? 2 : 1;
      }
    return { width: w, height: h, cells };
  }
  if (kind === "diamonds") {
    const w = 12, h = 12, cells = new Uint8Array(w * h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const d = Math.abs(2 * x - 11) + Math.abs(2 * y - 11);
        if (d === 10) cells[y * w + x] = 1;
        else if (d <= 2) cells[y * w + x] = 2;
      }
    return { width: w, height: h, cells };
  }
  if (kind === "zigzag") {
    const w = 10, h = 12, cells = new Uint8Array(w * h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const z = Math.abs(x - 5);
        if (y === z + 1) cells[y * w + x] = 1;
        else if (y === z + 6) cells[y * w + x] = 2;
      }
    return { width: w, height: h, cells };
  }
  return { width: 24, height: 20, cells: new Uint8Array(24 * 20) };
}

// ---------- Edits ----------
export function resize(ch: Chart, width: number, height: number): Chart {
  const cells = new Uint8Array(width * height);
  // Keep the bottom-right corner fixed: knitting charts are read from there.
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const sx = ch.width - width + x, sy = ch.height - height + y;
      if (sx >= 0 && sy >= 0 && sx < ch.width && sy < ch.height) cells[y * width + x] = ch.cells[sy * ch.width + sx];
    }
  return { width, height, cells };
}

export function flipH(ch: Chart): Uint8Array {
  const out = new Uint8Array(ch.cells.length);
  for (let y = 0; y < ch.height; y++) for (let x = 0; x < ch.width; x++) out[y * ch.width + x] = ch.cells[y * ch.width + (ch.width - 1 - x)];
  return out;
}

export function flipV(ch: Chart): Uint8Array {
  const out = new Uint8Array(ch.cells.length);
  for (let y = 0; y < ch.height; y++) for (let x = 0; x < ch.width; x++) out[y * ch.width + x] = ch.cells[(ch.height - 1 - y) * ch.width + x];
  return out;
}

// Shift with wrap-around (moves a motif inside its repeat).
export function shift(ch: Chart, dx: number, dy: number): Uint8Array {
  const out = new Uint8Array(ch.cells.length);
  const { width: w, height: h } = ch;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) out[((y + dy + h) % h) * w + ((x + dx + w) % w)] = ch.cells[y * w + x];
  return out;
}

export function floodFill(ch: Chart, x: number, y: number, colour: number): Uint8Array {
  const out = ch.cells.slice();
  const { width: w, height: h } = ch;
  const target = out[y * w + x];
  if (target === colour) return out;
  const stack = [y * w + x];
  while (stack.length) {
    const i = stack.pop()!;
    if (out[i] !== target) continue;
    out[i] = colour;
    const cx = i % w, cy = (i / w) | 0;
    if (cx > 0) stack.push(i - 1);
    if (cx < w - 1) stack.push(i + 1);
    if (cy > 0) stack.push(i - w);
    if (cy < h - 1) stack.push(i + w);
  }
  return out;
}

// ---------- Yarn estimate ----------
export type Gauge = { stitches: number; rows: number }; // per 10 cm
export const DEFAULT_GAUGE: Gauge = { stitches: 22, rows: 30 };

// Yarn in one knit stitch is roughly 3.4 stitch-widths. Stranded colourwork also carries
// every colour that appears in a row across that row (floats), which we count separately.
const YARN_PER_STITCH_WIDTHS = 3.4;
const SPARE = 1.1;

export function estimateMetres(ch: Chart, colours: number, gauge: Gauge, widthCm: number, heightCm: number): number[] {
  const { width: w, height: h, cells } = ch;
  const stitchCm = 10 / gauge.stitches;
  const totalStitches = Math.max(0, (widthCm * gauge.stitches) / 10) * Math.max(0, (heightCm * gauge.rows) / 10);
  const chartStitches = w * h;
  if (!chartStitches || !totalStitches) return new Array(colours).fill(0);

  // Per chart repeat: knitted stitches per colour, plus float length per colour.
  const knit = new Array(colours).fill(0);
  const floatCm = new Array(colours).fill(0);
  for (let y = 0; y < h; y++) {
    const count = new Array(colours).fill(0);
    for (let x = 0; x < w; x++) count[cells[y * w + x]]++;
    for (let c = 0; c < colours; c++) {
      knit[c] += count[c];
      if (count[c] > 0 && count[c] < w) floatCm[c] += (w - count[c]) * stitchCm;
    }
  }
  const repeats = totalStitches / chartStitches;
  return knit.map((k, c) => ((k * YARN_PER_STITCH_WIDTHS * stitchCm + floatCm[c]) * repeats * SPARE) / 100);
}

// ---------- Drawing ----------
type RGB = [number, number, number];

export function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const css = (c: RGB) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
const WHITE: RGB = [255, 255, 255];
const BLACK: RGB = [0, 0, 0];
const FLECKS: RGB[] = [[196, 84, 52], [236, 222, 196], [64, 120, 132], [201, 150, 46], [120, 92, 150]];

// Small deterministic random so the preview doesn't shimmer between redraws.
function rand(i: number) {
  let x = (i ^ 0x9e3779b9) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

export function drawChart(
  ctx: CanvasRenderingContext2D, ch: Chart, colours: string[], cell: number, gutterR: number, gutterB: number,
) {
  const { width: w, height: h, cells } = ch;
  ctx.clearRect(0, 0, w * cell + gutterR, h * cell + gutterB);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      ctx.fillStyle = colours[cells[y * w + x]] ?? "#fff";
      ctx.fillRect(x * cell, y * cell, cell, cell);
    }
  // Grid. Heavy line every 10 stitches/rows, counted from the bottom-right like a printed chart.
  for (let x = 0; x <= w; x++) {
    const heavy = (w - x) % 10 === 0;
    ctx.fillStyle = heavy ? "rgba(20,20,20,.45)" : "rgba(20,20,20,.14)";
    ctx.fillRect(Math.min(x * cell, w * cell - 1), 0, 1, h * cell);
  }
  for (let y = 0; y <= h; y++) {
    const heavy = (h - y) % 10 === 0;
    ctx.fillStyle = heavy ? "rgba(20,20,20,.45)" : "rgba(20,20,20,.14)";
    ctx.fillRect(0, Math.min(y * cell, h * cell - 1), w * cell, 1);
  }
  // Numbers: rows on the right, stitches along the bottom.
  ctx.fillStyle = "#6B6B6B";
  ctx.font = `${Math.max(9, Math.min(12, cell * 0.7))}px Manrope, system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const step = cell < 10 ? 10 : 5;
  for (let r = 1; r <= h; r++) if (r === 1 || r % step === 0) ctx.fillText(String(r), w * cell + 4, (h - r) * cell + cell / 2);
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (let s = 1; s <= w; s++) if (s === 1 || s % step === 0) ctx.fillText(String(s), (w - s) * cell + cell / 2, h * cell + 4);
}

// Knitted fabric (stockinette). Each stitch is a "V" of two plump, leaning legs.
// A leg is drawn once per colour (and a few brightness variants) into a small
// sprite with shading, fibre strands, a fuzzy halo and a soft shadow, then stamped
// for every stitch. Rows are stamped top to bottom so each row's legs tuck over the
// tips of the row above, the way real knitting interlocks. Draws `cols` × `rows`
// stitches, repeating the chart as needed, anchored bottom-right like the chart.
const VARIANTS = 4;

type Sprite = { img: HTMLCanvasElement; ox: number; oy: number; w: number; h: number };

function legPath(ctx: CanvasRenderingContext2D, hw: number, a: number) {
  // Teardrop: round, plump top; tapering bottom tip.
  ctx.beginPath();
  ctx.moveTo(0, a);
  ctx.bezierCurveTo(-hw * 1.15, a * 0.35, -hw * 1.2, -a * 0.95, 0, -a);
  ctx.bezierCurveTo(hw * 1.2, -a * 0.95, hw * 1.15, a * 0.35, 0, a);
  ctx.closePath();
}

function makeStitchSprite(base: RGB, sw: number, sh: number, scale: number, variant: number): Sprite {
  const padX = sw * 0.45, padY = sh * 0.9;
  const w = sw + padX * 2, h = sh + padY * 2;
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w * scale));
  c.height = Math.max(1, Math.ceil(h * scale));
  const g = c.getContext("2d")!;
  g.scale(scale, scale);
  const shade = (variant - (VARIANTS - 1) / 2) * 0.035;
  const col = shade > 0 ? mix(base, WHITE, shade) : mix(base, BLACK, -shade);
  const hw = sw * 0.27;          // half-width of one leg
  const a = sh * 0.78;            // half-length of one leg (legs overlap the next row)
  const fine = sw >= 9;           // fibre detail only when stitches are big enough to see it
  const cx = padX + sw / 2, cy = padY + sh / 2;

  for (const leg of [-1, 1]) {
    g.save();
    g.translate(cx + leg * sw * 0.215, cy - sh * 0.02);
    g.rotate(leg * 0.4);

    // Soft shadow onto the stitch below / the valley between columns.
    g.save();
    g.shadowColor = "rgba(0,0,0,0.45)";
    g.shadowBlur = Math.max(1, sw * 0.12) * scale;
    g.shadowOffsetY = sh * 0.07 * scale;
    legPath(g, hw, a);
    g.fillStyle = css(mix(col, BLACK, 0.25));
    g.fill();
    g.restore();

    // Body: rounded, lit from the upper left, darker where it curves away.
    const body = g.createRadialGradient(-hw * 0.25, -a * 0.35, hw * 0.1, 0, 0, a * 1.05);
    body.addColorStop(0, css(mix(col, WHITE, 0.2)));
    body.addColorStop(0.45, css(col));
    body.addColorStop(0.8, css(mix(col, BLACK, 0.22)));
    body.addColorStop(1, css(mix(col, BLACK, 0.45)));
    legPath(g, hw, a);
    g.fillStyle = body;
    g.fill();

    // Along the leg: the bottom tip dives under the next stitch.
    const along = g.createLinearGradient(0, -a, 0, a);
    along.addColorStop(0, "rgba(255,255,255,0.06)");
    along.addColorStop(0.5, "rgba(255,255,255,0)");
    along.addColorStop(0.85, "rgba(0,0,0,0.12)");
    along.addColorStop(1, "rgba(0,0,0,0.35)");
    g.fillStyle = along;
    g.fill();

    // Fibres: many short soft strokes running along the leg, clipped to it.
    if (fine) {
      g.save();
      legPath(g, hw, a);
      g.clip();
      g.lineCap = "round";
      const n = Math.round(sw * 3.2);
      for (let k = 0; k < n; k++) {
        const seed = variant * 7717 + k * 131 + (leg > 0 ? 40000 : 0);
        const px = (rand(seed) * 2 - 1) * hw * 0.95;
        const py = (rand(seed + 1) * 2 - 1) * a * 0.95;
        const ang = (rand(seed + 2) - 0.5) * 0.5 + px / hw * 0.25; // fan out slightly, like a twisted yarn
        const len = a * (0.18 + rand(seed + 3) * 0.4);
        const dx = Math.sin(ang) * len, dy = Math.cos(ang) * len;
        g.beginPath();
        g.moveTo(px - dx / 2, py - dy / 2);
        g.quadraticCurveTo(px + dy * 0.08, py, px + dx / 2, py + dy / 2);
        g.lineWidth = Math.max(0.3, sw * (0.01 + rand(seed + 4) * 0.018));
        const light = rand(seed + 5) < 0.72;
        g.strokeStyle = light ? `rgba(255,255,255,${0.06 + rand(seed + 6) * 0.14})` : `rgba(0,0,0,${0.05 + rand(seed + 6) * 0.08})`;
        g.stroke();
      }
      g.restore();
    }

    // Fuzzy halo: short stray fibres around the edge.
    if (fine) {
      g.lineCap = "round";
      const n = Math.round(10 + sw * 0.3);
      for (let k = 0; k < n; k++) {
        const t = rand(variant * 313 + k * 7 + (leg > 0 ? 900 : 0));
        const side = k % 2 ? 1 : -1;
        const y = (t * 1.6 - 0.8) * a;
        const x = side * hw * (0.95 - Math.abs(y / a) * 0.35);
        const len = sw * (0.03 + rand(k * 13 + variant) * 0.06);
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + side * len, y - len * (0.4 + t * 0.6));
        g.lineWidth = Math.max(0.3, sw * 0.012);
        g.strokeStyle = css(mix(col, WHITE, 0.25)).replace("rgb", "rgba").replace(")", ",0.22)");
        g.stroke();
      }
    }
    g.restore();
  }
  return { img: c, ox: cx, oy: cy, w, h };
}

export function drawKnit(
  ctx: CanvasRenderingContext2D, ch: Chart, colours: string[], tweed: boolean[],
  cols: number, rows: number, sw: number, sh: number, areaW = cols * sw, areaH = rows * sh, scale = 1,
) {
  const { width: w, height: h, cells } = ch;
  const offX = areaW - cols * sw, offY = areaH - rows * sh;
  const rgb = colours.map(hexToRgb);
  const sprites = rgb.map((c) => Array.from({ length: VARIANTS }, (_, v) => makeStitchSprite(c, sw, sh, scale, v)));
  const colourAt = (cx: number, ry: number) => cells[(h - 1 - ((rows - 1 - ry) % h)) * w + (w - 1 - ((cols - 1 - cx) % w))];

  // Valleys: the deep shadow between legs, in each stitch's own colour.
  ctx.fillStyle = css(mix(rgb[0] ?? WHITE, BLACK, 0.6));
  ctx.fillRect(0, 0, areaW, areaH);
  for (let ry = 0; ry < rows; ry++)
    for (let cx = 0; cx < cols; cx++) {
      ctx.fillStyle = css(mix(rgb[colourAt(cx, ry)] ?? WHITE, BLACK, 0.6));
      const x = Math.floor(offX + cx * sw), y = Math.floor(offY + ry * sh);
      ctx.fillRect(x, y, Math.ceil(offX + (cx + 1) * sw) - x, Math.ceil(offY + (ry + 1) * sh) - y);
    }

  // Legs, one row at a time, top to bottom (the extra row above fills the top edge).
  for (let ry = -1; ry < rows; ry++) {
    for (let cx = 0; cx < cols; cx++) {
      const idx = colourAt(cx, ry);
      const seed = (ry + 1) * 7919 + cx;
      const sp = sprites[idx]?.[Math.floor(rand(seed) * VARIANTS)];
      if (!sp) continue;
      const jx = (rand(seed + 5e5) - 0.5) * sw * 0.04, jy = (rand(seed + 6e5) - 0.5) * sh * 0.04;
      const x0 = offX + cx * sw, y0 = offY + ry * sh;
      ctx.drawImage(sp.img, x0 + sw / 2 - sp.ox + jx, y0 + sh / 2 - sp.oy + jy, sp.w, sp.h);
      if (tweed[idx] && rand(seed + 1e6) < 0.09) {
        ctx.fillStyle = css(FLECKS[Math.floor(rand(seed + 2e6) * FLECKS.length)]);
        ctx.beginPath();
        ctx.arc(x0 + sw * (0.25 + rand(seed + 3e6) * 0.5), y0 + sh * (0.3 + rand(seed + 4e6) * 0.4), Math.max(0.8, sw * 0.05), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Gentle overall light falloff so the swatch reads as fabric, not a flat print.
  const v = ctx.createRadialGradient(areaW * 0.4, areaH * 0.35, Math.min(areaW, areaH) * 0.2, areaW / 2, areaH / 2, Math.max(areaW, areaH) * 0.8);
  v.addColorStop(0, "rgba(255,255,255,0.04)");
  v.addColorStop(1, "rgba(0,0,0,0.12)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, areaW, areaH);
}
