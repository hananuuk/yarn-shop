"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { checkPaymentAction } from "../../actions";

// Polls every 4 seconds while the customer pays in their bank app (up to 10 minutes).
export function PayWatcher({ number, labels }: { number: string; labels: { waiting: string; check: string } }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [tries, setTries] = useState(0);

  const check = () =>
    start(async () => {
      const r = await checkPaymentAction(number);
      if (r.paid) router.refresh();
    });

  useEffect(() => {
    if (tries > 150) return;
    const id = setTimeout(() => { check(); setTries((n) => n + 1); }, 4000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tries]);

  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-sm text-muted" role="status">
        <span className="inline-block size-2 animate-pulse rounded-full bg-accent" aria-hidden="true" /> {labels.waiting}
      </span>
      <button type="button" onClick={check} disabled={pending} className="btn-outline">{labels.check}</button>
    </div>
  );
}
