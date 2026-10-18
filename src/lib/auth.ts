import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "node:crypto";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getSms } from "@/lib/sms";
import { adminPhones, type Lang } from "@/config";
import { track } from "@/lib/events";
import { mergeAnonCart } from "@/lib/cart";

export const PHONE_RE = /^[6-9]\d{7}$/; // Mongolian mobile numbers
const SESSION_COOKIE = "sid";
const SESSION_DAYS = 30;
const OTP_TTL_MIN = 5;
const OTP_MAX_ATTEMPTS = 5;
const OTP_MAX_PER_HOUR = 5;

const sha = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
export const normalizePhone = (raw: string) => raw.replace(/\D/g, "").replace(/^976(?=\d{8}$)/, "");

export type CurrentUser = { id: string; phone: string; name: string | null; role: string };

export async function getAnonId(): Promise<string | null> {
  return (await cookies()).get("aid")?.value ?? null;
}

// ---------- One-time codes ----------
export async function requestOtp(phoneRaw: string): Promise<{ ok: true; devCode?: string } | { ok: false; error: "phone" | "rate" }> {
  const phone = normalizePhone(phoneRaw);
  if (!PHONE_RE.test(phone)) return { ok: false, error: "phone" };
  const db = await getDb();
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.otpCodes)
    .where(and(eq(schema.otpCodes.phone, phone), gt(schema.otpCodes.createdAt, new Date(Date.now() - 3600_000))));
  if (n >= OTP_MAX_PER_HOUR) return { ok: false, error: "rate" };

  const code = String(crypto.randomInt(100000, 1000000));
  await db.insert(schema.otpCodes).values({
    phone,
    codeHash: sha(`${phone}:${code}`),
    expiresAt: new Date(Date.now() + OTP_TTL_MIN * 60_000),
  });
  const sms = getSms();
  await sms.send(phone, `Таны нэвтрэх код: ${code}`);
  return { ok: true, devCode: sms.showsCodeOnScreen ? code : undefined };
}

export async function verifyOtp(phoneRaw: string, codeRaw: string): Promise<{ ok: true; user: CurrentUser; isNew: boolean } | { ok: false; error: "code" | "expired" | "locked" }> {
  const phone = normalizePhone(phoneRaw);
  const code = codeRaw.replace(/\D/g, "");
  const db = await getDb();
  const [otp] = await db
    .select()
    .from(schema.otpCodes)
    .where(and(eq(schema.otpCodes.phone, phone), isNull(schema.otpCodes.consumedAt)))
    .orderBy(desc(schema.otpCodes.createdAt))
    .limit(1);
  if (!otp || otp.expiresAt < new Date()) return { ok: false, error: "expired" };
  if (otp.attempts >= OTP_MAX_ATTEMPTS) return { ok: false, error: "locked" };
  if (otp.codeHash !== sha(`${phone}:${code}`)) {
    await db.update(schema.otpCodes).set({ attempts: otp.attempts + 1 }).where(eq(schema.otpCodes.id, otp.id));
    return { ok: false, error: otp.attempts + 1 >= OTP_MAX_ATTEMPTS ? "locked" : "code" };
  }
  await db.update(schema.otpCodes).set({ consumedAt: new Date() }).where(eq(schema.otpCodes.id, otp.id));

  const role = adminPhones().includes(phone) ? "admin" : "customer";
  const [existing] = await db.select().from(schema.users).where(eq(schema.users.phone, phone));
  let user = existing;
  if (!user) {
    [user] = await db.insert(schema.users).values({ phone, role }).returning();
  } else if (user.role !== role) {
    [user] = await db.update(schema.users).set({ role }).where(eq(schema.users.id, user.id)).returning();
  }

  const token = crypto.randomBytes(32).toString("base64url");
  await db.insert(schema.sessions).values({
    tokenHash: sha(token),
    userId: user.id,
    expiresAt: new Date(Date.now() + SESSION_DAYS * 86400_000),
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });

  const anonId = await getAnonId();
  if (anonId) {
    await mergeAnonCart(user.id, anonId);
    // Link what this visitor did before logging in to their account, so the funnel follows one person.
    await db.update(schema.events).set({ userId: user.id }).where(and(eq(schema.events.anonId, anonId), isNull(schema.events.userId)));
  }
  await track(existing ? "login" : "signup", { userId: user.id, anonId });
  return { ok: true, user: { id: user.id, phone: user.phone, name: user.name, role: user.role }, isNew: !existing };
}

// ---------- Sessions ----------
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const [row] = await db
    .select({ user: schema.users })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.tokenHash, sha(token)), gt(schema.sessions.expiresAt, new Date())));
  if (!row) return null;
  const u = row.user;
  if (Date.now() - u.lastSeenAt.getTime() > 10 * 60_000) {
    await db.update(schema.users).set({ lastSeenAt: new Date() }).where(eq(schema.users.id, u.id));
  }
  return { id: u.id, phone: u.phone, name: u.name, role: u.role };
}

export async function logout() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = await getDb();
    const [s] = await db.delete(schema.sessions).where(eq(schema.sessions.tokenHash, sha(token))).returning();
    if (s) await track("logout", { userId: s.userId, anonId: jar.get("aid")?.value ?? null });
  }
  jar.delete(SESSION_COOKIE);
}

export async function requireUser(lang: Lang, next: string): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u) redirect(`/${lang}/login?next=${encodeURIComponent(next)}`);
  return u;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u) redirect(`/en/login?next=${encodeURIComponent("/admin")}`);
  if (u.role !== "admin") redirect("/admin/denied");
  return u;
}
