/**
 * Freedom Health Score (§M15, Appendix A ScorePolicy v1) — 0–100, honestly
 * constructed. Missing data receives NO zero: inapplicable/missing components
 * reweight transparently. Severity-1 tripwires cap the DISPLAYED band only;
 * the stored base score is never mutated.
 */

import type { ScorePolicy } from "./policies.js";
import type { DataConfidence, PaceBand, ScoreComponent, ScoreResult } from "./types.js";

export interface ScoreInputs {
  /** Pace ratio (accumulation) or funded ratio (distribution); null if unknown. */
  paceOrFundingRatio: number | null;
  /** Freedom progress: capital / freedom number; null if unknown. */
  progress: number | null;
  /** Savings rate vs target: rate / target, capped; null if unknown. */
  cashFlowMarginRatio: number | null;
  /** Foundation rules on-track share (0..1); null when none applicable. */
  foundationShare: number | null;
  /** Follow-through rate (0..1); null when no commitment history. */
  followThroughRate: number | null;
  openSeverity1Tripwires: number;
  band: PaceBand;
}

/** Map a ratio to 0–100 with 1.0 = full credit, linear below, gentle bonus-free cap. */
function ratioScore(ratio: number): number {
  return Math.max(0, Math.min(100, ratio * 100));
}

export function computeScore(inputs: ScoreInputs, policy: ScorePolicy): ScoreResult {
  const components: ScoreComponent[] = [
    {
      id: "paceOrFunding",
      weight: policy.weights.paceOrFunding,
      value: inputs.paceOrFundingRatio === null ? null : ratioScore(inputs.paceOrFundingRatio),
    },
    {
      id: "progress",
      weight: policy.weights.progress,
      value: inputs.progress === null ? null : ratioScore(inputs.progress),
    },
    {
      id: "cashFlowMargin",
      weight: policy.weights.cashFlowMargin,
      value: inputs.cashFlowMarginRatio === null ? null : ratioScore(inputs.cashFlowMarginRatio),
    },
    {
      id: "foundation",
      weight: policy.weights.foundation,
      value: inputs.foundationShare === null ? null : ratioScore(inputs.foundationShare),
    },
    {
      id: "followThrough",
      weight: policy.weights.followThrough,
      value: inputs.followThroughRate === null ? null : ratioScore(inputs.followThroughRate),
    },
  ];

  const computable = components.filter((c) => c.value !== null);
  const totalWeight = components.reduce((s, c) => s + c.weight, 0);
  const computableWeight = computable.reduce((s, c) => s + c.weight, 0);
  const completeness = totalWeight > 0 ? computableWeight / totalWeight : 0;

  let base: number | null = null;
  if (completeness >= policy.completenessThreshold && computableWeight > 0) {
    base =
      computable.reduce((s, c) => s + c.weight * (c.value as number), 0) / computableWeight;
  }

  // Display-band cap (Appendix A): max(capFloor, 1 − perTripwire·n) of 100.
  const capShare = Math.max(policy.capFloor, 1 - policy.capPerTripwire * inputs.openSeverity1Tripwires);
  const cap = capShare * 100;
  const capApplied = base !== null && inputs.openSeverity1Tripwires > 0 && base > cap;
  const displayed = base === null ? null : capApplied ? cap : base;

  const confidence: DataConfidence = completeness >= 0.8 ? "HIGH" : completeness >= 0.5 ? "MEDIUM" : "LOW";

  return {
    base,
    displayed,
    components,
    completeness,
    confidence,
    capApplied,
    policyVersion: policy.version,
  };
}
