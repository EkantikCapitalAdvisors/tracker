import 'server-only';
import { inTopTrailingTercile, sahmValue, yoyPct } from '@ekantik/correction-engine';
import { db } from './supabaseServer';
import { computePositioning } from './positioning';
import {
  cashRule,
  computePlainGauges,
  DEFAULT_BANDS,
  plainCheckpoint,
  plainLadder,
  STANCE_NAMES,
  type CashRuleCondition,
  type PlainGauge,
  type PlainLadderRung,
  type PlainViewInputs,
  type PresentationBands,
} from './plainView';

export interface PlainState {
  stance: string;
  deploymentPct: number;
  cashPct: number;
  tier: number;
  spClose: number | null;
  drawdownPct: number | null;
  checkpoint: { before: string; number: string; after: string };
  ladder: PlainLadderRung[];
  gauges: PlainGauge[];
  cashRule: { conditions: CashRuleCondition[]; allMet: boolean };
  /** Gauges whose color came from a presentation band, not raw engine status (operator divergence strip). */
  divergences: { gauge: string; color: string; reason: string }[];
  /** Raw derived inputs — operator surfaces (analog ranking, workbench). */
  raw: {
    creditDelta3mBp: number | null;
    creditLevelBp: number | null;
    cpiYoYPct: number | null;
    sahmValue: number | null;
    capeTercile: 0 | 1 | 2 | null;
  };
  updatedAt: string | null;
  cadence: string;
}

async function series(id: string, limit: number): Promise<{ d: string; v: number }[]> {
  const { data } = await db()
    .from('cd_readings')
    .select('as_of_date,value')
    .eq('series_id', id)
    .eq('data_gap', false)
    .order('as_of_date', { ascending: false })
    .limit(limit);
  return (data ?? [])
    .filter((r) => r.value !== null)
    .map((r) => ({ d: r.as_of_date as string, v: r.value as number }))
    .reverse();
}

/** Daily Baa−10y spread series in bp — same construction as the worker's derive step. */
function spreadSeries(
  baa: { d: string; v: number }[],
  dgs10: { d: string; v: number }[],
): number[] {
  if (baa.length === 0 || dgs10.length === 0) return [];
  const out: number[] = [];
  let bi = 0;
  for (const d of dgs10) {
    while (bi + 1 < baa.length && baa[bi + 1]!.d <= d.d) bi++;
    const b = baa[bi];
    if (!b || b.d > d.d) continue;
    out.push((b.v - d.v) * 100);
  }
  return out;
}

/** Tercile (0/1/2) using the engine's own top-tercile function for the orange boundary. */
function capeTercile(monthly: number[]): 0 | 1 | 2 | null {
  if (monthly.length < 24) return null;
  if (inTopTrailingTercile(monthly)) return 2;
  const window = monthly.slice(-360);
  const latest = window[window.length - 1]!;
  const sorted = [...window].sort((a, b) => a - b);
  const cut = sorted[Math.floor(sorted.length / 3)]!;
  return latest >= cut ? 1 : 0;
}

async function loadBands(): Promise<PresentationBands> {
  try {
    const { data } = await db()
      .from('cd_presentation_bands')
      .select('gauge,band,threshold_value,id')
      .order('id', { ascending: false });
    const latest = new Map<string, number>();
    for (const row of data ?? []) {
      const key = `${row.gauge}:${row.band}`;
      if (!latest.has(key) && row.threshold_value !== null) latest.set(key, row.threshold_value);
    }
    return {
      creditYellowBp: latest.get('credit:yellow') ?? DEFAULT_BANDS.creditYellowBp,
      fedGreenMax: latest.get('fed:green') ?? DEFAULT_BANDS.fedGreenMax,
      fedYellowMax: latest.get('fed:yellow') ?? DEFAULT_BANDS.fedYellowMax,
      jobsGreenMax: latest.get('jobs:green') ?? DEFAULT_BANDS.jobsGreenMax,
      jobsYellowMax: latest.get('jobs:yellow') ?? DEFAULT_BANDS.jobsYellowMax,
      recoveryOrangeTd: latest.get('recovery:orange') ?? DEFAULT_BANDS.recoveryOrangeTd,
    };
  } catch {
    return DEFAULT_BANDS;
  }
}

export interface ContextCard {
  label: string;
  value: string;
  asOf: string | null;
  note: string;
}

/** Long-horizon context (M3): colorless, decade-scale, never a timing input. */
export async function loadContextCards(): Promise<ContextCard[]> {
  const [debt, oil] = await Promise.all([series('GFDEGDQ188S', 4), series('DCOILWTICO', 4)]);
  const last = (s: { d: string; v: number }[]) => s.at(-1) ?? null;
  const d = last(debt);
  const o = last(oil);
  return [
    {
      label: 'US federal debt vs. GDP',
      value: d ? `${d.v.toFixed(0)}%` : 'N/A',
      asOf: d?.d ?? null,
      note: 'Shapes the long game; has never timed a correction.',
    },
    {
      label: 'US dollar share of world reserves',
      value: 'N/A — manual',
      asOf: null,
      note: 'IMF COFER, quarterly; entered when reviewed.',
    },
    {
      label: 'Oil (WTI)',
      value: o ? `$${o.v.toFixed(0)}` : 'N/A',
      asOf: o?.d ?? null,
      note: 'Feeds inflation over months — watch the Fed gauge, not this.',
    },
  ];
}

/** Assemble the full Plain View model server-side (all strings composed here). */
export async function loadPlainState(): Promise<PlainState | null> {
  const client = db();
  const [{ data: stateRows }, { data: lastTrip }, bands] = await Promise.all([
    client.from('cd_state_log').select('*').order('id', { ascending: false }).limit(1),
    client.from('cd_tripwire_log').select('as_of_date').order('id', { ascending: false }).limit(1),
    loadBands(),
  ]);
  const state = stateRows?.[0];
  if (!state) return null;
  const asOf = (lastTrip?.[0]?.as_of_date as string | undefined) ?? null;

  const statuses = new Map<string, string>();
  const notes = new Map<string, string>();
  if (asOf) {
    const { data: board } = await client
      .from('cd_tripwire_log')
      .select('tripwire,status,note')
      .eq('as_of_date', asOf);
    for (const row of board ?? []) {
      statuses.set(row.tripwire as string, row.status as string);
      if (row.note) notes.set(row.tripwire as string, row.note as string);
    }
  }

  const [spx, baa, dgs10, cpi, unrate, cape] = await Promise.all([
    series('SP500', 2),
    series('BAA', 30),
    series('DGS10', 130),
    series('CPIAUCSL', 26),
    series('UNRATE', 30),
    series('CAPE', 400),
  ]);

  const spread = spreadSeries(baa, dgs10);
  const creditLevelBp = spread.at(-1) ?? null;
  const creditDelta3mBp =
    spread.length > 63 && creditLevelBp !== null ? creditLevelBp - spread[spread.length - 64]! : null;
  const cpiVals = cpi.map((r) => r.v);
  const cpiYoY = cpiVals.length >= 13 ? yoyPct(cpiVals.at(-1)!, cpiVals.at(-13)!) : null;
  const sahm = sahmValue(unrate.map((r) => r.v));
  const tercile = capeTercile(cape.map((r) => r.v));

  const engine = (state.engine_state ?? {}) as {
    routerStatus?: string;
    tradingDaysSinceCross?: number;
    cycleHigh?: number;
  };
  const spClose = spx.at(-1)?.v ?? null;
  const cycleHigh = engine.cycleHigh ?? (state.cycle_high as number | null);
  const drawdown =
    spClose !== null && cycleHigh ? ((spClose - cycleHigh) / cycleHigh) * 100 : (state.drawdown_pct as number | null);

  const inputs: PlainViewInputs = {
    tier: state.tier as number,
    drawdownPct: drawdown,
    routerStatus: engine.routerStatus ?? null,
    tdSinceCross: engine.tradingDaysSinceCross ?? null,
    statuses,
    notes,
    creditDelta3mBp,
    creditLevelBp,
    cpiYoYPct: cpiYoY,
    sahmValue: sahm,
    capeTercile: tercile,
    spClose,
    cycleHigh,
    asOf,
    bands,
  };

  const pos = computePositioning({
    tier: inputs.tier,
    routerStatus: inputs.routerStatus,
    statuses,
  });
  const gauges = computePlainGauges(inputs);
  const conditions = cashRule(inputs);

  return {
    stance: STANCE_NAMES[pos.row.id] ?? pos.row.action,
    deploymentPct: pos.equityPct,
    cashPct: pos.cashPct,
    tier: inputs.tier,
    spClose,
    drawdownPct: drawdown,
    checkpoint: plainCheckpoint(inputs.tier, cycleHigh),
    ladder: plainLadder(pos.row.id),
    gauges,
    cashRule: { conditions, allMet: conditions.every((c) => c.met) },
    divergences: gauges
      .filter((g) => g.bandDriven)
      .map((g) => ({
        gauge: g.name,
        color: g.color,
        reason: `presentation band set ${g.label} while the frozen signal is quiet`,
      })),
    raw: {
      creditDelta3mBp,
      creditLevelBp,
      cpiYoYPct: cpiYoY,
      sahmValue: sahm,
      capeTercile: tercile,
    },
    updatedAt: asOf,
    cadence: 'Updated after every market close · reviewed weekly; daily attention when any gauge leaves green',
  };
}
