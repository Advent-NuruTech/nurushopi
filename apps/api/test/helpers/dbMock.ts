import { vi } from "vitest";

/** A Prisma delegate with the methods our services touch. */
function model() {
  return {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  };
}

/** Minimal stand-in for Prisma's known-request error (for instanceof checks). */
export class PrismaClientKnownRequestError extends Error {
  code: string;
  constructor(message: string, opts: { code: string }) {
    super(message);
    this.name = "PrismaClientKnownRequestError";
    this.code = opts.code;
  }
}

/**
 * Number-backed stand-in for Prisma's arbitrary-precision Decimal. Supports the
 * operations our services use (add/mul/toString) and renders money to 2 dp. The
 * real client uses decimal.js; this keeps the db mock self-contained.
 */
type DecimalLike = number | string | Decimal | { toString(): string };

export class Decimal {
  private readonly n: number;
  constructor(value: DecimalLike) {
    this.n = typeof value === "number" ? value : Number(value.toString());
  }
  private static num(other: DecimalLike): number {
    return new Decimal(other).n;
  }
  add(other: DecimalLike): Decimal {
    return new Decimal(this.n + Decimal.num(other));
  }
  sub(other: DecimalLike): Decimal {
    return new Decimal(this.n - Decimal.num(other));
  }
  mul(other: DecimalLike): Decimal {
    return new Decimal(this.n * Decimal.num(other));
  }
  lessThan(other: DecimalLike): boolean {
    return this.n < Decimal.num(other);
  }
  lt(other: DecimalLike): boolean {
    return this.n < Decimal.num(other);
  }
  lte(other: DecimalLike): boolean {
    return this.n <= Decimal.num(other);
  }
  greaterThan(other: DecimalLike): boolean {
    return this.n > Decimal.num(other);
  }
  gt(other: DecimalLike): boolean {
    return this.n > Decimal.num(other);
  }
  gte(other: DecimalLike): boolean {
    return this.n >= Decimal.num(other);
  }
  equals(other: DecimalLike): boolean {
    return this.n === Decimal.num(other);
  }
  isZero(): boolean {
    return this.n === 0;
  }
  toNumber(): number {
    return this.n;
  }
  toString(): string {
    return this.n.toFixed(2);
  }
}

/**
 * Factory for a fully-mocked `@nuru/db` module. Used inside `vi.mock` factories,
 * which must be self-contained — so this file imports nothing from the app.
 */
export function makeDbMock() {
  const prisma: Record<string, ReturnType<typeof model>> & {
    $transaction: ReturnType<typeof vi.fn>;
  } = {
    category: model(),
    product: model(),
    banner: model(),
    heroAnnouncement: model(),
    wholesaleItem: model(),
    order: model(),
    orderItem: model(),
    user: model(),
    walletTransaction: model(),
    walletRedemption: model(),
    referral: model(),
    review: model(),
    notification: model(),
    message: model(),
    contact: model(),
    vendorApplication: model(),
    admin: model(),
    adminInvite: model(),
    loginAttempt: model(),
    legacyPasswordImport: model(),
    pwaInstall: model(),
    sabbathMessage: model(),
    // Supports both the array form (Promise.all) and the interactive callback
    // form (`$transaction(async (tx) => …)`), passing the mock itself as `tx`.
    $transaction: vi.fn((arg: unknown) =>
      typeof arg === "function"
        ? (arg as (tx: unknown) => unknown)(prisma)
        : Promise.all(arg as Promise<unknown>[]),
    ),
  };
  return { prisma, Prisma: { PrismaClientKnownRequestError, Decimal } };
}

export type DbMock = ReturnType<typeof makeDbMock>;
