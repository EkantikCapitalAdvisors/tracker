import Link from 'next/link';
import { loadDashboard, type DashboardData } from '@/lib/data';
import { Hint } from '@/components/Hint';
import {
  computePositioning,
  POSITIONING_DISCLAIMER,
  POSITIONING_LADDER,
  POSITIONING_NOTES,
} from '@/lib/positioning';
import { TIER_DOCS } from '@/lib/methodology';

export const dynamic = 'force-dynamic';

/** Gauge zones, left (flat) → right (fully invested). */
const ZONES = [
  { to: 25, label: 'DEFENSIVE', cls: 'bg-triggered/70' },
  { to: 55, label: 'REDUCED', cls: 'bg-[#c2822a]/70' },
  { to: 85, label: 'TRIMMED', cls: 'bg-gold/70' },
  { to: 100, label: 'FULLY INVESTED', cls: 'bg-quiet/70' },
];

function whatChangesThis(s: NonNullable<DashboardData['state']>): string {
  switch (s.tier) {
    case 0:
      return `A close ≤ ${(s.cycleHigh! * 0.95).toFixed(0)} (−5% below the ${s.cycleHigh!.toFixed(0)} cycle high) enters Tier 1 → deployment steps to 85%.`;
    case 1:
      return `Regaining ${s.cycleHigh!.toFixed(0)} exits to Tier 0 (→ 100%). A close ≤ ${(s.cycleHigh! * 0.9).toFixed(0)} enters Tier 2 (→ 55% or 40%). Router ESCALATE steps to 70%.`;
    case 2:
      return `A 50% retrace of the decline with credit Δ3m ≤ 0 exits Tier 2 (→ 85–100% as the state de-escalates). A close ≤ ${(s.cycleHigh! * 0.8).toFixed(0)} enters Tier 3 (→ 25%).`;
    default:
      return 'A confirmed higher low + four consecutive weeks of Baa−10y narrowing exits Tier 3 — deployment steps back up the ladder as tiers de-escalate.';
  }
}

export default async function PositioningPage() {
  let data: DashboardData;
  try {
    data = await loadDashboard();
  } catch (err) {
    return (
      <main className="mx-auto max-w-5xl p-8">
        <h1 className="text-2xl">Market Positioning</h1>
        <p className="mt-4 rounded border border-triggered/40 bg-triggered/10 p-4 text-sm">
          Data layer unavailable: {(err as Error).message}.
        </p>
      </main>
    );
  }

  const s = data.state;
  if (!s) {
    return (
      <main className="mx-auto max-w-5xl p-8">
        <h1 className="text-2xl">Market Positioning</h1>
        <p className="mt-4 text-sm text-navy/60">No state recorded yet — run the first daily ingest.</p>
      </main>
    );
  }

  const statuses = new Map(data.tripwires.map((t) => [String(t.id), String(t.status)]));
  const pos = computePositioning({ tier: s.tier, routerStatus: s.routerStatus, statuses });

  return (
    <main className="mx-auto max-w-5xl p-6 md:p-10">
      <header className="mb-6 border-b border-navy/15 pb-4">
        <p className="text-xs uppercase tracking-widest text-navy/50">
          Ekantik Capital Advisors — Correction Intelligence Program
        </p>
        <h1 className="mt-1 text-3xl">Market Positioning</h1>
        <p className="text-sm text-navy/60">
          Pre-committed equity deployment, driven by the live correction state machine — no
          discretionary score.{' '}
          <Link href="/dashboard/correction" className="text-gold underline">
            See the full Correction Dashboard →
          </Link>
        </p>
      </header>

      <p className="rounded-lg border border-navy/15 bg-navy/[0.03] p-4 text-xs leading-relaxed text-navy/70">
        <span className="font-semibold">Research Publication — Educational and Illustrative. </span>
        {POSITIONING_DISCLAIMER.replace('Research Publication — Educational and Illustrative. ', '')}
      </p>

      {/* The answer, first */}
      <section className="mt-6 rounded-lg border border-navy/15 bg-navy p-6 text-ivory">
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <div className="font-heading text-5xl">
            {pos.equityPct}% <span className="text-2xl text-ivory/80">invested</span>
          </div>
          <div className="font-heading text-2xl text-ivory/80">{pos.cashPct}% cash</div>
          <span className="rounded-full border border-gold/60 bg-gold/15 px-3 py-1 text-sm font-semibold tracking-wide text-gold">
            {pos.zone}
          </span>
        </div>
        <p className="mt-2 text-sm text-ivory/80">
          Because: <span className="font-semibold">{pos.row.condition}</span> · S&P{' '}
          {s.spClose?.toFixed(0)} · {s.drawdownPct?.toFixed(1)}% below the cycle high · as of{' '}
          {s.spDate}
        </p>

        {/* Gauge: 0 (flat) → 100 (fully invested) */}
        <div className="relative mt-5">
          <div className="flex h-4 overflow-hidden rounded-full">
            {ZONES.map((z, i) => {
              const from = i === 0 ? 0 : ZONES[i - 1]!.to;
              return (
                <div key={z.label} className={`${z.cls} h-full`} style={{ width: `${z.to - from}%` }} />
              );
            })}
          </div>
          <div
            className="absolute -top-1 h-6 w-1.5 rounded bg-ivory shadow"
            style={{ left: `calc(${pos.equityPct}% - 3px)` }}
            aria-label={`current deployment ${pos.equityPct}%`}
          />
          <div className="mt-1 flex justify-between text-[10px] uppercase tracking-wider text-ivory/50">
            <span>0% · flat</span>
            <span>25%</span>
            <span>55%</span>
            <span>85%</span>
            <span>100% · fully invested</span>
          </div>
        </div>

        <p className="mt-4 border-t border-ivory/15 pt-3 text-sm text-ivory/85">
          <span className="font-semibold text-ivory">What changes this: </span>
          {whatChangesThis(s)}
        </p>
      </section>

      {/* Drivers */}
      <section className="mt-6">
        <h2 className="text-xl">Current drivers</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {pos.drivers.map((d) => (
            <span
              key={d.name}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                d.bearish
                  ? 'border-triggered/50 bg-triggered/10 text-triggered'
                  : 'border-quiet/40 bg-quiet/10 text-quiet'
              }`}
            >
              {d.name}: {d.value}
            </span>
          ))}
        </div>
        <p className="mt-2 text-xs text-navy/60">
          Red = currently pushing deployment down. Every driver is a frozen-threshold reading from
          the tripwire board — hover the same signals on the{' '}
          <Link href="/dashboard/correction" className="text-gold underline">
            Correction Dashboard
          </Link>{' '}
          for theory and precedent.
        </p>
      </section>

      {/* The full pre-committed ladder */}
      <section className="mt-8">
        <h2 className="text-xl">The deployment ladder (pre-committed)</h2>
        <p className="mt-1 text-sm text-navy/60">
          Every level is published in advance. The highlighted row is where the state machine puts
          us today; nothing else about the ladder moves.
        </p>
        <div className="mt-3 rounded-lg border border-navy/15 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-navy/5 text-left text-xs uppercase tracking-wide text-navy/60">
              <tr>
                <th className="p-2 whitespace-nowrap">Deployment</th>
                <th className="p-2">When (frozen rules)</th>
                <th className="p-2">Action</th>
              </tr>
            </thead>
            <tbody className="align-top">
              {POSITIONING_LADDER.map((r) => {
                const active = r.id === pos.row.id;
                return (
                  <tr
                    key={r.id}
                    className={`border-t border-navy/10 ${active ? 'border-l-4 border-l-gold bg-gold/10' : ''}`}
                  >
                    <td className="p-2 whitespace-nowrap font-heading text-lg">
                      {r.equityPct}%
                      {active && (
                        <span className="ml-2 align-middle rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold uppercase text-navy">
                          now
                        </span>
                      )}
                    </td>
                    <td className="p-2 text-navy/80">{r.condition}</td>
                    <td className="p-2">
                      <Hint text={r.rationale}>
                        <span className="underline decoration-navy/30 decoration-dotted underline-offset-4">
                          {r.action}
                        </span>
                      </Hint>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Expected-depth context per tier */}
      <section className="mt-8">
        <h2 className="text-xl">Correction type → expected depth</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {TIER_DOCS.filter((t) => t.tier > 0).map((t) => (
            <div
              key={t.tier}
              className={`rounded-lg border p-4 ${t.tier === s.tier ? 'border-gold bg-gold/10' : 'border-navy/15 bg-white'}`}
            >
              <div className="font-semibold">
                TIER {t.tier} — {t.label}
                {t.tier === s.tier && (
                  <span className="ml-2 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold uppercase text-navy">
                    current
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-navy/70">{t.meaning}</p>
              <p className="mt-2 text-xs text-navy/60">
                <span className="font-semibold">Precedent: </span>
                {t.precedent}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Method notes */}
      <section className="mt-8 space-y-2">
        {(
          [
            ['How the level is set (and why there is no score)', POSITIONING_NOTES.method],
            ['Re-entry — how deployment steps back up', POSITIONING_NOTES.reentry],
            ['What the percentages mean', POSITIONING_NOTES.sizing],
          ] as const
        ).map(([title, body]) => (
          <details key={title} className="rounded border border-navy/10 bg-navy/[0.02] px-3 py-2">
            <summary className="cursor-pointer select-none text-sm font-medium text-navy/80">{title}</summary>
            <p className="mt-2 max-w-4xl text-sm text-navy/70">{body}</p>
          </details>
        ))}
      </section>

      <footer className="mt-10 border-t border-navy/10 pt-4 text-xs text-navy/50">
        Pre-committed output per Dashboard Spec v1.0. General-circulation research — not
        personalized investment advice.
      </footer>
    </main>
  );
}
