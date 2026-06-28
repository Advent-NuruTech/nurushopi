import { prisma, Prisma } from "@nuru/db";
import type { HeroCreateInput, HeroUpdateInput } from "@nuru/types";
import { Errors } from "../../lib/errors.js";
import { toHeroDTO } from "./serializers.js";

/** Active announcements within their optional start/end window, newest first. */
export async function listActive() {
  const now = new Date();
  const rows = await prisma.heroAnnouncement.findMany({
    where: {
      isActive: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toHeroDTO);
}

export async function listAll() {
  const rows = await prisma.heroAnnouncement.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(toHeroDTO);
}

export async function create(input: HeroCreateInput) {
  const row = await prisma.heroAnnouncement.create({
    data: {
      message: input.message,
      linkUrl: input.linkUrl ?? null,
      isActive: input.isActive ?? true,
      startsAt: input.startsAt ?? null,
      endsAt: input.endsAt ?? null,
    },
  });
  return toHeroDTO(row);
}

export async function update(id: string, input: HeroUpdateInput) {
  try {
    const row = await prisma.heroAnnouncement.update({
      where: { id },
      data: {
        ...(input.message !== undefined ? { message: input.message } : {}),
        ...(input.linkUrl !== undefined ? { linkUrl: input.linkUrl } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.startsAt !== undefined ? { startsAt: input.startsAt } : {}),
        ...(input.endsAt !== undefined ? { endsAt: input.endsAt } : {}),
      },
    });
    return toHeroDTO(row);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      throw Errors.notFound("Announcement not found.");
    }
    throw err;
  }
}

export async function remove(id: string): Promise<void> {
  try {
    await prisma.heroAnnouncement.delete({ where: { id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      throw Errors.notFound("Announcement not found.");
    }
    throw err;
  }
}
