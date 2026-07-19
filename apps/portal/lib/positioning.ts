/**
 * Market positioning — pre-committed equity-deployment ladder driven by the
 * live correction state machine. PRESENTATION/POLICY LAYER ONLY: it reads the
 * engine's outputs (tier, router, tripwire statuses) and never feeds anything
 * back. The ladder is published research under the same publisher's-exemption
 * disclaimer as every other Ekantik output — illustrative, not personalized
 * advice. Bands restate the Spec §4 seller-class depth bands and the catalog
 * statistics; changing them is an editorial decision, not a governance event
 * (they are NOT part of the frozen threshold set).
 */

export const POSITIONING_DISCLAIMER =
  'Research Publication — Educational and Illustrative. The market positioning below is ' +
  'general-circulation research published by Ekantik Capital Advisors LLC under the ' +
  "publisher's exemption. It is not personalized investment advice and is not tailored to any " +
  "subscriber's individual financial circumstances. Subscribers should consult their own " +
  'financial professional before acting on any research.';

export interface LadderRow {
  id: string;
  /** Equity deployment (% of the equity sleeve), 0–100. */
  equityPct: number;
  condition: string;
  action: string;
  rationale: string;
}

/** The full pre-committed ladder, best state first. Exactly one row is active. */
export const POSITIONING_LADDER: readonly LadderRow[] = [
  {
    id: 'T0',
    equityPct: 100,
    condition: 'Tier 0 — no qualifying event',
    action: 'Fully invested',
    rationale:
      'Base rate is ~one qualifying event per year; the cost of standing aside in Tier 0 compounds. Nothing is sold on headlines — only on a −5% close.',
  },
  {
    id: 'T1',
    equityPct: 85,
    condition: 'Tier 1 · router OPEN (first −5% close, bounce undecided)',
    action: 'Trim the speculative sleeve; hold core',
    rationale:
      'Half of the 54 catalog events died short of −10% — hard de-risking on every −5% is the historically losing move. Cut leverage and momentum names, keep the core, let the 30-td router decide.',
  },
  {
    id: 'T1_ESC',
    equityPct: 70,
    condition: 'Tier 1 · router ESCALATE (failed bounce + lower low)',
    action: 'Reduce to core positions',
    rationale:
      'The failed-recovery signal: P(≥10%) jumps to 58% vs 7% for clean recoveries. The seller is persistent — respect it before the −10% print, not after.',
  },
  {
    id: 'T2',
    equityPct: 55,
    condition: 'Tier 2 — fundamental repricing (policy FREE, credit quiet)',
    action: 'Half deployed; stage re-entry orders',
    rationale:
      'Depth engine band: typically 5–15% further from here. With the Fed free and credit quiet, the historical median resolves shallow — stay half-in rather than flat.',
  },
  {
    id: 'T2_RED',
    equityPct: 40,
    condition: 'Tier 2 + policy CONSTRAINED or credit impulse TRIGGERED',
    action: 'Reduced to defensive core',
    rationale:
      'The two depth multipliers: CPI > 4% removes the Fed put (median depth 13.9% vs 9.4%) and credit widening carries ρ = +0.65 to final depth. The published range is forced to its upper half — deployment follows it down.',
  },
  {
    id: 'T3',
    equityPct: 25,
    condition: 'Tier 3 — capitulation (price-driven: close ≤ −20%)',
    action: 'Defensive floor; buy only on conditions',
    rationale:
      'Capitulation band runs 15–50% deep. The floor stays invested because Tier-3 entries are historically closer to the bottom than the top — but adding waits for the exit conditions (confirmed higher low + 4 weeks of credit narrowing), never a price guess.',
  },
  {
    id: 'T3_FLAT',
    equityPct: 0,
    condition: 'Tier 3 + Sahm FIRED + credit crisis > 250bp + policy CONSTRAINED',
    action: 'Flat — full defense',
    rationale:
      'The recessionary-capitulation stack: every leg of the non-price Tier-3 entry confirmed at once. This is the 1973–74 (−48%) and 2007–09 (−57%) profile — the only regimes in 50 years where flat beat every partial deployment.',
  },
];

export interface PositioningInput {
  tier: number;
  routerStatus: string | null;
  /** tripwire id → status, from the latest evaluation board. */
  statuses: ReadonlyMap<string, string>;
}

export interface PositioningResult {
  row: LadderRow;
  equityPct: number;
  cashPct: number;
  zone: 'FULLY INVESTED' | 'TRIMMED' | 'REDUCED' | 'DEFENSIVE' | 'FLAT';
  /** `href` deep-links to the driver's evidence card on the Correction Dashboard. */
  drivers: { name: string; value: string; bearish: boolean; href: string }[];
}

/** Deterministic mapping — same inputs, same answer, no discretion. */
export function computePositioning(input: PositioningInput): PositioningResult {
  const s = (id: string) => input.statuses.get(id) ?? 'QUIET';
  const constrained = s('POLICY_SWITCH') === 'CONSTRAINED';
  const creditImpulse = s('CREDIT_IMPULSE') === 'TRIGGERED';
  const creditCrisis = s('CREDIT_CRISIS') === 'TRIGGERED';
  const sahmFired = s('SAHM_GATE') === 'FIRED';

  let id: string;
  if (input.tier >= 3) {
    id = sahmFired && creditCrisis && constrained ? 'T3_FLAT' : 'T3';
  } else if (input.tier === 2) {
    id = constrained || creditImpulse ? 'T2_RED' : 'T2';
  } else if (input.tier === 1) {
    id = input.routerStatus === 'ESCALATE' ? 'T1_ESC' : 'T1';
  } else {
    id = 'T0';
  }
  const row = POSITIONING_LADDER.find((r) => r.id === id)!;

  const zone: PositioningResult['zone'] =
    row.equityPct >= 100
      ? 'FULLY INVESTED'
      : row.equityPct >= 70
        ? 'TRIMMED'
        : row.equityPct >= 40
          ? 'REDUCED'
          : row.equityPct > 0
            ? 'DEFENSIVE'
            : 'FLAT';

  const evidence = (anchor: string) => `/dashboard/correction#${anchor}`;
  const drivers = [
    { name: 'Tier', value: `TIER ${input.tier}`, bearish: input.tier >= 1, href: evidence('state') },
    { name: 'Router', value: input.routerStatus ?? 'INACTIVE', bearish: input.routerStatus === 'ESCALATE', href: evidence('tw-FAILED_RECOVERY') },
    { name: 'Policy', value: constrained ? 'CONSTRAINED' : 'FREE', bearish: constrained, href: evidence('tw-POLICY_SWITCH') },
    { name: 'Credit impulse', value: s('CREDIT_IMPULSE'), bearish: creditImpulse, href: evidence('tw-CREDIT_IMPULSE') },
    { name: 'Credit crisis', value: s('CREDIT_CRISIS'), bearish: creditCrisis, href: evidence('tw-CREDIT_CRISIS') },
    { name: 'Sahm gate', value: s('SAHM_GATE'), bearish: sahmFired || s('SAHM_GATE') === 'ARMED', href: evidence('tw-SAHM_GATE') },
  ];

  return { row, equityPct: row.equityPct, cashPct: 100 - row.equityPct, zone, drivers };
}

export const POSITIONING_NOTES = {
  method:
    'The deployment level is a deterministic function of the correction state machine: tier, failed-recovery router, and the three depth multipliers (policy switch, credit impulse, credit crisis, Sahm gate). Same inputs, same answer — there is no discretionary score. It replaces the legacy weighted-score gauge: instead of a 0–100 blend, you see exactly which frozen rule put you at this level and exactly what close or signal would change it.',
  reentry:
    'Re-entry follows the same ladder in reverse, driven by the frozen exit conditions — regain of the cycle high or a clean 30-td window (Tier 1), a 50% retrace with credit narrowing (Tier 2), a confirmed higher low plus four consecutive weeks of Baa−10y narrowing (Tier 3). Deployment steps back up as the state machine de-escalates; it never front-runs price.',
  sizing:
    'Percentages refer to deployment of the equity sleeve (100% = the portfolio’s normal full equity weight), not total net worth. Options overlays, hedges, and the cash yield on the undeployed balance are outside this ladder’s scope.',
} as const;
