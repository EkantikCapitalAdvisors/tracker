/**
 * M1 regression gate — 54-event replay (Appendix A, 1974–2026).
 *
 * The machine must reproduce the documented tier for every event and the
 * failed-recovery statistics (P(≥10% | ESCALATE) ≈ 58% vs
 * P(≥10% | CLEAN) ≈ 7%) on the 1990–2022 daily cohort (n = 33).
 * This suite is a permanent CI test: any change to the state machine that
 * breaks 50 years of history fails the build.
 */

import { describe, expect, it } from 'vitest';
import catalogJson from './catalog.json' with { type: 'json' };
import { buildReplayPath, expectedTier, type CatalogEvent } from './pathGen.js';
import { computeState, initialEngineState } from '../../src/stateMachine.js';
import type { EngineResult, Tier, Transition } from '../../src/types.js';

const events = catalogJson.events as CatalogEvent[];

interface ReplayOutcome {
  maxTier: Tier;
  finalTier: Tier;
  transitions: Transition[];
  routerResolution: 'CLEAN' | 'ESCALATE' | null;
  maxDrawdownPct: number;
}

function replayEvent(ev: CatalogEvent): ReplayOutcome {
  const path = buildReplayPath(ev);
  const first = path.days[0]!;
  let state = initialEngineState(first.close, first.date, first.date);
  let maxTier: Tier = 0;
  let maxDrawdownPct = 0;
  const transitions: Transition[] = [];
  let routerResolution: 'CLEAN' | 'ESCALATE' | null = null;

  for (const day of path.days) {
    const result: EngineResult = computeState(day.readings, state);
    state = result.state;
    maxTier = Math.max(maxTier, result.tier) as Tier;
    maxDrawdownPct = Math.min(maxDrawdownPct, result.drawdownPct);
    transitions.push(...result.transitions);
    if (routerResolution === null && result.routerWindows.resolution) {
      routerResolution = result.routerWindows.resolution;
    }
  }
  return { maxTier, finalTier: state.tier, transitions, routerResolution, maxDrawdownPct };
}

describe('54-event replay (Appendix A)', () => {
  it('catalog integrity: 54 events, 33-event router cohort', () => {
    expect(events).toHaveLength(54);
    const cohort = events.filter((e) => e.routerCohort);
    expect(cohort).toHaveLength(33);
    expect(cohort.every((e) => e.daily)).toBe(true);
    expect(cohort.every((e) => e.routerOutcome !== null)).toBe(true);
  });

  const outcomes = new Map<string, ReplayOutcome>();
  for (const ev of events) {
    outcomes.set(ev.id, replayEvent(ev));
  }

  for (const ev of events) {
    describe(ev.name, () => {
      const outcome = outcomes.get(ev.id)!;

      it(`reaches documented tier T${expectedTier(ev.depthPct)} (depth ${ev.depthPct}%)`, () => {
        expect(outcome.maxTier).toBe(expectedTier(ev.depthPct));
      });

      it('reproduces documented depth on close basis', () => {
        expect(Math.abs(-outcome.maxDrawdownPct - ev.depthPct)).toBeLessThan(0.15);
      });

      it('enters Tier 1 after the documented peak, stepping through tiers in order', () => {
        const entry = outcome.transitions.find((t) => t.from === 0 && t.to === 1);
        expect(entry).toBeDefined();
        expect(entry!.date > ev.peakDate).toBe(true);
        // No skipped tiers: every upgrade is +1 with pass-throughs logged.
        for (const t of outcome.transitions) {
          if (t.to > t.from) expect(t.to - t.from).toBe(1);
        }
      });

      it('de-escalates back to Tier 0 after full recovery', () => {
        expect(outcome.finalTier).toBe(0);
      });

      if (ev.routerCohort) {
        it(`router resolves ${ev.routerOutcome}`, () => {
          expect(outcome.routerResolution).toBe(ev.routerOutcome);
        });
      }
    });
  }

  it('reproduces the failed-recovery statistics: P(≥10% | ESCALATE) ≈ 58%, P(≥10% | CLEAN) ≈ 7%', () => {
    const cohort = events.filter((e) => e.routerCohort);
    const escalated = cohort.filter((e) => outcomes.get(e.id)!.routerResolution === 'ESCALATE');
    const clean = cohort.filter((e) => outcomes.get(e.id)!.routerResolution === 'CLEAN');
    expect(escalated.length).toBe(19);
    expect(clean.length).toBe(14);

    const extended = (e: CatalogEvent) => outcomes.get(e.id)!.maxDrawdownPct <= -10;
    const pEscalate = (escalated.filter(extended).length / escalated.length) * 100;
    const pClean = (clean.filter(extended).length / clean.length) * 100;

    expect(Math.round(pEscalate)).toBe(58); // 11 / 19
    expect(Math.round(pClean)).toBe(7); // 1 / 14
  });

  it('tier taxonomy counts match the backtest: T1=27 · T2=20 · T3=7', () => {
    const byTier = { 1: 0, 2: 0, 3: 0 };
    for (const ev of events) byTier[expectedTier(ev.depthPct)]++;
    expect(byTier).toEqual({ 1: 27, 2: 20, 3: 7 });
  });
});
