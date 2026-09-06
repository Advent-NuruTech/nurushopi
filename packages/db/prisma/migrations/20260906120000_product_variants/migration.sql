ALTER TABLE "products" ADD COLUMN "variants" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "wholesale_items" ADD COLUMN "variants" JSONB NOT NULL DEFAULT '[]';
