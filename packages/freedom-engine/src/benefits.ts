/**
 * Social Security claim-age math (§M22) — statutory factors, education only.
 *
 * Reduction: 5/9 of 1% per month for the first 36 months before FRA, then
 * 5/12 of 1% per month; delayed credits 2/3 of 1% per month past FRA to 70.
 * Breakeven ages are NOMINAL (no COLA, taxes, or discounting) and labeled so.
 * Content-versioned: factors are statutory for FRA-67 cohorts (born 1960+).
 */

export const BENEFITS_CONTENT_VERSION = "ssa-factors-fra67-v1";

/** Claim-age factor relative to PIA. claimAge and fra in years (months allowed as fractions). */
export function claimAgeFactor(claimAge: number, fra = 67): number {
  const months = Math.round((claimAge - fra) * 12);
  if (months < 0) {
    const early = -months;
    const first36 = Math.min(36, early);
    const beyond = Math.max(0, early - 36);
    return 1 - (first36 * (5 / 9) + beyond * (5 / 12)) / 100;
  }
  const delayed = Math.min(months, Math.round((70 - fra) * 12));
  return 1 + (delayed * (2 / 3)) / 100;
}

/** The rendered factor table (§M22): ages 62–70 for FRA 67. */
export function factorTable(fra = 67): Array<{ age: number; factor: number }> {
  const rows: Array<{ age: number; factor: number }> = [];
  for (let age = 62; age <= 70; age++) rows.push({ age, factor: claimAgeFactor(age, fra) });
  return rows;
}

/** Monthly benefit at a claim age from the user's own SSA-statement PIA. */
export function monthlyBenefit(piaMonthly: number, claimAge: number, fra = 67): number {
  return piaMonthly * claimAgeFactor(claimAge, fra);
}

/**
 * Nominal cumulative-benefit breakeven age between two claim strategies
 * (disclosed as ignoring COLA, taxes, and discounting):
 * factorA·(A − ageA) = factorB·(A − ageB).
 * Returns null when the later claim never catches up (factorB ≤ factorA).
 */
export function breakevenAge(claimA: number, claimB: number, fra = 67): number | null {
  const [early, late] = claimA < claimB ? [claimA, claimB] : [claimB, claimA];
  const fEarly = claimAgeFactor(early, fra);
  const fLate = claimAgeFactor(late, fra);
  if (fLate <= fEarly) return null;
  return (fLate * late - fEarly * early) / (fLate - fEarly);
}
