/**
 * AI Bubble Module — scoring tests.
 * The primary case reproduces the worked example published in Build Spec
 * v1.0 §3.3 / §4.3: tier loads 0.600/0.100/0.125/0.200/0.000 → score_raw
 * 0.1975, display "0.20", band late_cycle, cascade 3/2/2/1.
 */
import { describe, expect, it } from 'vitest';
import {
  bandFor,
  briefingShouldFire,
  computeCascadeContribution,
  computeScore,
  proposedFactorScore,
  roundHalfUp2,
  stripInternal,
} from '../lib/aiBubble/scoring';
import type { RunTripwire, ThresholdFile, TripwireStatus } from '../lib/aiBubble/types';

const TIERS = [
  { id: 0, key: 'ambient', name: 'Ambient conditions', weight: 0.15, question: '' },
  { id: 1, key: 'narrative', name: 'Narrative break', weight: 0.2, question: '' },
  { id: 2, key: 'financing', name: 'Financing channel', weight: 0.3, question: '' },
  { id: 3, key: 'demand', name: 'Demand reality', weight: 0.25, question: '' },
  { id: 4, key: 'systemic', name: 'Systemic', weight: 0.1, question: '' },
];
const BANDS = [
  { key: 'healthy', label: 'Healthy', min: 0, max: 0.15 },
  { key: 'late_cycle', label: 'Late-cycle fragility', min: 0.15, max: 0.35 },
  { key: 'narrative_breaking', label: 'Narrative breaking', min: 0.35, max: 0.55 },
  { key: 'cascade', label: 'Cascade underway', min: 0.55, max: 1 },
];

/** Build a 27-tripwire fixture with the spec's tier counts (5/5/8/5/4). */
function fixture(statusesByTier: Record<number, TripwireStatus[]>): {
  thresholds: ThresholdFile;
  tripwires: RunTripwire[];
} {
  const defs: ThresholdFile['tripwires'] = [];
  const runs: RunTripwire[] = [];
  for (const [tierStr, statuses] of Object.entries(statusesByTier)) {
    const tier = Number(tierStr);
    statuses.forEach((status, i) => {
      const id = `${tier}.${i + 1}`;
      defs.push({
        id,
        tier,
        name: id,
        public_name: id,
        threshold_text: 't',
        threshold_machine: { metric: 'm', op: '>', value: 1 },
        seller_class: 'none',
        search_queries: [],
      });
      runs.push({
        id,
        status,
        status_score: status === 'PARTIAL' ? 0.5 : status === 'FIRED' ? 1 : 0,
        changed: false,
        visibility: 'member',
      });
    });
  }
  return {
    thresholds: {
      schema_version: '1.0',
      framework_version: '1.0',
      effective_from: '2026-07-08',
      hash: 'sha256:test',
      tiers: TIERS,
      bands: BANDS,
      tripwires: defs,
    },
    tripwires: runs,
  };
}

const SPEC_RUN = fixture({
  0: ['FIRED', 'FIRED', 'FIRED', 'DORMANT', 'DORMANT'], //           3.0/5 = 0.600
  1: ['PARTIAL', 'DORMANT', 'ARMED', 'DORMANT', 'DORMANT'], //       0.5/5 = 0.100
  2: ['PARTIAL', 'PARTIAL', 'UNSCOREABLE', 'ARMED', 'DORMANT', 'DORMANT', 'ARMED', 'DORMANT'], // 1.0/8 = 0.125
  3: ['PARTIAL', 'PARTIAL', 'ARMED', 'DORMANT', 'DORMANT'], //       1.0/5 = 0.200
  4: ['DORMANT', 'DORMANT', 'ARMED', 'DORMANT'], //                  0.0/4 = 0.000
});

describe('§3.5 scoring — reproduces the spec worked example', () => {
  const r = computeScore(SPEC_RUN.thresholds, SPEC_RUN.tripwires);

  it('tier loads match the published run', () => {
    expect(r.tiers.map((t) => t.load)).toEqual([0.6, 0.1, 0.125, 0.2, 0]);
  });
  it('contributions match', () => {
    const c = r.tiers.map((t) => Number(t.contribution.toFixed(4)));
    expect(c).toEqual([0.09, 0.02, 0.0375, 0.05, 0]);
  });
  it('score_raw is 0.1975 and displays as 0.20', () => {
    expect(r.scoreRaw).toBeCloseTo(0.1975, 10);
    expect(r.scoreDisplay).toBe('0.20');
  });
  it('band is late-cycle fragility', () => {
    expect(bandFor(BANDS, r.scoreRaw)?.key).toBe('late_cycle');
  });
  it('coverage is 26 of 27 with the unscoreable id surfaced', () => {
    expect(r.coverage).toEqual({ scored: 26, total: 27, unscoreableIds: ['2.3'] });
  });
});

describe('UNSCOREABLE stays in the denominator (§3.5)', () => {
  it('does not inflate the score when data goes missing', () => {
    const withData = fixture({ 0: ['FIRED', 'DORMANT'] });
    const before = computeScore(withData.thresholds, withData.tripwires).scoreRaw;
    const lost = fixture({ 0: ['FIRED', 'UNSCOREABLE'] });
    const after = computeScore(lost.thresholds, lost.tripwires).scoreRaw;
    expect(after).toBe(before); // score unchanged...
    expect(computeScore(lost.thresholds, lost.tripwires).coverage.scored).toBe(1); // ...coverage gap visible
  });
});

describe('RETIRED is excluded from the denominator', () => {
  it('drops out entirely rather than scoring zero', () => {
    const f = fixture({ 0: ['FIRED', 'RETIRED'] });
    expect(computeScore(f.thresholds, f.tripwires).tiers[0]!.load).toBe(1);
  });
});

describe('§4.3 cascade contribution', () => {
  const r = computeScore(SPEC_RUN.thresholds, SPEC_RUN.tripwires);
  const c = computeCascadeContribution(r.tiers);
  it('reproduces the four published factor scores', () => {
    expect(c.spec_to_fundamental.valuation_vulnerability!.proposed).toBe(3);
    expect(c.spec_to_fundamental.credit_condition_deterioration!.proposed).toBe(2);
    expect(c.spec_to_fundamental.earnings_estimate_momentum!.proposed).toBe(2);
    expect(c.fundamental_to_buy_and_hold.systemic_risk_perception!.proposed).toBe(1);
  });
  it('clamps to 1..5', () => {
    expect(proposedFactorScore(0)).toBe(1);
    expect(proposedFactorScore(1)).toBe(5);
    expect(proposedFactorScore(2)).toBe(5);
  });
});

describe('§3.5 rounding is half-up', () => {
  it('rounds .005 upward rather than to even', () => {
    expect(roundHalfUp2(0.125)).toBe('0.13');
    expect(roundHalfUp2(0.1975)).toBe('0.20');
    expect(roundHalfUp2(0.15)).toBe('0.15');
  });
});

describe('§6 briefing trigger', () => {
  const base = {
    status_changes: [],
    index: { band_changed: false, delta: 0.01 },
    reconciliation_flags: [],
    narrative: { quiet_week: false },
    run_date: '2026-07-27',
  };
  it('stays silent on a quiet week', () => {
    expect(briefingShouldFire({ ...base, narrative: { quiet_week: true } })).toBe(false);
  });
  it('stays silent on a small downgrade', () => {
    expect(
      briefingShouldFire({ ...base, status_changes: [{ direction: 'down', to: 'ARMED' }] }),
    ).toBe(false);
  });
  it('fires on any upgrade', () => {
    expect(briefingShouldFire({ ...base, status_changes: [{ direction: 'up', to: 'PARTIAL' }] })).toBe(true);
  });
  it('fires on FIRED in either direction', () => {
    expect(briefingShouldFire({ ...base, status_changes: [{ direction: 'down', to: 'FIRED' }] })).toBe(true);
  });
  it('fires on band change and on |delta| ≥ 0.05', () => {
    expect(briefingShouldFire({ ...base, index: { band_changed: true, delta: 0 } })).toBe(true);
    expect(briefingShouldFire({ ...base, index: { band_changed: false, delta: -0.05 } })).toBe(true);
  });
  it('fires on a new high-severity reconciliation flag', () => {
    expect(
      briefingShouldFire({
        ...base,
        reconciliation_flags: [{ severity: 'high', opened_on: '2026-07-27', status: 'open' }],
      }),
    ).toBe(true);
  });
});

describe('§8 internal visibility is stripped, not hidden', () => {
  it('removes internal items from member payloads', () => {
    const items = [
      { visibility: 'member' as const, t: 1 },
      { visibility: 'internal' as const, t: 2 },
      { visibility: 'public' as const, t: 3 },
    ];
    expect(stripInternal(items).map((i) => i.t)).toEqual([1, 3]);
  });
});

/* ------------------------------------------------------------------ */
/* Live run — 2026-07-27. Guards the shipped artifact, not a fixture.  */
/* ------------------------------------------------------------------ */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { stripRunForMembers } from '../lib/aiBubble/scoring';
import type { RunFile, ThresholdFile } from '../lib/aiBubble/types';

const DATA = join(__dirname, '..', '..', '..', 'data', 'ai-bubble');
const REAL_THRESHOLDS = JSON.parse(
  readFileSync(join(DATA, 'thresholds.v1.json'), 'utf8'),
) as ThresholdFile;
const REAL_RUN = JSON.parse(
  readFileSync(join(DATA, 'runs', 'run-2026-07-27.json'), 'utf8'),
) as RunFile;

describe('live run 2026-07-27', () => {
  it('has all 28 tripwires, matching the threshold file exactly', () => {
    expect(REAL_THRESHOLDS.tripwires).toHaveLength(28);
    expect(REAL_RUN.tripwires).toHaveLength(28);
    expect(REAL_RUN.tripwires.map((t) => t.id).sort()).toEqual(
      REAL_THRESHOLDS.tripwires.map((t) => t.id).sort(),
    );
  });

  it('the published score reproduces from the tripwire statuses', () => {
    const r = computeScore(REAL_THRESHOLDS, REAL_RUN.tripwires);
    expect(r.scoreRaw).toBeCloseTo(REAL_RUN.index.score_raw, 10);
    expect(r.scoreRaw).toBeCloseTo(0.1975, 10);
    expect(r.scoreDisplay).toBe(REAL_RUN.index.score_display);
    expect(r.tiers.map((t) => t.load)).toEqual(REAL_RUN.tiers.map((t) => t.load));
  });

  it('coverage is 27 of 28 with 2.6 unscoreable', () => {
    const r = computeScore(REAL_THRESHOLDS, REAL_RUN.tripwires);
    expect(r.coverage).toEqual({ scored: 27, total: 28, unscoreableIds: ['2.6'] });
  });

  it('the published cascade factors reproduce from the tier loads', () => {
    const r = computeScore(REAL_THRESHOLDS, REAL_RUN.tripwires);
    const c = computeCascadeContribution(r.tiers);
    const pub = REAL_RUN.cascade_contribution;
    expect(c.spec_to_fundamental.earnings_estimate_momentum!.proposed).toBe(
      pub.spec_to_fundamental.earnings_estimate_momentum!.proposed,
    );
    expect(c.spec_to_fundamental.valuation_vulnerability!.proposed).toBe(
      pub.spec_to_fundamental.valuation_vulnerability!.proposed,
    );
    // tier_load 0.125 → 4×load is exactly 0.5: half-up must give 2, not 1.
    expect(c.spec_to_fundamental.credit_condition_deterioration!.proposed).toBe(2);
    expect(c.fundamental_to_buy_and_hold.systemic_risk_perception!.proposed).toBe(1);
  });

  it('fires the briefing — one upgrade plus a high-severity flag', () => {
    expect(briefingShouldFire(REAL_RUN)).toBe(true);
    expect(REAL_RUN.publication.briefing_should_fire).toBe(true);
  });

  it('strips the internal governance block from the member payload', () => {
    expect(REAL_RUN.epig_governance).toBeDefined(); // present in the canonical source
    const shipped = stripRunForMembers(REAL_RUN as unknown as Record<string, unknown>);
    expect(shipped.epig_governance).toBeUndefined();
    expect(JSON.stringify(shipped)).not.toContain('"visibility":"internal"');
  });

  it('every changed tripwire cites a source dated inside the window', () => {
    for (const t of REAL_RUN.tripwires.filter((x) => x.changed)) {
      expect(t.evidence?.length).toBeGreaterThan(0);
      for (const e of t.evidence ?? []) {
        expect(e.source_date > (REAL_RUN.source_window_start ?? '')).toBe(true);
      }
    }
  });
});
