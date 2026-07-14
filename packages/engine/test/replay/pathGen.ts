/**
 * Deterministic daily-path generator for the 54-event replay harness.
 *
 * The backtest catalog documents peak date, trough date, close-basis depth
 * and attribute states per event. This generator reconstructs a daily close
 * path consistent with those facts plus the event's documented router
 * outcome (clean recovery vs failed bounce), then the replay drives
 * `computeState` day by day and asserts the machine reproduces the
 * documented tiers and failed-recovery statistics.
 *
 * When a real daily S&P close series is available (network-enabled
 * environment), `scripts/replay-real` runs the same machine on actual data
 * and supersedes this reconstruction. No randomness anywhere — CI-stable.
 */

import { rollingClosingHigh, rvRatio } from '../../src/indicators.js';
import type { EngineReadings } from '../../src/types.js';

export interface CatalogEvent {
  id: string;
  name: string;
  peakDate: string;
  troughDate: string;
  depthPct: number;
  cpiYoY: number;
  deltaSprBp: number;
  sahmTriggered: boolean;
  gapMonths: number | null;
  daily: boolean;
  routerCohort: boolean;
  routerOutcome: 'CLEAN' | 'ESCALATE' | null;
}

export interface ReplayDay {
  date: string;
  close: number;
  readings: EngineReadings;
}

export interface ReplayPath {
  days: ReplayDay[];
  peakIdx: number;
  troughIdx: number;
}

const PREPEND_TD = 70;

function isWeekend(d: Date): boolean {
  const wd = d.getUTCDay();
  return wd === 0 || wd === 6;
}

function shiftTradingDays(iso: string, delta: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  while (isWeekend(d)) d.setUTCDate(d.getUTCDate() + 1);
  let remaining = Math.abs(delta);
  const step = delta < 0 ? -1 : 1;
  while (remaining > 0) {
    d.setUTCDate(d.getUTCDate() + step);
    if (!isWeekend(d)) remaining--;
  }
  return d.toISOString().slice(0, 10);
}

function tradingDates(startIso: string, count: number): string[] {
  const out: string[] = [];
  const d = new Date(`${startIso}T00:00:00Z`);
  while (isWeekend(d)) d.setUTCDate(d.getUTCDate() + 1);
  while (out.length < count) {
    out.push(d.toISOString().slice(0, 10));
    do {
      d.setUTCDate(d.getUTCDate() + 1);
    } while (isWeekend(d));
  }
  return out;
}

function calendarDays(a: string, b: string): number {
  return Math.round(
    (new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / 86_400_000,
  );
}

/** Linear segment from `from` to `to` over `n` steps (excludes `from`). */
function seg(from: number, to: number, n: number): number[] {
  const out: number[] = [];
  for (let k = 1; k <= n; k++) out.push(from + ((to - from) * k) / n);
  return out;
}

/** Close series in % of peak (peak = 100). */
function buildCloses(ev: CatalogEvent): { closes: number[]; peakIdx: number; troughIdx: number } {
  const D = ev.depthPct;
  const trough = 100 - D;
  const declineTdDoc = Math.max(6, Math.round((calendarDays(ev.peakDate, ev.troughDate) * 5) / 7));

  // Pre-peak runway: gentle rise so RV60 exists and the peak is the high.
  const closes: number[] = [];
  for (let i = 0; i < PREPEND_TD; i++) {
    const v = 96 + (3.8 * i) / (PREPEND_TD - 1) + 0.12 * Math.sin(i * 1.7);
    closes.push(Math.min(v, 99.8));
  }
  closes.push(100); // peak
  const peakIdx = closes.length - 1;

  let decline: number[];
  let recoveryTd: number;
  if (ev.routerOutcome === 'CLEAN') {
    // Canonical clean template: fast selloff, peak regained inside the 30-td
    // router window (calendar-anchored at the documented peak).
    const dTd = D > 10 ? 12 : 8;
    decline = seg(100, trough, dTd);
    recoveryTd = 14;
  } else if (ev.routerOutcome === 'ESCALATE') {
    // Canonical failed-bounce template: initial −5.4% leg, bounce that fails
    // below the peak, break of the initial low, then decline to the
    // documented trough over the documented duration.
    const c2 = Math.max(10, declineTdDoc - 24);
    decline = [
      ...seg(100, 94.6, 6),
      ...seg(94.6, 97.4, 8),
      ...seg(97.4, 94.0, 10), // breaks the initial low (94.6) — lower low made
      ...seg(94.0, trough, c2),
    ];
    recoveryTd = Math.max(20, Math.min(120, Math.round(decline.length / 2)));
  } else {
    // Non-cohort events: straight decline over the documented duration.
    decline = seg(100, trough, Math.max(10, declineTdDoc));
    recoveryTd = Math.max(15, Math.min(120, Math.round(decline.length / 2)));
  }
  closes.push(...decline);
  const troughIdx = closes.length - 1;

  closes.push(...seg(closes[troughIdx]!, 100.4, recoveryTd));
  closes.push(...seg(100.4, 100.6, 10)); // settled tail above the old high
  return { closes, peakIdx, troughIdx };
}

export function buildReplayPath(ev: CatalogEvent): ReplayPath {
  const { closes, peakIdx, troughIdx } = buildCloses(ev);
  const startIso = shiftTradingDays(ev.peakDate, -peakIdx);
  const dates = tradingDates(startIso, closes.length);

  const days: ReplayDay[] = [];
  for (let i = 0; i < closes.length; i++) {
    const close = closes[i]!;
    const date = dates[i]!;
    const inDecline = i > peakIdx && i <= troughIdx;
    const inRecovery = i > troughIdx;
    const p = inDecline
      ? (i - peakIdx) / (troughIdx - peakIdx)
      : inRecovery
        ? 1
        : 0;

    const delta3m = inRecovery ? -10 : Math.round(ev.deltaSprBp * p);
    const high = rollingClosingHigh(
      closes.slice(0, i + 1).map((v, j) => ({ date: dates[j]!, value: v })),
    );

    const readings: EngineReadings = {
      asOfDate: date,
      spClose: close,
      cycleHigh: high.value,
      cycleHighDate: high.date,
      baa10ySpreadBp: 120 + Math.max(0, delta3m),
      baa10ySpreadDelta3mBp: delta3m,
      baa10yNarrowingWeeks: inRecovery ? 4 : 0,
      cpiYoYPct: ev.cpiYoY,
      tenYearDelta3mBp: 0,
      sahmValue: ev.sahmTriggered ? (inRecovery ? 0.3 : 0.2 + 0.5 * p) : 0.05,
      claims4wkYoYPct: ev.sahmTriggered && inDecline ? 20 : -5,
      // Revision breadth is untestable over 50y (backtest §6); the fixture
      // supplies it only where the documented outcome requires a FIRED Sahm
      // (capitulation-tier events with a triggered Sahm).
      revisionBreadthNegative:
        ev.sahmTriggered && ev.depthPct >= 20 && inDecline && p > 0.5 ? true : null,
      vixSustained3Closes: false,
      rv10rv60: rvRatio(closes.slice(0, i + 1)),
      capeTopTercile: false,
      curve10y3mBp: 50,
      confirmedHigherLow: inRecovery && i >= troughIdx + 3,
    };
    days.push({ date, close, readings });
  }
  return { days, peakIdx, troughIdx };
}

export function expectedTier(depthPct: number): 1 | 2 | 3 {
  if (depthPct >= 20) return 3;
  if (depthPct >= 10) return 2;
  return 1;
}
