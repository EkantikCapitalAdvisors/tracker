/**
 * Plain View translation layer — Tracker v2.1 §3/§5.
 *
 * PURE presentation mapping: colors are a function of existing state-machine
 * output plus interpolated PRESENTATION_BANDS. Structurally incapable of
 * feeding computeState (the engine is a pure package with no access to any
 * of this). Invariant, unit-tested: a gauge may never display a BETTER color
 * than its engine status implies — bands only interpolate, never override.
 */

import { POSITIONING_LADDER, type LadderRow } from './positioning';

export type GaugeColor = 'green' | 'yellow' | 'orange' | 'red';
export const COLOR_LABELS: Record<GaugeColor, string> = {
  green: 'HEALTHY',
  yellow: 'AVERAGE',
  orange: 'CONCERNED',
  red: 'CRITICAL',
};
const RANK: Record<GaugeColor, number> = { green: 0, yellow: 1, orange: 2, red: 3 };
const worse = (a: GaugeColor, b: GaugeColor): GaugeColor => (RANK[a] >= RANK[b] ? a : b);

export interface PresentationBands {
  creditYellowBp: number; // Δ3m ≥ this → yellow (frozen trigger at +50 stays orange)
  fedGreenMax: number; //    CPI ≤ this → green
  fedYellowMax: number; //   CPI ≤ this → yellow (frozen switch at 4.0 → orange)
  jobsGreenMax: number; //   Sahm < this → green
  jobsYellowMax: number; //  Sahm < this → yellow (frozen arm at 0.50 → orange)
  recoveryOrangeTd: number; // router OPEN past this many td → orange
}
export const DEFAULT_BANDS: PresentationBands = {
  creditYellowBp: 25,
  fedGreenMax: 3.5,
  fedYellowMax: 4.0,
  jobsGreenMax: 0.35,
  jobsYellowMax: 0.5,
  recoveryOrangeTd: 30,
};

export interface PlainViewInputs {
  tier: number;
  drawdownPct: number | null;
  routerStatus: string | null;
  tdSinceCross: number | null;
  /** tripwire id → status from the latest evaluation board. */
  statuses: ReadonlyMap<string, string>;
  /** tripwire id → note (distinguishes rate-shock standalone vs state-relevant). */
  notes: ReadonlyMap<string, string>;
  creditDelta3mBp: number | null;
  creditLevelBp: number | null;
  cpiYoYPct: number | null;
  sahmValue: number | null;
  /** 0 = bottom, 1 = middle, 2 = top trailing-30y tercile. */
  capeTercile: 0 | 1 | 2 | null;
  spClose: number | null;
  cycleHigh: number | null;
  asOf: string | null;
  bands: PresentationBands;
}

export interface PlainGauge {
  key: string;
  name: string;
  color: GaugeColor;
  label: string; // HEALTHY / AVERAGE / CONCERNED / CRITICAL
  reading: string; // plain-english, contains `bold` exactly once when bold ≠ ''
  bold: string; // the one number to bold inside `reading`
  turnsRed: string;
  engineRef: string; // muted footnote naming the frozen signal
  /** true when a presentation band (not raw engine status) set the color. */
  bandDriven: boolean;
  dataGap: boolean;
}

const fmt = (v: number | null, digits = 1): string => (v === null ? 'N/A' : v.toFixed(digits));

export function computePlainGauges(i: PlainViewInputs): PlainGauge[] {
  const s = (id: string) => i.statuses.get(id) ?? 'QUIET';
  const gauges: PlainGauge[] = [];
  const push = (
    key: string,
    name: string,
    engineFloor: GaugeColor,
    bandColor: GaugeColor,
    reading: string,
    bold: string,
    turnsRed: string,
    engineRef: string,
    dataGap = false,
  ) => {
    // Invariant: never better than the engine floor. Bands only interpolate upward.
    const color = worse(bandColor, engineFloor);
    gauges.push({
      key,
      name,
      color,
      label: COLOR_LABELS[color],
      reading,
      bold,
      turnsRed,
      engineRef,
      bandDriven: RANK[bandColor] > RANK[engineFloor],
      dataGap,
    });
  };

  // 1 — Market Trend: tier is the color, directly.
  {
    const floor: GaugeColor = i.tier >= 3 ? 'red' : i.tier === 2 ? 'orange' : i.tier === 1 ? 'yellow' : 'green';
    const dd = fmt(i.drawdownPct);
    push(
      'market',
      'Market Trend',
      floor,
      floor,
      i.tier === 0
        ? `The S&P 500 is ${dd}% below its recent high — normal fluctuation, not a signal.`
        : `The S&P 500 is ${dd}% below its recent high.`,
      `${dd}%`,
      'Turns red when: the market closes 20% or more below its high.',
      'engine: tier state machine · drawdown vs 6-month closing high',
      i.drawdownPct === null,
    );
  }

  // 2 — Credit Stress: crisis red · impulse orange · Δ3m ≥ band yellow · else green.
  {
    const crisis = s('CREDIT_CRISIS') === 'TRIGGERED';
    const impulse = s('CREDIT_IMPULSE') === 'TRIGGERED';
    const floor: GaugeColor = crisis ? 'red' : impulse ? 'orange' : 'green';
    const band: GaugeColor =
      i.creditDelta3mBp !== null && i.creditDelta3mBp >= i.bands.creditYellowBp ? 'yellow' : 'green';
    const d = i.creditDelta3mBp;
    push(
      'credit',
      'Credit Stress',
      floor,
      band,
      d === null
        ? 'What companies pay to borrow vs. the government: no reading available.'
        : `What companies pay to borrow vs. the government has moved ${d >= 0 ? '+' : ''}${d.toFixed(0)} basis points in 3 months.`,
      d === null ? '' : `${d >= 0 ? '+' : ''}${d.toFixed(0)} basis points`,
      'Turns red when: that borrowing gap goes above 250 basis points outright — crisis territory.',
      'engine: CREDIT_IMPULSE (Δ3m ≥ +50bp) · CREDIT_CRISIS (level > 250bp)',
      d === null,
    );
  }

  // 3 — Fed Freedom: CONSTRAINED orange (red while Tier ≥ 2) · CPI bands below.
  {
    const constrained = s('POLICY_SWITCH') === 'CONSTRAINED';
    const floor: GaugeColor = constrained ? (i.tier >= 2 ? 'red' : 'orange') : 'green';
    const band: GaugeColor =
      i.cpiYoYPct === null
        ? 'green'
        : i.cpiYoYPct <= i.bands.fedGreenMax
          ? 'green'
          : i.cpiYoYPct <= i.bands.fedYellowMax
            ? 'yellow'
            : 'green'; // above 4.0 the engine floor (CONSTRAINED) takes over
    push(
      'fed',
      'Fed Freedom',
      floor,
      band,
      i.cpiYoYPct === null
        ? 'Inflation reading unavailable.'
        : constrained
          ? `Inflation is ${i.cpiYoYPct.toFixed(1)}% — above 4%, the Fed's hands are tied.`
          : `Inflation is ${i.cpiYoYPct.toFixed(1)}% — low enough that the Fed is free to help if markets fall.`,
      i.cpiYoYPct === null ? '' : `${i.cpiYoYPct.toFixed(1)}%`,
      'Turns red when: inflation is above 4% while the market is already down 10% or more.',
      'engine: POLICY_SWITCH (CPI YoY > 4.0% = CONSTRAINED)',
      i.cpiYoYPct === null,
    );
  }

  // 4 — Jobs: FIRED red · ARMED orange · Sahm bands below.
  {
    const st = s('SAHM_GATE');
    const floor: GaugeColor = st === 'FIRED' ? 'red' : st === 'ARMED' ? 'orange' : 'green';
    const band: GaugeColor =
      i.sahmValue === null
        ? 'green'
        : i.sahmValue < i.bands.jobsGreenMax
          ? 'green'
          : i.sahmValue < i.bands.jobsYellowMax
            ? 'yellow'
            : 'green'; // ≥ 0.50 the engine floor (ARMED/FIRED) takes over
    push(
      'jobs',
      'Jobs',
      floor,
      band,
      i.sahmValue === null
        ? 'Unemployment-trend reading unavailable.'
        : st === 'FIRED'
          ? `The jobs signal has crossed the danger line (reading ${i.sahmValue.toFixed(2)}) with layoffs confirming.`
          : `Unemployment trend reading is ${i.sahmValue.toFixed(2)} — the danger line is 0.50.`,
      i.sahmValue === null ? '' : i.sahmValue.toFixed(2),
      'Turns red when: the unemployment trend crosses 0.50 AND jobless claims are up 15%+ with earnings estimates falling.',
      'engine: SAHM_GATE (arms ≥ 0.50; fires only with claims + revision-breadth confirmation)',
      i.sahmValue === null,
    );
  }

  // 5 — Bond Market: capped at orange by design (rate shock alone never set state in 50y).
  {
    const rate = s('RATE_SHOCK');
    const curveInverted = s('CURVE_INVERTED') === 'ARMED';
    const stateRelevant = rate === 'ARMED' && (i.notes.get('RATE_SHOCK') ?? '').includes('Combined condition met');
    const floor: GaugeColor = stateRelevant ? 'orange' : rate === 'ARMED' || curveInverted ? 'yellow' : 'green';
    push(
      'bond',
      'Bond Market',
      floor,
      floor,
      stateRelevant
        ? 'Interest rates have jumped fast while stocks are expensive or credit is stressed — it matters now.'
        : rate === 'ARMED'
          ? 'Interest rates have jumped fast, but on its own that has been a coin flip historically.'
          : curveInverted
            ? 'The yield curve is inverted — a slow-moving caution flag, not a timing signal.'
            : 'Interest-rate moves are within normal range.',
      '',
      'Never turns red by design: in 50 years a rate shock alone never caused a major decline — it only matters combined with expensive markets or credit stress.',
      'engine: RATE_SHOCK (Δ3m ≥ +80bp, conditioning flag) · CURVE_INVERTED (10y−3m < 0)',
    );
  }

  // 6 — Valuation: tercile only; capped at orange (valuation never triggers).
  {
    const t = i.capeTercile;
    const color: GaugeColor = t === 2 ? 'orange' : t === 1 ? 'yellow' : 'green';
    push(
      'valuation',
      'Valuation',
      color,
      color,
      t === null
        ? 'Valuation reading unavailable.'
        : t === 2
          ? 'Stocks are expensive vs. their own 30-year history — corrections start about 3× more often from here.'
          : t === 1
            ? 'Stocks are around the middle of their own 30-year valuation range.'
            : 'Stocks are cheap vs. their own 30-year history.',
      '',
      'Never turns red by design: expensive markets make declines more frequent, not deeper — valuation never triggers a stance change on its own.',
      'engine: CAPE_HIGH (top trailing-30y tercile — context multiplier only)',
      t === null,
    );
  }

  // 7 — Recovery Health.
  {
    const rs = i.routerStatus ?? 'INACTIVE';
    const td = i.tdSinceCross ?? 0;
    const floor: GaugeColor =
      rs === 'ESCALATE'
        ? 'red'
        : rs === 'OPEN'
          ? td > i.bands.recoveryOrangeTd
            ? 'orange'
            : 'yellow'
          : 'green';
    push(
      'recovery',
      'Recovery Health',
      floor,
      floor,
      rs === 'INACTIVE'
        ? 'No decline in progress — the 30-day recovery test is not running.'
        : rs === 'ESCALATE'
          ? 'The rebound failed: no recovery in 30 trading days and a new low. Historically this preceded a 10%+ decline 58% of the time.'
          : rs === 'CLEAN'
            ? 'The market passed its recovery test — the decline resolved cleanly.'
            : td > i.bands.recoveryOrangeTd
              ? `Day ${td} of the recovery test: the 30-day rebound window has passed without a recovery — watching for a new low.`
              : `Day ${td} of the 30-day recovery test — too early to judge.`,
      rs === 'OPEN' ? `Day ${td}` : '',
      'Turns red when: the market fails to regain its high within 30 trading days AND then makes a new low.',
      'engine: FAILED_RECOVERY router (30/60-td windows; ESCALATE = P(≥10%) 58% vs 7%)',
    );
  }

  return gauges;
}

/* ------------------------------------------------------------------ */
/* Stance + ladder translation (§5 dictionary)                         */
/* ------------------------------------------------------------------ */

export const STANCE_NAMES: Record<string, string> = {
  T0: 'Fully invested',
  T1: 'Trim',
  T1_ESC: 'Reduce to core',
  T2: 'Half invested',
  T2_RED: 'Defensive',
  T3: 'Defensive floor',
  T3_FLAT: 'Full defense',
};

export const LADDER_PLAIN_WHEN: Record<string, string> = {
  T0: 'Markets normal — no 5% drop from the recent high',
  T1: 'First close 5% below the recent high',
  T1_ESC: 'The 30-day rebound failed and price made a new low',
  T2: 'A 10% decline, with the Fed free and credit calm',
  T2_RED: 'A 10%+ decline while the Fed is tied or credit is stressed',
  T3: 'A 20% decline — capitulation territory',
  T3_FLAT: 'Market −20% + jobs + credit + Fed all critical at once',
};

export interface PlainLadderRung {
  id: string;
  equityPct: number;
  stance: string;
  when: string;
  current: boolean;
}

/** Same numbers as /dashboard/positioning — asserted equal in tests. */
export function plainLadder(currentRowId: string): PlainLadderRung[] {
  return POSITIONING_LADDER.map((r: LadderRow) => ({
    id: r.id,
    equityPct: r.equityPct,
    stance: STANCE_NAMES[r.id] ?? r.action,
    when: LADDER_PLAIN_WHEN[r.id] ?? r.condition,
    current: r.id === currentRowId,
  }));
}

/** The page's most important sentence — what specific number changes the stance. */
export function plainCheckpoint(
  tier: number,
  cycleHigh: number | null,
): { before: string; number: string; after: string } {
  if (cycleHigh === null) return { before: 'Awaiting the first evaluation.', number: '', after: '' };
  switch (tier) {
    case 0:
      return {
        before: 'A close at or below ',
        number: (cycleHigh * 0.95).toFixed(0),
        after: ` on the S&P 500 (5% below the high) would change the stance to “Trim.” Until that number prints, pullbacks are normal fluctuation — not a signal.`,
      };
    case 1:
      return {
        before: 'A close back above ',
        number: cycleHigh.toFixed(0),
        after: ` returns the stance to “Fully invested”; a close at or below ${(cycleHigh * 0.9).toFixed(0)} (10% below the high) moves it to “Half invested.” The 30-day recovery test is also running.`,
      };
    case 2:
      return {
        before: 'A close at or below ',
        number: (cycleHigh * 0.8).toFixed(0),
        after: ` (20% below the high) would move the stance to “Defensive floor”; recovering half the decline while credit calms would step it back up.`,
      };
    default:
      return {
        before: 'The stance steps back up only on ',
        number: 'conditions',
        after: ': a confirmed higher low plus four straight weeks of credit-spread improvement — never a price guess.',
      };
  }
}

export interface CashRuleCondition {
  label: string;
  met: boolean;
}

/** "If everything goes red — get out." The Tier-3 non-price stack, frozen in advance. */
export function cashRule(i: PlainViewInputs): CashRuleCondition[] {
  const s = (id: string) => i.statuses.get(id) ?? 'QUIET';
  return [
    { label: 'Market down 20%', met: i.tier >= 3 },
    { label: 'Jobs signal fired', met: s('SAHM_GATE') === 'FIRED' },
    { label: 'Credit critical (>250bp)', met: s('CREDIT_CRISIS') === 'TRIGGERED' },
    { label: 'Fed constrained (inflation >4%)', met: s('POLICY_SWITCH') === 'CONSTRAINED' },
  ];
}
