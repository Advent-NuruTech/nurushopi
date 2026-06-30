/**
 * Tiny structured logger: writes human-readable lines to the console AND
 * appends every line to a timestamped log file under OUT_DIR. No dependency
 * on the app's pino setup — this tool stays self-contained.
 */
import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { env } from "../config/env.js";

type Level = "info" | "warn" | "error" | "success" | "debug";

const RUN_ID = new Date().toISOString().replace(/[:.]/g, "-");
const LOG_FILE = path.join(env.outDir, `migration-${RUN_ID}.log`);

mkdirSync(env.outDir, { recursive: true });

const COLORS: Record<Level, string> = {
  info: "\x1b[36m",
  warn: "\x1b[33m",
  error: "\x1b[31m",
  success: "\x1b[32m",
  debug: "\x1b[90m",
};
const RESET = "\x1b[0m";

function emit(level: Level, msg: string, extra?: unknown) {
  const ts = new Date().toISOString();
  const extraStr = extra === undefined ? "" : " " + safeJson(extra);
  const line = `${ts} [${level.toUpperCase()}] ${msg}${extraStr}`;
  // eslint-disable-next-line no-console
  console.log(`${COLORS[level]}${line}${RESET}`);
  try {
    appendFileSync(LOG_FILE, line + "\n");
  } catch {
    /* never let logging crash the migration */
  }
}

function safeJson(v: unknown): string {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export const log = {
  info: (m: string, e?: unknown) => emit("info", m, e),
  warn: (m: string, e?: unknown) => emit("warn", m, e),
  error: (m: string, e?: unknown) => emit("error", m, e),
  success: (m: string, e?: unknown) => emit("success", m, e),
  debug: (m: string, e?: unknown) => emit("debug", m, e),
  file: LOG_FILE,
  runId: RUN_ID,
};
