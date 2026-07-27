/**
 * AI Bubble Module — normative scoring (§3.5) and cascade contribution (§4.3).
 * Pure functions. The score is NEVER hand-entered: the validator recomputes it
 * from tripwires[] and fails on any mismatch beyond 1e-9.
 */

import {
  STATUS_SCORE,
  type BandDef,
  type CascadeContribution,
  type RunTripwire,
  type ThresholdFile,
  type TierDef,
  type TripwireStatus,
} from './types';

export const EPSILON = 1e-9;

export function statusScore(status: TripwireStatus): number {
  if (status === 'RETIRED') return 0;
  return STATUS_SCORE[status];
}

/**
 * §3.5 — tier_load = Σ status_score / count(status ≠ RETIRED).
 * UNSCOREABLE stays in the denominator and scores 0, deliberately: excluding
 * it would inflate the index whenever data goes missing (the score would rise
 * because we stopped looking).
 */
export function tierLoad(tripwires: RunTripwire[], defs: Map<string, number>, tierId: number): number {
  const inTier = tripwires.filter((t) => defs.get(t.id) === tierId && t.status !== 'RETIRED');
  if (inTier.length === 0) return 0;
  const sum = inTier.reduce((acc, t) => acc + statusScore(t.status), 0);
  return sum / inTier.length;
}

export interface ScoreResult {
  scoreRaw: number;
  scoreDisplay: string;
  tiers: { id: number; load: number; contribution: number }[];
  coverage: { scored: number; total: number; unscoreableIds: string[] };
}

/** Round half-up to 2 dp (§3.5) — note JS toFixed rounds half-to-even in edge cases. */
export function roundHalfUp2(value: number): string {
  const scaled = value * 100;
  const rounded = Math.floor(scaled + 0.5);
  return (rounded / 100).toFixed(2);
}

export function computeScore(thresholds: ThresholdFile, tripwires: RunTripwire[]): ScoreResult {
  const tierOf = new Map(thresholds.tripwires.map((t) => [t.id, t.tier]));
  const tiers = thresholds.tiers.map((tier: TierDef) => {
    const load = tierLoad(tripwires, tierOf, tier.id);
    return { id: tier.id, load, contribution: tier.weight * load };
  });
  const scoreRaw = tiers.reduce((acc, t) => acc + t.contribution, 0);
  const live = tripwires.filter((t) => t.status !== 'RETIRED');
  const unscoreableIds = live.filter((t) => t.status === 'UNSCOREABLE').map((t) => t.id);
  return {
    scoreRaw,
    scoreDisplay: roundHalfUp2(scoreRaw),
    tiers,
    coverage: {
      scored: live.length - unscoreableIds.length,
      total: live.length,
      unscoreableIds,
    },
  };
}

/** Band lookup: contiguous, non-overlapping; upper bound inclusive only at 1.0. */
export function bandFor(bands: BandDef[], scoreRaw: number): BandDef | null {
  for (const b of bands) {
    if (scoreRaw >= b.min && (scoreRaw < b.max || (b.max >= 1 && scoreRaw <= b.max))) return b;
  }
  return null;
}

/** §4.3 — proposed_factor_score(T) = clamp(1 + round(4 × tier_load), 1, 5). */
export function proposedFactorScore(load: number): number {
  const raw = 1 + Math.round(4 * load);
  return Math.min(5, Math.max(1, raw));
}

/** §4.2 factor → tier mapping. Only these four are Index-owned. */
export const FACTOR_TIERS = {
  spec_to_fundamental: {
    earnings_estimate_momentum: 3,
    valuation_vulnerability: 0,
    credit_condition_deterioration: 2,
  },
  fundamental_to_buy_and_hold: {
    systemic_risk_perception: 4,
  },
} as const;

export const FACTOR_LABELS: Record<string, string> = {
  earnings_estimate_momentum: 'Earnings Estimate Momentum',
  valuation_vulnerability: 'Valuation Vulnerability',
  credit_condition_deterioration: 'Credit Condition Deterioration',
  systemic_risk_perception: 'Systemic Risk Perception',
};

export function computeCascadeContribution(
  tiers: { id: number; load: number }[],
  override: CascadeContribution['override'] = null,
): CascadeContribution {
  const loadOf = (tierId: number) => tiers.find((t) => t.id === tierId)?.load ?? 0;
  const build = (map: Record<string, number>) =>
    Object.fromEntries(
      Object.entries(map).map(([factor, tier]) => {
        const load = loadOf(tier);
        return [factor, { proposed: proposedFactorScore(load), tier, load }];
      }),
    );
  return {
    spec_to_fundamental: build({ ...FACTOR_TIERS.spec_to_fundamental }),
    fundamental_to_buy_and_hold: build({ ...FACTOR_TIERS.fundamental_to_buy_and_hold }),
    override,
  };
}

/** §6 — briefing fires only on a qualifying change; quiet weeks stay silent. */
export function briefingShouldFire(run: {
  status_changes: { direction: Direction; to: TripwireStatus }[];
  index: { band_changed: boolean; delta?: number | null };
  reconciliation_flags: { severity: string; opened_on: string; status: string }[];
  narrative: { quiet_week: boolean };
  run_date: string;
  amendment_published?: boolean;
}): boolean {
  if (run.status_changes.some((c) => c.direction === 'up')) return true;
  if (run.status_changes.some((c) => c.to === 'FIRED')) return true;
  if (run.index.band_changed) return true;
  if (typeof run.index.delta === 'number' && Math.abs(run.index.delta) >= 0.05) return true;
  if (run.reconciliation_flags.some((f) => f.severity === 'high' && f.opened_on === run.run_date && f.status === 'open'))
    return true;
  if (run.amendment_published) return true;
  return false;
}

type Direction = 'up' | 'down' | 'none';

/** §8 — strip internal-visibility content at build time, never hide with CSS. */
export function stripInternal<T extends { visibility?: string }>(items: T[] | undefined): T[] {
  return (items ?? []).filter((i) => i.visibility !== 'internal');
}
