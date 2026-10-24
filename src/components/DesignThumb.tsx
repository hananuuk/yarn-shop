"use client";

import { useEffect, useRef } from "react";
import { decodeCells } from "@/lib/studio";

// Small picture of a saved chart: one square per stitch, no grid.
export function DesignThumb({ width, height, cells, colours, size = 200 }: { width: number; height: number; cells: string; colours: string[]; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const cell = Math.max(1, Math.floor(size / Math.max(width, height)));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = width * cell * dpr;
    c.height = height * cell * dpr;
    c.style.width = `${width * cell}px`;
    c.style.height = `${height * cell}px`;
    const ctx = c.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const data = decodeCells(cells, width, height);
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        ctx.fillStyle = colours[data[y * width + x]] ?? "#ccc";
        ctx.fillRect(x * cell, y * cell, cell, cell);
      }
  }, [width, height, cells, colours, size]);
  return <canvas ref={ref} aria-hidden="true" className="block" />;
}
