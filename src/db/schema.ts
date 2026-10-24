import {
  customType,
  pgTable, serial, text, integer, boolean, timestamp, real, jsonb, uuid,
  primaryKey, index, bigserial, uniqueIndex,
} from "drizzle-orm/pg-core";

// ---------- People ----------
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  phone: text("phone").notNull().unique(), // 8 digits, Mongolian mobile
  name: text("name"),
  role: text("role").notNull().default("customer"), // customer | admin
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
});

export const otpCodes = pgTable("otp_codes", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull(),
  codeHash: text("code_hash").notNull(),
  attempts: integer("attempts").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("otp_phone_idx").on(t.phone, t.createdAt)]);

export const sessions = pgTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------- Catalog ----------
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  category: text("category").notNull().default("yarn"), // yarn | supplies
  brand: text("brand").notNull().default(""),
  nameMn: text("name_mn").notNull(),
  nameEn: text("name_en").notNull(),
  colorNameMn: text("color_name_mn").notNull().default(""),
  colorNameEn: text("color_name_en").notNull().default(""),
  colorHex: text("color_hex").notNull().default("#D9CBB0"),
  colorFamily: text("color_family").notNull().default("neutral"), // red | blue | green | yellow | pink | neutral | multi
  material: text("material"), // wool | cotton | blend | acrylic | other (null for supplies)
  needleMinMm: real("needle_min_mm"),
  needleMaxMm: real("needle_max_mm"),
  weightG: integer("weight_g"),
  lengthM: integer("length_m"),
  weightTolG: integer("weight_tol_g"), // ± tolerance printed on the label
  lengthTolM: integer("length_tol_m"),
  compositionMn: text("composition_mn").notNull().default(""), // e.g. "Альпака 60%, Патагонийн ноос 40%"
  compositionEn: text("composition_en").notNull().default(""),
  gaugeStitches: integer("gauge_stitches"), // per 10 x 10 cm
  gaugeRows: integer("gauge_rows"),
  gaugeNeedleMm: real("gauge_needle_mm"),
  hookMinMm: real("hook_min_mm"), // crochet hook
  hookMaxMm: real("hook_max_mm"),
  manufacturer: text("manufacturer").notNull().default(""),
  originMn: text("origin_mn").notNull().default(""),
  originEn: text("origin_en").notNull().default(""),
  descriptionMn: text("description_mn").notNull().default(""),
  descriptionEn: text("description_en").notNull().default(""),
  price: integer("price").notNull(), // tugrik
  salePrice: integer("sale_price"), // tugrik, null = not on sale
  stock: integer("stock").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  isNew: boolean("is_new").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productImages = pgTable("product_images", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  sort: integer("sort").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const savedProducts = pgTable("saved_products", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.productId] })]);

// ---------- Basket ----------
export const carts = pgTable("carts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  anonId: text("anon_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("carts_user_idx").on(t.userId), uniqueIndex("carts_anon_idx").on(t.anonId)]);

export const cartItems = pgTable("cart_items", {
  cartId: uuid("cart_id").notNull().references(() => carts.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  qty: integer("qty").notNull(),
}, (t) => [primaryKey({ columns: [t.cartId, t.productId] })]);

// ---------- Orders ----------
export const ORDER_STATUSES = ["pending_payment", "paid", "packed", "shipping", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  number: text("number").unique(),
  userId: uuid("user_id").notNull().references(() => users.id),
  status: text("status").$type<OrderStatus>().notNull().default("pending_payment"),
  subtotal: integer("subtotal").notNull(),
  deliveryFee: integer("delivery_fee").notNull(),
  total: integer("total").notNull(),
  customerName: text("customer_name").notNull(),
  phone: text("phone").notNull(),
  district: text("district").notNull(),
  khoroo: text("khoroo").notNull().default(""),
  address: text("address").notNull(),
  note: text("note").notNull().default(""),
  adminNote: text("admin_note").notNull().default(""),
  lang: text("lang").notNull().default("mn"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("orders_status_idx").on(t.status, t.createdAt), index("orders_user_idx").on(t.userId)]);

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
  nameMn: text("name_mn").notNull(), // snapshot at time of order
  nameEn: text("name_en").notNull(),
  unitPrice: integer("unit_price").notNull(),
  qty: integer("qty").notNull(),
  lineTotal: integer("line_total").notNull(),
});

// Status history: every change, who made it, when.
export const orderEvents = pgTable("order_events", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  note: text("note").notNull().default(""),
  actor: text("actor").notNull().default("system"), // system | customer | admin:<phone>
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(), // mock | qpay
  invoiceId: text("invoice_id").notNull(),
  amount: integer("amount").notNull(),
  status: text("status").notNull().default("pending"), // pending | paid | failed
  data: jsonb("data"), // provider response (QR text, deeplinks...)
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
}, (t) => [index("payments_invoice_idx").on(t.invoiceId)]);

// ---------- Reviews ----------
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  body: text("body").notNull(),
  adminReply: text("admin_reply"),
  repliedAt: timestamp("replied_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("reviews_product_idx").on(t.productId)]);

// ---------- Analytics ----------
// product_view | product_save | add_to_cart | checkout_start | order_created | order_paid | signup | login | logout
export const events = pgTable("events", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  type: text("type").notNull(),
  anonId: text("anon_id"),
  userId: uuid("user_id"),
  productId: integer("product_id"),
  orderId: integer("order_id"),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("events_type_idx").on(t.type, t.createdAt), index("events_product_idx").on(t.productId)]);

// ---------- Uploaded photos ----------
// Stored in the database so the shop runs on hosts without a writable disk.
// Fine for a few hundred product photos; move to a storage bucket if it grows far beyond that.
const bytea = customType<{ data: Buffer; driverData: Buffer | Uint8Array }>({
  dataType: () => "bytea",
  fromDriver: (v) => (Buffer.isBuffer(v) ? v : Buffer.from(v)),
});

export const uploads = pgTable("uploads", {
  id: text("id").primaryKey(), // 24 hex chars
  mime: text("mime").notNull(),
  data: bytea("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------- Settings ----------
// Small key/value store (e.g. which sample-data version has been loaded).
export const meta = pgTable("meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

// ---------- Stitch Studio ----------
// A colourwork chart: cells is a string of palette indexes ("0" = main colour), row by row from the top.
// palette holds shop product ids, index 0 first.
export const designs = pgTable("designs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  cells: text("cells").notNull(),
  palette: jsonb("palette").$type<number[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("designs_user_idx").on(t.userId, t.updatedAt)]);
