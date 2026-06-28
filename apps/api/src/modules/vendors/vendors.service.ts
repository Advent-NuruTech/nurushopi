import { prisma, Prisma } from "@nuru/db";
import type {
  Paginated,
  VendorApplicationCreateInput,
  VendorApplicationDTO,
  VendorApplicationModerateInput,
  VendorApplicationQuery,
} from "@nuru/types";
import { Errors } from "../../lib/errors.js";
import { toVendorApplicationDTO } from "./serializers.js";

/**
 * Submit a vendor application. May be anonymous (guest) or linked to a signed-in
 * user. An applicant cannot have two PENDING applications open at once — checked
 * against their userId when authenticated, otherwise against their email.
 */
export async function apply(
  input: VendorApplicationCreateInput,
  userId?: string,
): Promise<VendorApplicationDTO> {
  const openWhere: Prisma.VendorApplicationWhereInput = userId
    ? { userId, status: "PENDING" }
    : { email: input.email, status: "PENDING" };

  const existing = await prisma.vendorApplication.findFirst({
    where: openWhere,
    select: { id: true },
  });
  if (existing) {
    throw Errors.conflict("You already have a pending application under review.");
  }

  const created = await prisma.vendorApplication.create({
    data: {
      userId: userId ?? null,
      businessName: input.businessName,
      contactName: input.contactName ?? null,
      email: input.email,
      phone: input.phone ?? null,
      description: input.description ?? null,
    },
  });
  return toVendorApplicationDTO(created);
}

/** A signed-in user's own applications. */
export async function listForUser(
  userId: string,
  query: VendorApplicationQuery,
): Promise<Paginated<VendorApplicationDTO>> {
  const where: Prisma.VendorApplicationWhereInput = { userId };
  if (query.status) where.status = query.status;
  return paginate(where, query);
}

export function adminList(query: VendorApplicationQuery): Promise<Paginated<VendorApplicationDTO>> {
  const where: Prisma.VendorApplicationWhereInput = {};
  if (query.status) where.status = query.status;
  if (query.search) {
    where.OR = [
      { businessName: { contains: query.search, mode: "insensitive" } },
      { email: { contains: query.search, mode: "insensitive" } },
      { contactName: { contains: query.search, mode: "insensitive" } },
    ];
  }
  return paginate(where, query);
}

async function paginate(
  where: Prisma.VendorApplicationWhereInput,
  query: VendorApplicationQuery,
): Promise<Paginated<VendorApplicationDTO>> {
  const skip = (query.page - 1) * query.pageSize;
  const [total, rows] = await prisma.$transaction([
    prisma.vendorApplication.count({ where }),
    prisma.vendorApplication.findMany({
      where,
      orderBy: { createdAt: query.sort === "oldest" ? "asc" : "desc" },
      skip,
      take: query.pageSize,
    }),
  ]);

  return {
    items: rows.map(toVendorApplicationDTO),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

export async function adminGetById(id: string): Promise<VendorApplicationDTO> {
  const row = await prisma.vendorApplication.findUnique({ where: { id } });
  if (!row) throw Errors.notFound("Application not found.");
  return toVendorApplicationDTO(row);
}

/**
 * Approve or reject an application. Terminal states (APPROVED/REJECTED) cannot be
 * changed again, keeping the decision auditable.
 */
export async function moderate(
  id: string,
  input: VendorApplicationModerateInput,
): Promise<VendorApplicationDTO> {
  const updated = await prisma.$transaction(async (tx) => {
    const current = await tx.vendorApplication.findUnique({
      where: { id },
      select: { id: true, status: true, userId: true },
    });
    if (!current) throw Errors.notFound("Application not found.");
    if (current.status !== "PENDING") {
      throw Errors.conflict(`This application is already ${current.status.toLowerCase()}.`);
    }

    const row = await tx.vendorApplication.update({
      where: { id },
      data: { status: input.status },
    });

    // Notify a linked applicant of the decision.
    if (current.userId) {
      await tx.notification.create({
        data: {
          recipientType: "USER",
          recipientId: current.userId,
          title:
            input.status === "APPROVED"
              ? "Your vendor application was approved"
              : "Update on your vendor application",
          body:
            input.status === "APPROVED"
              ? "Congratulations — your application to sell on NuruShop has been approved."
              : "Your vendor application was not approved at this time.",
          type: "vendor",
          relatedId: row.id,
        },
      });
    }

    return row;
  });

  return toVendorApplicationDTO(updated);
}
