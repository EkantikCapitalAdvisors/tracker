import { describe, expect, it } from 'vitest';
import { runDepthEngine } from '../src/depthEngine.js';
import { computeState, initialEngineState } from '../src/stateMachine.js';
import type { DepthEngineInput } from '../src/types.js';
import { dateAt, readings } from './helpers.js';

function tier2Input(overrides: Partial<DepthEngineInput> = {}): DepthEngineInput {
  const r = readings({ spClose: 88, asOfDate: dateAt(1) });
  const result = computeState(r, initialEngineState(100, dateAt(0), dateAt(0)));
  return {
    tier: 2,
    catalystTag: 'REALITY_BASED',
    tripwires: result.tripwires,
    readings: r,
    state: result.state,
    currentPE: null,
    analogPE: null,
    analogDepthPct: null,
    ...overrides,
  };
}

describe('depth engine (Spec §4)', () => {
  it('refuses to run below Tier 2', () => {
    expect(() => runDepthEngine(tier2Input({ tier: 1 }))).toThrow(/Tier ≥ 2/);
  });

  it('output is range-typed: low < high, with an invalidation close', () => {
    const d = runDepthEngine(tier2Input());
    expect(d.rangeLowPct).toBeLessThan(d.rangeHighPct);
    expect(d.invalidationClose).toBeGreaterThan(0);
  });

  it('fundamental base band 5–15% for REALITY_BASED tags', () => {
    const d = runDepthEngine(tier2Input());
    expect(d.baseBand).toBe('FUNDAMENTAL');
    expect(d.rangeLowPct).toBeGreaterThanOrEqual(5);
    expect(d.rangeHighPct).toBeLessThanOrEqual(15);
  });

  it('Tier 3 always uses the capitulation band', () => {
    const r = readings({ spClose: 75, asOfDate: dateAt(1) });
    const result = computeState(r, initialEngineState(100, dateAt(0), dateAt(0)));
    const d = runDepthEngine(
      tier2Input({ tier: 3, readings: r, state: result.state, tripwires: result.tripwires }),
    );
    expect(d.baseBand).toBe('CAPITULATION');
    expect(d.rangeHighPct).toBeGreaterThanOrEqual(15);
  });

  it('policy CONSTRAINED forces the range into the upper half', () => {
    const r = readings({ spClose: 88, asOfDate: dateAt(1), cpiYoYPct: 4.5 });
    const result = computeState(r, initialEngineState(100, dateAt(0), dateAt(0)));
    const constrained = runDepthEngine(
      tier2Input({ readings: r, state: result.state, tripwires: result.tripwires }),
    );
    const free = runDepthEngine(tier2Input());
    expect(constrained.policyOverlayApplied).toBe(true);
    expect(constrained.rangeLowPct).toBeGreaterThan(free.rangeLowPct);
  });

  it('valuation scale is clamped to [0.5, 2.0]', () => {
    const d = runDepthEngine(tier2Input({ currentPE: 100, analogPE: 10 }));
    expect(d.valuationScale).toBe(2);
  });

  it('Tier-2 invalidation close is the 50% retrace level', () => {
    const d = runDepthEngine(tier2Input());
    // trough 88, cycle high 100 → 50% retrace = 94
    expect(d.invalidationClose).toBe(94);
  });
});
