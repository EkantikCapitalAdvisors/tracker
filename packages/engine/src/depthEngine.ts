/**
 * Depth-estimation engine — Spec v1.0 §4. Runs only in Tier ≥ 2.
 * Four sequential stages: seller-class base band → cascade scoring →
 * valuation adjustment → policy overlay. Output is ALWAYS a range with an
 * invalidation close — the return type has no point-estimate field.
 */

import { FROZEN_THRESHOLDS, type Thresholds } from './thresholds.js';
import type { DepthEngineInput, DepthRange } from './types.js';

const BANDS = {
  SPECULATIVE: { low: 1, high: 5 },
  FUNDAMENTAL: { low: 5, high: 15 },
  CAPITULATION: { low: 15, high: 50 },
} as const;

export function runDepthEngine(
  input: DepthEngineInput,
  thresholds: Thresholds = FROZEN_THRESHOLDS,
): DepthRange {
  if (input.tier < 2) {
    throw new Error('Depth engine runs only in Tier ≥ 2 (Spec §4)');
  }
  const t = thresholds;
  const notes: string[] = [];
  const status = (id: string) => input.tripwires.find((x) => x.id === id)?.status ?? 'QUIET';

  // ---- Stage 1: seller-class base band ------------------------------------
  let baseBand: DepthRange['baseBand'];
  if (input.tier === 3) {
    baseBand = 'CAPITULATION';
  } else if (input.catalystTag === 'SPECULATIVE') {
    baseBand = 'SPECULATIVE';
    notes.push('Tier 2 with SPECULATIVE tag — tag and tier disagree; band from tag per Spec §4.1');
  } else {
    baseBand = 'FUNDAMENTAL';
    if (input.catalystTag === null) {
      notes.push('Event register missing — FUNDAMENTAL band assumed (conservative for Tier 2); register entry required');
    }
  }
  let low: number = BANDS[baseBand].low;
  let high: number = BANDS[baseBand].high;

  // ---- Stage 2: cascade scoring (red vs green flags) -----------------------
  const redFlags: string[] = [];
  const greenFlags: string[] = [];
  if (status('CREDIT_IMPULSE') === 'TRIGGERED') redFlags.push('credit impulse TRIGGERED');
  else greenFlags.push('credit quiet');
  const sahm = status('SAHM_GATE');
  if (sahm === 'ARMED' || sahm === 'FIRED') redFlags.push(`Sahm ${sahm}`);
  if (input.readings.revisionBreadthNegative === true) redFlags.push('revision breadth negative');
  if (status('FAILED_RECOVERY') === 'ESCALATE') redFlags.push('failed-recovery ESCALATE');
  const constrained = status('POLICY_SWITCH') === 'CONSTRAINED';
  if (constrained) redFlags.push('policy CONSTRAINED');
  else greenFlags.push('policy FREE');
  if (input.readings.claims4wkYoYPct !== null && input.readings.claims4wkYoYPct <= 0) {
    greenFlags.push('claims stable');
  }
  if (input.state.peakRegained || (input.state.routerStatus === 'OPEN' && !input.state.lowerLowMade)) {
    greenFlags.push('peak-regain attempt underway');
  }
  if (input.catalystReversalPlausible === true) greenFlags.push('catalyst reversal plausible');

  const cascadeScore = redFlags.length - greenFlags.length;
  const mid = (low + high) / 2;
  if (cascadeScore >= 2) {
    low = mid;
    notes.push(`cascade net +${cascadeScore} red → upper half of band`);
  } else if (cascadeScore <= -2) {
    high = mid;
    notes.push(`cascade net ${cascadeScore} → lower half of band`);
  }

  // ---- Stage 3: valuation adjustment ---------------------------------------
  let valuationScale: number | null = null;
  if (input.currentPE !== null && input.analogPE !== null && input.analogPE > 0) {
    // Scale clamped to [0.5, 2.0]: the analog ratio conditions the band, it
    // does not replace it.
    valuationScale = Math.min(2, Math.max(0.5, input.currentPE / input.analogPE));
    low = low * valuationScale;
    high = high * valuationScale;
    if (input.analogDepthPct !== null) {
      notes.push(
        `valuation-scaled analog depth: ${(input.analogDepthPct * valuationScale).toFixed(1)}% ` +
          `(analog ${input.analogDepthPct.toFixed(1)}% × P/E ratio ${valuationScale.toFixed(2)})`,
      );
    }
  } else {
    notes.push('valuation scaling skipped — P/E inputs unavailable (DATA GAP)');
  }

  // ---- Stage 4: policy overlay ---------------------------------------------
  if (constrained) {
    const m = (low + high) / 2;
    low = m;
    notes.push('policy CONSTRAINED — published range forced to upper half (Spec §4 stage 4)');
  }

  // Depth ranges are % declines from cycle high; keep sane and ordered.
  low = Math.max(BANDS.SPECULATIVE.low, Math.round(low * 10) / 10);
  high = Math.max(low + 1, Math.round(high * 10) / 10);

  // Invalidation = the close that exits the current tier.
  const invalidationClose =
    input.tier === 2 && input.state.troughClose !== null
      ? input.state.troughClose +
        (input.state.cycleHigh - input.state.troughClose) * (t.TIER2_EXIT_RETRACE_PCT / 100)
      : input.state.cycleHigh * (1 + t.TIER3_ENTRY_DRAWDOWN_PCT / 100);
  if (input.tier === 3) {
    notes.push(
      'Tier-3 exit is condition-based (higher low + credit narrowing); invalidation close shown is the −20% tier boundary',
    );
  }

  return {
    rangeLowPct: low,
    rangeHighPct: high,
    invalidationClose: Math.round(invalidationClose * 100) / 100,
    baseBand,
    cascadeScore,
    redFlags,
    greenFlags,
    policyOverlayApplied: constrained,
    valuationScale,
    notes,
  };
}
