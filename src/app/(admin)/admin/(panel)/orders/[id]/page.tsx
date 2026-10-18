import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { DISTRICTS, money } from "@/config";
import { getDict } from "@/lib/i18n";
import { NEXT_STATUSES } from "@/lib/orders";
import { orderNoteAction, orderStatusAction } from "../../actions";
import { STATUS_STYLE } from "../status";

export const metadata = { title: "Order" };
const STATUS = getDict("en").status;
const ACTION_LABEL: Record<string, string> = {
  packed: "Mark as packed",
  shipping: "Hand to courier",
  delivered: "Mark as delivered",
  cancelled: "Cancel order",
};

export default async function OrderAdmin({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const [o] = await db.select().from(schema.orders).where(eq(schema.orders.id, Number(id)));
  if (!o) notFound();
  const [items, history, payments, [customer]] = await Promise.all([
    db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, o.id)),
    db.select().from(schema.orderEvents).where(eq(schema.orderEvents.orderId, o.id)).orderBy(asc(schema.orderEvents.createdAt)),
    db.select().from(schema.payments).where(eq(schema.payments.orderId, o.id)).orderBy(desc(schema.payments.createdAt)),
    db.select().from(schema.users).where(eq(schema.users.id, o.userId)),
  ]);
  const fmt = (d: Date) => d.toLocaleString("en-GB", { timeZone: "Asia/Ulaanbaatar", dateStyle: "medium", timeStyle: "short" });
  const district = DISTRICTS.find((d) => d.id === o.district);
  const next = NEXT_STATUSES[o.status];
  const address = [district ? `${district.mn} (${district.en})` : o.district, o.khoroo && `${o.khoroo}-р хороо`, o.address].filter(Boolean).join(", ");

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <Link href="/admin/orders" className="btn-ghost no-underline">← Orders</Link>
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-4xl font-semibold tracking-tight">{o.number}</h1>
        <span className={`rounded-full px-3 py-1 text-sm font-bold ${STATUS_STYLE[o.status]}`}>{STATUS[o.status]}</span>
        <span className="text-sm text-muted">placed {fmt(o.createdAt)} · {o.lang.toUpperCase()}</span>
      </div>

      {next.length > 0 && (
        <section className="card flex flex-col gap-3 p-6">
          <h2 className="text-lg font-semibold">Next step</h2>
          <div className="flex flex-wrap items-end gap-3">
            {next.map((s) => (
              <form key={s} action={orderStatusAction} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="orderId" value={o.id} />
                <input type="hidden" name="status" value={s} />
                {s !== "cancelled" && (
                  <label className="label">Note (optional)<input name="note" placeholder={s === "shipping" ? "Courier name / tracking" : ""} className="field w-64" /></label>
                )}
                <button className={s === "cancelled" ? "btn-outline border-accent text-accent" : "btn"}>{ACTION_LABEL[s]}</button>
              </form>
            ))}
          </div>
          {o.status === "pending_payment" && <p className="text-xs text-muted">This order is not paid. It moves to “Paid” automatically when the payment arrives.</p>}
          {o.paidAt && next.includes("cancelled") && <p className="text-xs text-muted">Cancelling a paid order puts the stock back. Refund the customer through your bank/QPay merchant portal.</p>}
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="text-lg font-semibold">Deliver to</h2>
          <dl className="mt-3 grid grid-cols-[110px_1fr] gap-y-2 text-sm">
            <dt className="text-muted">Name</dt><dd className="font-semibold">{o.customerName}</dd>
            <dt className="text-muted">Phone</dt><dd><a href={`tel:+976${o.phone}`} className="font-semibold underline">+976 {o.phone}</a></dd>
            <dt className="text-muted">Address</dt><dd>{address}</dd>
            {o.note && (<><dt className="text-muted">Customer note</dt><dd className="whitespace-pre-line">{o.note}</dd></>)}
            <dt className="text-muted">Account</dt><dd>+976 {customer?.phone} · since {customer ? customer.createdAt.toLocaleDateString("en-GB") : "—"}</dd>
          </dl>
        </section>

        <section className="card p-6">
          <h2 className="text-lg font-semibold">History</h2>
          <ol className="mt-3 flex flex-col gap-3 text-sm">
            {history.map((h) => (
              <li key={h.id} className="flex flex-col">
                <span className="flex flex-wrap justify-between gap-2"><strong>{STATUS[h.status] ?? h.status}</strong><span className="text-muted">{fmt(h.createdAt)}</span></span>
                <span className="text-xs text-muted">by {h.actor}{h.note ? ` · ${h.note}` : ""}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section className="card overflow-x-auto p-6">
        <h2 className="text-lg font-semibold">Items</h2>
        <table className="mt-3 w-full min-w-[480px] text-left text-sm">
          <tbody className="divide-y divide-line">
            {items.map((i) => (
              <tr key={i.id}>
                <td className="py-2.5">{i.productId ? <Link href={`/admin/products/${i.productId}`} className="hover:underline">{i.nameEn}</Link> : i.nameEn}</td>
                <td className="tabular-nums">{money(i.unitPrice)} × {i.qty}</td>
                <td className="text-right font-semibold">{money(i.lineTotal)}</td>
              </tr>
            ))}
            <tr><td className="py-2.5 text-muted">Delivery</td><td /><td className="text-right">{money(o.deliveryFee)}</td></tr>
            <tr><td className="py-2.5 font-bold">Total</td><td /><td className="text-right font-bold">{money(o.total)}</td></tr>
          </tbody>
        </table>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="text-lg font-semibold">Payment</h2>
          {payments.length === 0 ? <p className="mt-2 text-sm text-muted">No invoice yet.</p> : (
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {payments.map((p) => (
                <li key={p.id} className="flex flex-wrap justify-between gap-2">
                  <span>{p.provider === "mock" ? "Test payment" : "QPay"} · <span className="font-mono text-xs">{p.invoiceId}</span></span>
                  <span className={p.status === "paid" ? "font-bold text-ok" : "text-muted"}>{p.status}{p.paidAt ? ` · ${fmt(p.paidAt)}` : ""}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-6">
          <h2 className="text-lg font-semibold">Private note</h2>
          <form action={orderNoteAction} className="mt-3 flex flex-col gap-3">
            <input type="hidden" name="orderId" value={o.id} />
            <label className="sr-only" htmlFor="adminNote">Private note</label>
            <textarea id="adminNote" name="adminNote" rows={3} defaultValue={o.adminNote} placeholder="Only you see this" className="field py-2" />
            <button className="btn-outline self-start">Save note</button>
          </form>
        </section>
      </div>
    </div>
  );
}
