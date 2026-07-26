import 'server-only';
/**
 * Operator depth-intelligence workbench — Tracker v2.1 §6 (M2).
 * Reads engine outputs and runs the ENGINE'S OWN depth function on current
 * data. For Tier 0/1 the tier is floored to 2 to produce a hypothetical
 * "pre-activation" range — clearly labeled; the official range publishes
 * only at Tier ≥ 2, exactly as before. No state logic modified.
 */

import {
  runDepthEngine,
  yoyPct,
  type DepthRange,
  type EngineReadings,
  type EngineState,
  type Tier,
  type TripwireResult,
} from '@ekantik/correction-engine';
import { db } from './supabaseServer';
import rawCatalog from './analogCatalog.json';

/* ------------------------------------------------------------------ */
/* Depth workbench                                                     */
/* ------------------------------------------------------------------ */

export interface Workbench {
  preActivation: boolean; // true when tier < 2 (hypothetical estimate)
  tier: number;
  catalystTag: string | null;
  range: DepthRange | null;
  rangeError: string | null;
}

async function series(id: string, limit: number): Promise<number[]> {
  const { data } = await db()
    .from('cd_readings')
    .select('as_of_date,value')
    .eq('series_id', id)
    .eq('data_gap', false)
    .order('as_of_date', { ascending: false })
    .limit(limit);
  return (data ?? [])
    .filter((r) => r.value !== null)
    .map((r) => r.value as number)
    .reverse();
}

export async function loadWorkbench(): Promise<Workbench | null> {
  const client = db();
  const [{ data: stateRows }, { data: lastTrip }] = await Promise.all([
    client.from('cd_state_log').select('tier,cycle_high_date,engine_state').order('id', { ascending: false }).limit(1),
    client.from('cd_tripwire_log').select('as_of_date').order('id', { ascending: false }).limit(1),
  ]);
  const stateRow = stateRows?.[0];
  if (!stateRow) return null;
  const engineState = stateRow.engine_state as EngineState;
  const asOf = lastTrip?.[0]?.as_of_date as string | undefined;

  let board: { tripwire: string; status: string }[] = [];
  if (asOf) {
    const { data } = await client
      .from('cd_tripwire_log')
      .select('tripwire,status')
      .eq('as_of_date', asOf);
    board = (data ?? []) as typeof board;
  }
  // The depth engine reads only id + status from this list.
  const tripwires = board.map((b) => ({ id: b.tripwire, status: b.status })) as unknown as TripwireResult[];

  const { data: register } = await client
    .from('cd_event_register')
    .select('tag')
    .eq('peak_date', (stateRow.cycle_high_date as string) ?? '')
    .order('id', { ascending: false })
    .limit(1);
  const catalystTag = (register?.[0]?.tag as 'SPECULATIVE' | 'REALITY_BASED' | undefined) ?? null;

  const [claims, { data: breadthRows }] = await Promise.all([
    series('IC4WSA', 60),
    client
      .from('cd_manual_entries')
      .select('value_bool,as_of_date')
      .eq('field', 'REVISION_BREADTH_NEGATIVE')
      .order('as_of_date', { ascending: false })
      .limit(1),
  ]);
  const breadthRow = breadthRows?.[0];
  const breadthFresh =
    breadthRow && (Date.now() - new Date(breadthRow.as_of_date as string).getTime()) / 86_400_000 <= 14
      ? (breadthRow.value_bool as boolean | null)
      : null;
  const claimsYoY = claims.length >= 53 ? yoyPct(claims.at(-1)!, claims.at(-53)!) : null;

  // Minimal readings object — the depth engine's stage 2 reads exactly these
  // two fields; everything else is null/ignored (cast documents the contract).
  const readings = {
    revisionBreadthNegative: breadthFresh,
    claims4wkYoYPct: claimsYoY,
  } as unknown as EngineReadings;

  const tier = stateRow.tier as number;
  let range: DepthRange | null = null;
  let rangeError: string | null = null;
  try {
    range = runDepthEngine({
      tier: Math.max(tier, 2) as Tier, // floor to 2 for the pre-activation estimate
      catalystTag,
      tripwires,
      readings,
      state: engineState,
      currentPE: null, // valuation inputs not yet wired — engine notes the gap
      analogPE: null,
      analogDepthPct: null,
    });
  } catch (err) {
    rangeError = (err as Error).message;
  }

  return { preActivation: tier < 2, tier, catalystTag, range, rangeError };
}

/* ------------------------------------------------------------------ */
/* Analog panel — nearest historical analogs from the 54-event catalog */
/* ------------------------------------------------------------------ */

interface CatalogEvent {
  id: string;
  name: string;
  peakDate: string;
  troughDate: string;
  depthPct: number;
  cpiYoY: number;
  deltaSprBp: number;
  sahmTriggered: boolean;
}

export interface Analog {
  name: string;
  depthPct: number;
  durationDays: number;
  matchedOn: string[];
  score: number;
}

export function rankAnalogs(current: {
  policyConstrained: boolean;
  sahmActive: boolean;
  creditDeltaBp: number | null;
  capeTop: boolean;
}): Analog[] {
  const events = (rawCatalog as { events: CatalogEvent[] }).events;
  const scored = events.map((e) => {
    const matchedOn: string[] = [];
    let score = 0;
    const evConstrained = e.cpiYoY > 4.0;
    if (evConstrained === current.policyConstrained) {
      score += 2;
      matchedOn.push(current.policyConstrained ? 'policy constrained' : 'policy free');
    }
    if (e.sahmTriggered === current.sahmActive) {
      score += 2;
      matchedOn.push(current.sahmActive ? 'recession signal active' : 'no recession signal');
    }
    if (current.creditDeltaBp !== null) {
      const dist = Math.abs(e.deltaSprBp - Math.max(current.creditDeltaBp, 0));
      if (dist <= 25) {
        score += 2;
        matchedOn.push('similar credit widening');
      } else if (dist <= 60) {
        score += 1;
      }
    }
    // Valuation regime is only known for the current side; top-tercile eras in
    // the catalog cluster post-1997 and 1973 — approximate via depth priors is
    // NOT attempted (endpoints only). CAPE match intentionally omitted from
    // scoring; shown as context on the card instead.
    const durationDays = Math.round(
      (new Date(e.troughDate).getTime() - new Date(e.peakDate).getTime()) / 86_400_000,
    );
    return { name: e.name, depthPct: e.depthPct, durationDays, matchedOn, score };
  });
  return scored.sort((a, b) => b.score - a.score || a.depthPct - b.depthPct).slice(0, 3);
}
