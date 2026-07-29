/**
 * @freedom/engine — public surface.
 *
 * Pure, deterministic, zero-I/O (spec §7.2/§14). The deprecated prototype
 * calculations (§5.7: "effective cost", "~2×") are deliberately NOT exported
 * anywhere in this package; they exist only as regression fixtures in
 * test/deprecated-prototype/ proving they stay dead.
 */

export * from "./types.js";
export * from "./policies.js";
export {
  netRealReturn,
  amortizedPayment,
  payoffMonths,
  totalInterest,
  annuityFV,
  annuityPV,
  requiredPace,
  displayedPace,
  glidePath,
  projectStep,
  projectCurve,
  monthsToGoal,
} from "./annuity.js";
export {
  interestLeakMonthly,
  weightedApr,
  debtMonthlyPayment,
  evaluateDebt,
  compareStrategies,
  debtServiceAt,
} from "./debts.js";
export { goalSchedule, goalFundingAt } from "./goals.js";
export { investedAt, obligationsAt, investedByYear, type ModelBInputs } from "./modelB.js";
export {
  npv,
  solveRate,
  financeVsCashFlows,
  breakEvenReturn,
  prepayVsInvest,
  paymentStreamFV,
  type CashFlow,
  type PrepayVsInvestInputs,
  type PrepayVsInvestResult,
} from "./comparator.js";
export { yearsFunded, pvOfSpend, fundedRatio, guardrailState, bufferYears } from "./distribution.js";
export {
  BENEFITS_CONTENT_VERSION,
  claimAgeFactor,
  factorTable,
  monthlyBenefit,
  breakevenAge,
} from "./benefits.js";
export { evaluateLegacy, valueToHeirs, type LegacyEvaluation } from "./legacy.js";
export { evaluateEstate, beneficiaryAudit, type EstateEvaluation } from "./estate.js";
export { evaluateGatePanel } from "./gates.js";
export { evaluateRules } from "./rules.js";
export { evaluatePhase } from "./phase.js";
export { evaluateResilience, type ResilienceEvaluation } from "./resilience.js";
export { computeScore, type ScoreInputs } from "./score.js";
export { paceBand, driftFlags, type DriftInputs } from "./offtrack.js";
export { ruleOf72Years, doublingsNeeded, volatilityDragPair } from "./education.js";
export { refinanceScreen, type RefinanceScreenResult, type RefinanceScreenState } from "./refinanceScreen.js";
export { computeMetrics, type HouseholdMetrics } from "./metrics.js";
export { computeEngineResult, ENGINE_VERSION } from "./engine.js";
