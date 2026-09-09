ALTER TABLE "wholesale_items" ADD COLUMN "categoryId" TEXT;

CREATE INDEX "wholesale_items_categoryId_idx" ON "wholesale_items"("categoryId");

ALTER TABLE "wholesale_items"
ADD CONSTRAINT "wholesale_items_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "categories"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
