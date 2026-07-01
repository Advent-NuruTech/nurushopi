import { prisma, Prisma } from "@nuru/db";
import type {
  Paginated,
  ProductCreateInput,
  ProductDTO,
  ProductQuery,
  ProductUpdateInput,
} from "@nuru/types";
import { Errors } from "../../lib/errors.js";
import { deleteCloudinaryImages } from "../../lib/cloudinary.js";
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
    case "most_viewed_today":
      return { createdAt: "desc" };
    case "newest":
    default:
      return { createdAt: "desc" };
  }
}

function todayStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

async function listMostViewedToday(
  query: ProductQuery,
  { enforceActive }: { enforceActive: boolean },
): Promise<Paginated<ProductDTO>> {
  const baseWhere = buildWhere({ ...query, sort: "newest" }, enforceActive);
  const skip = (query.page - 1) * query.pageSize;
  const viewed = await prisma.productView.groupBy({
    by: ["productId"],
    where: { createdAt: { gte: todayStart() } },
    _count: { productId: true },
    orderBy: { _count: { productId: "desc" } },
    take: 500,
  });

  const rankedIds = viewed.map((v) => v.productId);
  const ranked = rankedIds.length
    ? await prisma.product.findMany({
        where: { ...baseWhere, id: { in: rankedIds } },
        include: { category: categorySelect },
      })
    : [];
  const byId = new Map(ranked.map((p) => [p.id, p]));
  const ordered = rankedIds.map((id) => byId.get(id)).filter(Boolean) as ProductWithCategory[];

  const seen = new Set(ordered.map((p) => p.id));
  const fallback = await prisma.product.findMany({
    where: { ...baseWhere, id: seen.size ? { notIn: [...seen] } : undefined },
    orderBy: { createdAt: "desc" },
    take: Math.max(0, skip + query.pageSize - ordered.length),
    include: { category: categorySelect },
  });

  const combined = [...ordered, ...(fallback as ProductWithCategory[])];
  const total = await prisma.product.count({ where: baseWhere });

  return {
    items: combined.slice(skip, skip + query.pageSize).map((r) => toProductDTO(r)),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

export async function list(
  query: ProductQuery,
  { enforceActive }: { enforceActive: boolean },
): Promise<Paginated<ProductDTO>> {
  if (query.sort === "most_viewed_today") {
    return listMostViewedToday(query, { enforceActive });
  }

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
  if (input.images !== undefined) {
    const next = new Set(input.images);
    await deleteCloudinaryImages(current.images.filter((url) => !next.has(url)));
  }
  if (input.stock !== undefined && current.stock > 0 && input.stock === 0) {
    await notifyAdminsOutOfStock(row.id, row.name);
  }
  return toProductDTO(row as ProductWithCategory);
}

export async function remove(id: string): Promise<void> {
  const current = await prisma.product.findUnique({ where: { id }, select: { images: true } });
  try {
    await prisma.product.delete({ where: { id } });
    await deleteCloudinaryImages(current?.images ?? []);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      throw Errors.notFound("Product not found.");
    }
    throw err;
  }
}

export async function recordView(
  productIdOrSlug: string,
  userId?: string,
  sessionId?: string | null,
): Promise<void> {
  const product = await prisma.product.findFirst({
    where: { OR: [{ id: productIdOrSlug }, { slug: productIdOrSlug }], isActive: true },
    select: { id: true },
  });
  if (!product) throw Errors.notFound("Product not found.");
  await prisma.productView.create({
    data: {
      productId: product.id,
      userId: userId ?? null,
      sessionId: sessionId ?? null,
    },
  });
}

function keywords(value: string | null | undefined): string[] {
  return (value ?? "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4)
    .slice(0, 8);
}

export async function recommendations(input: {
  userId?: string;
  productIdOrSlug?: string;
  limit?: number;
}): Promise<ProductDTO[]> {
  const limit = Math.min(Math.max(input.limit ?? 8, 1), 24);
  const exclude = new Set<string>();
  const categoryIds = new Set<string>();
  const terms = new Set<string>();

  if (input.productIdOrSlug) {
    const current = await prisma.product.findFirst({
      where: { OR: [{ id: input.productIdOrSlug }, { slug: input.productIdOrSlug }] },
      select: { id: true, name: true, description: true, shortDescription: true, categoryId: true },
    });
    if (current) {
      exclude.add(current.id);
      if (current.categoryId) categoryIds.add(current.categoryId);
      for (const term of keywords(`${current.name} ${current.shortDescription ?? ""} ${current.description ?? ""}`)) {
        terms.add(term);
      }
    }
  }

  if (input.userId) {
    const recent = await prisma.productView.findMany({
      where: { userId: input.userId },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            shortDescription: true,
            description: true,
            categoryId: true,
          },
        },
      },
    });
    for (const view of recent) {
      exclude.add(view.product.id);
      if (view.product.categoryId) categoryIds.add(view.product.categoryId);
      for (const term of keywords(`${view.product.name} ${view.product.shortDescription ?? ""} ${view.product.description ?? ""}`)) {
        terms.add(term);
      }
    }
  }

  const or: Prisma.ProductWhereInput[] = [];
  if (categoryIds.size > 0) or.push({ categoryId: { in: [...categoryIds] } });
  for (const term of [...terms].slice(0, 10)) {
    or.push(
      { name: { contains: term, mode: "insensitive" } },
      { description: { contains: term, mode: "insensitive" } },
      { shortDescription: { contains: term, mode: "insensitive" } },
    );
  }

  const rows = await prisma.product.findMany({
    where: {
      isActive: true,
      stock: { gt: 0 },
      ...(exclude.size ? { id: { notIn: [...exclude] } } : {}),
      ...(or.length ? { OR: or } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { category: categorySelect },
  });

  if (rows.length >= limit) return rows.map((r) => toProductDTO(r as ProductWithCategory));

  const more = await prisma.product.findMany({
    where: {
      isActive: true,
      stock: { gt: 0 },
      id: { notIn: [...exclude, ...rows.map((r) => r.id)] },
    },
    orderBy: { createdAt: "desc" },
    take: limit - rows.length,
    include: { category: categorySelect },
  });

  return [...rows, ...more].map((r) => toProductDTO(r as ProductWithCategory));
}

export async function notifyAdminsOutOfStock(productId: string, productName: string): Promise<void> {
  await prisma.notification.create({
    data: {
      recipientType: "ADMIN",
      recipientId: null,
      title: "Product out of stock",
      body: `${productName} is now out of stock.`,
      type: "inventory",
      relatedId: productId,
    },
  });
}
