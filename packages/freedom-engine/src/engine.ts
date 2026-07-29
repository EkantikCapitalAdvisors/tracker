/**
 * The recompute graph (§7.2): one pure, deterministic engine run producing a
 * single consistent EngineResult. Any input mutation reruns everything;
 * modules cannot disagree because they all render this one object (§P3).
 * No I/O, no clock — deterministic on EngineInput alone.
 */

import { displayedPace, glidePath, monthsToGoal, netRealReturn, projectCurve, requiredPace } from "./annuity.js";
import { compareStrategies, evaluateDebt } from "./debts.js";
import { evaluateGatePanel } from "./gates.js";
import { evaluateEstate, beneficiaryAudit } from "./estate.js";
import { evaluateLegacy } from "./legacy.js";
import { computeMetrics } from "./metrics.js";
import { investedAt, investedByYear, obligationsAt, type ModelBInputs } from "./modelB.js";
import { bufferYears as computeBufferYears, fundedRatio as computeFundedRatio, guardrailState, yearsFunded } from "./distribution.js";
import { driftFlags, paceBand } from "./offtrack.js";
import { DEFAULT_POLICIES, type EnginePolicies } from "./policies.js";
import { evaluatePhase } from "./phase.js";
import { evaluateResilience } from "./resilience.js";
import { evaluateRules } from "./rules.js";
import { computeScore } from "./score.js";
import type {
  DataConfidence,
  EngineInput,
  EngineResult,
  FeasibilityVerdict,
  Flag,
  Gate,
  PlanMode,
  Range,
} from "./types.js";

export const ENGINE_VERSION = "0.1.0";

export function computeEngineResult(
  input: EngineInput,
  policies: EnginePolicies = DEFAULT_POLICIES,
): EngineResult {
  const { threshold, score: scorePolicy, spending, flag } = policies;
  const m = computeMetrics(input, {
    emergencyTargetMonths: threshold.defaultEmergencyTargetMonths,
    highAprThreshold: threshold.highAprThreshold,
  });

  // --- Plan quantities (§M2) -------------------------------------------------
  const plan = input.plan;
  const freedomNumber: Range | null =
    plan?.freedomSpendingNeed && plan.planningWithdrawalRate && plan.planningWithdrawalRate > 0
      ? {
          low: plan.freedomSpendingNeed.low / plan.planningWithdrawalRate,
          high: plan.freedomSpendingNeed.high / plan.planningWithdrawalRate,
        }
      : null;
  const fMid = freedomNumber ? (freedomNumber.low + freedomNumber.high) / 2 : null;

  const realReturn =
    plan?.nominalGrossReturn !== undefined && plan.inflation !== undefined
      ? netRealReturn(plan.nominalGrossReturn, plan.inflation, plan.feeDrag ?? 0, plan.taxDrag ?? 0)
      : null;
  const iMonthly = realReturn !== null ? realReturn / 12 : null;

  const dateMid = plan?.freedomDateMonths
    ? Math.round((plan.freedomDateMonths.low + plan.freedomDateMonths.high) / 2)
    : null;

  const coverageRatio =
    plan?.reliableNonPortfolioIncome !== undefined &&
    plan.freedomSpendingNeed &&
    plan.freedomSpendingNeed.low > 0
      ? plan.reliableNonPortfolioIncome / ((plan.freedomSpendingNeed.low + plan.freedomSpendingNeed.high) / 2)
      : null;

  const freedomProgress = fMid !== null && fMid > 0 ? m.currentCapital / fMid : null;

  // Required pace range: cheapest (low number, latest date) to steepest.
  let requiredPaceRange: Range | null = null;
  if (freedomNumber && plan?.freedomDateMonths && iMonthly !== null) {
    const nLate = Math.max(1, Math.round(plan.freedomDateMonths.high));
    const nEarly = Math.max(1, Math.round(plan.freedomDateMonths.low));
    requiredPaceRange = {
      low: requiredPace(m.currentCapital, iMonthly, nLate, freedomNumber.low),
      high: requiredPace(m.currentCapital, iMonthly, nEarly, freedomNumber.high),
    };
  }
  const displayedPaceRange: Range | null = requiredPaceRange
    ? { low: displayedPace(requiredPaceRange.low), high: displayedPace(requiredPaceRange.high) }
    : null;

  // --- Model B invested stream (§M11) ---------------------------------------
  const plannedSurplus = m.plannedSavingsMonthly ?? Math.max(0, m.surplusMonthly ?? 0);
  const modelBInputs: ModelBInputs = {
    plannedSurplusMonthly:
      plannedSurplus + (input.debts ?? []).reduce((s, d) => s + (d.balance > 0 ? d.minPayment + (d.extraPayment ?? 0) : 0), 0),
    debts: input.debts ?? [],
    goals: input.goals ?? [],
    expectedMonthlyReturn: iMonthly ?? 0,
  };
  const horizonMonths = threshold.horizonYears * 12;
  const contribution = (t: number): number => investedAt(modelBInputs, t);

  // --- Trajectory (§M3) ------------------------------------------------------
  let projectedFreedomMonths: Range | null = null;
  let projectedDateDeltaMonths: number | null = null;
  if (freedomNumber && iMonthly !== null) {
    const monthsLow = monthsToGoal(m.currentCapital, iMonthly, freedomNumber.low, horizonMonths, contribution);
    const monthsHigh = monthsToGoal(m.currentCapital, iMonthly, freedomNumber.high, horizonMonths, contribution);
    projectedFreedomMonths = {
      low: monthsLow ?? horizonMonths,
      high: monthsHigh ?? horizonMonths,
    };
    if (fMid !== null && dateMid !== null) {
      const mid = monthsToGoal(m.currentCapital, iMonthly, fMid, horizonMonths, contribution);
      projectedDateDeltaMonths = (mid ?? horizonMonths) - dateMid;
    }
  }

  // Glide path & pace ratio against the frozen plan baseline (§9.1).
  let paceRatio: number | null = null;
  let glideNow: number | null = null;
  if (freedomNumber && iMonthly !== null && dateMid !== null && fMid !== null) {
    const baseline = plan?.baseline;
    if (baseline && baseline.monthsSincePlanStart > 0) {
      const nAtCreation = baseline.monthsSincePlanStart + dateMid;
      const mStar0 = requiredPace(baseline.capitalAtPlanStart, iMonthly, nAtCreation, fMid);
      glideNow = glidePath(baseline.capitalAtPlanStart, iMonthly, mStar0, baseline.monthsSincePlanStart);
      paceRatio = glideNow > 0 ? m.currentCapital / glideNow : null;
    } else {
      // A plan created at this snapshot is exactly on its own glide path.
      glideNow = m.currentCapital;
      paceRatio = m.currentCapital > 0 ? 1 : null;
    }
  }

  const capitalByYearCurve =
    iMonthly !== null
      ? projectCurve(m.currentCapital, iMonthly, horizonMonths, contribution)
      : [];
  const capitalByYear: number[] = [];
  for (let y = 0; y * 12 < capitalByYearCurve.length; y++) {
    capitalByYear.push(capitalByYearCurve[y * 12] as number);
  }

  // --- Mode (§M2) ------------------------------------------------------------
  const retireMonths = plan?.retireDateMonths ?? dateMid;
  let mode: PlanMode = "ACCUMULATION";
  if (retireMonths !== null && retireMonths !== undefined) {
    if (retireMonths <= 0) mode = "DISTRIBUTION";
    else if (retireMonths <= threshold.redZoneYears * 12) mode = "RED_ZONE";
  }

  // --- Distribution quantities (§M20/§M21) ----------------------------------
  const sp = input.spendingPlan;
  const netSpendAnnual =
    sp?.retirementSpendAnnual !== undefined
      ? Math.max(0, sp.retirementSpendAnnual - (sp.reliableIncomeAnnual ?? 0))
      : null;
  const distributionApplicable = mode !== "ACCUMULATION" && netSpendAnnual !== null;
  const w0 = sp?.w0 ?? null;
  const currentWithdrawalRate =
    distributionApplicable && netSpendAnnual !== null && m.currentCapital > 0
      ? netSpendAnnual / m.currentCapital
      : null;
  const guardrail = distributionApplicable
    ? guardrailState(currentWithdrawalRate, w0, spending)
    : "NOT_YET";
  const bufferYearsValue =
    distributionApplicable && netSpendAnnual !== null && netSpendAnnual > 0
      ? computeBufferYears(m.bufferAssets, netSpendAnnual)
      : null;
  const horizonYearsRemaining = plan?.planHorizonYears ?? null;
  const fundedRatioValue =
    distributionApplicable && netSpendAnnual !== null && realReturn !== null && horizonYearsRemaining !== null
      ? computeFundedRatio(m.currentCapital, netSpendAnnual, realReturn, horizonYearsRemaining)
      : null;
  const yearsFundedValue =
    distributionApplicable && netSpendAnnual !== null && netSpendAnnual > 0 && realReturn !== null
      ? yearsFunded(m.currentCapital, realReturn, netSpendAnnual)
      : null;

  // --- Master metric & band (§9.1 handoff) ----------------------------------
  const masterRatio = mode === "DISTRIBUTION" ? fundedRatioValue : paceRatio;
  const band = paceBand(masterRatio, threshold);
  const fundedBand = paceBand(fundedRatioValue, threshold);

  // --- Rules (§M16) ----------------------------------------------------------
  const rules = evaluateRules(input, m, threshold);
  const failingRules = rules.rules
    .filter((r) => r.state === "WATCH" || r.state === "BLOCKED")
    .map((r) => ({ id: r.id, label: r.label, ...(r.fixModule ? { fixModule: r.fixModule } : {}) }));

  // --- Resilience (§M14) -----------------------------------------------------
  const resilience = evaluateResilience(input, m, threshold, mode, failingRules);

  // --- Phase (§5.2) ----------------------------------------------------------
  const fundedWithinBand =
    fundedRatioValue === null ? null : fundedRatioValue >= threshold.bands.onPace;
  const phase = evaluatePhase(input, m, threshold, fundedWithinBand);

  // --- Estate & legacy (§M23/§M24) ------------------------------------------
  const estate = evaluateEstate(input.estateDocs, m.hasMinorDependents);
  const beneficiaryFlags = beneficiaryAudit(input.accounts);
  const legacy = evaluateLegacy(input.legacy, m.earmarkedAssets);

  // --- Portfolio (§M10) ------------------------------------------------------
  const holdings = input.holdings ?? [];
  const holdingsWithReturn = holdings.filter((h) => h.expectedReturn !== undefined);
  const holdingsValue = holdings.reduce((s, h) => s + h.value, 0);
  const blended =
    holdingsWithReturn.length > 0 && holdingsValue > 0
      ? holdingsWithReturn.reduce((s, h) => s + h.value * (h.expectedReturn as number), 0) /
        holdingsWithReturn.reduce((s, h) => s + h.value, 0)
      : null;
  // Mismatch is nominal-vs-nominal: blended holding returns vs the plan's
  // nominal gross assumption (§M10) — never mixed with the real plan rate.
  const returnMismatch =
    blended !== null && plan?.nominalGrossReturn !== undefined ? blended - plan.nominalGrossReturn : null;
  const largestHoldingShare =
    holdingsValue > 0 ? Math.max(...holdings.map((h) => h.value)) / holdingsValue : null;
  const doublings =
    fMid !== null && m.currentCapital > 0 && fMid > 0 ? Math.log2(fMid / m.currentCapital) : null;
  const doublingYears = blended !== null && blended > 0 ? 72 / (100 * blended) : null;

  // --- Automation (§M7) ------------------------------------------------------
  const routedMonthly = (input.automationRules ?? [])
    .filter((r) => r.attested)
    .reduce((s, r) => s + r.amountMonthly, 0);
  const paceMid =
    displayedPaceRange !== null ? (displayedPaceRange.low + displayedPaceRange.high) / 2 : null;
  const paceFundedShare =
    paceMid !== null && paceMid > 0 && (input.automationRules?.length ?? 0) > 0
      ? routedMonthly / paceMid
      : null;

  // --- Feasibility panel (§M1) ----------------------------------------------
  const feasibilityGates: Gate[] = [
    {
      id: "spending-need",
      label: "Freedom spending need entered",
      state: plan?.freedomSpendingNeed ? "CLEAR" : "NOT_YET",
      fix: "Enter a spending range in the Freedom Plan",
    },
    {
      id: "freedom-date",
      label: "Freedom date chosen",
      state: plan?.freedomDateMonths ? "CLEAR" : "NOT_YET",
      fix: "Choose a date range in the Freedom Plan",
    },
    {
      id: "assumptions",
      label: "Return and inflation assumptions set",
      state: realReturn !== null ? "CLEAR" : "NOT_YET",
      fix: "Review assumptions in the Freedom Plan",
    },
    {
      id: "capital-entered",
      label: "Current long-term capital entered",
      state: (input.accounts?.length ?? 0) > 0 || (input.holdings?.length ?? 0) > 0 ? "CLEAR" : "NOT_YET",
      fix: "Add accounts in Savings & Allocation",
    },
    {
      id: "date-reachable",
      label: "Current behavior reaches the number by the date",
      userTarget: true,
      state:
        projectedDateDeltaMonths === null
          ? "NOT_YET"
          : projectedDateDeltaMonths <= 0
            ? "CLEAR"
            : "WATCH",
      value: projectedDateDeltaMonths,
      threshold: 0,
      fix: "Compare levers in Scenarios & Accelerator",
    },
  ];
  const feasibilityPanel = evaluateGatePanel(feasibilityGates);
  const feasibility: FeasibilityVerdict =
    feasibilityPanel.rollup === "INSUFFICIENT_DATA"
      ? "INSUFFICIENT_DATA"
      : feasibilityPanel.rollup === "CLEAR"
        ? "FEASIBLE_IN_BASE_CASE"
        : feasibilityGates.some((g) => g.state === "NOT_YET" && g.id !== "date-reachable")
          ? "INSUFFICIENT_DATA"
          : "REQUIRES_CHANGE";

  // --- Flags (§9.2) ----------------------------------------------------------
  const drift = driftFlags(
    {
      band,
      savingsRate: m.savingsRate,
      savingsRateTarget: m.savingsRate !== null ? threshold.defaultSavingsRateTarget : null,
      automationShareOfPace: paceFundedShare,
      returnMismatch,
      emergencyMonths: m.emergencyMonths,
      emergencyTargetMonths: m.emergencyTargetMonths,
      emergencyCriticalMonths: threshold.emergencyCriticalMonths,
      projectedDateDeltaMonths,
      bufferYears: bufferYearsValue,
      dataAgeMonths: input.dataAgeMonths ?? null,
    },
    threshold,
  );
  const legacyFlags: Flag[] =
    legacy.state === "PARTIAL" || legacy.state === "UNFUNDED"
      ? [
          {
            code: "LEGACY_UNDERFUNDED",
            severity: 3,
            module: "M24",
            message: "Legacy target set but not fully funded",
            fixModule: "M24",
          },
        ]
      : [];
  const flags: Flag[] = [...resilience.tripwires, ...drift, ...beneficiaryFlags, ...legacyFlags];
  flags.sort((a, b) => a.severity - b.severity);
  const bindingConstraint = flags[0] ?? null;

  // --- Score (§M15) ----------------------------------------------------------
  const scoreResult = computeScore(
    {
      paceOrFundingRatio: masterRatio,
      progress: freedomProgress,
      cashFlowMarginRatio:
        m.savingsRate !== null ? m.savingsRate / threshold.defaultSavingsRateTarget : null,
      foundationShare:
        rules.foundationApplicable > 0 ? rules.foundationOnTrack / rules.foundationApplicable : null,
      followThroughRate: input.followThroughRate ?? null,
      openSeverity1Tripwires: resilience.tripwires.length,
      band,
    },
    scorePolicy,
  );

  // --- Data confidence -------------------------------------------------------
  const present = [input.cashFlow, input.accounts, input.debts, input.plan, input.resilience].filter(
    (x) => x !== undefined,
  ).length;
  const stale = (input.dataAgeMonths ?? 0) * 30 > 45;
  const dataConfidence: DataConfidence = stale
    ? "LOW"
    : present >= 4
      ? "HIGH"
      : present >= 2
        ? "MEDIUM"
        : "LOW";

  return {
    engineVersion: ENGINE_VERSION,
    policyVersions: {
      threshold: threshold.version,
      score: scorePolicy.version,
      flag: flag.version,
      spending: spending.version,
    },
    mode,
    phase,
    plan: {
      freedomNumber,
      netRealReturn: realReturn,
      requiredPace: requiredPaceRange,
      displayedPace: displayedPaceRange,
      coverageRatio,
      freedomProgress,
      feasibility,
      feasibilityPanel,
    },
    trajectory: {
      projectedFreedomMonths,
      projectedDateDeltaMonths,
      paceRatio,
      band,
      glideNow,
      capitalByYear,
    },
    debts: {
      perDebt: (input.debts ?? []).map(evaluateDebt),
      interestLeakMonthly: m.interestLeakMonthly,
      weightedApr: m.weightedApr,
      strategies: compareStrategies(input.debts ?? []),
    },
    cashFlow: {
      essentialsRatio: m.essentialsRatio,
      savingsRate: m.savingsRate,
      surplusMonthly: m.surplusMonthly,
    },
    allocation: {
      emergencyMonths: m.emergencyMonths,
      runwayYears: m.runwayYears,
      idleCashAboveFloor: m.idleCashAboveFloor,
    },
    automation: {
      routedMonthly,
      paceFundedShare,
    },
    income: {
      totalAnnual: m.totalIncomeAnnual,
      concentration: m.incomeConcentration,
      passiveAnnual: m.passiveIncomeAnnual,
      passiveCoverageOfNeed:
        plan?.freedomSpendingNeed && plan.freedomSpendingNeed.low > 0
          ? m.passiveIncomeAnnual / ((plan.freedomSpendingNeed.low + plan.freedomSpendingNeed.high) / 2)
          : null,
    },
    portfolio: {
      blendedExpectedReturn: blended,
      returnVsPlanMismatch: returnMismatch,
      doublingsNeeded: doublings,
      doublingYears,
      largestHoldingShare,
    },
    modelB: {
      investedMonthlyNow: investedAt(modelBInputs, 0),
      investedByYear: investedByYear(modelBInputs, Math.min(threshold.horizonYears, 40)),
      obligationsMonthlyNow: obligationsAt(modelBInputs, 0),
    },
    resilience,
    rules,
    score: scoreResult,
    distribution: {
      applicable: distributionApplicable,
      w0,
      currentWithdrawalRate,
      guardrail,
      bufferYears: bufferYearsValue,
      fundedRatio: fundedRatioValue,
      fundedBand,
      yearsFunded: yearsFundedValue,
    },
    estate: {
      readinessScore: estate.readinessScore,
      componentStates: estate.componentStates,
      beneficiaryFlags,
      bindingGap: estate.bindingGap,
    },
    legacy: {
      state: legacy.state,
      fundingRatio: legacy.fundingRatio,
      legacyGapAfterInsurance: legacy.legacyGapAfterInsurance,
      requiredEarmark: legacy.requiredEarmark,
      newlyUnearmarked: legacy.newlyUnearmarked,
    },
    flags,
    bindingConstraint,
    dataConfidence,
  };
}
