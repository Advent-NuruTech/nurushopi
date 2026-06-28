import { prisma, Prisma } from "@nuru/db";
import type { CategoryCreateInput, CategoryUpdateInput } from "@nuru/types";
import { Errors } from "../../lib/errors.js";
import { uniqueSlug } from "./slug.js";
import { toCategoryDTO, type CategoryWithCount } from "./serializers.js";

const withCount = { _count: { select: { products: true } } } as const;

async function slugTaken(slug: string, excludeId?: string): Promise<boolean> {
  const existing = await prisma.category.findUnique({ where: { slug }, select: { id: true } });
  return existing != null && existing.id !== excludeId;
}

export async function list(includeCounts = false) {
  const rows = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    ...(includeCounts ? { include: withCount } : {}),
  });
  return rows.map((r) => toCategoryDTO(r as CategoryWithCount));
}

export async function getByIdOrSlug(idOrSlug: string) {
  const row = await prisma.category.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    include: withCount,
  });
  if (!row) throw Errors.notFound("Category not found.");
  return toCategoryDTO(row as CategoryWithCount);
}

export async function create(input: CategoryCreateInput) {
  const slug = await uniqueSlug(input.slug ?? input.name, (s) => slugTaken(s));
  const row = await prisma.category.create({
    data: {
      name: input.name,
      slug,
      icon: input.icon ?? null,
      description: input.description ?? null,
      sortOrder: input.sortOrder ?? 0,
    },
    include: withCount,
  });
  return toCategoryDTO(row as CategoryWithCount);
}

export async function update(id: string, input: CategoryUpdateInput) {
  const current = await prisma.category.findUnique({ where: { id } });
  if (!current) throw Errors.notFound("Category not found.");

  let slug = current.slug;
  if (input.slug !== undefined || input.name !== undefined) {
    const base = input.slug ?? input.name ?? current.name;
    slug = await uniqueSlug(base, (s) => slugTaken(s, id));
  }

  const row = await prisma.category.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      slug,
      ...(input.icon !== undefined ? { icon: input.icon } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    },
    include: withCount,
  });
  return toCategoryDTO(row as CategoryWithCount);
}

export async function remove(id: string): Promise<void> {
  try {
    await prisma.category.delete({ where: { id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      throw Errors.notFound("Category not found.");
    }
    throw err;
  }
}
