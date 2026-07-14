import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../env.js';

let client: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (!client) {
    client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE, {
      auth: { persistSession: false },
    });
  }
  return client;
}

export interface ReadingRow {
  series_id: string;
  as_of_date: string;
  value: number | null;
  source: string;
  provisional?: boolean;
  data_gap?: boolean;
}

/** Upsert readings; a failed series is recorded as a DATA_GAP row (fail-open). */
export async function storeReadings(rows: ReadingRow[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await db()
    .from('cd_readings')
    .upsert(rows, { onConflict: 'series_id,as_of_date,source', ignoreDuplicates: false });
  if (error) throw new Error(`cd_readings upsert failed: ${error.message}`);
}

export async function latestReadings(
  seriesId: string,
  limit: number,
): Promise<{ as_of_date: string; value: number | null }[]> {
  const { data, error } = await db()
    .from('cd_readings')
    .select('as_of_date,value')
    .eq('series_id', seriesId)
    .eq('data_gap', false)
    .order('as_of_date', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`cd_readings query failed (${seriesId}): ${error.message}`);
  return (data ?? []).reverse(); // oldest first
}

export async function latestManualEntry(
  field: string,
  maxStaleDays: number,
): Promise<{ value_num: number | null; value_bool: boolean | null; as_of_date: string } | null> {
  const { data, error } = await db()
    .from('cd_manual_entries')
    .select('value_num,value_bool,as_of_date')
    .eq('field', field)
    .order('as_of_date', { ascending: false })
    .limit(1);
  if (error) throw new Error(`cd_manual_entries query failed (${field}): ${error.message}`);
  const row = data?.[0];
  if (!row) return null;
  const ageDays = (Date.now() - new Date(row.as_of_date).getTime()) / 86_400_000;
  if (ageDays > maxStaleDays) return null; // stale — render N/A
  return row;
}
