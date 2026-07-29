/**
 * deprecated-prototype suite (§5.7, §15.1, Appendix D).
 *
 * The prototype's "effective cost" and "~2× rule" calculations are DEPRECATED
 * AND MUST NEVER SHIP. They are implemented here — inside the test suite only,
 * never in src/ — as regression fixtures proving (a) the shortcut's arithmetic
 * is what the prototype claimed, and (b) the matched-cash-flow comparison
 * refutes its conclusion. If either half of this file starts failing, someone
 * has changed history; if these formulas ever appear in src/, block the PR.
 */

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { amortizedPayment, annuityPV, npv, financeVsCashFlows } from "../../src/index.js";

/** DEPRECATED (§5.7-1): average interest dollars over the original balance. */
function deprecatedEffectiveCost(principal: number, apr: number, years: number): number {
  const months = years * 12;
  const pmt = amortizedPayment(principal, apr, months);
  const totalInterest = pmt * months - principal;
  return totalInterest / (principal * years);
}

/** DEPRECATED (§5.7-2): the "~2× rule" comparison of unmatched quantities. */
function deprecatedTwoTimesComparison(
  principal: number,
  apr: number,
  growthRate: number,
  years: number,
): { investmentGrowth: number; effectiveCostTotal: number; shortcutFavorsFinancing: boolean } {
  const investmentGrowth = Math.pow(1 + growthRate, years) - 1;
  const effectiveCostTotal = deprecatedEffectiveCost(principal, apr, years) * years;
  return {
    investmentGrowth,
    effectiveCostTotal,
    shortcutFavorsFinancing: investmentGrowth >= effectiveCostTotal,
  };
}

describe("deprecated-prototype: the old boundary case (10.32% loan vs 4% growth, 30y)", () => {
  const P = 1; // per dollar financed
  const apr = 0.1032;
  const growth = 0.04;
  const years = 30;

  it("the shortcut called this a wash — that arithmetic is pinned", () => {
    const { investmentGrowth, effectiveCostTotal } = deprecatedTwoTimesComparison(P, apr, growth, years);
    // (1.04^30 − 1) ≈ 2.243 vs effectiveCost×30 ≈ 2.245: the old rule saw
    // "growth ≈ cost" at half the stated rate — its claimed "~2×" boundary.
    expect(investmentGrowth).toBeCloseTo(2.243, 2);
    expect(effectiveCostTotal).toBeCloseTo(investmentGrowth, 1);
    // Effective cost ≈ 7.5%/yr — the "55–70% of stated rate" illusion, apr 10.32%.
    expect(deprecatedEffectiveCost(P, apr, years)).toBeCloseTo(0.0748, 3);
  });

  it("matched cash flows refute it: financing loses ≈ 89% of principal in PV (≈ $2.94 per $1 in FV)", () => {
    const months = years * 12;
    const flows = financeVsCashFlows(P, apr, months);
    const pvLoss = npv(flows, growth);
    // −88.8% of principal, per §15.1.
    expect(pvLoss).toBeCloseTo(-0.888, 2);
    const fvLoss = pvLoss * Math.pow(1 + growth / 12, months);
    expect(fvLoss).toBeCloseTo(-2.94, 2);
  });

  it("equivalently: pmt·annuityPV(4%) ≈ 1.888 per dollar borrowed", () => {
    const months = years * 12;
    const pmt = amortizedPayment(P, apr, months);
    expect(pmt * annuityPV(1, growth / 12, months)).toBeCloseTo(1.888, 2);
  });
});

describe("deprecated formulas never ship (§5.7 guard)", () => {
  it("src/ contains no effective-cost or ~2× implementation", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const srcDir = join(here, "..", "..", "src");
    const sources = readdirSync(srcDir).filter((f) => f.endsWith(".ts"));
    for (const file of sources) {
      const text = readFileSync(join(srcDir, file), "utf8");
      expect(text, `${file} must not implement the deprecated effective-cost shortcut`).not.toMatch(
        /totalInterest\s*\/\s*\(?\s*(originalPrincipal|principal)\s*\*\s*years/,
      );
      expect(text, `${file} must not implement the deprecated ~2× comparison`).not.toMatch(
        /effectiveCost\s*\*\s*years/,
      );
    }
  });
});
