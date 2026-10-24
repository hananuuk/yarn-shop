import Link from "next/link";
import { COLOR_FAMILIES, MATERIALS } from "@/config";
import { getProductById, listBrands, listColourways } from "@/lib/products";
import { ProductForm, type ProductValues } from "../ProductForm";

export const metadata = { title: "New product" };

const s = (v: number | null) => (v == null ? "" : String(v));

export default async function NewProduct({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams;
  const brands = [...new Set([...(await listBrands("yarn")), ...(await listBrands("supplies"))])];
  // "+ Colour": start from an existing yarn so only the colour, stock and photos need filling in.
  const src = from ? await getProductById(Number(from)) : null;
  const siblings = src ? await listColourways(src, true) : [];

  const values: ProductValues = src
    ? {
        category: src.category, brand: src.brand, nameMn: src.nameMn, nameEn: src.nameEn,
        colorNameMn: "", colorNameEn: "", colorHex: "#D9CBB0", colorFamily: "neutral",
        material: src.material ?? "wool", needleMinMm: s(src.needleMinMm), needleMaxMm: s(src.needleMaxMm),
        weightG: s(src.weightG), lengthM: s(src.lengthM), descriptionMn: src.descriptionMn, descriptionEn: src.descriptionEn,
        weightTolG: s(src.weightTolG), lengthTolM: s(src.lengthTolM), compositionMn: src.compositionMn, compositionEn: src.compositionEn,
        gaugeStitches: s(src.gaugeStitches), gaugeRows: s(src.gaugeRows), gaugeNeedleMm: s(src.gaugeNeedleMm),
        hookMinMm: s(src.hookMinMm), hookMaxMm: s(src.hookMaxMm), manufacturer: src.manufacturer, originMn: src.originMn, originEn: src.originEn,
        price: String(src.price), salePrice: "", stock: "0", isActive: true, isNew: true,
      }
    : {
        category: "yarn", brand: "", nameMn: "", nameEn: "", colorNameMn: "", colorNameEn: "", colorHex: "#D9CBB0",
        colorFamily: "neutral", material: "wool", needleMinMm: "", needleMaxMm: "", weightG: "100", lengthM: "",
        descriptionMn: "", descriptionEn: "", weightTolG: "", lengthTolM: "", compositionMn: "", compositionEn: "", gaugeStitches: "", gaugeRows: "", gaugeNeedleMm: "", hookMinMm: "", hookMaxMm: "", manufacturer: "", originMn: "", originEn: "", price: "", salePrice: "", stock: "0", isActive: true, isNew: true,
      };

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <Link href={src ? `/admin/products/${src.id}` : "/admin/products"} className="btn-ghost no-underline">← {src ? `${src.nameEn} · ${src.colorNameEn}` : "Products"}</Link>
      <h1 className="text-4xl font-semibold tracking-tight">{src ? `New colour of ${src.brand} ${src.nameEn}` : "New product"}</h1>
      {src && (
        <div className="flex flex-col gap-3 rounded-xl bg-cream p-4 text-sm">
          <p>
            Everything is copied from <strong>{src.nameEn} · {src.colorNameEn}</strong>: description, blend, weight, length, needles, gauge and price.
            Fill in the <strong>colour</strong>, <strong>stock</strong> and <strong>photos</strong>. Change anything else only if this colour differs.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted">Colours so far:</span>
            {siblings.map((c) => (
              <span key={c.id} className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 ring-1 ring-line">
                <span className="size-3.5 rounded-full border border-black/10" style={{ background: c.colorHex }} />
                {c.colorNameEn || c.colorNameMn}
              </span>
            ))}
          </div>
        </div>
      )}
      <ProductForm brands={brands} materials={[...MATERIALS]} families={[...COLOR_FAMILIES]} values={values} colourFirst={!!src} />
    </div>
  );
}
