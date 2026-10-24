import { PaintedYarnBall, PALETTE } from "@/components/Storybook";

type P = {
  category: string;
  colorHex: string;
  images: { url: string }[];
  alt: string;
  className?: string;
  index?: number;
  seed?: number; // decides whether a small creature lives on this placeholder
};

// Shows the product's first photo, or a drawn placeholder in the product's colour.
export function ProductImage({ category, colorHex, images, alt, className = "", index = 0, seed = 0 }: P) {
  const img = images[index] ?? images[0];
  if (img) {
    // mix-blend-multiply: a white or light-grey photo background takes on the tile colour,
    // so supplier photos shot on different backdrops still look like one shop.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={img.url} alt={alt} className={`h-full w-full object-cover mix-blend-multiply ${className}`} loading="lazy" />;
  }
  return category === "supplies" ? <NeedlesArt hex={colorHex} alt={alt} className={className} /> : <PaintedYarnBall hex={colorHex} alt={alt} seed={seed} className={className} />;
}

function NeedlesArt({ hex, alt, className = "" }: { hex: string; alt: string; className?: string }) {
  const ink = PALETTE.ink;
  return (
    <svg viewBox="0 0 200 200" role="img" aria-label={alt} className={`h-auto w-[56%] overflow-visible ${className}`}>
      <ellipse cx="100" cy="178" rx="60" ry="5" fill={ink} opacity="0.1" filter="url(#loop-wobble)" />
      <g filter="url(#loop-paint)" strokeLinecap="round">
        <line x1="52" y1="168" x2="132" y2="28" stroke={ink} strokeWidth="11" />
        <line x1="52" y1="168" x2="132" y2="28" stroke={hex} strokeWidth="8" />
        <line x1="148" y1="168" x2="68" y2="28" stroke={ink} strokeWidth="11" />
        <line x1="148" y1="168" x2="68" y2="28" stroke={hex} strokeWidth="8" />
        <circle cx="52" cy="168" r="11" fill={PALETTE.tomato} stroke={ink} strokeWidth="1.8" />
        <circle cx="148" cy="168" r="11" fill={PALETTE.lavender} stroke={ink} strokeWidth="1.8" />
      </g>
    </svg>
  );
}
