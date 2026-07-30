/**
 * Core annuity / projection math (spec Appendix A; normative per §M3/§M5).
 *
 * All rates are fractions. Monthly rate = annual / 12. The projection
 * convention is end-of-month contribution: C[t+1] = C[t]·(1+i) + m[t].
 * Every closed form here is the exact solution of that recurrence, so the
 * §15.1 round-trip identities hold to floating-point precision.
 */

/** Net real return identity (Appendix A). Components are explicit; never mixed units. */
export function netRealReturn(
  nominalGrossReturn: number,
  inflation: number,
  feeDrag = 0,
  taxDrag = 0,
): number {
  const nominalNet = nominalGrossReturn - feeDrag - taxDrag;
  return (1 + nominalNet) / (1 + inflation) - 1;
}

/** Amortized payment: pmt = P·j/(1−(1+j)^−n); zero-rate branch pmt = P/n. */
export function amortizedPayment(principal: number, apr: number, months: number): number {
  if (months <= 0) throw new RangeError("months must be > 0");
  const j = apr / 12;
  if (j === 0) return principal / months;
  return (principal * j) / (1 - Math.pow(1 + j, -months));
}

/**
 * Payoff months from a given payment: n = −ln(1 − P·j/pmt)/ln(1+j).
 * Returns null when the payment does not cover interest (pmt ≤ P·j).
 */
export function payoffMonths(principal: number, apr: number, payment: number): number | null {
  if (principal <= 0) return 0;
  if (payment <= 0) return null;
  const j = apr / 12;
  if (j === 0) return principal / payment;
  if (payment <= principal * j) return null;
  return -Math.log(1 - (principal * j) / payment) / Math.log(1 + j);
}

/** Total interest paid retiring `principal` at `apr` with constant `payment`. */
export function totalInterest(principal: number, apr: number, payment: number): number | null {
  const n = payoffMonths(principal, apr, payment);
  if (n === null) return null;
  return payment * n - principal;
}

/** Future value of an ordinary annuity: pmt·((1+i)^n − 1)/i, zero-rate pmt·n. */
export function annuityFV(payment: number, i: number, n: number): number {
  if (i === 0) return payment * n;
  return (payment * (Math.pow(1 + i, n) - 1)) / i;
}

/** Present value of an ordinary annuity: pmt·(1−(1+i)^−n)/i, zero-rate pmt·n. */
export function annuityPV(payment: number, i: number, n: number): number {
  if (i === 0) return payment * n;
  return (payment * (1 - Math.pow(1 + i, -n))) / i;
}

/**
 * Required pace (Appendix A): the constant monthly contribution m* with
 * C[n] = F under the projection recurrence. i is the MONTHLY rate.
 * m* = (F − C0·(1+i)^n)·i/((1+i)^n − 1); zero-rate m* = (F − C0)/n.
 * May be negative (already past the target); display layer clamps (§M3).
 */
export function requiredPace(C0: number, i: number, n: number, F: number): number {
  if (n <= 0) throw new RangeError("n must be > 0");
  if (i === 0) return (F - C0) / n;
  const growth = Math.pow(1 + i, n);
  return ((F - C0 * growth) * i) / (growth - 1);
}

/** Displayed pace = max(0, m*) (Appendix A). */
export function displayedPace(mStar: number): number {
  return Math.max(0, mStar);
}

/** Glide path (§9.1): G(t) = C0·(1+i)^t + m*·((1+i)^t − 1)/i, zero-rate branch. */
export function glidePath(C0: number, i: number, mStar: number, t: number): number {
  const growth = Math.pow(1 + i, t);
  if (i === 0) return C0 + mStar * t;
  return C0 * growth + (mStar * (growth - 1)) / i;
}

/** One projection step: C[t+1] = C[t]·(1+i) + m. */
export function projectStep(capital: number, i: number, m: number): number {
  return capital * (1 + i) + m;
}

/**
 * Project a capital curve for `months` steps with a per-month contribution
 * function. Returns the curve including t = 0 (length months + 1).
 */
export function projectCurve(
  C0: number,
  i: number,
  months: number,
  contribution: (t: number) => number,
): number[] {
  const curve: number[] = [C0];
  let c = C0;
  for (let t = 0; t < months; t++) {
    c = projectStep(c, i, contribution(t));
    curve.push(c);
  }
  return curve;
}

/**
 * gFM (§M13): months-iterated time-to-goal. Returns the first month index at
 * which capital ≥ goal, or null if unreached within horizonMonths.
 */
export function monthsToGoal(
  C0: number,
  i: number,
  goal: number,
  horizonMonths: number,
  contribution: (t: number) => number,
): number | null {
  if (C0 >= goal) return 0;
  let c = C0;
  for (let t = 0; t < horizonMonths; t++) {
    c = projectStep(c, i, contribution(t));
    if (c >= goal) return t + 1;
  }
  return null;
}
