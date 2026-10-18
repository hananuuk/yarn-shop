import type { Lang } from "@/config";
import { getDict } from "@/lib/i18n";

// Stitch Studio is Milestone 2. This page holds its place in the navigation.
export default async function StudioPage({ params }: { params: Promise<{ lang: Lang }> }) {
  const { lang } = await params;
  const t = getDict(lang).studio;
  return (
    <div className="pt-14">
      <h1 className="text-[clamp(44px,7.2vw,104px)] font-semibold leading-[1.02] tracking-[-0.035em]">{t.title}</h1>
      <p className="mt-6 max-w-xl text-xl font-light">{t.body}</p>
      <p className="mt-4 inline-flex rounded-full bg-cream px-4 py-2 text-sm font-semibold">{t.soon}</p>
    </div>
  );
}
