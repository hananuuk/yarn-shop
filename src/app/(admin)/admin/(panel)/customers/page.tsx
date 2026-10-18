import { desc, ilike, or, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { money } from "@/config";

export const metadata = { title: "Customers" };

export default async function Customers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const db = await getDb();
  const u = schema.users;
  const rows = await db
    .select({
      u,
      orders: sql<number>`(select count(*)::int from orders where orders.user_id = "users"."id" and paid_at is not null)`,
      spent: sql<number>`(select coalesce(sum(total),0)::int from orders where orders.user_id = "users"."id" and paid_at is not null)`,
      saved: sql<number>`(select count(*)::int from saved_products where saved_products.user_id = "users"."id")`,
    })
    .from(u)
    .where(q ? or(ilike(u.phone, `%${q}%`), ilike(u.name, `%${q}%`)) : undefined)
    .orderBy(desc(u.createdAt))
    .limit(500);
  const fmt = (d: Date) => d.toLocaleDateString("en-GB", { timeZone: "Asia/Ulaanbaatar", dateStyle: "medium" });

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      <h1 className="text-4xl font-semibold tracking-tight">Customers <span className="text-xl text-muted">{rows.length}</span></h1>
      <form className="flex gap-2">
        <label className="sr-only" htmlFor="q">Search customers</label>
        <input id="q" name="q" defaultValue={q} placeholder="Phone or name" className="field w-64" />
        <button className="btn-outline">Search</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-line text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Phone</th>
              <th className="font-semibold">Name</th>
              <th className="font-semibold">Signed up</th>
              <th className="font-semibold">Last seen</th>
              <th className="font-semibold">Paid orders</th>
              <th className="font-semibold">Spent</th>
              <th className="pr-4 font-semibold">Saved</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map(({ u: x, orders, spent, saved }) => (
              <tr key={x.id}>
                <td className="px-4 py-3 font-semibold">+976 {x.phone}{x.role === "admin" && <span className="ml-2 rounded-full bg-ink px-2 py-0.5 text-[10px] text-white">admin</span>}</td>
                <td>{x.name ?? <span className="text-muted">—</span>}</td>
                <td>{fmt(x.createdAt)}</td>
                <td>{fmt(x.lastSeenAt)}</td>
                <td className="tabular-nums">{orders}</td>
                <td className="tabular-nums">{money(spent)}</td>
                <td className="pr-4 tabular-nums">{saved}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-6 text-muted">No customers yet.</p>}
      </div>
    </div>
  );
}
