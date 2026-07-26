/**
 * Tracker v2.1 M1 acceptance tests — §8.
 * - Ladder equality: the Plain View ladder renders the exact numbers of the
 *   positioning ladder.
 * - §3 gauge mapping across all four colors per gauge.
 * - The "never better than engine" invariant: presentation bands may only
 *   interpolate, never override a worse engine status.
 */
import { describe, expect, it } from 'vitest';
import { POSITIONING_LADDER } from '../lib/positioning';
import {
  cashRule,
  computePlainGauges,
  DEFAULT_BANDS,
  plainCheckpoint,
  plainLadder,
  type PlainViewInputs,
} from '../lib/plainView';

function inputs(overrides: Partial<PlainViewInputs> = {}): PlainViewInputs {
  return {
    tier: 0,
    drawdownPct: -2.0,
    routerStatus: 'INACTIVE',
    tdSinceCross: 0,
    statuses: new Map(),
    notes: new Map(),
    creditDelta3mBp: -31,
    creditLevelBp: 143,
    cpiYoYPct: 3.0,
    sahmValue: 0.07,
    capeTercile: 0,
    spClose: 7457.69,
    cycleHigh: 7609.78,
    asOf: '2026-07-17',
    bands: DEFAULT_BANDS,
    ...overrides,
  };
}
const gauge = (i: PlainViewInputs, key: string) => {
  const g = computePlainGauges(i).find((g) => g.key === key);
  if (!g) throw new Error(`gauge ${key} missing`);
  return g;
};

describe('ladder equality (Plain View vs positioning page)', () => {
  it('renders identical percentages in identical order', () => {
    const plain = plainLadder('T0');
    expect(plain.map((r) => r.equityPct)).toEqual(POSITIONING_LADDER.map((r) => r.equityPct));
    expect(plain.map((r) => r.id)).toEqual(POSITIONING_LADDER.map((r) => r.id));
    expect(plain.filter((r) => r.current)).toHaveLength(1);
  });
});

describe('§3 mapping — Market Trend', () => {
  it('tier → color, all four', () => {
    expect(gauge(inputs({ tier: 0 }), 'market').color).toBe('green');
    expect(gauge(inputs({ tier: 1 }), 'market').color).toBe('yellow');
    expect(gauge(inputs({ tier: 2 }), 'market').color).toBe('orange');
    expect(gauge(inputs({ tier: 3 }), 'market').color).toBe('red');
  });
});

describe('§3 mapping — Credit Stress', () => {
  it('quiet → green; band Δ3m ≥ +25 → yellow; impulse → orange; crisis → red', () => {
    expect(gauge(inputs(), 'credit').color).toBe('green');
    expect(gauge(inputs({ creditDelta3mBp: 30 }), 'credit').color).toBe('yellow');
    expect(
      gauge(inputs({ statuses: new Map([['CREDIT_IMPULSE', 'TRIGGERED']]) }), 'credit').color,
    ).toBe('orange');
    expect(
      gauge(inputs({ statuses: new Map([['CREDIT_CRISIS', 'TRIGGERED']]) }), 'credit').color,
    ).toBe('red');
  });
  it('never better than engine: negative Δ3m cannot soften a TRIGGERED impulse', () => {
    const g = gauge(
      inputs({ creditDelta3mBp: -50, statuses: new Map([['CREDIT_IMPULSE', 'TRIGGERED']]) }),
      'credit',
    );
    expect(g.color).toBe('orange');
    expect(g.bandDriven).toBe(false);
  });
});

describe('§3 mapping — Fed Freedom', () => {
  it('CPI ≤3.5 green; 3.5–4 yellow; CONSTRAINED orange; CONSTRAINED + Tier ≥2 red', () => {
    expect(gauge(inputs({ cpiYoYPct: 3.2 }), 'fed').color).toBe('green');
    expect(gauge(inputs({ cpiYoYPct: 3.8 }), 'fed').color).toBe('yellow');
    expect(
      gauge(inputs({ cpiYoYPct: 4.5, statuses: new Map([['POLICY_SWITCH', 'CONSTRAINED']]) }), 'fed')
        .color,
    ).toBe('orange');
    expect(
      gauge(
        inputs({ tier: 2, cpiYoYPct: 4.5, statuses: new Map([['POLICY_SWITCH', 'CONSTRAINED']]) }),
        'fed',
      ).color,
    ).toBe('red');
  });
  it('never better: CPI reading below band cannot soften CONSTRAINED', () => {
    expect(
      gauge(inputs({ cpiYoYPct: 3.0, statuses: new Map([['POLICY_SWITCH', 'CONSTRAINED']]) }), 'fed')
        .color,
    ).toBe('orange');
  });
});

describe('§3 mapping — Jobs', () => {
  it('Sahm <0.35 green; 0.35–0.50 yellow; ARMED orange; FIRED red', () => {
    expect(gauge(inputs({ sahmValue: 0.1 }), 'jobs').color).toBe('green');
    expect(gauge(inputs({ sahmValue: 0.4 }), 'jobs').color).toBe('yellow');
    expect(
      gauge(inputs({ sahmValue: 0.55, statuses: new Map([['SAHM_GATE', 'ARMED']]) }), 'jobs').color,
    ).toBe('orange');
    expect(
      gauge(inputs({ sahmValue: 0.55, statuses: new Map([['SAHM_GATE', 'FIRED']]) }), 'jobs').color,
    ).toBe('red');
  });
});

describe('§3 mapping — Bond Market (capped at orange by design)', () => {
  it('quiet green; standalone flag or inverted curve yellow; state-relevant orange; never red', () => {
    expect(gauge(inputs(), 'bond').color).toBe('green');
    expect(
      gauge(inputs({ statuses: new Map([['RATE_SHOCK', 'ARMED']]) }), 'bond').color,
    ).toBe('yellow');
    expect(
      gauge(inputs({ statuses: new Map([['CURVE_INVERTED', 'ARMED']]) }), 'bond').color,
    ).toBe('yellow');
    const relevant = gauge(
      inputs({
        statuses: new Map([['RATE_SHOCK', 'ARMED']]),
        notes: new Map([['RATE_SHOCK', 'Combined condition met (CAPE top tercile or credit TRIGGERED) — state-relevant']]),
      }),
      'bond',
    );
    expect(relevant.color).toBe('orange');
  });
});

describe('§3 mapping — Valuation (capped at orange by design)', () => {
  it('bottom green; middle yellow; top orange', () => {
    expect(gauge(inputs({ capeTercile: 0 }), 'valuation').color).toBe('green');
    expect(gauge(inputs({ capeTercile: 1 }), 'valuation').color).toBe('yellow');
    expect(gauge(inputs({ capeTercile: 2 }), 'valuation').color).toBe('orange');
  });
});

describe('§3 mapping — Recovery Health', () => {
  it('inactive green; OPEN yellow; OPEN past 30td orange; ESCALATE red', () => {
    expect(gauge(inputs(), 'recovery').color).toBe('green');
    expect(gauge(inputs({ routerStatus: 'OPEN', tdSinceCross: 10 }), 'recovery').color).toBe('yellow');
    expect(gauge(inputs({ routerStatus: 'OPEN', tdSinceCross: 35 }), 'recovery').color).toBe('orange');
    expect(gauge(inputs({ routerStatus: 'ESCALATE', tdSinceCross: 40 }), 'recovery').color).toBe('red');
    expect(gauge(inputs({ routerStatus: 'CLEAN', tdSinceCross: 70 }), 'recovery').color).toBe('green');
  });
});

describe('checkpoint line', () => {
  it('Tier 0 names the −5% close', () => {
    const c = plainCheckpoint(0, 7609.78);
    expect(c.number).toBe('7229');
  });
});

describe('cash rule (Tier-3 non-price stack)', () => {
  it('all four chips light only on the full recessionary stack', () => {
    const calm = cashRule(inputs());
    expect(calm.every((c) => !c.met)).toBe(true);
    const full = cashRule(
      inputs({
        tier: 3,
        statuses: new Map([
          ['SAHM_GATE', 'FIRED'],
          ['CREDIT_CRISIS', 'TRIGGERED'],
          ['POLICY_SWITCH', 'CONSTRAINED'],
        ]),
      }),
    );
    expect(full.every((c) => c.met)).toBe(true);
  });
});

describe('bold marker integrity', () => {
  it('every non-empty bold value appears in its reading', () => {
    for (const g of computePlainGauges(inputs())) {
      if (g.bold) expect(g.reading).toContain(g.bold);
    }
  });
});
