import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { and, desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { money, type Lang } from "@/config";
import { getDict } from "@/lib/i18n";
import { getAnonId, getCurrentUser } from "@/lib/auth";
import { track } from "@/lib/events";
import { getProductBySlug, listColourways, productName, colorName, needleLabel, mmRange, isOnSale, effectivePrice } from "@/lib/products";
import { ProductGallery } from "@/components/ProductGallery";
import { AddToCart } from "@/components/AddToCart";
import { toggleSaveAction, reviewAction } from "../../actions";

type Props = { params: Promise<{ lang: Lang; slug: string }>; searchParams: Promise<{ reviewed?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  const p = await getProductBySlug(slug);
  return { title: p ? `${productName(p, lang)}${colorName(p, lang) ? " · " + colorName(p, lang) : ""}` : undefined };
}

export default async function ProductPage({ params, searchParams }: Props) {
  const { lang, slug } = await params;
  const { reviewed } = await searchParams;
  const t = getDict(lang);
  const p = await getProductBySlug(slug);
  if (!p || !p.isActive) notFound();

  const user = await getCurrentUser();
  await track("product_view", { userId: user?.id, anonId: await getAnonId(), productId: p.id });

  const db = await getDb();
  const saved = user
    ? (await db.select().from(schema.savedProducts).where(and(eq(schema.savedProducts.userId, user.id), eq(schema.savedProducts.productId, p.id)))).length > 0
    : false;
  const reviews = await db
    .select({ r: schema.reviews, name: schema.users.name })
    .from(schema.reviews)
    .innerJoin(schema.users, eq(schema.users.id, schema.reviews.userId))
    .where(eq(schema.reviews.productId, p.id))
    .orderBy(desc(schema.reviews.createdAt));
  const avg = reviews.length ? reviews.reduce((s, x) => s + x.r.rating, 0) / reviews.length : 0;

  const name = productName(p, lang);
  const color = colorName(p, lang);
  const sale = isOnSale(p);
  const description = lang === "mn" ? p.descriptionMn : p.descriptionEn;
  const tp = t.product;
  const tol = (v: number | null, unit: string) => (v ? ` ± ${v} ${unit}` : "");
  const composition = (lang === "mn" ? p.compositionMn : p.compositionEn) || (p.material ? t.materials[p.material] : "");
  const origin = lang === "mn" ? p.originMn : p.originEn;
  const facts: [string, string][] = [
    [tp.brand, p.brand],
    [tp.colour, color],
    [tp.blend, composition],
    [tp.weight, p.weightG ? `${p.weightG} ${tp.g}${tol(p.weightTolG, tp.g)}` : ""],
    [tp.length, p.lengthM ? `${p.lengthM} ${tp.m}${tol(p.lengthTolM, tp.m)}` : ""],
    [p.category === "yarn" ? tp.needles : tp.needle, needleLabel(p, lang)],
    [tp.hook, mmRange(p.hookMinMm, p.hookMaxMm, lang)],
    [tp.gauge, p.gaugeStitches && p.gaugeRows ? tp.gaugeText(p.gaugeStitches, p.gaugeRows, mmRange(p.gaugeNeedleMm, null, lang)) : ""],
    [tp.manufacturer, p.manufacturer],
    [tp.origin, origin],
  ].filter(([, v]) => v) as [string, string][];
  const colourways = await listColourways(p);
  const paragraphs = description.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
  const back = `/${lang}/p/${p.slug}`;

  return (
    <div className="pt-6">
      <Link href={`/${lang}${p.category === "supplies" ? "?cat=supplies" : ""}`} className="btn-ghost no-underline">← {t.product.back}</Link>

      <div className="mt-4 grid gap-10 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:gap-16">
        <ProductGallery
          images={p.images.map((img) => ({
            id: img.id,
            url: img.url,
            caption: (lang === "mn" ? img.captionMn || img.captionEn : img.captionEn || img.captionMn) ?? "",
          }))}
          category={p.category}
          colorHex={p.colorHex}
          alt={`${name}${color ? ", " + color : ""}`}
          labels={{ prev: tp.prevPhoto, next: tp.nextPhoto, photo: tp.photo }}
        />

        <div className="flex flex-col gap-6 md:sticky md:top-6 md:self-start">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-muted">{p.brand}</span>
            <h1 className="text-[clamp(34px,4.4vw,56px)] font-semibold leading-[1.05] tracking-[-0.03em]">
              {name}
              {color && <span className="block text-accent">{color}</span>}
            </h1>
            {reviews.length > 0 && (
              <a href="#reviews" className="text-sm text-muted underline-offset-4 hover:underline">
                {"★".repeat(Math.round(avg))}{"☆".repeat(5 - Math.round(avg))} · {reviews.length} {t.product.reviews.toLowerCase()}
              </a>
            )}
          </div>

          <div className="flex items-baseline gap-3 text-2xl font-semibold">
            {sale && <span className="text-lg font-medium text-[#7A7A7A] line-through">{money(p.price)}</span>}
            <span className={sale ? "text-accent" : ""}>{money(effectivePrice(p))}</span>
          </div>

          {colourways.length > 1 && (
            <div className="flex flex-col gap-3">
              <p className="text-sm"><span className="text-muted">{tp.colour}:</span> <strong>{color}</strong> <span className="text-muted">· {tp.colours(colourways.length)}</span></p>
              <ul className="flex flex-wrap gap-2.5">
                {colourways.map((c) => {
                  const cName = lang === "mn" ? c.colorNameMn : c.colorNameEn;
                  const current = c.id === p.id;
                  return (
                    <li key={c.id}>
                      <Link
                        href={`/${lang}/p/${c.slug}`}
                        aria-label={cName}
                        aria-current={current ? "true" : undefined}
                        title={cName}
                        scroll={false}
                        className={`flex size-11 items-center justify-center rounded-full ${current ? "ring-2 ring-ink ring-offset-2" : "hover:ring-2 hover:ring-line hover:ring-offset-2"}`}
                      >
                        <span className={`size-9 rounded-full border border-black/10 ${c.stock <= 0 ? "opacity-40" : ""}`} style={{ background: c.colorHex }} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <p className={`text-sm font-semibold ${p.stock > 0 ? (p.stock <= 5 ? "text-accent" : "text-ok") : "text-muted"}`}>
            {p.stock > 0 ? t.product.inStock(p.stock) : t.product.soldOut}
          </p>

          <AddToCart
            productId={p.id}
            max={p.stock}
            lang={lang}
            labels={{ qty: t.product.qty, add: t.product.add, added: t.product.added, viewBasket: t.product.viewBasket, soldOut: t.product.soldOut }}
          />

          <form action={toggleSaveAction}>
            <input type="hidden" name="lang" value={lang} />
            <input type="hidden" name="productId" value={p.id} />
            <input type="hidden" name="back" value={back} />
            <button className="btn-outline w-full" aria-pressed={saved}>
              <span aria-hidden="true">{saved ? "♥" : "♡"}</span> {user ? (saved ? t.product.saved : t.product.save) : t.product.loginToSave}
            </button>
          </form>

          {p.category === "yarn" && (
            <Link href={`/${lang}/studio?y=${p.id}`} className="btn-ghost self-start">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18" /></svg>
              {tp.tryStudio}
            </Link>
          )}

          {paragraphs.length > 0 && (
            <div className="flex flex-col gap-3 text-[15px] leading-relaxed text-[#3E3E3E]">
              {paragraphs.map((para, i) => <p key={i} className="whitespace-pre-line">{para}</p>)}
            </div>
          )}

          {facts.length > 0 && (
            <section aria-labelledby="about-yarn" className="rounded-2xl bg-cream p-6">
              <h2 id="about-yarn" className="border-b-2 border-ink pb-3 text-lg font-bold tracking-tight">{p.category === "yarn" ? tp.about : name}</h2>
              <dl className="divide-y divide-dashed divide-[#D9D1C3] text-[15px]">
                {facts.map(([k, v]) => (
                  <div key={k} className="flex flex-wrap justify-between gap-x-6 gap-y-0.5 py-3">
                    <dt className="text-muted">{k}</dt>
                    <dd className="text-right font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>
      </div>

      <section id="reviews" className="mt-24 max-w-3xl scroll-mt-6">
        <h2 className="text-3xl font-semibold tracking-tight">{t.product.reviews}</h2>
        {reviewed && <p className="mt-4 rounded-xl bg-cream p-4 text-sm font-semibold" role="status">{t.product.reviewThanks}</p>}
        {reviews.length === 0 && <p className="mt-4 text-muted">{t.product.noReviews}</p>}
        <ul className="mt-6 flex flex-col gap-6">
          {reviews.map(({ r, name: who }) => (
            <li key={r.id} className="border-b border-line pb-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-semibold">{who || "—"}</span>
                <span className="text-sm text-muted">{r.createdAt.toLocaleDateString(lang === "mn" ? "mn-MN" : "en-GB")}</span>
              </div>
              <div className="mt-1 text-accent" aria-label={`${r.rating}/5`}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</div>
              <p className="mt-2 whitespace-pre-line leading-relaxed">{r.body}</p>
              {r.adminReply && (
                <div className="mt-3 rounded-xl bg-cream p-4 text-sm">
                  <span className="font-semibold">{t.product.shopReply}:</span> <span className="whitespace-pre-line">{r.adminReply}</span>
                </div>
              )}
            </li>
          ))}
        </ul>

        <div className="mt-8">
          {user ? (
            <form action={reviewAction} className="card flex flex-col gap-4 p-6">
              <h3 className="text-lg font-semibold">{t.product.writeReview}</h3>
              <input type="hidden" name="lang" value={lang} />
              <input type="hidden" name="slug" value={p.slug} />
              <input type="hidden" name="productId" value={p.id} />
              <label className="label">
                {t.product.rating}
                <select name="rating" defaultValue="5" className="field max-w-40">
                  {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{"★".repeat(n)} {n}/5</option>)}
                </select>
              </label>
              <label className="label">
                <span className="sr-only">{t.product.writeReview}</span>
                <textarea name="body" required minLength={3} maxLength={2000} rows={4} placeholder={t.product.reviewPh} className="field py-2" />
              </label>
              <button className="btn self-start">{t.product.submitReview}</button>
            </form>
          ) : (
            <Link href={`/${lang}/login?next=${encodeURIComponent(back + "#reviews")}`} className="btn-outline">{t.product.loginToReview}</Link>
          )}
        </div>
      </section>
    </div>
  );
}
