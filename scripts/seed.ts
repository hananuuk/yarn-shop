// Sample catalog so the shop isn't empty while real products are being sourced.
// Every brand, name and price here is a PLACEHOLDER. Safe to run twice: it skips if products exist.
import { loadEnv } from "./env";
loadEnv();

type Seed = {
  slug: string; brand: string; nameMn: string; nameEn: string; colorNameMn: string; colorNameEn: string;
  colorHex: string; colorFamily: string; material: string | null; needleMinMm: number | null; needleMaxMm: number | null;
  weightG: number | null; lengthM: number | null; price: number; salePrice?: number; stock: number; isNew?: boolean;
  category?: string; descriptionMn: string; descriptionEn: string;
  weightTolG?: number; lengthTolM?: number; compositionMn?: string; compositionEn?: string;
  gaugeStitches?: number; gaugeRows?: number; gaugeNeedleMm?: number; manufacturer?: string; originMn?: string; originEn?: string;
};

const merino = { mn: "Зөөлөн, загатнадаггүй мерино ноос. Ороолт, малгай, цамцанд тохиромжтой.", en: "Soft, non-itchy merino wool. Good for scarves, hats and sweaters." };
const cotton = { mn: "Өдөр тутмын хөвөн ээрмэл. Зуны цамц, хүүхдийн хувцас, гэр ахуйн бүтээлд.", en: "Everyday cotton yarn for summer tops, baby clothes and homeware." };
const blend = { mn: "Ноос, нийлэг утасны холимог. Удаан эдэлгээтэй, угаахад хялбар.", en: "Wool and synthetic blend. Hard-wearing and easy to wash." };
const acrylic = { mn: "Хямд, өнгө олонтой акрил ээрмэл. Эхлэн суралцагчдад тохиромжтой.", en: "Affordable acrylic in lots of colours. Great for beginners." };

const items: Seed[] = [
  { slug: "merino-soft-ink-blue", brand: "Steppe & Co", nameMn: "Merino Soft", nameEn: "Merino Soft", colorNameMn: "Хар хөх", colorNameEn: "Ink blue", colorHex: "#2E3A5C", colorFamily: "blue", material: "wool", needleMinMm: 4, needleMaxMm: 4.5, weightG: 100, lengthM: 220, price: 18500, stock: 24, isNew: true, descriptionMn: merino.mn, descriptionEn: merino.en },
  { slug: "merino-soft-madder-red", brand: "Steppe & Co", nameMn: "Merino Soft", nameEn: "Merino Soft", colorNameMn: "Улаан", colorNameEn: "Madder red", colorHex: "#A8392B", colorFamily: "red", material: "wool", needleMinMm: 4, needleMaxMm: 4.5, weightG: 100, lengthM: 220, price: 18500, stock: 18, descriptionMn: merino.mn, descriptionEn: merino.en },
  { slug: "merino-fine-moss", brand: "Steppe & Co", nameMn: "Merino Fine", nameEn: "Merino Fine", colorNameMn: "Хөвд ногоон", colorNameEn: "Moss", colorHex: "#5E6B3A", colorFamily: "green", material: "wool", needleMinMm: 2.5, needleMaxMm: 3, weightG: 50, lengthM: 210, price: 21900, stock: 10, descriptionMn: merino.mn, descriptionEn: merino.en },
  { slug: "cotton-daily-oat", brand: "Utas Basics", nameMn: "Cotton Daily", nameEn: "Cotton Daily", colorNameMn: "Цайвар шаргал", colorNameEn: "Oat", colorHex: "#D9CBB0", colorFamily: "neutral", material: "cotton", needleMinMm: 3, needleMaxMm: 3, weightG: 100, lengthM: 170, price: 12900, stock: 30, descriptionMn: cotton.mn, descriptionEn: cotton.en },
  { slug: "cotton-daily-sage", brand: "Utas Basics", nameMn: "Cotton Daily", nameEn: "Cotton Daily", colorNameMn: "Ногоовтор", colorNameEn: "Sage", colorHex: "#8FA388", colorFamily: "green", material: "cotton", needleMinMm: 3, needleMaxMm: 3, weightG: 100, lengthM: 170, price: 12900, salePrice: 10900, stock: 14, descriptionMn: cotton.mn, descriptionEn: cotton.en },
  { slug: "cotton-daily-coral", brand: "Utas Basics", nameMn: "Cotton Daily", nameEn: "Cotton Daily", colorNameMn: "Шүрэн", colorNameEn: "Coral", colorHex: "#E07A5F", colorFamily: "red", material: "cotton", needleMinMm: 3, needleMaxMm: 3, weightG: 100, lengthM: 170, price: 12900, stock: 0, descriptionMn: cotton.mn, descriptionEn: cotton.en },
  { slug: "steppe-blend-charcoal", brand: "Hill Yarns", nameMn: "Steppe Blend", nameEn: "Steppe Blend", colorNameMn: "Бараан саарал", colorNameEn: "Charcoal", colorHex: "#3B3B3B", colorFamily: "neutral", material: "blend", needleMinMm: 5, needleMaxMm: 5.5, weightG: 100, lengthM: 200, price: 15900, stock: 20, descriptionMn: blend.mn, descriptionEn: blend.en },
  { slug: "steppe-blend-mustard", brand: "Hill Yarns", nameMn: "Steppe Blend", nameEn: "Steppe Blend", colorNameMn: "Гич шар", colorNameEn: "Mustard", colorHex: "#C9962E", colorFamily: "yellow", material: "blend", needleMinMm: 5, needleMaxMm: 5.5, weightG: 100, lengthM: 200, price: 15900, stock: 16, isNew: true, descriptionMn: blend.mn, descriptionEn: blend.en },
  { slug: "steppe-blend-teal", brand: "Hill Yarns", nameMn: "Steppe Blend", nameEn: "Steppe Blend", colorNameMn: "Номин", colorNameEn: "Teal", colorHex: "#2F6F73", colorFamily: "blue", material: "blend", needleMinMm: 5, needleMaxMm: 5.5, weightG: 100, lengthM: 200, price: 15900, stock: 12, descriptionMn: blend.mn, descriptionEn: blend.en },
  { slug: "easy-acrylic-sky", brand: "Cloud Line", nameMn: "Easy Acrylic", nameEn: "Easy Acrylic", colorNameMn: "Цэнхэр", colorNameEn: "Sky", colorHex: "#7FA7C9", colorFamily: "blue", material: "acrylic", needleMinMm: 4, needleMaxMm: 5, weightG: 100, lengthM: 250, price: 6900, stock: 40, descriptionMn: acrylic.mn, descriptionEn: acrylic.en },
  { slug: "easy-acrylic-rose", brand: "Cloud Line", nameMn: "Easy Acrylic", nameEn: "Easy Acrylic", colorNameMn: "Ягаан", colorNameEn: "Rose", colorHex: "#D79A9A", colorFamily: "pink", material: "acrylic", needleMinMm: 4, needleMaxMm: 5, weightG: 100, lengthM: 250, price: 6900, salePrice: 5500, stock: 35, descriptionMn: acrylic.mn, descriptionEn: acrylic.en },
  { slug: "chunky-cloud-cream", brand: "Cloud Line", nameMn: "Chunky Cloud", nameEn: "Chunky Cloud", colorNameMn: "Цөцгий", colorNameEn: "Cream", colorHex: "#FBF7EE", colorFamily: "neutral", material: "acrylic", needleMinMm: 8, needleMaxMm: 8, weightG: 200, lengthM: 90, price: 9900, stock: 8, descriptionMn: "Зузаан, хурдан нэхэгддэг ээрмэл. Хөнжил, том ороолтонд.", descriptionEn: "Chunky, quick-to-knit yarn for blankets and big scarves." },
  // Supplies
  { slug: "bamboo-needles-4mm", category: "supplies", brand: "Utas Basics", nameMn: "Хулсан зүү 4 мм", nameEn: "Bamboo needles 4 mm", colorNameMn: "", colorNameEn: "", colorHex: "#C9A86A", colorFamily: "neutral", material: null, needleMinMm: 4, needleMaxMm: 4, weightG: null, lengthM: null, price: 8900, stock: 15, descriptionMn: "Хөнгөн, гулгамтгай биш хулсан шулуун зүү, 35 см.", descriptionEn: "Light bamboo straight needles that don't slip, 35 cm." },
  { slug: "circular-needles-5mm", category: "supplies", brand: "Utas Basics", nameMn: "Дугуй зүү 5 мм", nameEn: "Circular needles 5 mm", colorNameMn: "", colorNameEn: "", colorHex: "#9BA3A8", colorFamily: "neutral", material: null, needleMinMm: 5, needleMaxMm: 5, weightG: null, lengthM: null, price: 14900, stock: 9, descriptionMn: "Металл дугуй зүү, 80 см утастай.", descriptionEn: "Metal circular needles with an 80 cm cable." },
  { slug: "stitch-markers", category: "supplies", brand: "Utas Basics", nameMn: "Нүдний тэмдэглэгээ (20 ш)", nameEn: "Stitch markers (20 pcs)", colorNameMn: "", colorNameEn: "", colorHex: "#D97757", colorFamily: "multi", material: null, needleMinMm: null, needleMaxMm: null, weightG: null, lengthM: null, price: 4500, stock: 25, descriptionMn: "Өнгө өнгийн хуванцар тэмдэглэгээ.", descriptionEn: "Colourful plastic stitch markers." },
];

// ---- Version 2: Amano "Andes" (real product specs; price and stock are placeholders) ----
const andesText = {
  mn: "Супер файн альпака, Патагонийн ноосны хольцтой твид ээрмэл. Альпака нь зөөлөн бөгөөд дулаан, Патагонийн ноос нь бат бөх боловч загатнадаггүй.\n\nДотроо агаар ихтэй ээрсэн тул хөнгөн, дулаан. Твидийн өнгө өнгийн толбо нь нэхмэлийг баялаг харагдуулна.\n\nНүд жигд гардаг тул намар, өвлийн цамц, малгай, ороолт зэрэг олон бүтээлд тохиромжтой.",
  en: "A tweed yarn of superfine alpaca and Patagonian wool. The alpaca brings softness and warmth; the wool adds strength without itch.\n\nSpun loosely to hold plenty of air, so it knits up light and warm. Flecks of colour give the fabric depth.\n\nStitches come out even, which makes it a good all-rounder for autumn and winter sweaters, hats and scarves.",
};
const andes = {
  brand: "Amano", nameMn: "Andes", nameEn: "Andes", material: "alpaca", needleMinMm: 3.75, needleMaxMm: 4,
  weightG: 50, weightTolG: 5, lengthM: 150, lengthTolM: 15,
  compositionMn: "Альпака 60%, Патагонийн ноос 40%", compositionEn: "Alpaca 60%, Patagonian wool 40%",
  gaugeStitches: 21, gaugeRows: 28, gaugeNeedleMm: 4, manufacturer: "Amano", originMn: "Перу", originEn: "Peru",
  price: 16900, isNew: true, descriptionMn: andesText.mn, descriptionEn: andesText.en,
};
const itemsV2: Seed[] = [
  { ...andes, slug: "andes-charcoal-tweed", colorNameMn: "Бараан саарал твид", colorNameEn: "Charcoal tweed", colorHex: "#66625F", colorFamily: "neutral", stock: 20 },
  { ...andes, slug: "andes-teal-tweed", colorNameMn: "Номин твид", colorNameEn: "Teal tweed", colorHex: "#2F6B78", colorFamily: "blue", stock: 14 },
  { ...andes, slug: "andes-rust-tweed", colorNameMn: "Хүрэн твид", colorNameEn: "Rust tweed", colorHex: "#7B4B31", colorFamily: "neutral", stock: 12 },
  { ...andes, slug: "andes-forest-tweed", colorNameMn: "Ногоон твид", colorNameEn: "Forest tweed", colorHex: "#3D4D2B", colorFamily: "green", stock: 3 },
  { ...andes, slug: "andes-natural", colorNameMn: "Цайвар", colorNameEn: "Natural", colorHex: "#ECE5D5", colorFamily: "neutral", stock: 16 },
];

// ---- Version 3: Knitting for Olive "Pure Silk" (specs and price from Hana; stock is a placeholder) ----
const itemsV3: Seed[] = [
  {
    slug: "pure-silk-cherry-blossom", brand: "Knitting for Olive", nameMn: "Pure Silk", nameEn: "Pure Silk",
    colorNameMn: "Интоорын цэцэг", colorNameEn: "Cherry blossom", colorHex: "#F2CDD3", colorFamily: "pink",
    material: "silk", needleMinMm: 3, needleMaxMm: 3, weightG: 50, lengthM: 250,
    compositionMn: "100% жинхэнэ торго", compositionEn: "100% real silk",
    gaugeStitches: 28, gaugeRows: 38, gaugeNeedleMm: 3, manufacturer: "Knitting for Olive",
    price: 35000, stock: 10, isNew: true,
    descriptionMn: "100% торгон нарийн ээрмэл. Гөлгөр, зөөлөн гялалзсан, хөнгөн. Зуны цамц, нимгэн ороолт, нарийн хээнд тохиромжтой.",
    descriptionEn: "A fine yarn of 100% silk. Smooth, softly lustrous and light. Lovely for summer tops, airy scarves and fine colourwork.",
  },
];

// Each version is loaded once per database, tracked in the "meta" table.
// Deleting a sample product in the admin will not bring it back on the next deploy.
async function main() {
  const { getDb, schema } = await import("../src/db");
  const { sql, eq } = await import("drizzle-orm");
  const db = await getDb();
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.products);
  const [row] = await db.select().from(schema.meta).where(eq(schema.meta.key, "seed_version"));
  // Databases seeded before versioning existed already have version 1.
  let version = row ? Number(row.value) : n > 0 ? 1 : 0;
  const fill = (i: Seed) => ({ ...i, category: i.category ?? "yarn", isNew: i.isNew ?? false });

  if (version < 1) {
    await db.insert(schema.products).values(items.map(fill)).onConflictDoNothing();
    console.log(`Seed v1: ${items.length} sample products.`);
    version = 1;
  }
  if (version < 2) {
    await db.insert(schema.products).values(itemsV2.map(fill)).onConflictDoNothing();
    console.log(`Seed v2: ${itemsV2.length} Andes colourways.`);
    version = 2;
  }
  if (version < 3) {
    await db.insert(schema.products).values(itemsV3.map(fill)).onConflictDoNothing();
    console.log(`Seed v3: ${itemsV3.length} Pure Silk colourway.`);
    version = 3;
  }
  await db
    .insert(schema.meta)
    .values({ key: "seed_version", value: String(version) })
    .onConflictDoUpdate({ target: schema.meta.key, set: { value: String(version) } });
  console.log(`Sample data at version ${version}.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
