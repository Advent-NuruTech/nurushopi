import { createHash } from "node:crypto";
import { prisma, Prisma, type Experiment } from "@nuru/db";

export interface ExperimentVariant {
  key: string;
  weight: number;
  configuration: Record<string, unknown>;
}

export function stableBucket(experimentKey: string, actorId: string): number {
  const digest = createHash("sha256").update(`${experimentKey}:${actorId}`).digest();
  return digest.readUInt32BE(0) % 10_000;
}

function parseVariants(experiment: Experiment): ExperimentVariant[] {
  if (!Array.isArray(experiment.variants)) return [];
  const parsed = experiment.variants.flatMap((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    const item = value as Record<string, unknown>;
    if (typeof item.key !== "string") return [];
    return [{
      key: item.key,
      weight: typeof item.weight === "number" && item.weight > 0 ? item.weight : 1,
      configuration: item.configuration && typeof item.configuration === "object" && !Array.isArray(item.configuration)
        ? item.configuration as Record<string, unknown>
        : {},
    }];
  });
  return parsed;
}

function chooseVariant(variants: ExperimentVariant[], bucket: number): ExperimentVariant | null {
  const total = variants.reduce((sum, variant) => sum + variant.weight, 0);
  if (!total) return null;
  let target = (bucket / 10_000) * total;
  for (const variant of variants) {
    target -= variant.weight;
    if (target < 0) return variant;
  }
  return variants.at(-1) ?? null;
}

export async function assignmentsFor(
  experimentKeys: string[],
  actor: { userId?: string; anonymousId?: string },
) {
  const identity = actor.userId ?? actor.anonymousId;
  if (!identity || experimentKeys.length === 0) return new Map<string, ExperimentVariant>();
  const now = new Date();
  const experiments = await prisma.experiment.findMany({
    where: {
      key: { in: [...new Set(experimentKeys)] },
      status: "RUNNING",
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
      ],
    },
  });
  const result = new Map<string, ExperimentVariant>();
  for (const experiment of experiments) {
    const bucket = stableBucket(experiment.key, identity);
    if (bucket >= experiment.allocation) continue;
    const variants = parseVariants(experiment);
    const existing = await prisma.experimentAssignment.findFirst({
      where: {
        experimentId: experiment.id,
        ...(actor.userId ? { userId: actor.userId } : { anonymousId: actor.anonymousId }),
      },
    });
    const variant = existing
      ? variants.find((item) => item.key === existing.variantKey) ?? null
      : chooseVariant(variants, bucket);
    if (!variant) continue;
    if (!existing) {
      try {
        await prisma.experimentAssignment.create({
          data: {
            experimentId: experiment.id,
            userId: actor.userId ?? null,
            anonymousId: actor.userId ? null : actor.anonymousId,
            variantKey: variant.key,
            bucket,
          },
        });
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
      }
    }
    result.set(experiment.key, variant);
  }
  return result;
}

