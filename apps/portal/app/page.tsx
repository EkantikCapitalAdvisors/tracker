import Link from 'next/link';
import { loadLandingState } from '@/lib/data';
import { computePositioning } from '@/lib/positioning';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Ekantik Research Portal — Correction Intelligence',
  description:
    'Rules-based correction intelligence: pre-committed market positioning, live tripwire evidence, and a 50-year backtested methodology. Measure the seller, not the headline.',
};

const CARDS = [
  {
    href: '/dashboard/manual',
    step: 'START HERE',
    title: 'Investor Manual',
    blurb:
      'How to use this site in five minutes: why depth is set by who is selling, the deployment ladder from flat to fully invested, when we reduce, when we re-enter — and what the system will never do.',
    cta: 'Read the manual',
    featured: true,
  },
  {
    href: '/dashboard/positioning',
    step: 'STEP 1 — WHAT',
    title: 'Market Positioning',
    blurb:
      'The answer first: current equity deployment (0–100%), the pre-committed ladder rung that set it, the drivers behind it, and the exact closing price that would change it.',
    cta: 'See the current level',
    featured: false,
  },
  {
    href: '/dashboard/correction',
    step: 'STEP 2 — WHY',
    title: 'Correction Dashboard',
    blurb:
      'The live evidence: the tier state machine, ten tripwires read against frozen thresholds, the failed-recovery router, global market context, and the public false-positive ledger.',
    cta: 'Inspect the evidence',
    featured: false,
  },
  {
    href: '/ai-bubble',
    step: 'EVIDENCE',
    title: 'AI Bubble Trigger Index',
    blurb:
      'Twenty-eight pre-committed tripwires across five tiers — spending, narrative, financing, demand, systemic — scored weekly against unchanged thresholds. Feeds the correction model rather than sitting beside it.',
    cta: 'See the Index',
    featured: false,
  },
  {
    href: '/dashboard/methodology',
    step: 'STEP 4 — RULES',
    title: 'Methodology & Rulebook',
    blurb:
      'The machinery in the open: the 50-year backtest (54 events, 1974–2026), all 16 frozen thresholds with the evidence behind each number, and the governance that keeps them frozen.',
    cta: 'Audit the rules',
    featured: false,
  },
];

const TIER_LABELS: Record<number, string> = {
  0: 'Baseline',
  1: 'Speculative unwind',
  2: 'Fundamental repricing',
  3: 'Capitulation',
};

export default async function Home() {
  let live: Awaited<ReturnType<typeof loadLandingState>> = null;
  try {
    live = await loadLandingState();
  } catch {
    /* landing renders without the live strip */
  }
  const pos = live
    ? computePositioning({ tier: live.tier, routerStatus: live.routerStatus, statuses: live.statuses })
    : null;

  return (
    <main className="mx-auto max-w-5xl p-6 md:p-10">
      {/* Hero */}
      <header className="rounded-lg border border-navy/15 bg-navy px-8 py-10 text-ivory">
        <p className="text-xs uppercase tracking-widest text-gold">
          Ekantik Capital Advisors — Correction Intelligence Program
        </p>
        <h1 className="mt-2 text-4xl">Ekantik Research Portal</h1>
        <p className="mt-3 font-heading text-xl text-ivory/90">
          Measure the seller, not the headline.
        </p>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ivory/75">
          A rules-based correction intelligence system. Every threshold was fixed by a 50-year
          backtest before the first live reading; every allocation level was published before the
          event that triggers it. When markets fall, this site does not form an opinion — it
          reports which pre-committed rule applies and what specific close would change it.
        </p>

        {/* Live state strip */}
        {live && pos && (
          <Link
            href="/dashboard/positioning"
            className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-md border border-gold/50 bg-gold/10 px-4 py-3 transition-colors hover:bg-gold/20"
          >
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gold">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-quiet opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-quiet" />
              </span>
              Live
            </span>
            <span className="font-heading text-lg">
              TIER {live.tier} — {TIER_LABELS[live.tier]}
            </span>
            {live.drawdownPct !== null && (
              <span className="text-sm text-ivory/80">
                S&P {live.drawdownPct.toFixed(1)}% vs cycle high
              </span>
            )}
            <span className="text-sm text-ivory/80">
              Policy: <span className="font-semibold text-ivory">{pos.equityPct}% invested · {pos.cashPct}% cash</span>
            </span>
            {live.asOf && <span className="text-xs text-ivory/50">as of {live.asOf}</span>}
            <span className="ml-auto text-sm font-semibold text-gold">Open →</span>
          </Link>
        )}
      </header>

      {/* Cards */}
      <section className="mt-8 grid gap-4 md:grid-cols-2">
        {CARDS.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className={`group flex flex-col rounded-lg border p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg ${
              c.featured
                ? 'border-gold/60 bg-gradient-to-br from-gold/15 to-gold/5'
                : 'border-navy/15 bg-white hover:border-navy/30'
            }`}
          >
            <p
              className={`text-[11px] font-semibold uppercase tracking-widest ${
                c.featured ? 'text-[#8a6d1f]' : 'text-navy/50'
              }`}
            >
              {c.step}
            </p>
            <h2 className="mt-1 text-2xl">{c.title}</h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-navy/70">{c.blurb}</p>
            <p
              className={`mt-4 text-sm font-semibold ${
                c.featured ? 'text-[#8a6d1f]' : 'text-navy/70'
              } group-hover:text-navy`}
            >
              {c.cta} <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </p>
          </Link>
        ))}
      </section>

      {/* Standard + disclaimer */}
      <footer className="mt-10 border-t border-navy/10 pt-5">
        <p className="font-heading text-lg text-navy">
          Your Wealth. Our Accountability. Total Transparency.
        </p>
        <p className="mt-2 max-w-3xl text-xs leading-relaxed text-navy/50">
          General-circulation research published by Ekantik Capital Advisors LLC under the
          publisher&rsquo;s exemption. Not personalized investment advice; not tailored to any
          individual&rsquo;s circumstances. Backtested statistics are hypothetical. See the{' '}
          <Link href="/dashboard/manual" className="text-gold underline">
            Investor Manual
          </Link>{' '}
          for full disclosures.
        </p>
      </footer>
    </main>
  );
}
