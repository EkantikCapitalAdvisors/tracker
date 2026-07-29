/**
 * Debt engine (§M5): amortization schedules, payoff strategies, interest leak,
 * and the time-bounded debt-service stream consumed by Model B (§M11).
 */

import { amortizedPayment, payoffMonths, totalInterest } from "./annuity.js";
import type { Debt, DebtResult, DebtStrategyOutcome } from "./types.js";

/** Monthly interest leak (§M4): Σ balance × apr / 12. */
export function interestLeakMonthly(debts: Debt[]): number {
  return debts.reduce((sum, d) => sum + (d.balance * d.apr) / 12, 0);
}

/** Balance-weighted APR (§8.1). Null when there is no debt. */
export function weightedApr(debts: Debt[]): number | null {
  const total = debts.reduce((s, d) => s + d.balance, 0);
  if (total <= 0) return null;
  return debts.reduce((s, d) => s + d.balance * d.apr, 0) / total;
}

/** Effective monthly payment on a debt, honoring an amortize-to-deadline override. */
export function debtMonthlyPayment(debt: Debt): number {
  const base = debt.minPayment + (debt.extraPayment ?? 0);
  if (debt.amortizeYears && debt.amortizeYears > 0) {
    const deadline = amortizedPayment(debt.balance, debt.apr, debt.amortizeYears * 12);
    return Math.max(base, deadline);
  }
  return base;
}

/** Per-debt result card (§M5 outputs). */
export function evaluateDebt(debt: Debt): DebtResult {
  const payment = debtMonthlyPayment(debt);
  const n = payoffMonths(debt.balance, debt.apr, payment);
  const result: DebtResult = {
    name: debt.name,
    balance: debt.balance,
    apr: debt.apr,
    totalMonthlyPayment: payment,
    payoffMonths: n,
    totalInterest: totalInterest(debt.balance, debt.apr, payment),
    monthlyInterest: (debt.balance * debt.apr) / 12,
  };
  if (debt.amortizeYears && debt.amortizeYears > 0) {
    result.requiredDeadlinePayment = amortizedPayment(debt.balance, debt.apr, debt.amortizeYears * 12);
  }
  return result;
}

interface SimDebt {
  balance: number;
  apr: number;
  minPayment: number;
}

/**
 * Month-by-month payoff simulation under a strategy: total budget = Σ current
 * payments; extra above minimums targets one debt at a time (rate-ordered for
 * avalanche, balance-ordered for snowball); a retired debt's payment rolls
 * into the remaining stack. Returns debt-free month and total interest.
 */
function simulateStrategy(
  debts: Debt[],
  order: (a: SimDebt, b: SimDebt) => number,
  budget: number,
  horizonMonths: number,
): { debtFreeMonths: number | null; totalInterest: number } {
  const sims: SimDebt[] = debts
    .filter((d) => d.balance > 0)
    .map((d) => ({ balance: d.balance, apr: d.apr, minPayment: d.minPayment }));
  let interest = 0;
  for (let t = 0; t < horizonMonths; t++) {
    if (sims.every((s) => s.balance <= 0)) return { debtFreeMonths: t, totalInterest: interest };
    const open = sims.filter((s) => s.balance > 0).sort(order);
    let available = budget;
    // Minimums first (interest accrual then payment, monthly convention).
    for (const s of open) {
      const accrued = (s.balance * s.apr) / 12;
      interest += accrued;
      s.balance += accrued;
      const pay = Math.min(Math.max(s.minPayment, 0), s.balance, available);
      s.balance -= pay;
      available -= pay;
    }
    // Extra to the strategy target(s) in order.
    for (const s of open) {
      if (available <= 0) break;
      if (s.balance <= 0) continue;
      const pay = Math.min(available, s.balance);
      s.balance -= pay;
      available -= pay;
    }
  }
  return {
    debtFreeMonths: sims.every((s) => s.balance <= 0) ? horizonMonths : null,
    totalInterest: interest,
  };
}

/** Avalanche vs snowball vs minimums (§M5 strategy comparison). */
export function compareStrategies(debts: Debt[], horizonMonths = 1200): DebtStrategyOutcome[] {
  const active = debts.filter((d) => d.balance > 0);
  if (active.length === 0) {
    return (["avalanche", "snowball", "minimums"] as const).map((strategy) => ({
      strategy,
      debtFreeMonths: 0,
      totalInterest: 0,
    }));
  }
  const fullBudget = active.reduce((s, d) => s + debtMonthlyPayment(d), 0);
  const minBudget = active.reduce((s, d) => s + d.minPayment, 0);
  const avalanche = simulateStrategy(active, (a, b) => b.apr - a.apr, fullBudget, horizonMonths);
  const snowball = simulateStrategy(active, (a, b) => a.balance - b.balance, fullBudget, horizonMonths);
  const minimums = simulateStrategy(active, (a, b) => b.apr - a.apr, minBudget, horizonMonths);
  return [
    { strategy: "avalanche", debtFreeMonths: avalanche.debtFreeMonths, totalInterest: avalanche.totalInterest },
    { strategy: "snowball", debtFreeMonths: snowball.debtFreeMonths, totalInterest: snowball.totalInterest },
    { strategy: "minimums", debtFreeMonths: minimums.debtFreeMonths, totalInterest: minimums.totalInterest },
  ];
}

/**
 * Time-bounded monthly debt service (§M11 Model B): each debt contributes its
 * payment until its own payoff month, then drops off — the "virtuous loop".
 */
export function debtServiceAt(debts: Debt[], month: number): number {
  let service = 0;
  for (const d of debts) {
    if (d.balance <= 0) continue;
    const payment = debtMonthlyPayment(d);
    const n = payoffMonths(d.balance, d.apr, payment);
    // A payment that never retires the debt persists across the horizon.
    if (n === null || month < n) service += payment;
  }
  return service;
}
