import { and, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getProductsByIds, effectivePrice, type ProductWithImages } from "@/lib/products";

// A basket belongs to a logged-in user, or to an anonymous visitor (by the "aid" cookie).
// On login the anonymous basket is merged into the user's basket.
type Owner = { userId?: string | null; anonId?: string | null };

async function findCart(owner: Owner) {
  const db = await getDb();
  if (owner.userId) {
    const [c] = await db.select().from(schema.carts).where(eq(schema.carts.userId, owner.userId));
    return c ?? null;
  }
  if (owner.anonId) {
    const [c] = await db.select().from(schema.carts).where(eq(schema.carts.anonId, owner.anonId));
    return c ?? null;
  }
  return null;
}

async function ensureCart(owner: Owner) {
  const existing = await findCart(owner);
  if (existing) return existing;
  const db = await getDb();
  const [c] = await db
    .insert(schema.carts)
    .values(owner.userId ? { userId: owner.userId } : { anonId: owner.anonId! })
    .returning();
  return c;
}

export type CartLine = { product: ProductWithImages; qty: number; unitPrice: number; lineTotal: number; available: boolean };

export async function getCart(owner: Owner): Promise<{ lines: CartLine[]; subtotal: number; count: number }> {
  const cart = await findCart(owner);
  if (!cart) return { lines: [], subtotal: 0, count: 0 };
  const db = await getDb();
  const items = await db.select().from(schema.cartItems).where(eq(schema.cartItems.cartId, cart.id));
  const products = await getProductsByIds(items.map((i) => i.productId));
  const lines: CartLine[] = items
    .map((i) => {
      const product = products.find((p) => p.id === i.productId);
      if (!product) return null;
      const unitPrice = effectivePrice(product);
      return { product, qty: i.qty, unitPrice, lineTotal: unitPrice * i.qty, available: product.isActive && product.stock >= i.qty };
    })
    .filter((l): l is CartLine => l !== null)
    .sort((a, b) => a.product.id - b.product.id);
  return {
    lines,
    subtotal: lines.reduce((s, l) => s + l.lineTotal, 0),
    count: lines.reduce((s, l) => s + l.qty, 0),
  };
}

export async function getCartCount(owner: Owner): Promise<number> {
  const cart = await findCart(owner);
  if (!cart) return 0;
  const db = await getDb();
  const [r] = await db
    .select({ n: sql<number>`coalesce(sum(${schema.cartItems.qty}), 0)::int` })
    .from(schema.cartItems)
    .where(eq(schema.cartItems.cartId, cart.id));
  return r?.n ?? 0;
}

export async function addToCart(owner: Owner, productId: number, qty: number) {
  const cart = await ensureCart(owner);
  const db = await getDb();
  const q = Math.max(1, Math.min(99, Math.floor(qty)));
  await db
    .insert(schema.cartItems)
    .values({ cartId: cart.id, productId, qty: q })
    .onConflictDoUpdate({
      target: [schema.cartItems.cartId, schema.cartItems.productId],
      set: { qty: sql`least(${schema.cartItems.qty} + ${q}, 99)` },
    });
  await db.update(schema.carts).set({ updatedAt: new Date() }).where(eq(schema.carts.id, cart.id));
}

export async function setCartQty(owner: Owner, productId: number, qty: number) {
  const cart = await findCart(owner);
  if (!cart) return;
  const db = await getDb();
  const where = and(eq(schema.cartItems.cartId, cart.id), eq(schema.cartItems.productId, productId));
  if (qty <= 0) await db.delete(schema.cartItems).where(where);
  else await db.update(schema.cartItems).set({ qty: Math.min(99, Math.floor(qty)) }).where(where);
}

export async function clearCart(owner: Owner) {
  const cart = await findCart(owner);
  if (!cart) return;
  const db = await getDb();
  await db.delete(schema.cartItems).where(eq(schema.cartItems.cartId, cart.id));
}

export async function mergeAnonCart(userId: string, anonId: string) {
  const db = await getDb();
  const [anon] = await db.select().from(schema.carts).where(eq(schema.carts.anonId, anonId));
  if (!anon) return;
  const items = await db.select().from(schema.cartItems).where(eq(schema.cartItems.cartId, anon.id));
  for (const i of items) await addToCart({ userId }, i.productId, i.qty);
  await db.delete(schema.carts).where(eq(schema.carts.id, anon.id));
}
