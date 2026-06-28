import { prisma, Prisma } from "@nuru/db";
import type {
  Paginated,
  ProductCreateInput,
  ProductDTO,
  ProductQuery,
  ProductUpdateInput,
} from "@nuru/types";
import { Errors } from "../../lib/errors.js";
import { uniqueSlug } from "./slug.js";
import { toProductDTO, type ProductWithCategory } from "./serializers.js";

const categorySelect = { select: { id: true, name: true, slug: true } } as const;

async function slugTaken(slug: string, excludeId?: string): Promise<boolean> {
  const existing = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
  return existing != null && existing.id !== excludeId;
}

function buildWhere(query: ProductQuery, enforceActive: boolean): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {};

  if (enforceActive) where.isActive = true;
  else if (query.isActive !== undefined) where.isActive = query.isActive;

  if (query.isFeatured !== undefined) where.isFeatured = query.isFeatured;
  if (query.categoryId) where.categoryId = query.categoryId;
  if (query.categorySlug) where.category = { slug: query.categorySlug };
  if (query.inStock) where.stock = { gt: 0 };

  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    where.price = {
      ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
      ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
    };
  }

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { description: { contains: query.search, mode: "insensitive" } },
      { shortDescription: { contains: query.search, mode: "insensitive" } },
    ];
  }

  return where;
}

function buildOrderBy(sort: ProductQuery["sort"]): Prisma.ProductOrderByWithRelationInput {
  switch (sort) {
    case "oldest":
      return { createdAt: "asc" };
    case "price_asc":
      return { price: "asc" };
    case "price_desc":
      return { price: "desc" };
    case "name":
      return { name: "asc" };
    case "newest":
    default:
      return { createdAt: "desc" };
  }
}

export async function list(
  query: ProductQuery,
  { enforceActive }: { enforceActive: boolean },
): Promise<Paginated<ProductDTO>> {
  const where = buildWhere(query, enforceActive);
  const skip = (query.page - 1) * query.pageSize;

  const [total, rows] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: buildOrderBy(query.sort),
      skip,
      take: query.pageSize,
      include: { category: categorySelect },
    }),
  ]);

  return {
    items: rows.map((r) => toProductDTO(r as ProductWithCategory)),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

export async function getByIdOrSlug(idOrSlug: string, { activeOnly }: { activeOnly: boolean }) {
  const row = await prisma.product.findFirst({
    where: {
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      ...(activeOnly ? { isActive: true } : {}),
    },
    include: { category: categorySelect },
  });
  if (!row) throw Errors.notFound("Product not found.");
  return toProductDTO(row as ProductWithCategory);
}

async function assertCategoryExists(categoryId: string | null | undefined): Promise<void> {
  if (!categoryId) return;
  const cat = await prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } });
  if (!cat) throw Errors.badRequest("The selected category does not exist.");
}

export async function create(input: ProductCreateInput, createdById?: string) {
  await assertCategoryExists(input.categoryId);
  const slug = await uniqueSlug(input.slug ?? input.name, (s) => slugTaken(s));

  const row = await prisma.product.create({
    data: {
      name: input.name,
      slug,
      description: input.description ?? null,
      shortDescription: input.shortDescription ?? null,
      price: input.price,
      originalPrice: input.originalPrice ?? null,
      sellingPrice: input.sellingPrice ?? null,
      images: input.images ?? [],
      stock: input.stock ?? 0,
      isActive: input.isActive ?? true,
      isFeatured: input.isFeatured ?? false,
      categoryId: input.categoryId ?? null,
      createdById: createdById ?? null,
    },
    include: { category: categorySelect },
  });
  return toProductDTO(row as ProductWithCategory);
}

export async function update(id: string, input: ProductUpdateInput) {
  const current = await prisma.product.findUnique({ where: { id } });
  if (!current) throw Errors.notFound("Product not found.");

  if (input.categoryId !== undefined) await assertCategoryExists(input.categoryId);

  let slug = current.slug;
  if (input.slug !== undefined || input.name !== undefined) {
    const base = input.slug ?? input.name ?? current.name;
    slug = await uniqueSlug(base, (s) => slugTaken(s, id));
  }

  const row = await prisma.product.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(slug !== current.slug ? { slug } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.shortDescription !== undefined ? { shortDescription: input.shortDescription } : {}),
      ...(input.price !== undefined ? { price: input.price } : {}),
      ...(input.originalPrice !== undefined ? { originalPrice: input.originalPrice } : {}),
      ...(input.sellingPrice !== undefined ? { sellingPrice: input.sellingPrice } : {}),
      ...(input.images !== undefined ? { images: input.images } : {}),
      ...(input.stock !== undefined ? { stock: input.stock } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.isFeatured !== undefined ? { isFeatured: input.isFeatured } : {}),
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
    },
    include: { category: categorySelect },
  });
  return toProductDTO(row as ProductWithCategory);
}

export async function remove(id: string): Promise<void> {
  try {
    await prisma.product.delete({ where: { id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      throw Errors.notFound("Product not found.");
    }
    throw err;
  }
}
