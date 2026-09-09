UPDATE "wholesale_items" AS wholesale
SET "categoryId" = retail."categoryId"
FROM "products" AS retail
WHERE wholesale."categoryId" IS NULL
  AND retail."categoryId" IS NOT NULL
  AND (
    (wholesale."sku" IS NOT NULL AND wholesale."sku" = retail."sku")
    OR (wholesale."slug" IS NOT NULL AND wholesale."slug" = retail."slug")
  );
