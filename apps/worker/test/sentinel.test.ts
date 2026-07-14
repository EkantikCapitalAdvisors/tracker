import { describe, expect, it } from 'vitest';
import { computeState, initialEngineState, type EngineReadings } from '@ekantik/correction-engine';
import { formatSentinel, type SentinelContext } from '../src/sentinel.js';

function readings(overrides: Partial<EngineReadings> = {}): EngineReadings {
  return {
    asOfDate: '2026-07-17',
    spClose: 7300,
    cycleHigh: 7620,
    cycleHighDate: '2026-07-02',
    baa10ySpreadBp: 162,
    baa10ySpreadDelta3mBp: -6,
    baa10yNarrowingWeeks: 0,
    cpiYoYPct: 4.5,
    tenYearDelta3mBp: 35,
    sahmValue: 0.03,
    claims4wkYoYPct: -1,
    revisionBreadthNegative: null,
    vixSustained3Closes: false,
    rv10rv60: 1.1,
    capeTopTercile: true,
    curve10y3mBp: 40,
    confirmedHigherLow: null,
    ...overrides,
  };
}

describe('sentinel formatter', () => {
  it('produces the three-message structure with tier, board, and disclaimer', () => {
    const r = readings();
    const result = computeState(r, initialEngineState(7620, '2026-07-02', '2026-07-01'));
    const ctx: SentinelContext = {
      result,
      readings: r,
      priorTier: null,
      catalystTag: null,
      deltas: [],
      narrative: null,
      manualNA: ['ALIGHT_401K_INDEX', 'DEALER_GAMMA'],
    };
    const messages = formatSentinel(ctx);
    expect(messages).toHaveLength(3);
    expect(messages[0]).toContain('CORRECTION SENTINEL — 2026-07-17');
    expect(messages[0]).toContain('STATE: TIER 0 — Baseline');
    expect(messages[0]).toContain('INITIAL RUN');
    expect(messages[0]).toContain('POLICY_SWITCH CONSTRAINED'); // CPI 4.5% > 4.0
    expect(messages[1]).toContain('L0 Vulnerability');
    expect(messages[1]).toContain('ALIGHT_401K_INDEX · N/A');
    expect(messages[2]).toContain('Next checkpoint:');
    expect(messages[2]).toContain('Not investment advice');
  });

  it('includes a depth range only in Tier ≥ 2 and never a point estimate', () => {
    const r = readings({ spClose: 6800 }); // −10.8% → Tier 2
    const result = computeState(r, initialEngineState(7620, '2026-07-02', '2026-07-01'));
    expect(result.tier).toBe(2);
    const ctx: SentinelContext = {
      result,
      readings: r,
      priorTier: 1,
      catalystTag: 'REALITY_BASED',
      deltas: ['drawdown -5.2pp'],
      narrative: null,
      manualNA: [],
    };
    const messages = formatSentinel(ctx);
    expect(messages[2]).toMatch(/Depth range: \d+\.\d–\d+\.\d%/);
    expect(messages[2]).toContain('invalidation close');
    expect(messages[0]).toContain('changed from TIER 1');
  });
});
