// Stitch Studio → a downloadable knitting pattern (A4 PDF), laid out like a published
// colourwork pattern: title + photo, finished size, materials, gauge, abbreviations,
// how to read the chart, step-by-step instructions, finishing, then the charted repeat
// with a colour/symbol key. Pages are drawn on canvases (so Mongolian text renders with
// the site font) and placed in a PDF with jsPDF. Browser only.

import { drawKnit, luminance, type Chart, type Gauge } from "@/lib/studio";

export type PatternYarn = {
  roles: string[];      // ["MC"] or ["CC1", "CC3"] when one yarn fills several slots
  line: string;         // "Amano Andes"
  colour: string;       // "Natural"
  hex: string;
  needle: string;       // "3.75–4 мм"
  metres: number;
  skeins: number | null;
  skeinM: number | null;
};

export type PatternInput = {
  lang: "mn" | "en";
  name: string;
  chart: Chart;
  colours: string[];    // per palette slot
  tweed: boolean[];
  slotNames: string[];  // colour name per palette slot
  yarns: PatternYarn[];
  gauge: Gauge;
  gaugeYarn: string | null;
  project: { w: number; h: number; label: string | null };
};

// ---------- Text ----------
const T = {
  en: {
    kicker: "Stitch Studio pattern",
    untitled: "Untitled design",
    subtitle: (w: number, h: number, n: number) => `Stranded colourwork · ${w}-stitch × ${h}-row repeat · ${n} colours`,
    size: "Finished size",
    sizeText: (w: string, h: string, label: string | null) => `${w} × ${h} cm${label ? ` (${label})` : ""}`,
    repeat: (w: string, h: string) => `One repeat of the chart: ${w} × ${h} cm`,
    yarn: "Yarn",
    amount: (m: number, k: number | null, len: number | null) => `≈ ${m} m${k ? ` · ${k} ${k === 1 ? "skein" : "skeins"}${len ? ` of ${len} m` : ""}` : ""}`,
    needles: "Needles",
    needlesText: (n: string) => `${n || "Needles to suit the yarn"}, or the size you need to get the gauge. Use a circular needle to knit in the round.`,
    notions: "Notions",
    notionsText: "Stitch markers, tapestry needle.",
    gauge: "Gauge",
    gaugeText: (s: number, r: number) => `${s} sts × ${r} rows = 10 × 10 cm in stranded stockinette, after blocking.`,
    gaugeNote: "Knit a swatch first. More stitches than this: use a bigger needle; fewer: a smaller one.",
    abbr: "Abbreviations",
    abbrList: [["MC", "main colour"], ["CC", "contrast colour"], ["k", "knit"], ["p", "purl"], ["st(s)", "stitch(es)"], ["rnd(s)", "round(s)"], ["RS / WS", "right side / wrong side"]],
    read: "Reading the chart",
    readList: (reps: number) => [
      "Each square is one stitch. Its colour (and symbol) shows which yarn to knit it with.",
      "Start at the bottom right corner: round (row) 1.",
      "In the round: read every round from right to left.",
      "Knitting flat: read RS rows right to left (knit) and WS rows left to right (purl).",
      `The chart is one repeat. Work it ${reps} ${reps === 1 ? "time" : "times"} across each round; after the last row, start again at row 1.`,
    ],
    how: "Instructions",
    howList: (o: { castOn: number; reps: number; w: number; h: number; vreps: string; rows: number; cmW: string; cmH: string }) => [
      `With MC, cast on ${o.castOn} sts (${o.reps} ${o.reps === 1 ? "repeat" : "repeats"} of ${o.w} sts, about ${o.cmW} cm). Join to work in the round without twisting and place a marker for the start of the round. Knitting flat: cast on ${o.castOn + 2} sts, one extra edge stitch at each side.`,
      "Knit a few rounds in MC, or work ribbing for a hat or sweater edge.",
      `Work rows 1–${o.h} of the chart ${o.vreps} times: ${o.rows} rounds, about ${o.cmH} cm. Stop at the row that gives the length you want.`,
      "Knit a few rounds in MC and bind off loosely.",
    ],
    tips: "Colourwork tips",
    tipsList: [
      "Keep the floats on the back loose: spread the stitches on the right needle before you change colour.",
      "Catch floats that are longer than 5 stitches (about 2.5 cm) halfway along.",
      "Hold MC in the same hand all the way through so the pattern looks even.",
    ],
    finish: "Finishing",
    finishText: "Weave in the ends on the wrong side. Wet block: soak, press out the water, lay flat to the measurements and leave to dry.",
    estimate: "Yarn amounts are estimates for the size above and include about 10% spare.",
    chart: "Chart",
    chartNote: "Read from the bottom right. Thick lines every 10 stitches and rows.",
    key: "Key",
    noSymbols: "The chart is large, so squares show colour only.",
    page: (i: number, n: number) => `${i} / ${n}`,
    made: "Made in Stitch Studio",
    file: "pattern",
  },
  mn: {
    kicker: "Нүд студийн хээний заавар",
    untitled: "Нэргүй хээ",
    subtitle: (w: number, h: number, n: number) => `Өнгөт хээтэй нэхмэл · ${w} нүд × ${h} мөр давталт · ${n} өнгө`,
    size: "Бэлэн хэмжээ",
    sizeText: (w: string, h: string, label: string | null) => `${w} × ${h} см${label ? ` (${label})` : ""}`,
    repeat: (w: string, h: string) => `Схемийн нэг давталт: ${w} × ${h} см`,
    yarn: "Ээрмэл",
    amount: (m: number, k: number | null, len: number | null) => `≈ ${m} м${k ? ` · ${k} ширхэг${len ? ` (${len} м)` : ""}` : ""}`,
    needles: "Зүү",
    needlesText: (n: string) => `${n ? `${n} зүү` : "Ээрмэлд тохирох зүү"}, эсвэл нягтралд тохирох хэмжээтэй зүү. Дугуй нэхэхэд утастай дугуй зүү хэрэглэнэ.`,
    notions: "Бусад хэрэгсэл",
    notionsText: "Нүдний тэмдэглэгээ, утас нуух мохоо үзүүртэй том зүү.",
    gauge: "Нягтрал",
    gaugeText: (s: number, r: number) => `10 × 10 см-т ${s} нүд × ${r} мөр, өнгөт хээгээр нэхээд угааж хэлбэржүүлсний дараа.`,
    gaugeNote: "Эхлээд дээж нэхээрэй. Нүд олон гарвал том зүү, цөөн гарвал жижиг зүү хэрэглэнэ.",
    abbr: "Товчлол",
    abbrList: [["MC", "үндсэн өнгө"], ["CC", "хээний өнгө"], ["НТ", "нүүрэн тал"], ["АТ", "ар тал"]],
    read: "Схем унших",
    readList: (reps: number) => [
      "Нэг нүд = нэг нүд. Нүдний өнгө (ба тэмдэг) нь аль ээрмэлээр нэхэхийг заана.",
      "Баруун доод булангаас, 1-р мөрөөс эхэлнэ.",
      "Дугуй нэхэхэд: мөр бүрийг баруунаас зүүн тийш уншина.",
      "Хавтгай нэхэхэд: нүүрэн талын мөрийг баруунаас зүүн тийш (нүүрэн нүдээр), ар талын мөрийг зүүнээс баруун тийш (ар нүдээр) уншина.",
      `Схем нь нэг давталт. Мөр бүрт ${reps} удаа давтаж, сүүлийн мөрийн дараа 1-р мөрөөс дахин эхэлнэ.`,
    ],
    how: "Нэхэх дараалал",
    howList: (o: { castOn: number; reps: number; w: number; h: number; vreps: string; rows: number; cmW: string; cmH: string }) => [
      `Үндсэн өнгөөр ${o.castOn} нүд авна (${o.w} нүдтэй ${o.reps} давталт, ойролцоогоор ${o.cmW} см). Мушгихгүйгээр дугуйруулан холбож, эхлэлд нь тэмдэглэгээ тавина. Хавтгай нэхвэл ${o.castOn + 2} нүд авч, хоёр захад нэг нэг захын нүд нэмнэ.`,
      "Үндсэн өнгөөр хэдэн мөр нэхнэ. Малгай, цамцны захад резин нэхэж болно.",
      `Схемийн 1–${o.h}-р мөрийг ${o.vreps} удаа нэхнэ: нийт ${o.rows} мөр, ойролцоогоор ${o.cmH} см. Хүссэн урттаа хүрмэгц зогсоно.`,
      "Үндсэн өнгөөр хэдэн мөр нэхээд, сул хааж дуусгана.",
    ],
    tips: "Зөвлөгөө",
    tipsList: [
      "Ар талаар гүйх утсыг сул байлгана: өнгө солихын өмнө баруун зүүн дээрх нүдийг тэнийлгэнэ.",
      "5-аас олон нүд (≈2.5 см) гүйх утсыг дундуур нь бэхэлнэ.",
      "Үндсэн өнгийг үргэлж нэг гартаа барьвал хээ жигд гарна.",
    ],
    finish: "Дуусгах",
    finishText: "Утасны үзүүрүүдийг ар талд нууна. Норгоод усыг шахаж, хэмжээнд нь тэгшлэн хавтгай тавьж хатаана.",
    estimate: "Ээрмэлийн хэмжээ нь дээрх хэмжээнд тооцсон ойролцоо тоо бөгөөд 10% нөөц орсон.",
    chart: "Схем",
    chartNote: "Баруун доод булангаас уншина. 10 нүд, 10 мөр тутамд тод шугамтай.",
    key: "Тэмдэглэгээ",
    noSymbols: "Схем том тул нүднүүд зөвхөн өнгөөр харагдана.",
    page: (i: number, n: number) => `${i} / ${n}`,
    made: "Нүд студид бүтээв",
    file: "hee",
  },
};

// ---------- Page canvas (A4 at 100 units per inch, drawn at 2× → 200 dpi) ----------
const PW = 827, PH = 1169, M = 64, SCALE = 2;
const INK = "#141414", MUTED = "#6B6B6B", LINE = "#E4DED3";
const FONT = "Manrope, system-ui, sans-serif";

class Doc {
  pages: HTMLCanvasElement[] = [];
  ctx!: CanvasRenderingContext2D;
  y = M;
  constructor() { this.newPage(); }
  newPage() {
    const c = document.createElement("canvas");
    c.width = PW * SCALE; c.height = PH * SCALE;
    const ctx = c.getContext("2d")!;
    ctx.scale(SCALE, SCALE);
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, PW, PH);
    ctx.textBaseline = "alphabetic";
    this.pages.push(c); this.ctx = ctx; this.y = M;
  }
  ensure(h: number) { if (this.y + h > PH - M - 30) this.newPage(); }
  font(size: number, weight = 400) { this.ctx.font = `${weight} ${size}px ${FONT}`; }
  // Wrapped text; returns height used.
  lines(text: string, width: number, size: number, weight = 400) {
    this.font(size, weight);
    const out: string[] = [];
    for (const para of text.split("\n")) {
      let cur = "";
      for (const word of para.split(" ")) {
        const t = cur ? `${cur} ${word}` : word;
        if (this.ctx.measureText(t).width > width && cur) { out.push(cur); cur = word; } else cur = t;
      }
      out.push(cur);
    }
    return out;
  }
  text(text: string, x: number, width: number, size: number, opts: { weight?: number; color?: string; lh?: number } = {}) {
    const lh = opts.lh ?? size * 1.45;
    const ls = this.lines(text, width, size, opts.weight ?? 400);
    this.ensure(ls.length * lh);
    this.ctx.fillStyle = opts.color ?? INK;
    for (const l of ls) { this.y += lh; this.ctx.fillText(l, x, this.y - lh * 0.28); }
    return ls.length * lh;
  }
  heading(text: string) {
    this.ensure(70);
    this.y += 22;
    this.font(13, 700);
    this.ctx.fillStyle = INK;
    this.ctx.fillText(text.toUpperCase(), M, this.y + 12);
    this.y += 20;
    this.ctx.fillStyle = INK; this.ctx.fillRect(M, this.y, PW - 2 * M, 1.5);
    this.y += 8;
  }
  list(items: string[], numbered: boolean, size = 14) {
    items.forEach((it, i) => {
      const mark = numbered ? `${i + 1}.` : "•";
      const ls = this.lines(it, PW - 2 * M - 28, size);
      this.ensure(ls.length * size * 1.45 + 6);
      this.font(size, numbered ? 700 : 400); this.ctx.fillStyle = INK;
      this.ctx.fillText(mark, M, this.y + size * 1.45 - size * 0.4);
      this.text(it, M + 28, PW - 2 * M - 28, size);
      this.y += 6;
    });
  }
}

const cm = (n: number) => (Math.round(n * 10) / 10).toString();

function loadImage(src: string) {
  return new Promise<HTMLImageElement | null>((res) => {
    const im = new Image();
    im.onload = () => res(im); im.onerror = () => res(null); im.src = src;
  });
}

// Black-and-white-readable symbols for each colour slot (MC has none, like printed charts).
function drawSymbol(ctx: CanvasRenderingContext2D, slot: number, x: number, y: number, s: number, onDark: boolean) {
  if (slot === 0) return;
  const cx = x + s / 2, cy = y + s / 2, r = s * 0.28;
  ctx.save();
  ctx.strokeStyle = ctx.fillStyle = onDark ? "rgba(255,255,255,.85)" : "rgba(20,20,20,.8)";
  ctx.lineWidth = Math.max(1, s * 0.09);
  ctx.beginPath();
  switch (slot) {
    case 1: ctx.arc(cx, cy, r * 0.8, 0, Math.PI * 2); ctx.fill(); break;                                       // ●
    case 2: ctx.moveTo(cx - r, cy - r); ctx.lineTo(cx + r, cy + r); ctx.moveTo(cx + r, cy - r); ctx.lineTo(cx - r, cy + r); ctx.stroke(); break; // ×
    case 3: ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); break;                                            // ○
    case 4: ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r, cy + r * 0.8); ctx.lineTo(cx - r, cy + r * 0.8); ctx.closePath(); ctx.fill(); break; // ▲
    default: ctx.moveTo(cx - r, cy + r); ctx.lineTo(cx + r, cy - r); ctx.stroke(); break;                       // /
  }
  ctx.restore();
}

export async function downloadPatternPdf(p: PatternInput) {
  const t = T[p.lang];
  const { chart, gauge } = p;
  const n = p.colours.length;
  const roles = p.colours.map((_, i) => (i === 0 ? "MC" : `CC${i}`));
  const title = p.name.trim() || t.untitled;

  await Promise.all([document.fonts.load(`400 16px Manrope`, "Аа Өө Үү"), document.fonts.load(`700 16px Manrope`, "Аа Өө Үү")]).catch(() => {});
  const logo = await loadImage("/brand/loop-logo.png");

  // Numbers for the instructions.
  const reps = Math.max(1, Math.round((p.project.w * gauge.stitches) / 10 / chart.width));
  const castOn = reps * chart.width;
  const rows = Math.max(chart.height, Math.round((p.project.h * gauge.rows) / 10));
  const vreps = rows / chart.height;
  const vrepsText = Number.isInteger(vreps) ? String(vreps) : `≈ ${(Math.round(vreps * 10) / 10).toString().replace(".", p.lang === "mn" ? "," : ".")}`;

  const d = new Doc();

  // ---------- Page 1: title, photo, materials ----------
  if (logo) d.ctx.drawImage(logo, PW - M - 110, M - 18, 110, 110 * (logo.height / logo.width));
  d.font(12, 700); d.ctx.fillStyle = MUTED; d.ctx.fillText(t.kicker.toUpperCase(), M, M + 10);
  d.y = M + 20;
  d.text(title, M, PW - 2 * M - 130, 40, { weight: 700, lh: 46 });
  d.text(t.subtitle(chart.width, chart.height, n), M, PW - 2 * M - 130, 14, { color: MUTED });
  d.y = Math.max(d.y, M + 100) + 18;

  // Knitted "photo": the design worked across, drawn like the studio preview.
  const photoW = PW - 2 * M, photoH = 300;
  {
    const sw = Math.max(6, Math.min(30, photoW / Math.max(chart.width * 2, 24)));
    const sh = (sw * gauge.stitches) / gauge.rows;
    const cols = Math.ceil(photoW / sw), rowsN = Math.ceil(photoH / sh);
    const off = document.createElement("canvas");
    off.width = photoW * SCALE; off.height = photoH * SCALE;
    const oc = off.getContext("2d")!; oc.scale(SCALE, SCALE);
    drawKnit(oc, chart, p.colours, p.tweed, cols, rowsN, sw, sh, photoW, photoH, SCALE);
    d.ctx.save();
    d.ctx.beginPath(); d.ctx.roundRect(M, d.y, photoW, photoH, 16); d.ctx.clip();
    d.ctx.drawImage(off, M, d.y, photoW, photoH);
    d.ctx.restore();
    d.y += photoH + 6;
  }

  d.heading(t.size);
  d.text(t.sizeText(cm(p.project.w), cm(p.project.h), p.project.label), M, PW - 2 * M, 15, { weight: 700 });
  d.text(t.repeat(cm((chart.width * 10) / gauge.stitches), cm((chart.height * 10) / gauge.rows)), M, PW - 2 * M, 13, { color: MUTED });

  d.heading(t.yarn);
  for (const y of p.yarns) {
    d.ensure(46);
    const top = d.y + 8;
    d.ctx.fillStyle = y.hex; d.ctx.strokeStyle = "rgba(0,0,0,.15)"; d.ctx.lineWidth = 1;
    d.ctx.beginPath(); d.ctx.roundRect(M, top, 30, 30, 6); d.ctx.fill(); d.ctx.stroke();
    d.font(13, 700); d.ctx.fillStyle = INK; d.ctx.fillText(y.roles.join(", "), M + 42, top + 13);
    d.font(14, 700); d.ctx.fillText(`${y.line} · ${y.colour}`, M + 120, top + 13);
    d.font(13, 400); d.ctx.fillStyle = MUTED; d.ctx.fillText(t.amount(y.metres, y.skeins, y.skeinM), M + 120, top + 31);
    d.y = top + 40;
    d.ctx.fillStyle = LINE; d.ctx.fillRect(M, d.y, PW - 2 * M, 1);
  }
  d.y += 4;
  d.text(t.estimate, M, PW - 2 * M, 12, { color: MUTED });

  d.heading(t.needles);
  d.text(t.needlesText(p.yarns[0]?.needle ?? ""), M, PW - 2 * M, 14);
  d.heading(t.notions);
  d.text(t.notionsText, M, PW - 2 * M, 14);
  d.heading(t.gauge);
  d.text(t.gaugeText(gauge.stitches, gauge.rows), M, PW - 2 * M, 14, { weight: 700 });
  d.text(t.gaugeNote, M, PW - 2 * M, 13, { color: MUTED });

  // ---------- Page 2: how to knit it ----------
  d.newPage();
  d.heading(t.abbr);
  {
    const abbr = t.abbrList.slice();
    const colW = (PW - 2 * M) / 2;
    abbr.forEach(([k, v], i) => {
      const x = M + (i % 2) * colW;
      if (i % 2 === 0) { d.ensure(24); d.y += 24; }
      d.font(14, 700); d.ctx.fillStyle = INK; d.ctx.fillText(k, x, d.y - 6);
      d.font(14, 400); d.ctx.fillText(v, x + 70, d.y - 6);
    });
    d.y += 4;
  }
  d.heading(t.read);
  d.list(t.readList(reps), false);
  d.heading(t.how);
  d.list(t.howList({ castOn, reps, w: chart.width, h: chart.height, vreps: vrepsText, rows, cmW: cm((castOn * 10) / gauge.stitches), cmH: cm((rows * 10) / gauge.rows) }), true);
  d.heading(t.tips);
  d.list(t.tipsList, false);
  d.heading(t.finish);
  d.text(t.finishText, M, PW - 2 * M, 14);

  // ---------- Page 3: chart + key ----------
  d.newPage();
  d.text(t.chart, M, PW - 2 * M, 28, { weight: 700, lh: 34 });
  d.text(`${title} · ${chart.width} × ${chart.height}`, M, PW - 2 * M, 13, { color: MUTED });
  d.y += 16;
  {
    const gutR = 34, gutB = 26;
    const keyH = 70 + Math.ceil(n / 2) * 34;
    const availW = PW - 2 * M - gutR, availH = PH - M - 40 - d.y - gutB - keyH;
    const s = Math.max(2, Math.min(24, availW / chart.width, availH / chart.height));
    const gw = chart.width * s, gh = chart.height * s;
    const x0 = M + (PW - 2 * M - gutR - gw) / 2, y0 = d.y;
    const symbols = s >= 8;
    for (let y = 0; y < chart.height; y++)
      for (let x = 0; x < chart.width; x++) {
        const slot = chart.cells[y * chart.width + x];
        const hex = p.colours[slot] ?? "#fff";
        d.ctx.fillStyle = hex; d.ctx.fillRect(x0 + x * s, y0 + y * s, s + 0.3, s + 0.3);
        if (symbols) drawSymbol(d.ctx, slot, x0 + x * s, y0 + y * s, s, luminance(hex) < 0.45);
      }
    for (let x = 0; x <= chart.width; x++) {
      const heavy = (chart.width - x) % 10 === 0;
      d.ctx.fillStyle = heavy ? "rgba(20,20,20,.7)" : "rgba(20,20,20,.22)";
      d.ctx.fillRect(x0 + x * s - (heavy ? 0.6 : 0.25), y0, heavy ? 1.2 : 0.5, gh);
    }
    for (let y = 0; y <= chart.height; y++) {
      const heavy = (chart.height - y) % 10 === 0;
      d.ctx.fillStyle = heavy ? "rgba(20,20,20,.7)" : "rgba(20,20,20,.22)";
      d.ctx.fillRect(x0, y0 + y * s - (heavy ? 0.6 : 0.25), gw, heavy ? 1.2 : 0.5);
    }
    d.ctx.strokeStyle = INK; d.ctx.lineWidth = 1.5; d.ctx.strokeRect(x0, y0, gw, gh);
    // Row numbers on the right, stitch numbers along the bottom (counted from the right).
    const step = s < 9 ? 10 : 5;
    d.font(Math.max(8, Math.min(11, s * 0.75)), 400); d.ctx.fillStyle = MUTED;
    d.ctx.textAlign = "left";
    for (let r = 1; r <= chart.height; r++) if (r === 1 || r % step === 0) d.ctx.fillText(String(r), x0 + gw + 6, y0 + (chart.height - r) * s + s / 2 + 4);
    d.ctx.textAlign = "center";
    for (let st = 1; st <= chart.width; st++) if (st === 1 || st % step === 0) d.ctx.fillText(String(st), x0 + (chart.width - st) * s + s / 2, y0 + gh + 16);
    d.ctx.textAlign = "left";
    d.y = y0 + gh + gutB + 10;
    d.text(t.chartNote + (symbols ? "" : ` ${t.noSymbols}`), M, PW - 2 * M, 12, { color: MUTED });

    d.heading(t.key);
    const colW = (PW - 2 * M) / 2;
    p.colours.forEach((hex, i) => {
      const x = M + (i % 2) * colW;
      if (i % 2 === 0) d.y += 34;
      const top = d.y - 26;
      d.ctx.fillStyle = hex; d.ctx.fillRect(x, top, 24, 24);
      d.ctx.strokeStyle = "rgba(0,0,0,.25)"; d.ctx.lineWidth = 1; d.ctx.strokeRect(x, top, 24, 24);
      drawSymbol(d.ctx, i, x, top, 24, luminance(hex) < 0.45);
      d.font(14, 700); d.ctx.fillStyle = INK; d.ctx.fillText(roles[i], x + 36, top + 17);
      d.font(14, 400); d.ctx.fillText(p.slotNames[i] ?? "", x + 80, top + 17);
    });
  }

  // ---------- Footers ----------
  const date = new Date().toLocaleDateString(p.lang === "mn" ? "mn-MN" : "en-GB");
  d.pages.forEach((pg, i) => {
    const g = pg.getContext("2d")!;
    g.font = `400 11px ${FONT}`; g.fillStyle = MUTED;
    g.fillText(`loop · ${t.made} · ${date}`, M, PH - M + 24);
    g.textAlign = "right"; g.fillText(t.page(i + 1, d.pages.length), PW - M, PH - M + 24); g.textAlign = "left";
    g.fillStyle = LINE; g.fillRect(M, PH - M + 6, PW - 2 * M, 1);
  });

  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "pt", format: "a4", compress: true });
  d.pages.forEach((pg, i) => {
    if (i > 0) pdf.addPage();
    pdf.addImage(pg.toDataURL("image/jpeg", 0.9), "JPEG", 0, 0, 595.28, 841.89, undefined, "FAST");
  });
  pdf.setProperties({ title: `${title} · loop`, creator: "loop Stitch Studio" });
  const safe = title.replace(/[^\p{L}\p{N}\- ]+/gu, "").trim() || t.file;
  pdf.save(`${safe} - loop.pdf`);
}

