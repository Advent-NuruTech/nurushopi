/**
 * Transactional batch writer with retry/backoff.
 *
 * Each batch of upserts is executed inside a single `prisma.$transaction([...])`
 * — it either fully commits or fully rolls back (requirement #6). Transient
 * failures (connection resets, deadlocks, pooler hiccups) are retried with
 * exponential backoff. After MAX_RETRIES the batch is split so a single poison
 * document can't sink an entire batch — the offender is isolated and recorded.
 */
import { prisma } from "@nuru/db";
import type { Prisma } from "@nuru/db";
import { env } from "../config/env.js";
import { log } from "./logger.js";

export type Op = Prisma.PrismaPromise<unknown>;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function isRetryable(e: unknown): boolean {
  const msg = String((e as Error)?.message ?? e).toLowerCase();
  return (
    msg.includes("deadlock") ||
    msg.includes("could not serialize") ||
    msg.includes("connection") ||
    msg.includes("timeout") ||
    msg.includes("econnreset") ||
    msg.includes("terminating") ||
    msg.includes("too many clients")
  );
}

export interface BatchOutcome {
  committed: number;
  retries: number;
  /** indexes (into the ops array) that could not be written, with reasons */
  failures: { index: number; reason: string }[];
}

/**
 * Run a batch of upsert operations transactionally with retries. `ops` and
 * `ids` are parallel arrays (ids only used for error reporting). In DRY_RUN the
 * ops are discarded and reported as committed.
 */
export async function commitBatch(ops: Op[], ids: string[]): Promise<BatchOutcome> {
  if (ops.length === 0) return { committed: 0, retries: 0, failures: [] };
  if (env.dryRun) return { committed: ops.length, retries: 0, failures: [] };

  let retries = 0;
  for (let attempt = 0; attempt <= env.maxRetries; attempt++) {
    try {
      await prisma.$transaction(ops);
      return { committed: ops.length, retries, failures: [] };
    } catch (e) {
      if (attempt < env.maxRetries && isRetryable(e)) {
        retries++;
        const backoff = 250 * 2 ** attempt;
        log.warn(`Batch txn failed (attempt ${attempt + 1}), retrying in ${backoff}ms`, {
          error: String((e as Error).message ?? e),
        });
        await sleep(backoff);
        continue;
      }
      // Non-retryable or out of retries: isolate the offenders.
      log.warn(`Batch txn unrecoverable as a unit; isolating offending rows`, {
        error: String((e as Error).message ?? e),
      });
      return isolate(ops, ids, retries);
    }
  }
  return { committed: 0, retries, failures: ids.map((_, i) => ({ index: i, reason: "exhausted retries" })) };
}

/**
 * Last resort: write each op in its own transaction so a single bad row is
 * recorded without losing the rest of the batch. Still atomic per-row.
 */
async function isolate(ops: Op[], ids: string[], priorRetries: number): Promise<BatchOutcome> {
  let committed = 0;
  const failures: { index: number; reason: string }[] = [];
  for (let i = 0; i < ops.length; i++) {
    try {
      await prisma.$transaction([ops[i]!]);
      committed++;
    } catch (e) {
      failures.push({ index: i, reason: String((e as Error).message ?? e) });
      log.error(`Row failed permanently: ${ids[i] ?? `#${i}`}`, {
        error: String((e as Error).message ?? e),
      });
    }
  }
  return { committed, retries: priorRetries, failures };
}
