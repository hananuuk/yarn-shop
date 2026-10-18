import Link from "next/link";
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { ORDER_STATUSES } from "@/db/schema";
import { DISTRICTS, money } from "@/config";
import { getDict } from "@/lib/i18n";
import { STATUS_STYLE } from "./status";

export const metadata = { title: "Orders" };
const STATUS = getDict("en").status;


export default async function OrdersAdmin({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const { status = "", q = "" } = await searchParams;
  const db = await getDb();
  const o = schema.orders;
  const where: SQL[] = [];
  if ((ORDER_STATUSES as readonly string[]).includes(status)) where.push(eq(o.status, status as never));
  if (q) where.push(or(ilike(o.number, `%${q}%`), ilike(o.phone, `%${q}%`), ilike(o.customerName, `%${q}%`))!);
  const rows = await db
    .select({ o, items: sql<number>`(select coalesce(sum(oi.qty),0)::int from order_items oi where oi.order_id = "orders"."id")` })
    .from(o)
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(o.createdAt))
    .limit(300);
  const counts = await db.select({ status: o.status, n: sql<number>`count(*)::int` }).from(o).groupBy(o.status);

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      <h1 className="text-4xl font-semibold tracking-tight">Orders</h1>
      <div className="flex flex-wrap items-center gap-3">
        <form className="flex gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <label className="sr-only" htmlFor="q">Search orders</label>
          <input id="q" name="q" defaultValue={q} placeholder="Order number, phone or name" className="field w-64" />
          <button className="btn-outline">Search</button>
        </form>
        <div className="flex flex-wrap gap-1">
          <Link href="/admin/orders" aria-current={!status ? "true" : undefined} className={`flex min-h-10 items-center rounded-full px-4 text-sm font-semibold ${!status ? "bg-ink text-white" : "border border-line bg-white hover:bg-cream"}`}>All</Link>
          {ORDER_STATUSES.map((s) => (
            <Link key={s} href={`/admin/orders?status=${s}`} aria-current={status === s ? "true" : undefined} className={`flex min-h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold ${status === s ? "bg-ink text-white" : "border border-line bg-white hover:bg-cream"}`}>
              {STATUS[s]} <span className="opacity-60">{counts.find((c) => c.status === s)?.n ?? 0}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-line text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Order</th>
              <th className="font-semibold">Placed</th>
              <th className="font-semibold">Customer</th>
              <th className="font-semibold">District</th>
              <th className="font-semibold">Items</th>
              <th className="font-semibold">Total</th>
              <th className="pr-4 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map(({ o: x, items }) => (
              <tr key={x.id}>
                <td className="px-4 py-3"><Link href={`/admin/orders/${x.id}`} className="font-semibold underline underline-offset-4">{x.number}</Link></td>
                <td className="whitespace-nowrap">{x.createdAt.toLocaleString("en-GB", { timeZone: "Asia/Ulaanbaatar", dateStyle: "medium", timeStyle: "short" })}</td>
                <td>{x.customerName}<br /><span className="text-xs text-muted">{x.phone}</span></td>
                <td>{DISTRICTS.find((d) => d.id === x.district)?.en ?? x.district}</td>
                <td className="tabular-nums">{items}</td>
                <td className="whitespace-nowrap font-semibold">{money(x.total)}</td>
                <td className="pr-4"><span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLE[x.status]}`}>{STATUS[x.status]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-6 text-muted">No orders here.</p>}
      </div>
    </div>
  );
}
