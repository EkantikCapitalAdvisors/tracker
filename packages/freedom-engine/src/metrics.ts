/**
 * Shared derived metrics (§8.1 catalog) — computed once, consumed by the
 * rules engine, resilience engine, phase engine, and score (§P3: no module
 * keeps a private copy of shared state).
 */

import { interestLeakMonthly, weightedApr } from "./debts.js";
import type { EngineInput } from "./types.js";

export interface HouseholdMetrics {
  netIncomeMonthly: number | null;
  essentialsMonthly: number | null;
  discretionaryMonthly: number | null;
  surplusMonthly: number | null;
  plannedSavingsMonthly: number | null;
  savingsRate: number | null;
  essentialsRatio: number | null;
  /** Truthful liquidity (§M14): accessible, non-retirement-locked balances. */
  accessibleReserves: number;
  emergencyMonths: number | null;
  emergencyTargetMonths: number;
  runwayYears: number | null;
  currentCapital: number;
  earmarkedAssets: number;
  bufferAssets: number;
  speculativeBalance: number;
  storageBalance: number;
  idleCashAboveFloor: number | null;
  totalIncomeAnnual: number;
  incomeConcentration: number | null;
  passiveIncomeAnnual: number;
  interestLeakMonthly: number;
  weightedApr: number | null;
  totalDebt: number;
  highAprDebt: number;
  hasMissedMinimum: boolean;
  hasMinorDependents: boolean;
  netWorth: number | null;
}

export function computeMetrics(
  input: EngineInput,
  defaults: { emergencyTargetMonths: number; highAprThreshold: number },
): HouseholdMetrics {
  const cf = input.cashFlow ?? {};
  const netIncomeMonthly = cf.netIncomeMonthly ?? null;
  const essentialsMonthly = cf.essentialsMonthly ?? null;
  const discretionaryMonthly = cf.discretionaryMonthly ?? null;
  const plannedSavingsMonthly = cf.plannedMonthlySavings ?? null;

  const surplusMonthly =
    netIncomeMonthly !== null && essentialsMonthly !== null
      ? netIncomeMonthly - essentialsMonthly - (discretionaryMonthly ?? 0)
      : null;

  const savingsRate =
    plannedSavingsMonthly !== null && netIncomeMonthly !== null && netIncomeMonthly > 0
      ? plannedSavingsMonthly / netIncomeMonthly
      : null;

  const essentialsRatio =
    essentialsMonthly !== null && netIncomeMonthly !== null && netIncomeMonthly > 0
      ? essentialsMonthly / netIncomeMonthly
      : null;

  const accounts = input.accounts ?? [];
  const sum = (f: (b: (typeof accounts)[number]) => boolean): number =>
    accounts.filter(f).reduce((s, a) => s + a.balance, 0);

  // Truthful liquidity: emergency + storage; never retirement-locked (§M14).
  const accessibleReserves = sum((a) => a.purpose === "emergency" || a.purpose === "storage");
  const emergencyMonths =
    essentialsMonthly !== null && essentialsMonthly > 0
      ? accessibleReserves / essentialsMonthly
      : null;

  const holdingsValue = (input.holdings ?? []).reduce((s, h) => s + h.value, 0);
  const capitalBases = (input.incomeStreams ?? []).reduce((s, i) => s + (i.capitalBase ?? 0), 0);
  const currentCapital =
    sum((a) => a.purpose === "compounding" || a.purpose === "retirement" || a.purpose === "speculative") +
    holdingsValue;

  const streams = input.incomeStreams ?? [];
  const totalIncomeAnnual = streams.reduce((s, i) => s + i.annualIncome, 0);
  const topStream = streams.reduce((m, i) => Math.max(m, i.annualIncome), 0);
  const incomeConcentration =
    totalIncomeAnnual > 0 && streams.length > 0 ? topStream / totalIncomeAnnual : null;
  const passiveIncomeAnnual = streams
    .filter((i) => i.type === "passive" || (i.capitalBase ?? 0) > 0)
    .reduce((s, i) => s + i.annualIncome, 0);

  const debts = input.debts ?? [];
  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
  const highAprDebt = debts
    .filter((d) => d.apr > defaults.highAprThreshold)
    .reduce((s, d) => s + d.balance, 0);

  const emergencyTargetMonths =
    input.resilience?.emergencyTargetMonths ?? defaults.emergencyTargetMonths;

  const annualEssentials = essentialsMonthly !== null ? essentialsMonthly * 12 : null;
  const runwayYears =
    annualEssentials !== null && annualEssentials > 0 ? accessibleReserves / annualEssentials : null;

  const emergencyFloor =
    essentialsMonthly !== null ? essentialsMonthly * emergencyTargetMonths : null;
  const idleCashAboveFloor =
    emergencyFloor !== null ? Math.max(0, accessibleReserves - emergencyFloor) : null;

  const netWorth =
    accounts.length > 0 || holdingsValue > 0 || capitalBases > 0 || debts.length > 0
      ? sum(() => true) + holdingsValue + capitalBases - totalDebt
      : null;

  return {
    netIncomeMonthly,
    essentialsMonthly,
    discretionaryMonthly,
    surplusMonthly,
    plannedSavingsMonthly,
    savingsRate,
    essentialsRatio,
    accessibleReserves,
    emergencyMonths,
    emergencyTargetMonths,
    runwayYears,
    currentCapital,
    earmarkedAssets: sum((a) => a.earmarkedForLegacy === true),
    bufferAssets: sum((a) => a.bufferTagged === true),
    speculativeBalance: sum((a) => a.purpose === "speculative"),
    storageBalance: sum((a) => a.purpose === "storage"),
    idleCashAboveFloor,
    totalIncomeAnnual,
    incomeConcentration,
    passiveIncomeAnnual,
    interestLeakMonthly: interestLeakMonthly(debts),
    weightedApr: weightedApr(debts),
    totalDebt,
    highAprDebt,
    hasMissedMinimum: debts.some((d) => d.missedMinimumUnresolved === true),
    hasMinorDependents: (input.resilience?.dependents ?? 0) > 0,
    netWorth,
  };
}
