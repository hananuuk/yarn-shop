"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getAnonId, getCurrentUser } from "@/lib/auth";
import { track } from "@/lib/events";
import { MAX_COLOURS, MAX_SIZE, MIN_SIZE } from "@/lib/studio";

export type DesignInput = { id?: string; name: string; width: number; height: number; cells: string; palette: number[] };
export type SaveResult = { ok: true; id: string } | { ok: false; error: "login" | "invalid" };

const UUID = /^[0-9a-f-]{36}$/i;

export async function saveDesignAction(input: DesignInput): Promise<SaveResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "login" };

  const width = Math.round(input.width), height = Math.round(input.height);
  const palette = Array.isArray(input.palette) ? input.palette.map(Number).filter(Number.isInteger) : [];
  const okSize = width >= MIN_SIZE && width <= MAX_SIZE && height >= MIN_SIZE && height <= MAX_SIZE;
  const okPalette = palette.length >= 2 && palette.length <= MAX_COLOURS;
  const okCells = typeof input.cells === "string" && input.cells.length === width * height && /^[0-9]*$/.test(input.cells)
    && [...input.cells].every((c) => Number(c) < palette.length);
  if (!okSize || !okPalette || !okCells) return { ok: false, error: "invalid" };

  const db = await getDb();
  const found = await db.select({ id: schema.products.id }).from(schema.products).where(inArray(schema.products.id, palette));
  if (new Set(found.map((f) => f.id)).size !== new Set(palette).size) return { ok: false, error: "invalid" };

  const name = (input.name || "").trim().slice(0, 80) || "Untitled";
  const values = { name, width, height, cells: input.cells, palette, updatedAt: new Date() };

  let id = input.id && UUID.test(input.id) ? input.id : undefined;
  if (id) {
    const [row] = await db
      .update(schema.designs)
      .set(values)
      .where(and(eq(schema.designs.id, id), eq(schema.designs.userId, user.id)))
      .returning({ id: schema.designs.id });
    if (!row) id = undefined; // not theirs or deleted: save as a new design
  }
  if (!id) {
    const [row] = await db.insert(schema.designs).values({ ...values, userId: user.id }).returning({ id: schema.designs.id });
    id = row.id;
  }
  await track("design_save", { userId: user.id, anonId: await getAnonId(), meta: { width, height, colours: palette.length } });
  revalidatePath("/", "layout");
  return { ok: true, id };
}

export async function deleteDesignAction(formData: FormData) {
  const user = await getCurrentUser();
  const id = String(formData.get("id") ?? "");
  if (!user || !UUID.test(id)) return;
  const db = await getDb();
  await db.delete(schema.designs).where(and(eq(schema.designs.id, id), eq(schema.designs.userId, user.id)));
  revalidatePath("/", "layout");
}
