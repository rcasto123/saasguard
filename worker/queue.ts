// worker/queue.ts
import { Queue } from "bullmq";
import IORedis from "ioredis";

export const connection = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

export const syncQueue = new Queue("connector-sync", { connection });

export type SyncJobData = {
  connectorId: string;
};
