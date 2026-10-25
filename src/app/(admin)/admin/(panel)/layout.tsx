import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "./AdminNav";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="flex min-h-screen flex-wrap">
      <aside className="flex w-full flex-col gap-6 border-line bg-white px-5 py-6 md:sticky md:top-0 md:h-screen md:w-60 md:border-r">
        <Link href="/admin" className="text-xl font-bold tracking-tight">loop <span className="text-sm font-semibold text-muted">admin</span></Link>
        <AdminNav />
        <div className="mt-auto hidden flex-col gap-2 text-sm text-muted md:flex">
          <span>+976 {admin.phone}</span>
          <Link href="/mn" className="underline underline-offset-4">Open shop ↗</Link>
        </div>
      </aside>
      <main className="min-w-0 flex-[999_1_560px] px-6 py-8 md:px-10">{children}</main>
    </div>
  );
}
