/**
 * Annual job (January): export the prior year's events + readings as a
 * re-validation package for the backtest re-run (Spec §7).
 */

import { db } from '../lib/supabase.js';
import { postMessage } from '../lib/slack.js';

export async function runAnnualExport(): Promise<void> {
  const year = new Date().getUTCFullYear() - 1;
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;

  const [states, tripwires, readings, events, sentinels] = await Promise.all([
    db().from('cd_state_log').select('*').gte('entered_at', from).lte('entered_at', to),
    db().from('cd_tripwire_log').select('*').gte('as_of_date', from).lte('as_of_date', to),
    db().from('cd_readings').select('*').gte('as_of_date', from).lte('as_of_date', to),
    db().from('cd_event_register').select('*').gte('peak_date', from).lte('peak_date', to),
    db().from('cd_sentinels').select('id,sent_at,kind,tier').gte('sent_at', from),
  ]);

  const pkg = {
    package: `correction-dashboard-revalidation-${year}`,
    generated_at: new Date().toISOString(),
    state_log: states.data ?? [],
    tripwire_log: tripwires.data ?? [],
    readings: readings.data ?? [],
    event_register: events.data ?? [],
    sentinel_index: sentinels.data ?? [],
  };

  const path = `revalidation/${year}.json`;
  const { error } = await db()
    .storage.from('cd-exports')
    .upload(path, JSON.stringify(pkg, null, 2), { contentType: 'application/json', upsert: true });
  if (error) throw new Error(`export upload failed: ${error.message}`);

  await postMessage(
    `:card_file_box: Annual re-validation package exported: cd-exports/${path} — ` +
      `${pkg.state_log.length} state rows, ${pkg.tripwire_log.length} tripwire rows, ` +
      `${pkg.event_register.length} event-register entries. Append to the backtest and re-run per Spec §7.`,
  );
}
