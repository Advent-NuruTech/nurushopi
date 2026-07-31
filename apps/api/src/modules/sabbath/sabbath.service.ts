import { prisma, type Prisma, type SabbathMessage } from "@nuru/db";
import type {
  SabbathMessageAdminQuery,
  SabbathMessageCreateInput,
  SabbathMessageDTO,
  SabbathMessageListDTO,
  SabbathMessageQuery,
  SabbathMonthDTO,
  SabbathMessageUpdateInput,
} from "@nuru/types";
import { Errors } from "../../lib/errors.js";

export function toSabbathMessageDTO(row: SabbathMessage): SabbathMessageDTO {
  return {
    id: row.id,
    message: row.message,
    sabbathDate: row.sabbathDate,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// History is ordered newest Sabbath first, then newest authored first.
const HISTORY_ORDER: Prisma.SabbathMessageOrderByWithRelationInput[] = [
  { sabbathDate: "desc" },
  { createdAt: "desc" },
];

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

/**
 * Public listing. When `date` is supplied, the latest message scheduled for
 * that Sabbath is returned as `currentMessage`. The `messages` history is a
 * keyset page over (sabbathDate desc, createdAt desc); pass the returned
 * `nextCursor` fields back as `cursorDate`/`cursorCreatedAt` for the next page.
 */
export async function list(query: SabbathMessageQuery): Promise<SabbathMessageListDTO> {
  const currentPromise = query.date
    ? prisma.sabbathMessage.findFirst({
        where: { sabbathDate: query.date },
        orderBy: { createdAt: "desc" },
      })
    : Promise.resolve(null);

  const filters = filterWhere(query.month, query.q);
  const cursorWhere = keysetWhere(query.cursorDate, query.cursorCreatedAt);
  const where = combineWhere(filters, cursorWhere);
  const [current, rows] = await Promise.all([
    currentPromise,
    prisma.sabbathMessage.findMany({ where, orderBy: HISTORY_ORDER, take: query.limit }),
  ]);

  const last = rows[rows.length - 1];
  return {
    currentMessage: current ? toSabbathMessageDTO(current) : null,
    messages: rows.map(toSabbathMessageDTO),
    nextCursor:
      rows.length === query.limit && last
        ? { sabbathDate: last.sabbathDate, createdAt: last.createdAt.toISOString() }
        : null,
  };
}

/** Month + free-text filters for the archive view. */
function filterWhere(
  month?: string,
  q?: string,
): Prisma.SabbathMessageWhereInput | undefined {
  if (!month && !q) return undefined;
  return {
    ...(month ? { sabbathDate: { startsWith: month } } : {}),
    ...(q ? { message: { contains: q, mode: "insensitive" } } : {}),
  };
}

/** Combine filter predicate and keyset cursor predicate into one WHERE. */
function combineWhere(
  filters?: Prisma.SabbathMessageWhereInput,
  cursor?: Prisma.SabbathMessageWhereInput,
): Prisma.SabbathMessageWhereInput | undefined {
  if (!filters && !cursor) return undefined;
  if (!filters) return cursor;
  if (!cursor) return filters;
  return { AND: [filters, cursor] };
}

/**
 * Distinct archive months, newest first, with the number of messages in each.
 * Bounded by distinct Friday dates (≈52 per year), so it stays small even
 * with thousands of messages.
 */
export async function months(): Promise<SabbathMonthDTO[]> {
  const grouped = await prisma.sabbathMessage.groupBy({
    by: ["sabbathDate"],
  });
  const byMonth = new Map<string, number>();
  for (const row of grouped) {
    const month = row.sabbathDate.slice(0, 7);
    byMonth.set(month, (byMonth.get(month) ?? 0) + 1);
  }
  return [...byMonth.entries()]
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => (a.month < b.month ? 1 : -1));
}

/** Keyset predicate for "strictly after" (sabbathDate desc, createdAt desc). */
function keysetWhere(
  cursorDate?: string,
  cursorCreatedAt?: string,
): Prisma.SabbathMessageWhereInput | undefined {
  if (!cursorDate || !cursorCreatedAt) return undefined;
  const createdAt = new Date(cursorCreatedAt);
  if (Number.isNaN(createdAt.getTime())) return undefined;
  return {
    OR: [
      { sabbathDate: { lt: cursorDate } },
      { sabbathDate: cursorDate, createdAt: { lt: createdAt } },
    ],
  };
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export async function adminList(query: SabbathMessageAdminQuery): Promise<SabbathMessageDTO[]> {
  const rows = await prisma.sabbathMessage.findMany({
    orderBy: HISTORY_ORDER,
    take: query.limit,
  });
  return rows.map(toSabbathMessageDTO);
}

export async function create(
  createdById: string,
  input: SabbathMessageCreateInput,
): Promise<SabbathMessageDTO> {
  const created = await prisma.sabbathMessage.create({
    data: { message: input.message, sabbathDate: input.sabbathDate, createdById },
  });
  return toSabbathMessageDTO(created);
}

export async function update(
  id: string,
  input: SabbathMessageUpdateInput,
): Promise<SabbathMessageDTO> {
  const current = await prisma.sabbathMessage.findUnique({ where: { id }, select: { id: true } });
  if (!current) throw Errors.notFound("Sabbath message not found.");

  const data: Prisma.SabbathMessageUpdateInput = {};
  if (input.message !== undefined) data.message = input.message;
  if (input.sabbathDate !== undefined) data.sabbathDate = input.sabbathDate;

  const updated = await prisma.sabbathMessage.update({ where: { id }, data });
  return toSabbathMessageDTO(updated);
}

export async function remove(id: string): Promise<void> {
  const current = await prisma.sabbathMessage.findUnique({ where: { id }, select: { id: true } });
  if (!current) throw Errors.notFound("Sabbath message not found.");
  await prisma.sabbathMessage.delete({ where: { id } });
}
