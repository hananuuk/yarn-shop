"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PICK_COLORS, encodePicks, type Pick } from "@/lib/picks";

type Dim = { key: string; name: string; options: { value: string; label: string }[] };

export function CatalogFilters(props: {
  picks: Pick[];
  dims: Dim[];
  sort: string;
  sorts: { value: string; label: string }[];
  labels: { all: string; clear: string; sortBy: string; count: string; filters: string };
}) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const box = useRef<HTMLDivElement>(null);

  // Close the dropdown on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(null); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  function go(next: { picks?: Pick[]; sort?: string }) {
    const sp = new URLSearchParams(params.toString());
    const picks = next.picks ?? props.picks;
    if (picks.length) sp.set("f", encodePicks(picks)); else sp.delete("f");
    const sort = next.sort ?? props.sort;
    if (sort && sort !== "new") sp.set("sort", sort); else sp.delete("sort");
    setOpen(null);
    start(() => router.push(`${path}${sp.toString() ? `?${sp}` : ""}`, { scroll: false }));
  }

  function choose(dim: string, value: string | null) {
    const picks = props.picks.slice();
    const i = picks.findIndex((p) => p.dim === dim);
    if (value === null) { if (i !== -1) picks.splice(i, 1); }
    else if (i !== -1) picks[i] = { dim, value };
    else picks.push({ dim, value });
    go({ picks });
  }

  return (
    <div className={`mt-9 flex flex-wrap items-center justify-between gap-x-6 gap-y-4 transition-opacity ${pending ? "opacity-60" : ""}`}>
      <div ref={box} role="group" aria-label={props.labels.filters} className="flex flex-wrap items-center gap-2.5">
        {props.dims.map((d) => {
          const idx = props.picks.findIndex((p) => p.dim === d.key);
          const pick = idx === -1 ? null : props.picks[idx];
          const color = idx === -1 ? null : PICK_COLORS[idx % PICK_COLORS.length];
          const label = pick ? `${d.name}: ${d.options.find((o) => o.value === pick.value)?.label ?? pick.value}` : d.name;
          const isOpen = open === d.key;
          return (
            <div key={d.key} className="relative">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                onClick={() => setOpen(isOpen ? null : d.key)}
                className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full border pl-5 pr-4 text-sm font-semibold"
                style={color ? { background: color, borderColor: color, color: "#fff" } : { background: "#fff", borderColor: "#141414", color: "#141414" }}
              >
                {label}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={isOpen ? "rotate-180" : ""}><path d="M6 9l6 6 6-6" /></svg>
              </button>
              {isOpen && (
                <div role="listbox" aria-label={d.name} className="absolute left-0 top-[52px] z-20 flex max-h-80 min-w-60 flex-col overflow-auto rounded-2xl border border-line bg-white p-1.5 shadow-[0_12px_32px_rgba(20,20,20,.12)]">
                  {[{ value: "", label: props.labels.all }, ...d.options].map((o) => {
                    const sel = pick ? pick.value === o.value : o.value === "";
                    return (
                      <button
                        key={o.value || "__all"}
                        type="button"
                        role="option"
                        aria-selected={sel}
                        onClick={() => choose(d.key, o.value || null)}
                        className={`flex min-h-11 w-full items-center justify-between gap-4 rounded-lg px-3.5 text-left text-[15px] hover:bg-cream ${sel ? "font-bold" : ""}`}
                      >
                        {o.label}
                        {sel && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {props.picks.length > 0 && (
          <button type="button" onClick={() => go({ picks: [] })} className="min-h-11 px-2 text-sm font-semibold underline underline-offset-4">
            {props.labels.clear}
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted">
        <span aria-live="polite">{props.labels.count}</span>
        <label className="inline-flex items-center gap-1.5">
          {props.labels.sortBy}
          <select
            value={props.sort}
            onChange={(e) => go({ sort: e.target.value })}
            className="min-h-11 cursor-pointer appearance-none bg-transparent px-1 text-sm font-semibold text-ink"
          >
            {props.sorts.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
      </div>
    </div>
  );
}
