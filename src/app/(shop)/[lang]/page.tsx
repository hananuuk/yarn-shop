import Link from "next/link";
import { Suspense } from "react";
import { NEEDLE_GROUPS, money, type Lang, type NeedleGroup } from "@/config";
import { getDict } from "@/lib/i18n";
import { listBrands, listMaterials, listProducts, productName, colorName, needleLabel, isOnSale, effectivePrice } from "@/lib/products";
import { ProductImage } from "@/components/ProductImage";
import { CatalogFilters } from "@/components/CatalogFilters";
import { PICK_COLORS, type Pick } from "@/lib/picks";
import { YarnBallFigure } from "@/components/Storybook";

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

  const showHero = picks.length === 0 && category === "yarn";
  const h = t.hero;

  return (
    <div className="pt-8 md:pt-10">
      {showHero && (
        <section aria-labelledby="hero-h" className="mb-16 flex flex-wrap items-center gap-x-12 gap-y-6 border-b-[1.5px] border-dashed border-line pb-14">
          <div className="flex min-w-0 flex-[1_1_340px] flex-col gap-5">
            <span className="caption text-[22px]">{h.eyebrow}</span>
            <h2 id="hero-h" className="text-[clamp(38px,5vw,68px)] leading-[1.05]">{h.title}</h2>
            <p className="max-w-[46ch] text-[17px] leading-relaxed text-muted">{h.body}</p>
            <div className="flex flex-wrap gap-3">
              <a href="#catalog" className="btn">{h.shop}</a>
              <Link href={`/${lang}/studio`} className="btn-outline">{h.studio}</Link>
            </div>
          </div>
          <figure className="m-0 flex min-w-0 flex-[1_1_420px] flex-col gap-3">
            <YarnBallFigure labels={h.legend} />
            <figcaption className="flex flex-col gap-1 border-t border-line pt-3">
              <span className="font-display text-[15px] italic">{h.fig}</span>
              <span className="caption">{h.legend.join("  ·  ")}</span>
            </figcaption>
          </figure>
        </section>
      )}

      <h1 id="catalog" aria-live="polite" className="scroll-mt-6 text-[clamp(44px,7.2vw,104px)] font-semibold leading-[1.02] tracking-[-0.035em]">
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
        <p className="caption py-16 text-[24px]">{t.catalog.empty}</p>
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
                  <div className="tile-paper relative flex aspect-[3/4] items-center justify-center overflow-hidden">
                    {tag && (
                      <span className={`tag absolute left-2.5 top-2.5 z-10 md:left-3.5 md:top-3.5 ${soldOut ? "bg-paper text-muted" : sale ? "bg-tomato text-paper" : "bg-chartreuse text-ink"}`}>{tag}</span>
                    )}
                    <ProductImage seed={p.id} category={p.category} colorHex={p.colorHex} images={p.images} alt={`${name}${color ? ", " + color : ""}`} className={`transition-transform duration-300 group-hover:-rotate-2 group-hover:scale-[1.03] ${soldOut ? "opacity-50" : ""}`} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                      <span className="text-[15px] font-medium md:text-[17px]">{name}{color ? ` · ${color}` : ""}</span>
                      <span className="flex items-baseline gap-2 whitespace-nowrap text-[15px] font-medium md:text-[17px]">
                        {sale && <span className="text-sm text-muted line-through">{money(p.price)}</span>}
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
