import { NextResponse } from 'next/server';
import { enqueue } from '@/lib/queue';

export const dynamic = 'force-dynamic';

const JOBS = new Set([
  'daily-ingest',
  'weekly-ingest',
  'friday-sentinel',
  'retirement-checks',
  'annual-export',
  'test-notice',
]);

/** Vercel Cron → enqueue the job for the Railway worker (cd_jobs queue). */
export async function GET(req: Request, { params }: { params: { job: string } }) {
  const auth = req.headers.get('authorization');
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!JOBS.has(params.job)) {
    return NextResponse.json({ error: `unknown job ${params.job}` }, { status: 404 });
  }
  const id = await enqueue(params.job);
  return NextResponse.json({ enqueued: params.job, id });
}
