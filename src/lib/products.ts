import { and, asc, desc, eq, gte, inArray, lte, sql, type SQL } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { MATERIALS, NEEDLE_GROUPS, type Lang, type NeedleGroup } from "@/config";
import type { StudioYarn } from "@/lib/studio";

export type Product = typeof schema.products.$inferSelect;
export type ProductImageInfo = { id: number; url: string; captionMn: string; captionEn: string };
export type ProductWithImages = Product & { images: ProductImageInfo[] };

export const effectivePrice = (p: Pick<Product, "price" | "salePrice">) =>
  p.salePrice != null && p.salePrice < p.price ? p.salePrice : p.price;
export const isOnSale = (p: Pick<Product, "price" | "salePrice">) => p.salePrice != null && p.salePrice < p.price;

export const productName = (p: Pick<Product, "nameMn" | "nameEn">, lang: Lang) => (lang === "mn" ? p.nameMn : p.nameEn);
export const colorName = (p: Pick<Product, "colorNameMn" | "colorNameEn">, lang: Lang) =>
  lang === "mn" ? p.colorNameMn : p.colorNameEn;

// "3.75–4 мм" / "3.75–4 mm"
export function mmRange(a: number | null, b: number | null, lang: Lang = "en") {
  const unit = lang === "mn" ? "мм" : "mm";
  if (a == null && b == null) return "";
  if (a != null && b != null && a !== b) return `${a}–${b} ${unit}`;
  return `${a ?? b} ${unit}`;
}

export function needleLabel(p: Pick<Product, "needleMinMm" | "needleMaxMm">, lang: Lang = "en") {
  return mmRange(p.needleMinMm, p.needleMaxMm, lang);
}

export { isDark } from "@/lib/color";

export type CatalogFilter = {
  category?: "yarn" | "supplies";
  brand?: string;
  material?: string;
  needle?: NeedleGroup;
  sort?: "new" | "low" | "high";
};

async function attachImages(rows: Product[]): Promise<ProductWithImages[]> {
  if (rows.length === 0) return [];
  const db = await getDb();
  const imgs = await db
    .select()
    .from(schema.productImages)
    .where(inArray(schema.productImages.productId, rows.map((r) => r.id)))
    .orderBy(asc(schema.productImages.sort), asc(schema.productImages.id));
  return rows.map((r) => ({ ...r, images: imgs.filter((i) => i.productId === r.id).map((i) => ({ id: i.id, url: i.url, captionMn: i.captionMn, captionEn: i.captionEn })) }));
}

export async function listProducts(f: CatalogFilter): Promise<ProductWithImages[]> {
  const db = await getDb();
  const p = schema.products;
  const where: SQL[] = [eq(p.isActive, true)];
  if (f.category) where.push(eq(p.category, f.category));
  if (f.brand) where.push(eq(p.brand, f.brand));
  if (f.material) where.push(eq(p.material, f.material));
  if (f.needle && NEEDLE_GROUPS[f.needle]) {
    const g = NEEDLE_GROUPS[f.needle];
    where.push(lte(sql`coalesce(${p.needleMinMm}, ${p.needleMaxMm})`, g.max));
    where.push(gte(sql`coalesce(${p.needleMaxMm}, ${p.needleMinMm})`, g.min));
  }
  const price = sql`coalesce(least(${p.salePrice}, ${p.price}), ${p.price})`;
  const order =
    f.sort === "low" ? [asc(price), asc(p.id)] : f.sort === "high" ? [desc(price), asc(p.id)] : [desc(p.isNew), desc(p.createdAt), desc(p.id)];
  const rows = await db.select().from(p).where(and(...where)).orderBy(...order);
  return attachImages(rows);
}

export async function listBrands(category: "yarn" | "supplies" = "yarn"): Promise<string[]> {
  const db = await getDb();
  const rows = await db
    .selectDistinct({ brand: schema.products.brand })
    .from(schema.products)
    .where(and(eq(schema.products.isActive, true), eq(schema.products.category, category)))
    .orderBy(asc(schema.products.brand));
  return rows.map((r) => r.brand).filter(Boolean);
}

// Materials that at least one visible product uses, in the shop's preferred order.
export async function listMaterials(category: "yarn" | "supplies" = "yarn"): Promise<string[]> {
  const db = await getDb();
  const rows = await db
    .selectDistinct({ m: schema.products.material })
    .from(schema.products)
    .where(and(eq(schema.products.isActive, true), eq(schema.products.category, category)));
  const present = new Set(rows.map((r) => r.m).filter(Boolean) as string[]);
  return MATERIALS.filter((m) => present.has(m));
}

// Other colours of the same yarn: same brand + English name + category.
export async function listColourways(p: Pick<Product, "brand" | "nameEn" | "category">) {
  const db = await getDb();
  return db
    .select({
      id: schema.products.id, slug: schema.products.slug, colorHex: schema.products.colorHex,
      colorNameMn: schema.products.colorNameMn, colorNameEn: schema.products.colorNameEn, stock: schema.products.stock,
    })
    .from(schema.products)
    .where(and(
      eq(schema.products.isActive, true),
      eq(schema.products.brand, p.brand),
      eq(schema.products.nameEn, p.nameEn),
      eq(schema.products.category, p.category),
    ))
    .orderBy(asc(schema.products.id));
}

// All colourways of each yarn line in one go, for the catalog's colour dots.
// Key: brand + English name + category (the same rule as listColourways).
export const colourwayKey = (p: Pick<Product, "brand" | "nameEn" | "category">) => `${p.category}|${p.brand}|${p.nameEn}`;
export async function listColourwayGroups() {
  const db = await getDb();
  const rows = await db
    .select({
      id: schema.products.id, brand: schema.products.brand, nameEn: schema.products.nameEn, category: schema.products.category,
      colorHex: schema.products.colorHex, stock: schema.products.stock,
    })
    .from(schema.products)
    .where(eq(schema.products.isActive, true))
    .orderBy(asc(schema.products.id));
  const groups = new Map<string, { id: number; colorHex: string; stock: number }[]>();
  for (const r of rows) {
    const k = colourwayKey(r);
    groups.set(k, [...(groups.get(k) ?? []), { id: r.id, colorHex: r.colorHex, stock: r.stock }]);
  }
  return groups;
}

// Yarns the Stitch Studio can paint with (visible yarn products, localised).
export async function listStudioYarns(lang: Lang): Promise<StudioYarn[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.products)
    .where(and(eq(schema.products.isActive, true), eq(schema.products.category, "yarn")))
    .orderBy(asc(schema.products.brand), asc(schema.products.nameEn), asc(schema.products.id));
  return rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    line: `${p.brand} ${productName(p, lang)}`.trim(),
    colour: colorName(p, lang) || productName(p, lang),
    hex: p.colorHex,
    lengthM: p.lengthM,
    gaugeStitches: p.gaugeStitches,
    gaugeRows: p.gaugeRows,
    needle: needleLabel(p, lang),
    price: effectivePrice(p),
    stock: p.stock,
    tweed: /tweed|твид/i.test(`${p.nameEn} ${p.colorNameEn} ${p.compositionEn}`),
  }));
}

export async function getProductBySlug(slug: string): Promise<ProductWithImages | null> {
  const db = await getDb();
  const [row] = await db.select().from(schema.products).where(eq(schema.products.slug, slug));
  if (!row) return null;
  return (await attachImages([row]))[0];
}

export async function getProductById(id: number): Promise<ProductWithImages | null> {
  const db = await getDb();
  const [row] = await db.select().from(schema.products).where(eq(schema.products.id, id));
  if (!row) return null;
  return (await attachImages([row]))[0];
}

export async function getProductsByIds(ids: number[]): Promise<ProductWithImages[]> {
  if (ids.length === 0) return [];
  const db = await getDb();
  return attachImages(await db.select().from(schema.products).where(inArray(schema.products.id, ids)));
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "item";
}
