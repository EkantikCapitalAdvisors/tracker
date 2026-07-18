/**
 * Weekly aggregates — CFTC COT net specs (ES), ICI flows, multpl CAPE.
 * Probation/context series in v2: stored and rendered, no trigger status.
 * Fail-open like the daily job.
 */

import { env } from '../env.js';
import { storeReadings } from '../lib/supabase.js';

export async function runWeeklyIngest(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);

  // CFTC COT — E-mini S&P 500 net speculative positioning (socrata API).
  try {
    const url = new URL('https://publicreporting.cftc.gov/resource/6dca-aqww.json');
    url.searchParams.set('$where', "contract_market_name like 'E-MINI S&P 500'");
    url.searchParams.set('$order', 'report_date_as_yyyy_mm_dd DESC');
    url.searchParams.set('$limit', '160'); // ~3y of weekly reports
    const headers: Record<string, string> = { 'user-agent': 'ekantik-correction-worker/2.0' };
    if (env.CFTC_APP_TOKEN) headers['X-App-Token'] = env.CFTC_APP_TOKEN;
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(`CFTC HTTP ${res.status}`);
    const rows = (await res.json()) as Record<string, string>[];
    const nets = rows
      .map((r) => ({
        date: r.report_date_as_yyyy_mm_dd?.slice(0, 10) ?? '',
        net:
          Number(r.noncomm_positions_long_all ?? NaN) -
          Number(r.noncomm_positions_short_all ?? NaN),
      }))
      .filter((r) => r.date && Number.isFinite(r.net))
      .reverse();
    if (nets.length >= 10) {
      const values = nets.map((n) => n.net);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const sd = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length) || 1;
      const latest = nets.at(-1)!;
      await storeReadings([
        { series_id: 'COT_ES_NET_SPEC', as_of_date: latest.date, value: latest.net, source: 'CFTC' },
        { series_id: 'COT_ES_NET_SPEC_Z', as_of_date: latest.date, value: (latest.net - mean) / sd, source: 'CFTC' },
      ]);
    }
  } catch (err) {
    await storeReadings([
      { series_id: 'COT_ES_NET_SPEC_Z', as_of_date: today, value: null, source: 'CFTC', data_gap: true },
    ]);
    console.error(`DATA_GAP COT: ${(err as Error).message}`);
  }

  // Shiller CAPE — multpl.com scrape (fallback: manual entry via admin form).
  try {
    const res = await fetch('https://www.multpl.com/shiller-pe/table/by-month', {
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`multpl HTTP ${res.status}`);
    const html = await res.text();
    const table = /<table id="datatable">([\s\S]*?)<\/table>/.exec(html)?.[1] ?? '';
    const rows = [...table.matchAll(/<td>([^<]+)<\/td>\s*<td>([^<]+)<\/td>/g)]
      .map((m) => ({
        raw: m[1]!.trim(),
        value: Number(m[2]!.replace(/&#x[0-9a-fA-F]+;/g, '').trim()),
      }))
      .filter((r) => Number.isFinite(r.value))
      .slice(0, 480);
    const parsed = rows
      .map((r) => ({ date: parseMultplDate(r.raw), value: r.value }))
      .filter((r): r is { date: string; value: number } => r.date !== null)
      .reverse();
    if (parsed.length > 0) {
      await storeReadings(
        parsed.map((p) => ({ series_id: 'CAPE', as_of_date: p.date, value: p.value, source: 'multpl' })),
      );
    }
  } catch (err) {
    await storeReadings([
      { series_id: 'CAPE', as_of_date: today, value: null, source: 'multpl', data_gap: true },
    ]);
    console.error(`DATA_GAP CAPE: ${(err as Error).message}`);
  }

  // ICI weekly flows — release scrape is brittle; treated as probation/context.
  // Recorded as DATA_GAP unless the fetch parses; renders "N/A — probation".
  try {
    const res = await fetch('https://www.ici.org/research/stats', {
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`ICI HTTP ${res.status}`);
    // v2 keeps ICI on probation: presence check only, values entered when
    // the release format is confirmed. No trigger status either way.
    await storeReadings([
      { series_id: 'ICI_FLOWS', as_of_date: today, value: null, source: 'ICI', data_gap: true },
    ]);
  } catch (err) {
    await storeReadings([
      { series_id: 'ICI_FLOWS', as_of_date: today, value: null, source: 'ICI', data_gap: true },
    ]);
    console.error(`DATA_GAP ICI: ${(err as Error).message}`);
  }
}

function parseMultplDate(raw: string): string | null {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}
