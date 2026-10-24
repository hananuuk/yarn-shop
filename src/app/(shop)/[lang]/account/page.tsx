import Link from "next/link";
import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { money, type Lang } from "@/config";
import { getDict } from "@/lib/i18n";
import { requireUser } from "@/lib/auth";
import { getProductsByIds, productName, colorName, effectivePrice } from "@/lib/products";
import { ProductImage } from "@/components/ProductImage";
import { DesignThumb } from "@/components/DesignThumb";
import { deleteDesignAction } from "../studio/actions";
import { logoutAction } from "../actions";

export const metadata: Metadata = { title: "Бүртгэл · Account" };

export default async function AccountPage({ params }: { params: Promise<{ lang: Lang }> }) {
  const { lang } = await params;
  const t = getDict(lang);
  const user = await requireUser(lang, `/${lang}/account`);
  const db = await getDb();
  const saved = await db.select().from(schema.savedProducts).where(eq(schema.savedProducts.userId, user.id)).orderBy(desc(schema.savedProducts.createdAt));
  const products = (await getProductsByIds(saved.map((s) => s.productId))).filter((p) => p.isActive);
  const designs = await db.select().from(schema.designs).where(eq(schema.designs.userId, user.id)).orderBy(desc(schema.designs.updatedAt));
  const designYarns = await getProductsByIds([...new Set(designs.flatMap((d) => d.palette))]);
  const hexOf = (id: number) => designYarns.find((p) => p.id === id)?.colorHex ?? "#cccccc";
  const ts = getDict(lang).studio;

  return (
    <div className="pt-14">
      <h1 className="text-[clamp(44px,7.2vw,104px)] font-semibold leading-[1.02] tracking-[-0.035em]">{t.account.title}</h1>
      <p className="mt-3 text-lg text-muted">+976 {user.phone}{user.name ? ` · ${user.name}` : ""}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={`/${lang}/orders`} className="btn">{t.account.orders}</Link>
        {user.role === "admin" && <Link href="/admin" className="btn-outline">{t.account.admin}</Link>}
        <form action={logoutAction}><input type="hidden" name="lang" value={lang} /><button className="btn-outline">{t.account.logout}</button></form>
      </div>

      <section id="designs" className="mt-16 scroll-mt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-3xl font-semibold tracking-tight">{ts.myDesigns}</h2>
          <Link href={`/${lang}/studio`} className="btn-ghost">{ts.newDesign}</Link>
        </div>
        {designs.length === 0 ? (
          <p className="mt-4 text-muted">{ts.noDesigns}</p>
        ) : (
          <ul className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-6">
            {designs.map((d) => (
              <li key={d.id} className="flex flex-col gap-2">
                <Link href={`/${lang}/studio?d=${d.id}`} className="tile-paper flex aspect-square items-center justify-center overflow-hidden p-4">
                  <DesignThumb width={d.width} height={d.height} cells={d.cells} colours={d.palette.map(hexOf)} size={168} />
                </Link>
                <div className="flex items-start justify-between gap-2">
                  <span className="flex min-w-0 flex-col">
                    <Link href={`/${lang}/studio?d=${d.id}`} className="truncate font-medium hover:underline">{d.name}</Link>
                    <span className="text-xs text-muted">{d.width} × {d.height} · {d.updatedAt.toLocaleDateString(lang === "mn" ? "mn-MN" : "en-GB")}</span>
                  </span>
                  <form action={deleteDesignAction}>
                    <input type="hidden" name="id" value={d.id} />
                    <button className="min-h-11 px-1 text-sm font-semibold text-muted underline underline-offset-4 hover:text-accent">{ts.delete}</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <h2 className="mt-16 text-3xl font-semibold tracking-tight">{t.account.saved}</h2>
      {products.length === 0 ? (
        <p className="mt-4 text-muted">{t.account.noSaved}</p>
      ) : (
        <ul className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-6">
          {products.map((p) => (
            <li key={p.id}>
              <Link href={`/${lang}/p/${p.slug}`} className="flex flex-col gap-2">
                <div className="tile-paper flex aspect-[3/4] items-center justify-center overflow-hidden">
                  <ProductImage seed={p.id} category={p.category} colorHex={p.colorHex} images={p.images} alt="" />
                </div>
                <span className="font-medium">{productName(p, lang)}{colorName(p, lang) ? ` · ${colorName(p, lang)}` : ""}</span>
                <span className="text-sm text-muted">{money(effectivePrice(p))}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
