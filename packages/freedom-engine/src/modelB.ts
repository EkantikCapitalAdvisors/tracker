/**
 * Model B — dollar-for-dollar invested stream (§M11, normative).
 *
 * invested(t) = max(0, plannedSurplus − debtService(t) − goalFunding(t)),
 * all values monthly, today's dollars. Obligations are time-bounded: when a
 * debt pays off or a goal reaches its target year, its full payment rejoins
 * compounding automatically — the "virtuous loop".
 */

import { debtServiceAt } from "./debts.js";
import { goalFundingAt } from "./goals.js";
import type { Debt, Goal } from "./types.js";

export interface ModelBInputs {
  /** Planned monthly surplus available for obligations + investing. */
  plannedSurplusMonthly: number;
  debts: Debt[];
  goals: Goal[];
  /** Monthly expected return used for goal solves. */
  expectedMonthlyReturn: number;
}

export function investedAt(inputs: ModelBInputs, month: number): number {
  const debtService = debtServiceAt(inputs.debts, month);
  const goalFunding = goalFundingAt(inputs.goals, month, inputs.expectedMonthlyReturn);
  return Math.max(0, inputs.plannedSurplusMonthly - debtService - goalFunding);
}

export function obligationsAt(inputs: ModelBInputs, month: number): number {
  return (
    debtServiceAt(inputs.debts, month) +
    goalFundingAt(inputs.goals, month, inputs.expectedMonthlyReturn)
  );
}

/** Yearly invested amounts (12 × monthly at each year start) for the drop-off table. */
export function investedByYear(inputs: ModelBInputs, years: number): number[] {
  const rows: number[] = [];
  for (let y = 0; y < years; y++) rows.push(investedAt(inputs, y * 12) * 12);
  return rows;
}
