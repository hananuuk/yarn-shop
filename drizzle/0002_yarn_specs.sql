CREATE TABLE "meta" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "weight_tol_g" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "length_tol_m" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "composition_mn" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "composition_en" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "gauge_stitches" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "gauge_rows" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "gauge_needle_mm" real;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "hook_min_mm" real;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "hook_max_mm" real;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "manufacturer" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "origin_mn" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "origin_en" text DEFAULT '' NOT NULL;