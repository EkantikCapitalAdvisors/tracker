/** Correction Dashboard v2 — engine types. Spec v1.0 §2–§4. */

export type Tier = 0 | 1 | 2 | 3;

export type TripwireId =
  | 'CREDIT_IMPULSE'
  | 'CREDIT_CRISIS'
  | 'POLICY_SWITCH'
  | 'RATE_SHOCK'
  | 'SAHM_GATE'
  | 'FAILED_RECOVERY'
  | 'RV_ACCEL'
  | 'VIX_CONFIRM'
  | 'CAPE_HIGH'
  | 'CURVE_INVERTED';

/**
 * Uniform status vocabulary for the tripwire board.
 * Per-tripwire semantics:
 *  - POLICY_SWITCH reads CONSTRAINED (never TRIGGERED) — overlay, not a trigger.
 *  - SAHM_GATE reads ARMED or FIRED.
 *  - FAILED_RECOVERY reads ESCALATE when the router fires.
 *  - VIX_CONFIRM / CAPE_HIGH / CURVE_INVERTED are grade/flag only.
 */
export type TripwireStatus =
  | 'QUIET'
  | 'ARMED'
  | 'TRIGGERED'
  | 'CONSTRAINED'
  | 'FIRED'
  | 'ESCALATE';

/**
 * Three roles, never confused (Spec §1):
 * causal drivers may set state; activation indicators may escalate state;
 * symptomatic confirmers grade the tier and can NEVER fire a tripwire.
 */
export type TripwireRole =
  | 'DRIVER'
  | 'OVERLAY'
  | 'CONDITIONING'
  | 'ACTIVATION'
  | 'CONFIRMER'
  | 'VULNERABILITY';

export const TRIPWIRE_ROLES: Readonly<Record<TripwireId, TripwireRole>> = Object.freeze({
  CREDIT_IMPULSE: 'DRIVER',
  CREDIT_CRISIS: 'DRIVER',
  POLICY_SWITCH: 'OVERLAY',
  RATE_SHOCK: 'CONDITIONING',
  SAHM_GATE: 'DRIVER',
  FAILED_RECOVERY: 'ACTIVATION',
  RV_ACCEL: 'ACTIVATION',
  VIX_CONFIRM: 'CONFIRMER',
  CAPE_HIGH: 'VULNERABILITY',
  CURVE_INVERTED: 'VULNERABILITY',
});

export interface TripwireResult {
  id: TripwireId;
  role: TripwireRole;
  status: TripwireStatus;
  /** Latest reading, human-readable (e.g. "Δ3m +62bp"). */
  reading: string;
  /** Threshold description (e.g. "≥ +50bp"). */
  threshold: string;
  /** Extra context, e.g. "ARMED — confirmation incomplete". */
  note?: string;
  /** True when a required input was missing (DATA_GAP fail-open). */
  dataGap?: boolean;
}

/** Event-register catalyst taxonomy (2022 doctrine). */
export type CatalystTag = 'SPECULATIVE' | 'REALITY_BASED';

/**
 * One market day of derived readings. All values are CLOSING/official data
 * only — nothing in the engine may consume an intraday print or an estimate.
 * `null` means DATA_GAP: the pipeline failed open and the tripwire that
 * needs the value reports `dataGap` instead of blocking the evaluation.
 */
export interface EngineReadings {
  /** ISO date (YYYY-MM-DD) of the market close being evaluated. */
  asOfDate: string;
  /** S&P 500 official close. */
  spClose: number;
  /** Rolling 6-month closing high (maintained upstream). */
  cycleHigh: number;
  /** Date of the cycle high. */
  cycleHighDate: string;
  /** Baa − 10y Treasury spread, bp. Canonical credit trigger series. */
  baa10ySpreadBp: number | null;
  /** 3-month change in Baa−10y, bp. */
  baa10ySpreadDelta3mBp: number | null;
  /** Consecutive WEEKS of Baa−10y narrowing (for Tier-3 exit). */
  baa10yNarrowingWeeks: number | null;
  /** CPI YoY %, latest print (always provisional 1–2 months). */
  cpiYoYPct: number | null;
  /** 3-month change in the 10y yield, bp. */
  tenYearDelta3mBp: number | null;
  /** Real-time Sahm value (pp). */
  sahmValue: number | null;
  /** Initial claims 4-wk MA, YoY %. */
  claims4wkYoYPct: number | null;
  /** Earnings-revision breadth negative? Manual in v2; null = absent. */
  revisionBreadthNegative: boolean | null;
  /** VIX ≥ 30 sustained for 3 consecutive closes (computed upstream). */
  vixSustained3Closes: boolean | null;
  /** RV10/RV60 ratio (annualized stdev of log returns). */
  rv10rv60: number | null;
  /** Shiller CAPE in top trailing-30y tercile? */
  capeTopTercile: boolean | null;
  /** 10y − 3m slope, bp. */
  curve10y3mBp: number | null;
  /**
   * Confirmed higher low (Tier-3 exit input). Analyst-confirmed / computed
   * upstream; the engine only consumes the boolean.
   */
  confirmedHigherLow: boolean | null;
}

export type RouterStatus = 'INACTIVE' | 'OPEN' | 'ESCALATE' | 'CLEAN';

/**
 * Persisted machine state, carried between daily evaluations.
 * Trading-day windows are counted in evaluations (one per market day).
 */
export interface EngineState {
  tier: Tier;
  enteredAt: string;
  /** Cycle high anchored at Tier-1 entry (the regain reference). */
  cycleHigh: number;
  cycleHighDate: string;
  /** First close ≤ −5% below cycle high (router anchor). */
  crossDate: string | null;
  /** The close on the cross date — the router's "initial low". */
  crossClose: number | null;
  /** Trading days elapsed since the cross date (cross date = 0). */
  tradingDaysSinceCross: number;
  /** Lowest close since Tier-1 entry (decline trough so far). */
  troughClose: number | null;
  troughDate: string | null;
  /** True once price closed at/above the anchored cycle high post-cross. */
  peakRegained: boolean;
  /** True if peak was regained within the 30-td window. */
  peakRegainedIn30: boolean;
  /** True once any close after the cross is below crossClose. */
  lowerLowMade: boolean;
  routerStatus: RouterStatus;
  routerDeadline30Date: string | null;
  routerDeadline60Date: string | null;
}

export interface Transition {
  from: Tier;
  to: Tier;
  date: string;
  reason: string;
}

export interface RouterWindows {
  status: RouterStatus;
  crossDate: string | null;
  tradingDaysSinceCross: number | null;
  deadline30Date: string | null;
  deadline60Date: string | null;
  /**
   * Set on the evaluation where the router resolved (OPEN → CLEAN/ESCALATE),
   * even if a same-day tier exit reset the live router state afterwards.
   */
  resolution?: 'CLEAN' | 'ESCALATE';
}

export interface EngineSideEffects {
  /** Tier-1 entry: event-register entry required within 48h. */
  requireEventRegister: boolean;
  /** Tier ≥ 1: daily mini-sentinel cadence active. */
  escalateCadence: boolean;
  /** Tier-2 entry: depth engine + EPIG500 gear review mandatory. */
  gearReviewMandatory: boolean;
}

export interface EngineResult {
  tier: Tier;
  state: EngineState;
  drawdownPct: number;
  tripwires: TripwireResult[];
  transitions: Transition[];
  routerWindows: RouterWindows;
  sideEffects: EngineSideEffects;
  /** The specific close/print that changes state next (checkpoint line). */
  nextCheckpoint: string;
}

/** Depth engine (§4) — output is ALWAYS a range, never a point estimate. */
export interface DepthEngineInput {
  tier: Tier;
  catalystTag: CatalystTag | null;
  tripwires: TripwireResult[];
  readings: EngineReadings;
  state: EngineState;
  /** Current index P/E and nearest-analog P/E for valuation scaling. */
  currentPE: number | null;
  analogPE: number | null;
  analogDepthPct: number | null;
  /** Manual green-flag inputs the data cannot infer. */
  catalystReversalPlausible?: boolean;
}

export interface DepthRange {
  /** Depth range in percent decline from cycle high (positive numbers). */
  rangeLowPct: number;
  rangeHighPct: number;
  /** Close that would exit the current tier (invalidation). */
  invalidationClose: number;
  baseBand: 'SPECULATIVE' | 'FUNDAMENTAL' | 'CAPITULATION';
  cascadeScore: number;
  redFlags: string[];
  greenFlags: string[];
  policyOverlayApplied: boolean;
  valuationScale: number | null;
  notes: string[];
}
