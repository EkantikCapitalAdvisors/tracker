/**
 * Tier state machine — Spec v1.0 §3. Pure function, one evaluation per
 * market day, closing data only. Every transition rule here is FROZEN;
 * no discretionary logic, smoothing, or "improvements" may be added.
 *
 * Structural guarantee (Spec §1): symptomatic confirmers can never fire a
 * state transition. The transition logic below consumes `TransitionInputs`,
 * a type that DOES NOT CONTAIN the VIX confirmer, breadth, or correlation —
 * it is impossible to reference them there without widening the type.
 */

import { FROZEN_THRESHOLDS, type Thresholds } from './thresholds.js';
import { drawdownPct } from './indicators.js';
import { evaluateTripwires } from './tripwires.js';
import type {
  EngineReadings,
  EngineResult,
  EngineSideEffects,
  EngineState,
  RouterWindows,
  Tier,
  Transition,
  TripwireResult,
} from './types.js';

/**
 * The ONLY inputs the transition rules may read. Confirmer signals
 * (VIX_CONFIRM and friends) are structurally absent.
 */
interface TransitionInputs {
  drawdownPct: number;
  creditImpulseTriggered: boolean;
  creditCrisisTriggered: boolean;
  policyConstrained: boolean;
  sahmFired: boolean;
  routerEscalate: boolean;
  retracePct: number | null; // % of the decline retraced (Tier-2 exit)
  creditDelta3mBp: number | null;
  creditNarrowingWeeks: number | null;
  confirmedHigherLow: boolean;
  peakRegained: boolean;
  window30ClosedNoLowerLow: boolean;
}

export function initialEngineState(
  cycleHigh: number,
  cycleHighDate: string,
  asOfDate: string,
): EngineState {
  return {
    tier: 0,
    enteredAt: asOfDate,
    cycleHigh,
    cycleHighDate,
    crossDate: null,
    crossClose: null,
    tradingDaysSinceCross: 0,
    troughClose: null,
    troughDate: null,
    peakRegained: false,
    peakRegainedIn30: false,
    lowerLowMade: false,
    routerStatus: 'INACTIVE',
    routerDeadline30Date: null,
    routerDeadline60Date: null,
  };
}

/** Estimated calendar date for a trading-day offset (display only). */
function estimateCalendarDate(fromIso: string, tradingDays: number): string {
  const d = new Date(`${fromIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + Math.round(tradingDays * 1.4));
  return d.toISOString().slice(0, 10);
}

function statusOf(board: TripwireResult[], id: TripwireResult['id']) {
  const found = board.find((t) => t.id === id);
  if (!found) throw new Error(`tripwire ${id} missing from board`);
  return found.status;
}

export function computeState(
  readings: EngineReadings,
  priorState: EngineState,
  thresholds: Thresholds = FROZEN_THRESHOLDS,
): EngineResult {
  const t = thresholds;
  const transitions: Transition[] = [];
  const state: EngineState = { ...priorState };
  const date = readings.asOfDate;
  let routerResolution: 'CLEAN' | 'ESCALATE' | undefined;

  // ---- 1. Cycle-high maintenance -----------------------------------------
  // Tier 0 tracks the rolling 6-month closing high; once in Tier ≥1 the
  // cycle high is ANCHORED at entry — it is the regain reference.
  if (state.tier === 0) {
    state.cycleHigh = readings.cycleHigh;
    state.cycleHighDate = readings.cycleHighDate;
  }
  const dd = drawdownPct(readings.spClose, state.cycleHigh);

  // ---- 2. Router / decline bookkeeping (tier ≥ 1 only) --------------------
  if (state.tier >= 1 && state.crossDate !== null) {
    state.tradingDaysSinceCross += 1;
    if (state.troughClose === null || readings.spClose < state.troughClose) {
      state.troughClose = readings.spClose;
      state.troughDate = date;
    }
    if (state.crossClose !== null && readings.spClose < state.crossClose) {
      state.lowerLowMade = true;
    }
    if (readings.spClose >= state.cycleHigh) {
      state.peakRegained = true;
      if (state.tradingDaysSinceCross <= t.ROUTER_REGAIN_WINDOW_TD) {
        state.peakRegainedIn30 = true;
      }
    }
    // Router resolution. ESCALATE requires BOTH legs: no regain inside the
    // 30-td window (decidable only once it closes) AND a close below the
    // initial low (the first ≤−5% close) inside the 60-td window.
    if (state.routerStatus === 'OPEN') {
      const td = state.tradingDaysSinceCross;
      if (state.peakRegainedIn30) {
        state.routerStatus = 'CLEAN';
      } else if (
        td >= t.ROUTER_REGAIN_WINDOW_TD &&
        td <= t.ROUTER_LOWER_LOW_WINDOW_TD &&
        state.lowerLowMade
      ) {
        state.routerStatus = 'ESCALATE';
      } else if (td > t.ROUTER_LOWER_LOW_WINDOW_TD) {
        state.routerStatus = 'CLEAN'; // 60-td window closed without a lower low
      }
      if (state.routerStatus !== 'OPEN') {
        routerResolution = state.routerStatus as 'CLEAN' | 'ESCALATE';
      }
    }
  }

  // ---- 3. Tripwire board ---------------------------------------------------
  const board = evaluateTripwires(readings, state, t);

  // ---- 4. Transition inputs (confirmers structurally excluded) ------------
  const declineSpan =
    state.troughClose !== null && state.cycleHigh > state.troughClose
      ? state.cycleHigh - state.troughClose
      : null;
  const retracePct =
    declineSpan !== null && state.troughClose !== null
      ? ((readings.spClose - state.troughClose) / declineSpan) * 100
      : null;

  const inputs: TransitionInputs = {
    drawdownPct: dd,
    creditImpulseTriggered: statusOf(board, 'CREDIT_IMPULSE') === 'TRIGGERED',
    creditCrisisTriggered: statusOf(board, 'CREDIT_CRISIS') === 'TRIGGERED',
    policyConstrained: statusOf(board, 'POLICY_SWITCH') === 'CONSTRAINED',
    sahmFired: statusOf(board, 'SAHM_GATE') === 'FIRED',
    routerEscalate: state.routerStatus === 'ESCALATE',
    retracePct,
    creditDelta3mBp: readings.baa10ySpreadDelta3mBp,
    creditNarrowingWeeks: readings.baa10yNarrowingWeeks,
    confirmedHigherLow: readings.confirmedHigherLow === true,
    peakRegained: state.peakRegained,
    window30ClosedNoLowerLow:
      state.routerStatus !== 'INACTIVE' &&
      state.tradingDaysSinceCross >= t.ROUTER_REGAIN_WINDOW_TD &&
      !state.lowerLowMade &&
      !state.peakRegained,
  };

  // ---- 5. Escalations (highest satisfied entry wins; pass-throughs logged) -
  const tier3 =
    inputs.drawdownPct <= t.TIER3_ENTRY_DRAWDOWN_PCT ||
    (inputs.sahmFired && inputs.creditCrisisTriggered && inputs.policyConstrained);
  const tier2 =
    inputs.drawdownPct <= t.TIER2_ENTRY_DRAWDOWN_PCT ||
    (inputs.routerEscalate && inputs.creditImpulseTriggered);
  const tier1 = inputs.drawdownPct <= t.TIER1_ENTRY_DRAWDOWN_PCT;

  let target: Tier = state.tier;
  if (tier3) target = 3;
  else if (tier2 && state.tier < 2) target = 2;
  else if (tier1 && state.tier < 1) target = 1;

  const reasons: Record<Tier, string> = {
    0: '',
    1: `first close ≤ ${t.TIER1_ENTRY_DRAWDOWN_PCT.toFixed(1)}% below 6-month closing high (${dd.toFixed(1)}%)`,
    2:
      inputs.drawdownPct <= t.TIER2_ENTRY_DRAWDOWN_PCT
        ? `close ≤ ${t.TIER2_ENTRY_DRAWDOWN_PCT.toFixed(1)}% (${dd.toFixed(1)}%)`
        : 'failed-recovery ESCALATE + credit impulse TRIGGERED',
    3:
      inputs.drawdownPct <= t.TIER3_ENTRY_DRAWDOWN_PCT
        ? `close ≤ ${t.TIER3_ENTRY_DRAWDOWN_PCT.toFixed(1)}% (${dd.toFixed(1)}%)`
        : 'Sahm FIRED + credit crisis >250bp + policy CONSTRAINED',
  };

  let enteredTier1Now = false;
  if (target > state.tier) {
    let from = state.tier;
    while (from < target) {
      const to = (from + 1) as Tier;
      transitions.push({ from, to, date, reason: reasons[to] });
      from = to;
    }
    if (state.tier === 0) {
      // Tier-1 entry side effects: anchor the cross, open router windows.
      enteredTier1Now = true;
      state.crossDate = date;
      state.crossClose = readings.spClose;
      state.tradingDaysSinceCross = 0;
      state.troughClose = readings.spClose;
      state.troughDate = date;
      state.peakRegained = false;
      state.peakRegainedIn30 = false;
      state.lowerLowMade = false;
      state.routerStatus = 'OPEN';
      state.routerDeadline30Date = estimateCalendarDate(date, t.ROUTER_REGAIN_WINDOW_TD);
      state.routerDeadline60Date = estimateCalendarDate(date, t.ROUTER_LOWER_LOW_WINDOW_TD);
    }
    state.tier = target;
    state.enteredAt = date;
  } else {
    // ---- 6. De-escalations (evaluated only when no escalation applies) ----
    if (state.tier === 1) {
      if (inputs.peakRegained) {
        transitions.push({ from: 1, to: 0, date, reason: 'close regained cycle high' });
        resetToTier0(state, readings, date);
      } else if (inputs.window30ClosedNoLowerLow) {
        transitions.push({
          from: 1,
          to: 0,
          date,
          reason: `${t.ROUTER_REGAIN_WINDOW_TD}-td window closed with no lower low`,
        });
        resetToTier0(state, readings, date);
      }
    } else if (state.tier === 2) {
      const retraceOk =
        inputs.retracePct !== null && inputs.retracePct >= t.TIER2_EXIT_RETRACE_PCT;
      const creditOk = inputs.creditDelta3mBp !== null && inputs.creditDelta3mBp <= 0;
      const impliedTier: Tier = tierImpliedByDrawdown(dd, t);
      if (retraceOk && creditOk && impliedTier < 2) {
        transitions.push({
          from: 2,
          to: impliedTier,
          date,
          reason: `${t.TIER2_EXIT_RETRACE_PCT}% retrace of decline with credit Δ3m ≤ 0`,
        });
        if (impliedTier === 0) resetToTier0(state, readings, date);
        else {
          state.tier = impliedTier;
          state.enteredAt = date;
        }
      }
    } else if (state.tier === 3) {
      const narrowingOk =
        inputs.creditNarrowingWeeks !== null &&
        inputs.creditNarrowingWeeks >= t.TIER3_EXIT_CREDIT_NARROWING_WEEKS;
      const impliedTier: Tier = tierImpliedByDrawdown(dd, t);
      if (inputs.confirmedHigherLow && narrowingOk && impliedTier < 3) {
        transitions.push({
          from: 3,
          to: impliedTier,
          date,
          reason: `confirmed higher low + Baa−10y narrowing ${t.TIER3_EXIT_CREDIT_NARROWING_WEEKS} consecutive weeks`,
        });
        if (impliedTier === 0) resetToTier0(state, readings, date);
        else {
          state.tier = impliedTier;
          state.enteredAt = date;
        }
      }
    }
  }

  // ---- 7. Result -----------------------------------------------------------
  // Re-render the router card if entry/exit just changed it.
  const finalBoard = evaluateTripwires(readings, state, t);

  const routerWindows: RouterWindows = {
    status: state.routerStatus,
    crossDate: state.crossDate,
    tradingDaysSinceCross: state.crossDate ? state.tradingDaysSinceCross : null,
    deadline30Date: state.routerDeadline30Date,
    deadline60Date: state.routerDeadline60Date,
    ...(routerResolution ? { resolution: routerResolution } : {}),
  };

  const sideEffects: EngineSideEffects = {
    requireEventRegister: enteredTier1Now,
    escalateCadence: state.tier >= 1,
    gearReviewMandatory: transitions.some((x) => x.to === 2),
  };

  return {
    tier: state.tier,
    state,
    drawdownPct: dd,
    tripwires: finalBoard,
    transitions,
    routerWindows,
    sideEffects,
    nextCheckpoint: nextCheckpoint(state, readings, dd, t),
  };
}

function tierImpliedByDrawdown(dd: number, t: Thresholds): Tier {
  if (dd <= t.TIER3_ENTRY_DRAWDOWN_PCT) return 3;
  if (dd <= t.TIER2_ENTRY_DRAWDOWN_PCT) return 2;
  if (dd <= t.TIER1_ENTRY_DRAWDOWN_PCT) return 1;
  return 0;
}

function resetToTier0(state: EngineState, readings: EngineReadings, date: string): void {
  state.tier = 0;
  state.enteredAt = date;
  state.cycleHigh = readings.cycleHigh;
  state.cycleHighDate = readings.cycleHighDate;
  state.crossDate = null;
  state.crossClose = null;
  state.tradingDaysSinceCross = 0;
  state.troughClose = null;
  state.troughDate = null;
  state.peakRegained = false;
  state.peakRegainedIn30 = false;
  state.lowerLowMade = false;
  state.routerStatus = 'INACTIVE';
  state.routerDeadline30Date = null;
  state.routerDeadline60Date = null;
}

function nextCheckpoint(
  state: EngineState,
  readings: EngineReadings,
  dd: number,
  t: Thresholds,
): string {
  const level = (pct: number) => (state.cycleHigh * (1 + pct / 100)).toFixed(0);
  switch (state.tier) {
    case 0:
      return `Close ≤ ${level(t.TIER1_ENTRY_DRAWDOWN_PCT)} (${t.TIER1_ENTRY_DRAWDOWN_PCT}% below cycle high ${state.cycleHigh.toFixed(0)}) enters Tier 1 and opens the ${t.ROUTER_REGAIN_WINDOW_TD}/${t.ROUTER_LOWER_LOW_WINDOW_TD}-td router windows.`;
    case 1: {
      const regain = state.cycleHigh.toFixed(0);
      return `Close ≤ ${level(t.TIER2_ENTRY_DRAWDOWN_PCT)} enters Tier 2; regain of ${regain} exits to Tier 0; router td ${state.tradingDaysSinceCross}/${t.ROUTER_REGAIN_WINDOW_TD} (escalation checked through td ${t.ROUTER_LOWER_LOW_WINDOW_TD}).`;
    }
    case 2: {
      const retraceClose =
        state.troughClose !== null
          ? (state.troughClose + (state.cycleHigh - state.troughClose) * (t.TIER2_EXIT_RETRACE_PCT / 100)).toFixed(0)
          : 'n/a';
      return `Close ≤ ${level(t.TIER3_ENTRY_DRAWDOWN_PCT)} enters Tier 3; close ≥ ${retraceClose} (${t.TIER2_EXIT_RETRACE_PCT}% retrace) with credit Δ3m ≤ 0 exits Tier 2. Current drawdown ${dd.toFixed(1)}%.`;
    }
    case 3:
      return `Exit requires confirmed higher low AND Baa−10y narrowing ${t.TIER3_EXIT_CREDIT_NARROWING_WEEKS} consecutive weeks (currently ${readings.baa10yNarrowingWeeks ?? 'DATA GAP'}).`;
  }
}
