// The loop logo: a caterpillar in a bobble hat on a leaf, with "loop" nibbled out of it.
// Header version without the "yarn shop" line; the full logo is public/brand/loop-logo.png.
export function Logo({ className = "" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/brand/loop-mark-h144.png" alt="loop" width={211} height={144} className={`h-14 w-auto md:h-[72px] ${className}`} />
  );
}
