import Link from "next/link";
import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { money, type Lang } from "@/config";
import { getDict } from "@/lib/i18n";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Захиалгууд · Orders" };

export default async function OrdersPage({ params }: { params: Promise<{ lang: Lang }> }) {
  const { lang } = await params;
  const t = getDict(lang);
  const user = await requireUser(lang, `/${lang}/orders`);
  const db = await getDb();
  const orders = await db.select().from(schema.orders).where(eq(schema.orders.userId, user.id)).orderBy(desc(schema.orders.createdAt));
  return (
    <div className="pt-14">
      <h1 className="text-[clamp(44px,7.2vw,104px)] font-semibold leading-[1.02] tracking-[-0.035em]">{t.orders.title}</h1>
      {orders.length === 0 ? (
        <p className="mt-10 text-lg text-muted">{t.orders.none}</p>
      ) : (
        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-[15px]">
            <thead className="border-b border-line text-sm text-muted">
              <tr><th className="py-3 font-semibold">{t.orders.number}</th><th className="font-semibold">{t.orders.date}</th><th className="font-semibold">{t.orders.status}</th><th className="text-right font-semibold">{t.orders.total}</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="py-4"><Link href={`/${lang}/orders/${o.number}`} className="font-semibold underline underline-offset-4">{o.number}</Link></td>
                  <td>{o.createdAt.toLocaleDateString(lang === "mn" ? "mn-MN" : "en-GB")}</td>
                  <td>{t.status[o.status]}</td>
                  <td className="text-right">{money(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
