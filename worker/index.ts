import "dotenv/config";
import { Worker } from "bullmq";
import { connection } from "./queue";
import { handleGoogleSync } from "./jobs/sync-google";
import { handleM365Sync } from "./jobs/sync-m365";
import { handleOktaSync } from "./jobs/sync-okta";
import { handleOnePasswordSync } from "./jobs/sync-onepassword";
import { handleCardFeedSync } from "./jobs/sync-cardfeed";
import { db } from "@/lib/db";
import type { ConnectorType } from "@prisma/client";

const CARD_FEED_TYPES = new Set<ConnectorType>(["stripe", "brex", "ramp", "csv"]);

const worker = new Worker(
  "connector-sync",
  async (job) => {
    const { connectorId } = job.data as { connectorId: string };
    const jobName = job.name as ConnectorType;

    await db.connector.update({ where: { id: connectorId }, data: { status: "active" } }).catch(() => null);

    if (jobName === "google_workspace") return handleGoogleSync(connectorId);
    if (jobName === "microsoft_365") return handleM365Sync(connectorId);
    if (jobName === "okta") return handleOktaSync(connectorId);
    if (jobName === "onepassword") return handleOnePasswordSync(connectorId);
    if (CARD_FEED_TYPES.has(jobName)) return handleCardFeedSync(connectorId, jobName);

    throw new Error(`Unknown connector type: ${jobName}`);
  },
  { connection, concurrency: 2, limiter: { max: 5, duration: 60_000 } }
);

worker.on("completed", (job) => {
  console.log(`[worker] ✓ ${job.name} (job ${job.id}) completed`);
});

worker.on("failed", async (job, err) => {
  console.error(`[worker] ✗ ${job?.name} failed: ${err.message}`);
  if (job?.data?.connectorId) {
    await db.connector.update({ where: { id: job.data.connectorId }, data: { status: "error", lastSyncStatus: "failed" } }).catch(() => null);
  }
});

process.on("SIGTERM", async () => {
  await worker.close();
  await connection.quit();
  process.exit(0);
});

console.log("[worker] SaaSGuard worker started. Waiting for jobs...");
