/**
 * §15.1 Concrete golden seed values (v2.1 — independently verified).
 * Every case here MUST match to the stated tolerance (cents unless noted).
 * These values were verified against an independent Python model in the spec;
 * changing any expectation requires a §15.6 migration note.
 */

import { describe, expect, it } from "vitest";
import {
  amortizedPayment,
  annuityPV,
  breakEvenReturn,
  breakevenAge,
  claimAgeFactor,
  evaluateEstate,
  evaluateLegacy,
  fundedRatio,
  glidePath,
  guardrailState,
  payoffMonths,
  projectCurve,
  requiredPace,
  SPENDING_POLICY_V1,
  volatilityDragPair,
  yearsFunded,
} from "../src/index.js";

describe("§15.1 amortization payment", () => {
  it("$285,000 · 6.25% · 30y → pmt = $1,754.79/mo", () => {
    expect(amortizedPayment(285_000, 0.0625, 360)).toBeCloseTo(1754.79, 2);
  });

  it("payoff-n inverse returns 360.000", () => {
    const pmt = amortizedPayment(285_000, 0.0625, 360);
    expect(payoffMonths(285_000, 0.0625, pmt)).toBeCloseTo(360.0, 3);
  });
});

describe("§15.1 zero-rate branches", () => {
  it("m* = (F − C0)/n when i = 0", () => {
    expect(requiredPace(10_000, 0, 100, 60_000)).toBeCloseTo((60_000 - 10_000) / 100, 10);
  });

  it("pmt = P/n when j = 0", () => {
    expect(amortizedPayment(12_000, 0, 48)).toBeCloseTo(250, 10);
  });

  it("projection consistency holds at i = 0", () => {
    const mStar = requiredPace(10_000, 0, 100, 60_000);
    const curve = projectCurve(10_000, 0, 100, () => mStar);
    expect(curve[100]).toBeCloseTo(60_000, 6);
    expect(glidePath(10_000, 0, mStar, 100)).toBeCloseTo(60_000, 6);
  });
});

describe("§15.1 required-pace round trip", () => {
  const C0 = 480_000;
  const i = 0.08 / 12;
  const n = 132;
  const F = 1_600_000;

  it("C0 $480,000 · r 8% nominal · n 132 · F $1.6M → m* = $2,118.63", () => {
    expect(requiredPace(C0, i, n, F)).toBeCloseTo(2118.63, 2);
  });

  it("recurrence reproduces F exactly", () => {
    const mStar = requiredPace(C0, i, n, F);
    const curve = projectCurve(C0, i, n, () => mStar);
    expect(curve[n]).toBeCloseTo(F, 2);
  });

  it("glide-path identity: G(n) = F exactly", () => {
    const mStar = requiredPace(C0, i, n, F);
    expect(glidePath(C0, i, mStar, n)).toBeCloseTo(F, 2);
  });
});

describe("§15.1 matched-cash-flow break-even (property)", () => {
  it.each([
    [285_000, 0.0625, 360],
    [285_000, 0.065, 360],
    [100_000, 0.08, 120],
  ])("P=%d, APR=%f, n=%d → break-even equals the contractual APR", (P, apr, months) => {
    const solved = breakEvenReturn(P, apr, months);
    expect(solved).not.toBeNull();
    expect(solved as number).toBeCloseTo(apr, 6);
  });
});

describe("§15.1 depletion solve", () => {
  it("C $1M · r 5% real · S $80K real → n = 20.10y", () => {
    expect(yearsFunded(1_000_000, 0.05, 80_000)).toBeCloseTo(20.1, 2);
  });

  it("S ≤ C·r → ∞", () => {
    expect(yearsFunded(1_000_000, 0.05, 50_000)).toBe(Infinity);
    expect(yearsFunded(1_000_000, 0.05, 49_999)).toBe(Infinity);
  });

  it("simulation agrees within a year", () => {
    let c = 1_000_000;
    let years = 0;
    while (c > 0 && years < 100) {
      c = c * 1.05 - 80_000;
      years += 1;
    }
    expect(Math.abs(years - yearsFunded(1_000_000, 0.05, 80_000))).toBeLessThanOrEqual(1);
  });
});

describe("§15.1 funded-ratio identity", () => {
  it("capital = PV(30y × $80K @ 5%) = $1,229,796 → funded ratio 1.0", () => {
    const pv = annuityPV(80_000, 0.05, 30);
    expect(pv).toBeCloseTo(1_229_796, 0);
    expect(fundedRatio(pv, 80_000, 0.05, 30)).toBeCloseTo(1.0, 10);
  });

  it("that capital funds exactly 30 years", () => {
    const pv = annuityPV(80_000, 0.05, 30);
    expect(yearsFunded(pv, 0.05, 80_000)).toBeCloseTo(30.0, 6);
  });
});

describe("§15.1 guardrail corridor edges (w0 = 5%, band ±20%)", () => {
  const policy = SPENDING_POLICY_V1;
  it("6.1% → cut modeled", () => {
    expect(guardrailState(0.061, 0.05, policy)).toBe("CUT_MODELED");
  });
  it("3.9% → raise modeled", () => {
    expect(guardrailState(0.039, 0.05, policy)).toBe("RAISE_MODELED");
  });
  it("5.9% and 4.1% → base spending", () => {
    expect(guardrailState(0.059, 0.05, policy)).toBe("BASE_SPENDING");
    expect(guardrailState(0.041, 0.05, policy)).toBe("BASE_SPENDING");
  });
});

describe("§15.1 benefits factors (content-versioned, FRA 67 statutory)", () => {
  it.each([
    [62, 0.7],
    [63, 0.75],
    [64, 0.8],
    [65, 0.8667],
    [66, 0.9333],
    [67, 1.0],
    [68, 1.08],
    [69, 1.16],
    [70, 1.24],
  ])("claim at %d → factor %f", (age, factor) => {
    expect(claimAgeFactor(age, 67)).toBeCloseTo(factor, 3);
  });

  it("nominal breakevens ≈ 78.7 (62 v 67) and ≈ 82.5 (67 v 70)", () => {
    expect(breakevenAge(62, 67)).toBeCloseTo(78.7, 1);
    expect(breakevenAge(67, 70)).toBeCloseTo(82.5, 1);
  });
});

describe("§15.1 legacy earmark model", () => {
  it("target $750K · eligible net DB $500K · earmarked $300K → gap $250K, requiredEarmark $250K", () => {
    const result = evaluateLegacy(
      { legacyTarget: 750_000, eligibleNetDeathBenefitAtHorizon: 500_000 },
      300_000,
    );
    expect(result.legacyGapAfterInsurance).toBe(250_000);
    expect(result.requiredEarmark).toBe(250_000);
  });

  it("raising DB to $800K → gap 0, newlyUnearmarked $250K", () => {
    const result = evaluateLegacy(
      {
        legacyTarget: 750_000,
        eligibleNetDeathBenefitAtHorizon: 800_000,
        priorRequiredEarmark: 250_000,
      },
      300_000,
    );
    expect(result.legacyGapAfterInsurance).toBe(0);
    expect(result.requiredEarmark).toBe(0);
    expect(result.newlyUnearmarked).toBe(250_000);
  });
});

describe("§15.1 estate reweighting", () => {
  it("guardianship N/A; will + beneficiaries + directive complete → 100 × 65/90 = 72.2", () => {
    const result = evaluateEstate(
      [
        { type: "will", status: "complete" },
        { type: "beneficiaries", status: "complete" },
        { type: "directive", status: "complete" },
        { type: "poa", status: "missing" },
        { type: "guardianship", status: "not_applicable" },
        { type: "trust", status: "missing" },
        { type: "letter", status: "missing" },
        { type: "locations", status: "missing" },
      ],
      false,
    );
    expect(result.readinessScore).toBeCloseTo((100 * 65) / 90, 1);
    expect(result.readinessScore).toBeCloseTo(72.2, 1);
  });
});

describe("§15.1 volatility drag (education)", () => {
  it("$300K · 30y: steady 4.5% → $1,123,595; alternating +24.4%/−15.4% → $645,628 (±$2, display rounding)", () => {
    const { steadyOutcome, alternatingOutcome } = volatilityDragPair(300_000, 30, 0.045, 0.244, -0.154);
    // Same arithmetic mean: (24.4 − 15.4)/2 = 4.5.
    expect(Math.abs(steadyOutcome - 1_123_595)).toBeLessThanOrEqual(2);
    expect(Math.abs(alternatingOutcome - 645_628)).toBeLessThanOrEqual(2);
    expect(steadyOutcome).toBeGreaterThan(alternatingOutcome);
  });
});
