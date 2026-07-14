import type { CatalystTag } from '@ekantik/correction-engine';
import { db, latestManualEntry } from '../lib/supabase.js';

export async function getPriorTier(): Promise<number | null> {
  const { data } = await db()
    .from('cd_state_log')
    .select('tier')
    .order('id', { ascending: false })
    .limit(1);
  return data?.[0]?.tier ?? null;
}

export async function getCatalystTag(peakDate: string | null): Promise<CatalystTag | null> {
  if (!peakDate) return null;
  const { data } = await db()
    .from('cd_event_register')
    .select('tag')
    .gte('peak_date', shiftDays(peakDate, -30))
    .order('entered_at', { ascending: false })
    .limit(1);
  return (data?.[0]?.tag as CatalystTag | undefined) ?? null;
}

export async function listStaleManualFields(): Promise<string[]> {
  const fields = ['ALIGHT_401K_INDEX', 'DEALER_GAMMA', 'REVISION_BREADTH_NEGATIVE'];
  const out: string[] = [];
  for (const field of fields) {
    const entry = await latestManualEntry(field, 14);
    if (!entry) out.push(field);
  }
  return out;
}

export function shiftDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
