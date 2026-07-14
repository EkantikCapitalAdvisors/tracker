/**
 * FROZEN THRESHOLDS — Correction Dashboard Spec v1.0 (Jul 14, 2026).
 *
 * Every value here was fixed by "The Anatomy of Correction Depth" 50-year
 * backtest (54 events, 1974–2026) BEFORE the first live reading. They are
 * seeded once into `cd_thresholds` (frozen=true; UPDATE rejected at the
 * Postgres level) and may change only through the governance protocol:
 * written justification -> 48-hour cool-off -> countersignature.
 *
 * No component may add discretionary logic, smoothing, or "improvements".
 */

export interface Thresholds {
  /** Baa−10y Δ3m that TRIGGERS the credit impulse (bp). */
  CREDIT_IMPULSE_DELTA3M_BP: number;
  /** Baa−10y level marking crisis regime (bp). */
  CREDIT_CRISIS_LEVEL_BP: number;
  /** CPI YoY above which policy is CONSTRAINED (%). */
  POLICY_CPI_YOY_PCT: number;
  /** 10y Δ3m rate-shock flag (bp). Flag only; conditioning variable. */
  RATE_SHOCK_DELTA3M_BP: number;
  /** Sahm value that ARMS the gate (pp). */
  SAHM_ARM_LEVEL: number;
  /** Claims 4-wk MA YoY confirmation for Sahm FIRED (%). */
  SAHM_CLAIMS_YOY_CONFIRM_PCT: number;
  /** Tier-1 entry drawdown (close basis, %; negative). */
  TIER1_ENTRY_DRAWDOWN_PCT: number;
  /** Tier-2 entry drawdown (%; negative). */
  TIER2_ENTRY_DRAWDOWN_PCT: number;
  /** Tier-3 entry drawdown (%; negative). */
  TIER3_ENTRY_DRAWDOWN_PCT: number;
  /** Failed-recovery router: regain window (trading days). */
  ROUTER_REGAIN_WINDOW_TD: number;
  /** Failed-recovery router: lower-low window (trading days). */
  ROUTER_LOWER_LOW_WINDOW_TD: number;
  /** RV10/RV60 ratio marking mechanical-class engagement. */
  RV_ACCEL_RATIO: number;
  /** VIX level for the (confirmer-only) sustained read. */
  VIX_CONFIRM_LEVEL: number;
  /** Consecutive closes required for the VIX confirmer. */
  VIX_CONFIRM_CLOSES: number;
  /** Tier-2 exit: retrace of the decline required (%). */
  TIER2_EXIT_RETRACE_PCT: number;
  /** Tier-3 exit: consecutive weeks of Baa−10y narrowing required. */
  TIER3_EXIT_CREDIT_NARROWING_WEEKS: number;
}

export const FROZEN_THRESHOLDS: Readonly<Thresholds> = Object.freeze({
  CREDIT_IMPULSE_DELTA3M_BP: 50,
  CREDIT_CRISIS_LEVEL_BP: 250,
  POLICY_CPI_YOY_PCT: 4.0,
  RATE_SHOCK_DELTA3M_BP: 80,
  SAHM_ARM_LEVEL: 0.5,
  SAHM_CLAIMS_YOY_CONFIRM_PCT: 15,
  TIER1_ENTRY_DRAWDOWN_PCT: -5.0,
  TIER2_ENTRY_DRAWDOWN_PCT: -10.0,
  TIER3_ENTRY_DRAWDOWN_PCT: -20.0,
  ROUTER_REGAIN_WINDOW_TD: 30,
  ROUTER_LOWER_LOW_WINDOW_TD: 60,
  RV_ACCEL_RATIO: 1.75,
  VIX_CONFIRM_LEVEL: 30,
  VIX_CONFIRM_CLOSES: 3,
  TIER2_EXIT_RETRACE_PCT: 50,
  TIER3_EXIT_CREDIT_NARROWING_WEEKS: 4,
});

/**
 * Basis strings recorded alongside each threshold in `cd_thresholds`
 * (falsifiability: every number carries its backtest justification).
 */
export const THRESHOLD_BASIS: Readonly<Record<keyof Thresholds, string>> = Object.freeze({
  CREDIT_IMPULSE_DELTA3M_BP: 'Depth ρ=+0.65 p<0.001; 92% episode association (11/12 since 1974)',
  CREDIT_CRISIS_LEVEL_BP: 'T3 dose-response; >250bp confirms capitulation regime',
  POLICY_CPI_YOY_PCT: 'Median depth 13.9% vs 9.4% above/below 4%; ρ=+0.30 p=0.03',
  RATE_SHOCK_DELTA3M_BP: '56% standalone hit rate (10/18) — conditioning only',
  SAHM_ARM_LEVEL: '56% of ≥15% events vs 24% of shallower; FP Aug-2024',
  SAHM_CLAIMS_YOY_CONFIRM_PCT: 'Confirmation requirement added after Aug-2024 false positive',
  TIER1_ENTRY_DRAWDOWN_PCT: 'Event definition: ≥5% close-basis decline from 6-month closing high',
  TIER2_ENTRY_DRAWDOWN_PCT: 'Tier taxonomy: fundamental repricing 10–20%',
  TIER3_ENTRY_DRAWDOWN_PCT: 'Tier taxonomy: buy-and-hold capitulation ≥20%',
  ROUTER_REGAIN_WINDOW_TD: 'Failed-recovery test, n=33 (1990–2022): P(≥10%)=58% vs 7%',
  ROUTER_LOWER_LOW_WINDOW_TD: 'Failed-recovery test, n=33 (1990–2022): P(≥10%)=58% vs 7%',
  RV_ACCEL_RATIO: 'Mechanical-class engagement; directionally validated, small n',
  VIX_CONFIRM_LEVEL: 'T1 19% · T2 77% · T3 100% — endogenous confirmer only',
  VIX_CONFIRM_CLOSES: 'Sustained-3-closes rule per Spec §2 L3',
  TIER2_EXIT_RETRACE_PCT: 'Spec §3 exit condition',
  TIER3_EXIT_CREDIT_NARROWING_WEEKS: 'Spec §3 exit condition',
});

/**
 * Guard used by runtime consumers that load thresholds from `cd_thresholds`:
 * any divergence from the frozen constants without a countersigned,
 * effective `cd_threshold_changes` row is a hard integrity failure.
 */
export function assertThresholdIntegrity(
  loaded: Partial<Record<keyof Thresholds, number>>,
  approvedOverrides: Partial<Record<keyof Thresholds, number>> = {},
): void {
  const keys = Object.keys(FROZEN_THRESHOLDS) as (keyof Thresholds)[];
  for (const key of keys) {
    const value = loaded[key];
    if (value === undefined) {
      throw new Error(`Threshold integrity failure: ${key} missing from loaded config`);
    }
    const expected = approvedOverrides[key] ?? FROZEN_THRESHOLDS[key];
    if (value !== expected) {
      throw new Error(
        `Threshold integrity failure: ${key}=${value} diverges from committed value ${expected} ` +
          'with no countersigned threshold change in effect',
      );
    }
  }
}
