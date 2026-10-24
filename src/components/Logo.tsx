// Placeholder mark: a yarn ball. Replace with the real logo when the brand is decided.
export function Logo({ size = 38 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <circle cx="20" cy="20" r="15" />
      <path d="M8 14c8 2 17 8 23 17M6 21c8 1 15 5 19 12M13 7c6 4 15 12 20 20" />
      <path d="M31 31c3 2 5 3 7 2" />
    </svg>
  );
}
