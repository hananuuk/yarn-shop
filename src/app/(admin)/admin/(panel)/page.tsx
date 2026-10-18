import Link from "next/link";
import { and, asc, desc, eq, gte, inArray, isNotNull, lte, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { money } from "@/config";

export const metadata = { title: "Dashboard" };

const RANGES = [7, 30, 90] as const;
const FUNNEL = [
  { type: "product_view", label: "Viewed a yarn" },
  { type: "add_to_cart", label: "Added to basket" },
  { type: "checkout_start", label: "Started checkout" },
  { type: "order_paid", label: "Paid" },
] as const;

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days: d } = await searchParams;
  const days = RANGES.includes(Number(d) as 7) ? Number(d) : 30;
  const since = new Date(Date.now() - days * 86400_000);
  const db = await getDb();
  const o = schema.orders;
  const e = schema.events;
  const p = schema.products;

  const [[signups], [usersTotal], [sales], statusCounts, funnelRows, daily, viewed, saved, sold, lowStock] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(schema.users).where(gte(schema.users.createdAt, since)),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.users),
    db.select({ n: sql<number>`count(*)::int`, revenue: sql<number>`coalesce(sum(${o.total}), 0)::int` }).from(o).where(and(isNotNull(o.paidAt), gte(o.paidAt, since))),
    db.select({ status: o.status, n: sql<number>`count(*)::int` }).from(o).groupBy(o.status),
    db
      .select({ type: e.type, n: sql<number>`count(distinct coalesce(${e.userId}::text, ${e.anonId}))::int` })
      .from(e)
      .where(and(gte(e.createdAt, since), inArray(e.type, FUNNEL.map((f) => f.type))))
      .groupBy(e.type),
    db
      .select({
        day: sql<string>`to_char(${o.paidAt} at time zone 'Asia/Ulaanbaatar', 'YYYY-MM-DD')`,
        revenue: sql<number>`sum(${o.total})::int`,
        n: sql<number>`count(*)::int`,
      })
      .from(o)
      .where(and(isNotNull(o.paidAt), gte(o.paidAt, since)))
      .groupBy(sql`1`)
      .orderBy(sql`1`),
    db
      .select({ id: p.id, name: p.nameEn, color: p.colorNameEn, n: sql<number>`count(*)::int` })
      .from(e)
      .innerJoin(p, eq(p.id, e.productId))
      .where(and(eq(e.type, "product_view"), gte(e.createdAt, since)))
      .groupBy(p.id, p.nameEn, p.colorNameEn)
      .orderBy(desc(sql`count(*)`))
      .limit(6),
    db
      .select({ id: p.id, name: p.nameEn, color: p.colorNameEn, n: sql<number>`count(*)::int` })
      .from(schema.savedProducts)
      .innerJoin(p, eq(p.id, schema.savedProducts.productId))
      .groupBy(p.id, p.nameEn, p.colorNameEn)
      .orderBy(desc(sql`count(*)`))
      .limit(6),
    db
      .select({ id: p.id, name: p.nameEn, color: p.colorNameEn, n: sql<number>`sum(${schema.orderItems.qty})::int` })
      .from(schema.orderItems)
      .innerJoin(o, eq(o.id, schema.orderItems.orderId))
      .innerJoin(p, eq(p.id, schema.orderItems.productId))
      .where(and(isNotNull(o.paidAt), gte(o.paidAt, since)))
      .groupBy(p.id, p.nameEn, p.colorNameEn)
      .orderBy(desc(sql`sum(${schema.orderItems.qty})`))
      .limit(6),
    db.select().from(p).where(and(eq(p.isActive, true), lte(p.stock, 5))).orderBy(asc(p.stock)).limit(8),
  ]);

  const count = (s: string) => statusCounts.find((r) => r.status === s)?.n ?? 0;
  const funnel = FUNNEL.map((f) => ({ ...f, n: funnelRows.find((r) => r.type === f.type)?.n ?? 0 }));
  const top = Math.max(1, ...funnel.map((f) => f.n));

  // Fill every day in the range so gaps show as zero.
  const dayKeys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const dt = new Date(Date.now() - i * 86400_000 + 8 * 3600_000); // UB is UTC+8
    dayKeys.push(dt.toISOString().slice(0, 10));
  }
  const series = dayKeys.map((k) => ({ day: k, revenue: daily.find((r) => r.day === k)?.revenue ?? 0, n: daily.find((r) => r.day === k)?.n ?? 0 }));
  const maxRev = Math.max(1, ...series.map((s) => s.revenue));

  return (
    <div className="flex max-w-6xl flex-col gap-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl font-semibold tracking-tight">Dashboard</h1>
        <nav aria-label="Date range" className="flex gap-1 rounded-full border border-line bg-white p-1">
          {RANGES.map((r) => (
            <Link key={r} href={`/admin?days=${r}`} aria-current={r === days ? "true" : undefined} className={`flex min-h-10 items-center rounded-full px-4 text-sm font-semibold ${r === days ? "bg-ink text-white" : "hover:bg-cream"}`}>
              {r} days
            </Link>
          ))}
        </nav>
      </div>

      {/* To-do */}
      <div className="flex flex-wrap gap-3">
        <TodoLink href="/admin/orders?status=paid" n={count("paid")} label="paid orders to pack" strong />
        <TodoLink href="/admin/orders?status=packed" n={count("packed")} label="packed, waiting for delivery" />
        <TodoLink href="/admin/orders?status=pending_payment" n={count("pending_payment")} label="waiting for payment" />
      </div>

      {/* Headline numbers */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4">
        <Stat label="Revenue" value={money(sales.revenue)} sub={`last ${days} days, paid orders`} />
        <Stat label="Paid orders" value={String(sales.n)} sub={sales.n ? `avg ${money(Math.round(sales.revenue / sales.n))}` : "—"} />
        <Stat label="New sign-ups" value={String(signups.n)} sub={`${usersTotal.n} ${usersTotal.n === 1 ? "account" : "accounts"} in total`} />
        <Stat label="Visitors → paid" value={funnel[0].n ? `${((funnel[3].n / funnel[0].n) * 100).toFixed(1)}%` : "—"} sub="of people who viewed a yarn" />
      </div>

      {/* Revenue per day */}
      <section className="card p-6">
        <h2 className="text-lg font-semibold">Revenue per day</h2>
        <p className="text-sm text-muted">Paid orders, Ulaanbaatar time. Hover a bar for the day.</p>
        <div className="mt-6 flex h-44 items-end gap-[2px]" role="img" aria-label={`Revenue per day for the last ${days} days`}>
          {series.map((s) => (
            <div key={s.day} className="group relative flex h-full flex-1 items-end">
              <div
                className="w-full rounded-t-[4px] bg-ink transition-opacity group-hover:opacity-70"
                style={{ height: s.revenue ? `${Math.max(2, (s.revenue / maxRev) * 100)}%` : "1px", background: s.revenue ? undefined : "#E4DED3" }}
              />
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-3 py-2 text-xs text-white group-hover:block">
                {s.day}<br /><strong>{money(s.revenue)}</strong> · {s.n} orders
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted"><span>{series[0].day}</span><span>{series[series.length - 1].day}</span></div>
      </section>

      {/* Funnel */}
      <section className="card p-6">
        <h2 className="text-lg font-semibold">Where people drop off</h2>
        <p className="text-sm text-muted">Unique people (or devices, before they log in) who reached each step in the last {days} days.</p>
        <ol className="mt-6 flex flex-col gap-4">
          {funnel.map((f, i) => {
            const prev = i > 0 ? funnel[i - 1].n : 0;
            const drop = i > 0 && prev > 0 ? Math.round((1 - f.n / prev) * 100) : null;
            return (
              <li key={f.type} className="grid grid-cols-[150px_1fr_auto] items-center gap-4 text-sm">
                <span className="font-semibold">{f.label}</span>
                <div className="h-7 rounded-[4px] bg-cream">
                  <div className="h-full rounded-[4px] bg-ink" style={{ width: `${(f.n / top) * 100}%`, minWidth: f.n ? 4 : 0 }} />
                </div>
                <span className="w-36 text-right tabular-nums">
                  <strong>{f.n}</strong>
                  {drop !== null && <span className="text-muted"> · {drop > 0 ? `−${drop}%` : "0%"}</span>}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <TopList title="Most viewed" unit="views" rows={viewed} />
        <TopList title="Most saved" unit="saves" rows={saved} note="all time" />
        <TopList title="Best sellers" unit="sold" rows={sold} />
      </div>

      <section className="card p-6">
        <h2 className="text-lg font-semibold">Low stock</h2>
        {lowStock.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Nothing at 5 or below.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {lowStock.map((x) => (
              <li key={x.id} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                <Link href={`/admin/products/${x.id}`} className="font-semibold hover:underline">{x.nameEn}{x.colorNameEn ? ` · ${x.colorNameEn}` : ""}</Link>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${x.stock === 0 ? "bg-accent text-white" : "bg-cream"}`}>{x.stock === 0 ? "Out of stock" : `${x.stock} left`}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="card flex flex-col gap-1 p-5">
      <span className="text-sm font-semibold text-muted">{label}</span>
      <span className="text-3xl font-semibold tracking-tight tabular-nums">{value}</span>
      <span className="text-xs text-muted">{sub}</span>
    </div>
  );
}

function TodoLink({ href, n, label, strong }: { href: string; n: number; label: string; strong?: boolean }) {
  return (
    <Link href={href} className={`flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm ${strong && n > 0 ? "border-accent bg-accent text-white" : "border-line bg-white hover:bg-cream"}`}>
      <strong className="tabular-nums">{n}</strong> {label}
    </Link>
  );
}

function TopList({ title, unit, rows, note }: { title: string; unit: string; rows: { id: number; name: string; color: string; n: number }[]; note?: string }) {
  return (
    <section className="card p-6">
      <h2 className="text-lg font-semibold">{title} {note && <span className="text-sm font-normal text-muted">({note})</span>}</h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No data yet.</p>
      ) : (
        <ol className="mt-3 flex flex-col gap-2 text-sm">
          {rows.map((r, i) => (
            <li key={r.id} className="flex justify-between gap-3">
              <Link href={`/admin/products/${r.id}`} className="hover:underline"><span className="text-muted">{i + 1}.</span> {r.name}{r.color ? ` · ${r.color}` : ""}</Link>
              <span className="whitespace-nowrap tabular-nums"><strong>{r.n}</strong> {unit}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
