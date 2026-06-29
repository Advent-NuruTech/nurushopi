import { prisma } from "@nuru/db";
import type { PwaInstallRecordInput, PwaInstallStatsDTO } from "@nuru/types";

/**
 * Record a PWA install. When a user is signed in the install is idempotent —
 * a repeat install by the same user does not inflate the count. Anonymous
 * installs are always recorded (we cannot reliably dedupe them).
 */
export async function record(
  userId: string | null,
  input: PwaInstallRecordInput,
): Promise<void> {
  const data = {
    userId,
    platform: input.platform ?? null,
    userAgent: input.userAgent ?? null,
  };

  if (userId) {
    const existing = await prisma.pwaInstall.findFirst({ where: { userId }, select: { id: true } });
    if (existing) return;
  }

  await prisma.pwaInstall.create({ data });
}

/** Aggregate install stats for the admin dashboard. */
export async function stats(): Promise<PwaInstallStatsDTO> {
  const totalInstalled = await prisma.pwaInstall.count();
  return { totalInstalled };
}
