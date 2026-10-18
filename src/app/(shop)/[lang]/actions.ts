"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { isLang, type Lang } from "@/config";
import { getAnonId, getCurrentUser, requestOtp, verifyOtp, logout, PHONE_RE, normalizePhone } from "@/lib/auth";
import { addToCart, getCartCount, setCartQty } from "@/lib/cart";
import { track } from "@/lib/events";
import { confirmPayment, createOrderFromCart, getLatestPayment, getOrderByNumber, type CheckoutError } from "@/lib/orders";
import { getPayments } from "@/lib/payments";
import { getProductById } from "@/lib/products";

const langOf = (v: unknown): Lang => (typeof v === "string" && isLang(v) ? v : "mn");
// Only allow redirects to our own pages.
const safeNext = (v: unknown, lang: Lang) => (typeof v === "string" && v.startsWith("/") && !v.startsWith("//") ? v : `/${lang}`);

async function owner() {
  const user = await getCurrentUser();
  return { user, anonId: await getAnonId() };
}

// ---------- Basket ----------
export async function addToCartAction(productId: number, qty: number): Promise<{ ok: boolean; count: number; error?: "stock" }> {
  const { user, anonId } = await owner();
  const product = await getProductById(productId);
  if (!product || !product.isActive || product.stock < 1) return { ok: false, count: 0, error: "stock" };
  const q = Math.min(Math.max(1, Math.floor(qty)), product.stock);
  await addToCart({ userId: user?.id, anonId }, productId, q);
  await track("add_to_cart", { userId: user?.id, anonId, productId, meta: { qty: q } });
  revalidatePath("/", "layout");
  return { ok: true, count: await getCartCount({ userId: user?.id, anonId }) };
}

export async function setQtyAction(formData: FormData) {
  const lang = langOf(formData.get("lang"));
  const { user, anonId } = await owner();
  await setCartQty({ userId: user?.id, anonId }, Number(formData.get("productId")), Number(formData.get("qty")));
  revalidatePath(`/${lang}`, "layout"); // basket badge in the header
}

// ---------- Saved yarn ----------
export async function toggleSaveAction(formData: FormData) {
  const lang = langOf(formData.get("lang"));
  const productId = Number(formData.get("productId"));
  const back = safeNext(formData.get("back"), lang);
  const user = await getCurrentUser();
  if (!user) redirect(`/${lang}/login?next=${encodeURIComponent(back)}`);
  const db = await getDb();
  const where = and(eq(schema.savedProducts.userId, user.id), eq(schema.savedProducts.productId, productId));
  const [existing] = await db.select().from(schema.savedProducts).where(where);
  if (existing) await db.delete(schema.savedProducts).where(where);
  else {
    await db.insert(schema.savedProducts).values({ userId: user.id, productId });
    await track("product_save", { userId: user.id, anonId: await getAnonId(), productId });
  }
  revalidatePath(back);
}

// ---------- Login ----------
export type LoginState = { step: "phone" | "code"; phone: string; error?: string; devCode?: string };

export async function loginAction(prev: LoginState, formData: FormData): Promise<LoginState> {
  const lang = langOf(formData.get("lang"));
  const intent = formData.get("intent");
  if (intent === "change") return { step: "phone", phone: prev.phone };

  if (intent === "send" || intent === "resend") {
    const phone = normalizePhone(String(formData.get("phone") ?? prev.phone));
    if (!PHONE_RE.test(phone)) return { step: "phone", phone, error: "phone" };
    const r = await requestOtp(phone);
    if (!r.ok) return { step: intent === "resend" ? "code" : "phone", phone, error: r.error };
    return { step: "code", phone, devCode: r.devCode };
  }

  const r = await verifyOtp(prev.phone, String(formData.get("code") ?? ""));
  if (!r.ok) return { ...prev, error: r.error };
  revalidatePath(`/${lang}`, "layout"); // merged basket + account icon
  redirect(safeNext(formData.get("next"), lang));
}

export async function logoutAction(formData: FormData) {
  const lang = langOf(formData.get("lang"));
  await logout();
  revalidatePath(`/${lang}`, "layout");
  redirect(`/${lang}`);
}

// ---------- Checkout & payment ----------
export type CheckoutState = { error?: CheckoutError };

export async function checkoutAction(_: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const lang = langOf(formData.get("lang"));
  const user = await getCurrentUser();
  if (!user) redirect(`/${lang}/login?next=/${lang}/checkout`);
  const phone = normalizePhone(String(formData.get("phone") || user.phone));
  const r = await createOrderFromCart(
    user,
    {
      name: String(formData.get("name") ?? ""),
      phone: PHONE_RE.test(phone) ? phone : user.phone,
      district: String(formData.get("district") ?? ""),
      khoroo: String(formData.get("khoroo") ?? ""),
      address: String(formData.get("address") ?? ""),
      note: String(formData.get("note") ?? ""),
    },
    lang,
  );
  if (!r.ok) return { error: r.error };
  revalidatePath(`/${lang}`, "layout"); // basket is now empty
  redirect(`/${lang}/pay/${r.number}`);
}

async function ownOrder(number: string) {
  const user = await getCurrentUser();
  const order = await getOrderByNumber(number);
  if (!user || !order || (order.userId !== user.id && user.role !== "admin")) return null;
  return order;
}

export async function checkPaymentAction(number: string): Promise<{ paid: boolean }> {
  const order = await ownOrder(number);
  if (!order) return { paid: false };
  if (order.status !== "pending_payment") return { paid: order.paidAt != null };
  return { paid: await confirmPayment(order.id) };
}

// Test mode only: pretend the customer paid, then run the normal confirmation path.
export async function simulatePaymentAction(formData: FormData) {
  const lang = langOf(formData.get("lang"));
  const number = String(formData.get("number"));
  if (!getPayments().isTest) throw new Error("Simulated payments are disabled.");
  const order = await ownOrder(number);
  if (!order) redirect(`/${lang}`);
  const payment = await getLatestPayment(order.id);
  if (payment && payment.provider === "mock") {
    const db = await getDb();
    await db
      .update(schema.payments)
      .set({ data: { ...(payment.data as object), simulatedPaid: true } })
      .where(eq(schema.payments.id, payment.id));
    await confirmPayment(order.id);
  }
  redirect(`/${lang}/pay/${number}`);
}

// ---------- Reviews ----------
export async function reviewAction(formData: FormData) {
  const lang = langOf(formData.get("lang"));
  const slug = String(formData.get("slug"));
  const user = await getCurrentUser();
  if (!user) redirect(`/${lang}/login?next=/${lang}/p/${slug}`);
  const rating = Math.min(5, Math.max(1, Number(formData.get("rating")) || 5));
  const body = String(formData.get("body") ?? "").trim().slice(0, 2000);
  const productId = Number(formData.get("productId"));
  if (body.length >= 3) {
    const db = await getDb();
    await db.insert(schema.reviews).values({ productId, userId: user.id, rating, body });
  }
  revalidatePath(`/${lang}/p/${slug}`);
  redirect(`/${lang}/p/${slug}?reviewed=1#reviews`);
}
