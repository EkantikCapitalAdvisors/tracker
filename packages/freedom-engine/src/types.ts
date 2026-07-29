/**
 * @freedom/engine — shared types.
 *
 * Authority: Freedom Command SaaS Specification v2.1
 * (docs/freedom-command/Freedom_Command_SaaS_Specification.md).
 *
 * Conventions (spec §0): all rates are FRACTIONS (0.065 = 6.5%), never
 * percentages; monthly rate = annual / 12. The primary plan is denominated in
 * today's dollars using net real return (§5.1 unit convention). The engine is
 * pure and deterministic: no I/O, no clock — "now" arrives in the input.
 */

// ---------------------------------------------------------------------------
// Verdict vocabulary (§P2, §5.6, §12.3)
// ---------------------------------------------------------------------------

/** Condition states for rules and gates. Unanswered ≠ failing (§P6). */
export type ConditionState =
  | "CLEAR"
  | "WATCH"
  | "BLOCKED"
  | "NOT_YET"
  | "N_A"
  | "INFO";

/** Gate-panel rollup (§5.6). */
export type GateRollup = "CLEAR" | "WATCH" | "BLOCKED" | "INSUFFICIENT_DATA";

/** Pace / funded bands (§9.1) — same four bands in both plan modes. */
export type PaceBand = "AHEAD" | "ON_PACE" | "WATCH" | "OFF_PACE" | "NOT_YET";

/** Plan mode regime (§5.1, §M2). */
export type PlanMode = "ACCUMULATION" | "RED_ZONE" | "DISTRIBUTION";

/** Canonical phases (§5.2). Only these appear in new code. */
export type Phase =
  | "STABILIZE"
  | "SECURE"
  | "ACCUMULATE"
  | "DISTRIBUTE"
  | "LEGACY";

/** Feasibility verdict (§M1). "Achievable" is deliberately not a state. */
export type FeasibilityVerdict =
  | "FEASIBLE_IN_BASE_CASE"
  | "REQUIRES_CHANGE"
  | "INSUFFICIENT_DATA";

/** Prepay-vs-invest comparator verdicts (§M5). */
export type ComparatorVerdict =
  | "PREPAY_FAVORED"
  | "INVESTING_FAVORED_IN_BASE_CASE"
  | "CLOSE_CALL"
  | "SAFETY_GATE_BLOCKED"
  | "INSUFFICIENT_DATA";

/** Guardrail state (§M21): the app models an adjustment; it never executes. */
export type GuardrailState =
  | "BASE_SPENDING"
  | "CUT_MODELED"
  | "RAISE_MODELED"
  | "NOT_YET";

/** Data confidence (§5.1) — never a probability of success. */
export type DataConfidence = "HIGH" | "MEDIUM" | "LOW";

/** Alert severity (§9.2): 1 tripwire · 2 drift · 3 process. */
export type FlagSeverity = 1 | 2 | 3;

export interface Range {
  low: number;
  high: number;
}

// ---------------------------------------------------------------------------
// Input entities (engine-consumed subset of the §7.1 data model)
// ---------------------------------------------------------------------------

export type AccountPurpose =
  | "emergency"
  | "storage"
  | "compounding"
  | "speculative"
  | "retirement";

export interface Account {
  name: string;
  purpose: AccountPurpose;
  balance: number;
  /** Annual yield as a fraction. */
  yield?: number;
  taxAdvantaged?: boolean;
  /** Tagged as part of the down-market spending buffer (§M21). */
  bufferTagged?: boolean;
  /** Earmarked by the household for legacy (§M24). */
  earmarkedForLegacy?: boolean;
  beneficiaryPrimary?: string;
  /** Whether a beneficiary designation applies to this account type. */
  beneficiaryApplicable?: boolean;
  beneficiaryReviewedAtMonthsAgo?: number;
}

export interface Debt {
  name: string;
  balance: number;
  /** Contractual APR as a fraction. */
  apr: number;
  minPayment: number;
  extraPayment?: number;
  /** Optional "amortize to a deadline" in years (§M5). */
  amortizeYears?: number;
  /**
   * User-confirmed tax treatment scenario. The product never infers
   * deductibility from a debt name (§M5, Appendix D).
   */
  userConfirmedDeductible?: boolean;
  /** Self-reported missed minimum payment currently unresolved. */
  missedMinimumUnresolved?: boolean;
  /** Whether an active payoff plan exists (extra payment, deadline, or attested). */
  payoffPlanAttested?: boolean;
}

export type IncomeStreamType = "salary" | "business" | "side" | "passive";

export interface IncomeStream {
  name: string;
  type: IncomeStreamType;
  annualIncome: number;
  growthRate?: number;
  capitalBase?: number;
  yield?: number;
}

export interface Goal {
  name: string;
  target: number;
  targetYear: number; // years from now (fractional allowed)
  fundedSoFar?: number;
  expectedCagr?: number;
}

export interface Holding {
  name: string;
  class: string;
  value: number;
  expectedReturn?: number;
}

export interface CashFlowProfile {
  netIncomeMonthly?: number;
  essentialsMonthly?: number;
  discretionaryMonthly?: number;
  /** Verified/planned long-term monthly contribution (savings lines). */
  plannedMonthlySavings?: number;
  taxRateEstimate?: number;
}

export type Attested = "yes" | "no" | "not_applicable" | "unanswered";

export interface ResilienceProfile {
  dependents?: number;
  incomeDependent?: boolean;
  insuranceLifeReviewed?: Attested;
  insuranceDisabilityReviewed?: Attested;
  insuranceUmbrellaReviewed?: Attested;
  insuranceHealthReviewed?: Attested;
  /** Target emergency reserve in months of essentials (household choice). */
  emergencyTargetMonths?: number;
  /** Written down-market draw order exists and is attested (§M14/M21). */
  drawOrderWritten?: Attested;
  /** Declared speculative-surplus cap in dollars (W5). */
  speculativeCap?: number;
}

export interface AutomationRule {
  trigger: "payday" | "monthly" | "date";
  amountMonthly: number;
  attested: boolean;
  attestedMonthsAgo?: number;
}

export interface SpendingPlanInput {
  /** Annual retirement spending target, today's dollars. */
  retirementSpendAnnual?: number;
  /** Reliable non-portfolio income in retirement, annual (GI). */
  reliableIncomeAnnual?: number;
  /** Initial withdrawal rate at retirement (w0), fraction. */
  w0?: number;
  bufferYearsTarget?: number;
  drawOrder?: string[];
}

export interface SocialSecurityProfile {
  /** PIA from the user's own SSA statement — never estimated (§M22). */
  piaMonthly?: number;
  fullRetirementAge?: number; // default 67 (born 1960+)
  plannedClaimAge?: number;
}

export type EstateDocType =
  | "will"
  | "beneficiaries"
  | "poa"
  | "directive"
  | "guardianship"
  | "trust"
  | "letter"
  | "locations";

export type EstateDocStatus = "complete" | "in_progress" | "missing" | "not_applicable";

export interface EstateDoc {
  type: EstateDocType;
  status: EstateDocStatus;
  updatedMonthsAgo?: number;
}

export interface LegacyInput {
  /** Household legacy target in dollars; 0/undefined = no target set. */
  legacyTarget?: number;
  /** Explicit, logged waiver of a legacy target — a valid choice (§M24). */
  legacyWaived?: boolean;
  /**
   * Eligible net death benefit at the selected horizon, from a dated
   * carrier/in-force source (§M24). Undefined/stale ⇒ NOT_YET, never assumed.
   */
  eligibleNetDeathBenefitAtHorizon?: number;
  deathBenefitSourceStale?: boolean;
  /** Prior requiredEarmark (for earmark-impact deltas across scenario runs). */
  priorRequiredEarmark?: number;
}

// ---------------------------------------------------------------------------
// The plan (§M2)
// ---------------------------------------------------------------------------

export interface FreedomPlanInput {
  /** Desired annual after-tax freedom spending, today's dollars (range). */
  freedomSpendingNeed?: Range;
  /** Reliable annual non-portfolio income under the selected scenario. */
  reliableNonPortfolioIncome?: number;
  /** Planning withdrawal rate (fraction) — educational shorthand (§5.1). */
  planningWithdrawalRate?: number;
  nominalGrossReturn?: number;
  inflation?: number;
  feeDrag?: number;
  taxDrag?: number;
  /** Months from now to the chosen freedom date (range). */
  freedomDateMonths?: Range;
  /** Months from now to the retirement date; defaults to freedom date. */
  retireDateMonths?: number;
  planHorizonYears?: number;
  /**
   * Frozen glide-path baseline from the current plan version (§9.1): capital
   * at plan creation and months elapsed since. Absent ⇒ plan starts now.
   */
  baseline?: { capitalAtPlanStart: number; monthsSincePlanStart: number };
  /**
   * Frozen distribution baseline set on entering RED_ZONE (§9.1): PV basis
   * for the funded-ratio band handoff.
   */
  distributionBaseline?: { frozenAtMonthsAgo: number };
}

// ---------------------------------------------------------------------------
// Engine input — one household, one consistent snapshot
// ---------------------------------------------------------------------------

export interface EngineInput {
  plan?: FreedomPlanInput;
  accounts?: Account[];
  debts?: Debt[];
  incomeStreams?: IncomeStream[];
  goals?: Goal[];
  holdings?: Holding[];
  cashFlow?: CashFlowProfile;
  resilience?: ResilienceProfile;
  automationRules?: AutomationRule[];
  spendingPlan?: SpendingPlanInput;
  socialSecurity?: SocialSecurityProfile;
  estateDocs?: EstateDoc[];
  legacy?: LegacyInput;
  /** Weekly check-in / commitment follow-through, 0..1, when known. */
  followThroughRate?: number;
  /** Months since the household last confirmed balances (data freshness). */
  dataAgeMonths?: number;
}

// ---------------------------------------------------------------------------
// Result fragments
// ---------------------------------------------------------------------------

export interface Gate {
  id: string;
  label: string;
  state: ConditionState;
  /** True when the gate is the household's own target rather than a system safety safeguard (§5.6). */
  userTarget?: boolean;
  value?: number | string | null;
  threshold?: number | string | null;
  fix?: string;
}

export interface GatePanelResult {
  gates: Gate[];
  rollup: GateRollup;
  bindingConstraint: Gate | null;
}

export interface RuleResult {
  id: string;
  group: "foundation" | "wealth";
  label: string;
  state: ConditionState;
  value?: number | null;
  threshold?: number | null;
  detail?: string;
  fixModule?: string;
}

export interface RulesScorecard {
  rules: RuleResult[];
  applicable: number;
  onTrack: number;
  foundationApplicable: number;
  foundationOnTrack: number;
  wealthApplicable: number;
  wealthOnTrack: number;
}

export interface Flag {
  code: string;
  severity: FlagSeverity;
  module: string;
  message: string;
  metric?: string;
  value?: number | null;
  threshold?: number | null;
  fixModule?: string;
}

export interface DebtResult {
  name: string;
  balance: number;
  apr: number;
  totalMonthlyPayment: number;
  payoffMonths: number | null;
  totalInterest: number | null;
  monthlyInterest: number;
  requiredDeadlinePayment?: number;
}

export interface DebtStrategyOutcome {
  strategy: "avalanche" | "snowball" | "minimums";
  debtFreeMonths: number | null;
  totalInterest: number | null;
}

export interface ScoreComponent {
  id: "paceOrFunding" | "progress" | "cashFlowMargin" | "foundation" | "followThrough";
  weight: number;
  /** 0–100 or null when not computable (missing ≠ zero, §M15). */
  value: number | null;
}

export interface ScoreResult {
  /** Stored base score 0–100, or null below the completeness threshold. */
  base: number | null;
  /** Displayed score after the severity-1 display-band cap (Appendix A). */
  displayed: number | null;
  components: ScoreComponent[];
  /** Share of weight that was computable, 0..1. */
  completeness: number;
  confidence: DataConfidence;
  capApplied: boolean;
  policyVersion: string;
}

export interface PhaseResult {
  phase: Phase;
  gates: Gate[];
  /** Gates for exiting the current phase (the work in front of the user). */
  exitGates: Gate[];
}

export interface ResilienceAction {
  rank: number;
  code: string;
  label: string;
  severity: FlagSeverity;
  module: string;
}

export interface EngineResult {
  engineVersion: string;
  policyVersions: {
    threshold: string;
    score: string;
    flag: string;
    spending: string;
  };
  mode: PlanMode;
  phase: PhaseResult;
  plan: {
    freedomNumber: Range | null;
    netRealReturn: number | null;
    /** Required monthly pace m* for the low/high freedom number. */
    requiredPace: Range | null;
    /** Displayed pace = max(0, m*) (Appendix A). */
    displayedPace: Range | null;
    coverageRatio: number | null;
    freedomProgress: number | null;
    feasibility: FeasibilityVerdict;
    feasibilityPanel: GatePanelResult;
  };
  trajectory: {
    /** First month index (from now) where capital reaches the freedom number. */
    projectedFreedomMonths: Range | null;
    /** projected − chosen date, months (positive = late), base freedom number. */
    projectedDateDeltaMonths: number | null;
    paceRatio: number | null;
    band: PaceBand;
    glideNow: number | null;
    /** Capital curve sampled yearly (month 0, 12, 24 …), base case. */
    capitalByYear: number[];
  };
  debts: {
    perDebt: DebtResult[];
    interestLeakMonthly: number;
    weightedApr: number | null;
    strategies: DebtStrategyOutcome[];
  };
  cashFlow: {
    essentialsRatio: number | null;
    savingsRate: number | null;
    surplusMonthly: number | null;
  };
  allocation: {
    emergencyMonths: number | null;
    runwayYears: number | null;
    idleCashAboveFloor: number | null;
  };
  automation: {
    routedMonthly: number;
    paceFundedShare: number | null;
  };
  income: {
    totalAnnual: number;
    concentration: number | null;
    passiveAnnual: number;
    passiveCoverageOfNeed: number | null;
  };
  portfolio: {
    blendedExpectedReturn: number | null;
    returnVsPlanMismatch: number | null;
    doublingsNeeded: number | null;
    doublingYears: number | null;
    largestHoldingShare: number | null;
  };
  modelB: {
    investedMonthlyNow: number;
    /** Yearly invested amounts showing the obligation drop-off (§M11). */
    investedByYear: number[];
    obligationsMonthlyNow: number;
  };
  resilience: {
    emergencyMonths: number | null;
    insurance: Record<"life" | "disability" | "umbrella" | "health", ConditionState>;
    concentration: number | null;
    tripwires: Flag[];
    actions: ResilienceAction[];
  };
  rules: RulesScorecard;
  score: ScoreResult;
  distribution: {
    applicable: boolean;
    w0: number | null;
    currentWithdrawalRate: number | null;
    guardrail: GuardrailState;
    bufferYears: number | null;
    fundedRatio: number | null;
    fundedBand: PaceBand;
    yearsFunded: number | null;
  };
  estate: {
    readinessScore: number | null;
    componentStates: Partial<Record<EstateDocType, ConditionState>>;
    beneficiaryFlags: Flag[];
    bindingGap: string | null;
  };
  legacy: {
    state: "FUNDED" | "PARTIAL" | "UNFUNDED" | "WAIVED" | "NOT_YET";
    fundingRatio: number | null;
    legacyGapAfterInsurance: number | null;
    requiredEarmark: number | null;
    newlyUnearmarked: number | null;
  };
  flags: Flag[];
  /** The single binding constraint across the whole system (§P4). */
  bindingConstraint: Flag | null;
  dataConfidence: DataConfidence;
}
