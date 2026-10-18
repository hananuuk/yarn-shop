import { BRAND } from "@/config";

// Catalog filter choices, in the order the shopper picked them.
export type Pick = { dim: string; value: string };

// 1st pick black, 2nd accent, 3rd accent2 (title words and their pills share the colour).
export const PICK_COLORS = [BRAND.colors.ink, BRAND.colors.accent, BRAND.colors.accent2];

// Stored in the URL as ?f=material:wool|brand:Hill%20Yarns
export function encodePicks(picks: Pick[]) {
  return picks.map((p) => `${p.dim}:${encodeURIComponent(p.value)}`).join("|");
}
