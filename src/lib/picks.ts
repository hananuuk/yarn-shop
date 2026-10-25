// Catalog filter choices, in the order the shopper picked them.
export type Pick = { dim: string; value: string };

// Title size of each pick, in pick order: the 1st is largest, each later one smaller.
export const PICK_SCALES = [1, 0.66, 0.46];
export const pickScale = (i: number) => PICK_SCALES[Math.min(i, PICK_SCALES.length - 1)];

// Stored in the URL as ?f=material:wool|brand:Hill%20Yarns
export function encodePicks(picks: Pick[]) {
  return picks.map((p) => `${p.dim}:${encodeURIComponent(p.value)}`).join("|");
}
