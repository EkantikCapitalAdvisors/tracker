/**
 * State persistence: run the pure machine, append to the immutable logs,
 * maintain the FP ledger, and load thresholds with the integrity guard.
 */

import {
  FROZEN_THRESHOLDS,
  assertThresholdIntegrity,
  computeState,
  initialEngineState,
  type EngineReadings,
  type EngineResult,
  type EngineState,
  type Thresholds,
} from '@ekantik/correction-engine';
import { db } from './lib/supabase.js';

export async function loadThresholds(): Promise<Thresholds> {
  const { data, error } = await db().from('cd_thresholds').select('key,value');
  if (error) throw new Error(`cd_thresholds load failed: ${error.message}`);
  const loaded = Object.fromEntries((data ?? []).map((r) => [r.key, r.value])) as Partial<
    Record<keyof Thresholds, number>
  >;
  const { data: changes } = await db()
    .from('cd_threshold_changes')
    .select('key,new_value')
    .eq('applied', true);
  const overrides = Object.fromEntries(
    (changes ?? []).map((c) => [c.key, c.new_value]),
  ) as Partial<Record<keyof Thresholds, number>>;
  // Hard integrity gate: silent divergence from the frozen constants aborts.
  assertThresholdIntegrity(loaded, overrides);
  return { ...FROZEN_THRESHOLDS, ...loaded } as Thresholds;
}

export async function loadPriorState(readings: EngineReadings): Promise<EngineState> {
  const { data, error } = await db()
    .from('cd_state_log')
    .select('engine_state')
    .order('id', { ascending: false })
    .limit(1);
  if (error) throw new Error(`cd_state_log load failed: ${error.message}`);
  const snapshot = data?.[0]?.engine_state as EngineState | undefined;
  if (snapshot && typeof snapshot.tier === 'number') return snapshot;
  return initialEngineState(readings.cycleHigh, readings.cycleHighDate, readings.asOfDate);
}

/** Evaluate one market day and persist everything append-only. */
export async function evaluateAndPersist(readings: EngineReadings): Promise<EngineResult> {
  const thresholds = await loadThresholds();
  const prior = await loadPriorState(readings);

  // Skip double evaluation for the same close (idempotent daily job).
  const { data: lastEval } = await db()
    .from('cd_tripwire_log')
    .select('as_of_date')
    .order('id', { ascending: false })
    .limit(1);
  const alreadyEvaluated = lastEval?.[0]?.as_of_date === readings.asOfDate;

  const result = computeState(readings, prior, thresholds);

  if (!alreadyEvaluated) {
    const tripwireRows = result.tripwires.map((t) => ({
      tripwire: t.id,
      status: t.status,
      as_of_date: readings.asOfDate,
      inputs: { reading: t.reading, threshold: t.threshold, dataGap: t.dataGap ?? false },
      note: t.note ?? null,
    }));
    const { error: twError } = await db().from('cd_tripwire_log').insert(tripwireRows);
    if (twError) throw new Error(`cd_tripwire_log insert failed: ${twError.message}`);
    await seedFpLedger(readings.asOfDate);
  }

  for (const transition of result.transitions) {
    const { error } = await db().from('cd_state_log').insert({
      tier: transition.to,
      entered_at: transition.date,
      entry_reason: transition.reason,
      drawdown_pct: result.drawdownPct,
      cycle_high: result.state.cycleHigh,
      cycle_high_date: result.state.cycleHighDate,
      cross_date: result.state.crossDate,
      router_deadline_30: result.state.routerDeadline30Date,
      router_deadline_60: result.state.routerDeadline60Date,
      engine_state: result.state,
    });
    if (error) throw new Error(`cd_state_log insert failed: ${error.message}`);
  }
  if (result.transitions.length === 0) {
    // Persist the rolling state snapshot on the latest row via a fresh
    // append when the snapshot drifted (router counters tick daily).
    const { error } = await db().from('cd_state_log').insert({
      tier: result.tier,
      entered_at: result.state.enteredAt,
      entry_reason: 'daily snapshot',
      drawdown_pct: result.drawdownPct,
      cycle_high: result.state.cycleHigh,
      cycle_high_date: result.state.cycleHighDate,
      cross_date: result.state.crossDate,
      router_deadline_30: result.state.routerDeadline30Date,
      router_deadline_60: result.state.routerDeadline60Date,
      engine_state: result.state,
    });
    if (error) throw new Error(`cd_state_log snapshot failed: ${error.message}`);
  }

  return result;
}

/**
 * Every newly TRIGGERED/FIRED/ESCALATE row opens a 9-month FP-ledger window
 * (was a ≥10% event realized?) feeding the retirement criteria.
 */
async function seedFpLedger(asOfDate: string): Promise<void> {
  const { data } = await db()
    .from('cd_tripwire_log')
    .select('id,tripwire,status,as_of_date')
    .eq('as_of_date', asOfDate)
    .in('status', ['TRIGGERED', 'FIRED', 'ESCALATE']);
  if (!data || data.length === 0) return;
  const windowEnd = new Date(`${asOfDate}T00:00:00Z`);
  windowEnd.setUTCMonth(windowEnd.getUTCMonth() + 9);
  const rows = data.map((r) => ({
    tripwire_log_id: r.id,
    triggered_on: r.as_of_date,
    window_ends: windowEnd.toISOString().slice(0, 10),
    outcome: 'PENDING',
  }));
  await db().from('cd_fp_ledger').upsert(rows, { onConflict: 'tripwire_log_id', ignoreDuplicates: true });
}
