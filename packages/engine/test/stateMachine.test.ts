import { describe, expect, it } from 'vitest';
import { computeState, initialEngineState } from '../src/stateMachine.js';
import type { EngineReadings, EngineState } from '../src/types.js';
import { dateAt, readings } from './helpers.js';

function run(days: EngineReadings[], start?: EngineState) {
  let state = start ?? initialEngineState(100, dateAt(0), dateAt(0));
  const results = [];
  for (const day of days) {
    const r = computeState(day, state);
    state = r.state;
    results.push(r);
  }
  return results;
}

describe('tier state machine', () => {
  it('stays Tier 0 above the −5% line', () => {
    const [r] = run([readings({ spClose: 95.1 })]);
    expect(r!.tier).toBe(0);
    expect(r!.transitions).toHaveLength(0);
    expect(r!.routerWindows.status).toBe('INACTIVE');
  });

  it('enters Tier 1 at exactly −5.0%, opens router windows, requires event register', () => {
    const [r] = run([readings({ spClose: 95.0, asOfDate: dateAt(1) })]);
    expect(r!.tier).toBe(1);
    expect(r!.transitions).toEqual([
      expect.objectContaining({ from: 0, to: 1, date: dateAt(1) }),
    ]);
    expect(r!.state.crossDate).toBe(dateAt(1));
    expect(r!.state.crossClose).toBe(95.0);
    expect(r!.routerWindows.status).toBe('OPEN');
    expect(r!.sideEffects.requireEventRegister).toBe(true);
    expect(r!.sideEffects.escalateCadence).toBe(true);
  });

  it('anchors the cycle high at Tier-1 entry (regain reference does not decay)', () => {
    const results = run([
      readings({ spClose: 94, asOfDate: dateAt(1) }),
      // Upstream rolling high drops, but the anchor must hold at 100.
      readings({ spClose: 96, cycleHigh: 97, asOfDate: dateAt(2) }),
    ]);
    expect(results[1]!.state.cycleHigh).toBe(100);
    expect(results[1]!.tier).toBe(1);
  });

  it('gap down to −12% passes through Tier 1 to Tier 2 with both transitions logged', () => {
    const [r] = run([readings({ spClose: 88, asOfDate: dateAt(1) })]);
    expect(r!.tier).toBe(2);
    expect(r!.transitions.map((t) => [t.from, t.to])).toEqual([
      [0, 1],
      [1, 2],
    ]);
    expect(r!.sideEffects.gearReviewMandatory).toBe(true);
  });

  it('enters Tier 3 at −20% close', () => {
    const [r] = run([readings({ spClose: 79.9, asOfDate: dateAt(1) })]);
    expect(r!.tier).toBe(3);
  });

  it('enters Tier 3 on Sahm FIRED + credit crisis + policy CONSTRAINED without a −20% close', () => {
    const [r] = run([
      readings({
        spClose: 92,
        asOfDate: dateAt(1),
        sahmValue: 0.6,
        claims4wkYoYPct: 18,
        revisionBreadthNegative: true,
        baa10ySpreadBp: 260,
        cpiYoYPct: 4.5,
      }),
    ]);
    expect(r!.tier).toBe(3);
    expect(r!.transitions.at(-1)!.reason).toContain('Sahm FIRED');
  });

  it('does NOT fire Tier 3 combo when Sahm confirmation is incomplete', () => {
    const [r] = run([
      readings({
        spClose: 92,
        asOfDate: dateAt(1),
        sahmValue: 0.6,
        claims4wkYoYPct: 18,
        revisionBreadthNegative: null, // manual field absent → capped at ARMED
        baa10ySpreadBp: 260,
        cpiYoYPct: 4.5,
      }),
    ]);
    expect(r!.tier).toBe(1); // −8% close is Tier 1; the T3 combo must not fire
  });

  it('exits Tier 1 when the close regains the cycle high', () => {
    const results = run([
      readings({ spClose: 94, asOfDate: dateAt(1) }),
      readings({ spClose: 97, asOfDate: dateAt(2) }),
      readings({ spClose: 100.2, asOfDate: dateAt(3) }),
    ]);
    expect(results[2]!.tier).toBe(0);
    expect(results[2]!.transitions[0]!.reason).toContain('regained cycle high');
    expect(results[2]!.routerWindows.status).toBe('INACTIVE');
    expect(results[2]!.routerWindows.resolution).toBe('CLEAN');
  });

  it('exits Tier 1 when the 30-td window closes with no lower low', () => {
    const days: EngineReadings[] = [readings({ spClose: 94.9, asOfDate: dateAt(1) })];
    for (let i = 0; i < 30; i++) {
      days.push(readings({ spClose: 96.5, asOfDate: dateAt(2 + i) }));
    }
    const results = run(days);
    const last = results.at(-1)!;
    expect(last.tier).toBe(0);
    expect(last.transitions[0]!.reason).toContain('no lower low');
  });

  it('routes ESCALATE (no regain in 30 td + lower low) and escalates to Tier 2 with credit TRIGGERED', () => {
    const days: EngineReadings[] = [readings({ spClose: 94.5, asOfDate: dateAt(1) })];
    // Bounce that fails, then a lower low; credit impulse triggered.
    for (let i = 0; i < 10; i++) days.push(readings({ spClose: 96.5, asOfDate: dateAt(2 + i) }));
    for (let i = 0; i < 25; i++) {
      days.push(
        readings({ spClose: 93.5, asOfDate: dateAt(12 + i), baa10ySpreadDelta3mBp: 60 }),
      );
    }
    const results = run(days);
    const last = results.at(-1)!;
    expect(last.tier).toBe(2);
    const escalation = results.find((r) => r.routerWindows.resolution === 'ESCALATE')!;
    expect(escalation).toBeDefined();
    expect(escalation.state.tradingDaysSinceCross).toBe(30);
    const t2 = results.flatMap((r) => r.transitions).find((t) => t.to === 2)!;
    expect(t2.reason).toContain('failed-recovery ESCALATE');
  });

  it('does NOT escalate on ESCALATE alone (credit quiet) — drawdown never reaches −10%', () => {
    const days: EngineReadings[] = [readings({ spClose: 94.5, asOfDate: dateAt(1) })];
    for (let i = 0; i < 10; i++) days.push(readings({ spClose: 96.5, asOfDate: dateAt(2 + i) }));
    for (let i = 0; i < 25; i++) days.push(readings({ spClose: 93.5, asOfDate: dateAt(12 + i) }));
    const last = run(days).at(-1)!;
    expect(last.tier).toBe(1);
  });

  it('exits Tier 2 on 50% retrace with credit Δ3m ≤ 0 (to Tier 1 while below −5%)', () => {
    const days: EngineReadings[] = [
      readings({ spClose: 88, asOfDate: dateAt(1) }), // Tier 2, trough 88
      readings({ spClose: 94.2, asOfDate: dateAt(2), baa10ySpreadDelta3mBp: -10 }), // 51.7% retrace, dd −5.8%
    ];
    const results = run(days);
    expect(results[1]!.tier).toBe(1);
    expect(results[1]!.transitions[0]!.reason).toContain('retrace');
  });

  it('holds Tier 2 on 50% retrace when credit is still widening', () => {
    const days: EngineReadings[] = [
      readings({ spClose: 88, asOfDate: dateAt(1) }),
      readings({ spClose: 94.2, asOfDate: dateAt(2), baa10ySpreadDelta3mBp: 25 }),
    ];
    expect(run(days)[1]!.tier).toBe(2);
  });

  it('exits Tier 3 only on confirmed higher low + 4 weeks credit narrowing', () => {
    const days: EngineReadings[] = [
      readings({ spClose: 75, asOfDate: dateAt(1) }), // Tier 3
      readings({ spClose: 85, asOfDate: dateAt(2), confirmedHigherLow: true, baa10yNarrowingWeeks: 3 }),
      readings({ spClose: 85, asOfDate: dateAt(3), confirmedHigherLow: true, baa10yNarrowingWeeks: 4 }),
    ];
    const results = run(days);
    expect(results[1]!.tier).toBe(3); // 3 weeks narrowing — not yet
    expect(results[2]!.tier).toBe(2); // −15% → Tier 2 on exit
  });

  it('VIX confirmer can NEVER change a state transition (structural guarantee)', () => {
    const scenario = (vix: boolean) =>
      run([
        readings({ spClose: 94, asOfDate: dateAt(1), vixSustained3Closes: vix }),
        readings({ spClose: 89, asOfDate: dateAt(2), vixSustained3Closes: vix }),
        readings({ spClose: 79, asOfDate: dateAt(3), vixSustained3Closes: vix }),
        readings({ spClose: 90, asOfDate: dateAt(4), vixSustained3Closes: vix }),
      ]);
    const withVix = scenario(true);
    const withoutVix = scenario(false);
    expect(withVix.map((r) => r.tier)).toEqual(withoutVix.map((r) => r.tier));
    expect(withVix.flatMap((r) => r.transitions)).toEqual(withoutVix.flatMap((r) => r.transitions));
  });

  it('fails open on data gaps — a fully gapped day still evaluates drawdown state', () => {
    const [r] = run([
      readings({
        spClose: 94,
        asOfDate: dateAt(1),
        baa10ySpreadBp: null,
        baa10ySpreadDelta3mBp: null,
        cpiYoYPct: null,
        sahmValue: null,
        claims4wkYoYPct: null,
        rv10rv60: null,
        capeTopTercile: null,
        curve10y3mBp: null,
        vixSustained3Closes: null,
        tenYearDelta3mBp: null,
      }),
    ]);
    expect(r!.tier).toBe(1);
    expect(r!.tripwires.filter((t) => t.dataGap).length).toBeGreaterThan(5);
  });
});
