/**
 * Education-layer identities (§5.5, Appendix A) — display/teaching values,
 * never decision rules.
 */

/** Rule of 72 doubling time in years (≈ 72 / percentage return). */
export function ruleOf72Years(annualReturn: number): number | null {
  if (!(annualReturn > 0)) return null;
  return 72 / (100 * annualReturn);
}

/** Doublings needed = log2(freedomNumber / currentCapital). */
export function doublingsNeeded(freedomNumber: number, currentCapital: number): number | null {
  if (!(freedomNumber > 0) || !(currentCapital > 0)) return null;
  return Math.log2(freedomNumber / currentCapital);
}

/**
 * Volatility-drag reference pair (§5.5, §15.1): same arithmetic mean return,
 * radically different outcomes. Steady r for `years` vs alternating pairs of
 * (up, down) with the same mean. Returns terminal values.
 */
export function volatilityDragPair(
  principal: number,
  years: number,
  steady: number,
  up: number,
  down: number,
): { steadyOutcome: number; alternatingOutcome: number } {
  const steadyOutcome = principal * Math.pow(1 + steady, years);
  let alternating = principal;
  for (let y = 0; y < years; y++) {
    alternating *= y % 2 === 0 ? 1 + up : 1 + down;
  }
  return { steadyOutcome, alternatingOutcome: alternating };
}
