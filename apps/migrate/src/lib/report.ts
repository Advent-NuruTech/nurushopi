/**
 * Accumulates per-collection results and renders the migration, verification,
 * and error reports (JSON + Markdown) under OUT_DIR.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { env } from "../config/env.js";
import { log } from "./logger.js";

export interface CollectionResult {
  collection: string;
  target: string;
  /** docs read from Firestore */
  read: number;
  /** rows successfully upserted into Postgres */
  inserted: number;
  /** docs skipped (duplicates already present, or unmappable) */
  skipped: number;
  /** docs that failed to transform/insert */
  failed: number;
  retries: number;
  errors: { id: string; reason: string }[];
}

export interface CountCheck {
  label: string;
  source: number;
  target: number;
  pass: boolean;
  note?: string;
}

export interface IntegrityCheck {
  label: string;
  orphans: number;
  pass: boolean;
  detail?: string;
}

export class Report {
  readonly collections: CollectionResult[] = [];
  readonly counts: CountCheck[] = [];
  readonly integrity: IntegrityCheck[] = [];
  readonly apiChecks: { endpoint: string; status: number; ok: boolean; note?: string }[] = [];
  readonly startedAt = new Date();

  startCollection(collection: string, target: string): CollectionResult {
    const r: CollectionResult = {
      collection,
      target,
      read: 0,
      inserted: 0,
      skipped: 0,
      failed: 0,
      retries: 0,
      errors: [],
    };
    this.collections.push(r);
    return r;
  }

  addCount(c: CountCheck) {
    this.counts.push(c);
  }
  addIntegrity(c: IntegrityCheck) {
    this.integrity.push(c);
  }

  get pass(): boolean {
    const noFailures = this.collections.every((c) => c.failed === 0);
    const countsOk = this.counts.every((c) => c.pass);
    const integrityOk = this.integrity.every((c) => c.pass);
    const apiOk = this.apiChecks.every((c) => c.ok);
    return noFailures && countsOk && integrityOk && apiOk;
  }

  write(): { jsonPath: string; mdPath: string; pass: boolean } {
    mkdirSync(env.outDir, { recursive: true });
    const stamp = log.runId;
    const jsonPath = path.join(env.outDir, `report-${stamp}.json`);
    const mdPath = path.join(env.outDir, `report-${stamp}.md`);

    const payload = {
      runId: stamp,
      startedAt: this.startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      dryRun: env.dryRun,
      pass: this.pass,
      collections: this.collections,
      counts: this.counts,
      integrity: this.integrity,
      apiChecks: this.apiChecks,
    };
    writeFileSync(jsonPath, JSON.stringify(payload, null, 2));
    writeFileSync(mdPath, this.markdown());
    return { jsonPath, mdPath, pass: this.pass };
  }

  private markdown(): string {
    const L: string[] = [];
    L.push(`# NuruShop migration report`);
    L.push("");
    L.push(`- Run: \`${log.runId}\``);
    L.push(`- Mode: ${env.dryRun ? "**DRY RUN** (no writes)" : "LIVE"}`);
    L.push(`- Overall: ${this.pass ? "✅ **PASS**" : "❌ **FAIL**"}`);
    L.push("");

    L.push(`## 1. Migration summary`);
    L.push("");
    L.push(`| Collection | → Table | Read | Inserted | Skipped | Failed | Retries |`);
    L.push(`| --- | --- | --: | --: | --: | --: | --: |`);
    for (const c of this.collections) {
      L.push(
        `| ${c.collection} | ${c.target} | ${c.read} | ${c.inserted} | ${c.skipped} | ${c.failed} | ${c.retries} |`,
      );
    }
    L.push("");

    L.push(`## 2. Count verification (Firestore vs Postgres)`);
    L.push("");
    L.push(`| Entity | Firestore | Postgres | Result |`);
    L.push(`| --- | --: | --: | --- |`);
    for (const c of this.counts) {
      L.push(
        `| ${c.label} | ${c.source} | ${c.target} | ${c.pass ? "✅ PASS" : "❌ FAIL"}${
          c.note ? ` — ${c.note}` : ""
        } |`,
      );
    }
    L.push("");

    L.push(`## 3. Referential integrity`);
    L.push("");
    L.push(`| Check | Orphans | Result |`);
    L.push(`| --- | --: | --- |`);
    for (const c of this.integrity) {
      L.push(
        `| ${c.label} | ${c.orphans} | ${c.pass ? "✅ PASS" : "❌ FAIL"}${
          c.detail ? ` — ${c.detail}` : ""
        } |`,
      );
    }
    L.push("");

    if (this.apiChecks.length) {
      L.push(`## 4. API endpoint smoke tests`);
      L.push("");
      L.push(`| Endpoint | HTTP | Result |`);
      L.push(`| --- | --: | --- |`);
      for (const c of this.apiChecks) {
        L.push(`| ${c.endpoint} | ${c.status} | ${c.ok ? "✅ OK" : "❌ FAIL"}${c.note ? ` — ${c.note}` : ""} |`);
      }
      L.push("");
    }

    const withErrors = this.collections.filter((c) => c.errors.length);
    if (withErrors.length) {
      L.push(`## 5. Errors`);
      L.push("");
      for (const c of withErrors) {
        L.push(`### ${c.collection} (${c.errors.length})`);
        for (const e of c.errors.slice(0, 50)) {
          L.push(`- \`${e.id}\`: ${e.reason}`);
        }
        if (c.errors.length > 50) L.push(`- …and ${c.errors.length - 50} more (see JSON report).`);
        L.push("");
      }
    }

    return L.join("\n");
  }
}
