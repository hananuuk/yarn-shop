import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

// Product photo storage. Photos are kept in the database (table "uploads") and served by
// app/uploads/[...path]/route.ts. Product rows only store the URL, so moving to a storage
// bucket later (Supabase Storage, Cloudflare R2, S3) means changing only this file.
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_BYTES = 4 * 1024 * 1024; // hosting platforms cap request bodies around 4.5 MB

export async function saveImage(file: File): Promise<string> {
  const ext = TYPES[file.type];
  if (!ext) throw new Error("Only JPG, PNG or WebP images are allowed.");
  if (file.size > MAX_BYTES) throw new Error("Image is larger than 4 MB. Make it smaller and try again.");
  const id = crypto.randomBytes(12).toString("hex");
  const db = await getDb();
  await db.insert(schema.uploads).values({ id, mime: file.type, data: Buffer.from(await file.arrayBuffer()) });
  return `/uploads/${id}.${ext}`;
}

export async function deleteImage(url: string) {
  const m = url.match(/^\/uploads\/([a-f0-9]{24})\.\w+$/);
  if (!m) return;
  const db = await getDb();
  await db.delete(schema.uploads).where(eq(schema.uploads.id, m[1]));
}

export async function readImage(id: string) {
  const db = await getDb();
  const [row] = await db.select().from(schema.uploads).where(eq(schema.uploads.id, id));
  return row ?? null;
}
