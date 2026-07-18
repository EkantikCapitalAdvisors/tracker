/**
 * Daily ingestion (~5:30 PM CT, market days) — Spec §2.
 * Fail-open: a failed series logs a DATA_GAP row and never blocks the run.
 * After ingestion, the state machine evaluates the day's close; while
 * Tier ≥ 1, the daily post-close mini-sentinel goes out automatically.
 */

import { fetchFredSeries } from '../lib/fred.js';
import { fetchYahooDaily } from '../lib/yahoo.js';
import { postThread } from '../lib/slack.js';
import { db, storeReadings, type ReadingRow } from '../lib/supabase.js';
import { assembleReadings } from '../derive.js';
import { evaluateAndPersist } from '../state.js';
import { formatSentinel, type SentinelContext } from '../sentinel.js';
import { getPriorTier, getCatalystTag, listStaleManualFields } from './shared.js';

const DAILY_SERIES: { id: string; provisional?: boolean }[] = [
  { id: 'SP500' },
  { id: 'DGS10' },
  { id: 'BAMLC0A0CM' }, // CONTEXT ONLY until Jan-2027 calibration
  { id: 'BAMLH0A0HYM2' }, // CONTEXT ONLY until Jan-2027 calibration
  { id: 'VIXCLS' },
  { id: 'T10Y3M' },
  { id: 'BAA' },
  { id: 'GS10' },
  { id: 'CPIAUCSL', provisional: true },
  { id: 'UNRATE' },
  { id: 'IC4WSA' },
];

/**
 * International context indices — CONTEXT ONLY, never feed the engine.
 * series_id values must match INTL_INDICES in apps/portal/lib/methodology.ts.
 */
const INTL_SERIES: { id: string; symbol: string }[] = [
  { id: 'INTL_NIKKEI225', symbol: '^N225' },
  { id: 'INTL_STOXX50', symbol: '^STOXX50E' },
  { id: 'INTL_DAX', symbol: '^GDAXI' },
  { id: 'INTL_FTSE100', symbol: '^FTSE' },
  { id: 'INTL_HANGSENG', symbol: '^HSI' },
  { id: 'INTL_KOSPI', symbol: '^KS11' },
  { id: 'INTL_TAIEX', symbol: '^TWII' },
];

export async function runDailyIngest(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  for (const series of DAILY_SERIES) {
    try {
      const obs = await fetchFredSeries(series.id);
      const rows: ReadingRow[] = obs.map((o) => ({
        series_id: series.id,
        as_of_date: o.date,
        value: o.value,
        source: 'FRED',
        provisional: series.provisional ?? false,
      }));
      await storeReadings(rows);
    } catch (err) {
      // Fail-open: record the gap, continue the pipeline.
      await storeReadings([
        {
          series_id: series.id,
          as_of_date: today,
          value: null,
          source: 'FRED',
          data_gap: true,
        },
      ]);
      console.error(`DATA_GAP ${series.id}: ${(err as Error).message}`);
    }
  }

  // International context indices (fail-open; never block the evaluation).
  for (const idx of INTL_SERIES) {
    try {
      const obs = await fetchYahooDaily(idx.symbol);
      await storeReadings(
        obs.slice(-400).map((o) => ({
          series_id: idx.id,
          as_of_date: o.date,
          value: o.value,
          source: 'yahoo',
        })),
      );
    } catch (err) {
      await storeReadings([
        { series_id: idx.id, as_of_date: today, value: null, source: 'yahoo', data_gap: true },
      ]);
      console.error(`DATA_GAP ${idx.id}: ${(err as Error).message}`);
    }
  }

  const readings = await assembleReadings();
  const priorTier = await getPriorTier();
  const result = await evaluateAndPersist(readings);

  // Tier-1 entry requires an event-register entry within 48h; nag if absent.
  if (result.sideEffects.requireEventRegister) {
    const tag = await getCatalystTag(result.state.cycleHighDate);
    if (!tag) {
      const { postMessage } = await import('../lib/slack.js');
      await postMessage(
        `:warning: TIER ≥1 entry on ${readings.asOfDate} — event-register entry required within 48h (catalyst + SPECULATIVE/REALITY_BASED tag). Use the admin drawer at /dashboard/correction.`,
      );
    }
  }

  // Daily mini-sentinel auto-activates while Tier ≥ 1.
  if (result.tier >= 1 || (priorTier !== null && priorTier >= 1)) {
    const ctx: SentinelContext = {
      result,
      readings,
      priorTier,
      catalystTag: await getCatalystTag(result.state.cycleHighDate),
      deltas: [],
      narrative: null,
      manualNA: await listStaleManualFields(),
    };
    const [head, layers, action] = formatSentinel(ctx);
    const ts = await postThread([`:small_red_triangle_down: DAILY MINI-SENTINEL\n${head}`, layers!, action!]);
    await db().from('cd_sentinels').insert({
      kind: 'DAILY_MINI',
      tier: result.tier,
      message_payload: { messages: [head, layers, action] },
      slack_ts: ts,
    });
  }
}
