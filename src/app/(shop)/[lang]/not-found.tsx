import Link from "next/link";
import { Caterpillar, PALETTE } from "@/components/Storybook";

export default function NotFound() {
  return (
    <div className="flex flex-col items-start gap-6 pt-20">
      <svg viewBox="0 0 220 120" width="220" height="120" aria-hidden="true" className="overflow-visible">
        <circle cx="70" cy="60" r="52" fill={PALETTE.chartreuse} stroke={PALETTE.ink} strokeWidth="2" filter="url(#loop-paint)" />
        <circle cx="112" cy="40" r="18" fill={PALETTE.paper} filter="url(#loop-wobble)" />
        <circle cx="118" cy="74" r="14" fill={PALETTE.paper} filter="url(#loop-wobble)" />
        <Caterpillar x={128} y={104} seg={6} r={8} body={PALETTE.apricot} accent={PALETTE.tomato} pattern="stripes" />
      </svg>
      <h1 className="text-[clamp(44px,7.2vw,104px)]">404</h1>
      <p className="text-lg">Энэ хуудсыг хорхой идчихсэн бололтой.</p>
      <p className="caption">This page appears to have been eaten.</p>
      <Link href="/mn" className="btn">loop</Link>
    </div>
  );
}
