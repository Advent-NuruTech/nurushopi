import { Errors } from "../../lib/errors.js";

export interface RankingCursor {
  rank: number;
  productId: string;
  snapshotAt?: string;
  source: "ranking" | "membership" | "fallback";
}

export function encodeCursor(value: RankingCursor): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

export function decodeCursor(value?: string): RankingCursor | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<RankingCursor>;
    if (
      !Number.isInteger(parsed.rank) ||
      (parsed.rank as number) < 0 ||
      typeof parsed.productId !== "string" ||
      !["ranking", "membership", "fallback"].includes(parsed.source ?? "")
    ) {
      throw new Error("invalid cursor payload");
    }
    return parsed as RankingCursor;
  } catch {
    throw Errors.badRequest("Invalid collection cursor.");
  }
}

