import { and, desc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { OrderStatus } from "@/db/schema";
import { deliveryFee, siteUrl, DISTRICTS, type Lang } from "@/config";
import { getCart, clearCart } from "@/lib/cart";
import { getPayments } from "@/lib/payments";
import { track } from "@/lib/events";

export type Order = typeof schema.orders.$inferSelect;

// Which statuses an admin can move an order to from its current one.
export const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ["cancelled"],
  paid: ["packed", "cancelled"],
  packed: ["shipping", "cancelled"],
  shipping: ["delivered"],
  delivered: [],
  cancelled: [],
};

export type CheckoutInput = {
  name: string;
  phone: string;
  district: string;
  khoroo: string;
  address: string;
  note: string;
};

export type CheckoutError = "empty" | "stock" | "fields";

export async function createOrderFromCart(
  user: { id: string; phone: string },
  input: CheckoutInput,
  lang: Lang,
): Promise<{ ok: true; number: string } | { ok: false; error: CheckoutError }> {
  if (!input.name.trim() || !input.address.trim() || !DISTRICTS.some((d) => d.id === input.district)) {
    return { ok: false, error: "fields" };
  }
  const cart = await getCart({ userId: user.id });
  if (cart.lines.length === 0) return { ok: false, error: "empty" };
  if (cart.lines.some((l) => !l.available)) return { ok: false, error: "stock" };

  const db = await getDb();
  const fee = deliveryFee();
  const total = cart.subtotal + fee;

  const order = await db.transaction(async (tx) => {
    const [o] = await tx
      .insert(schema.orders)
      .values({
        userId: user.id,
        subtotal: cart.subtotal,
        deliveryFee: fee,
        total,
        customerName: input.name.trim(),
        phone: input.phone || user.phone,
        district: input.district,
        khoroo: input.khoroo.trim(),
        address: input.address.trim(),
        note: input.note.trim(),
        lang,
      })
      .returning();
    const number = `U${1000 + o.id}`;
    await tx.update(schema.orders).set({ number }).where(eq(schema.orders.id, o.id));
    await tx.insert(schema.orderItems).values(
      cart.lines.map((l) => ({
        orderId: o.id,
        productId: l.product.id,
        nameMn: `${l.product.nameMn}${l.product.colorNameMn ? " · " + l.product.colorNameMn : ""}`,
        nameEn: `${l.product.nameEn}${l.product.colorNameEn ? " · " + l.product.colorNameEn : ""}`,
        unitPrice: l.unitPrice,
        qty: l.qty,
        lineTotal: l.lineTotal,
      })),
    );
    await tx.insert(schema.orderEvents).values({ orderId: o.id, status: "pending_payment", actor: "customer" });
    await tx.update(schema.users).set({ name: input.name.trim() }).where(eq(schema.users.id, user.id));
    return { ...o, number };
  });

  await clearCart({ userId: user.id });
  await track("order_created", { userId: user.id, orderId: order.id, meta: { total } });
  await createInvoiceForOrder(order.id);
  return { ok: true, number: order.number };
}

// Creates (or re-creates) a payment invoice for an unpaid order.
export async function createInvoiceForOrder(orderId: number) {
  const db = await getDb();
  const [order] = await db.select().from(schema.orders).where(eq(schema.orders.id, orderId));
  if (!order || order.status !== "pending_payment") return null;
  const provider = getPayments();
  const invoice = await provider.createInvoice({
    orderNumber: order.number!,
    amount: order.total,
    description: `Order ${order.number}`,
    callbackUrl: `${siteUrl()}/api/payments/callback?order=${encodeURIComponent(order.number!)}`,
  });
  const [p] = await db
    .insert(schema.payments)
    .values({ orderId, provider: provider.name, invoiceId: invoice.invoiceId, amount: order.total, data: invoice })
    .returning();
  return p;
}

export async function getLatestPayment(orderId: number): Promise<typeof schema.payments.$inferSelect | null> {
  const db = await getDb();
  const [p] = await db
    .select()
    .from(schema.payments)
    .where(eq(schema.payments.orderId, orderId))
    .orderBy(desc(schema.payments.createdAt), desc(schema.payments.id))
    .limit(1);
  return p ?? null;
}

// Ask the payment provider whether the order's invoice is paid; if so, mark the order paid.
// Safe to call many times (callback, polling, manual "check" button).
export async function confirmPayment(orderId: number): Promise<boolean> {
  const db = await getDb();
  const [order] = await db.select().from(schema.orders).where(eq(schema.orders.id, orderId));
  if (!order) return false;
  if (order.status !== "pending_payment") return order.paidAt != null;
  const payment = await getLatestPayment(orderId);
  if (!payment) return false;
  const provider = getPayments();
  if (payment.provider !== provider.name) return false;
  const status = await provider.checkPayment(payment.invoiceId);
  if (!status.paid || status.paidAmount < order.total) return false;
  return markPaid(orderId, payment.id);
}

async function markPaid(orderId: number, paymentId: number): Promise<boolean> {
  const db = await getDb();
  const result = await db.transaction(async (tx) => {
    const [o] = await tx
      .update(schema.orders)
      .set({ status: "paid", paidAt: new Date(), updatedAt: new Date() })
      .where(and(eq(schema.orders.id, orderId), eq(schema.orders.status, "pending_payment")))
      .returning();
    if (!o) return null; // already handled by another request
    await tx.update(schema.payments).set({ status: "paid", paidAt: new Date() }).where(eq(schema.payments.id, paymentId));
    const items = await tx.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, orderId));
    const short: string[] = [];
    for (const i of items) {
      if (!i.productId) continue;
      const [p] = await tx
        .update(schema.products)
        .set({ stock: sql`${schema.products.stock} - ${i.qty}`, updatedAt: new Date() })
        .where(eq(schema.products.id, i.productId))
        .returning({ stock: schema.products.stock });
      if (p && p.stock < 0) {
        short.push(i.nameEn);
        await tx.update(schema.products).set({ stock: 0 }).where(eq(schema.products.id, i.productId));
      }
    }
    await tx.insert(schema.orderEvents).values({
      orderId,
      status: "paid",
      actor: "system",
      note: short.length ? `Stock ran short for: ${short.join(", ")}` : "",
    });
    return o;
  });
  if (result) await track("order_paid", { userId: result.userId, orderId, meta: { total: result.total } });
  return true;
}

export async function setOrderStatus(orderId: number, status: OrderStatus, actor: string, note = "") {
  const db = await getDb();
  const [order] = await db.select().from(schema.orders).where(eq(schema.orders.id, orderId));
  if (!order) throw new Error("Order not found");
  if (!NEXT_STATUSES[order.status].includes(status)) throw new Error(`Cannot move from ${order.status} to ${status}`);
  await db.transaction(async (tx) => {
    await tx.update(schema.orders).set({ status, updatedAt: new Date() }).where(eq(schema.orders.id, orderId));
    await tx.insert(schema.orderEvents).values({ orderId, status, actor, note });
    // Cancelling a paid order puts the stock back.
    if (status === "cancelled" && order.paidAt) {
      const items = await tx.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, orderId));
      for (const i of items) {
        if (i.productId)
          await tx
            .update(schema.products)
            .set({ stock: sql`${schema.products.stock} + ${i.qty}` })
            .where(eq(schema.products.id, i.productId));
      }
    }
  });
}

export async function getOrderByNumber(number: string) {
  const db = await getDb();
  const [o] = (await db.select().from(schema.orders).where(eq(schema.orders.number, number))) as (Order | undefined)[];
  if (!o) return null;
  const items = await db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, o.id));
  return { ...o, items };
}
