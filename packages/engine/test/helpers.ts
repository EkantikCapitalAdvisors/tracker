import type { EngineReadings } from '../src/types.js';

/** Quiet baseline readings; override per test. */
export function readings(overrides: Partial<EngineReadings> = {}): EngineReadings {
  return {
    asOfDate: '2026-07-14',
    spClose: 100,
    cycleHigh: 100,
    cycleHighDate: '2026-07-01',
    baa10ySpreadBp: 160,
    baa10ySpreadDelta3mBp: -5,
    baa10yNarrowingWeeks: 0,
    cpiYoYPct: 2.5,
    tenYearDelta3mBp: 10,
    sahmValue: 0.05,
    claims4wkYoYPct: -2,
    revisionBreadthNegative: null,
    vixSustained3Closes: false,
    rv10rv60: 0.9,
    capeTopTercile: false,
    curve10y3mBp: 60,
    confirmedHigherLow: false,
    ...overrides,
  };
}

/** Sequential trading-ish dates for multi-day scenarios. */
export function dateAt(i: number): string {
  const d = new Date('2026-01-05T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + i + Math.floor(i / 5) * 2);
  return d.toISOString().slice(0, 10);
}
