/**
 * Resilience & Action engine — gRES (§M14, normative).
 *
 * Tripwires fire ONLY on entered-then-failing data, never on unanswered
 * questions (§P6, §9.3): "no life insurance with dependents" requires the
 * user to have SAID no; an unanswered review renders WATCH/NOT_YET.
 */

import type { ThresholdPolicy } from "./policies.js";
import type { HouseholdMetrics } from "./metrics.js";
import type {
  Attested,
  ConditionState,
  EngineInput,
  Flag,
  PlanMode,
  ResilienceAction,
} from "./types.js";

export interface ResilienceEvaluation {
  emergencyMonths: number | null;
  insurance: Record<"life" | "disability" | "umbrella" | "health", ConditionState>;
  concentration: number | null;
  tripwires: Flag[];
  actions: ResilienceAction[];
}

function insuranceState(attested: Attested | undefined, applicable: boolean): ConditionState {
  if (!applicable) return "N_A";
  switch (attested) {
    case "yes":
      return "CLEAR";
    case "no":
      return "WATCH"; // the tripwire below escalates the applicable cases
    case "not_applicable":
      return "N_A";
    default:
      return "NOT_YET";
  }
}

export function evaluateResilience(
  input: EngineInput,
  m: HouseholdMetrics,
  policy: ThresholdPolicy,
  mode: PlanMode,
  failingRules: Array<{ id: string; label: string; fixModule?: string }>,
): ResilienceEvaluation {
  const r = input.resilience;
  const tripwires: Flag[] = [];

  // EMERGENCY_CRITICAL: reserves entered AND essentials entered AND < 1 month.
  if (m.emergencyMonths !== null && (input.accounts?.length ?? 0) > 0) {
    if (m.emergencyMonths < policy.emergencyCriticalMonths) {
      tripwires.push({
        code: "EMERGENCY_CRITICAL",
        severity: 1,
        module: "M14",
        message: "Accessible reserve below one month of essentials",
        metric: "emergencyMonths",
        value: m.emergencyMonths,
        threshold: policy.emergencyCriticalMonths,
        fixModule: "M6",
      });
    }
  }

  // NO_LIFE_INSURANCE / NO_DISABILITY: only when the user answered "no" (§P6).
  const dependents = (r?.dependents ?? 0) > 0;
  if (dependents && r?.insuranceLifeReviewed === "no") {
    tripwires.push({
      code: "NO_LIFE_INSURANCE",
      severity: 1,
      module: "M14",
      message: "No life-insurance review with dependents in the household",
      fixModule: "M14",
    });
  }
  if (r?.incomeDependent === true && r.insuranceDisabilityReviewed === "no") {
    tripwires.push({
      code: "NO_DISABILITY",
      severity: 1,
      module: "M14",
      message: "No disability coverage review while income-dependent",
      fixModule: "M14",
    });
  }

  // CONCENTRATION > policy limit (entered income data only).
  if (
    m.incomeConcentration !== null &&
    (input.incomeStreams?.length ?? 0) > 1 &&
    m.incomeConcentration > policy.incomeConcentrationLimit
  ) {
    tripwires.push({
      code: "CONCENTRATION",
      severity: 1,
      module: "M8",
      message: "Income concentration above the watch threshold",
      metric: "incomeConcentration",
      value: m.incomeConcentration,
      threshold: policy.incomeConcentrationLimit,
      fixModule: "M8",
    });
  }

  // HIGH_APR_NEW: entered balance above the policy APR threshold.
  const highApr = (input.debts ?? []).filter(
    (d) => d.balance > 0 && d.apr > policy.highAprThreshold && !(d.payoffPlanAttested || (d.extraPayment ?? 0) > 0),
  );
  if (highApr.length > 0) {
    tripwires.push({
      code: "HIGH_APR_NEW",
      severity: 1,
      module: "M5",
      message: "High-APR balance without an active payoff plan",
      metric: "highAprDebt",
      value: highApr.reduce((s, d) => s + d.balance, 0),
      threshold: policy.highAprThreshold,
      fixModule: "M5",
    });
  }

  if (m.hasMissedMinimum) {
    tripwires.push({
      code: "MISSED_MINIMUM",
      severity: 1,
      module: "M5",
      message: "A minimum payment is missed and unresolved",
      fixModule: "M5",
    });
  }

  // ESTATE_GAP: minor dependents AND (no will OR no guardianship) — requires
  // the estate checklist to have been answered (P6).
  if (m.hasMinorDependents && input.estateDocs && input.estateDocs.length > 0) {
    const will = input.estateDocs.find((d) => d.type === "will");
    const guardianship = input.estateDocs.find((d) => d.type === "guardianship");
    if (will?.status === "missing" || guardianship?.status === "missing") {
      tripwires.push({
        code: "ESTATE_GAP",
        severity: 1,
        module: "M23",
        message: "Minor dependents without a will or guardianship nomination",
        fixModule: "M23",
      });
    }
  }

  // DRAW_ORDER_MISSING: RED_ZONE or DISTRIBUTION only (§9.2, P6).
  if ((mode === "RED_ZONE" || mode === "DISTRIBUTION") && input.resilience?.drawOrderWritten === "no") {
    tripwires.push({
      code: "DRAW_ORDER_MISSING",
      severity: 1,
      module: "M21",
      message: "No written down-market draw order",
      fixModule: "M21",
    });
  }

  const insurance = {
    life: insuranceState(r?.insuranceLifeReviewed, dependents || r?.insuranceLifeReviewed !== undefined),
    disability: insuranceState(
      r?.insuranceDisabilityReviewed,
      (r?.incomeDependent ?? false) || r?.insuranceDisabilityReviewed !== undefined,
    ),
    umbrella: insuranceState(r?.insuranceUmbrellaReviewed, r?.insuranceUmbrellaReviewed !== undefined),
    health: insuranceState(r?.insuranceHealthReviewed, r !== undefined),
  };

  // Next-best-actions (§M14): tripwires first, then failing rules, then
  // emergency top-up / diversification opportunities; top 6.
  const actions: ResilienceAction[] = [];
  for (const t of tripwires) {
    actions.push({ rank: 0, code: t.code, label: t.message, severity: 1, module: t.fixModule ?? t.module });
  }
  for (const rule of failingRules) {
    actions.push({ rank: 0, code: `RULE_${rule.id}`, label: rule.label, severity: 2, module: rule.fixModule ?? "M16" });
  }
  if (
    m.emergencyMonths !== null &&
    m.emergencyMonths >= policy.emergencyCriticalMonths &&
    m.emergencyMonths < m.emergencyTargetMonths
  ) {
    actions.push({
      rank: 0,
      code: "EMERGENCY_TOP_UP",
      label: "Top up the accessible reserve to target",
      severity: 2,
      module: "M6",
    });
  }
  actions.sort((a, b) => a.severity - b.severity);
  const top = actions.slice(0, 6).map((a, idx) => ({ ...a, rank: idx + 1 }));

  return {
    emergencyMonths: m.emergencyMonths,
    insurance,
    concentration: m.incomeConcentration,
    tripwires,
    actions: top,
  };
}
