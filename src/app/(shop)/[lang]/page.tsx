import Link from "next/link";
import { Suspense } from "react";
import { NEEDLE_GROUPS, money, type Lang, type NeedleGroup } from "@/config";
import { getDict } from "@/lib/i18n";
import { listBrands, listMaterials, listProducts, productName, colorName, needleLabel, isOnSale, effectivePrice } from "@/lib/products";
import { ProductImage } from "@/components/ProductImage";
import { CatalogFilters } from "@/components/CatalogFilters";
import { PICK_COLORS, type Pick } from "@/lib/picks";

const DIMS = ["brand", "material", "needle"] as const;

function parsePicks(f: string | undefined): Pick[] {
  if (!f) return [];
  const seen = new Set<string>();
  const out: Pick[] = [];
  for (const part of f.split("|")) {
    const i = part.indexOf(":");
    if (i < 1) continue;
    const dim = part.slice(0, i);
    let value = part.slice(i + 1);
    try { value = decodeURIComponent(value); } catch {}
    if (!(DIMS as readonly string[]).includes(dim) || seen.has(dim) || !value) continue;
    seen.add(dim);
    out.push({ dim, value });
  }
  return out;
}

export default async function Catalog({
  params,
  searchParams,
}: {
  params: Promise<{ lang: Lang }>;
  searchParams: Promise<{ cat?: string; f?: string; sort?: string }>;
}) {
  const { lang } = await params;
  const sp = await searchParams;
  const t = getDict(lang);
  const category = sp.cat === "supplies" ? "supplies" : "yarn";
  const sort = sp.sort === "low" || sp.sort === "high" ? sp.sort : "new";

  const brands = await listBrands(category);
  const materials = await listMaterials(category);
  const dims = [
    { key: "brand", name: t.catalog.dims.brand, options: brands.map((b) => ({ value: b, label: b })) },
    ...(category === "yarn"
      ? [
          { key: "material", name: t.catalog.dims.material, options: materials.map((m) => ({ value: m, label: t.materials[m] })) },
          { key: "needle", name: t.catalog.dims.needle, options: (Object.keys(NEEDLE_GROUPS) as NeedleGroup[]).map((k) => ({ value: k, label: NEEDLE_GROUPS[k].label[lang] })) },
        ]
      : []),
  ];
  const picks = parsePicks(sp.f).filter((p) => dims.some((d) => d.key === p.dim && d.options.some((o) => o.value === p.value)));
  const get = (dim: string) => picks.find((p) => p.dim === dim)?.value;

  const products = await listProducts({
    category,
    brand: get("brand"),
    material: get("material"),
    needle: get("needle") as NeedleGroup | undefined,
    sort,
  });

  const labelOf = (p: Pick) => dims.find((d) => d.key === p.dim)?.options.find((o) => o.value === p.value)?.label ?? p.value;

  return (
    <div className="pt-14">
      <h1 aria-live="polite" className="text-[clamp(44px,7.2vw,104px)] font-semibold leading-[1.02] tracking-[-0.035em]">
        {picks.length === 0
          ? category === "yarn" ? t.catalog.allYarn : t.catalog.allSupplies
          : picks.map((p, i) => (
              <span key={p.dim}>
                <span className="whitespace-nowrap" style={{ color: PICK_COLORS[i % PICK_COLORS.length] }}>{labelOf(p)}</span>
                {i < picks.length - 1 && ", "}
              </span>
            ))}
      </h1>

      <Suspense>
        <CatalogFilters
          picks={picks}
          dims={dims}
          sort={sort}
          sorts={(["new", "low", "high"] as const).map((k) => ({ value: k, label: t.catalog.sorts[k] }))}
          labels={{ all: t.catalog.all, clear: t.catalog.clear, sortBy: t.catalog.sortBy, count: t.catalog.count(products.length), filters: t.catalog.dims.brand }}
        />
      </Suspense>

      {products.length === 0 ? (
        <p className="py-16 text-lg font-light text-muted">{t.catalog.empty}</p>
      ) : (
        <ul className="mt-10 grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-[repeat(auto-fill,minmax(250px,1fr))] md:gap-x-7 md:gap-y-12">
          {products.map((p) => {
            const name = productName(p, lang);
            const color = colorName(p, lang);
            const sale = isOnSale(p);
            const soldOut = p.stock <= 0;
            const tag = soldOut ? t.catalog.soldOut : sale ? t.catalog.sale : p.isNew ? t.catalog.isNew : null;
            const meta = [p.brand, p.material ? t.materials[p.material] : null, needleLabel(p, lang)].filter(Boolean).join(" · ");
            return (
              <li key={p.id}>
                <Link href={`/${lang}/p/${p.slug}`} className="group flex flex-col gap-3.5">
                  <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-2xl bg-tile">
                    {tag && (
                      <span className={`absolute left-2.5 top-2.5 md:left-3.5 md:top-3.5 z-10 rounded-full bg-white px-2.5 py-1 text-xs font-bold ${sale && !soldOut ? "text-accent" : "text-ink"}`}>{tag}</span>
                    )}
                    <ProductImage category={p.category} colorHex={p.colorHex} images={p.images} alt={`${name}${color ? ", " + color : ""}`} className={`transition-transform duration-300 group-hover:scale-[1.03] ${soldOut ? "opacity-50" : ""}`} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                      <span className="text-[15px] font-medium md:text-[17px]">{name}{color ? ` · ${color}` : ""}</span>
                      <span className="flex items-baseline gap-2 whitespace-nowrap text-[15px] font-medium md:text-[17px]">
                        {sale && <span className="text-sm text-[#7A7A7A] line-through">{money(p.price)}</span>}
                        <span className={sale ? "font-bold text-accent" : ""}>{money(effectivePrice(p))}</span>
                      </span>
                    </div>
                    <span className="text-xs text-muted md:text-[13px]">{meta}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
