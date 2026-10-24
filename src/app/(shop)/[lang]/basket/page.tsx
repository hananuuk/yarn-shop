import Link from "next/link";
import type { Metadata } from "next";
import { deliveryFee, money, type Lang } from "@/config";
import { getDict } from "@/lib/i18n";
import { getAnonId, getCurrentUser } from "@/lib/auth";
import { getCart } from "@/lib/cart";
import { productName, colorName } from "@/lib/products";
import { ProductImage } from "@/components/ProductImage";
import { Caterpillar, PALETTE } from "@/components/Storybook";
import { setQtyAction } from "../actions";

export const metadata: Metadata = { title: "Basket · Сагс" };

export default async function BasketPage({ params }: { params: Promise<{ lang: Lang }> }) {
  const { lang } = await params;
  const t = getDict(lang);
  const user = await getCurrentUser();
  const cart = await getCart({ userId: user?.id, anonId: await getAnonId() });
  const fee = deliveryFee();
  const blocked = cart.lines.some((l) => !l.available);

  return (
    <div className="pt-14">
      <h1 className="text-[clamp(44px,7.2vw,104px)] font-semibold leading-[1.02] tracking-[-0.035em]">{t.basket.title}</h1>

      {cart.lines.length === 0 ? (
        <div className="mt-10 flex flex-col items-start gap-6">
          <p className="text-lg">{t.basket.empty}</p>
          <div className="flex items-end gap-4">
            <svg viewBox="0 0 130 54" width="130" height="54" aria-hidden="true" className="shrink-0 overflow-visible">
              <Caterpillar x={14} y={36} seg={9} r={11} body={PALETTE.lavender} accent={PALETTE.ink} pattern="bands" arch={0.2} asleep />
            </svg>
            <span className="caption text-[21px]">{t.emptyBasketNote}</span>
          </div>
          <Link href={`/${lang}`} className="btn">{t.basket.keepShopping}</Link>
        </div>
      ) : (
        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
          <ul className="flex flex-col divide-y divide-line border-y border-line">
            {cart.lines.map((l) => {
              const name = productName(l.product, lang);
              const color = colorName(l.product, lang);
              return (
                <li key={l.product.id} className="flex flex-wrap items-center gap-5 py-5">
                  <Link href={`/${lang}/p/${l.product.slug}`} className="tile-paper flex size-24 shrink-0 items-center justify-center overflow-hidden">
                    <ProductImage seed={l.product.id} category={l.product.category} colorHex={l.product.colorHex} images={l.product.images} alt="" />
                  </Link>
                  <div className="flex min-w-48 flex-1 flex-col gap-1">
                    <Link href={`/${lang}/p/${l.product.slug}`} className="font-semibold hover:underline">{name}{color ? ` · ${color}` : ""}</Link>
                    <span className="text-sm text-muted">{l.product.brand} · {money(l.unitPrice)}</span>
                    {!l.available && <span className="text-sm font-semibold text-accent">{t.basket.unavailable} ({Math.max(l.product.stock, 0)})</span>}
                  </div>
                  <form action={setQtyAction} className="flex items-center gap-2">
                    <input type="hidden" name="lang" value={lang} />
                    <input type="hidden" name="productId" value={l.product.id} />
                    <label className="sr-only" htmlFor={`q${l.product.id}`}>{t.product.qty}</label>
                    <input id={`q${l.product.id}`} name="qty" type="number" min={0} max={99} defaultValue={l.qty} className="field w-20 text-center" />
                    <button className="btn-ghost">{t.basket.update}</button>
                  </form>
                  <form action={setQtyAction}>
                    <input type="hidden" name="lang" value={lang} />
                    <input type="hidden" name="productId" value={l.product.id} />
                    <input type="hidden" name="qty" value="0" />
                    <button className="btn-ghost text-muted">{t.basket.remove}</button>
                  </form>
                  <span className="w-28 text-right font-semibold">{money(l.lineTotal)}</span>
                </li>
              );
            })}
          </ul>

          <aside className="card flex h-fit flex-col gap-3 p-6">
            <div className="flex justify-between"><span>{t.basket.subtotal}</span><span className="font-semibold">{money(cart.subtotal)}</span></div>
            <div className="flex justify-between text-muted"><span>{t.basket.delivery} <span className="text-xs">({t.basket.deliveryNote})</span></span><span>{money(fee)}</span></div>
            <div className="mt-2 flex justify-between border-t border-line pt-4 text-lg font-bold"><span>{t.basket.total}</span><span>{money(cart.subtotal + fee)}</span></div>
            {blocked ? (
              <button className="btn mt-3" disabled>{t.basket.checkout}</button>
            ) : (
              <Link href={`/${lang}/checkout`} className="btn mt-3">{t.basket.checkout}</Link>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
