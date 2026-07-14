import { describe, expect, it } from 'vitest';
import { FROZEN_THRESHOLDS, assertThresholdIntegrity } from '../src/thresholds.js';
import {
  evalCreditCrisis,
  evalCreditImpulse,
  evalPolicySwitch,
  evalRateShock,
  evalSahmGate,
  evalVixConfirm,
} from '../src/tripwires.js';
import { readings } from './helpers.js';

const T = FROZEN_THRESHOLDS;

describe('tripwire thresholds (frozen boundaries)', () => {
  it('credit impulse TRIGGERS at exactly +50bp Δ3m, not below', () => {
    expect(evalCreditImpulse(readings({ baa10ySpreadDelta3mBp: 50 }), T).status).toBe('TRIGGERED');
    expect(evalCreditImpulse(readings({ baa10ySpreadDelta3mBp: 49 }), T).status).toBe('QUIET');
  });

  it('credit crisis is strictly > 250bp', () => {
    expect(evalCreditCrisis(readings({ baa10ySpreadBp: 250 }), T).status).toBe('QUIET');
    expect(evalCreditCrisis(readings({ baa10ySpreadBp: 251 }), T).status).toBe('TRIGGERED');
  });

  it('policy switch is strictly > 4.0% CPI YoY and reads CONSTRAINED, never TRIGGERED', () => {
    expect(evalPolicySwitch(readings({ cpiYoYPct: 4.0 }), T).status).toBe('QUIET');
    expect(evalPolicySwitch(readings({ cpiYoYPct: 4.1 }), T).status).toBe('CONSTRAINED');
  });

  it('rate shock is a flag only; note marks state-relevance under combined conditions', () => {
    const standalone = evalRateShock(readings({ tenYearDelta3mBp: 85 }), T, false);
    expect(standalone.status).toBe('ARMED');
    expect(standalone.note).toContain('NOT state-relevant');
    const combined = evalRateShock(readings({ tenYearDelta3mBp: 85, capeTopTercile: true }), T, false);
    expect(combined.note).toContain('state-relevant');
    const withCredit = evalRateShock(readings({ tenYearDelta3mBp: 85 }), T, true);
    expect(withCredit.note).toContain('state-relevant');
  });

  it('Sahm arms at 0.50 and caps at ARMED when breadth is absent', () => {
    expect(evalSahmGate(readings({ sahmValue: 0.49 }), T).status).toBe('QUIET');
    const incomplete = evalSahmGate(
      readings({ sahmValue: 0.55, claims4wkYoYPct: 20, revisionBreadthNegative: null }),
      T,
    );
    expect(incomplete.status).toBe('ARMED');
    expect(incomplete.note).toBe('ARMED — confirmation incomplete');
    const fired = evalSahmGate(
      readings({ sahmValue: 0.55, claims4wkYoYPct: 15, revisionBreadthNegative: true }),
      T,
    );
    expect(fired.status).toBe('FIRED');
    const notMet = evalSahmGate(
      readings({ sahmValue: 0.55, claims4wkYoYPct: 5, revisionBreadthNegative: false }),
      T,
    );
    expect(notMet.status).toBe('ARMED');
  });

  it('VIX card always carries the confirmer-only note', () => {
    const card = evalVixConfirm(readings({ vixSustained3Closes: true }), T);
    expect(card.status).toBe('TRIGGERED');
    expect(card.role).toBe('CONFIRMER');
    expect(card.note).toContain('never fire');
  });

  it('data gaps fail open: null input → QUIET + dataGap, never a throw', () => {
    const gap = evalCreditImpulse(readings({ baa10ySpreadDelta3mBp: null }), T);
    expect(gap.status).toBe('QUIET');
    expect(gap.dataGap).toBe(true);
  });
});

describe('threshold governance guard', () => {
  it('accepts a loaded config identical to the frozen constants', () => {
    expect(() => assertThresholdIntegrity({ ...FROZEN_THRESHOLDS })).not.toThrow();
  });

  it('rejects silent divergence', () => {
    expect(() =>
      assertThresholdIntegrity({ ...FROZEN_THRESHOLDS, CREDIT_IMPULSE_DELTA3M_BP: 40 }),
    ).toThrow(/integrity failure/);
  });

  it('rejects missing keys', () => {
    const { CREDIT_IMPULSE_DELTA3M_BP: _omit, ...rest } = FROZEN_THRESHOLDS;
    expect(() => assertThresholdIntegrity(rest)).toThrow(/missing/);
  });

  it('accepts divergence only via an approved override (countersigned change)', () => {
    expect(() =>
      assertThresholdIntegrity(
        { ...FROZEN_THRESHOLDS, CREDIT_IMPULSE_DELTA3M_BP: 40 },
        { CREDIT_IMPULSE_DELTA3M_BP: 40 },
      ),
    ).not.toThrow();
  });
});
