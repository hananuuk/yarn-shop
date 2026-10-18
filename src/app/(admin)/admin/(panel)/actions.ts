"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { ORDER_STATUSES, type OrderStatus } from "@/db/schema";
import { COLOR_FAMILIES, MATERIALS } from "@/config";
import { requireAdmin } from "@/lib/auth";
import { setOrderStatus } from "@/lib/orders";
import { slugify } from "@/lib/products";
import { saveImage, deleteImage } from "@/lib/storage";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const int = (f: FormData, k: string) => {
  const v = str(f, k).replace(/[\s,]/g, "");
  if (v === "") return null;
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? n : null;
};
const num = (f: FormData, k: string) => {
  const v = str(f, k).replace(",", ".");
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// ---------- Products ----------
export type ProductFormState = { error?: string };

export async function saveProductAction(_: ProductFormState, f: FormData): Promise<ProductFormState> {
  await requireAdmin();
  const db = await getDb();
  const id = int(f, "id");
  const category = str(f, "category") === "supplies" ? "supplies" : "yarn";
  const material = str(f, "material");
  const family = str(f, "colorFamily");
  const price = int(f, "price");
  const salePrice = int(f, "salePrice");
  const stock = int(f, "stock") ?? 0;
  const values = {
    category,
    brand: str(f, "brand"),
    nameMn: str(f, "nameMn"),
    nameEn: str(f, "nameEn") || str(f, "nameMn"),
    colorNameMn: str(f, "colorNameMn"),
    colorNameEn: str(f, "colorNameEn"),
    colorHex: /^#[0-9a-fA-F]{6}$/.test(str(f, "colorHex")) ? str(f, "colorHex") : "#D9CBB0",
    colorFamily: (COLOR_FAMILIES as readonly string[]).includes(family) ? family : "neutral",
    material: category === "yarn" && (MATERIALS as readonly string[]).includes(material) ? material : null,
    needleMinMm: num(f, "needleMinMm"),
    needleMaxMm: num(f, "needleMaxMm") ?? num(f, "needleMinMm"),
    weightG: int(f, "weightG"),
    lengthM: int(f, "lengthM"),
    descriptionMn: str(f, "descriptionMn"),
    descriptionEn: str(f, "descriptionEn"),
    price: price ?? 0,
    salePrice: salePrice && price && salePrice < price ? salePrice : null,
    stock: Math.max(0, stock),
    isActive: f.get("isActive") === "on",
    isNew: f.get("isNew") === "on",
    updatedAt: new Date(),
  };
  if (!values.nameMn) return { error: "Mongolian name is required." };
  if (!price || price <= 0) return { error: "Price must be more than 0." };
  if (salePrice && salePrice >= price) return { error: "Sale price must be lower than the normal price." };

  // Upload photos first so a bad file doesn't leave a half-saved product.
  const files = f.getAll("images").filter((x): x is File => x instanceof File && x.size > 0);
  const urls: string[] = [];
  try {
    for (const file of files) urls.push(await saveImage(file));
  } catch (e) {
    for (const u of urls) await deleteImage(u);
    return { error: e instanceof Error ? e.message : "Upload failed." };
  }

  let productId = id;
  if (id) {
    await db.update(schema.products).set(values).where(eq(schema.products.id, id));
  } else {
    let slug = slugify(`${values.nameEn} ${values.colorNameEn || values.colorNameMn}`);
    const [clash] = await db.select({ id: schema.products.id }).from(schema.products).where(eq(schema.products.slug, slug));
    if (clash) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
    const [row] = await db.insert(schema.products).values({ ...values, slug }).returning({ id: schema.products.id });
    productId = row.id;
  }
  if (urls.length) {
    const existing = await db.select().from(schema.productImages).where(eq(schema.productImages.productId, productId!));
    const start = existing.reduce((m, i) => Math.max(m, i.sort), -1) + 1;
    await db.insert(schema.productImages).values(urls.map((url, i) => ({ productId: productId!, url, sort: start + i })));
  }
  revalidatePath("/admin/products");
  redirect(`/admin/products/${productId}?saved=1`);
}

export async function deleteImageAction(f: FormData) {
  await requireAdmin();
  const db = await getDb();
  const [img] = await db.delete(schema.productImages).where(eq(schema.productImages.id, Number(f.get("imageId")))).returning();
  if (img) await deleteImage(img.url);
  revalidatePath(`/admin/products/${f.get("productId")}`);
}

export async function makeMainImageAction(f: FormData) {
  await requireAdmin();
  const db = await getDb();
  const productId = Number(f.get("productId"));
  const imageId = Number(f.get("imageId"));
  const imgs = await db.select().from(schema.productImages).where(eq(schema.productImages.productId, productId)).orderBy(asc(schema.productImages.sort));
  const ordered = [imgs.find((i) => i.id === imageId)!, ...imgs.filter((i) => i.id !== imageId)].filter(Boolean);
  for (let i = 0; i < ordered.length; i++) await db.update(schema.productImages).set({ sort: i }).where(eq(schema.productImages.id, ordered[i].id));
  revalidatePath(`/admin/products/${productId}`);
}

export async function quickStockAction(f: FormData) {
  await requireAdmin();
  const db = await getDb();
  const stock = Math.max(0, int(f, "stock") ?? 0);
  await db.update(schema.products).set({ stock, updatedAt: new Date() }).where(eq(schema.products.id, Number(f.get("productId"))));
  revalidatePath("/admin/products");
}

export async function toggleActiveAction(f: FormData) {
  await requireAdmin();
  const db = await getDb();
  const id = Number(f.get("productId"));
  const [p] = await db.select().from(schema.products).where(eq(schema.products.id, id));
  if (p) await db.update(schema.products).set({ isActive: !p.isActive, updatedAt: new Date() }).where(eq(schema.products.id, id));
  revalidatePath("/admin/products");
}

// ---------- Orders ----------
export async function orderStatusAction(f: FormData) {
  const admin = await requireAdmin();
  const status = str(f, "status") as OrderStatus;
  const orderId = Number(f.get("orderId"));
  if (!(ORDER_STATUSES as readonly string[]).includes(status)) return;
  await setOrderStatus(orderId, status, `admin:${admin.phone}`, str(f, "note"));
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
}

export async function orderNoteAction(f: FormData) {
  await requireAdmin();
  const db = await getDb();
  const orderId = Number(f.get("orderId"));
  await db.update(schema.orders).set({ adminNote: str(f, "adminNote"), updatedAt: new Date() }).where(eq(schema.orders.id, orderId));
  revalidatePath(`/admin/orders/${orderId}`);
}

// ---------- Reviews ----------
export async function replyReviewAction(f: FormData) {
  await requireAdmin();
  const db = await getDb();
  const reply = str(f, "reply");
  await db
    .update(schema.reviews)
    .set({ adminReply: reply || null, repliedAt: reply ? new Date() : null })
    .where(eq(schema.reviews.id, Number(f.get("reviewId"))));
  revalidatePath("/admin/reviews");
}

export async function deleteReviewAction(f: FormData) {
  await requireAdmin();
  const db = await getDb();
  await db.delete(schema.reviews).where(eq(schema.reviews.id, Number(f.get("reviewId"))));
  revalidatePath("/admin/reviews");
}

