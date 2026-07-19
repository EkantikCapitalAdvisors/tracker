import Link from 'next/link';
import { loadThresholdsOnly } from '@/lib/data';
import { METHODOLOGY, TIER_DOCS } from '@/lib/methodology';

export const dynamic = 'force-dynamic';

const SECTIONS: readonly [string, string][] = [
  ['Historical base rates — 54 events, 1974–2026', METHODOLOGY.baseRates],
  ['The failed-recovery router — why 30/60 trading days', METHODOLOGY.router],
  ['Depth engine — why a range and never a point', METHODOLOGY.depthEngine],
  ['Global context — correlated international markets', METHODOLOGY.global],
  ['Falsifiability — FP ledger and retirement criteria', METHODOLOGY.falsifiability],
  ['Governance — why the thresholds cannot drift', METHODOLOGY.governance],
];

export default async function MethodologyPage() {
  let thresholds: Awaited<ReturnType<typeof loadThresholdsOnly>> = [];
  try {
    thresholds = await loadThresholdsOnly();
  } catch {
    // Table renders a fallback row below; the prose is still useful without it.
  }

  return (
    <main className="mx-auto max-w-5xl p-6 md:p-10">
      <header className="mb-6 border-b border-navy/15 pb-4">
        <p className="text-xs uppercase tracking-widest text-navy/50">
          Ekantik Capital Advisors — Correction Intelligence Program
        </p>
        <h1 className="mt-1 text-3xl">Methodology &amp; Rulebook</h1>
        <p className="text-sm text-navy/60">
          The theory, evidence, and governance behind the{' '}
          <Link href="/dashboard/correction" className="text-gold underline">
            Correction Dashboard
          </Link>{' '}
          and the{' '}
          <Link href="/dashboard/positioning" className="text-gold underline">
            Market Positioning ladder
          </Link>
          .
        </p>
      </header>

      <p className="max-w-4xl text-sm text-navy/75">{METHODOLOGY.intro}</p>

      {SECTIONS.map(([title, body]) => (
        <section key={title} className="mt-8">
          <h2 className="text-xl">{title}</h2>
          <p className="mt-2 max-w-4xl text-sm text-navy/70">{body}</p>
        </section>
      ))}

      {/* Tier reference */}
      <section className="mt-8">
        <h2 className="text-xl">Tier reference</h2>
        <div className="mt-3 overflow-x-auto rounded-lg border border-navy/15 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-navy/5 text-left text-xs uppercase tracking-wide text-navy/60">
              <tr>
                <th className="p-2 whitespace-nowrap">Tier</th>
                <th className="p-2">Entry (frozen)</th>
                <th className="p-2">Exit (frozen)</th>
                <th className="p-2">Historical precedent</th>
              </tr>
            </thead>
            <tbody className="align-top">
              {TIER_DOCS.map((t) => (
                <tr key={t.tier} className="border-t border-navy/10">
                  <td className="p-2 whitespace-nowrap font-semibold">
                    TIER {t.tier}
                    <div className="text-xs font-normal text-navy/60">{t.label}</div>
                  </td>
                  <td className="p-2 text-navy/80">{t.entry}</td>
                  <td className="p-2 text-navy/80">{t.exit}</td>
                  <td className="p-2 text-navy/70">{t.precedent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* The frozen-threshold rulebook */}
      <section className="mt-8">
        <h2 className="text-xl">The frozen-threshold rulebook</h2>
        <p className="mt-2 max-w-4xl text-sm text-navy/70">
          These 16 numbers are everything the state machine runs on — every card on the dashboard
          is a comparison against one of them. They were fixed by the 50-year backtest{' '}
          <em>before</em> the first live reading, and the &ldquo;backtest basis&rdquo; column is
          each number&rsquo;s evidence. They are frozen at the database level: edits are rejected
          by trigger, and the only change path is a written justification, a 48-hour cool-off, and
          a countersignature from a second person. The worker and portal verify on every run that
          the live values match the committed constants — so this table is provably what is
          running, not documentation that might have drifted.
        </p>
        <div className="mt-3 overflow-x-auto rounded-lg border border-navy/15 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-navy/5 text-left text-xs uppercase tracking-wide text-navy/60">
              <tr>
                <th className="p-2">Key</th>
                <th className="p-2">Value</th>
                <th className="p-2">Unit</th>
                <th className="p-2">Backtest basis</th>
              </tr>
            </thead>
            <tbody>
              {thresholds.map((t) => (
                <tr key={t.key} className="border-t border-navy/10">
                  <td className="p-2 font-mono text-xs">{t.key}</td>
                  <td className="p-2">{t.value}</td>
                  <td className="p-2">{t.unit}</td>
                  <td className="p-2 text-navy/70">{t.basis}</td>
                </tr>
              ))}
              {thresholds.length === 0 && (
                <tr>
                  <td className="p-3 text-navy/60" colSpan={4}>
                    Threshold table unavailable — data layer not reachable.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="mt-10 border-t border-navy/10 pt-4 text-xs text-navy/50">
        Authority: Correction Dashboard System Specification v1.0 (Jul 14, 2026) · &ldquo;The
        Anatomy of Correction Depth&rdquo; (54 events, 1974–2026). Internal research instrument —
        not investment advice.
      </footer>
    </main>
  );
}
