import Link from 'next/link';
import { METHODOLOGY, STATUS_LEGEND, TIER_DOCS } from '@/lib/methodology';
import { StatusChip } from './StatusChip';

/**
 * "How to read this dashboard" — tier legend and status legend, collapsed to
 * a single reference line so it never interrupts the banner → evidence flow.
 * Server-rendered, presentation only.
 */
export function Methodology() {
  return (
    <details className="mt-4 rounded-lg border border-navy/15 bg-white">
      <summary className="flex cursor-pointer select-none flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm font-medium text-navy/75 hover:bg-navy/[0.03]">
        <span>New to this page? How to read it — tier &amp; status legends</span>
        <span className="text-xs text-navy/40">click to expand</span>
      </summary>
      <div className="border-t border-navy/10 px-5 pb-5">
      <p className="mt-4 max-w-4xl text-sm text-navy/75">{METHODOLOGY.intro}</p>

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

      {/* Full detail lives on its own page — keep the daily view uncluttered */}
      <p className="mt-5 border-t border-navy/10 pt-3 text-sm text-navy/70">
        Want the deeper material — historical base rates, the failed-recovery router, the depth
        engine, global context, falsifiability, governance, and the frozen-threshold rulebook?{' '}
        <Link href="/dashboard/methodology" className="text-gold underline">
          Read the full methodology →
        </Link>
      </p>
      </div>
    </details>
  );
}
