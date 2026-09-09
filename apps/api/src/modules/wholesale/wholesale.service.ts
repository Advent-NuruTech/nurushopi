import { prisma, Prisma } from "@nuru/db";
import type {
  Paginated,
  WholesaleItemCreateInput,
  WholesaleItemDTO,
  WholesaleItemQuery,
  WholesaleItemUpdateInput,
} from "@nuru/types";
import { Errors } from "../../lib/errors.js";
import { deleteCloudinaryImages } from "../../lib/cloudinary.js";
import { uniqueSlug } from "../../lib/slug.js";
import { toWholesaleItemDTO } from "./serializers.js";

async function slugTaken(slug: string, excludeId?: string): Promise<boolean> {
  const existing = await prisma.wholesaleItem.findUnique({
    where: { slug },
    select: { id: true },
  });
  return existing != null && existing.id !== excludeId;
}

function buildWhere(
  query: WholesaleItemQuery,
  enforceActive: boolean,
  vendorId?: string,
): Prisma.WholesaleItemWhereInput {
  const where: Prisma.WholesaleItemWhereInput = {};

  if (vendorId) where.vendorId = vendorId;

  if (enforceActive) where.isActive = true;
  else if (query.isActive !== undefined) where.isActive = query.isActive;

  if (query.minQuantity !== undefined) where.minQuantity = { gte: query.minQuantity };
  if (query.inStock) where.stock = { gt: 0 };
  if (query.categorySlug) where.category = { slug: query.categorySlug };

  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    where.unitPrice = {
      ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
      ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
    };
  }

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { sku: { contains: query.search, mode: "insensitive" } },
      { description: { contains: query.search, mode: "insensitive" } },
    ];
  }

  return where;
}

function buildOrderBy(
  sort: WholesaleItemQuery["sort"],
): Prisma.WholesaleItemOrderByWithRelationInput {
  switch (sort) {
    case "oldest":
      return { createdAt: "asc" };
    case "price_asc":
      return { unitPrice: "asc" };
    case "price_desc":
      return { unitPrice: "desc" };
    case "name":
      return { name: "asc" };
    case "newest":
    default:
      return { createdAt: "desc" };
  }
}

export async function list(
  query: WholesaleItemQuery,
  { enforceActive, vendorId }: { enforceActive: boolean; vendorId?: string },
): Promise<Paginated<WholesaleItemDTO>> {
  const where = buildWhere(query, enforceActive, vendorId);
  const skip = (query.page - 1) * query.pageSize;

  const [total, rows] = await prisma.$transaction([
    prisma.wholesaleItem.count({ where }),
    prisma.wholesaleItem.findMany({
      where,
      include: { category: { select: { id: true, name: true, slug: true } } },
      orderBy: buildOrderBy(query.sort),
      skip,
      take: query.pageSize,
    }),
  ]);

  return {
    items: rows.map(toWholesaleItemDTO),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

export async function getByIdOrSlug(
  idOrSlug: string,
  { activeOnly, vendorId }: { activeOnly: boolean; vendorId?: string },
) {
  const row = await prisma.wholesaleItem.findFirst({
    where: {
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      ...(activeOnly ? { isActive: true } : {}),
      ...(vendorId ? { vendorId } : {}),
    },
    include: { category: { select: { id: true, name: true, slug: true } } },
  });
  if (!row) throw Errors.notFound("Wholesale item not found.");
  return toWholesaleItemDTO(row);
}

export async function create(input: WholesaleItemCreateInput, vendorId?: string) {
  await assertCategoryExists(input.categoryId);
  const slug = await uniqueSlug(input.slug ?? input.name, (s) => slugTaken(s));

  const row = await prisma.wholesaleItem.create({
    data: {
      name: input.name,
      slug,
      sku: input.sku ?? null,
      description: input.description ?? null,
      unitPrice: input.unitPrice,
      minQuantity: input.minQuantity ?? 1,
      stock: input.stock ?? 0,
      images: input.images ?? [],
      variants: input.variants ?? [],
      isActive: input.isActive ?? true,
      categoryId: input.categoryId ?? null,
      vendorId: vendorId ?? null,
    },
    include: { category: { select: { id: true, name: true, slug: true } } },
  });
  return toWholesaleItemDTO(row);
}

export async function update(id: string, input: WholesaleItemUpdateInput, vendorId?: string) {
  const current = await prisma.wholesaleItem.findFirst({
    where: { id, ...(vendorId ? { vendorId } : {}) },
  });
  if (!current) throw Errors.notFound("Wholesale item not found.");
  if (input.categoryId !== undefined) await assertCategoryExists(input.categoryId);

  let slug = current.slug;
  if (input.slug !== undefined || input.name !== undefined) {
    const base = input.slug ?? input.name ?? current.name;
    slug = await uniqueSlug(base, (s) => slugTaken(s, id));
  }

  const row = await prisma.wholesaleItem.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(slug !== current.slug ? { slug } : {}),
      ...(input.sku !== undefined ? { sku: input.sku } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.unitPrice !== undefined ? { unitPrice: input.unitPrice } : {}),
      ...(input.minQuantity !== undefined ? { minQuantity: input.minQuantity } : {}),
      ...(input.stock !== undefined ? { stock: input.stock } : {}),
      ...(input.images !== undefined ? { images: input.images } : {}),
      ...(input.variants !== undefined ? { variants: input.variants } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
    },
    include: { category: { select: { id: true, name: true, slug: true } } },
  });
  if (input.images !== undefined) {
    const next = new Set(input.images);
    await deleteCloudinaryImages(current.images.filter((url) => !next.has(url)));
  }
  if (input.stock !== undefined && current.stock > 0 && input.stock === 0) {
    await prisma.notification.create({
      data: {
        recipientType: "ADMIN",
        recipientId: null,
        title: "Wholesale item out of stock",
        body: `${row.name} is now out of stock.`,
        type: "inventory",
        relatedId: row.id,
      },
    });
  }
  return toWholesaleItemDTO(row);
}

async function assertCategoryExists(categoryId: string | null | undefined): Promise<void> {
  if (!categoryId) return;
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true },
  });
  if (!category) throw Errors.badRequest("The selected category does not exist.");
}

export async function remove(id: string, vendorId?: string): Promise<void> {
  const current = await prisma.wholesaleItem.findFirst({
    where: { id, ...(vendorId ? { vendorId } : {}) },
    select: { id: true, images: true },
  });
  if (!current) throw Errors.notFound("Wholesale item not found.");
  try {
    await prisma.wholesaleItem.delete({ where: { id: current.id } });
    await deleteCloudinaryImages(current?.images ?? []);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      throw Errors.notFound("Wholesale item not found.");
    }
    throw err;
  }
}
