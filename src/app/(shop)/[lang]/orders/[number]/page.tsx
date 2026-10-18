import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { DISTRICTS, money, type Lang } from "@/config";
import { getDict } from "@/lib/i18n";
import { requireUser } from "@/lib/auth";
import { getOrderByNumber } from "@/lib/orders";

export default async function OrderPage({ params }: { params: Promise<{ lang: Lang; number: string }> }) {
  const { lang, number } = await params;
  const t = getDict(lang);
  const user = await requireUser(lang, `/${lang}/orders/${number}`);
  const order = await getOrderByNumber(number);
  if (!order || order.userId !== user.id) notFound();
  const db = await getDb();
  const history = await db.select().from(schema.orderEvents).where(eq(schema.orderEvents.orderId, order.id)).orderBy(asc(schema.orderEvents.createdAt));
  const district = DISTRICTS.find((d) => d.id === order.district)?.[lang] ?? order.district;
  const fmt = (d: Date) => d.toLocaleString(lang === "mn" ? "mn-MN" : "en-GB", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="max-w-3xl pt-14">
      <Link href={`/${lang}/orders`} className="btn-ghost no-underline">← {t.orders.title}</Link>
      <h1 className="mt-2 text-[clamp(36px,5vw,64px)] font-semibold tracking-[-0.03em]">{number}</h1>
      <p className="mt-2 inline-flex rounded-full bg-cream px-3 py-1 text-sm font-semibold">{t.status[order.status]}</p>
      {order.status === "pending_payment" && <Link href={`/${lang}/pay/${number}`} className="btn ml-3">{t.orders.payNow}</Link>}

      <section className="mt-10">
        <h2 className="text-lg font-semibold">{t.orders.items}</h2>
        <ul className="mt-3 divide-y divide-line border-y border-line">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-4 py-3">
              <span>{lang === "mn" ? i.nameMn : i.nameEn} × {i.qty}</span>
              <span>{money(i.lineTotal)}</span>
            </li>
          ))}
          <li className="flex justify-between py-3 text-muted"><span>{t.basket.delivery}</span><span>{money(order.deliveryFee)}</span></li>
          <li className="flex justify-between py-3 font-bold"><span>{t.basket.total}</span><span>{money(order.total)}</span></li>
        </ul>
      </section>

      <section className="mt-10 grid gap-10 sm:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold">{t.orders.deliverTo}</h2>
          <p className="mt-3 leading-relaxed">
            {order.customerName}<br />{order.phone}<br />{district}{order.khoroo ? `, ${order.khoroo}` : ""}<br />{order.address}
          </p>
        </div>
        <div>
          <h2 className="text-lg font-semibold">{t.orders.timeline}</h2>
          <ol className="mt-3 flex flex-col gap-2 text-sm">
            {history.map((h) => (
              <li key={h.id} className="flex justify-between gap-4"><span className="font-semibold">{t.status[h.status] ?? h.status}</span><span className="text-muted">{fmt(h.createdAt)}</span></li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
