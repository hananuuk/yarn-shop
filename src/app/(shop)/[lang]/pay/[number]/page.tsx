import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import QRCode from "qrcode";
import { money, type Lang } from "@/config";
import { getDict } from "@/lib/i18n";
import { requireUser } from "@/lib/auth";
import { createInvoiceForOrder, getLatestPayment, getOrderByNumber } from "@/lib/orders";
import { getPayments } from "@/lib/payments";
import type { Invoice } from "@/lib/payments/types";
import { simulatePaymentAction } from "../../actions";
import { PayWatcher } from "./PayWatcher";

export const metadata: Metadata = { title: "Төлбөр · Payment" };

export default async function PayPage({ params }: { params: Promise<{ lang: Lang; number: string }> }) {
  const { lang, number } = await params;
  const t = getDict(lang);
  const user = await requireUser(lang, `/${lang}/pay/${number}`);
  const order = await getOrderByNumber(number);
  if (!order || (order.userId !== user.id && user.role !== "admin")) notFound();

  if (order.status !== "pending_payment") {
    const ok = order.status !== "cancelled";
    return (
      <div className="mx-auto max-w-xl pt-16 text-center">
        <div className={`mx-auto flex size-16 items-center justify-center rounded-full text-3xl text-white ${ok ? "bg-ok" : "bg-muted"}`} aria-hidden="true">{ok ? "✓" : "×"}</div>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight">{ok ? t.pay.paid : t.status.cancelled}</h1>
        {ok && <p className="mt-3 text-muted">{t.pay.paidNote}</p>}
        <Link href={`/${lang}/orders/${number}`} className="btn mt-8">{t.pay.viewOrder}</Link>
      </div>
    );
  }

  const provider = getPayments();
  let payment: Awaited<ReturnType<typeof getLatestPayment>> = await getLatestPayment(order.id);
  if (!payment || payment.provider !== provider.name) payment = await createInvoiceForOrder(order.id);
  const inv = (payment?.data ?? {}) as Invoice;
  const qrSrc = inv.qrImage
    ? `data:image/png;base64,${inv.qrImage}`
    : inv.qrText
      ? await QRCode.toDataURL(inv.qrText, { margin: 1, width: 480 })
      : null;

  return (
    <div className="mx-auto max-w-xl pt-14">
      <h1 className="text-[clamp(32px,4.4vw,52px)] font-semibold leading-tight tracking-[-0.03em]">{t.pay.title(number)}</h1>
      <p className="mt-3 text-lg">{t.pay.amount}: <strong>{money(order.total)}</strong></p>

      {provider.isTest && (
        <div className="mt-6 rounded-xl border border-accent/40 bg-cream p-4 text-sm">
          <strong className="text-accent">{t.pay.testMode}.</strong> {t.pay.testNote}
        </div>
      )}

      <div className="mt-8 flex flex-col items-center gap-4 rounded-2xl bg-tile p-8">
        {qrSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrSrc} alt="QPay QR" width={240} height={240} className="rounded-lg bg-white p-2" />
        )}
        <p className="text-center text-[15px]">{t.pay.scan}</p>
      </div>

      {inv.bankLinks && inv.bankLinks.length > 0 && (
        <div className="mt-6">
          <p className="mb-3 text-sm font-semibold">{t.pay.orBank}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {inv.bankLinks.map((b) => (
              <a key={b.link} href={b.link} className="flex min-h-11 items-center gap-2 rounded-xl border border-line px-3 text-sm hover:bg-cream">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {b.logo && <img src={b.logo} alt="" width={24} height={24} className="rounded" />}
                {b.name}
              </a>
            ))}
          </div>
        </div>
      )}

      <PayWatcher number={number} labels={{ waiting: t.pay.waiting, check: t.pay.check }} />

      {provider.isTest && (
        <form action={simulatePaymentAction} className="mt-4">
          <input type="hidden" name="lang" value={lang} />
          <input type="hidden" name="number" value={number} />
          <button className="btn w-full bg-accent">{t.pay.simulate}</button>
        </form>
      )}
    </div>
  );
}
