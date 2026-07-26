import 'server-only';
import { db } from './supabaseServer';

/**
 * Supabase-backed job queue (v2.2). The portal's cron routes insert a row;
 * the Railway worker claims and runs it. Replaces the Upstash/BullMQ queue —
 * a metered Redis was the wrong tool for a handful of jobs per day.
 */
export async function enqueue(jobName: string): Promise<string> {
  const { data, error } = await db().from('cd_jobs').insert({ job: jobName }).select('id').single();
  if (error) throw new Error(`enqueue failed: ${error.message}`);
  return String(data.id);
}
