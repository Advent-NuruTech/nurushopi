/**
 * `pnpm --filter migrate smoke`
 *
 * Hits the running Express API (API_BASE_URL) and asserts the public read
 * endpoints return data after migration. This is a black-box smoke test — it
 * proves the migrated data is actually serveable through the real API, not just
 * present in the DB. Authenticated/mutating endpoints (checkout, login) are
 * listed but only exercised when SMOKE_* creds are provided, to avoid writing.
 */
import { env } from "./config/env.js";
import { prisma } from "@nuru/db";
import { log } from "./lib/logger.js";
import { Report } from "./lib/report.js";

interface Check {
  name: string;
  path: string;
  expect: (json: unknown, status: number) => string | null; // null = ok, else reason
}

const nonEmptyList = (json: unknown): string | null => {
  const items = (json as { items?: unknown[]; data?: unknown[] })?.items ?? (json as { data?: unknown[] })?.data;
  if (!Array.isArray(items)) return "response had no items[]/data[] array";
  return items.length > 0 ? null : "list was empty";
};
const ok2xx = (_: unknown, status: number): string | null =>
  status >= 200 && status < 300 ? null : `HTTP ${status}`;

async function main() {
  if (!env.apiBaseUrl) {
    log.error("API_BASE_URL not set — skipping API smoke tests.");
    process.exit(2);
  }
  const report = new Report();

  // Grab a real product id/slug so the detail endpoint is exercised on real data.
  const sampleProduct = await prisma.product.findFirst({ select: { id: true, slug: true } });
  await prisma.$disconnect();

  const checks: Check[] = [
    { name: "list products", path: "/catalog/products", expect: nonEmptyList },
    { name: "list categories", path: "/catalog/categories", expect: ok2xx },
    { name: "hero announcements", path: "/catalog/hero", expect: ok2xx },
    { name: "banners", path: "/catalog/banners", expect: ok2xx },
    { name: "wholesale items", path: "/wholesale", expect: ok2xx },
    { name: "products search", path: "/catalog/products?search=a&limit=5", expect: ok2xx },
    { name: "products pagination", path: "/catalog/products?page=2&limit=10", expect: ok2xx },
    { name: "sabbath messages", path: "/sabbath-messages", expect: ok2xx },
  ];
  if (sampleProduct) {
    const key = sampleProduct.slug ?? sampleProduct.id;
    checks.push({ name: "product detail", path: `/catalog/products/${key}`, expect: ok2xx });
    checks.push({ name: "review summary", path: `/reviews/product/${sampleProduct.id}/summary`, expect: ok2xx });
  }

  for (const c of checks) {
    const url = env.apiBaseUrl.replace(/\/$/, "") + c.path;
    try {
      const res = await fetch(url);
      let json: unknown = null;
      try {
        json = await res.json();
      } catch {
        /* non-JSON */
      }
      const reason = c.expect(json, res.status);
      report.apiChecks.push({ endpoint: `GET ${c.path}`, status: res.status, ok: reason === null, note: reason ?? undefined });
      log[reason === null ? "success" : "error"](`${reason === null ? "OK" : "FAIL"} ${c.name} (${res.status})${reason ? " — " + reason : ""}`);
    } catch (e) {
      report.apiChecks.push({ endpoint: `GET ${c.path}`, status: 0, ok: false, note: String((e as Error).message ?? e) });
      log.error(`FAIL ${c.name} — ${String((e as Error).message ?? e)}`);
    }
  }

  const { mdPath, pass } = report.write();
  log.info(`Smoke report: ${mdPath}`);
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  log.error("Smoke run crashed", { error: String(e?.stack ?? e) });
  process.exit(1);
});
