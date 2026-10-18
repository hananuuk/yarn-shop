"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { addToCartAction } from "@/app/(shop)/[lang]/actions";

export function AddToCart(props: {
  productId: number;
  max: number;
  lang: "mn" | "en";
  labels: { qty: string; add: string; added: string; viewBasket: string; soldOut: string };
}) {
  const [qty, setQty] = useState(1);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();

  if (props.max <= 0) {
    return <button className="btn w-full" disabled>{props.labels.soldOut}</button>;
  }

  const add = () =>
    start(async () => {
      const r = await addToCartAction(props.productId, qty);
      setDone(r.ok);
      setError(!r.ok);
    });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center rounded-full border border-ink" role="group" aria-label={props.labels.qty}>
          <button type="button" className="size-11 text-lg disabled:opacity-30" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="−1">−</button>
          <span className="w-8 text-center font-semibold" aria-live="polite">{qty}</span>
          <button type="button" className="size-11 text-lg disabled:opacity-30" onClick={() => setQty((q) => Math.min(props.max, q + 1))} disabled={qty >= props.max} aria-label="+1">+</button>
        </div>
        <button type="button" className="btn flex-1" onClick={add} disabled={pending}>
          {pending ? "…" : props.labels.add}
        </button>
      </div>
      {done && (
        <p className="flex flex-wrap items-center gap-3 text-sm font-semibold text-ok" role="status">
          ✓ {props.labels.added}
          <Link href={`/${props.lang}/basket`} className="text-ink underline underline-offset-4">{props.labels.viewBasket}</Link>
        </p>
      )}
      {error && <p className="text-sm font-semibold text-accent" role="alert">{props.labels.soldOut}</p>}
    </div>
  );
}
