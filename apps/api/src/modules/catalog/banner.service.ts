import { prisma, Prisma } from "@nuru/db";
import type { BannerCreateInput, BannerUpdateInput } from "@nuru/types";
import { Errors } from "../../lib/errors.js";
import { toBannerDTO } from "./serializers.js";

export async function list({ activeOnly }: { activeOnly: boolean }) {
  const rows = await prisma.banner.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return rows.map(toBannerDTO);
}

export async function create(input: BannerCreateInput) {
  const row = await prisma.banner.create({
    data: {
      title: input.title ?? null,
      subtitle: input.subtitle ?? null,
      imageUrl: input.imageUrl,
      linkUrl: input.linkUrl ?? null,
      isActive: input.isActive ?? true,
      sortOrder: input.sortOrder ?? 0,
    },
  });
  return toBannerDTO(row);
}

export async function update(id: string, input: BannerUpdateInput) {
  try {
    const row = await prisma.banner.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.subtitle !== undefined ? { subtitle: input.subtitle } : {}),
        ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
        ...(input.linkUrl !== undefined ? { linkUrl: input.linkUrl } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      },
    });
    return toBannerDTO(row);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      throw Errors.notFound("Banner not found.");
    }
    throw err;
  }
}

export async function remove(id: string): Promise<void> {
  try {
    await prisma.banner.delete({ where: { id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      throw Errors.notFound("Banner not found.");
    }
    throw err;
  }
}
