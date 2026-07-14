import { describe, expect, it } from 'vitest';
import {
  consecutiveNarrowingWeeks,
  drawdownPct,
  inTopTrailingTercile,
  rollingClosingHigh,
  rvRatio,
  sahmValue,
  sustainedAtOrAbove,
  yoyPct,
} from '../src/indicators.js';

describe('indicator math', () => {
  it('drawdown', () => {
    expect(drawdownPct(95, 100)).toBeCloseTo(-5);
  });

  it('rolling closing high uses the window and prefers the latest equal high', () => {
    const series = [
      { date: '2026-01-01', value: 100 },
      { date: '2026-01-02', value: 98 },
      { date: '2026-01-03', value: 100 },
    ];
    expect(rollingClosingHigh(series).date).toBe('2026-01-03');
    expect(rollingClosingHigh(series, 2).value).toBe(100);
  });

  it('Sahm: flat unemployment → 0; a 0.6pp rise in the 3m MA over the year → ≥0.5', () => {
    expect(sahmValue(Array(20).fill(4.0))).toBe(0);
    const rising = [...Array(12).fill(4.0), 4.0, 4.3, 4.6, 4.9];
    expect(sahmValue(rising)!).toBeGreaterThanOrEqual(0.5);
    expect(sahmValue(Array(14).fill(4.0))).toBeNull(); // needs 15 months
  });

  it('RV ratio needs 61 closes and reflects acceleration', () => {
    expect(rvRatio(Array(60).fill(100))).toBeNull();
    const calm: number[] = [];
    for (let i = 0; i < 61; i++) calm.push(100 + Math.sin(i) * 0.3);
    const accel = [...calm.slice(0, 51), 100, 97, 100, 96, 101, 95, 102, 94, 103, 93];
    expect(rvRatio(accel)!).toBeGreaterThan(1.75);
  });

  it('sustained-at-or-above requires every one of the last n closes', () => {
    expect(sustainedAtOrAbove([31, 32, 33], 30, 3)).toBe(true);
    expect(sustainedAtOrAbove([31, 29, 33], 30, 3)).toBe(false);
    expect(sustainedAtOrAbove([33, 34], 30, 3)).toBe(false);
  });

  it('consecutive narrowing weeks counts the strictly-declining tail', () => {
    expect(consecutiveNarrowingWeeks([200, 195, 190, 185])).toBe(3);
    expect(consecutiveNarrowingWeeks([180, 195, 190, 185])).toBe(2);
    expect(consecutiveNarrowingWeeks([180, 185])).toBe(0);
  });

  it('YoY percent', () => {
    expect(yoyPct(115, 100)).toBeCloseTo(15);
  });

  it('top trailing tercile', () => {
    const series = Array.from({ length: 360 }, (_, i) => 10 + (i % 30));
    expect(inTopTrailingTercile([...series, 45])).toBe(true);
    expect(inTopTrailingTercile([...series, 5])).toBe(false);
  });
});
