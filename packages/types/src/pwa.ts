import { z } from "zod";

// ---------------------------------------------------------------------------
// PWA installs
//
// A lightweight install ledger: one row per recorded install of the NuruShop
// PWA. The client fires a record when the browser's `appinstalled` event runs
// (anonymous or, when signed in, linked to the user). Admins see the total.
// ---------------------------------------------------------------------------

/** Public payload to record a PWA install. The user agent is read server-side. */
export const pwaInstallRecordSchema = z
  .object({
    platform: z.string().trim().max(120).optional().nullable(),
    userAgent: z.string().trim().max(512).optional().nullable(),
  })
  .strict();
export type PwaInstallRecordInput = z.infer<typeof pwaInstallRecordSchema>;

/** Aggregate install stats for the admin dashboard. */
export interface PwaInstallStatsDTO {
  /** Total recorded installs (one per signed-in user, plus anonymous installs). */
  totalInstalled: number;
}
