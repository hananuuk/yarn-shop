// Everything brand- and business-specific lives here so it can be changed in one place.

export const BRAND = {
  name: { mn: "loop", en: "loop" },
  colors: {
    ink: "#3A2417", // chocolate brown: text, outlines, first title part
    accent: "#B8391D", // tomato: second title part, sale prices
    accent2: "#4E7A2C", // leaf green: third title part
    tile: "#EFE3C8", // product tile paper; shoot product photos on a similar warm backdrop
  },
};

export const LANGS = ["mn", "en"] as const;
export type Lang = (typeof LANGS)[number];
export const isLang = (v: string): v is Lang => (LANGS as readonly string[]).includes(v);

export const MATERIALS = ["wool", "alpaca", "cashmere", "yak", "camel", "cotton", "blend", "acrylic", "other"] as const;
export type Material = (typeof MATERIALS)[number];

export const COLOR_FAMILIES = ["red", "blue", "green", "yellow", "pink", "neutral", "multi"] as const;

// Needle-size groups used by the catalog filter. A yarn matches a group when its
// recommended needle range overlaps the group's range.
export const NEEDLE_GROUPS = {
  s: { min: 2, max: 3, label: { mn: "2–3 мм", en: "2–3 mm" } },
  m: { min: 3.5, max: 4.5, label: { mn: "3.5–4.5 мм", en: "3.5–4.5 mm" } },
  l: { min: 5, max: 6, label: { mn: "5–6 мм", en: "5–6 mm" } },
  xl: { min: 7, max: 50, label: { mn: "7 мм+", en: "7 mm+" } },
} as const;
export type NeedleGroup = keyof typeof NEEDLE_GROUPS;

// Ulaanbaatar districts (delivery is UB only for now).
export const DISTRICTS = [
  { id: "bayangol", mn: "Баянгол", en: "Bayangol" },
  { id: "bayanzurkh", mn: "Баянзүрх", en: "Bayanzürkh" },
  { id: "songinokhairkhan", mn: "Сонгинохайрхан", en: "Songinokhairkhan" },
  { id: "sukhbaatar", mn: "Сүхбаатар", en: "Sükhbaatar" },
  { id: "khan-uul", mn: "Хан-Уул", en: "Khan-Uul" },
  { id: "chingeltei", mn: "Чингэлтэй", en: "Chingeltei" },
  { id: "nalaikh", mn: "Налайх", en: "Nalaikh" },
  { id: "baganuur", mn: "Багануур", en: "Baganuur" },
  { id: "bagakhangai", mn: "Багахангай", en: "Bagakhangai" },
] as const;

export function deliveryFee(): number {
  const n = Number(process.env.DELIVERY_FEE ?? 5000);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : 5000;
}

export function siteUrl(): string {
  return (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function adminPhones(): string[] {
  return (process.env.ADMIN_PHONES || "").split(",").map((s) => s.trim()).filter(Boolean);
}

export const money = (n: number) => n.toLocaleString("en-US") + "₮";
