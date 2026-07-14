/**
 * Sentinel formatting — three-message threaded structure per Spec §5 and
 * the v1 sentinel prompt §6. Pure functions; the jobs handle I/O.
 */

import {
  runDepthEngine,
  TRIPWIRE_ROLES,
  type CatalystTag,
  type DepthRange,
  type EngineReadings,
  type EngineResult,
} from '@ekantik/correction-engine';

const TIER_LABELS: Record<number, string> = {
  0: 'Baseline',
  1: 'Speculative unwind',
  2: 'Fundamental repricing',
  3: 'Capitulation',
};

export interface SentinelContext {
  result: EngineResult;
  readings: EngineReadings;
  priorTier: number | null;
  catalystTag: CatalystTag | null;
  deltas: string[];
  narrative: string | null;
  manualNA: string[]; // manual fields currently stale/absent
}

export function buildDepthRange(ctx: SentinelContext): DepthRange | null {
  if (ctx.result.tier < 2) return null;
  return runDepthEngine({
    tier: ctx.result.tier,
    catalystTag: ctx.catalystTag,
    tripwires: ctx.result.tripwires,
    readings: ctx.readings,
    state: ctx.result.state,
    currentPE: null,
    analogPE: null,
    analogDepthPct: null,
  });
}

export function formatSentinel(ctx: SentinelContext): string[] {
  const { result, readings } = ctx;
  const dd = result.drawdownPct;
  const active = result.tripwires.filter((t) =>
    ['TRIGGERED', 'CONSTRAINED', 'FIRED', 'ESCALATE'].includes(t.status),
  );
  const armed = result.tripwires.filter((t) => t.status === 'ARMED');

  const boardLine =
    active.length === 0 && armed.length === 0
      ? 'all quiet'
      : [
          ...active.map((t) => `${t.id} ${t.status}`),
          ...armed.map((t) => `${t.id} ARMED${t.note?.includes('incomplete') ? ' (confirmation incomplete)' : ''}`),
        ].join(' · ');

  const changed =
    ctx.priorTier === null
      ? 'INITIAL RUN — baseline established'
      : ctx.priorTier === result.tier
        ? 'unchanged'
        : `changed from TIER ${ctx.priorTier}`;

  const msg1 = [
    `:dart: CORRECTION SENTINEL — ${readings.asOfDate}`,
    `STATE: TIER ${result.tier} — ${TIER_LABELS[result.tier]}   (${changed})`,
    `S&P ${readings.spClose.toFixed(2)} | ${dd.toFixed(1)}% below cycle high (${result.state.cycleHigh.toFixed(2)}, ${result.state.cycleHighDate})`,
    `TRIPWIRE BOARD: ${boardLine}`,
    ctx.deltas.length > 0 ? `Δ vs last week: ${ctx.deltas.join(' · ')}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  // Message 2 — layer detail (L0–L3) + retirement-criteria log
  const line = (id: string) => {
    const t = result.tripwires.find((x) => x.id === id)!;
    return `• ${t.id} · ${t.reading} · vs ${t.threshold} · ${t.status}${t.note ? ` — ${t.note}` : ''}`;
  };
  const naLines = ctx.manualNA.map((f) => `• ${f} · N/A — manual pending / stale >14d`);
  const retirementLog = active.map(
    (t) => `• ${readings.asOfDate}: ${t.id} ${t.status} logged to FP ledger (9-month outcome window open)`,
  );
  const msg2 = [
    '*L0 Vulnerability*',
    line('CAPE_HIGH'),
    line('POLICY_SWITCH'),
    line('CURVE_INVERTED'),
    '*L1 Drivers*',
    line('CREDIT_IMPULSE'),
    line('CREDIT_CRISIS'),
    line('RATE_SHOCK'),
    line('SAHM_GATE'),
    '*L2 Activation*',
    line('FAILED_RECOVERY'),
    line('RV_ACCEL'),
    ...naLines,
    '*L3 Confirmation*',
    line('VIX_CONFIRM'),
    ...(retirementLog.length > 0 ? ['*Retirement-criteria log*', ...retirementLog] : []),
  ].join('\n');

  // Message 3 — action linkage
  const depth = buildDepthRange(ctx);
  const gateNote =
    result.tier >= 2
      ? 'EPIG500 gear review mandatory (Tier ≥2 entry condition met).'
      : armed.length > 0 || active.length > 0
        ? 'EPIG500 step-aside gates: armed-but-unfired — design-intent framing only; no live track record claims.'
        : 'EPIG500 step-aside gates: none armed.';
  const msg3 = [
    gateNote,
    'Portfolio heat: check vs 20% ceiling / 6% options cap.',
    depth
      ? `Depth range: ${depth.rangeLowPct.toFixed(1)}–${depth.rangeHighPct.toFixed(1)}% (${depth.baseBand} band, cascade ${depth.cascadeScore >= 0 ? '+' : ''}${depth.cascadeScore}${depth.policyOverlayApplied ? ', policy CONSTRAINED → upper half' : ''}) · invalidation close ${depth.invalidationClose.toFixed(2)}`
      : null,
    `Next checkpoint: ${result.nextCheckpoint}`,
    ctx.narrative,
    '_Pre-committed output per Dashboard Spec v1.0. Not investment advice._',
  ]
    .filter(Boolean)
    .join('\n');

  return [msg1, msg2, msg3];
}

/** Sanity guard used by tests: confirmers must never appear as state-setting. */
export function confirmerIds(): string[] {
  return Object.entries(TRIPWIRE_ROLES)
    .filter(([, role]) => role === 'CONFIRMER')
    .map(([id]) => id);
}
