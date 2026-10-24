"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getDict } from "@/lib/i18n";
import {
  DEFAULT_GAUGE, MAX_COLOURS, MAX_SIZE, MIN_SIZE, clampSize, decodeCells, drawChart, drawKnit, encodeCells,
  estimateMetres, flipH, flipV, floodFill, makeTemplate, resize, shift,
  type Chart, type Gauge, type StudioYarn, type TemplateKind,
} from "@/lib/studio";
import { saveDesignAction } from "./actions";
import { addToCartAction } from "../actions";

export type StudioStart = {
  id: string | null; name: string; width: number; height: number; cells: string; palette: number[]; fromSaved: boolean;
};

type Snapshot = { chart: Chart; palette: number[] };
type Tool = "paint" | "fill" | "pick";

const DRAFT_KEY = "studio-draft-v1";
const GUTTER_R = 28, GUTTER_B = 20;
const PRESETS = { hat: [52, 22], scarf: [25, 160], sweater: [100, 60] } as const;
const money = (n: number) => n.toLocaleString("en-US") + "₮";
const cm = (n: number) => (Math.round(n * 10) / 10).toString();

function readDraft(): (StudioStart & { savedAt?: number }) | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function writeDraft(d: StudioStart) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  } catch {
    /* storage unavailable: the design just isn't kept between visits */
  }
}

export function Studio({ lang, yarns, start, loggedIn, preferNewDraft }: {
  lang: "mn" | "en"; yarns: StudioYarn[]; start: StudioStart; loggedIn: boolean; preferNewDraft: boolean;
}) {
  const t = getDict(lang).studio;
  const router = useRouter();
  const byId = useMemo(() => new Map(yarns.map((y) => [y.id, y])), [yarns]);

  const [chart, setChart] = useState<Chart>(() => ({
    width: start.width, height: start.height, cells: decodeCells(start.cells, start.width, start.height),
  }));
  const [palette, setPalette] = useState<number[]>(start.palette);
  const [designId, setDesignId] = useState<string | null>(start.id);
  const [name, setName] = useState(start.name);
  const [current, setCurrent] = useState(1);
  const [tool, setTool] = useState<Tool>("paint");
  const [mirror, setMirror] = useState(false);
  const [tiles, setTiles] = useState(2);
  const [project, setProject] = useState<{ w: number; h: number }>({ w: PRESETS.hat[0], h: PRESETS.hat[1] });
  const [sizeInput, setSizeInput] = useState({ w: String(start.width), h: String(start.height) });
  const [picker, setPicker] = useState<{ slot: number | null } | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [addState, setAddState] = useState<"idle" | "adding" | "added">("idle");
  const [notice, setNotice] = useState<string | null>(null);
  const [, bump] = useState(0);

  const undoStack = useRef<Snapshot[]>([]);
  const redoStack = useRef<Snapshot[]>([]);

  // ---------- History ----------
  const remember = useCallback(() => {
    undoStack.current.push({ chart, palette });
    if (undoStack.current.length > 60) undoStack.current.shift();
    redoStack.current = [];
    bump((n) => n + 1);
  }, [chart, palette]);

  const undo = useCallback(() => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    redoStack.current.push({ chart, palette });
    setChart(prev.chart);
    setPalette(prev.palette);
    setSizeInput({ w: String(prev.chart.width), h: String(prev.chart.height) });
    bump((n) => n + 1);
  }, [chart, palette]);

  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current.push({ chart, palette });
    setChart(next.chart);
    setPalette(next.palette);
    setSizeInput({ w: String(next.chart.width), h: String(next.chart.height) });
    bump((n) => n + 1);
  }, [chart, palette]);

  // ---------- Draft: restore once, then keep saving locally ----------
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    if (start.fromSaved || preferNewDraft) return;
    const d = readDraft();
    if (!d || !Array.isArray(d.palette) || d.palette.some((id) => !byId.has(id))) return;
    if (d.width < MIN_SIZE || d.width > MAX_SIZE || d.height < MIN_SIZE || d.height > MAX_SIZE) return;
    setChart({ width: d.width, height: d.height, cells: decodeCells(d.cells, d.width, d.height) });
    setPalette(d.palette);
    setName(d.name || "");
    setDesignId(d.id);
    setSizeInput({ w: String(d.width), h: String(d.height) });
    setNotice(t.draftRestored);
  }, [start.fromSaved, preferNewDraft, byId, t.draftRestored]);

  useEffect(() => {
    if (!restored.current) return;
    const id = setTimeout(() => writeDraft({
      id: designId, name, width: chart.width, height: chart.height, cells: encodeCells(chart.cells), palette, fromSaved: false,
    }), 400);
    return () => clearTimeout(id);
  }, [chart, palette, name, designId]);

  useEffect(() => { setSaveState((s) => (s === "saved" ? "idle" : s)); setAddState("idle"); }, [chart, palette]);

  // ---------- Derived ----------
  const colours = palette.map((id) => byId.get(id)?.hex ?? "#cccccc");
  const tweed = palette.map((id) => !!byId.get(id)?.tweed);
  const gaugeYarn = palette.map((id) => byId.get(id)).find((y) => y?.gaugeStitches && y?.gaugeRows);
  const gauge: Gauge = gaugeYarn ? { stitches: gaugeYarn.gaugeStitches!, rows: gaugeYarn.gaugeRows! } : DEFAULT_GAUGE;
  const safeCurrent = Math.min(current, palette.length - 1);

  // ---------- Chart canvas ----------
  const chartWrap = useRef<HTMLDivElement>(null);
  const chartCanvas = useRef<HTMLCanvasElement>(null);
  const [wrapW, setWrapW] = useState(640);
  useEffect(() => {
    const el = chartWrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWrapW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const cell = Math.max(5, Math.min(28, Math.floor((wrapW - GUTTER_R) / chart.width), Math.floor(620 / chart.height)));

  useEffect(() => {
    const c = chartCanvas.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const W = chart.width * cell + GUTTER_R, H = chart.height * cell + GUTTER_B;
    c.width = W * dpr;
    c.height = H * dpr;
    c.style.width = `${W}px`;
    c.style.height = `${H}px`;
    const ctx = c.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawChart(ctx, chart, colours, cell, GUTTER_R, GUTTER_B);
  }, [chart, colours.join(), cell]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Painting ----------
  const painting = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  const cellAt = (e: React.PointerEvent) => {
    const r = chartCanvas.current!.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left) / cell), y = Math.floor((e.clientY - r.top) / cell);
    return x >= 0 && y >= 0 && x < chart.width && y < chart.height ? { x, y } : null;
  };

  const paintLine = (from: { x: number; y: number } | null, to: { x: number; y: number }) => {
    setChart((ch) => {
      const cells = ch.cells.slice();
      const pts: { x: number; y: number }[] = [];
      if (from) {
        const steps = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
        for (let i = 1; i <= steps; i++) pts.push({ x: Math.round(from.x + ((to.x - from.x) * i) / steps), y: Math.round(from.y + ((to.y - from.y) * i) / steps) });
      } else pts.push(to);
      let changed = false;
      for (const p of pts) {
        for (const x of mirror ? [p.x, ch.width - 1 - p.x] : [p.x]) {
          const i = p.y * ch.width + x;
          if (cells[i] !== safeCurrent) { cells[i] = safeCurrent; changed = true; }
        }
      }
      return changed ? { ...ch, cells } : ch;
    });
  };

  const onDown = (e: React.PointerEvent) => {
    const p = cellAt(e);
    if (!p) return;
    if (tool === "pick") {
      setCurrent(chart.cells[p.y * chart.width + p.x]);
      setTool("paint");
      return;
    }
    remember();
    if (tool === "fill") {
      setChart((ch) => ({ ...ch, cells: floodFill(ch, p.x, p.y, safeCurrent) }));
      return;
    }
    (e.target as Element).setPointerCapture(e.pointerId);
    painting.current = true;
    last.current = p;
    paintLine(null, p);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!painting.current) return;
    const p = cellAt(e);
    if (!p || (last.current && p.x === last.current.x && p.y === last.current.y)) return;
    paintLine(last.current, p);
    last.current = p;
  };
  const onUp = () => { painting.current = false; last.current = null; };

  // ---------- Whole-chart edits ----------
  const edit = (fn: (ch: Chart) => Uint8Array) => { remember(); setChart((ch) => ({ ...ch, cells: fn(ch) })); };
  const applySize = () => {
    const w = clampSize(Number(sizeInput.w)), h = clampSize(Number(sizeInput.h));
    setSizeInput({ w: String(w), h: String(h) });
    if (w === chart.width && h === chart.height) return;
    remember();
    setChart((ch) => resize(ch, w, h));
  };
  const applyTemplate = (kind: TemplateKind) => {
    remember();
    const tpl = makeTemplate(kind);
    const top = palette.length - 1;
    setChart({ ...tpl, cells: tpl.cells.map((c) => Math.min(c, top)) });
    setSizeInput({ w: String(tpl.width), h: String(tpl.height) });
  };

  // ---------- Palette ----------
  const chooseYarn = (id: number) => {
    if (!picker) return;
    remember();
    if (picker.slot === null) {
      setPalette((p) => [...p, id]);
      setCurrent(palette.length);
    } else {
      const slot = picker.slot;
      setPalette((p) => p.map((v, i) => (i === slot ? id : v)));
    }
    setPicker(null);
  };
  const removeSlot = (k: number) => {
    if (palette.length <= 2) return;
    remember();
    setChart((ch) => ({ ...ch, cells: ch.cells.map((c) => (c === k ? 0 : c > k ? c - 1 : c)) }));
    setPalette((p) => p.filter((_, i) => i !== k));
    setCurrent((c) => (c === k ? 0 : c > k ? c - 1 : c));
  };

  // ---------- Knitted preview (redrawn shortly after edits stop) ----------
  const previewWrap = useRef<HTMLDivElement>(null);
  const previewCanvas = useRef<HTMLCanvasElement>(null);
  const [previewW, setPreviewW] = useState(400);
  useEffect(() => {
    const el = previewWrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setPreviewW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const id = setTimeout(() => {
      const c = previewCanvas.current;
      if (!c) return;
      // Keep the number of drawn stitches reasonable on big charts.
      let n = tiles;
      while (n > 1 && chart.width * n * chart.height * n > 24000) n--;
      const sw = Math.max(6, Math.min(26, previewW / (chart.width * n))); // never tinier than 6px; wide charts crop instead
      const sh = (sw * gauge.stitches) / gauge.rows;
      const W = Math.floor(chart.width * n * sw), H = Math.floor(chart.height * n * sh);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      c.width = W * dpr;
      c.height = H * dpr;
      c.style.width = `${W}px`;
      c.style.height = `${H}px`;
      const ctx = c.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawKnit(ctx, chart, colours, tweed, n, n, sw, sh);
    }, 120);
    return () => clearTimeout(id);
  }, [chart, colours.join(), tweed.join(), tiles, previewW, gauge.stitches, gauge.rows]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Yarn estimate ----------
  const metres = estimateMetres(chart, palette.length, gauge, project.w, project.h);
  const lines = (() => {
    const merged = new Map<number, number>();
    palette.forEach((id, i) => merged.set(id, (merged.get(id) ?? 0) + metres[i]));
    return [...merged.entries()].map(([id, m]) => {
      const y = byId.get(id);
      const skeins = y?.lengthM ? Math.max(1, Math.ceil(m / y.lengthM)) : null;
      return { id, yarn: y, metres: Math.round(m), skeins, price: skeins && y ? skeins * y.price : 0 };
    }).filter((l) => l.metres > 0);
  })();
  const totalPrice = lines.reduce((s, l) => s + l.price, 0);
  const canAddAll = lines.length > 0 && lines.every((l) => l.skeins && l.yarn && l.yarn.stock > 0);

  const addAll = async () => {
    setAddState("adding");
    for (const l of lines) if (l.skeins) await addToCartAction(l.id, l.skeins);
    setAddState("added");
    router.refresh();
  };

  // ---------- Save / download ----------
  const save = async () => {
    setSaveState("saving");
    const payload = { id: designId ?? undefined, name, width: chart.width, height: chart.height, cells: encodeCells(chart.cells), palette };
    if (!loggedIn) {
      writeDraft({ ...payload, id: designId, fromSaved: false });
      router.push(`/${lang}/login?next=${encodeURIComponent(`/${lang}/studio`)}`);
      return;
    }
    const r = await saveDesignAction(payload);
    if (r.ok) {
      setDesignId(r.id);
      setSaveState("saved");
      router.replace(`/${lang}/studio?d=${r.id}`, { scroll: false });
    } else if (r.error === "login") {
      writeDraft({ ...payload, id: designId, fromSaved: false });
      router.push(`/${lang}/login?next=${encodeURIComponent(`/${lang}/studio`)}`);
    } else setSaveState("error");
  };

  const download = () => {
    const c = document.createElement("canvas");
    const size = 18;
    c.width = chart.width * size + GUTTER_R + 8;
    c.height = chart.height * size + GUTTER_B + 8;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    drawChart(ctx, chart, colours, size, GUTTER_R, GUTTER_B);
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = `${(name || t.namePh).replace(/[^\p{L}\p{N}\- ]+/gu, "").trim() || "chart"}.png`;
    a.click();
  };

  // ---------- Keyboard shortcuts ----------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || picker) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
      if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); return; }
      if (mod) return;
      if (e.key === "b") setTool("paint");
      else if (e.key === "g") setTool("fill");
      else if (e.key === "i") setTool("pick");
      else if (e.key === "m") setMirror((m) => !m);
      else if (/^[1-6]$/.test(e.key) && Number(e.key) <= palette.length) setCurrent(Number(e.key) - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, picker, palette.length]);

  // ---------- Picker: grouped by yarn line ----------
  const groups = useMemo(() => {
    const m = new Map<string, StudioYarn[]>();
    for (const y of yarns) m.set(y.line, [...(m.get(y.line) ?? []), y]);
    return [...m.entries()];
  }, [yarns]);
  const closeBtn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!picker) return;
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPicker(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [picker]);

  const toolBtn = (active: boolean) =>
    `inline-flex min-h-11 items-center gap-2 rounded-full border-[1.5px] px-4 text-[15px] font-semibold transition-colors ${active ? "border-ink bg-ink text-paper" : "border-[#B9A584] bg-[#FBF7EC] hover:bg-cream"}`;
  const smallBtn = "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border-[1.5px] border-[#B9A584] bg-[#FBF7EC] px-3 text-sm font-semibold hover:bg-cream disabled:opacity-35";
  const cmW = (chart.width * 10) / gauge.stitches, cmH = (chart.height * 10) / gauge.rows;

  return (
    <div className="mt-8 flex flex-wrap gap-x-10 gap-y-10">
      {notice && (
        <p role="status" className="w-full rounded-xl bg-cream px-4 py-3 text-sm font-semibold">{notice}</p>
      )}

      {/* ---------- Chart ---------- */}
      <section aria-labelledby="chart-h" className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="chart-h" className="text-2xl font-semibold tracking-tight">{t.chart}</h2>
          <span className="text-sm text-muted">{t.chartSize(chart.width, chart.height, cm(cmW), cm(cmH))}</span>
        </div>

        <div role="toolbar" aria-label={t.tools} className="flex flex-wrap items-center gap-2">
          <button type="button" aria-pressed={tool === "paint"} onClick={() => setTool("paint")} className={toolBtn(tool === "paint")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20l4-1 11-11-3-3L5 16z" /><path d="M14 6l3 3" /></svg>
            {t.paint}
          </button>
          <button type="button" aria-pressed={tool === "fill"} onClick={() => setTool("fill")} className={toolBtn(tool === "fill")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 11l7-7 7 7-7 7z" /><path d="M20 15s2 2.5 2 4a2 2 0 0 1-4 0c0-1.5 2-4 2-4z" /></svg>
            {t.fill}
          </button>
          <button type="button" aria-pressed={tool === "pick"} onClick={() => setTool("pick")} className={toolBtn(tool === "pick")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 3l5 5-3 3-5-5z" /><path d="M13 6L4 15v5h5l9-9" /></svg>
            {t.pick}
          </button>
          <button type="button" aria-pressed={mirror} onClick={() => setMirror((m) => !m)} className={toolBtn(mirror)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v18" strokeDasharray="2 3" /><path d="M9 7L3 12l6 5z" /><path d="M15 7l6 5-6 5z" /></svg>
            {t.mirror}
          </button>
          <span className="mx-1 h-6 w-px bg-line" aria-hidden="true" />
          <button type="button" onClick={undo} disabled={undoStack.current.length === 0} className={smallBtn} aria-label={t.undo} title={`${t.undo} (Ctrl+Z)`}>↶</button>
          <button type="button" onClick={redo} disabled={redoStack.current.length === 0} className={smallBtn} aria-label={t.redo} title={`${t.redo} (Ctrl+Shift+Z)`}>↷</button>
          <button type="button" onClick={() => edit(flipH)} className={smallBtn} aria-label={t.flipH} title={t.flipH}>⇋</button>
          <button type="button" onClick={() => edit(flipV)} className={smallBtn} aria-label={t.flipV} title={t.flipV}>⇵</button>
          <span className="inline-flex items-center gap-1" role="group" aria-label={t.shift}>
            <button type="button" onClick={() => edit((ch) => shift(ch, -1, 0))} className={smallBtn} aria-label={`${t.shift}: ${t.left}`}>←</button>
            <button type="button" onClick={() => edit((ch) => shift(ch, 1, 0))} className={smallBtn} aria-label={`${t.shift}: ${t.right}`}>→</button>
            <button type="button" onClick={() => edit((ch) => shift(ch, 0, -1))} className={smallBtn} aria-label={`${t.shift}: ${t.up}`}>↑</button>
            <button type="button" onClick={() => edit((ch) => shift(ch, 0, 1))} className={smallBtn} aria-label={`${t.shift}: ${t.down}`}>↓</button>
          </span>
          <button type="button" onClick={() => edit((ch) => new Uint8Array(ch.cells.length))} className={smallBtn}>{t.clear}</button>
        </div>

        <div ref={chartWrap} className="w-full min-w-0 overflow-x-auto">
          <canvas
            ref={chartCanvas}
            role="img"
            aria-label={`${t.chart}: ${chart.width} × ${chart.height}`}
            className={`block touch-none select-none ${tool === "pick" ? "cursor-copy" : "cursor-crosshair"}`}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          />
        </div>
        <p className="text-sm text-muted">{t.chartHelp}</p>

        <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
          <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); applySize(); }}>
            <label className="label" htmlFor="st-w">{t.size}
              <span className="flex items-center gap-2">
                <input id="st-w" type="number" min={MIN_SIZE} max={MAX_SIZE} value={sizeInput.w} onChange={(e) => setSizeInput((s) => ({ ...s, w: e.target.value }))} className="field w-20" aria-label={`${t.size}: ${t.stitchesShort}`} />
                <span className="text-sm font-normal text-muted">{t.stitchesShort} ×</span>
                <input id="st-h" type="number" min={MIN_SIZE} max={MAX_SIZE} value={sizeInput.h} onChange={(e) => setSizeInput((s) => ({ ...s, h: e.target.value }))} className="field w-20" aria-label={`${t.size}: ${t.rowsShort}`} />
                <span className="text-sm font-normal text-muted">{t.rowsShort}</span>
              </span>
            </label>
            <button className="btn-outline">{t.apply}</button>
          </form>
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-[#4A4A4A]">{t.templates}</span>
            <div className="flex flex-wrap gap-2">
              {(["ulzii", "diamonds", "zigzag", "blank"] as TemplateKind[]).map((k) => (
                <button key={k} type="button" onClick={() => applyTemplate(k)} className={smallBtn}>
                  {{ ulzii: t.tplUlzii, diamonds: t.tplDiamonds, zigzag: t.tplZigzag, blank: t.tplBlank }[k]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Side: colours, preview, yarn, save ---------- */}
      <aside className="flex min-w-0 flex-[1_1_340px] flex-col gap-10">
        <section aria-labelledby="pal-h" className="flex flex-col gap-3">
          <h2 id="pal-h" className="text-2xl font-semibold tracking-tight">{t.palette}</h2>
          <ul className="flex flex-col gap-2">
            {palette.map((id, i) => {
              const y = byId.get(id);
              const active = i === safeCurrent;
              return (
                <li key={i} className={`flex items-center gap-3 rounded-2xl border p-2 pr-3 ${active ? "border-ink" : "border-line"}`}>
                  <button
                    type="button"
                    onClick={() => { setCurrent(i); if (tool === "pick") setTool("paint"); }}
                    aria-pressed={active}
                    aria-label={`${i + 1}. ${y?.colour ?? ""}`}
                    className={`flex size-11 shrink-0 items-center justify-center rounded-full border border-black/10 text-xs font-bold ${active ? "ring-2 ring-ink ring-offset-2" : ""}`}
                    style={{ background: colours[i], color: y && luminanceDark(colours[i]) ? "#F6EFDF" : "#3A2417" }}
                  >
                    {i + 1}
                  </button>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[15px] font-semibold">{y?.colour}</span>
                    <span className="truncate text-xs text-muted">{i === 0 ? `${t.mainColour} · ` : ""}{y?.line}</span>
                  </span>
                  <button type="button" onClick={() => setPicker({ slot: i })} className="btn-ghost min-h-11 text-[13px]">{t.change}</button>
                  {palette.length > 2 && (
                    <button type="button" onClick={() => removeSlot(i)} className="flex size-11 items-center justify-center rounded-full text-muted hover:bg-cream" aria-label={`${t.remove}: ${y?.colour ?? ""}`}>×</button>
                  )}
                </li>
              );
            })}
          </ul>
          {palette.length < MAX_COLOURS && (
            <button type="button" onClick={() => setPicker({ slot: null })} className="btn-outline self-start">+ {t.addColour}</button>
          )}
        </section>

        <section aria-labelledby="prev-h" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="prev-h" className="text-2xl font-semibold tracking-tight">{t.preview}</h2>
            <div role="group" aria-label={t.zoom} className="inline-flex rounded-full border border-line p-1">
              {[1, 2, 3].map((n) => (
                <button key={n} type="button" aria-pressed={tiles === n} onClick={() => setTiles(n)} className={`min-h-9 min-w-10 rounded-full px-3 text-sm font-semibold ${tiles === n ? "bg-ink text-paper" : ""}`}>
                  {n}×{n}
                </button>
              ))}
            </div>
          </div>
          <div ref={previewWrap} className="tile-paper w-full overflow-hidden">
            <canvas ref={previewCanvas} role="img" aria-label={t.preview} className="block" />
          </div>
          <p className="text-xs text-muted">{gaugeYarn ? t.gaugeFrom(gaugeYarn.line) : ""} · {gauge.stitches} × {gauge.rows} / 10 cm</p>
        </section>

        <section aria-labelledby="est-h" className="flex flex-col gap-4 rounded-2xl bg-cream p-5">
          <h2 id="est-h" className="text-2xl font-semibold tracking-tight">{t.yarnsNeeded}</h2>
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-semibold text-[#4A4A4A]">{t.projectSize}</span>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map((k) => {
                const on = project.w === PRESETS[k][0] && project.h === PRESETS[k][1];
                return (
                  <button key={k} type="button" aria-pressed={on} onClick={() => setProject({ w: PRESETS[k][0], h: PRESETS[k][1] })} className={toolBtn(on)}>
                    {t.presets[k]}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-3">
              <label className="label">{t.widthCm}
                <input type="number" min={1} max={400} value={project.w} onChange={(e) => setProject((p) => ({ ...p, w: Math.max(0, Number(e.target.value) || 0) }))} className="field w-24" />
              </label>
              <label className="label">{t.heightCm}
                <input type="number" min={1} max={400} value={project.h} onChange={(e) => setProject((p) => ({ ...p, h: Math.max(0, Number(e.target.value) || 0) }))} className="field w-24" />
              </label>
            </div>
          </div>

          <ul className="flex flex-col divide-y divide-dashed divide-[#D9D1C3]">
            {lines.map((l) => (
              <li key={l.id} className="flex items-center gap-3 py-3">
                <span className="size-6 shrink-0 rounded-full border border-black/10" style={{ background: l.yarn?.hex }} aria-hidden="true" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <Link href={`/${lang}/p/${l.yarn?.slug}`} className="truncate text-[15px] font-semibold hover:underline">{l.yarn?.colour}</Link>
                  <span className="text-xs text-muted">{t.metres(l.metres)}{l.yarn && l.skeins && l.yarn.stock < l.skeins ? ` · ${l.yarn.stock > 0 ? t.notEnough(l.yarn.stock) : t.soldOut}` : ""}</span>
                </span>
                <span className="text-right text-sm">
                  <strong className="block">{l.skeins ? t.skeins(l.skeins) : t.noLength}</strong>
                  <span className="text-muted tabular-nums">{l.price ? money(l.price) : ""}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="flex items-baseline justify-between border-t border-ink pt-3 text-lg font-bold">
            <span>{t.total}</span>
            <span className="tabular-nums">{money(totalPrice)}</span>
          </div>
          <p className="text-xs text-muted">{t.estimateNote}</p>
          {addState === "added" ? (
            <p role="status" className="flex flex-wrap items-center gap-3 text-sm font-semibold text-ok">
              ✓ {t.added} <Link href={`/${lang}/basket`} className="text-ink underline underline-offset-4">{t.viewBasket}</Link>
            </p>
          ) : (
            <button type="button" onClick={addAll} disabled={!canAddAll || addState === "adding"} className="btn">
              {addState === "adding" ? "…" : t.addAll}
            </button>
          )}
        </section>

        <section aria-label={t.save} className="flex flex-col gap-3">
          <label className="label" htmlFor="st-name">{t.name}
            <input id="st-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder={t.namePh} className="field" />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={save} disabled={saveState === "saving"} className="btn">
              {saveState === "saving" ? t.saving : saveState === "saved" ? `✓ ${t.saved}` : loggedIn ? t.save : t.loginToSave}
            </button>
            <button type="button" onClick={download} className="btn-outline">{t.download}</button>
            {designId && (
              <Link href={`/${lang}/studio?y=${palette[1] ?? ""}`} onClick={() => { try { localStorage.removeItem(DRAFT_KEY); } catch {} }} className="btn-ghost">{t.newDesign}</Link>
            )}
          </div>
          {saveState === "error" && <p role="alert" className="text-sm font-semibold text-accent">{t.invalid}</p>}
          {loggedIn && <Link href={`/${lang}/account#designs`} className="btn-ghost self-start">{t.myDesigns}</Link>}
        </section>
      </aside>

      {/* ---------- Yarn picker ---------- */}
      {picker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#3A2417]/40 p-0 sm:items-center sm:p-6" onClick={() => setPicker(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="picker-h"
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border-[1.5px] border-ink bg-paper shadow-[6px_8px_0_rgba(58,36,23,.2)] sm:rounded-3xl"
          >
            <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-4">
              <h2 id="picker-h" className="text-xl font-semibold">{t.chooseYarn}</h2>
              <button ref={closeBtn} type="button" onClick={() => setPicker(null)} className="btn-ghost">{t.close}</button>
            </div>
            <div className="flex flex-col gap-6 overflow-y-auto px-6 py-5">
              {groups.map(([line, ys]) => (
                <div key={line} className="flex flex-col gap-3">
                  <p className="text-sm"><strong>{line}</strong> <span className="text-muted">· {ys[0].needle}</span></p>
                  <ul className="flex flex-wrap gap-3">
                    {ys.map((y) => {
                      const selected = picker.slot !== null && palette[picker.slot] === y.id;
                      return (
                        <li key={y.id}>
                          <button
                            type="button"
                            onClick={() => chooseYarn(y.id)}
                            title={y.colour}
                            aria-label={`${y.colour}${y.stock <= 0 ? ` (${t.soldOut})` : ""}`}
                            className={`flex w-20 flex-col items-center gap-1.5 rounded-xl p-1.5 text-center text-xs hover:bg-cream ${selected ? "bg-cream ring-2 ring-ink" : ""}`}
                          >
                            <span className={`size-12 rounded-full border border-black/10 ${y.stock <= 0 ? "opacity-40" : ""}`} style={{ background: y.hex }} />
                            <span className="line-clamp-2 leading-tight">{y.colour}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function luminanceDark(hex: string) {
  const h = hex.replace("#", "");
  const n = parseInt(h, 16) || 0;
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 140;
}
