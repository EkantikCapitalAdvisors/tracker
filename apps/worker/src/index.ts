/**
 * Railway worker entrypoint — BullMQ consumers on Upstash Redis.
 * Scheduling comes from Vercel Cron hitting the portal's /api/cron/* routes,
 * which enqueue jobs here (single scheduling source; no repeatable jobs).
 */

import { Worker, type Job } from 'bullmq';
import { env } from './env.js';
import { runDailyIngest } from './jobs/dailyIngest.js';
import { runWeeklyIngest } from './jobs/weeklyIngest.js';
import { runFridaySentinel } from './jobs/fridaySentinel.js';
import { runRetirementChecks } from './jobs/retirementChecks.js';
import { runAnnualExport } from './jobs/annualExport.js';

export const QUEUE_NAME = 'correction-dashboard';

const handlers: Record<string, () => Promise<void>> = {
  'daily-ingest': runDailyIngest,
  'weekly-ingest': runWeeklyIngest,
  'friday-sentinel': runFridaySentinel,
  'retirement-checks': runRetirementChecks,
  'annual-export': runAnnualExport,
};

function connection() {
  const url = new URL(env.REDIS_URL);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    password: url.password || undefined,
    username: url.username || undefined,
    tls: url.protocol === 'rediss:' ? {} : undefined,
    maxRetriesPerRequest: null as null,
  };
}

const worker = new Worker(
  QUEUE_NAME,
  async (job: Job) => {
    const handler = handlers[job.name];
    if (!handler) throw new Error(`Unknown job ${job.name}`);
    console.log(`[${new Date().toISOString()}] start ${job.name}`);
    await handler();
    console.log(`[${new Date().toISOString()}] done ${job.name}`);
  },
  { connection: connection(), concurrency: 1 },
);

worker.on('failed', (job, err) => {
  console.error(`job ${job?.name} failed: ${err.message}`);
});

process.on('SIGTERM', async () => {
  await worker.close();
  process.exit(0);
});
