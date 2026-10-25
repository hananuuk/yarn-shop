import Link from "next/link";

export default function NotFound() {
  return (
    <div className="pt-20">
      <h1 className="text-[clamp(44px,7.2vw,104px)] font-semibold leading-none tracking-[-0.035em]">404</h1>
      <p className="mt-4 text-lg text-muted">Хуудас олдсонгүй · Page not found</p>
      <Link href="/mn" className="btn mt-8">loop</Link>
    </div>
  );
}
