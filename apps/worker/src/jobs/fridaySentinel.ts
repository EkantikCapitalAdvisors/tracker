/**
 * Friday 5:00 PM CT sentinel — assembles readings, runs the state machine,
 * posts the three-message threaded sentinel (auto-send, no draft review),
 * and persists to cd_sentinels. Structure per v1 sentinel prompt §6.
 */

import { db } from '../lib/supabase.js';
import { postThread } from '../lib/slack.js';
import { synthesizeNarrative } from '../lib/narrative.js';
import { assembleReadings } from '../derive.js';
import { evaluateAndPersist } from '../state.js';
import { buildDepthRange, formatSentinel, type SentinelContext } from '../sentinel.js';
import { getCatalystTag, getPriorTier, listStaleManualFields } from './shared.js';

export async function runFridaySentinel(): Promise<void> {
  const readings = await assembleReadings();
  const priorTier = await getPriorTier();
  const result = await evaluateAndPersist(readings);

  // Week-over-week deltas from the prior WEEKLY sentinel payload.
  const { data: prior } = await db()
    .from('cd_sentinels')
    .select('message_payload')
    .eq('kind', 'WEEKLY')
    .order('id', { ascending: false })
    .limit(1);
  const priorStructured = (prior?.[0]?.message_payload as { structured?: Record<string, number | null> })
    ?.structured;
  const deltas = computeDeltas(priorStructured ?? null, {
    drawdownPct: result.drawdownPct,
    baa10ySpreadBp: readings.baa10ySpreadBp,
    cpiYoYPct: readings.cpiYoYPct,
    sahm: readings.sahmValue,
  });

  const ctx: SentinelContext = {
    result,
    readings,
    priorTier,
    catalystTag: await getCatalystTag(result.state.cycleHighDate),
    deltas,
    narrative: null,
    manualNA: await listStaleManualFields(),
  };

  const structured = {
    asOfDate: readings.asOfDate,
    tier: result.tier,
    drawdownPct: result.drawdownPct,
    baa10ySpreadBp: readings.baa10ySpreadBp,
    cpiYoYPct: readings.cpiYoYPct,
    sahm: readings.sahmValue,
    tripwires: result.tripwires.map((t) => ({ id: t.id, status: t.status, reading: t.reading })),
    depth: buildDepthRange(ctx),
    nextCheckpoint: result.nextCheckpoint,
  };
  // Narrative paragraph is model-generated FROM the structured state only;
  // the structured fields themselves are never model-generated.
  ctx.narrative = await synthesizeNarrative(structured);

  const messages = formatSentinel(ctx);
  const ts = await postThread(messages);

  const { error } = await db().from('cd_sentinels').insert({
    kind: 'WEEKLY',
    tier: result.tier,
    message_payload: { messages, structured },
    slack_ts: ts,
  });
  if (error) throw new Error(`cd_sentinels insert failed: ${error.message}`);
}

function computeDeltas(
  prior: Record<string, number | null> | null,
  current: Record<string, number | null>,
): string[] {
  if (!prior) return [];
  const out: string[] = [];
  const fmt = (label: string, a: number, b: number, unit: string, digits = 1) => {
    const d = a - b;
    if (Math.abs(d) < 10 ** -digits / 2) return;
    out.push(`${label} ${d > 0 ? '+' : ''}${d.toFixed(digits)}${unit}`);
  };
  if (current.drawdownPct != null && prior.drawdownPct != null)
    fmt('drawdown', current.drawdownPct, prior.drawdownPct, 'pp');
  if (current.baa10ySpreadBp != null && prior.baa10ySpreadBp != null)
    fmt('Baa−10y', current.baa10ySpreadBp, prior.baa10ySpreadBp, 'bp', 0);
  if (current.cpiYoYPct != null && prior.cpiYoYPct != null)
    fmt('CPI YoY', current.cpiYoYPct, prior.cpiYoYPct, 'pp');
  if (current.sahm != null && prior.sahm != null) fmt('Sahm', current.sahm, prior.sahm, '', 2);
  return out.slice(0, 4);
}
