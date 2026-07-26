/**
 * Railway worker entrypoint (v2.2) — Supabase-backed job loop.
 * Scheduling comes from Vercel Cron hitting the portal's /api/cron/* routes,
 * which insert rows into cd_jobs; this single worker claims and runs them.
 * Replaces BullMQ/Upstash: a metered Redis was the wrong tool for a handful
 * of jobs per day (its 500K req/mo free tier was exhausted by idle polling).
 */

import { db } from './lib/supabase.js';
import { runDailyIngest } from './jobs/dailyIngest.js';
import { runWeeklyIngest } from './jobs/weeklyIngest.js';
import { runFridaySentinel } from './jobs/fridaySentinel.js';
import { runRetirementChecks } from './jobs/retirementChecks.js';
import { runAnnualExport } from './jobs/annualExport.js';

const POLL_MS = 15_000;

const handlers: Record<string, () => Promise<void>> = {
  'daily-ingest': runDailyIngest,
  'weekly-ingest': runWeeklyIngest,
  'friday-sentinel': runFridaySentinel,
  'retirement-checks': runRetirementChecks,
  'annual-export': runAnnualExport,
};

let stopping = false;

async function claimNext(): Promise<{ id: number; job: string } | null> {
  const { data: queued } = await db()
    .from('cd_jobs')
    .select('id,job')
    .eq('status', 'queued')
    .order('id', { ascending: true })
    .limit(1);
  const next = queued?.[0];
  if (!next) return null;
  // Optimistic claim: only wins if the row is still queued.
  const { data: claimed } = await db()
    .from('cd_jobs')
    .update({ status: 'running', started_at: new Date().toISOString() })
    .eq('id', next.id)
    .eq('status', 'queued')
    .select('id,job');
  return claimed?.[0] ? { id: claimed[0].id as number, job: claimed[0].job as string } : null;
}

async function runOnce(): Promise<void> {
  const claimed = await claimNext();
  if (!claimed) return;
  const handler = handlers[claimed.job];
  console.log(`[${new Date().toISOString()}] start ${claimed.job}`);
  try {
    if (!handler) throw new Error(`Unknown job ${claimed.job}`);
    await handler();
    await db()
      .from('cd_jobs')
      .update({ status: 'done', finished_at: new Date().toISOString() })
      .eq('id', claimed.id);
    console.log(`[${new Date().toISOString()}] done ${claimed.job}`);
  } catch (err) {
    const message = (err as Error).message;
    await db()
      .from('cd_jobs')
      .update({ status: 'failed', error: message.slice(0, 1000), finished_at: new Date().toISOString() })
      .eq('id', claimed.id);
    console.error(`job ${claimed.job} failed: ${message}`);
  }
}

async function main(): Promise<void> {
  console.log(`[${new Date().toISOString()}] worker up — polling cd_jobs every ${POLL_MS / 1000}s`);
  // Recover jobs stranded in 'running' by a previous crash/restart.
  await db()
    .from('cd_jobs')
    .update({ status: 'queued', started_at: null })
    .eq('status', 'running');
  while (!stopping) {
    try {
      await runOnce();
    } catch (err) {
      console.error(`worker loop error: ${(err as Error).message}`);
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

process.on('SIGTERM', () => {
  stopping = true;
  setTimeout(() => process.exit(0), 500);
});

void main();
