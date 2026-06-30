/**
 * `pnpm --filter migrate discover`
 *
 * Connects to Firestore (read-only), auto-discovers every collection, samples
 * documents, infers field types, probes sub-collections, and writes a
 * discovery report (JSON + Markdown) to OUT_DIR. Run this FIRST to confirm the
 * mapping plan against your real data before migrating.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { env } from "./config/env.js";
import { log } from "./lib/logger.js";
import { discoverAll, type CollectionShape } from "./lib/discover.js";
import { PIPELINE } from "./migrators.js";

function dominantType(stat: CollectionShape["fields"][string]): string {
  const entries = Object.entries(stat.types).filter(([, n]) => n > 0);
  entries.sort((a, b) => b[1] - a[1]);
  const main = entries.map(([t]) => t).join("|");
  return main + (stat.nullable ? " (nullable)" : "");
}

function planFor(name: string): string {
  const m = PIPELINE.find((mig) => mig.collections.includes(name));
  if (m) return m.target;
  if (name === "users") return "users (+ Firebase Auth)";
  return "⚠️ UNMAPPED — review";
}

async function main() {
  log.info("Starting Firestore discovery…");
  const shapes = await discoverAll(200);

  const lines: string[] = [];
  lines.push(`# Firestore discovery report`);
  lines.push("");
  lines.push(`Generated ${new Date().toISOString()} for project \`${env.firebase.projectId}\`.`);
  lines.push("");
  lines.push(`## Collection -> table plan`);
  lines.push("");
  lines.push(`| Firestore collection | Docs | -> Plan |`);
  lines.push(`| --- | --: | --- |`);
  for (const s of shapes) lines.push(`| ${s.name} | ${s.count} | ${planFor(s.name)} |`);
  lines.push("");

  for (const s of shapes) {
    lines.push(`## \`${s.name}\` (${s.count} docs, sampled ${s.sampled})`);
    if (s.subcollections.length) {
      lines.push(`Sub-collections: ${s.subcollections.map((x) => `\`${x}\``).join(", ")}`);
    }
    lines.push("");
    lines.push(`| Field | Type | Present in sample |`);
    lines.push(`| --- | --- | --: |`);
    for (const [field, stat] of Object.entries(s.fields).sort()) {
      lines.push(`| ${field} | ${dominantType(stat)}${stat.sampleRef ? ` -> \`${stat.sampleRef}\`` : ""} | ${stat.present}/${s.sampled} |`);
    }
    lines.push("");
  }

  mkdirSync(env.outDir, { recursive: true });
  const md = path.join(env.outDir, `discovery-${log.runId}.md`);
  const json = path.join(env.outDir, `discovery-${log.runId}.json`);
  writeFileSync(md, lines.join("\n"));
  writeFileSync(json, JSON.stringify(shapes, null, 2));

  // Warn about any collection we don't have a migrator for.
  const known = new Set(PIPELINE.flatMap((m) => m.collections).concat(["users"]));
  const unmapped = shapes.filter((s) => !known.has(s.name));
  if (unmapped.length) {
    log.warn(`Unmapped collections (no migrator): ${unmapped.map((s) => s.name).join(", ")}`);
  }

  log.success(`Discovery complete -> ${md}`);
  process.exit(0);
}

main().catch((e) => {
  log.error("Discovery failed", { error: String(e?.stack ?? e) });
  process.exit(1);
});
