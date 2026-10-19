import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { COLOR_FAMILIES, MATERIALS } from "@/config";
import { getProductById, listBrands } from "@/lib/products";
import { ProductForm } from "../ProductForm";
import { deleteImageAction, makeMainImageAction } from "../../actions";

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
      {saved && <p className="rounded-xl bg-[#E3EFE6] p-4 text-sm font-semibold text-ok" role="status">Saved.</p>}

      {p.images.length > 0 && (
        <section className="card flex flex-col gap-3 p-6">
          <h2 className="text-lg font-semibold">Photos</h2>
          <p className="text-xs text-muted">The first photo is shown in the catalog.</p>
          <ul className="flex flex-wrap gap-4">
            {p.images.map((img, i) => (
              <li key={img.id} className="flex w-32 flex-col gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className={`aspect-[4/5] w-full rounded-xl object-cover ${i === 0 ? "ring-2 ring-ink" : ""}`} />
                <div className="flex justify-between text-xs">
                  {i === 0 ? <span className="font-bold">Main</span> : (
                    <form action={makeMainImageAction}>
                      <input type="hidden" name="productId" value={p.id} />
                      <input type="hidden" name="imageId" value={img.id} />
                      <button className="font-semibold underline">Make main</button>
                    </form>
                  )}
                  <form action={deleteImageAction}>
                    <input type="hidden" name="productId" value={p.id} />
                    <input type="hidden" name="imageId" value={img.id} />
                    <button className="font-semibold text-accent underline">Delete</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
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
