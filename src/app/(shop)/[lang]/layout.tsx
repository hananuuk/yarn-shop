import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import "@fontsource/manrope/300.css";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "../../globals.css";
import { BRAND, isLang, type Lang } from "@/config";
import { getDict } from "@/lib/i18n";
import { getAnonId, getCurrentUser } from "@/lib/auth";
import { getCartCount } from "@/lib/cart";
import { LangSwitch } from "@/components/LangSwitch";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const l: Lang = isLang(lang) ? lang : "mn";
  return {
    title: { default: BRAND.name[l], template: `%s · ${BRAND.name[l]}` },
    description: l === "mn" ? "Ээрмэл ба сүлжмэлийн хэрэгсэл · Улаанбаатар" : "Yarn and knitting supplies · Ulaanbaatar",
  };
}

export default async function ShopLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const t = getDict(lang);
  const user = await getCurrentUser();
  const count = await getCartCount({ userId: user?.id, anonId: await getAnonId() });

  return (
    <html lang={lang}>
            <body className="flex min-h-screen flex-col">
        <header className="mx-auto flex w-full max-w-[1320px] flex-wrap items-center gap-x-11 gap-y-1 px-6 py-4 md:py-5">
          <Link href={`/${lang}`} className="order-1 flex items-center gap-2.5" aria-label={BRAND.name[lang]}>
            <Logo />
            <span className="text-xl font-bold tracking-tight">{BRAND.name[lang]}</span>
          </Link>
          <nav aria-label="Main" className="order-3 -mx-6 flex w-[calc(100%+3rem)] gap-x-6 overflow-x-auto whitespace-nowrap px-6 text-sm font-semibold md:order-2 md:mx-0 md:w-auto md:flex-1 md:justify-end md:gap-x-8 md:px-0">
            <Link href={`/${lang}`} className="py-3 hover:text-muted">{t.nav.yarn}</Link>
            <Link href={`/${lang}?cat=supplies`} className="py-3 hover:text-muted">{t.nav.supplies}</Link>
            <Link href={`/${lang}/studio`} className="py-3 hover:text-muted">{t.nav.studio}</Link>
            <span className="py-3 text-[#7A7A7A]">{t.nav.patterns} · {t.nav.soon}</span>
          </nav>
          <div className="order-2 ml-auto flex items-center gap-1 md:order-3 md:ml-0">
            <LangSwitch lang={lang} label={t.header.switchLang} />
            <Link href={`/${lang}/account`} aria-label={user ? t.header.account : t.header.login} className="inline-flex size-11 items-center justify-center rounded-full hover:bg-cream">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>
            </Link>
            <Link href={`/${lang}/basket`} aria-label={`${t.header.basket}${count ? ` (${count})` : ""}`} className="relative inline-flex size-11 items-center justify-center rounded-full hover:bg-cream">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 9h14l-1.4 11H6.4z" /><path d="M9 9V7a3 3 0 0 1 6 0v2" /></svg>
              {count > 0 && (
                <span className="absolute right-0.5 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-ink px-1 text-[11px] font-bold text-white">{count}</span>
              )}
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1320px] flex-1 px-6">{children}</main>

        <footer className="mx-auto flex w-full max-w-[1320px] flex-wrap items-end justify-between gap-x-8 gap-y-4 px-6 pb-12 pt-24 text-[13px] text-muted">
          <div className="flex flex-col gap-3">
            <span className="text-[clamp(48px,7vw,96px)] font-bold leading-none tracking-[-0.04em] text-ink">{BRAND.name[lang]}</span>
            <span>{t.footer.note}</span>
          </div>
          <div className="flex flex-wrap gap-x-7 gap-y-2">
            <span>{t.footer.delivery}</span>
            <span>{t.footer.pay}</span>
            <span>{t.footer.contact}</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
