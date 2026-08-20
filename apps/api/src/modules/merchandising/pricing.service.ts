import { Prisma, type Product, type Promotion, type PromotionProduct } from "@nuru/db";

type PromotionCandidate = PromotionProduct & { promotion: Promotion };

export interface EffectivePrice {
  basePrice: Prisma.Decimal;
  effectivePrice: Prisma.Decimal;
  promotionId: string | null;
  promotionProductId: string | null;
  promotionEndsAt: Date | null;
}

export function calculatePromotionPrice(
  baseInput: Prisma.Decimal | string | number,
  candidate: PromotionCandidate,
): Prisma.Decimal {
  const base = new Prisma.Decimal(baseInput.toString());
  if (candidate.promotionalPrice != null) {
    const explicit = new Prisma.Decimal(candidate.promotionalPrice.toString());
    return explicit.lessThan(base) ? explicit : base;
  }

  const value = new Prisma.Decimal(candidate.promotion.discountValue.toString());
  let price = base;
  switch (candidate.promotion.discountType) {
    case "FIXED_PRICE":
      price = value;
      break;
    case "PERCENTAGE":
      price = base.mul(new Prisma.Decimal(100).sub(value)).div(100);
      break;
    case "FIXED_AMOUNT":
      price = base.sub(value);
      break;
  }
  if (price.lessThan(0)) return new Prisma.Decimal(0);
  return price.lessThan(base) ? price : base;
}

export function selectEffectivePrice(
  product: Pick<Product, "price" | "sellingPrice">,
  candidates: PromotionCandidate[],
  now = new Date(),
): EffectivePrice {
  const basePrice = new Prisma.Decimal((product.sellingPrice ?? product.price).toString());
  let winner: PromotionCandidate | null = null;
  let effectivePrice = basePrice;

  for (const candidate of candidates) {
    const active =
      (candidate.promotion.status === "ACTIVE" || candidate.promotion.status === "SCHEDULED") &&
      candidate.promotion.startsAt <= now && candidate.promotion.endsAt > now;
    if (!active) continue;
    const campaignAvailable =
      candidate.promotion.inventoryLimit == null ||
      candidate.promotion.purchasedCount < candidate.promotion.inventoryLimit;
    const itemAvailable =
      candidate.inventoryLimit == null || candidate.purchasedCount < candidate.inventoryLimit;
    if (!campaignAvailable || !itemAvailable) continue;
    const price = calculatePromotionPrice(basePrice, candidate);
    if (price.lessThan(effectivePrice)) {
      effectivePrice = price;
      winner = candidate;
    }
  }

  return {
    basePrice,
    effectivePrice,
    promotionId: winner?.promotionId ?? null,
    promotionProductId: winner?.id ?? null,
    promotionEndsAt: winner?.promotion.endsAt ?? null,
  };
}

export async function loadEffectivePrices(
  tx: Prisma.TransactionClient,
  products: Array<Pick<Product, "id" | "price" | "sellingPrice">>,
  now = new Date(),
): Promise<Map<string, EffectivePrice>> {
  const ids = products.map((p) => p.id);
  const rows = (ids.length
    ? await tx.promotionProduct.findMany({
        where: {
          productId: { in: ids },
          promotion: {
            status: { in: ["ACTIVE", "SCHEDULED"] },
            startsAt: { lte: now },
            endsAt: { gt: now },
          },
        },
        include: { promotion: true },
      })
    : []) ?? [];
  const grouped = new Map<string, PromotionCandidate[]>();
  for (const row of rows) {
    const list = grouped.get(row.productId) ?? [];
    list.push(row);
    grouped.set(row.productId, list);
  }
  return new Map(
    products.map((product) => [
      product.id,
      selectEffectivePrice(product, grouped.get(product.id) ?? [], now),
    ]),
  );
}
