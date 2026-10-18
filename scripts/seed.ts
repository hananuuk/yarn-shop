// Sample catalog so the shop isn't empty while real products are being sourced.
// Every brand, name and price here is a PLACEHOLDER. Safe to run twice: it skips if products exist.
import { loadEnv } from "./env";
loadEnv();

type Seed = {
  slug: string; brand: string; nameMn: string; nameEn: string; colorNameMn: string; colorNameEn: string;
  colorHex: string; colorFamily: string; material: string | null; needleMinMm: number | null; needleMaxMm: number | null;
  weightG: number | null; lengthM: number | null; price: number; salePrice?: number; stock: number; isNew?: boolean;
  category?: string; descriptionMn: string; descriptionEn: string;
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

async function main() {
  const { getDb, schema } = await import("../src/db");
  const { sql } = await import("drizzle-orm");
  const db = await getDb();
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.products);
  if (n > 0) {
    console.log(`Seed skipped: ${n} products already exist.`);
    return;
  }
  await db.insert(schema.products).values(items.map((i) => ({ ...i, category: i.category ?? "yarn", isNew: i.isNew ?? false })));
  console.log(`Seeded ${items.length} sample products.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
