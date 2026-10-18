import { getDb, schema } from "@/db";

export type EventType =
  | "product_view" | "product_save" | "add_to_cart" | "checkout_start"
  | "order_created" | "order_paid" | "signup" | "login" | "logout";

// Analytics logging. Never throws: a failed log must not break a purchase.
export async function track(
  type: EventType,
  data: { anonId?: string | null; userId?: string | null; productId?: number | null; orderId?: number | null; meta?: Record<string, unknown> } = {},
) {
  try {
    const db = await getDb();
    await db.insert(schema.events).values({
      type,
      anonId: data.anonId ?? null,
      userId: data.userId ?? null,
      productId: data.productId ?? null,
      orderId: data.orderId ?? null,
      meta: data.meta ?? null,
    });
  } catch (e) {
    console.error("[events] failed to log", type, e);
  }
}
