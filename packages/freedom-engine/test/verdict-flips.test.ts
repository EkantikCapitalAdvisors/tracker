/**
 * Verdict-flip tests (§15.3): every verdict surface crosses each threshold in
 * both directions.
 */

import { describe, expect, it } from "vitest";
import {
  claimAgeFactor,
  guardrailState,
  paceBand,
  refinanceScreen,
  SPENDING_POLICY_V1,
  THRESHOLD_POLICY_V1,
} from "../src/index.js";

describe("pace band edges (§9.1)", () => {
  const p = THRESHOLD_POLICY_V1;
  it.each([
    [1.051, "AHEAD"],
    [1.05, "AHEAD"],
    [1.049, "ON_PACE"],
    [0.951, "ON_PACE"],
    [0.95, "ON_PACE"],
    [0.949, "WATCH"],
    [0.851, "WATCH"],
    [0.85, "WATCH"],
    [0.849, "OFF_PACE"],
  ])("ratio %f → %s", (ratio, band) => {
    expect(paceBand(ratio, p)).toBe(band);
  });

  it("null and non-finite ratios render NOT_YET, never a red band", () => {
    expect(paceBand(null, p)).toBe("NOT_YET");
    expect(paceBand(Number.NaN, p)).toBe("NOT_YET");
  });
});

describe("guardrail corridor flips in both directions (§M21)", () => {
  const policy = SPENDING_POLICY_V1;
  it("crossing the upper edge", () => {
    expect(guardrailState(0.0599, 0.05, policy)).toBe("BASE_SPENDING");
    expect(guardrailState(0.06, 0.05, policy)).toBe("BASE_SPENDING");
    expect(guardrailState(0.0601, 0.05, policy)).toBe("CUT_MODELED");
  });
  it("crossing the lower edge", () => {
    expect(guardrailState(0.0401, 0.05, policy)).toBe("BASE_SPENDING");
    expect(guardrailState(0.04, 0.05, policy)).toBe("BASE_SPENDING");
    expect(guardrailState(0.0399, 0.05, policy)).toBe("RAISE_MODELED");
  });
  it("missing inputs render NOT_YET", () => {
    expect(guardrailState(null, 0.05, policy)).toBe("NOT_YET");
    expect(guardrailState(0.05, null, policy)).toBe("NOT_YET");
  });
});

describe("refinance screen dead band (Appendix A, V2 release-gated)", () => {
  it("spread beyond ±100 bp flips CANDIDATE / UNLIKELY; inside is CLOSE_CALL", () => {
    // apr 7%, alternative 5.5% → spread +150 bp.
    expect(refinanceScreen(0.07, 0.055, false, false, 0.24).state).toBe("CANDIDATE");
    // apr 7%, alternative 8.5% → spread −150 bp.
    expect(refinanceScreen(0.07, 0.085, false, false, 0.24).state).toBe("UNLIKELY");
    // apr 7%, alternative 6.5% → spread +50 bp.
    expect(refinanceScreen(0.07, 0.065, false, false, 0.24).state).toBe("CLOSE_CALL");
  });

  it("flips-on-deductibility flag: state differs under itemizing true/false", () => {
    // apr 7% deductible at 30%: after-tax 4.9% vs alternative 6% → UNLIKELY
    // when itemizing, CANDIDATE when not (spread +100bp→−110bp): not robust.
    const flips = refinanceScreen(0.07, 0.0585, true, true, 0.3);
    expect(flips.flipsOnDeductibility).toBe(true);
    // Non-deductible debt is robust by construction.
    const robust = refinanceScreen(0.07, 0.055, false, false, 0.3);
    expect(robust.robustToDeductibility).toBe(true);
  });
});

describe("benefits factor is monotone in claim age (§M22)", () => {
  it("each later month never reduces the factor", () => {
    let prev = 0;
    for (let age = 62; age <= 70; age += 1 / 12) {
      const f = claimAgeFactor(age, 67);
      expect(f).toBeGreaterThanOrEqual(prev - 1e-12);
      prev = f;
    }
  });
});
