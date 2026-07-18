import { METHODOLOGY, STATUS_LEGEND, TIER_DOCS } from '@/lib/methodology';
import { StatusChip } from './StatusChip';

/**
 * "How to read this dashboard" — tier legend, status legend, and the
 * methodology commentary. Server-rendered, presentation only.
 */
export function Methodology() {
  return (
    <section className="mt-8 rounded-lg border border-navy/15 bg-white p-5">
      <h2 className="text-xl">How to read this dashboard</h2>
      <p className="mt-2 max-w-4xl text-sm text-navy/75">{METHODOLOGY.intro}</p>

      {/* Tier legend */}
      <h3 className="mt-5 text-base">Tier legend</h3>
      <div className="mt-2 overflow-x-auto rounded-lg border border-navy/15">
        <table className="w-full text-sm">
          <thead className="bg-navy/5 text-left text-xs uppercase tracking-wide text-navy/60">
            <tr>
              <th className="p-2 whitespace-nowrap">Tier</th>
              <th className="p-2">Entry (frozen)</th>
              <th className="p-2">Exit (frozen)</th>
              <th className="p-2">What it means</th>
              <th className="p-2">Historical precedent (54-event catalog)</th>
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
                <td className="p-2 text-navy/70">{t.meaning}</td>
                <td className="p-2 text-navy/70">{t.precedent}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Status legend */}
      <h3 className="mt-5 text-base">Status legend</h3>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {STATUS_LEGEND.map((s) => (
          <div key={s.status} className="flex items-start gap-2 text-sm">
            <span className="mt-0.5 shrink-0">
              <StatusChip status={s.status} />
            </span>
            <span className="text-navy/70">{s.meaning}</span>
          </div>
        ))}
      </div>

      {/* Deep-dive commentary */}
      <div className="mt-5 space-y-2">
        {(
          [
            ['Historical base rates — 54 events, 1974–2026', METHODOLOGY.baseRates],
            ['The failed-recovery router — why 30/60 trading days', METHODOLOGY.router],
            ['Depth engine — why a range and never a point', METHODOLOGY.depthEngine],
            ['Global context — correlated international markets', METHODOLOGY.global],
            ['Falsifiability — FP ledger and retirement criteria', METHODOLOGY.falsifiability],
            ['Governance — why the thresholds cannot drift', METHODOLOGY.governance],
          ] as const
        ).map(([title, body]) => (
          <details key={title} className="rounded border border-navy/10 bg-navy/[0.02] px-3 py-2">
            <summary className="cursor-pointer select-none text-sm font-medium text-navy/80">
              {title}
            </summary>
            <p className="mt-2 max-w-4xl text-sm text-navy/70">{body}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
