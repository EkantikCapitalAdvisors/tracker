/**
 * Behavioral tests: Model B obligation drop-off (§M11), applicability-aware
 * rules (§M16), score reweighting and display cap (§M15), gate binding
 * constraint (§5.6), phase routing (§5.2), and the funded-ratio handoff.
 */

import { describe, expect, it } from "vitest";
import {
  computeEngineResult,
  computeScore,
  evaluateGatePanel,
  investedAt,
  SCORE_POLICY_V1,
  type ModelBInputs,
} from "../src/index.js";

describe("Model B obligation drop-off (§M11)", () => {
  const inputs: ModelBInputs = {
    plannedSurplusMonthly: 3_000,
    debts: [{ name: "Auto", balance: 12_000, apr: 0.06, minPayment: 500 }],
    goals: [{ name: "Roof", target: 12_000, targetYear: 2 }],
    expectedMonthlyReturn: 0.05 / 12,
  };

  it("a retired obligation rejoins compounding automatically", () => {
    const before = investedAt(inputs, 0);
    // Auto loan at $500/mo on $12K @ 6% retires in ~25 months; goal ends at 24.
    const afterGoal = investedAt(inputs, 24);
    const afterAll = investedAt(inputs, 30);
    expect(before).toBeLessThan(afterGoal);
    expect(afterGoal).toBeLessThan(afterAll);
    expect(afterAll).toBeCloseTo(3_000, 6);
  });

  it("invested is never negative (dollar-for-dollar, floored at zero)", () => {
    const tight: ModelBInputs = { ...inputs, plannedSurplusMonthly: 400 };
    expect(investedAt(tight, 0)).toBe(0);
  });
});

describe("debt strategy comparison (§M5)", () => {
  it("avalanche never pays more interest than snowball; both beat minimums", () => {
    // Orderings differ: the smallest balance is the LOWEST-APR debt.
    const debts = [
      { name: "Small-low", balance: 3_000, apr: 0.04, minPayment: 100 },
      { name: "Big-high", balance: 20_000, apr: 0.26, minPayment: 500, extraPayment: 400 },
      { name: "Mid", balance: 10_000, apr: 0.12, minPayment: 250 },
    ];
    const result = computeEngineResult({ debts });
    const byName = Object.fromEntries(result.debts.strategies.map((s) => [s.strategy, s]));
    expect(byName.avalanche!.totalInterest as number).toBeLessThan(byName.snowball!.totalInterest as number);
    expect(byName.snowball!.totalInterest as number).toBeLessThan(byName.minimums!.totalInterest as number);
    expect(byName.avalanche!.debtFreeMonths as number).toBeLessThanOrEqual(byName.minimums!.debtFreeMonths as number);
  });
});

describe("score is applicability-aware and cap-honest (§M15)", () => {
  it("missing components reweight; they never count as zero", () => {
    const partial = computeScore(
      {
        paceOrFundingRatio: 1.0,
        progress: null,
        cashFlowMarginRatio: null,
        foundationShare: 1.0,
        followThroughRate: null,
        openSeverity1Tripwires: 0,
        band: "ON_PACE",
      },
      SCORE_POLICY_V1,
    );
    expect(partial.base).toBeCloseTo(100, 6);
    expect(partial.completeness).toBeCloseTo(0.45, 6);
    expect(partial.confidence).toBe("LOW");
  });

  it("below the completeness threshold there is no overall score", () => {
    const sparse = computeScore(
      {
        paceOrFundingRatio: null,
        progress: 0.5,
        cashFlowMarginRatio: null,
        foundationShare: null,
        followThroughRate: null,
        openSeverity1Tripwires: 0,
        band: "NOT_YET",
      },
      SCORE_POLICY_V1,
    );
    expect(sparse.base).toBeNull();
    expect(sparse.displayed).toBeNull();
  });

  it("severity-1 tripwires cap the DISPLAYED band; the base is never mutated", () => {
    const capped = computeScore(
      {
        paceOrFundingRatio: 1.2,
        progress: 1.0,
        cashFlowMarginRatio: 1.0,
        foundationShare: 1.0,
        followThroughRate: 1.0,
        openSeverity1Tripwires: 2,
        band: "AHEAD",
      },
      SCORE_POLICY_V1,
    );
    expect(capped.base).toBeCloseTo(100, 6);
    expect(capped.displayed).toBeCloseTo(84, 6); // 1 − 0.08·2 = 0.84
    expect(capped.capApplied).toBe(true);
  });

  it("the cap floor holds at many tripwires: max(0.6, …)", () => {
    const floor = computeScore(
      {
        paceOrFundingRatio: 1.2,
        progress: 1.0,
        cashFlowMarginRatio: 1.0,
        foundationShare: 1.0,
        followThroughRate: 1.0,
        openSeverity1Tripwires: 10,
        band: "AHEAD",
      },
      SCORE_POLICY_V1,
    );
    expect(floor.displayed).toBeCloseTo(60, 6);
  });
});

describe("gate panel binding constraint (§5.6)", () => {
  it("first BLOCKED wins; else first WATCH; NOT_YET majority is INSUFFICIENT_DATA", () => {
    const blocked = evaluateGatePanel([
      { id: "a", label: "A", state: "CLEAR" },
      { id: "b", label: "B", state: "WATCH" },
      { id: "c", label: "C", state: "BLOCKED" },
    ]);
    expect(blocked.rollup).toBe("BLOCKED");
    expect(blocked.bindingConstraint?.id).toBe("c");

    const watch = evaluateGatePanel([
      { id: "a", label: "A", state: "CLEAR" },
      { id: "b", label: "B", state: "WATCH" },
      { id: "c", label: "C", state: "WATCH" },
    ]);
    expect(watch.rollup).toBe("WATCH");
    expect(watch.bindingConstraint?.id).toBe("b");

    const insufficient = evaluateGatePanel([
      { id: "a", label: "A", state: "NOT_YET" },
      { id: "b", label: "B", state: "NOT_YET" },
      { id: "c", label: "C", state: "CLEAR" },
    ]);
    expect(insufficient.rollup).toBe("INSUFFICIENT_DATA");
  });
});

describe("phase routing (§5.2)", () => {
  it("a household failing the starter buffer stays in STABILIZE", () => {
    const result = computeEngineResult({
      cashFlow: { netIncomeMonthly: 4_000, essentialsMonthly: 3_500 },
      accounts: [{ name: "Checking buffer", purpose: "emergency", balance: 200 }],
      debts: [],
    });
    expect(result.phase.phase).toBe("STABILIZE");
  });

  it("a stable, protected, contributing household reaches ACCUMULATE", () => {
    const result = computeEngineResult({
      plan: {
        freedomSpendingNeed: { low: 60_000, high: 80_000 },
        planningWithdrawalRate: 0.04,
        nominalGrossReturn: 0.07,
        inflation: 0.025,
        freedomDateMonths: { low: 180, high: 240 },
      },
      cashFlow: {
        netIncomeMonthly: 9_000,
        essentialsMonthly: 4_500,
        discretionaryMonthly: 1_500,
        plannedMonthlySavings: 2_000,
      },
      accounts: [
        { name: "Emergency", purpose: "emergency", balance: 15_000 },
        { name: "Brokerage", purpose: "compounding", balance: 120_000 },
      ],
      debts: [],
      resilience: {
        dependents: 1,
        incomeDependent: true,
        insuranceLifeReviewed: "yes",
        insuranceDisabilityReviewed: "yes",
        insuranceHealthReviewed: "yes",
        emergencyTargetMonths: 3,
      },
    });
    expect(result.phase.phase).toBe("ACCUMULATE");
    expect(result.mode).toBe("ACCUMULATION");
  });
});

describe("mode and the funded-ratio handoff (§9.1)", () => {
  const base = {
    plan: {
      freedomSpendingNeed: { low: 80_000, high: 80_000 } as { low: number; high: number },
      planningWithdrawalRate: 0.04,
      nominalGrossReturn: 0.075,
      inflation: 0.0238, // net real 5%
      freedomDateMonths: { low: 0, high: 0 },
      retireDateMonths: 0,
      planHorizonYears: 30,
    },
    accounts: [{ name: "Portfolio", purpose: "compounding" as const, balance: 1_229_796 }],
    spendingPlan: { retirementSpendAnnual: 80_000, reliableIncomeAnnual: 0, w0: 0.05 },
    cashFlow: { netIncomeMonthly: 0, essentialsMonthly: 5_000 },
  };

  it("past the retire date the master metric is the funded ratio", () => {
    const result = computeEngineResult(base);
    expect(result.mode).toBe("DISTRIBUTION");
    expect(result.distribution.applicable).toBe(true);
    expect(result.distribution.fundedRatio).not.toBeNull();
    // ~5% real on $1.23M vs $80K spend over 30y → funded ratio ≈ 1.0.
    expect(result.distribution.fundedRatio as number).toBeCloseTo(1.0, 1);
    expect(["ON_PACE", "AHEAD"]).toContain(result.distribution.fundedBand);
  });

  it("RED_ZONE begins inside the configured window before the retire date", () => {
    const result = computeEngineResult({
      ...base,
      plan: { ...base.plan, retireDateMonths: 48, freedomDateMonths: { low: 48, high: 48 } },
    });
    expect(result.mode).toBe("RED_ZONE");
  });

  it("DRAW_ORDER_MISSING fires only in RED_ZONE/DISTRIBUTION (§9.2)", () => {
    const accumulating = computeEngineResult({
      ...base,
      plan: { ...base.plan, retireDateMonths: 240, freedomDateMonths: { low: 240, high: 240 } },
      resilience: { drawOrderWritten: "no" },
    });
    expect(accumulating.resilience.tripwires.map((t) => t.code)).not.toContain("DRAW_ORDER_MISSING");

    const retired = computeEngineResult({
      ...base,
      resilience: { drawOrderWritten: "no" },
    });
    expect(retired.resilience.tripwires.map((t) => t.code)).toContain("DRAW_ORDER_MISSING");
  });
});

describe("rules scorecard applicability (§M16)", () => {
  it("tallies use applicable counts, never a fixed denominator", () => {
    const result = computeEngineResult({});
    expect(result.rules.applicable).toBeLessThan(16);
    expect(result.rules.onTrack).toBeLessThanOrEqual(result.rules.applicable);
  });
});
