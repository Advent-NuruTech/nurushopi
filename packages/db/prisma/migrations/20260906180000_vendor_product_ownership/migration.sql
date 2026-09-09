-- Vendor-owned inventory is additive so existing admin-managed rows remain valid.
ALTER TABLE "products" ADD COLUMN "vendorId" TEXT;
ALTER TABLE "wholesale_items" ADD COLUMN "vendorId" TEXT;
ALTER TABLE "wholesale_items" ADD COLUMN "sku" TEXT;

CREATE UNIQUE INDEX "wholesale_items_sku_key" ON "wholesale_items"("sku");
CREATE INDEX "products_vendorId_idx" ON "products"("vendorId");
CREATE INDEX "wholesale_items_vendorId_idx" ON "wholesale_items"("vendorId");

ALTER TABLE "products"
  ADD CONSTRAINT "products_vendorId_fkey"
  FOREIGN KEY ("vendorId") REFERENCES "vendor_accounts"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "wholesale_items"
  ADD CONSTRAINT "wholesale_items_vendorId_fkey"
  FOREIGN KEY ("vendorId") REFERENCES "vendor_accounts"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
