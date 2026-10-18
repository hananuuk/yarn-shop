import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { DISTRICTS, deliveryFee, money, type Lang } from "@/config";
import { getDict } from "@/lib/i18n";
import { getAnonId, requireUser } from "@/lib/auth";
import { getCart } from "@/lib/cart";
import { track } from "@/lib/events";
import { productName, colorName } from "@/lib/products";
import { CheckoutForm } from "./CheckoutForm";

export const metadata: Metadata = { title: "Захиалга · Checkout" };

export default async function CheckoutPage({ params }: { params: Promise<{ lang: Lang }> }) {
  const { lang } = await params;
  const t = getDict(lang);
  const user = await requireUser(lang, `/${lang}/checkout`);
  const cart = await getCart({ userId: user.id });
  if (cart.lines.length === 0) redirect(`/${lang}/basket`);
  await track("checkout_start", { userId: user.id, anonId: await getAnonId(), meta: { subtotal: cart.subtotal } });

  // Prefill from the customer's last order.
  const db = await getDb();
  const [last] = await db.select().from(schema.orders).where(eq(schema.orders.userId, user.id)).orderBy(desc(schema.orders.createdAt)).limit(1);
  const fee = deliveryFee();
  const c = t.checkout;

  return (
    <div className="pt-14">
      <h1 className="text-[clamp(44px,7.2vw,104px)] font-semibold leading-[1.02] tracking-[-0.035em]">{c.title}</h1>
      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <CheckoutForm
          lang={lang}
          defaults={{
            name: last?.customerName ?? user.name ?? "",
            phone: last?.phone ?? user.phone,
            district: last?.district ?? "",
            khoroo: last?.khoroo ?? "",
            address: last?.address ?? "",
          }}
          districts={DISTRICTS.map((d) => ({ id: d.id, label: d[lang] }))}
          t={{
            contact: c.contact, name: c.name, phone: c.phone, address: c.address, district: c.district, choose: c.choose,
            khoroo: c.khoroo, addressLine: c.addressLine, note: c.note, notePh: c.notePh, pay: c.pay, errors: c.errors,
          }}
        />
        <aside className="card flex h-fit flex-col gap-3 p-6">
          <h2 className="text-lg font-semibold">{c.summary}</h2>
          <ul className="flex flex-col gap-2 text-sm">
            {cart.lines.map((l) => (
              <li key={l.product.id} className="flex justify-between gap-4">
                <span>{productName(l.product, lang)}{colorName(l.product, lang) ? ` · ${colorName(l.product, lang)}` : ""} × {l.qty}</span>
                <span className="whitespace-nowrap">{money(l.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex justify-between border-t border-line pt-3"><span>{t.basket.subtotal}</span><span>{money(cart.subtotal)}</span></div>
          <div className="flex justify-between text-muted"><span>{t.basket.delivery}</span><span>{money(fee)}</span></div>
          <div className="flex justify-between border-t border-line pt-3 text-lg font-bold"><span>{t.basket.total}</span><span>{money(cart.subtotal + fee)}</span></div>
        </aside>
      </div>
    </div>
  );
}
