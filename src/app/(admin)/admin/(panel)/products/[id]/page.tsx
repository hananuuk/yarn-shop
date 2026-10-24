import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { COLOR_FAMILIES, MATERIALS } from "@/config";
import { getProductById, listBrands, listColourways } from "@/lib/products";
import { ProductForm } from "../ProductForm";
import { deleteImageAction, makeMainImageAction, moveImageAction, saveCaptionsAction } from "../../actions";

export const metadata = { title: "Edit product" };

export default async function EditProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const { saved } = await searchParams;
  const p = await getProductById(Number(id));
  if (!p) notFound();
  const brands = [...new Set([...(await listBrands("yarn")), ...(await listBrands("supplies"))])];

  const db = await getDb();
  const e = schema.events;
  const [[views], [saves], [sold]] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(e).where(and(eq(e.type, "product_view"), eq(e.productId, p.id))),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.savedProducts).where(eq(schema.savedProducts.productId, p.id)),
    db
      .select({ n: sql<number>`coalesce(sum(${schema.orderItems.qty}), 0)::int` })
      .from(schema.orderItems)
      .innerJoin(schema.orders, eq(schema.orders.id, schema.orderItems.orderId))
      .where(and(eq(schema.orderItems.productId, p.id), sql`${schema.orders.paidAt} is not null`)),
  ]);
  const s = (v: number | null) => (v == null ? "" : String(v));
  const colourways = p.category === "yarn" ? await listColourways(p, true) : [];

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <Link href="/admin/products" className="btn-ghost no-underline">← Products</Link>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl font-semibold tracking-tight">{p.nameEn}{p.colorNameEn ? ` · ${p.colorNameEn}` : ""}</h1>
        <Link href={`/mn/p/${p.slug}`} className="btn-ghost">View in shop ↗</Link>
      </div>
      <div className="flex flex-wrap gap-3 text-sm">
        <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-line"><strong>{views.n}</strong> views</span>
        <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-line"><strong>{saves.n}</strong> saves</span>
        <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-line"><strong>{sold.n}</strong> sold</span>
      </div>
      {p.category === "yarn" && (
        <section className="card flex flex-col gap-3 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Colours of {p.brand} {p.nameEn} ({colourways.length})</h2>
            <Link href={`/admin/products/new?from=${p.id}`} className="btn-outline">+ Add another colour</Link>
          </div>
          <ul className="flex flex-wrap gap-2">
            {colourways.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/admin/products/${c.id}`}
                  aria-current={c.id === p.id ? "page" : undefined}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm ring-1 ${c.id === p.id ? "font-semibold ring-ink" : "ring-line hover:bg-cream"}`}
                >
                  <span className="size-4 rounded-full border border-black/10" style={{ background: c.colorHex }} />
                  {c.colorNameEn || c.colorNameMn}
                  <span className={`text-xs ${c.stock > 0 ? "text-muted" : "text-accent"}`}>{c.stock}</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">Colours are grouped by the same brand and English name. Shoppers see them as colour buttons on the product page.</p>
        </section>
      )}
      {saved && <p className="rounded-xl bg-[#E3EFE6] p-4 text-sm font-semibold text-ok" role="status">Saved.</p>}

      {p.images.length > 0 && (
        <section className="card flex flex-col gap-4 p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold">Photos ({p.images.length})</h2>
            <p className="text-xs text-muted">The main photo shows in the catalog and first in the gallery. Shoppers swipe through the rest in this order.</p>
          </div>
          <form id="captions" action={saveCaptionsAction}>
            <input type="hidden" name="productId" value={p.id} />
          </form>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {p.images.map((img, i) => (
              <li key={img.id} className="flex flex-col gap-2 rounded-xl border border-line p-3">
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" className={`aspect-[4/5] w-full rounded-lg bg-tile object-cover ${i === 0 ? "ring-2 ring-ink" : ""}`} />
                  <span className="absolute left-2 top-2 rounded-full bg-white px-2 py-0.5 text-xs font-bold">{i === 0 ? "Main" : `#${i + 1}`}</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <form action={moveImageAction}>
                    <input type="hidden" name="productId" value={p.id} />
                    <input type="hidden" name="imageId" value={img.id} />
                    <input type="hidden" name="dir" value="-1" />
                    <button disabled={i === 0} className="font-semibold underline disabled:opacity-30" aria-label="Move left">←</button>
                  </form>
                  <form action={moveImageAction}>
                    <input type="hidden" name="productId" value={p.id} />
                    <input type="hidden" name="imageId" value={img.id} />
                    <input type="hidden" name="dir" value="1" />
                    <button disabled={i === p.images.length - 1} className="font-semibold underline disabled:opacity-30" aria-label="Move right">→</button>
                  </form>
                  {i !== 0 && (
                    <form action={makeMainImageAction}>
                      <input type="hidden" name="productId" value={p.id} />
                      <input type="hidden" name="imageId" value={img.id} />
                      <button className="font-semibold underline">Make main</button>
                    </form>
                  )}
                  <form action={deleteImageAction} className="ml-auto">
                    <input type="hidden" name="productId" value={p.id} />
                    <input type="hidden" name="imageId" value={img.id} />
                    <button className="font-semibold text-accent underline">Delete</button>
                  </form>
                </div>
                <label className="label">Caption (MN)
                  <input form="captions" name={`captionMn_${img.id}`} defaultValue={img.captionMn} maxLength={140} placeholder="Утасны ойрын зураг" className="field" />
                </label>
                <label className="label">Caption (EN)
                  <input form="captions" name={`captionEn_${img.id}`} defaultValue={img.captionEn} maxLength={140} placeholder="Close-up of the strand" className="field" />
                </label>
              </li>
            ))}
          </ul>
          <button form="captions" className="btn self-start">Save captions</button>
        </section>
      )}

      <ProductForm
        brands={brands}
        materials={[...MATERIALS]}
        families={[...COLOR_FAMILIES]}
        values={{
          id: p.id, category: p.category, brand: p.brand, nameMn: p.nameMn, nameEn: p.nameEn, colorNameMn: p.colorNameMn,
          colorNameEn: p.colorNameEn, colorHex: p.colorHex, colorFamily: p.colorFamily, material: p.material ?? "wool",
          needleMinMm: s(p.needleMinMm), needleMaxMm: s(p.needleMaxMm), weightG: s(p.weightG), lengthM: s(p.lengthM),
          descriptionMn: p.descriptionMn, descriptionEn: p.descriptionEn,
          weightTolG: s(p.weightTolG), lengthTolM: s(p.lengthTolM), compositionMn: p.compositionMn, compositionEn: p.compositionEn,
          gaugeStitches: s(p.gaugeStitches), gaugeRows: s(p.gaugeRows), gaugeNeedleMm: s(p.gaugeNeedleMm),
          hookMinMm: s(p.hookMinMm), hookMaxMm: s(p.hookMaxMm), manufacturer: p.manufacturer, originMn: p.originMn, originEn: p.originEn, price: String(p.price), salePrice: s(p.salePrice),
          stock: String(p.stock), isActive: p.isActive, isNew: p.isNew,
        }}
      />
    </div>
  );
}
