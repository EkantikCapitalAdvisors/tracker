import 'server-only';
import type { EngineState, TripwireId, TripwireStatus } from '@ekantik/correction-engine';
import { db } from './supabaseServer';
import { INTL_INDICES } from './methodology';

export interface TripwireCard {
  id: TripwireId | string;
  status: TripwireStatus | string;
  reading: string;
  threshold: string;
  note: string | null;
  asOfDate: string;
  dataGap: boolean;
  spark: number[];
}

export interface DashboardData {
  state: {
    tier: number;
    enteredAt: string;
    drawdownPct: number | null;
    cycleHigh: number | null;
    cycleHighDate: string | null;
    spClose: number | null;
    spDate: string | null;
    daysInState: number;
    crossDate: string | null;
    routerDeadline30: string | null;
    routerDeadline60: string | null;
    routerStatus: string | null;
  } | null;
  tripwires: TripwireCard[];
  tierHistory: {
    tier: number;
    enteredAt: string;
    reason: string;
    drawdownPct: number | null;
  }[];
  fpLedger: {
    tripwire: string;
    status: string;
    triggeredOn: string;
    windowEnds: string;
    outcome: string;
    note: string | null;
  }[];
  thresholds: { key: string; value: number; unit: string; basis: string; frozen: boolean }[];
  pendingChanges: {
    id: number;
    key: string;
    oldValue: number;
    newValue: number;
    justification: string;
    proposedBy: string;
    proposedAt: string;
    countersignedBy: string | null;
    effectiveAt: string | null;
    applied: boolean;
  }[];
  manualEntries: { field: string; asOfDate: string; valueNum: number | null; valueBool: boolean | null; stale: boolean }[];
  contextSeries: { igOas: number | null; hyOas: number | null; cotZ: number | null };
  intlIndices: IntlIndexRow[];
}

export interface IntlIndexRow {
  id: string;
  name: string;
  hint: string;
  close: number | null;
  asOfDate: string | null;
  /** % below the index's own trailing 6-month closing high (context only). */
  drawdownPct: number | null;
  /** Pearson correlation of daily log returns vs SP500, last 60 aligned sessions. */
  corr60: number | null;
  spark: number[];
}

/** Daily log returns keyed by date (each series vs its own prior session). */
function returnsByDate(rows: { d: string; v: number }[]): Map<string, number> {
  const out = new Map<string, number>();
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1]!.v;
    const cur = rows[i]!;
    if (prev > 0 && cur.v > 0) out.set(cur.d, Math.log(cur.v / prev));
  }
  return out;
}

function pearson(pairs: [number, number][]): number | null {
  const n = pairs.length;
  if (n < 20) return null; // demand a meaningful overlap
  const mx = pairs.reduce((a, p) => a + p[0], 0) / n;
  const my = pairs.reduce((a, p) => a + p[1], 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (const [x, y] of pairs) {
    sxy += (x - mx) * (y - my);
    sxx += (x - mx) ** 2;
    syy += (y - my) ** 2;
  }
  if (sxx === 0 || syy === 0) return null;
  return sxy / Math.sqrt(sxx * syy);
}

/** Lightweight loader for the landing page — current state + board statuses. */
export async function loadLandingState(): Promise<{
  tier: number;
  routerStatus: string | null;
  drawdownPct: number | null;
  asOf: string | null;
  statuses: Map<string, string>;
} | null> {
  const client = db();
  const [{ data: stateRows }, { data: lastTrip }] = await Promise.all([
    client.from('cd_state_log').select('tier,drawdown_pct,engine_state').order('id', { ascending: false }).limit(1),
    client.from('cd_tripwire_log').select('as_of_date').order('id', { ascending: false }).limit(1),
  ]);
  const state = stateRows?.[0];
  if (!state) return null;
  const asOf = (lastTrip?.[0]?.as_of_date as string | undefined) ?? null;
  const statuses = new Map<string, string>();
  if (asOf) {
    const { data: board } = await client
      .from('cd_tripwire_log')
      .select('tripwire,status')
      .eq('as_of_date', asOf);
    for (const row of board ?? []) statuses.set(row.tripwire as string, row.status as string);
  }
  const engine = (state.engine_state ?? null) as { routerStatus?: string } | null;
  return {
    tier: state.tier as number,
    routerStatus: engine?.routerStatus ?? null,
    drawdownPct: (state.drawdown_pct as number | null) ?? null,
    asOf,
    statuses,
  };
}

/** Lightweight loader for the methodology page — thresholds only. */
export async function loadThresholdsOnly(): Promise<
  { key: string; value: number; unit: string; basis: string; frozen: boolean }[]
> {
  const { data } = await db()
    .from('cd_thresholds')
    .select('key,value,unit,basis,frozen')
    .order('key');
  return (data ?? []).map((t) => ({
    key: t.key,
    value: t.value,
    unit: t.unit,
    basis: t.basis,
    frozen: t.frozen,
  }));
}

/** Context-only panel: intl drawdowns + 60-session return correlation vs SP500. */
async function loadIntlContext(): Promise<IntlIndexRow[]> {
  const spx = await series('SP500', 140);
  const spxReturns = returnsByDate(spx);
  const rows = await Promise.all(
    INTL_INDICES.map(async (idx): Promise<IntlIndexRow> => {
      const hist = await series(idx.id, 140);
      if (hist.length === 0) {
        return { ...idx, close: null, asOfDate: null, drawdownPct: null, corr60: null, spark: [] };
      }
      const last = hist[hist.length - 1]!;
      const high = Math.max(...hist.slice(-126).map((r) => r.v));
      const idxReturns = returnsByDate(hist);
      const aligned: [number, number][] = [];
      for (const [d, r] of idxReturns) {
        const s = spxReturns.get(d);
        if (s !== undefined) aligned.push([r, s]);
      }
      return {
        ...idx,
        close: last.v,
        asOfDate: last.d,
        drawdownPct: high > 0 ? ((last.v - high) / high) * 100 : null,
        corr60: pearson(aligned.slice(-60)),
        spark: hist.slice(-90).map((r) => r.v),
      };
    }),
  );
  // Highest-correlation markets first — "where the US is most correlated".
  return rows.sort((a, b) => (b.corr60 ?? -9) - (a.corr60 ?? -9));
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

/** 90-session sparkline sources per tripwire card. */
async function sparkFor(id: string): Promise<number[]> {
  const pick = async (sid: string) => (await series(sid, 90)).map((r) => r.v);
  switch (id) {
    case 'CREDIT_IMPULSE':
    case 'CREDIT_CRISIS': {
      const [baa, dgs] = await Promise.all([series('BAA', 10), series('DGS10', 90)]);
      if (baa.length === 0) return [];
      return dgs.map((d) => {
        const b = [...baa].reverse().find((x) => x.d <= d.d) ?? baa[baa.length - 1]!;
        return (b.v - d.v) * 100;
      });
    }
    case 'POLICY_SWITCH':
      return pick('CPIAUCSL');
    case 'RATE_SHOCK':
      return pick('DGS10');
    case 'SAHM_GATE':
      return pick('UNRATE');
    case 'FAILED_RECOVERY':
    case 'RV_ACCEL':
      return pick('SP500');
    case 'VIX_CONFIRM':
      return pick('VIXCLS');
    case 'CAPE_HIGH':
      return pick('CAPE');
    case 'CURVE_INVERTED':
      return pick('T10Y3M');
    default:
      return [];
  }
}

export async function loadDashboard(): Promise<DashboardData> {
  const client = db();

  const [{ data: stateRows }, { data: lastTripDate }, spx, { data: thresholds }, { data: changes }] =
    await Promise.all([
      client.from('cd_state_log').select('*').order('id', { ascending: false }).limit(1),
      client.from('cd_tripwire_log').select('as_of_date').order('id', { ascending: false }).limit(1),
      series('SP500', 2),
      client.from('cd_thresholds').select('key,value,unit,basis,frozen').order('key'),
      client
        .from('cd_threshold_changes')
        .select('*')
        .order('proposed_at', { ascending: false })
        .limit(20),
    ]);

  const latestState = stateRows?.[0] ?? null;
  const engineState = (latestState?.engine_state ?? null) as EngineState | null;
  const asOf = lastTripDate?.[0]?.as_of_date as string | undefined;

  // Latest tripwire board = rows from the most recent evaluation date.
  let tripwires: TripwireCard[] = [];
  if (asOf) {
    const { data: board } = await client
      .from('cd_tripwire_log')
      .select('tripwire,status,inputs,note,as_of_date')
      .eq('as_of_date', asOf)
      .order('id', { ascending: true });
    const seen = new Map<string, TripwireCard>();
    for (const row of board ?? []) {
      const inputs = (row.inputs ?? {}) as { reading?: string; threshold?: string; dataGap?: boolean };
      seen.set(row.tripwire, {
        id: row.tripwire,
        status: row.status,
        reading: inputs.reading ?? '—',
        threshold: inputs.threshold ?? '—',
        note: row.note,
        asOfDate: row.as_of_date,
        dataGap: inputs.dataGap ?? false,
        spark: [],
      });
    }
    tripwires = await Promise.all(
      [...seen.values()].map(async (card) => ({ ...card, spark: await sparkFor(card.id) })),
    );
  }

  const { data: history } = await client
    .from('cd_state_log')
    .select('tier,entered_at,entry_reason,drawdown_pct')
    .neq('entry_reason', 'daily snapshot')
    .order('id', { ascending: false })
    .limit(50);

  const { data: ledger } = await client
    .from('cd_fp_ledger')
    .select('triggered_on,window_ends,outcome,outcome_note,cd_tripwire_log(tripwire,status)')
    .order('triggered_on', { ascending: false })
    .limit(100);

  const { data: manuals } = await client
    .from('cd_manual_entries')
    .select('field,as_of_date,value_num,value_bool')
    .order('as_of_date', { ascending: false });
  const manualLatest = new Map<string, { field: string; as_of_date: string; value_num: number | null; value_bool: boolean | null }>();
  for (const m of manuals ?? []) if (!manualLatest.has(m.field)) manualLatest.set(m.field, m);

  const [ig, hy, cot, intlIndices] = await Promise.all([
    series('BAMLC0A0CM', 1),
    series('BAMLH0A0HYM2', 1),
    series('COT_ES_NET_SPEC_Z', 1),
    loadIntlContext(),
  ]);

  const spClose = spx.at(-1) ?? null;
  const drawdown =
    spClose && engineState ? ((spClose.v - engineState.cycleHigh) / engineState.cycleHigh) * 100 : null;

  return {
    state: latestState
      ? {
          tier: latestState.tier,
          enteredAt: engineState?.enteredAt ?? latestState.entered_at,
          drawdownPct: drawdown ?? latestState.drawdown_pct,
          cycleHigh: engineState?.cycleHigh ?? latestState.cycle_high,
          cycleHighDate: engineState?.cycleHighDate ?? latestState.cycle_high_date,
          spClose: spClose?.v ?? null,
          spDate: spClose?.d ?? null,
          daysInState: engineState
            ? Math.max(0, Math.round((Date.now() - new Date(engineState.enteredAt).getTime()) / 86_400_000))
            : 0,
          crossDate: engineState?.crossDate ?? null,
          routerDeadline30: engineState?.routerDeadline30Date ?? null,
          routerDeadline60: engineState?.routerDeadline60Date ?? null,
          routerStatus: engineState?.routerStatus ?? null,
        }
      : null,
    tripwires,
    tierHistory: (history ?? []).map((h) => ({
      tier: h.tier,
      enteredAt: h.entered_at,
      reason: h.entry_reason,
      drawdownPct: h.drawdown_pct,
    })),
    fpLedger: (ledger ?? []).map((l) => {
      const t = l.cd_tripwire_log as unknown as { tripwire: string; status: string } | null;
      return {
        tripwire: t?.tripwire ?? '—',
        status: t?.status ?? '—',
        triggeredOn: l.triggered_on,
        windowEnds: l.window_ends,
        outcome: l.outcome ?? 'PENDING',
        note: l.outcome_note,
      };
    }),
    thresholds: (thresholds ?? []).map((t) => ({
      key: t.key,
      value: t.value,
      unit: t.unit,
      basis: t.basis,
      frozen: t.frozen,
    })),
    pendingChanges: (changes ?? []).map((c) => ({
      id: c.id,
      key: c.key,
      oldValue: c.old_value,
      newValue: c.new_value,
      justification: c.justification,
      proposedBy: c.proposed_by,
      proposedAt: c.proposed_at,
      countersignedBy: c.countersigned_by,
      effectiveAt: c.effective_at,
      applied: c.applied,
    })),
    manualEntries: [...manualLatest.values()].map((m) => ({
      field: m.field,
      asOfDate: m.as_of_date,
      valueNum: m.value_num,
      valueBool: m.value_bool,
      stale: (Date.now() - new Date(m.as_of_date).getTime()) / 86_400_000 > 14,
    })),
    contextSeries: {
      igOas: ig.at(-1)?.v ?? null,
      hyOas: hy.at(-1)?.v ?? null,
      cotZ: cot.at(-1)?.v ?? null,
    },
    intlIndices,
  };
}
