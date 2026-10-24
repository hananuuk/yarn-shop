import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { Lang } from "@/config";
import { getDict } from "@/lib/i18n";
import { getCurrentUser } from "@/lib/auth";
import { listStudioYarns } from "@/lib/products";
import { encodeCells, luminance, makeTemplate, type StudioYarn } from "@/lib/studio";
import { Studio, type StudioStart } from "./Studio";

export async function generateMetadata({ params }: { params: Promise<{ lang: Lang }> }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(lang).studio.title };
}

// Default colours: three colourways of one yarn line, so the design can actually be knitted
// from one yarn. ?y=<productId> (from a product page) puts that yarn in as the contrast colour.
function defaultPalette(yarns: StudioYarn[], preferId?: number): number[] {
  if (yarns.length === 0) return [];
  const preferred = yarns.find((y) => y.id === preferId);
  const lines = new Map<string, StudioYarn[]>();
  for (const y of yarns) lines.set(y.line, [...(lines.get(y.line) ?? []), y]);
  const line = preferred
    ? lines.get(preferred.line)!
    : [...lines.values()].sort((a, b) => b.length - a.length)[0];
  const byLight = [...line].sort((a, b) => luminance(b.hex) - luminance(a.hex));
  const main = preferred && byLight[0].id === preferred.id ? byLight[byLight.length - 1] : byLight[0];
  const contrast = preferred ?? byLight[byLight.length - 1];
  const third = byLight.find((y) => y.id !== main.id && y.id !== contrast.id);
  const palette = [main.id, contrast.id, ...(third ? [third.id] : [])];
  // A yarn line with one colour: borrow a contrasting yarn from elsewhere.
  if (palette.length < 2 || palette[0] === palette[1]) {
    const other = [...yarns].sort((a, b) => Math.abs(luminance(b.hex) - luminance(main.hex)) - Math.abs(luminance(a.hex) - luminance(main.hex)))[0];
    return [main.id, other.id];
  }
  return palette;
}

export default async function StudioPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: Lang }>;
  searchParams: Promise<{ d?: string; y?: string }>;
}) {
  const { lang } = await params;
  const sp = await searchParams;
  const t = getDict(lang).studio;
  const user = await getCurrentUser();
  const yarns = await listStudioYarns(lang);

  let start: StudioStart | null = null;
  if (sp.d && user && /^[0-9a-f-]{36}$/i.test(sp.d)) {
    const db = await getDb();
    const [d] = await db.select().from(schema.designs).where(and(eq(schema.designs.id, sp.d), eq(schema.designs.userId, user.id)));
    if (d) {
      // A yarn that has since been removed from the shop falls back to the first available yarn.
      const ids = new Set(yarns.map((y) => y.id));
      const palette = d.palette.map((id) => (ids.has(id) ? id : yarns[0]?.id ?? id));
      start = { id: d.id, name: d.name, width: d.width, height: d.height, cells: d.cells, palette, fromSaved: true };
    }
  }
  if (!start) {
    const tpl = makeTemplate("ulzii");
    const palette = defaultPalette(yarns, Number(sp.y) || undefined);
    const top = Math.max(0, palette.length - 1);
    const cells = tpl.cells.map((c) => Math.min(c, top));
    start = { id: null, name: "", width: tpl.width, height: tpl.height, cells: encodeCells(cells), palette, fromSaved: false };
  }

  return (
    <div className="pt-2">
      <h1 className="sr-only">{t.title}</h1>
      {yarns.length < 2 ? (
        <p className="mt-10 text-muted">—</p>
      ) : (
        <Studio lang={lang} yarns={yarns} start={start} loggedIn={!!user} preferNewDraft={!!sp.y} />
      )}
    </div>
  );
}
