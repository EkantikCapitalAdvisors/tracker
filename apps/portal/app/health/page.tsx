import Link from 'next/link';
import { loadContextCards, loadPlainState, type ContextCard, type PlainState } from '@/lib/plainState';
import type { GaugeColor } from '@/lib/plainView';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Market Health — Ekantik Research Portal',
};

/* Gauge color styling — the four colors the prospect specified, on brand. */
const COLOR_STYLES: Record<GaugeColor, { chip: string; border: string; dot: string }> = {
  green: { chip: 'bg-quiet/10 text-quiet border-quiet/40', border: 'border-t-quiet', dot: 'bg-quiet' },
  yellow: { chip: 'bg-[#b8860b]/10 text-[#8a6d1f] border-[#C8A951]/60', border: 'border-t-gold', dot: 'bg-gold' },
  orange: { chip: 'bg-[#c2622a]/10 text-[#a04d1d] border-[#c2622a]/50', border: 'border-t-[#c2622a]', dot: 'bg-[#c2622a]' },
  red: { chip: 'bg-triggered/10 text-triggered border-triggered/50', border: 'border-t-triggered', dot: 'bg-triggered' },
};

/** Semi-circular deployment dial (pure SVG, server-rendered). */
function Dial({ pct }: { pct: number }) {
  const r = 54;
  const len = Math.PI * r;
  const filled = (pct / 100) * len;
  return (
    <svg width="150" height="86" viewBox="0 0 150 86" aria-label={`${pct}% invested`}>
      <path d="M 21 80 A 54 54 0 0 1 129 80" fill="none" stroke="rgba(250,248,245,0.18)" strokeWidth="12" strokeLinecap="round" />
      <path
        d="M 21 80 A 54 54 0 0 1 129 80"
        fill="none"
        stroke="#C8A951"
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${len}`}
      />
      <text x="75" y="66" textAnchor="middle" fill="#FAF8F5" fontSize="26" fontFamily="Georgia, serif">
        {pct}%
      </text>
      <text x="75" y="80" textAnchor="middle" fill="rgba(250,248,245,0.6)" fontSize="10">
        invested
      </text>
    </svg>
  );
}

function boldify(reading: string, bold: string) {
  if (!bold || !reading.includes(bold)) return <>{reading}</>;
  const [before, ...rest] = reading.split(bold);
  return (
    <>
      {before}
      <span className="font-semibold text-navy">{bold}</span>
      {rest.join(bold)}
    </>
  );
}

export default async function HealthPage() {
  let ps: PlainState | null = null;
  let err: string | null = null;
  let context: ContextCard[] = [];
  try {
    ps = await loadPlainState();
    context = await loadContextCards().catch(() => []);
  } catch (e) {
    err = (e as Error).message;
  }

  if (!ps) {
    return (
      <main className="mx-auto max-w-5xl p-8">
        <h1 className="text-2xl">Market Health</h1>
        <p className="mt-4 text-sm text-navy/60">
          {err ? `Data layer unavailable: ${err}` : 'First evaluation pending — check back after the next market close.'}
        </p>
      </main>
    );
  }

  const anyNotGreen = ps.gauges.some((g) => g.color !== 'green');

  return (
    <main className="mx-auto max-w-5xl p-6 md:p-10">
      <header className="mb-4 border-b border-navy/15 pb-4">
        <p className="text-xs uppercase tracking-widest text-navy/50">
          Ekantik Capital Advisors — Correction Intelligence Program
        </p>
        <h1 className="mt-1 text-3xl">Market Health</h1>
        <p className="text-sm text-navy/60">
          Seven gauges, four colors, one rule set — published in advance. {ps.cadence}.
        </p>
      </header>

      <p className="rounded-lg border border-navy/15 bg-navy/[0.03] p-3 text-xs leading-relaxed text-navy/60">
        <span className="font-semibold">Research Publication — Educational and Illustrative.</span>{' '}
        General-circulation research under the publisher&rsquo;s exemption; not personalized
        investment advice. Full disclosures in the{' '}
        <Link href="/dashboard/manual" className="text-gold underline">
          Investor Manual
        </Link>
        .
      </p>

      {/* 1 — Stance banner */}
      <section className="mt-4 rounded-lg border border-navy/15 bg-navy p-6 text-ivory">
        <div className="flex flex-wrap items-center gap-6">
          <Dial pct={ps.deploymentPct} />
          <div className="min-w-[16rem] flex-1">
            <div className="font-heading text-4xl">{ps.stance}</div>
            <p className="mt-1 text-sm text-ivory/75">
              S&P 500 at {ps.spClose?.toFixed(0) ?? '—'} · {ps.drawdownPct?.toFixed(1) ?? '—'}% below
              its recent high
              {ps.tier === 0 ? ' — normal fluctuation, not a signal' : ''}.
              {ps.updatedAt ? ` As of ${ps.updatedAt}.` : ''}
            </p>
          </div>
        </div>
      </section>

      {/* The page's most important sentence */}
      <div className="mt-3 rounded-lg border border-navy/15 border-l-4 border-l-gold bg-white p-4 text-navy">
        <p className="text-xs font-semibold uppercase tracking-widest text-navy/50">
          What would change this
        </p>
        <p className="mt-1 text-[15px] leading-relaxed">
          {ps.checkpoint.before}
          <span className="font-heading text-lg font-bold text-[#8a6d1f]">{ps.checkpoint.number}</span>
          {ps.checkpoint.after}
        </p>
      </div>

      {/* 2 — Ladder strip */}
      <section className="mt-8">
        <h2 className="text-xl">The plan, published in advance</h2>
        <p className="mt-1 text-sm text-navy/60">
          Seven pre-committed levels from fully invested to full defense. The highlighted level is
          where the rules put us today — nothing else about this ladder ever moves.
        </p>
        <div className="mt-3 grid gap-1.5 sm:grid-cols-7">
          {ps.ladder.map((r) => (
            <div
              key={r.id}
              className={`rounded-md border p-2 text-center ${
                r.current ? 'border-gold bg-gold/15 shadow-sm' : 'border-navy/15 bg-white'
              }`}
            >
              <div className="font-heading text-xl">{r.equityPct}%</div>
              <div className={`text-xs font-semibold ${r.current ? 'text-[#8a6d1f]' : 'text-navy/70'}`}>
                {r.stance}
                {r.current ? ' · NOW' : ''}
              </div>
              <div className="mt-1 text-[10px] leading-snug text-navy/50">{r.when}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 3 — Seven gauges */}
      <section className="mt-8">
        <h2 className="text-xl">The seven gauges</h2>
        <p className="mt-1 text-sm text-navy/60">
          Green = healthy · Yellow = average · Orange = concerned · Red = critical. Every color is
          set by rules written before the event — hover nothing, trust nothing: each card says
          exactly what would turn it red.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ps.gauges.map((g) => {
            const st = COLOR_STYLES[g.color];
            return (
              <div key={g.key} className={`rounded-lg border border-navy/15 border-t-4 ${st.border} bg-white p-4`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{g.name}</span>
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-bold tracking-wide ${st.chip}`}>
                    <span className={`h-2 w-2 rounded-full ${st.dot}`} />
                    {g.label}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-snug text-navy/75">{boldify(g.reading, g.bold)}</p>
                <p className="mt-2 text-xs leading-snug text-navy/55">{g.turnsRed}</p>
                <p className="mt-2 border-t border-navy/10 pt-1.5 text-[10px] text-navy/40">{g.engineRef}</p>
              </div>
            );
          })}
        </div>
        {!anyNotGreen && (
          <p className="mt-2 text-sm text-quiet">
            All seven gauges are green — the entire obligation of a calm market is this glance.
          </p>
        )}
      </section>

      {/* 4 — Cash-rule panel */}
      <section className="mt-8 rounded-lg border border-navy/15 bg-navy p-6 text-ivory">
        <h2 className="text-xl text-ivory">
          &ldquo;If everything goes red — get out.&rdquo; Agreed. Here is that rule, frozen in
          advance.
        </h2>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {ps.cashRule.conditions.map((c, idx) => (
            <span key={c.label} className="flex items-center gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-sm font-semibold ${
                  c.met
                    ? 'border-triggered bg-triggered/30 text-ivory'
                    : 'border-ivory/30 bg-ivory/5 text-ivory/70'
                }`}
              >
                {c.label}
                {c.met ? ' ✓' : ''}
              </span>
              {idx < ps.cashRule.conditions.length - 1 && <span className="text-ivory/40">+</span>}
            </span>
          ))}
          <span className="text-ivory/60">→</span>
          <span className="rounded-full border border-gold bg-gold/20 px-3 py-1 text-sm font-bold text-gold">
            0% equities — full defense
          </span>
        </div>
        <p className="mt-3 text-sm text-ivory/75">
          All four have confirmed together only twice in fifty years: 1973–74 (market fell 48%) and
          2007–09 (fell 57%). That is the only condition under which this strategy goes to cash —
          and it was written down before any of it happens.
        </p>
        <p className="mt-2 text-sm text-ivory/75">
          Getting back in is a rule too: a confirmed higher low plus four straight weeks of
          credit-market improvement — never a guess, never a feeling.
        </p>
      </section>

      {/* 5 — Excluded indicators */}
      <section className="mt-8 rounded-lg border border-navy/15 bg-white p-5">
        <h2 className="text-xl">Where are GDP, payrolls, and PMI?</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-navy/70">
          Deliberately absent. GDP and payrolls tell you where the economy <em>was</em> — they are
          revised for months and turn after markets do. Surveys like PMI and consumer sentiment
          failed our causation tests over fifty years of corrections: they echo the market&rsquo;s
          mood, they don&rsquo;t predict its declines. And the big slow numbers — government debt
          to GDP, the dollar&rsquo;s reserve-currency share — move over decades, so they shape the
          long game but can&rsquo;t time anything.
        </p>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-navy/70">
          Every gauge that <em>is</em> on this page earned its place in a 50-year backtest and
          carries a pre-committed retirement rule: if it stops working on live data, it is publicly
          flagged for removal. We would rather show you seven honest gauges than twenty impressive
          ones.
        </p>
      </section>

      {/* 6 — Long-horizon context (colorless by design) */}
      {context.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl">The big slow numbers</h2>
          <p className="mt-1 text-sm text-navy/60">
            Context — these move over decades and are never a timing input, which is why they carry
            no color.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {context.map((c) => (
              <div key={c.label} className="rounded-lg border border-navy/15 bg-navy/[0.02] p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-navy/55">{c.label}</div>
                <div className="mt-1 font-heading text-2xl text-navy/80">{c.value}</div>
                <div className="text-[11px] text-navy/45">{c.asOf ? `as of ${c.asOf}` : 'quarterly'}</div>
                <p className="mt-1.5 text-xs text-navy/55">{c.note}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Deeper doors — sequenced, not hidden */}
      <section className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/dashboard/positioning"
          className="rounded-md bg-navy px-5 py-2.5 text-sm font-semibold text-ivory transition-opacity hover:opacity-90"
        >
          Full detail — the deployment ladder →
        </Link>
        <Link
          href="/dashboard/correction"
          className="rounded-md border border-navy/30 px-5 py-2.5 text-sm font-semibold text-navy transition-colors hover:bg-navy/5"
        >
          Engine room — full methodology (dense) →
        </Link>
      </section>

      <footer className="mt-10 border-t border-navy/10 pt-4 text-xs leading-relaxed text-navy/50">
        General-circulation research published by Ekantik Capital Advisors LLC under the
        publisher&rsquo;s exemption. Not personalized investment advice; not tailored to any
        individual&rsquo;s circumstances. Deployment levels describe the design intent of a
        rules-based framework; all framework claims remain design intent until a live track record
        exists. Past performance, including backtested results, does not guarantee future results.
        All investments carry risk, including loss of principal. See the{' '}
        <Link href="/dashboard/manual" className="text-gold underline">
          Investor Manual
        </Link>{' '}
        for full disclosures.
      </footer>
    </main>
  );
}
