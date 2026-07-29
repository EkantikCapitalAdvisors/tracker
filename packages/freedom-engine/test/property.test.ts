/**
 * Property tests (§15.2): verdict monotonicity, dead-band stability, m*
 * round trips, and no NaN/Infinity for bounded inputs.
 */

import { describe, expect, it } from "vitest";
import {
  amortizedPayment,
  computeEngineResult,
  glidePath,
  monthsToGoal,
  paceBand,
  payoffMonths,
  prepayVsInvest,
  projectCurve,
  requiredPace,
  THRESHOLD_POLICY_V1,
  yearsFunded,
} from "../src/index.js";

const RATES = [0, 0.01, 0.03, 0.05, 0.08, 0.12];
const CAPS = [0, 1_000, 100_000, 1_000_000];
const TARGETS = [50_000, 500_000, 2_000_000];
const MONTHS = [12, 60, 132, 360];

describe("m* reproduces F through the projection (property)", () => {
  it("holds across the input grid", () => {
    for (const r of RATES) {
      for (const C0 of CAPS) {
        for (const F of TARGETS) {
          for (const n of MONTHS) {
            const i = r / 12;
            const mStar = requiredPace(C0, i, n, F);
            const curve = projectCurve(C0, i, n, () => mStar);
            expect(curve[n]).toBeCloseTo(F, 4);
            expect(glidePath(C0, i, mStar, n)).toBeCloseTo(F, 4);
          }
        }
      }
    }
  });
});

describe("amortization inverse (property)", () => {
  it("payoffMonths(P, apr, pmt(P, apr, n)) = n across the grid", () => {
    for (const apr of RATES) {
      for (const P of [1_000, 50_000, 285_000]) {
        for (const n of MONTHS) {
          const pmt = amortizedPayment(P, apr, n);
          expect(payoffMonths(P, apr, pmt)).toBeCloseTo(n, 4);
        }
      }
    }
  });

  it("a payment at or below monthly interest never claims a payoff date", () => {
    expect(payoffMonths(10_000, 0.24, 200)).toBeNull(); // interest = $200/mo
    expect(payoffMonths(10_000, 0.24, 199)).toBeNull();
    expect(payoffMonths(10_000, 0.24, 201)).not.toBeNull();
  });
});

describe("no NaN/Infinity for bounded inputs (property)", () => {
  it("core solves stay finite", () => {
    for (const r of RATES) {
      for (const C0 of CAPS) {
        for (const F of TARGETS) {
          for (const n of MONTHS) {
            const mStar = requiredPace(C0, r / 12, n, F);
            expect(Number.isFinite(mStar)).toBe(true);
          }
        }
      }
    }
  });

  it("depletion returns Infinity only for the documented sustainable branch", () => {
    expect(yearsFunded(1_000_000, 0.05, 80_000)).toBeGreaterThan(0);
    expect(Number.isFinite(yearsFunded(1_000_000, 0.05, 80_000))).toBe(true);
    expect(yearsFunded(1_000_000, 0, 80_000)).toBeCloseTo(12.5, 6);
    expect(yearsFunded(1_000_000, -0.02, 80_000)).toBeGreaterThan(0);
    expect(yearsFunded(1_000_000, -0.02, 80_000)).toBeLessThan(12.5);
    // Pathological total-loss rates stay defined (no NaN/−Infinity).
    expect(yearsFunded(1_000_000, -1, 80_000)).toBe(0);
    expect(yearsFunded(1_000_000, -1.5, 80_000)).toBe(0);
  });
});

describe("pace bands are monotone in the ratio (property)", () => {
  it("higher ratio never yields a worse band", () => {
    const order = { OFF_PACE: 0, WATCH: 1, ON_PACE: 2, AHEAD: 3 } as const;
    let prev = -1;
    for (let ratio = 0.5; ratio <= 1.3; ratio += 0.005) {
      const band = paceBand(ratio, THRESHOLD_POLICY_V1);
      expect(band).not.toBe("NOT_YET");
      const rank = order[band as keyof typeof order];
      expect(rank).toBeGreaterThanOrEqual(prev);
      prev = rank;
    }
  });
});

describe("comparator dead band produces CLOSE_CALL, never oscillation", () => {
  it("inside ±100 bp of the break-even the verdict is CLOSE_CALL", () => {
    const base = (b: number) =>
      prepayVsInvest({
        balance: 20_000,
        apr: 0.07,
        currentPayment: 400,
        netReturnCases: { down: b - 0.02, base: b, up: b + 0.02 },
        deadBand: 0.01,
      }).verdict;
    expect(base(0.07)).toBe("CLOSE_CALL");
    expect(base(0.079)).toBe("CLOSE_CALL");
    expect(base(0.061)).toBe("CLOSE_CALL");
    expect(base(0.081)).toBe("INVESTING_FAVORED_IN_BASE_CASE");
    expect(base(0.059)).toBe("PREPAY_FAVORED");
  });

  it("a favorable base case never clears a failed safety gate", () => {
    const result = prepayVsInvest({
      balance: 20_000,
      apr: 0.07,
      currentPayment: 400,
      netReturnCases: { down: 0.06, base: 0.12, up: 0.15 },
      safetyGateFailed: true,
      deadBand: 0.01,
    });
    expect(result.verdict).toBe("SAFETY_GATE_BLOCKED");
  });
});

describe("gFM months-to-goal", () => {
  it("agrees with the closed form for constant contribution", () => {
    const i = 0.06 / 12;
    const mStar = requiredPace(100_000, i, 240, 500_000);
    const months = monthsToGoal(100_000, i, 500_000, 720, () => mStar);
    expect(months).toBe(240);
  });

  it("returns null when unreachable within the horizon", () => {
    expect(monthsToGoal(0, 0, 1_000_000, 720, () => 10)).toBeNull();
  });
});

describe("engine result is finite and consistent (property)", () => {
  it("a fully-populated household yields no NaN anywhere", () => {
    const result = computeEngineResult({
      plan: {
        freedomSpendingNeed: { low: 70_000, high: 90_000 },
        reliableNonPortfolioIncome: 20_000,
        planningWithdrawalRate: 0.04,
        nominalGrossReturn: 0.08,
        inflation: 0.025,
        feeDrag: 0.002,
        taxDrag: 0.005,
        freedomDateMonths: { low: 120, high: 160 },
        planHorizonYears: 35,
      },
      accounts: [
        { name: "Emergency", purpose: "emergency", balance: 15_000 },
        { name: "Brokerage", purpose: "compounding", balance: 250_000 },
        { name: "401k", purpose: "retirement", balance: 180_000 },
      ],
      debts: [
        { name: "Auto", balance: 18_000, apr: 0.064, minPayment: 350, extraPayment: 50 },
        { name: "Card", balance: 4_000, apr: 0.24, minPayment: 120, payoffPlanAttested: true },
      ],
      incomeStreams: [
        { name: "Salary", type: "salary", annualIncome: 150_000 },
        { name: "Side", type: "side", annualIncome: 20_000 },
      ],
      goals: [{ name: "College", target: 80_000, targetYear: 10 }],
      holdings: [
        { name: "Index", class: "equity", value: 200_000, expectedReturn: 0.08 },
        { name: "Bonds", class: "fixed", value: 50_000, expectedReturn: 0.045 },
      ],
      cashFlow: {
        netIncomeMonthly: 10_500,
        essentialsMonthly: 5_200,
        discretionaryMonthly: 2_000,
        plannedMonthlySavings: 2_400,
      },
      resilience: {
        dependents: 2,
        incomeDependent: true,
        insuranceLifeReviewed: "yes",
        insuranceDisabilityReviewed: "yes",
        insuranceHealthReviewed: "yes",
        emergencyTargetMonths: 4,
      },
      followThroughRate: 0.8,
    });
    const walk = (value: unknown, path: string): void => {
      if (typeof value === "number") {
        expect(Number.isNaN(value), `${path} is NaN`).toBe(false);
      } else if (Array.isArray(value)) {
        value.forEach((v, idx) => walk(v, `${path}[${idx}]`));
      } else if (value && typeof value === "object") {
        for (const [k, v] of Object.entries(value)) walk(v, `${path}.${k}`);
      }
    };
    walk(result, "result");
    expect(result.engineVersion).toBe("0.1.0");
  });
});
