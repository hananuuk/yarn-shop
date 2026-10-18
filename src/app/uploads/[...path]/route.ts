import { readImage } from "@/lib/storage";

// Serves product photos stored in the database.
export async function GET(_: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const m = (path.join("/") || "").match(/^([a-f0-9]{24})\.(jpg|png|webp)$/);
  if (!m) return new Response("Not found", { status: 404 });
  const img = await readImage(m[1]);
  if (!img) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(img.data), {
    headers: { "Content-Type": img.mime, "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
