import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { Lang } from "@/config";
import { getDict } from "@/lib/i18n";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Нэвтрэх · Log in" };

export default async function LoginPage({ params, searchParams }: { params: Promise<{ lang: Lang }>; searchParams: Promise<{ next?: string }> }) {
  const { lang } = await params;
  const { next } = await searchParams;
  const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : `/${lang}/account`;
  if (await getCurrentUser()) redirect(safe);
  const t = getDict(lang).login;
  return (
    <div className="mx-auto max-w-md pt-14">
      <h1 className="text-[clamp(40px,6vw,72px)] font-semibold leading-none tracking-[-0.035em]">{t.title}</h1>
      <p className="mt-4 text-muted">{t.note}</p>
      <LoginForm
        lang={lang}
        next={safe}
        t={{
          phone: t.phone, phonePh: t.phonePh, sendCode: t.sendCode, code: t.code, verify: t.verify,
          changePhone: t.changePhone, resend: t.resend, sentTpl: t.sent("{p}"), devTpl: t.devCode("{c}"), errors: t.errors,
        }}
      />
    </div>
  );
}
