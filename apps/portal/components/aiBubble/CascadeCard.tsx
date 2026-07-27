import Link from 'next/link';
import { loadRun, loadThresholds, publicationBlockers } from '@/lib/aiBubble/load';
import { FACTOR_LABELS } from '@/lib/aiBubble/scoring';
import { AI_BUBBLE_DISCLOSURE } from '@/lib/aiBubble/types';

/**
 * §4.5 — the cascade feed on the correction dashboard. This is the component
 * that makes the module evidence feeding the seller-cascade model rather than
 * a second opinion beside it: it shows the factor scores the Index proposes,
 * and any analyst override renders here WITH its justification (§4.4).
 */
export function CascadeCard() {
  const thresholds = loadThresholds();
  const run = loadRun();
  const blockers = publicationBlockers(thresholds);

  if (blockers.length > 0 || !run) {
    return (
      <section className="mt-10 rounded-lg border border-navy/15 bg-white p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl">AI Bubble Trigger Index</h2>
          <Link href="/ai-bubble" className="text-sm text-gold underline">
            View detail →
          </Link>
        </div>
        <p className="mt-1 text-sm text-navy/60">
          Not yet feeding the cascade —{' '}
          {blockers.length > 0 ? blockers.join('; ') : 'no run merged yet'}. Thresholds are never
          inferred to fill the gap.
        </p>
      </section>
    );
  }

  const cc = run.cascade_contribution;
  const factors = [
    ...Object.entries(cc.spec_to_fundamental ?? {}),
    ...Object.entries(cc.fundamental_to_buy_and_hold ?? {}),
  ];
  const changed = run.status_changes.length;

  return (
    <section className="mt-10 rounded-lg border border-navy/15 bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl">AI Bubble Trigger Index</h2>
        <span className="text-xs text-navy/50">as of {run.run_date}</span>
      </div>
      <div className="mt-1 flex flex-wrap items-baseline gap-3">
        <span className="font-heading text-3xl">{run.index.score_display}</span>
        {typeof run.index.delta === 'number' && run.index.delta !== 0 && (
          <span className="text-sm text-navy/70">
            {run.index.delta > 0 ? '▲ +' : '▼ '}
            {run.index.delta.toFixed(2)}
          </span>
        )}
        <span className="text-sm font-medium text-[#8a6d1f]">
          {thresholds?.bands.find((b) => b.key === run.index.band)?.label ?? run.index.band}
        </span>
      </div>

      <p className="mt-3 border-t border-navy/10 pt-2 text-xs font-semibold uppercase tracking-wide text-navy/50">
        Feeding this week&rsquo;s cascade scoring
      </p>
      <table className="mt-1 w-full text-sm">
        <tbody>
          {factors.map(([key, f]) => {
            const overridden = cc.override?.factor === key;
            return (
              <tr key={key} className="border-t border-navy/10">
                <td className="py-1.5 pr-2">{FACTOR_LABELS[key] ?? key}</td>
                <td className="py-1.5 text-right font-medium">
                  {overridden ? (
                    <>
                      <span className="text-navy/40 line-through">{f.proposed}</span>{' '}
                      <span className="text-[#8a6d1f]">{cc.override!.applied} / 5</span>
                    </>
                  ) : (
                    <>{f.proposed} / 5</>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {cc.override && (
        <p className="mt-2 rounded-md border border-gold/50 bg-gold/10 p-2 text-xs text-navy/75">
          <span className="font-semibold">Analyst override — {FACTOR_LABELS[cc.override.factor] ?? cc.override.factor}:</span>{' '}
          {cc.override.justification}{' '}
          <span className="text-navy/50">
            ({cc.override.author}, {cc.override.timestamp.slice(0, 10)})
          </span>
        </p>
      )}

      <p className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-navy/10 pt-2 text-xs text-navy/55">
        <span>
          {changed === 0 ? 'No tripwires moved' : `${changed} tripwire${changed === 1 ? '' : 's'} moved`} ·{' '}
          {run.index.coverage.scored} of {run.index.coverage.total} scored
        </span>
        <Link href="/ai-bubble" className="text-gold underline">
          View detail →
        </Link>
      </p>
      <p className="mt-2 text-[10px] leading-relaxed text-navy/45">{AI_BUBBLE_DISCLOSURE}</p>
    </section>
  );
}
