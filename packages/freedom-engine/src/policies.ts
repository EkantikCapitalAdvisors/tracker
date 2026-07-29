/**
 * Versioned policy defaults (spec §5.2, §9.1, Appendix A).
 *
 * Dollar floors and percentage heuristics are DEFAULTS, not universal truths
 * (§5.2 threshold rules). They ship as versioned data so released behavior is
 * governed by policy versions, never hard-coded product truths. Changing any
 * value requires a new version, a rationale, and a golden-test update in the
 * same PR (§15.6).
 */

export interface ThresholdPolicy {
  version: string;
  /** Starter accessible buffer for the Stabilize exit gate (dollars). */
  starterBufferAmount: number;
  /** Default emergency-target guide, months of essentials (§5.2 Secure). */
  defaultEmergencyTargetMonths: number;
  /** Emergency months below this is a severity-1 tripwire (§9.2). */
  emergencyCriticalMonths: number;
  /** APR above this is "high-cost" (fraction) — F4 / HIGH_APR_NEW. */
  highAprThreshold: number;
  /** Top-stream income share watch threshold (fraction) — F6 / CONCENTRATION. */
  incomeConcentrationLimit: number;
  /** Single-holding concentration watch threshold (fraction) — M10. */
  holdingConcentrationLimit: number;
  /** Pace/funded bands (§9.1). */
  bands: { ahead: number; onPace: number; watch: number };
  /** Automation routed total below this share of m* flags AUTOMATION_GAP. */
  automationGapShare: number;
  /** Blended-return vs plan-return mismatch flag threshold (fraction). */
  returnMismatchThreshold: number;
  /** Years before retireDate that RED_ZONE begins (§5.1). */
  redZoneYears: number;
  /** Projection horizon cap, years (§M3). */
  horizonYears: number;
  /** Comparator dead band on break-even distance, fraction (±100 bp). */
  comparatorDeadBand: number;
  /** Projected date slip that flags PACE_SLIP, months (§M3). */
  paceSlipMonths: number;
  /** Goal underfunded watch threshold (share of schedule) (§M12). */
  goalUnderfundedShare: number;
  /** Buffer-years low threshold (§9.2 BUFFER_LOW). */
  bufferLowYears: number;
  /** Savings-rate phase target used by F2 as a default guide (fraction). */
  defaultSavingsRateTarget: number;
  /** Essentials-ratio context benchmark (fraction) — context, never a fail. */
  essentialsRatioBenchmark: number;
}

export const THRESHOLD_POLICY_V1: ThresholdPolicy = {
  version: "threshold-v1.0",
  starterBufferAmount: 1000,
  defaultEmergencyTargetMonths: 3,
  emergencyCriticalMonths: 1,
  highAprThreshold: 0.1,
  incomeConcentrationLimit: 0.6,
  holdingConcentrationLimit: 0.25,
  bands: { ahead: 1.05, onPace: 0.95, watch: 0.85 },
  automationGapShare: 0.8,
  returnMismatchThreshold: 0.01,
  redZoneYears: 5,
  horizonYears: 60,
  comparatorDeadBand: 0.01,
  paceSlipMonths: 3,
  goalUnderfundedShare: 0.1,
  bufferLowYears: 1,
  defaultSavingsRateTarget: 0.2,
  essentialsRatioBenchmark: 0.5,
};

export interface ScorePolicy {
  version: string;
  /**
   * Appendix A "ScorePolicy v1 DEFAULT". Note for the §15.7 model-risk
   * review: §M15 lists an alternative candidate weighting
   * (pace 30 · resilience 25 · cash-flow 20 · debt 15 · follow-through 10);
   * Appendix A's block is the one labeled "v1 DEFAULT" and is used here.
   * Resolution of the discrepancy is a ScorePolicy version decision, not a
   * code change.
   */
  weights: {
    paceOrFunding: number;
    progress: number;
    cashFlowMargin: number;
    foundation: number;
    followThrough: number;
  };
  /** Display-band cap per open severity-1 tripwire: max(floor, 1 − perTripwire·n). */
  capFloor: number;
  capPerTripwire: number;
  /** Minimum computable weight share required to show any overall score. */
  completenessThreshold: number;
}

export const SCORE_POLICY_V1: ScorePolicy = {
  version: "score-v1.0",
  weights: {
    paceOrFunding: 0.3,
    progress: 0.25,
    cashFlowMargin: 0.15,
    foundation: 0.15,
    followThrough: 0.15,
  },
  capFloor: 0.6,
  capPerTripwire: 0.08,
  completenessThreshold: 0.4,
};

export interface SpendingPolicy {
  version: string;
  /** Guardrail corridor half-width around w0 (fraction of w0) — §7.1 default 0.20. */
  guardrailBandPct: number;
  /** Modeled spending adjustment presented for acknowledgment (§M21). */
  modeledAdjustmentPct: number;
  /** Default buffer-years target. */
  defaultBufferYearsTarget: number;
}

/**
 * Candidate policy inherited from the prototype (§M21): NOT universal and not
 * production-normative — independent retirement-model review is required
 * before V1 releases any consumer surface built on it.
 */
export const SPENDING_POLICY_V1: SpendingPolicy = {
  version: "spending-v1.0-candidate",
  guardrailBandPct: 0.2,
  modeledAdjustmentPct: 0.1,
  defaultBufferYearsTarget: 2,
};

export interface FlagPolicy {
  version: string;
  /** Consecutive periods required for trend-based drift flags (§9.2). */
  driftConsecutivePeriods: number;
  /** Review overdue threshold, days → months here (§9.2). */
  reviewOverdueDays: number;
  attestationStaleDays: number;
  dataStaleDays: number;
}

export const FLAG_POLICY_V1: FlagPolicy = {
  version: "flag-v1.0",
  driftConsecutivePeriods: 2,
  reviewOverdueDays: 14,
  attestationStaleDays: 90,
  dataStaleDays: 45,
};

export interface EnginePolicies {
  threshold: ThresholdPolicy;
  score: ScorePolicy;
  spending: SpendingPolicy;
  flag: FlagPolicy;
}

export const DEFAULT_POLICIES: EnginePolicies = {
  threshold: THRESHOLD_POLICY_V1,
  score: SCORE_POLICY_V1,
  spending: SPENDING_POLICY_V1,
  flag: FLAG_POLICY_V1,
};
