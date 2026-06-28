import { prisma, Prisma } from "@nuru/db";
import type { ReferralSummaryDTO } from "@nuru/types";
import { Errors } from "../../lib/errors.js";

/**
 * Referral program reads + the one-time "attach a code after signup" action.
 * Reward payout itself lives in the wallet ledger (rewardReferralOnFirstOrder),
 * triggered from checkout — keeping money movement in one place.
 */

const toIso = (d: Date): string => d.toISOString();

export async function getSummary(userId: string): Promise<ReferralSummaryDTO> {
  const [user, referrals] = await prisma.$transaction([
    prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true } }),
    prisma.referral.findMany({
      where: { referrerId: userId },
      orderBy: { createdAt: "desc" },
      include: { referred: { select: { id: true, name: true, createdAt: true } } },
    }),
  ]);

  if (!user) throw Errors.notFound("User not found.");

  let totalReward = new Prisma.Decimal(0);
  for (const r of referrals) if (r.rewarded) totalReward = totalReward.add(r.rewardAmount);

  return {
    code: user.referralCode,
    referralCount: referrals.length,
    totalRewardEarned: totalReward.toString(),
    referrals: referrals.map((r) => ({
      id: r.referred.id,
      name: r.referred.name,
      joinedAt: toIso(r.referred.createdAt),
      rewarded: r.rewarded,
    })),
  };
}

/**
 * Attach a referral code to an account that wasn't referred at signup. One-time:
 * a user can only ever be referred once, can't refer themselves, and the code
 * must belong to a real, different user.
 */
export async function applyReferralCode(userId: string, code: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, referredById: true },
  });
  if (!user) throw Errors.notFound("User not found.");
  if (user.referredById) throw Errors.conflict("Your account already has a referrer.");

  const referrer = await prisma.user.findUnique({
    where: { referralCode: code },
    select: { id: true },
  });
  if (!referrer) throw Errors.badRequest("That referral code is not valid.");
  if (referrer.id === userId) throw Errors.badRequest("You can't refer yourself.");

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { referredById: referrer.id } }),
    prisma.referral.create({ data: { referrerId: referrer.id, referredId: userId } }),
  ]);
}
