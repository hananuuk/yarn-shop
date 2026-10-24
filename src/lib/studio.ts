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
    ctx.fillStyle = heavy ? "rgba(58,36,23,.5)" : "rgba(58,36,23,.16)";
    ctx.fillRect(Math.min(x * cell, w * cell - 1), 0, 1, h * cell);
  }
  for (let y = 0; y <= h; y++) {
    const heavy = (h - y) % 10 === 0;
    ctx.fillStyle = heavy ? "rgba(58,36,23,.5)" : "rgba(58,36,23,.16)";
    ctx.fillRect(0, Math.min(y * cell, h * cell - 1), w * cell, 1);
  }
  // Numbers: rows on the right, stitches along the bottom.
  ctx.fillStyle = "#6E5646";
  ctx.font = `${Math.max(9, Math.min(12, cell * 0.7))}px Lora, Georgia, serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const step = cell < 10 ? 10 : 5;
  for (let r = 1; r <= h; r++) if (r === 1 || r % step === 0) ctx.fillText(String(r), w * cell + 4, (h - r) * cell + cell / 2);
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (let s = 1; s <= w; s++) if (s === 1 || s % step === 0) ctx.fillText(String(s), (w - s) * cell + cell / 2, h * cell + 4);
}

// Knitted fabric: each stitch is a "V" of two leaning legs, shaded, with slight
// heather variation and coloured flecks for tweed yarns.
export function drawKnit(
  ctx: CanvasRenderingContext2D, ch: Chart, colours: string[], tweed: boolean[],
  tilesX: number, tilesY: number, sw: number, sh: number,
) {
  const { width: w, height: h, cells } = ch;
  const cols = w * tilesX, rows = h * tilesY;
  const rgb = colours.map(hexToRgb);
  ctx.fillStyle = css(mix(rgb[0] ?? WHITE, BLACK, 0.55));
  ctx.fillRect(0, 0, cols * sw, rows * sh);
  for (let ry = 0; ry < rows; ry++) {
    for (let cx = 0; cx < cols; cx++) {
      const idx = cells[(ry % h) * w + (cx % w)];
      const base = rgb[idx] ?? WHITE;
      const seed = ry * 7919 + cx;
      const jitter = (rand(seed) - 0.5) * 0.12;
      const col = jitter > 0 ? mix(base, WHITE, jitter) : mix(base, BLACK, -jitter);
      const x0 = cx * sw, y0 = ry * sh;
      for (const leg of [-1, 1]) {
        ctx.save();
        ctx.translate(x0 + sw / 2 + leg * sw * 0.22, y0 + sh * 0.5);
        ctx.rotate(leg * 0.52);
        const g = ctx.createLinearGradient(-sw * 0.26, 0, sw * 0.26, 0);
        g.addColorStop(0, css(mix(col, BLACK, 0.32)));
        g.addColorStop(0.45, css(mix(col, WHITE, 0.14)));
        g.addColorStop(1, css(mix(col, BLACK, 0.22)));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(0, 0, sw * 0.27, sh * 0.64, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      if (tweed[idx] && rand(seed + 1e6) < 0.09) {
        ctx.fillStyle = css(FLECKS[Math.floor(rand(seed + 2e6) * FLECKS.length)]);
        ctx.beginPath();
        ctx.arc(x0 + sw * (0.25 + rand(seed + 3e6) * 0.5), y0 + sh * (0.3 + rand(seed + 4e6) * 0.4), Math.max(0.8, sw * 0.07), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
