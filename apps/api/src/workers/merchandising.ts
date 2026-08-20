import { prisma } from "@nuru/db";
import { runMerchandisingMaintenance } from "../modules/merchandising/merchandising.worker.js";

try {
  const result = await runMerchandisingMaintenance();
  console.info(JSON.stringify({ job: "merchandising-maintenance", ok: true, ...result }));
} catch (error) {
  console.error(JSON.stringify({ job: "merchandising-maintenance", ok: false, error }));
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

