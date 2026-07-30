/**
 * Distribution-mode math (§M20/§M21, §9.1 handoff, Appendix A).
 *
 * Candidate models: independent retirement-model review is required before V1
 * releases consumer surfaces built on these (§M20/§M21). The math itself is
 * §15.1 golden-pinned.
 */

import type { GuardrailState } from "./types.js";
import type { SpendingPolicy } from "./policies.js";

/**
 * Deterministic depletion solve (Appendix A "yearsFunded"): years a capital
 * base C sustains a real annual net spend S at net real return r, end-of-year
 * withdrawals. S ≤ C·r ⇒ Infinity (never depletes in this scenario).
 * Handles r = 0 (C/S) and r < 0 branches explicitly.
 */
export function yearsFunded(capital: number, r: number, annualNetSpend: number): number {
  if (annualNetSpend <= 0) return Infinity;
  if (capital <= 0) return 0;
  if (r <= -1) return 0; // total-loss rate: capital vaporizes before any withdrawal
  if (r === 0) return capital / annualNetSpend;
  if (r > 0 && annualNetSpend <= capital * r) return Infinity;
  // C_n = C(1+r)^n − S·((1+r)^n − 1)/r = 0  ⇒  n = −ln(1 − C·r/S)/ln(1+r).
  // Valid for r < 0 as well: both logs flip sign.
  return -Math.log(1 - (capital * r) / annualNetSpend) / Math.log(1 + r);
}

/** PV of a level real spend over `years` at rate r (ordinary annuity). */
export function pvOfSpend(annualNetSpend: number, r: number, years: number): number {
  if (!Number.isFinite(years)) return r > 0 ? annualNetSpend / r : Infinity;
  if (r === 0) return annualNetSpend * years;
  return (annualNetSpend * (1 - Math.pow(1 + r, -years))) / r;
}

/**
 * Funded ratio (§5.1, §9.1): capital / PV(remaining planned real net spend).
 * The distribution-mode master metric — same four bands as the pace ratio.
 */
export function fundedRatio(
  capital: number,
  annualNetSpend: number,
  r: number,
  remainingYears: number,
): number | null {
  const pv = pvOfSpend(annualNetSpend, r, remainingYears);
  if (!Number.isFinite(pv) || pv <= 0) return null;
  return capital / pv;
}

/**
 * Guardrail corridor state (§M21 candidate policy): WR above w0·(1+band) ⇒ a
 * spending cut is MODELED for acknowledgment; below w0·(1−band) ⇒ a raise is
 * modeled; otherwise base spending. The app never executes or prescribes.
 */
export function guardrailState(
  currentWithdrawalRate: number | null,
  w0: number | null,
  policy: SpendingPolicy,
): GuardrailState {
  if (currentWithdrawalRate === null || w0 === null || !(w0 > 0)) return "NOT_YET";
  const upper = w0 * (1 + policy.guardrailBandPct);
  const lower = w0 * (1 - policy.guardrailBandPct);
  // Corridor edges are inclusive; the epsilon keeps an exactly-on-the-edge
  // rate stable against binary floating-point representation (0.05·0.8 ≠ 0.04).
  const eps = 1e-9 * Math.max(1, w0);
  if (currentWithdrawalRate > upper + eps) return "CUT_MODELED";
  if (currentWithdrawalRate < lower - eps) return "RAISE_MODELED";
  return "BASE_SPENDING";
}

/** Buffer years (§5.1): accessible buffer assets / near-term annual net spend. */
export function bufferYears(bufferAssets: number, annualNetSpend: number): number | null {
  if (!(annualNetSpend > 0)) return null;
  return bufferAssets / annualNetSpend;
}
