"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

// Same page, other language: /mn/p/x?a=1 <-> /en/p/x?a=1
export function LangSwitch({ lang, label }: { lang: "mn" | "en"; label: string }) {
  const path = usePathname();
  const qs = useSearchParams().toString();
  const other = lang === "mn" ? "en" : "mn";
  const href = path.replace(/^\/(mn|en)(?=\/|$)/, `/${other}`) + (qs ? `?${qs}` : "");
  return (
    <Link href={href} aria-label={label} className="inline-flex min-h-11 items-center px-3 text-[13px] font-semibold hover:text-muted">
      {other.toUpperCase()}
    </Link>
  );
}
