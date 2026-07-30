/**
 * Phase engine (§5.2, §M1): the five canonical phases with objective gates
 * plus attestations. A phase is a routing device, not a grade. Unanswered
 * attestations default to WATCH/NOT_YET (§P6); the engine reports gate chips
 * as CLEAR / WATCH / NOT_YET — never BLOCKED — for never-entered data.
 *
 * Observation-window stability (§5.2 "one imported day does not promote")
 * is enforced by the app layer over engine runs; the engine reports the
 * gates and the candidate phase for the current snapshot.
 */

import { evaluateGatePanel } from "./gates.js";
import type { ThresholdPolicy } from "./policies.js";
import type { HouseholdMetrics } from "./metrics.js";
import type { EngineInput, Gate, Phase, PhaseResult } from "./types.js";

function passes(gate: Gate): boolean {
  return gate.state === "CLEAR" || gate.state === "N_A";
}

function stabilizeExitGates(input: EngineInput, m: HouseholdMetrics, policy: ThresholdPolicy): Gate[] {
  const essentialsCovered: Gate = {
    id: "essentials-covered",
    label: "Essential obligations covered by current income",
    state:
      m.surplusMonthly === null
        ? "NOT_YET"
        : m.netIncomeMonthly !== null && m.essentialsMonthly !== null && m.netIncomeMonthly >= m.essentialsMonthly
          ? "CLEAR"
          : "WATCH",
    fix: "Enter income and essential spending in Money Flow",
  };
  const starterBuffer: Gate = {
    id: "starter-buffer",
    label: "Starter accessible buffer met",
    state:
      (input.accounts?.length ?? 0) === 0
        ? "NOT_YET"
        : m.accessibleReserves >= policy.starterBufferAmount
          ? "CLEAR"
          : "WATCH",
    value: m.accessibleReserves,
    threshold: policy.starterBufferAmount,
    fix: "Build the starter buffer in Savings & Allocation",
  };
  const noMissedMinimum: Gate = {
    id: "no-missed-minimum",
    label: "No unresolved missed minimum payment",
    state: input.debts === undefined ? "NOT_YET" : m.hasMissedMinimum ? "WATCH" : "CLEAR",
    fix: "Resolve the missed minimum in Debt Burndown",
  };
  return [essentialsCovered, starterBuffer, noMissedMinimum];
}

function secureExitGates(input: EngineInput, m: HouseholdMetrics, policy: ThresholdPolicy): Gate[] {
  const emergencyOnPlan: Gate = {
    id: "emergency-on-plan",
    label: "Personalized emergency target on plan",
    state:
      m.emergencyMonths === null
        ? "NOT_YET"
        : m.emergencyMonths >= Math.min(m.emergencyTargetMonths, policy.defaultEmergencyTargetMonths)
          ? "CLEAR"
          : "WATCH",
    value: m.emergencyMonths,
    threshold: m.emergencyTargetMonths,
    fix: "Fund the emergency reserve in Savings & Allocation",
  };
  const highCostPlanned: Gate = {
    id: "high-cost-debt-plan",
    label: "High-cost debt has a payoff plan",
    state:
      input.debts === undefined
        ? "NOT_YET"
        : (input.debts ?? []).some(
              (d) =>
                d.balance > 0 &&
                d.apr > policy.highAprThreshold &&
                !(d.payoffPlanAttested || (d.extraPayment ?? 0) > 0 || d.amortizeYears),
            )
          ? "WATCH"
          : "CLEAR",
    fix: "Set a payoff strategy in Debt Burndown",
  };
  const positiveSurplus: Gate = {
    id: "positive-surplus",
    label: "Positive monthly surplus or a dated path to it",
    state: m.surplusMonthly === null ? "NOT_YET" : m.surplusMonthly > 0 ? "CLEAR" : "WATCH",
    value: m.surplusMonthly,
    threshold: 0,
    fix: "Route surplus in Money Flow",
  };
  const protectionReviewed: Gate = {
    id: "protection-reviewed",
    label: "Applicable core protection reviewed",
    state: (() => {
      const r = input.resilience;
      if (!r) return "NOT_YET";
      const answers = [r.insuranceLifeReviewed, r.insuranceDisabilityReviewed, r.insuranceHealthReviewed];
      const applicable = answers.filter((a) => a !== undefined && a !== "not_applicable");
      if (applicable.length === 0) return "NOT_YET";
      return applicable.every((a) => a === "yes") ? "CLEAR" : "WATCH";
    })(),
    fix: "Review protection in Resilience",
  };
  return [emergencyOnPlan, highCostPlanned, positiveSurplus, protectionReviewed];
}

function accumulateExitGates(input: EngineInput, m: HouseholdMetrics): Gate[] {
  const contribution: Gate = {
    id: "long-term-contribution",
    label: "Positive automated/attested long-term contribution",
    state: (() => {
      const c = m.plannedSavingsMonthly ?? m.surplusMonthly;
      if (c === null) return "NOT_YET";
      return c > 0 ? "CLEAR" : "WATCH";
    })(),
    fix: "Automate the contribution in Automation",
  };
  const emergencyMaintained: Gate = {
    id: "emergency-maintained",
    label: "Emergency target maintained",
    state:
      m.emergencyMonths === null
        ? "NOT_YET"
        : m.emergencyMonths >= m.emergencyTargetMonths
          ? "CLEAR"
          : "WATCH",
    value: m.emergencyMonths,
    threshold: m.emergencyTargetMonths,
  };
  const assumptionsAcknowledged: Gate = {
    id: "assumptions-acknowledged",
    label: "Plan return and allocation assumptions acknowledged",
    state:
      input.plan?.nominalGrossReturn !== undefined && input.plan.inflation !== undefined ? "CLEAR" : "NOT_YET",
    fix: "Review assumptions in the Freedom Plan",
  };
  return [contribution, emergencyMaintained, assumptionsAcknowledged];
}

function distributeEntryGates(input: EngineInput, m: HouseholdMetrics, fundedWithinBand: boolean | null): Gate[] {
  const funded: Gate = {
    id: "income-plan-funded",
    label: "Retirement/income plan funded within the approved band",
    state: fundedWithinBand === null ? "NOT_YET" : fundedWithinBand ? "CLEAR" : "WATCH",
  };
  const buffer: Gate = {
    id: "buffer-and-draw-order",
    label: "Near-term spending buffer and draw order exist",
    state: (() => {
      const drawOrder = input.resilience?.drawOrderWritten;
      if (drawOrder === undefined) return "NOT_YET";
      return drawOrder === "yes" && m.bufferAssets > 0 ? "CLEAR" : "WATCH";
    })(),
    fix: "Write the draw order in Drawdown & Guardrails",
  };
  return [funded, buffer];
}

export function evaluatePhase(
  input: EngineInput,
  m: HouseholdMetrics,
  policy: ThresholdPolicy,
  fundedWithinBand: boolean | null,
): PhaseResult {
  const stabilize = stabilizeExitGates(input, m, policy);
  const secure = secureExitGates(input, m, policy);
  const accumulate = accumulateExitGates(input, m);
  const distribute = distributeEntryGates(input, m, fundedWithinBand);

  let phase: Phase = "STABILIZE";
  let exitGates: Gate[] = stabilize;
  if (stabilize.every(passes)) {
    phase = "SECURE";
    exitGates = secure;
    if (secure.every(passes)) {
      phase = "ACCUMULATE";
      exitGates = accumulate.concat(distribute);
      if (accumulate.every(passes) && distribute.every(passes)) {
        phase = "DISTRIBUTE";
        exitGates = [];
      }
    }
  }
  const gates = [...stabilize, ...secure, ...accumulate, ...distribute];
  // The rollup/binding logic is shared with every gate panel (§5.6).
  void evaluateGatePanel(gates);
  return { phase, gates, exitGates };
}
