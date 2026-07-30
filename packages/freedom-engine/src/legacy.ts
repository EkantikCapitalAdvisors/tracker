/**
 * Legacy funding & value to heirs (§M24, Appendix A).
 *
 * The revised earmark model (Appendix D): a death benefit never automatically
 * makes portfolio capital spendable. Only assets the household had actually
 * earmarked can be released, and the released amount is rerun through the
 * retirement plan — it does not create current spending.
 */

import type { LegacyInput } from "./types.js";

export interface LegacyEvaluation {
  state: "FUNDED" | "PARTIAL" | "UNFUNDED" | "WAIVED" | "NOT_YET";
  /** (eligible net death benefit + earmarked) / target; null when no target. */
  fundingRatio: number | null;
  legacyGapAfterInsurance: number | null;
  requiredEarmark: number | null;
  newlyUnearmarked: number | null;
}

export function evaluateLegacy(input: LegacyInput | undefined, earmarkedAssets: number): LegacyEvaluation {
  const none: LegacyEvaluation = {
    state: "NOT_YET",
    fundingRatio: null,
    legacyGapAfterInsurance: null,
    requiredEarmark: null,
    newlyUnearmarked: null,
  };
  if (!input) return none;
  if (input.legacyWaived) return { ...none, state: "WAIVED" };
  const target = input.legacyTarget ?? 0;
  if (!(target > 0)) return none;
  // Stale or absent policy source ⇒ the death-benefit value is NOT_YET, never
  // assumed (§M24) — but a target with no policy at all still evaluates with
  // deathBenefit = 0 (the household simply has no insurance component).
  if (input.eligibleNetDeathBenefitAtHorizon !== undefined && input.deathBenefitSourceStale) {
    return none;
  }
  const deathBenefit = input.eligibleNetDeathBenefitAtHorizon ?? 0;
  const gap = Math.max(0, target - deathBenefit);
  const requiredEarmark = Math.min(earmarkedAssets, gap);
  const prior = input.priorRequiredEarmark;
  const newlyUnearmarked = prior !== undefined ? Math.max(0, prior - requiredEarmark) : null;
  const fundingRatio = (deathBenefit + earmarkedAssets) / target;
  const state = fundingRatio >= 1 ? "FUNDED" : fundingRatio > 0 ? "PARTIAL" : "UNFUNDED";
  return { state, fundingRatio, legacyGapAfterInsurance: gap, requiredEarmark, newlyUnearmarked };
}

/**
 * Value-to-heirs at a point in time (§5.1, educational):
 * modeled assets + eligible net death benefit − modeled debts − explicit costs.
 * Excluded nuances (taxes, probate, ownership) are a display concern; missing
 * items lower confidence rather than silently equaling zero (§M24).
 */
export function valueToHeirs(
  modeledAssets: number,
  eligibleNetDeathBenefit: number,
  modeledDebts: number,
  explicitCosts = 0,
): number {
  return modeledAssets + eligibleNetDeathBenefit - modeledDebts - explicitCosts;
}
