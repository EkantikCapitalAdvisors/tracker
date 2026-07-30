/**
 * V2 Advanced Strategy Lab — like-for-like refinance SCREEN (Appendix A).
 *
 * Release-gated per §5.7/§16: this is a quick screen for a same-balance,
 * similar-structure comparison ONLY, and every decision surface must run the
 * full cash-flow-matched comparator. Pure math lives here; the app layer owns
 * the release gate. Not exported as a consumer verdict.
 */

export type RefinanceScreenState = "CANDIDATE" | "UNLIKELY" | "CLOSE_CALL";

export interface RefinanceScreenResult {
  state: RefinanceScreenState;
  afterTaxApr: number;
  spread: number;
  /** True when the state is identical under itemizing = true and false. */
  robustToDeductibility: boolean;
  /** "Flips on deductibility" flag (§README harvest list) when not robust. */
  flipsOnDeductibility: boolean;
}

function screenState(spread: number, deadBand: number): RefinanceScreenState {
  if (spread > deadBand) return "CANDIDATE";
  if (spread < -deadBand) return "UNLIKELY";
  return "CLOSE_CALL";
}

/**
 * afterTaxApr = deductible && itemizing ? apr·(1 − marginalRate) : apr;
 * spread = afterTaxApr − alternativeRate; dead band ±100 bp.
 * Deductibility is USER-CONFIRMED, never inferred from a debt name (§M5).
 */
export function refinanceScreen(
  apr: number,
  alternativeRate: number,
  userConfirmedDeductible: boolean,
  itemizing: boolean,
  marginalRate: number,
  deadBand = 0.01,
): RefinanceScreenResult {
  const afterTax = (deduct: boolean, itemize: boolean): number =>
    deduct && itemize ? apr * (1 - marginalRate) : apr;
  const afterTaxApr = afterTax(userConfirmedDeductible, itemizing);
  const spread = afterTaxApr - alternativeRate;
  const state = screenState(spread, deadBand);
  const stateIfItemizing = screenState(
    afterTax(userConfirmedDeductible, true) - alternativeRate,
    deadBand,
  );
  const stateIfNot = screenState(
    afterTax(userConfirmedDeductible, false) - alternativeRate,
    deadBand,
  );
  const robust = stateIfItemizing === stateIfNot;
  return {
    state,
    afterTaxApr,
    spread,
    robustToDeductibility: robust,
    flipsOnDeductibility: !robust,
  };
}
