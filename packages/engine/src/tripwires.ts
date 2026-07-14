/**
 * Tripwire board — Spec v1.0 §2/§3. Each evaluator is pure and consumes
 * closing/official readings only. Missing inputs (null) mark the tripwire
 * `dataGap` and leave it QUIET — the pipeline fails open, never blocks.
 */

import type { Thresholds } from './thresholds.js';
import {
  TRIPWIRE_ROLES,
  type EngineReadings,
  type EngineState,
  type TripwireResult,
  type TripwireStatus,
} from './types.js';

function result(
  id: TripwireResult['id'],
  status: TripwireStatus,
  reading: string,
  threshold: string,
  note?: string,
  dataGap?: boolean,
): TripwireResult {
  return {
    id,
    role: TRIPWIRE_ROLES[id],
    status,
    reading,
    threshold,
    ...(note ? { note } : {}),
    ...(dataGap ? { dataGap: true } : {}),
  };
}

export function evalCreditImpulse(r: EngineReadings, t: Thresholds): TripwireResult {
  const th = `Δ3m ≥ +${t.CREDIT_IMPULSE_DELTA3M_BP}bp`;
  if (r.baa10ySpreadDelta3mBp === null) {
    return result('CREDIT_IMPULSE', 'QUIET', 'DATA GAP', th, undefined, true);
  }
  const d = r.baa10ySpreadDelta3mBp;
  const status: TripwireStatus = d >= t.CREDIT_IMPULSE_DELTA3M_BP ? 'TRIGGERED' : 'QUIET';
  return result('CREDIT_IMPULSE', status, `Δ3m ${d >= 0 ? '+' : ''}${d.toFixed(0)}bp`, th);
}

export function evalCreditCrisis(r: EngineReadings, t: Thresholds): TripwireResult {
  const th = `level > ${t.CREDIT_CRISIS_LEVEL_BP}bp`;
  if (r.baa10ySpreadBp === null) {
    return result('CREDIT_CRISIS', 'QUIET', 'DATA GAP', th, undefined, true);
  }
  const status: TripwireStatus = r.baa10ySpreadBp > t.CREDIT_CRISIS_LEVEL_BP ? 'TRIGGERED' : 'QUIET';
  return result('CREDIT_CRISIS', status, `${r.baa10ySpreadBp.toFixed(0)}bp`, th);
}

export function evalPolicySwitch(r: EngineReadings, t: Thresholds): TripwireResult {
  const th = `CPI YoY > ${t.POLICY_CPI_YOY_PCT.toFixed(1)}%`;
  if (r.cpiYoYPct === null) {
    return result('POLICY_SWITCH', 'QUIET', 'DATA GAP', th, undefined, true);
  }
  const constrained = r.cpiYoYPct > t.POLICY_CPI_YOY_PCT;
  return result(
    'POLICY_SWITCH',
    constrained ? 'CONSTRAINED' : 'QUIET',
    `CPI YoY ${r.cpiYoYPct.toFixed(1)}% (provisional)`,
    th,
    constrained ? 'Overlay, not a trigger — shifts depth range to upper half' : 'Policy FREE',
  );
}

export function evalRateShock(
  r: EngineReadings,
  t: Thresholds,
  creditImpulseTriggered: boolean,
): TripwireResult {
  const th = `10y Δ3m ≥ +${t.RATE_SHOCK_DELTA3M_BP}bp (flag only)`;
  if (r.tenYearDelta3mBp === null) {
    return result('RATE_SHOCK', 'QUIET', 'DATA GAP', th, undefined, true);
  }
  const flagged = r.tenYearDelta3mBp >= t.RATE_SHOCK_DELTA3M_BP;
  if (!flagged) {
    return result('RATE_SHOCK', 'QUIET', `Δ3m ${r.tenYearDelta3mBp >= 0 ? '+' : ''}${r.tenYearDelta3mBp.toFixed(0)}bp`, th);
  }
  const stateRelevant = r.capeTopTercile === true || creditImpulseTriggered;
  return result(
    'RATE_SHOCK',
    'ARMED',
    `Δ3m +${r.tenYearDelta3mBp.toFixed(0)}bp`,
    th,
    stateRelevant
      ? 'Combined condition met (CAPE top tercile or credit TRIGGERED) — state-relevant'
      : 'Standalone flag — NOT state-relevant (56% hit rate)',
  );
}

export function evalSahmGate(r: EngineReadings, t: Thresholds): TripwireResult {
  const th = `≥ ${t.SAHM_ARM_LEVEL.toFixed(2)} arms; fires with claims +${t.SAHM_CLAIMS_YOY_CONFIRM_PCT}% YoY AND breadth negative`;
  if (r.sahmValue === null) {
    return result('SAHM_GATE', 'QUIET', 'DATA GAP', th, undefined, true);
  }
  if (r.sahmValue < t.SAHM_ARM_LEVEL) {
    return result('SAHM_GATE', 'QUIET', `Sahm ${r.sahmValue.toFixed(2)}`, th);
  }
  const claimsConfirm =
    r.claims4wkYoYPct !== null && r.claims4wkYoYPct >= t.SAHM_CLAIMS_YOY_CONFIRM_PCT;
  const breadthKnown = r.revisionBreadthNegative !== null;
  if (claimsConfirm && r.revisionBreadthNegative === true) {
    return result(
      'SAHM_GATE',
      'FIRED',
      `Sahm ${r.sahmValue.toFixed(2)} · claims +${r.claims4wkYoYPct!.toFixed(1)}% YoY · breadth negative`,
      th,
    );
  }
  return result(
    'SAHM_GATE',
    'ARMED',
    `Sahm ${r.sahmValue.toFixed(2)}`,
    th,
    breadthKnown && r.claims4wkYoYPct !== null
      ? 'ARMED — confirmation not met'
      : 'ARMED — confirmation incomplete',
    !breadthKnown || r.claims4wkYoYPct === null,
  );
}

/** Router status is computed by the state machine; this renders the card. */
export function evalFailedRecovery(state: EngineState, t: Thresholds): TripwireResult {
  const th = `no peak regain in ${t.ROUTER_REGAIN_WINDOW_TD}td AND lower low in ${t.ROUTER_LOWER_LOW_WINDOW_TD}td`;
  switch (state.routerStatus) {
    case 'INACTIVE':
      return result('FAILED_RECOVERY', 'QUIET', 'Inactive (Tier 0)', th);
    case 'OPEN':
      return result(
        'FAILED_RECOVERY',
        'ARMED',
        `Open — td ${state.tradingDaysSinceCross} since cross (${state.crossDate})`,
        th,
      );
    case 'CLEAN':
      return result('FAILED_RECOVERY', 'QUIET', 'Clean recovery', th, 'P(≥10%) = 7% cohort');
    case 'ESCALATE':
      return result('FAILED_RECOVERY', 'ESCALATE', `Escalated (cross ${state.crossDate})`, th, 'P(≥10%) = 58% cohort');
  }
}

export function evalRvAccel(r: EngineReadings, t: Thresholds): TripwireResult {
  const th = `RV10/RV60 ≥ ${t.RV_ACCEL_RATIO}`;
  if (r.rv10rv60 === null) {
    return result('RV_ACCEL', 'QUIET', 'DATA GAP', th, undefined, true);
  }
  const status: TripwireStatus = r.rv10rv60 >= t.RV_ACCEL_RATIO ? 'TRIGGERED' : 'QUIET';
  return result(
    'RV_ACCEL',
    status,
    `RV10/RV60 ${r.rv10rv60.toFixed(2)}`,
    th,
    status === 'TRIGGERED' ? 'Mechanical class engaged (activation context)' : undefined,
  );
}

export function evalVixConfirm(r: EngineReadings, t: Thresholds): TripwireResult {
  const th = `≥ ${t.VIX_CONFIRM_LEVEL} sustained ${t.VIX_CONFIRM_CLOSES} closes`;
  if (r.vixSustained3Closes === null) {
    return result('VIX_CONFIRM', 'QUIET', 'DATA GAP', th, 'CONFIRMER — can never fire state', true);
  }
  return result(
    'VIX_CONFIRM',
    r.vixSustained3Closes ? 'TRIGGERED' : 'QUIET',
    r.vixSustained3Closes ? 'Sustained ≥30 for 3 closes' : 'Below sustained-30 condition',
    th,
    'CONFIRMER — grades the tier; can never fire a state transition',
  );
}

export function evalCapeHigh(r: EngineReadings): TripwireResult {
  const th = 'top trailing-30y tercile';
  if (r.capeTopTercile === null) {
    return result('CAPE_HIGH', 'QUIET', 'DATA GAP', th, undefined, true);
  }
  return result(
    'CAPE_HIGH',
    r.capeTopTercile ? 'ARMED' : 'QUIET',
    r.capeTopTercile ? 'Top tercile — HIGH' : 'Below top tercile',
    th,
    'Layer-0 multiplier (×3 event-start frequency); zero depth power',
  );
}

export function evalCurveInverted(r: EngineReadings): TripwireResult {
  const th = '10y − 3m < 0';
  if (r.curve10y3mBp === null) {
    return result('CURVE_INVERTED', 'QUIET', 'DATA GAP', th, undefined, true);
  }
  return result(
    'CURVE_INVERTED',
    r.curve10y3mBp < 0 ? 'ARMED' : 'QUIET',
    `${r.curve10y3mBp.toFixed(0)}bp`,
    th,
    'Layer-0 regime flag — never timing',
  );
}

/** Full board, in Spec §3 order. */
export function evaluateTripwires(
  r: EngineReadings,
  state: EngineState,
  t: Thresholds,
): TripwireResult[] {
  const creditImpulse = evalCreditImpulse(r, t);
  return [
    creditImpulse,
    evalCreditCrisis(r, t),
    evalPolicySwitch(r, t),
    evalRateShock(r, t, creditImpulse.status === 'TRIGGERED'),
    evalSahmGate(r, t),
    evalFailedRecovery(state, t),
    evalRvAccel(r, t),
    evalVixConfirm(r, t),
    evalCapeHigh(r),
    evalCurveInverted(r),
  ];
}
