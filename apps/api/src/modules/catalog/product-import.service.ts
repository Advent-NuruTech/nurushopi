import { prisma, Prisma } from "@nuru/db";
import { productImportRowSchema } from "@nuru/types";
import type { ProductImportEnvelopeInput, ProductImportResult } from "@nuru/types";
import { Errors } from "../../lib/errors.js";
import { uniqueSlug } from "../../lib/slug.js";

export type InventoryActor = { kind: "admin"; id: string } | { kind: "vendor"; id: string };

function readableError(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return "The SKU is already used by another product.";
  }
  return error instanceof Error ? error.message : "Import failed for this row.";
}

async function nextRank(tx: Prisma.TransactionClient, collectionId: string): Promise<number> {
  const aggregate = await tx.collectionMembership.aggregate({
    where: { collectionId },
    _max: { rank: true },
  });
  return (aggregate._max.rank ?? 0) + 1;
}

export async function importProducts(
  input: ProductImportEnvelopeInput,
  actor: InventoryActor,
): Promise<ProductImportResult> {
  const results: ProductImportResult["results"] = [];

  for (const [index, rawRow] of input.rows.entries()) {
    const parsed = productImportRowSchema.safeParse(rawRow);
    if (!parsed.success) {
      const record =
        typeof rawRow === "object" && rawRow !== null ? (rawRow as Record<string, unknown>) : {};
      results.push({
        row: index + 1,
        rowKey: typeof record.rowKey === "string" ? record.rowKey : null,
        sku: typeof record.sku === "string" ? record.sku : "(missing)",
        status: "failed",
        retailProductId: null,
        wholesaleItemId: null,
        collectionsAdded: [],
        error: parsed.error.issues
          .map((issue) => `${issue.path.join(".") || "row"}: ${issue.message}`)
          .join("; "),
      });
      continue;
    }
    const row = parsed.data;
    try {
      const result = await prisma.$transaction(async (tx) => {
        if (row.categoryId) {
          const category = await tx.category.findUnique({
            where: { id: row.categoryId },
            select: { id: true },
          });
          if (!category) throw Errors.badRequest("The selected category does not exist.");
        }

        const keys = [...new Set(row.collectionKeys)];
        const now = new Date();
        const collections = keys.length
          ? await tx.merchandisingCollection.findMany({
              where: {
                key: { in: keys },
                ...(actor.kind === "vendor"
                  ? {
                      status: { in: ["ACTIVE", "SCHEDULED"] },
                      AND: [
                        { OR: [{ startAt: null }, { startAt: { lte: now } }] },
                        { OR: [{ endAt: null }, { endAt: { gt: now } }] },
                      ],
                    }
                  : {}),
              },
              select: { id: true, key: true },
            })
          : [];
        if (collections.length !== keys.length) {
          const found = new Set(collections.map((collection) => collection.key));
          throw Errors.badRequest(
            `Unknown or unavailable collection key: ${keys.filter((key) => !found.has(key)).join(", ")}.`,
          );
        }

        let retailProductId: string | null = null;
        let wholesaleItemId: string | null = null;
        const collectionsAdded: string[] = [];
        let createdAny = false;
        let updatedAny = false;

        if (row.channel === "retail" || row.channel === "both") {
          const existing = await tx.product.findUnique({ where: { sku: row.sku } });
          if (existing && actor.kind === "vendor" && existing.vendorId !== actor.id) {
            throw Errors.forbidden(`SKU ${row.sku} belongs to another seller.`);
          }
          if (existing && input.duplicateStrategy === "error") {
            throw Errors.conflict(`Retail SKU ${row.sku} already exists.`);
          }
          if (existing && input.duplicateStrategy === "skip") {
            retailProductId = existing.id;
          } else if (existing) {
            const updated = await tx.product.update({
              where: { id: existing.id },
              data: {
                name: row.name,
                ...(row.brandName ? { brandName: row.brandName } : {}),
                ...(row.storeName ? { storeName: row.storeName } : {}),
                ...(row.description ? { description: row.description } : {}),
                price: row.price!,
                stock: row.stock,
                lowStockThreshold: row.lowStockThreshold,
                ...(row.categoryId ? { categoryId: row.categoryId } : {}),
                ...(row.images.length ? { images: row.images } : {}),
                ...(row.variants !== undefined ? { variants: row.variants } : {}),
                isActive: row.isActive,
              },
              select: { id: true },
            });
            retailProductId = updated.id;
            updatedAny = true;
          } else {
            const slug = await uniqueSlug(
              row.name,
              async (candidate) =>
                (await tx.product.findUnique({
                  where: { slug: candidate },
                  select: { id: true },
                })) != null,
            );
            const created = await tx.product.create({
              data: {
                name: row.name,
                slug,
                sku: row.sku,
                brandName: row.brandName ?? null,
                storeName: row.storeName ?? null,
                description: row.description ?? null,
                price: row.price!,
                images: row.images,
                variants: row.variants ?? [],
                stock: row.stock,
                lowStockThreshold: row.lowStockThreshold,
                categoryId: row.categoryId ?? null,
                isActive: row.isActive,
                createdById: actor.kind === "admin" ? actor.id : null,
                vendorId: actor.kind === "vendor" ? actor.id : null,
              },
              select: { id: true },
            });
            retailProductId = created.id;
            createdAny = true;
          }

          if (retailProductId && input.duplicateStrategy !== "skip") {
            for (const collection of collections) {
              const existingMembership = await tx.collectionMembership.findUnique({
                where: {
                  collectionId_productId: {
                    collectionId: collection.id,
                    productId: retailProductId,
                  },
                },
                select: { id: true },
              });
              const rank = existingMembership ? undefined : await nextRank(tx, collection.id);
              await tx.collectionMembership.upsert({
                where: {
                  collectionId_productId: {
                    collectionId: collection.id,
                    productId: retailProductId,
                  },
                },
                create: {
                  collectionId: collection.id,
                  productId: retailProductId,
                  source: "MANUAL",
                  rank,
                },
                update: { source: "MANUAL" },
              });
              await tx.merchandisingCollection.update({
                where: { id: collection.id },
                data: { cacheVersion: { increment: 1 } },
              });
              collectionsAdded.push(collection.key);
            }
          }
        }

        if (row.channel === "wholesale" || row.channel === "both") {
          const existing = await tx.wholesaleItem.findUnique({ where: { sku: row.sku } });
          if (existing && actor.kind === "vendor" && existing.vendorId !== actor.id) {
            throw Errors.forbidden(`Wholesale SKU ${row.sku} belongs to another seller.`);
          }
          if (existing && input.duplicateStrategy === "error") {
            throw Errors.conflict(`Wholesale SKU ${row.sku} already exists.`);
          }
          if (existing && input.duplicateStrategy === "skip") {
            wholesaleItemId = existing.id;
          } else if (existing) {
            const updated = await tx.wholesaleItem.update({
              where: { id: existing.id },
              data: {
                name: row.name,
                ...(row.description ? { description: row.description } : {}),
                unitPrice: row.wholesalePrice!,
                minQuantity: row.minQuantity,
                stock: row.stock,
                ...(row.images.length ? { images: row.images } : {}),
                ...(row.variants !== undefined ? { variants: row.variants } : {}),
                isActive: row.isActive,
              },
              select: { id: true },
            });
            wholesaleItemId = updated.id;
            updatedAny = true;
          } else {
            const slug = await uniqueSlug(
              row.name,
              async (candidate) =>
                (await tx.wholesaleItem.findUnique({
                  where: { slug: candidate },
                  select: { id: true },
                })) != null,
            );
            const created = await tx.wholesaleItem.create({
              data: {
                name: row.name,
                slug,
                sku: row.sku,
                description: row.description ?? null,
                unitPrice: row.wholesalePrice!,
                minQuantity: row.minQuantity,
                stock: row.stock,
                images: row.images,
                variants: row.variants ?? [],
                isActive: row.isActive,
                vendorId: actor.kind === "vendor" ? actor.id : null,
              },
              select: { id: true },
            });
            wholesaleItemId = created.id;
            createdAny = true;
          }
        }

        if (actor.kind === "admin") {
          await tx.adminLog.create({
            data: {
              adminId: actor.id,
              action: "inventory.product.imported",
              entity: "product_import",
              entityId: retailProductId ?? wholesaleItemId,
              metadata: { sku: row.sku, channel: row.channel, collections: keys },
            },
          });
        }

        return {
          retailProductId,
          wholesaleItemId,
          collectionsAdded,
          status: createdAny
            ? ("created" as const)
            : updatedAny
              ? ("updated" as const)
              : ("skipped" as const),
        };
      });

      results.push({
        row: index + 1,
        rowKey: row.rowKey ?? null,
        sku: row.sku,
        status: result.status,
        retailProductId: result.retailProductId,
        wholesaleItemId: result.wholesaleItemId,
        collectionsAdded: result.collectionsAdded,
        error: null,
      });
    } catch (error) {
      results.push({
        row: index + 1,
        rowKey: row.rowKey ?? null,
        sku: row.sku,
        status: "failed",
        retailProductId: null,
        wholesaleItemId: null,
        collectionsAdded: [],
        error: readableError(error),
      });
    }
  }

  return {
    total: results.length,
    created: results.filter((row) => row.status === "created").length,
    updated: results.filter((row) => row.status === "updated").length,
    skipped: results.filter((row) => row.status === "skipped").length,
    failed: results.filter((row) => row.status === "failed").length,
    results,
  };
}
