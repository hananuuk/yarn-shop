import { isDark } from "@/lib/products";

type P = {
  category: string;
  colorHex: string;
  images: { url: string }[];
  alt: string;
  className?: string;
  index?: number;
};

// Shows the product's first photo, or a drawn placeholder in the product's colour.
export function ProductImage({ category, colorHex, images, alt, className = "", index = 0 }: P) {
  const img = images[index] ?? images[0];
  if (img) {
    // mix-blend-multiply: a white or light-grey photo background takes on the tile colour,
    // so supplier photos shot on different backdrops still look like one shop.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={img.url} alt={alt} className={`h-full w-full object-cover mix-blend-multiply ${className}`} loading="lazy" />;
  }
  return category === "supplies" ? <NeedlesArt hex={colorHex} alt={alt} className={className} /> : <YarnBall hex={colorHex} alt={alt} className={className} />;
}

export function YarnBall({ hex, alt, className = "" }: { hex: string; alt: string; className?: string }) {
  // Same colour => same clip shape, so a shared id is harmless.
  const id = "ball-" + hex.replace("#", "");
  const line = isDark(hex) ? "rgba(255,255,255,.16)" : "rgba(0,0,0,.14)";
  return (
    <svg viewBox="0 0 200 200" role="img" aria-label={alt} className={`h-auto w-[62%] ${className}`}>
      <defs>
        <clipPath id={id}><circle cx="100" cy="100" r="62" /></clipPath>
      </defs>
      <ellipse cx="100" cy="174" rx="56" ry="7" fill="rgba(60,40,10,.10)" />
      <path d="M146 146c18 14 24 28 44 26" fill="none" stroke={hex} strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="100" cy="100" r="62" fill={hex} stroke="rgba(0,0,0,.10)" strokeWidth="1" />
      <g clipPath={`url(#${id})`} fill="none" stroke={line} strokeWidth="2.6" strokeLinecap="round">
        <path d="M40 72c34-22 92-14 124 22" />
        <path d="M36 102c40-22 92-8 128 24" />
        <path d="M44 136c40-20 84-10 118 16" />
        <path d="M70 38c-14 44-4 98 34 128" />
        <path d="M112 36c-20 46-8 96 34 120" />
        <path d="M150 52c-30 30-38 76-24 116" />
      </g>
      <path d="M62 64c22-22 60-26 86-6" fill="none" stroke="rgba(255,255,255,.28)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function NeedlesArt({ hex, alt, className = "" }: { hex: string; alt: string; className?: string }) {
  return (
    <svg viewBox="0 0 200 200" role="img" aria-label={alt} className={`h-auto w-[56%] ${className}`}>
      <ellipse cx="100" cy="176" rx="60" ry="6" fill="rgba(60,40,10,.10)" />
      <g strokeLinecap="round">
        <line x1="52" y1="168" x2="132" y2="28" stroke={hex} strokeWidth="9" />
        <line x1="148" y1="168" x2="68" y2="28" stroke={hex} strokeWidth="9" />
        <circle cx="52" cy="168" r="10" fill="#141414" />
        <circle cx="148" cy="168" r="10" fill="#141414" />
      </g>
    </svg>
  );
}
