import Link from "next/link";
import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { money, type Lang } from "@/config";
import { getDict } from "@/lib/i18n";
import { requireUser } from "@/lib/auth";
import { getProductsByIds, productName, colorName, effectivePrice } from "@/lib/products";
import { ProductImage } from "@/components/ProductImage";
import { logoutAction } from "../actions";

export const metadata: Metadata = { title: "Бүртгэл · Account" };

export default async function AccountPage({ params }: { params: Promise<{ lang: Lang }> }) {
  const { lang } = await params;
  const t = getDict(lang);
  const user = await requireUser(lang, `/${lang}/account`);
  const db = await getDb();
  const saved = await db.select().from(schema.savedProducts).where(eq(schema.savedProducts.userId, user.id)).orderBy(desc(schema.savedProducts.createdAt));
  const products = (await getProductsByIds(saved.map((s) => s.productId))).filter((p) => p.isActive);

  return (
    <div className="pt-14">
      <h1 className="text-[clamp(44px,7.2vw,104px)] font-semibold leading-[1.02] tracking-[-0.035em]">{t.account.title}</h1>
      <p className="mt-3 text-lg text-muted">+976 {user.phone}{user.name ? ` · ${user.name}` : ""}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={`/${lang}/orders`} className="btn">{t.account.orders}</Link>
        {user.role === "admin" && <Link href="/admin" className="btn-outline">{t.account.admin}</Link>}
        <form action={logoutAction}><input type="hidden" name="lang" value={lang} /><button className="btn-outline">{t.account.logout}</button></form>
      </div>

      <h2 className="mt-16 text-3xl font-semibold tracking-tight">{t.account.saved}</h2>
      {products.length === 0 ? (
        <p className="mt-4 text-muted">{t.account.noSaved}</p>
      ) : (
        <ul className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-6">
          {products.map((p) => (
            <li key={p.id}>
              <Link href={`/${lang}/p/${p.slug}`} className="flex flex-col gap-2">
                <div className="flex aspect-[4/5] items-center justify-center overflow-hidden rounded-2xl bg-tile">
                  <ProductImage category={p.category} colorHex={p.colorHex} images={p.images} alt="" />
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
