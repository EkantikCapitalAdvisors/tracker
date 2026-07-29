/**
 * Big-ticket goal funding (§M12): the level monthly contribution that reaches
 * each goal's target by its target year — the same annuity solve as m*,
 * scoped to the goal — feeding Model B as a time-bounded obligation.
 */

import { requiredPace } from "./annuity.js";
import type { Goal } from "./types.js";

export interface GoalSchedule {
  name: string;
  monthlyContribution: number;
  monthsRemaining: number;
  /** Funded-so-far vs straight-line schedule, 1.0 = on schedule. */
  scheduleRatio: number | null;
}

export function goalSchedule(goal: Goal, expectedMonthlyReturn: number): GoalSchedule {
  const months = Math.max(1, Math.round(goal.targetYear * 12));
  const funded = goal.fundedSoFar ?? 0;
  const i = goal.expectedCagr !== undefined ? goal.expectedCagr / 12 : expectedMonthlyReturn;
  const m = Math.max(0, requiredPace(funded, i, months, goal.target));
  // Straight-line expectation: by "now" (schedule start) nothing is owed yet,
  // so the schedule ratio compares funded share to time elapsed — callers
  // with no elapsed-time context receive null.
  return {
    name: goal.name,
    monthlyContribution: m,
    monthsRemaining: months,
    scheduleRatio: goal.target > 0 ? funded / goal.target : null,
  };
}

/** Time-bounded monthly goal funding at a given month (§M11). */
export function goalFundingAt(goals: Goal[], month: number, expectedMonthlyReturn: number): number {
  let total = 0;
  for (const g of goals) {
    const s = goalSchedule(g, expectedMonthlyReturn);
    if (month < s.monthsRemaining) total += s.monthlyContribution;
  }
  return total;
}
