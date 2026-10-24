"use client";

import { useRef, useState } from "react";
import { ProductImage } from "./ProductImage";

type Img = { id: number; url: string; caption: string };

// Product photos: one big photo with previous/next arrows (also swipe and ← → keys),
// a counter, the photo's caption, and thumbnails to jump straight to a photo.
export function ProductGallery({ images, category, colorHex, alt, labels }: {
  images: Img[]; category: string; colorHex: string; alt: string;
  labels: { prev: string; next: string; photo: string }; // photo: "Зураг" / "Photo"
}) {
  const [i, setI] = useState(0);
  const n = images.length;
  const go = (d: number) => setI((v) => (v + d + n) % n);
  const start = useRef<number | null>(null);
  const cur = images[i];
  const many = n > 1;

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative flex aspect-[3/4] touch-pan-y select-none items-center justify-center overflow-hidden rounded-2xl bg-tile"
        tabIndex={many ? 0 : undefined}
        role={many ? "region" : undefined}
        aria-roledescription={many ? "carousel" : undefined}
        aria-label={many ? alt : undefined}
        onKeyDown={(e) => { if (!many) return; if (e.key === "ArrowLeft") go(-1); if (e.key === "ArrowRight") go(1); }}
        onPointerDown={(e) => { start.current = e.clientX; }}
        onPointerUp={(e) => {
          if (many && start.current != null && Math.abs(e.clientX - start.current) > 40) go(e.clientX < start.current ? 1 : -1);
          start.current = null;
        }}
      >
        <ProductImage
          key={cur?.id ?? 0}
          category={category}
          colorHex={colorHex}
          images={images}
          index={i}
          alt={cur?.caption ? `${alt}: ${cur.caption}` : alt}
          className="pointer-events-none"
        />
        {many && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label={labels.prev} className="absolute left-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-lg shadow-sm hover:bg-white">
              <span aria-hidden="true">←</span>
            </button>
            <button type="button" onClick={() => go(1)} aria-label={labels.next} className="absolute right-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-lg shadow-sm hover:bg-white">
              <span aria-hidden="true">→</span>
            </button>
            <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold tabular-nums" aria-live="polite">
              {i + 1} / {n}
            </span>
          </>
        )}
      </div>

      {cur?.caption && <p className="text-sm text-muted">{cur.caption}</p>}

      {many && (
        <ul className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, k) => (
            <li key={img.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setI(k)}
                aria-label={img.caption || `${labels.photo} ${k + 1}`}
                aria-current={k === i ? "true" : undefined}
                className={`flex size-16 items-center justify-center overflow-hidden rounded-lg bg-tile md:size-20 ${k === i ? "ring-2 ring-ink ring-offset-2" : "opacity-70 hover:opacity-100"}`}
              >
                <ProductImage category={category} colorHex={colorHex} images={images} index={k} alt="" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
