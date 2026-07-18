/**
 * Methodology, theory, and historical-precedent copy for the dashboard.
 * PRESENTATION ONLY — every number here restates the frozen Spec v1.0
 * thresholds, the THRESHOLD_BASIS strings, or the 54-event replay catalog
 * (packages/engine/test/replay/catalog.json). Nothing here feeds the engine.
 */

export interface TierDoc {
  tier: number;
  label: string;
  entry: string;
  exit: string;
  meaning: string;
  precedent: string;
}

export const TIER_DOCS: readonly TierDoc[] = [
  {
    tier: 0,
    label: 'Baseline',
    entry: 'Default state. Tracks the rolling 6-month closing high daily.',
    exit: '—',
    meaning:
      'No qualifying event in progress. The cycle high ratchets up with each new closing high; every other tier measures its drawdown from where this tier last stood. The catalog averages roughly one qualifying event per year since 1974, so this is where the system spends most of its life.',
    precedent:
      'Between-event periods. Quiet stretches in the catalog run from a few months to multi-year droughts — the mid-1980s and mid-1990s bulls produced the longest gaps between qualifying events.',
  },
  {
    tier: 1,
    label: 'Speculative unwind',
    entry: 'First close ≤ −5.0% below the 6-month closing high.',
    exit: 'Close regains the cycle high, or the 30-trading-day window closes with no lower low.',
    meaning:
      'The event-definition threshold from the backtest. Entry anchors the cycle high, opens the 30/60-td failed-recovery router windows, and requires an event-register entry (catalyst + SPECULATIVE / REALITY_BASED tag) within 48h. Most events die here: 27 of the 54 catalog events stopped short of −10%.',
    precedent:
      'Typical residents: 2013 taper tantrum (−5.8%), 2019 trade-war dips (−6.8%, −6.1%), 2021 Evergrande (−5.2%), 1997 Asia I (−6.3%).',
  },
  {
    tier: 2,
    label: 'Fundamental repricing',
    entry: 'Close ≤ −10.0%, or failed-recovery ESCALATE + credit impulse TRIGGERED.',
    exit: '≥ 50% retrace of the decline with credit Δ3m ≤ 0 (narrowing).',
    meaning:
      'Earnings and growth expectations are being repriced — not just positioning. The depth engine activates here and always publishes a range with an invalidation close, never a point estimate. Gear review is mandatory on entry.',
    precedent:
      '20 of 54 events landed in the 10–20% band: 1998 LTCM (−19.3%), 2011 debt ceiling (−19.4%), 2015–16 China/EM (−14.2%), 2018 Q4 tightening (−19.8%), 2025 tariff shock (−18.9%).',
  },
  {
    tier: 3,
    label: 'Capitulation',
    entry: 'Close ≤ −20.0%, or Sahm FIRED + credit crisis > 250bp + policy CONSTRAINED.',
    exit: 'Confirmed higher low (manual entry) + Baa−10y narrowing 4 consecutive weeks.',
    meaning:
      'Buy-and-hold capitulation regime. Exit is condition-based, not price-based — the system will not call a bottom from price alone; it requires the seller (credit) to stand down for a month and a confirmed higher low.',
    precedent:
      '7 of 54 events: 1973–74 oil embargo (−48.2%), 1980–82 Volcker bear (−27.1%), 1987 crash (−33.5%), 2000–02 dot-com (−49.1%), 2007–09 GFC (−56.8%), 2020 COVID (−33.9%), 2022 inflation bear (−25.4%).',
  },
];

export const STATUS_LEGEND: readonly { status: string; meaning: string }[] = [
  { status: 'QUIET', meaning: 'Condition not met. The resting state for every tripwire.' },
  {
    status: 'ARMED',
    meaning:
      'Precondition met but cannot fire a transition by itself — either a context flag (CAPE, curve, rate shock) or a gate awaiting confirmation (Sahm).',
  },
  {
    status: 'TRIGGERED',
    meaning: 'Driver condition met. Feeds the transition rules and depth-engine cascade scoring.',
  },
  {
    status: 'CONSTRAINED',
    meaning:
      'POLICY_SWITCH only: CPI > 4% removes the Fed put. Overlay, never a trigger — forces the depth range to its upper half.',
  },
  {
    status: 'FIRED',
    meaning:
      'SAHM_GATE only: armed AND both confirmation legs met (claims +15% YoY, negative revision breadth). One leg of the non-price Tier-3 entry.',
  },
  {
    status: 'ESCALATE',
    meaning:
      'FAILED_RECOVERY only: no peak regain in 30td AND a lower low inside 60td. Historically P(≥10%) = 58% vs 7% for clean recoveries.',
  },
  {
    status: 'DATA GAP',
    meaning:
      'Input unavailable. The tripwire renders QUIET with the gap marked and the pipeline continues — fail-open, never fabricated.',
  },
];

export interface TripwireDoc {
  theory: string;
  precedent: string;
  reading: string;
}

export const TRIPWIRE_DOCS: Readonly<Record<string, TripwireDoc>> = {
  CREDIT_IMPULSE: {
    theory:
      'Baa−10y is the price of corporate default risk. A widening of ≥ +50bp in three months means credit is repricing corporate balance sheets faster than equities — the seller is fundamental, not mechanical. Strongest depth predictor in the backtest: correlation with final event depth ρ = +0.65 (p < 0.001); widening accompanied 11 of 12 major episodes since 1974.',
    precedent:
      'GFC 2007–09: +406bp → −56.8%. Dot-com 2000–02: +168bp → −49.1%. 1980 credit controls: +156bp → −17.1%. 1973–74: +148bp → −48.2%. COVID 2020: +136bp → −33.9%. Counterexample: the 1987 crash widened only +36bp in a −33.5% event — purely mechanical cascades can bypass credit entirely (that is what RV_ACCEL is for).',
    reading:
      'TRIGGERED + router ESCALATE = Tier-2 entry regardless of drawdown, and pushes the depth range toward its upper half. Δ3m ≤ 0 (narrowing) is required to exit Tier 2.',
  },
  CREDIT_CRISIS: {
    theory:
      'Level, not flow. A Baa−10y spread above 250bp marks the funding-crisis regime where refinancing is impaired and selling becomes forced — the dose-response into capitulation-class outcomes. Distinct from CREDIT_IMPULSE: the impulse catches the repricing in motion; the level confirms the regime has arrived.',
    precedent:
      'Only the GFC produced a sustained crisis-level regime (max widening +406bp) — the deepest event in the catalog at −56.8%. 1973–74, 1980, and 2020 all widened > 130bp without holding the crisis level and stopped at lesser (still severe) depths.',
    reading:
      'One leg of the only non-price Tier-3 entry: Sahm FIRED + credit crisis + policy CONSTRAINED.',
  },
  POLICY_SWITCH: {
    theory:
      'The Fed-put switch. Below 4% CPI the central bank can ease into weakness; above it, easing risks un-anchoring inflation, so drawdowns run deeper before help arrives. Backtest: median event depth 13.9% with CPI above 4% vs 9.4% below (ρ = +0.30, p = 0.03).',
    precedent:
      'The two great inflation-constrained bears: 1973–74 (CPI accelerating through 12%, −48.2%) and 1980–82 (CPI 12.6%, −27.1%). 2022 (CPI 7.5% at the peak): −25.4% with no Fed put until inflation broke. Contrast 1987, 1998, 2020 — policy free, violent declines but fast recoveries.',
    reading:
      'CONSTRAINED is an overlay, never a trigger: it forces the depth-engine range to its upper half and is one leg of the non-price Tier-3 entry. CPI is marked provisional pending revisions.',
  },
  RATE_SHOCK: {
    theory:
      'A ≥ +80bp rise in the 10-year over three months compresses valuations and forces de-risking — but standalone it preceded a correction in only 10 of 18 instances (56%), barely better than a coin flip. The backtest therefore demoted it to a conditioning variable: state-relevant only in combination with a top-tercile CAPE or a credit trigger. Keeping a weak signal demoted is a design feature, not a gap.',
    precedent:
      'Rate-led and contained: 1994 bond massacre (−8.9%), 2013 taper tantrum (−5.8%), 2023 10y-to-5% (−10.3%). Rate shock into rich valuations: 2022, compounding to −25.4%.',
    reading:
      'ARMED is a flag, never a trigger. The card note states whether the combined condition (CAPE top tercile or credit TRIGGERED) currently makes it state-relevant.',
  },
  SAHM_GATE: {
    theory:
      'The Sahm rule — 3-month average unemployment ≥ 0.50pp above its 12-month low — is the most reliable real-time recession marker, and recessions are what turn corrections into bears: Sahm triggered in 56% of ≥15% events vs 24% of shallower ones. But raw Sahm stays elevated through early recoveries and produced the Aug-2024 false positive, so FIRED requires two confirmations: claims 4-wk MA +15% YoY AND negative revision breadth.',
    precedent:
      'Triggered in 18 of 54 catalog events, including every capitulation-class recessionary bear (1973–74, 1980–82, 2000–02, GFC, COVID). The false-positive record the confirmation legs exist to filter: the 1991–92 cluster of five shallow pullbacks with Sahm still elevated after the recession, and Aug-2024 (Sahm 0.53, no recession, −8.5%).',
    reading:
      'ARMED with incomplete confirmation is capped by design — missing breadth data cannot fire the gate. FIRED is one leg of the non-price Tier-3 entry.',
  },
  FAILED_RECOVERY: {
    theory:
      'The behavioral core of the system: after the first −5% close, does the market snap back or roll over? A quick regain is a shakeout; a failed bounce plus a lower low reveals sustained institutional distribution. In the 1990–2022 daily cohort (n = 33), escalated events extended to ≥10% 58% of the time vs 7% for clean recoveries — an 8× separation, the strongest binary discriminator in the study.',
    precedent:
      'ESCALATE cohort: 1990 Gulf War, 1998 LTCM, 2000–02, 2007–09, 2011 debt ceiling, 2015–16 China/EM, 2018 Q4, 2022. CLEAN cohort: 1997 Asia, 2013 taper tantrum, 2019 trade-war dips, 2021 Evergrande. Router-moot: 1990 January break, 2018 Volmageddon, 2020 COVID — crashes that reached −10% before the 30-td window could resolve; the speed was the answer.',
    reading:
      'OPEN starts at the −5% cross. ESCALATE requires BOTH legs: no peak regain within 30 trading days AND a close below the initial-cross low within 60. ESCALATE + credit impulse TRIGGERED = Tier-2 entry regardless of drawdown.',
  },
  RV_ACCEL: {
    theory:
      'When 10-day realized volatility runs ≥ 1.75× the 60-day baseline, the mechanical seller class engages: vol-targeting funds, risk parity, CTAs, and dealer gamma hedging all de-risk on the same signal, so selling begets selling regardless of fundamentals. Directionally validated in the backtest (small n) — held as activation context, not a driver.',
    precedent:
      'The mechanical archetypes: 1987 portfolio insurance (−33.5% with almost no credit signal), 2010 flash crash, 2018 Volmageddon (−10.2% in nine sessions), 2020 COVID (fastest ≥30% decline in the catalog), 2024 yen-carry unwind.',
    reading:
      'TRIGGERED marks mechanical-class engagement — expect gap risk and overshoot. Feeds activation context and depth-engine cascade scoring; not a transition input.',
  },
  VIX_CONFIRM: {
    theory:
      'VIX is endogenous — it spikes with the drawdown, not ahead of it. It appeared in only 19% of Tier-1 events but 77% of Tier-2 and 100% of Tier-3: an excellent grader of cascade severity and a worthless predictor. The engine encodes this structurally — the transition function’s input type does not contain the VIX field, and a regression test asserts it can never alter a transition.',
    precedent:
      'Every ≥20% event in the catalog ran VIX ≥ 30 sustained; most sub-10% events never did.',
    reading:
      'TRIGGERED grades the severity of the current tier, nothing else. If a tier ever changed because of VIX, that would be a bug — report it.',
  },
  CAPE_HIGH: {
    theory:
      'Starting valuation is dry tinder: it does not time the spark, it multiplies how often sparks catch. With Shiller CAPE in its top trailing-30-year tercile, corrections start ~3× more frequently — but once an event begins, CAPE has zero power to predict its depth. The trailing-30y window keeps the tercile honest across regimes (an absolute CAPE bar would read “always expensive” after 1995).',
    precedent:
      '2000 dot-com and 2022 both launched from top-tercile readings into ≥25% events; the 2010–2016 correction cluster started from mid/low terciles and stayed shallower on average.',
    reading:
      'ARMED = elevated event-start frequency and a red flag in depth cascade scoring — nothing more. Never a trigger.',
  },
  CURVE_INVERTED: {
    theory:
      '10y−3m inversion means the market prices policy as restrictive enough to break growth — historically preceding recessions with a long and famously variable lead measured in quarters, not days. That makes it a regime flag: it tells you which kind of cycle you are in, never when an event starts.',
    precedent:
      'Inverted ahead of the 2000–02 and 2007–09 bears. The 2022–24 inversion was the longest on record while the associated equity event (2022, −25.4%) arrived before the traditional recession lag resolved — the standing case study in why this flag is never timing.',
    reading: 'ARMED raises L0 vulnerability context. Participates in no transition and no depth stage.',
  },
};

export const LAYER_THEORY: Readonly<Record<string, string>> = {
  L0: 'Conditions that make the forest flammable — none of them strike the match. Multipliers of event frequency (CAPE ×3) and event depth (policy overlay); structurally excluded from firing transitions.',
  L1: 'The causes: credit repricing, funding stress, recession onset, rate shocks. Only this layer — plus the L2 router — can set state.',
  L2: 'Who is actually selling: the behavioral router (failed recovery) and the mechanical class (RV acceleration). Escalates state only in combination with L1.',
  L3: 'The symptoms: volatility and stress prints that arrive with the cascade. They grade severity after the fact and can never fire a transition — enforced by the type system and a regression test.',
};

export const METHODOLOGY = {
  intro:
    'This dashboard classifies S&P 500 drawdowns by measuring the seller — who is selling and why — rather than the headline. Its authority is the Correction Dashboard System Specification v1.0 (Jul 14, 2026) and “The Anatomy of Correction Depth,” a 50-year backtest of 54 events (Jan 1974 – Jul 2026). Every threshold was frozen from that backtest before the first live reading; the causal chain runs L0 vulnerability → L1 drivers → L2 seller activation → L3 confirmation, and only drivers and the router can move the tier.',
  baseRates:
    'Base rates from the 54-event catalog: roughly one qualifying event (close ≤ −5%) per year since 1974. Of the 54: 27 stopped short of −10% (half of all events die in the speculative band), 20 landed in the 10–20% fundamental-repricing band, and 7 went past −20% into capitulation. Median event depth ≈ 10%. Every capitulation-class event carried at least one of: major credit widening, a Sahm recession signal, or constrained policy — the deepest (GFC, −56.8%) carried all three.',
  router:
    'The failed-recovery router is the system’s behavioral centerpiece. On the first −5% close it opens two windows: 30 trading days to regain the peak, 60 to avoid a lower low. Clean recoveries (regain inside 30td, or 60td passes without a lower low) extended to ≥10% only 7% of the time in the 1990–2022 cohort; failed recoveries extended 58% of the time. Three crashes (1990 January, Volmageddon, COVID) hit −10% before the window could resolve — when the router is moot, speed itself is the signal.',
  depthEngine:
    'In Tier ≥ 2 the depth engine publishes an estimated further-decline range — never a point estimate (the return type has no point field). Four frozen stages: (1) seller-class base band from the event-register tag — speculative 1–5%, fundamental 5–15%, capitulation 15–50%; (2) cascade scoring — red flags (credit, Sahm, breadth, failed recovery, policy) vs green flags (credit quiet, policy free, stable claims, regain attempt) shift the range to the upper or lower half at net ±2; (3) valuation adjustment — analog-event P/E ratio, clamped ×0.5–2.0; (4) policy overlay — CONSTRAINED forces the upper half. Each range ships with the invalidation close that exits the tier.',
  falsifiability:
    'The system is built to be falsified, not defended. Every TRIGGERED / FIRED / ESCALATE reading opens a 9-month outcome window in the false-positive ledger (did a ≥10% event follow?). Pre-committed retirement criteria fire Slack alerts that propose — never apply — suspension: credit impulse after 3 consecutive live triggers with no ≥10% event; Sahm after a 2nd consecutive FIRED with no recession in 12m; the router if live P(≥10%|ESCALATE) drops below 35% over any 10 escalations; rate shock after 2 failed combined flags. Tripwire and state logs are append-only at the database level, and an annual January export re-runs the backtest against the year’s live readings.',
  governance:
    'Thresholds are frozen at the Postgres level: UPDATE/DELETE on a frozen row is rejected by trigger. The only mutation path is a written justification (≥50 chars) → 48-hour minimum cool-off (DB-enforced) → countersignature by a second person (proposer cannot countersign; DB-enforced) → an apply RPC. Portal and worker both verify at load that live thresholds match the committed constants and abort on any divergence without a countersigned change.',
} as const;
