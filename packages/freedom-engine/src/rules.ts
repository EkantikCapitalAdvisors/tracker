/**
 * The Sixteen Operating Rules (§5.4) — one shared rules engine (gOR, §M16).
 *
 * Each rule evaluates to CLEAR / WATCH / BLOCKED / NOT_YET / N_A / INFO
 * against live data and the effective ThresholdPolicy. Applicability-aware:
 * tallies count "N of M applicable", never a fixed denominator. Unanswered
 * scores NOT_YET, never BLOCKED (§P6). BLOCKED is reserved for entered data
 * in a catastrophic condition.
 */

import type { ThresholdPolicy } from "./policies.js";
import type { HouseholdMetrics } from "./metrics.js";
import type { ConditionState, EngineInput, RuleResult, RulesScorecard } from "./types.js";

interface RuleContext {
  input: EngineInput;
  m: HouseholdMetrics;
  policy: ThresholdPolicy;
}

type RuleSpec = {
  id: string;
  group: "foundation" | "wealth";
  label: string;
  fixModule: string;
  evaluate: (ctx: RuleContext) => Pick<RuleResult, "state" | "value" | "threshold" | "detail">;
};

const RULES: RuleSpec[] = [
  {
    id: "F1",
    group: "foundation",
    label: "Accessible reserve on target",
    fixModule: "M6",
    evaluate: ({ m }) => {
      if (m.emergencyMonths === null) return { state: "NOT_YET" };
      const target = m.emergencyTargetMonths;
      if (m.emergencyMonths >= target) return { state: "CLEAR", value: m.emergencyMonths, threshold: target };
      return { state: "WATCH", value: m.emergencyMonths, threshold: target };
    },
  },
  {
    id: "F2",
    group: "foundation",
    label: "Planned surplus is positive",
    fixModule: "M4",
    evaluate: ({ m }) => {
      const contribution = m.plannedSavingsMonthly ?? m.surplusMonthly;
      if (contribution === null) return { state: "NOT_YET" };
      if (contribution > 0) return { state: "CLEAR", value: contribution, threshold: 0 };
      return { state: "WATCH", value: contribution, threshold: 0 };
    },
  },
  {
    id: "F3",
    group: "foundation",
    label: "Essentials are understood and supportable",
    fixModule: "M4",
    evaluate: ({ m, policy }) => {
      if (m.essentialsRatio === null) return { state: "NOT_YET" };
      // Default benchmark is context, not a universal fail (§5.4).
      if (m.essentialsRatio <= policy.essentialsRatioBenchmark)
        return { state: "CLEAR", value: m.essentialsRatio, threshold: policy.essentialsRatioBenchmark };
      return { state: "WATCH", value: m.essentialsRatio, threshold: policy.essentialsRatioBenchmark };
    },
  },
  {
    id: "F4",
    group: "foundation",
    label: "High-cost debt controlled",
    fixModule: "M5",
    evaluate: ({ input, m, policy }) => {
      const debts = input.debts;
      if (debts === undefined) return { state: "NOT_YET" };
      if (m.hasMissedMinimum)
        return { state: "BLOCKED", detail: "A minimum payment is currently missed and unresolved" };
      const uncontrolled = debts.filter(
        (d) =>
          d.balance > 0 &&
          d.apr > policy.highAprThreshold &&
          !(d.payoffPlanAttested || (d.extraPayment ?? 0) > 0 || d.amortizeYears),
      );
      if (uncontrolled.length > 0)
        return {
          state: "WATCH",
          value: uncontrolled.reduce((s, d) => s + d.balance, 0),
          threshold: policy.highAprThreshold,
          detail: "High-APR balance without an active payoff plan",
        };
      return { state: "CLEAR", value: m.highAprDebt, threshold: policy.highAprThreshold };
    },
  },
  {
    id: "F5",
    group: "foundation",
    label: "Applicable downside reviewed",
    fixModule: "M14",
    evaluate: ({ input }) => {
      const r = input.resilience;
      if (!r) return { state: "NOT_YET" };
      const checks: Array<"yes" | "no" | "not_applicable" | "unanswered"> = [
        r.insuranceLifeReviewed ?? "unanswered",
        r.insuranceDisabilityReviewed ?? "unanswered",
        r.insuranceHealthReviewed ?? "unanswered",
        r.insuranceUmbrellaReviewed ?? "unanswered",
      ];
      const applicable = checks.filter((c) => c !== "not_applicable");
      if (applicable.length === 0) return { state: "N_A" };
      if (applicable.every((c) => c === "yes")) return { state: "CLEAR" };
      if (applicable.some((c) => c === "no")) return { state: "WATCH", detail: "A coverage review is outstanding" };
      return { state: "NOT_YET" };
    },
  },
  {
    id: "F6",
    group: "foundation",
    label: "Income concentration understood",
    fixModule: "M8",
    evaluate: ({ input, m, policy }) => {
      const streams = input.incomeStreams;
      if (!streams || streams.length === 0 || m.incomeConcentration === null) return { state: "NOT_YET" };
      // Adjusted for number of streams: a single-stream household is WATCH
      // context, not an alarm (§5.4 "adjusted for number/type of streams").
      if (streams.length === 1)
        return { state: "WATCH", value: 1, threshold: policy.incomeConcentrationLimit, detail: "Single income stream" };
      if (m.incomeConcentration > policy.incomeConcentrationLimit)
        return { state: "WATCH", value: m.incomeConcentration, threshold: policy.incomeConcentrationLimit };
      return { state: "CLEAR", value: m.incomeConcentration, threshold: policy.incomeConcentrationLimit };
    },
  },
  {
    id: "F7",
    group: "foundation",
    label: "Account/tax opportunities reviewed",
    fixModule: "M6",
    evaluate: ({ input }) => {
      const attested = hasAttestation(input, "taxOpportunitiesReviewed");
      if (attested === null) return { state: "NOT_YET" };
      return attested ? { state: "CLEAR" } : { state: "WATCH" };
    },
  },
  {
    id: "F8",
    group: "foundation",
    label: "Estate/beneficiary basics reviewed",
    fixModule: "M23",
    evaluate: ({ input }) => {
      const docs = input.estateDocs;
      if (!docs || docs.length === 0) return { state: "NOT_YET" };
      const core = docs.filter((d) => d.type === "will" || d.type === "beneficiaries");
      if (core.length === 0) return { state: "NOT_YET" };
      if (core.every((d) => d.status === "complete")) return { state: "CLEAR" };
      return { state: "WATCH", detail: "Core estate documents incomplete" };
    },
  },
  {
    id: "W1",
    group: "wealth",
    label: "Recurring leaks reviewed",
    fixModule: "M4",
    evaluate: ({ input, m }) => {
      if (input.debts === undefined && input.cashFlow === undefined) return { state: "NOT_YET" };
      return { state: "INFO", value: m.interestLeakMonthly, detail: "Monthly interest leaving the household" };
    },
  },
  {
    id: "W2",
    group: "wealth",
    label: "Tax assumptions reviewed",
    fixModule: "M2",
    evaluate: ({ input }) => {
      if (input.plan?.taxDrag === undefined && input.cashFlow?.taxRateEstimate === undefined)
        return { state: "NOT_YET" };
      return { state: "CLEAR" };
    },
  },
  {
    id: "W3",
    group: "wealth",
    label: "Discretionary spending is planned",
    fixModule: "M4",
    evaluate: ({ m }) => {
      if (m.discretionaryMonthly === null || m.surplusMonthly === null) return { state: "NOT_YET" };
      if (m.surplusMonthly >= 0) return { state: "CLEAR", value: m.discretionaryMonthly };
      return { state: "WATCH", value: m.discretionaryMonthly, detail: "Spending exceeds income" };
    },
  },
  {
    id: "W4",
    group: "wealth",
    label: "Big purchases have a funding plan",
    fixModule: "M12",
    evaluate: ({ input, m }) => {
      const goals = input.goals;
      if (!goals || goals.length === 0) return { state: "N_A" };
      if (m.surplusMonthly === null) return { state: "NOT_YET" };
      // "On schedule without breaking safety gates" (§5.4): the level goal
      // contributions must fit inside the household's monthly surplus.
      const monthlyReturn = 0; // conservative solve for the fit test
      let required = 0;
      for (const g of goals) {
        const months = Math.max(1, Math.round(g.targetYear * 12));
        required += Math.max(0, (g.target - (g.fundedSoFar ?? 0)) / months + monthlyReturn);
      }
      if (required <= m.surplusMonthly) return { state: "CLEAR", value: required, threshold: m.surplusMonthly };
      return { state: "WATCH", value: required, threshold: m.surplusMonthly };
    },
  },
  {
    id: "W5",
    group: "wealth",
    label: "Speculation limited to declared surplus",
    fixModule: "M6",
    evaluate: ({ input, m }) => {
      const cap = input.resilience?.speculativeCap;
      if (m.speculativeBalance === 0 && cap === undefined) return { state: "N_A" };
      if (cap === undefined) return { state: "NOT_YET", value: m.speculativeBalance };
      if (m.speculativeBalance <= cap) return { state: "CLEAR", value: m.speculativeBalance, threshold: cap };
      return { state: "WATCH", value: m.speculativeBalance, threshold: cap };
    },
  },
  {
    id: "W6",
    group: "wealth",
    label: "Long-term contribution positive",
    fixModule: "M11",
    evaluate: ({ m }) => {
      const contribution = m.plannedSavingsMonthly ?? m.surplusMonthly;
      if (contribution === null) return { state: "NOT_YET" };
      return contribution > 0 ? { state: "CLEAR", value: contribution } : { state: "WATCH", value: contribution };
    },
  },
  {
    id: "W7",
    group: "wealth",
    label: "Spending-growth source understood",
    fixModule: "M4",
    evaluate: () => ({ state: "INFO" }),
  },
  {
    id: "W8",
    group: "wealth",
    label: "Borrowing purpose/horizon reviewed",
    fixModule: "M5",
    evaluate: () => ({ state: "INFO" }),
  },
];

/** Attestation lookup: null = unanswered; boolean = answered. */
function hasAttestation(_input: EngineInput, _key: string): boolean | null {
  // MVP engine input carries no generic attestation bag yet; unanswered.
  return null;
}

const ON_TRACK: ReadonlySet<ConditionState> = new Set(["CLEAR"]);
const APPLICABLE: ReadonlySet<ConditionState> = new Set(["CLEAR", "WATCH", "BLOCKED"]);

export function evaluateRules(
  input: EngineInput,
  m: HouseholdMetrics,
  policy: ThresholdPolicy,
): RulesScorecard {
  const ctx: RuleContext = { input, m, policy };
  const rules: RuleResult[] = RULES.map((spec) => {
    const r = spec.evaluate(ctx);
    return {
      id: spec.id,
      group: spec.group,
      label: spec.label,
      fixModule: spec.fixModule,
      state: r.state,
      value: r.value ?? null,
      threshold: r.threshold ?? null,
      ...(r.detail !== undefined ? { detail: r.detail } : {}),
    };
  });
  const tally = (group?: "foundation" | "wealth") => {
    const set = group ? rules.filter((r) => r.group === group) : rules;
    return {
      applicable: set.filter((r) => APPLICABLE.has(r.state)).length,
      onTrack: set.filter((r) => ON_TRACK.has(r.state)).length,
    };
  };
  const all = tally();
  const foundation = tally("foundation");
  const wealth = tally("wealth");
  return {
    rules,
    applicable: all.applicable,
    onTrack: all.onTrack,
    foundationApplicable: foundation.applicable,
    foundationOnTrack: foundation.onTrack,
    wealthApplicable: wealth.applicable,
    wealthOnTrack: wealth.onTrack,
  };
}
