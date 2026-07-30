/**
 * Cash-flow-matched comparator (§5.7 approved pattern; §M5 prepay-vs-invest).
 *
 * Two mutually exclusive strategies from the same decision date, every cash
 * flow matched by month, compared by NPV at a disclosed discount rate with a
 * numerically solved break-even return. The deprecated prototype shortcuts
 * ("effective cost", "~2×") are NOT implemented here — they exist only as
 * regression fixtures in test/deprecated-prototype/ (§5.7, §15.1).
 *
 * Discounting convention: month-indexed flows, monthly compounding at the
 * annual rate r: PV = cf / (1 + r/12)^month. Under this convention the §15.1
 * golden property holds exactly: for finance-and-stay-invested vs
 * pay-cash-and-invest-the-payments, the break-even net return equals the
 * contractual monthly-compounded APR.
 */

import { amortizedPayment, annuityFV } from "./annuity.js";
import type { ComparatorVerdict } from "./types.js";

export interface CashFlow {
  /** Month index from the decision date (0 = today). */
  month: number;
  amount: number;
}

/** NPV of month-dated flows at an annual rate, monthly compounding. */
export function npv(flows: CashFlow[], annualRate: number): number {
  const j = annualRate / 12;
  return flows.reduce((sum, f) => sum + f.amount / Math.pow(1 + j, f.month), 0);
}

/**
 * Solve the annual rate where NPV(flows) = 0 by bisection over [lo, hi].
 * Returns null when the function does not change sign on the bracket.
 */
export function solveRate(
  flows: CashFlow[],
  lo = -0.5,
  hi = 1.5,
  tolerance = 1e-9,
): number | null {
  let fLo = npv(flows, lo);
  const fHi = npv(flows, hi);
  if (fLo === 0) return lo;
  if (fHi === 0) return hi;
  if (fLo * fHi > 0) return null;
  let a = lo;
  let b = hi;
  for (let iter = 0; iter < 200; iter++) {
    const mid = (a + b) / 2;
    const fMid = npv(flows, mid);
    if (Math.abs(fMid) < tolerance || (b - a) / 2 < tolerance) return mid;
    if (fLo * fMid <= 0) {
      b = mid;
    } else {
      a = mid;
      fLo = fMid;
    }
  }
  return (a + b) / 2;
}

/**
 * Differential cash flows of "finance and stay invested" MINUS
 * "pay cash and invest the payments" for a purchase of `principal` financed
 * at `apr` over `months`:
 *   month 0: +principal (capital retained in the market)
 *   months 1..n: −payment (the loan payment the financer sends instead of investing)
 * Both strategies spend the identical out-of-pocket amount every month, so
 * this differential IS the matched comparison (§5.7).
 */
export function financeVsCashFlows(principal: number, apr: number, months: number): CashFlow[] {
  const pmt = amortizedPayment(principal, apr, months);
  const flows: CashFlow[] = [{ month: 0, amount: principal }];
  for (let t = 1; t <= months; t++) flows.push({ month: t, amount: -pmt });
  return flows;
}

/**
 * Break-even net investment return for financing vs paying cash: the annual
 * rate where the matched-flow NPV difference is zero. §15.1 golden property:
 * this equals the contractual APR.
 */
export function breakEvenReturn(principal: number, apr: number, months: number): number | null {
  return solveRate(financeVsCashFlows(principal, apr, months));
}

export interface PrepayVsInvestInputs {
  /** Debt balance the extra payment would target. */
  balance: number;
  /** Contractual APR (fraction). */
  apr: number;
  /** Current total monthly payment on the debt. */
  currentPayment: number;
  /** Net investment return cases (fractions): downside / base / upside. */
  netReturnCases: { down: number; base: number; up: number };
  /** True when any safety gate (emergency floor, obligations, W5) fails. */
  safetyGateFailed?: boolean;
  /** ±dead band on break-even distance (fraction), from ThresholdPolicy. */
  deadBand: number;
}

export interface PrepayVsInvestResult {
  verdict: ComparatorVerdict;
  /** Break-even net annual return — equals the contractual APR by construction. */
  breakEven: number | null;
  /** NPV advantage of investing over prepaying at each return case, per extra dollar today. */
  npvAdvantagePerDollar: { down: number; base: number; up: number } | null;
}

/**
 * Prepay-vs-invest verdict (§M5). A dollar of prepayment earns the debt's
 * contractual monthly-compounded APR risk-free until payoff; the matched
 * alternative invests the same dollar at an uncertain net return. The verdict
 * compares the base-case return to the break-even (= APR) inside a dead band;
 * a favorable base case never clears a failed safety gate (§5.7).
 */
export function prepayVsInvest(inputs: PrepayVsInvestInputs): PrepayVsInvestResult {
  if (inputs.safetyGateFailed) {
    return { verdict: "SAFETY_GATE_BLOCKED", breakEven: null, npvAdvantagePerDollar: null };
  }
  if (
    !(inputs.balance > 0) ||
    !(inputs.currentPayment > 0) ||
    !Number.isFinite(inputs.apr) ||
    inputs.apr < 0 ||
    inputs.currentPayment <= (inputs.balance * inputs.apr) / 12
  ) {
    return { verdict: "INSUFFICIENT_DATA", breakEven: null, npvAdvantagePerDollar: null };
  }
  // Horizon: months until the debt retires at the current payment.
  const j = inputs.apr / 12;
  const n =
    j === 0
      ? inputs.balance / inputs.currentPayment
      : -Math.log(1 - (inputs.balance * j) / inputs.currentPayment) / Math.log(1 + j);
  const months = Math.max(1, Math.ceil(n));
  const breakEven = inputs.apr;
  // FV advantage per extra dollar over the payoff horizon, then discounted:
  // invest grows at g; prepay grows at the contractual APR (a dollar of
  // principal removed stops accruing j per month).
  const advantage = (g: number): number => {
    const invest = Math.pow(1 + g / 12, months);
    const prepay = Math.pow(1 + j, months);
    return (invest - prepay) / Math.pow(1 + g / 12, months);
  };
  const cases = {
    down: advantage(inputs.netReturnCases.down),
    base: advantage(inputs.netReturnCases.base),
    up: advantage(inputs.netReturnCases.up),
  };
  const distance = inputs.netReturnCases.base - breakEven;
  let verdict: ComparatorVerdict;
  if (Math.abs(distance) <= inputs.deadBand) verdict = "CLOSE_CALL";
  else if (distance > 0) verdict = "INVESTING_FAVORED_IN_BASE_CASE";
  else verdict = "PREPAY_FAVORED";
  return { verdict, breakEven, npvAdvantagePerDollar: cases };
}

/** FV of investing a monthly payment stream at an annual rate (education/tests). */
export function paymentStreamFV(payment: number, annualRate: number, months: number): number {
  return annuityFV(payment, annualRate / 12, months);
}
