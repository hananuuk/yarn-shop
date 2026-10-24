import Link from "next/link";
import { and, asc, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { money } from "@/config";
import { isOnSale } from "@/lib/products";
import { quickStockAction, toggleActiveAction } from "../actions";

export const metadata = { title: "Products" };

export default async function ProductsAdmin({ searchParams }: { searchParams: Promise<{ q?: string; show?: string }> }) {
  const { q = "", show = "all" } = await searchParams;
  const db = await getDb();
  const p = schema.products;
  const where: SQL[] = [];
  if (q) where.push(or(ilike(p.nameEn, `%${q}%`), ilike(p.nameMn, `%${q}%`), ilike(p.brand, `%${q}%`), ilike(p.colorNameEn, `%${q}%`), ilike(p.colorNameMn, `%${q}%`))!);
  if (show === "out") where.push(eq(p.stock, 0));
  if (show === "sale") where.push(eq(p.isActive, true));
  if (show === "hidden") where.push(eq(p.isActive, false));
  let rows = await db.select().from(p).where(where.length ? and(...where) : undefined).orderBy(asc(p.category), desc(p.createdAt), asc(p.id));
  if (show === "sale") rows = rows.filter(isOnSale);
  const imgs = await db.select().from(schema.productImages).orderBy(asc(schema.productImages.sort));

  const filters = [
    ["all", "All"],
    ["out", "Out of stock"],
    ["sale", "On sale"],
    ["hidden", "Hidden"],
  ];

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl font-semibold tracking-tight">Products <span className="text-xl text-muted">{rows.length}</span></h1>
        <Link href="/admin/products/new" className="btn">+ Add product</Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <form className="flex gap-2">
          {show !== "all" && <input type="hidden" name="show" value={show} />}
          <label className="sr-only" htmlFor="q">Search products</label>
          <input id="q" name="q" defaultValue={q} placeholder="Search name, brand, colour" className="field w-64" />
          <button className="btn-outline">Search</button>
        </form>
        <div className="flex flex-wrap gap-1">
          {filters.map(([k, label]) => (
            <Link key={k} href={`/admin/products?show=${k}${q ? `&q=${encodeURIComponent(q)}` : ""}`} aria-current={show === k ? "true" : undefined} className={`flex min-h-10 items-center rounded-full px-4 text-sm font-semibold ${show === k ? "bg-ink text-white" : "border border-line bg-white hover:bg-cream"}`}>
              {label}
            </Link>
          ))}
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-line text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Product</th>
              <th className="font-semibold">Brand</th>
              <th className="font-semibold">Price</th>
              <th className="font-semibold">Stock</th>
              <th className="font-semibold">Shown in shop</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((x) => {
              const img = imgs.find((i) => i.productId === x.id);
              return (
                <tr key={x.id} className={x.isActive ? "" : "bg-[#FAF8F4] text-muted"}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-tile">
                        {img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={img.url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="size-6 rounded-full border border-black/10" style={{ background: x.colorHex }} />
                        )}
                      </span>
                      <span className="flex flex-col">
                        <Link href={`/admin/products/${x.id}`} className="font-semibold text-ink hover:underline">{x.nameEn}{x.colorNameEn ? ` · ${x.colorNameEn}` : ""}</Link>
                        <span className="text-xs text-muted">{x.nameMn}{x.colorNameMn ? ` · ${x.colorNameMn}` : ""} · {x.category}</span>
                      </span>
                    </div>
                  </td>
                  <td>{x.brand}</td>
                  <td className="whitespace-nowrap">
                    {isOnSale(x) ? (<><span className="font-semibold text-accent">{money(x.salePrice!)}</span> <span className="text-xs line-through">{money(x.price)}</span></>) : money(x.price)}
                  </td>
                  <td>
                    <form action={quickStockAction} className="flex items-center gap-1.5">
                      <input type="hidden" name="productId" value={x.id} />
                      <label className="sr-only" htmlFor={`s${x.id}`}>Stock for {x.nameEn}</label>
                      <input id={`s${x.id}`} name="stock" type="number" min={0} defaultValue={x.stock} className={`field min-h-9 w-20 ${x.stock === 0 ? "border-accent text-accent" : ""}`} />
                      <button className="rounded-lg px-2 py-1.5 text-xs font-semibold hover:bg-cream">Save</button>
                    </form>
                  </td>
                  <td>
                    <form action={toggleActiveAction}>
                      <input type="hidden" name="productId" value={x.id} />
                      <button className={`rounded-full px-3 py-1.5 text-xs font-bold ${x.isActive ? "bg-[#E3EFE6] text-ok" : "bg-cream text-muted"}`} aria-label={`${x.isActive ? "Hide" : "Show"} ${x.nameEn}`}>
                        {x.isActive ? "Visible" : "Hidden"}
                      </button>
                    </form>
                  </td>
                  <td className="whitespace-nowrap pr-4 text-right">
                    {x.category === "yarn" && <Link href={`/admin/products/new?from=${x.id}`} className="mr-4 font-semibold text-muted underline underline-offset-4 hover:text-ink" title="Same yarn, new colour">+ Colour</Link>}
                    <Link href={`/admin/products/${x.id}`} className="font-semibold underline underline-offset-4">Edit</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-6 text-muted">No products match.</p>}
      </div>
    </div>
  );
}
