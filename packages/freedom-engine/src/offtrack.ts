/**
 * Off-track engine (§9): pace/funded bands and the drift-flag catalog.
 * Mode-aware: the master metric is the pace ratio in accumulation and the
 * funded ratio in distribution — same four bands, same thresholds (§9.1).
 *
 * The engine detects conditions; alert lifecycle (debounce, dedupe, notify,
 * resolve) is the app layer's job (§9.3). Trend-based flags that need two
 * consecutive periods are emitted here as conditions; the app layer applies
 * the consecutive-period rule against snapshots.
 */

import type { ThresholdPolicy } from "./policies.js";
import type { Flag, PaceBand } from "./types.js";

export function paceBand(ratio: number | null, policy: ThresholdPolicy): PaceBand {
  if (ratio === null || !Number.isFinite(ratio)) return "NOT_YET";
  if (ratio >= policy.bands.ahead) return "AHEAD";
  if (ratio >= policy.bands.onPace) return "ON_PACE";
  if (ratio >= policy.bands.watch) return "WATCH";
  return "OFF_PACE";
}

export interface DriftInputs {
  band: PaceBand;
  savingsRate: number | null;
  savingsRateTarget: number | null;
  automationShareOfPace: number | null;
  returnMismatch: number | null;
  emergencyMonths: number | null;
  emergencyTargetMonths: number;
  emergencyCriticalMonths: number;
  projectedDateDeltaMonths: number | null;
  bufferYears: number | null;
  dataAgeMonths: number | null;
}

/** Severity-2 drift conditions currently true (§9.2). */
export function driftFlags(inputs: DriftInputs, policy: ThresholdPolicy): Flag[] {
  const flags: Flag[] = [];
  if (inputs.band === "WATCH") {
    flags.push({ code: "PACE_WATCH", severity: 2, module: "M18", message: "Pace has entered the watch band", fixModule: "M13" });
  }
  if (inputs.band === "OFF_PACE") {
    flags.push({ code: "PACE_OFF", severity: 2, module: "M18", message: "Pace is off track", fixModule: "M13" });
  }
  if (
    inputs.projectedDateDeltaMonths !== null &&
    inputs.projectedDateDeltaMonths > policy.paceSlipMonths
  ) {
    flags.push({
      code: "PACE_SLIP",
      severity: 2,
      module: "M3",
      message: `Projected date is ${Math.round(inputs.projectedDateDeltaMonths)} months behind the chosen date`,
      metric: "projectedDateDeltaMonths",
      value: inputs.projectedDateDeltaMonths,
      threshold: policy.paceSlipMonths,
      fixModule: "M13",
    });
  }
  if (
    inputs.savingsRate !== null &&
    inputs.savingsRateTarget !== null &&
    inputs.savingsRate < inputs.savingsRateTarget
  ) {
    flags.push({
      code: "SAVINGS_DRIFT",
      severity: 2,
      module: "M4",
      message: "Savings rate below plan",
      metric: "savingsRate",
      value: inputs.savingsRate,
      threshold: inputs.savingsRateTarget,
      fixModule: "M4",
    });
  }
  if (inputs.automationShareOfPace !== null && inputs.automationShareOfPace < policy.automationGapShare) {
    flags.push({
      code: "AUTOMATION_GAP",
      severity: 2,
      module: "M7",
      message: "Automation funds less than the required pace share",
      metric: "automationShareOfPace",
      value: inputs.automationShareOfPace,
      threshold: policy.automationGapShare,
      fixModule: "M7",
    });
  }
  if (inputs.returnMismatch !== null && Math.abs(inputs.returnMismatch) > policy.returnMismatchThreshold) {
    flags.push({
      code: "RETURN_MISMATCH",
      severity: 2,
      module: "M10",
      message: "Portfolio blended return differs from the plan assumption",
      metric: "returnMismatch",
      value: inputs.returnMismatch,
      threshold: policy.returnMismatchThreshold,
      fixModule: "M10",
    });
  }
  if (
    inputs.emergencyMonths !== null &&
    inputs.emergencyMonths >= inputs.emergencyCriticalMonths &&
    inputs.emergencyMonths < inputs.emergencyTargetMonths
  ) {
    flags.push({
      code: "EMERGENCY_LOW",
      severity: 2,
      module: "M6",
      message: "Emergency reserve below target",
      metric: "emergencyMonths",
      value: inputs.emergencyMonths,
      threshold: inputs.emergencyTargetMonths,
      fixModule: "M6",
    });
  }
  if (inputs.bufferYears !== null && inputs.bufferYears < policy.bufferLowYears) {
    flags.push({
      code: "BUFFER_LOW",
      severity: 2,
      module: "M21",
      message: "Down-market buffer below one year of spending",
      metric: "bufferYears",
      value: inputs.bufferYears,
      threshold: policy.bufferLowYears,
      fixModule: "M21",
    });
  }
  if (inputs.dataAgeMonths !== null && inputs.dataAgeMonths * 30 > 45) {
    flags.push({
      code: "DATA_STALE",
      severity: 3,
      module: "M17",
      message: "Balances not confirmed recently — verdicts dimmed",
      metric: "dataAgeMonths",
      value: inputs.dataAgeMonths,
      fixModule: "M17",
    });
  }
  return flags;
}
