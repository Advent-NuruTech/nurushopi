import type { WalletRedemption, WalletTransaction } from "@nuru/db";
import type {
  RedemptionStatus,
  WalletRedemptionDTO,
  WalletTransactionDTO,
  WalletTxSource,
  WalletTxStatus,
  WalletTxType,
} from "@nuru/types";

const toIso = (d: Date): string => d.toISOString();

/** Pull a string `note` out of the loosely-typed Json metadata, if present. */
function readNote(metadata: unknown): string | null {
  if (metadata && typeof metadata === "object" && "note" in metadata) {
    const note = (metadata as { note?: unknown }).note;
    if (typeof note === "string") return note;
  }
  return null;
}

/** Narrow loosely-typed Json payout details into a flat string map. */
function readDetails(details: unknown): Record<string, string> | null {
  if (!details || typeof details !== "object") return null;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(details as Record<string, unknown>)) {
    if (typeof value === "string") out[key] = value;
    else if (value != null) out[key] = String(value);
  }
  return out;
}

export function toWalletTransactionDTO(t: WalletTransaction): WalletTransactionDTO {
  return {
    id: t.id,
    userId: t.userId,
    type: t.type as WalletTxType,
    source: t.source as WalletTxSource,
    amount: t.amount.toString(),
    balanceAfter: t.balanceAfter.toString(),
    status: t.status as WalletTxStatus,
    orderId: t.orderId,
    redemptionId: t.redemptionId,
    note: readNote(t.metadata),
    createdAt: toIso(t.createdAt),
  };
}

export function toWalletRedemptionDTO(r: WalletRedemption): WalletRedemptionDTO {
  return {
    id: r.id,
    userId: r.userId,
    amount: r.amount.toString(),
    status: r.status as RedemptionStatus,
    method: r.method,
    details: readDetails(r.details),
    createdAt: toIso(r.createdAt),
    updatedAt: toIso(r.updatedAt),
  };
}
