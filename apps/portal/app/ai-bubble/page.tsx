import Link from 'next/link';
import { DashNav } from '@/components/DashNav';
import { StatusMark } from '@/components/aiBubble/StatusMark';
import {
  listRunDates,
  loadRun,
  loadThresholds,
  publicationBlockers,
  unreconciledThresholdCount,
} from '@/lib/aiBubble/load';
import { bandFor, stripInternal } from '@/lib/aiBubble/scoring';
import { AI_BUBBLE_DISCLOSURE, type RunFile, type ThresholdFile } from '@/lib/aiBubble/types';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'AI Bubble Trigger Index — Ekantik Research Portal' };

function Disclosure() {
  return (
    <p className="mt-8 rounded-lg border border-navy/15 bg-navy/[0.03] p-4 text-xs leading-relaxed text-navy/60">
      {AI_BUBBLE_DISCLOSURE}
    </p>
  );
}

/** §5.1.2 — four contiguous segments, current highlighted. Deliberately not a
 *  speedometer: no needle, because a needle implies momentum the Index does
 *  not claim. */
function BandGauge({ thresholds, band }: { thresholds: ThresholdFile; band: string }) {
  return (
    <div className="mt-3 flex overflow-hidden rounded-md border border-navy/15">
      {thresholds.bands.map((b) => {
        const active = b.key === band;
        return (
          <div
            key={b.key}
            className={`flex-1 px-3 py-2 text-center text-xs ${
              active ? 'bg-navy font-semibold text-ivory' : 'bg-white text-navy/50'
            }`}
          >
            {b.label}
            <div className={`text-[10px] ${active ? 'text-gold' : 'text-navy/35'}`}>
              {b.min.toFixed(2)}–{b.max.toFixed(2)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AiBubblePage() {
  const thresholds = loadThresholds();
  const run = loadRun();
  const blockers = publicationBlockers(thresholds);
  const runDates = listRunDates();
  const unreconciled = unreconciledThresholdCount(thresholds);

  return (
    <>
      <DashNav />
      <main className="mx-auto max-w-5xl p-6 md:p-10">
        <header className="mb-4 border-b border-navy/15 pb-4">
          <p className="text-xs uppercase tracking-widest text-navy/50">
            Ekantik Capital Advisors — Correction Intelligence Program
          </p>
          <h1 className="mt-1 text-3xl">AI Bubble Trigger Index</h1>
          <p className="text-sm text-navy/60">
            Twenty-eight pre-committed tripwires across five tiers, scored weekly against unchanged
            thresholds. Evidence feeding the correction model — not a second opinion beside it.
          </p>
        </header>

        {/* Publication gate — mirrors the validator (§7.4). */}
        {blockers.length > 0 && (
          <section className="rounded-lg border border-[#C8A951]/60 bg-gold/10 p-4">
            <h2 className="text-base font-semibold text-[#8a6d1f]">Not yet published</h2>
            <p className="mt-1 text-sm text-navy/75">
              The framework&rsquo;s pre-commitment claim requires every threshold to be transcribed
              from the framework document before any reading is shown. The validator blocks
              publication while:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-navy/70">
              {blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-navy/55">
              Thresholds are never inferred, estimated, or back-filled from readings — that would
              make the pre-commitment claim false. Supply the framework document to complete
              Phase&nbsp;1.
            </p>
          </section>
        )}

        {!run && (
          <section className="mt-4 rounded-lg border border-navy/15 bg-white p-5">
            <h2 className="text-lg">Awaiting the first weekly run</h2>
            <p className="mt-2 text-sm text-navy/70">
              The scoring engine, validation gate, and cascade feed are live and unit-tested against
              the framework&rsquo;s published worked example. No reading is displayed because no run
              file has been merged yet — and a score is never hand-entered.
            </p>
            <div className="mt-3 rounded-md border border-navy/10 bg-navy/[0.02] p-3 text-xs text-navy/60">
              <span className="font-semibold">Machinery in place:</span> §3.5 scoring (unscoreable
              stays in the denominator) · §4.3 cascade contribution · §7.4 validation gate including
              the threshold-drift check that fails the build on an unamended change · §5.2 status
              rendering · §6 briefing trigger.
            </div>
          </section>
        )}

        {run?.baseline_provenance?.type === 'reconstructed' && (
          <p className="mt-4 rounded-lg border border-navy/20 bg-navy/[0.03] p-3 text-xs leading-relaxed text-navy/65">
            <span className="font-semibold">Baseline provenance:</span>{' '}
            {run.baseline_provenance.note}
          </p>
        )}

        {unreconciled > 0 && (
          <p className="mt-3 rounded-lg border border-gold/50 bg-gold/10 p-3 text-xs leading-relaxed text-navy/70">
            <span className="font-semibold">Threshold text pending reconciliation.</span> The tier,
            seller class, and every score below are authoritative, and the Index reproduces exactly
            from the tripwire statuses. The wording of {unreconciled} threshold descriptions was
            transcribed from this run&rsquo;s own rationales rather than read from the framework
            document; any correction will be published as an amendment. Scoring never reads
            threshold wording, so the Index is unaffected.
          </p>
        )}

        {run && thresholds && <RunView run={run} thresholds={thresholds} />}

        {/* §5.1.13 Methodology */}
        <section className="mt-8 rounded-lg border border-navy/15 bg-white p-5">
          <h2 className="text-xl">Methodology</h2>
          <p className="mt-2 text-sm leading-relaxed text-navy/70">
            Each tripwire carries a threshold fixed in advance and a seller class naming which
            capital it would compel to sell. Tier load is the fired fraction of a tier; the Index is
            the weighted sum. A tripwire whose data cannot be obtained is marked{' '}
            <span className="font-medium">unscoreable</span> and still counts in the denominator —
            excluding it would make the Index rise merely because we stopped looking. Thresholds
            change only through a published amendment carrying written justification, a 48-hour
            cool-off, and a countersignature; an unamended edit fails the build.
          </p>
          <p className="mt-2 text-xs text-navy/55">
            Tiers and weights: ambient 0.15 · narrative 0.20 · financing 0.30 · demand 0.25 ·
            systemic 0.10.
            {runDates.length > 0 && ` Runs on file: ${runDates.join(', ')}.`}
          </p>
        </section>

        <Disclosure />
      </main>
    </>
  );
}

function RunView({ run, thresholds }: { run: RunFile; thresholds: ThresholdFile }) {
  const defs = new Map(thresholds.tripwires.map((t) => [t.id, t]));
  const band = bandFor(thresholds.bands, run.index.score_raw);
  const delta = run.index.delta ?? null;
  const tripwires = stripInternal(run.tripwires);
  const anyFired = tripwires.some((t) => t.status === 'FIRED');

  return (
    <>
      {/* 1 — Index header */}
      <section className="mt-4 rounded-lg border border-navy/15 bg-navy p-6 text-ivory">
        <div className="flex flex-wrap items-baseline gap-4">
          <span className="font-heading text-5xl">{run.index.score_display}</span>
          {delta !== null && (
            <span className="text-lg text-ivory/80">
              {delta > 0 ? '▲' : delta < 0 ? '▼' : '■'} {delta > 0 ? '+' : ''}
              {delta.toFixed(2)}
            </span>
          )}
          <span className="rounded-full border border-gold/60 bg-gold/15 px-3 py-1 text-sm font-semibold text-gold">
            {band?.label ?? run.index.band}
          </span>
          <span className="ml-auto text-xs text-ivory/60">as of {run.run_date}</span>
        </div>
        {anyFired && (
          <p className="mt-2 text-sm text-ivory/85">
            {tripwires.filter((t) => t.status === 'FIRED').length} tripwire(s) fired.
          </p>
        )}
      </section>

      {/* 2 — Band gauge */}
      <BandGauge thresholds={thresholds} band={run.index.band} />

      {/* 4 — Coverage strip (always rendered, even at full coverage) */}
      <p className="mt-3 rounded-md border border-navy/15 bg-white px-4 py-2 text-sm text-navy/70">
        <span className="font-semibold">
          {run.index.coverage.scored} of {run.index.coverage.total} scored
        </span>
        {run.index.coverage.unscoreable_ids.length > 0 && (
          <>
            {' '}
            — unscoreable:{' '}
            {run.index.coverage.unscoreable_ids.map((id, i) => (
              <span key={id}>
                {i > 0 && ', '}
                <a href={`#tw-${id.replace('.', '-')}`} className="text-gold underline">
                  {defs.get(id)?.public_name ?? id}
                </a>
              </span>
            ))}
          </>
        )}
      </p>

      {/* 5 — Tier breakdown */}
      <section className="mt-8">
        <h2 className="text-xl">Tier breakdown</h2>
        <div className="mt-3 space-y-2">
          {thresholds.tiers.map((tier) => {
            const rt = run.tiers.find((t) => t.id === tier.id);
            const load = rt?.load ?? 0;
            const priorLoad = rt?.prior_load;
            return (
              <div key={tier.id} className="rounded-lg border border-navy/15 bg-white p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-semibold">{tier.name}</span>
                  <span className="text-sm text-navy/60">
                    load {(load * 100).toFixed(1)}% · contribution {(rt?.contribution ?? 0).toFixed(4)}
                    {typeof priorLoad === 'number' && priorLoad !== load && (
                      <span className="ml-1 text-[#8a6d1f]">
                        ({load > priorLoad ? '▲' : '▼'} from {(priorLoad * 100).toFixed(1)}%)
                      </span>
                    )}
                  </span>
                </div>
                <p className="mt-0.5 text-xs italic text-navy/55">{tier.question}</p>
                <div className="mt-2 h-2 rounded-full bg-navy/10">
                  <div className="h-2 rounded-full bg-navy/60" style={{ width: `${load * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6 — This week's changes (quiet-week copy is mandatory, §5.4) */}
      <section className="mt-8">
        <h2 className="text-xl">This week&rsquo;s changes</h2>
        {run.narrative.quiet_week || run.status_changes.length === 0 ? (
          <p className="mt-2 rounded-lg border border-navy/15 bg-white p-4 text-sm leading-relaxed text-navy/75">
            <span className="font-semibold">No tripwires moved this week.</span> All{' '}
            {run.index.coverage.total} were checked against unchanged thresholds. The Index holds at{' '}
            {run.index.score_display}. A week with no movement is a reading, not a gap in coverage.
          </p>
        ) : (
          <div className="mt-2 space-y-2">
            {run.status_changes.map((c) => (
              <div key={c.id} className="rounded-lg border border-navy/15 bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{defs.get(c.id)?.public_name ?? c.id}</span>
                  <StatusMark status={c.from} />
                  <span className="text-navy/40">→</span>
                  <StatusMark status={c.to} />
                </div>
                {c.cascade_note && <p className="mt-1 text-sm text-navy/70">{c.cascade_note}</p>}
                {c.mechanism && (
                  <p className="mt-1 text-xs italic text-navy/55">Mechanism: {c.mechanism}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 7 — Held with contrary evidence (do not bury) */}
      {run.held_with_contrary_evidence.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl">Held despite contrary evidence</h2>
          <p className="mt-1 text-sm text-navy/60">
            Evidence that argued against a tripwire&rsquo;s status, recorded rather than discarded.
          </p>
          <div className="mt-2 space-y-2">
            {run.held_with_contrary_evidence.map((h) => (
              <div key={h.id} className="rounded-lg border border-navy/15 bg-white p-4 text-sm">
                <span className="font-semibold">{defs.get(h.id)?.public_name ?? h.id}</span>{' '}
                <StatusMark status={h.status} />
                <p className="mt-1 text-navy/75">{h.note}</p>
                <a href={h.source_url} className="text-xs text-gold underline" target="_blank" rel="noreferrer">
                  source · {h.source_date}
                </a>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 8 — Tripwire table */}
      <section className="mt-8">
        <h2 className="text-xl">All tripwires</h2>
        <div className="mt-3 space-y-2">
          {tripwires.map((t) => {
            const def = defs.get(t.id);
            return (
              <details
                key={t.id}
                id={`tw-${t.id.replace('.', '-')}`}
                className="rounded-lg border border-navy/15 bg-white p-3"
              >
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-medium">
                    <span className="mr-2 font-mono text-xs text-navy/40">{t.id}</span>
                    {def?.public_name ?? t.id}
                  </span>
                  <StatusMark status={t.status} />
                </summary>
                <div className="mt-2 border-t border-navy/10 pt-2 text-xs text-navy/70">
                  <p>
                    <span className="font-semibold">Threshold:</span> {def?.threshold_text}
                  </p>
                  {t.rationale && (
                    <p className="mt-1">
                      <span className="font-semibold">Rationale:</span> {t.rationale}
                    </p>
                  )}
                  {t.unscoreable_reason && (
                    <p className="mt-1">
                      <span className="font-semibold">Unscoreable:</span> {t.unscoreable_reason}
                      {t.data_request && <> — data request: {t.data_request}</>}
                    </p>
                  )}
                  {(t.evidence ?? []).map((e) => (
                    <p key={e.source_url} className="mt-1">
                      {e.statement}{' '}
                      <a href={e.source_url} className="text-gold underline" target="_blank" rel="noreferrer">
                        {e.source_name} · {e.source_date}
                      </a>
                    </p>
                  ))}
                  {(t.contrary_evidence ?? []).map((e) => (
                    <p key={e.source_url} className="mt-1 text-navy/60">
                      <span className="font-semibold">Contrary:</span> {e.statement}{' '}
                      <a href={e.source_url} className="text-gold underline" target="_blank" rel="noreferrer">
                        {e.source_name} · {e.source_date}
                      </a>
                    </p>
                  ))}
                  {(t.context ?? []).map((e) => (
                    <p key={e.source_url} className="mt-1 text-navy/50">
                      <span className="font-semibold">Excluded from the decision:</span>{' '}
                      {e.statement} {e.excluded_reason}{' '}
                      <a href={e.source_url} className="text-gold underline" target="_blank" rel="noreferrer">
                        {e.source_name} · {e.source_date}
                      </a>
                    </p>
                  ))}
                  {t.calibration_flag && (
                    <p className="mt-1 text-[#8a6d1f]">
                      <span className="font-semibold">Calibration flag:</span> {t.calibration_flag}
                    </p>
                  )}
                  {(t.discriminators_applied ?? []).length > 0 && (
                    <p className="mt-1 text-navy/50">
                      Discriminators applied: {(t.discriminators_applied ?? []).join(', ')}
                    </p>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      </section>

      {/* 9–11 — watch items, reconciliation flags, catalysts */}
      {run.watch_items.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl">Watch items</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-navy/75">
            {stripInternal(run.watch_items)
              .sort((a, b) => a.rank - b.rank)
              .map((w) => (
                <li key={w.tripwire_id}>{w.text}</li>
              ))}
          </ol>
        </section>
      )}
      {run.reconciliation_flags.filter((f) => f.status === 'open').length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl">Open reconciliation flags</h2>
          <div className="mt-2 space-y-2">
            {stripInternal(run.reconciliation_flags)
              .filter((f) => f.status === 'open')
              .map((f) => (
                <div key={f.tripwire_id} className="rounded-lg border border-navy/15 bg-white p-4 text-sm">
                  <span className="font-semibold">{defs.get(f.tripwire_id)?.public_name ?? f.tripwire_id}</span>
                  <p className="mt-1 text-navy/75">{f.text}</p>
                  {f.requires && <p className="mt-1 text-xs text-navy/55">Requires: {f.requires}</p>}
                  {f.provisional_ruling && (
                    <p className="mt-1 text-xs text-navy/70">
                      <span className="font-semibold">Ruling in force:</span> {f.provisional_ruling}
                    </p>
                  )}
                  {f.impact_if_overturned && (
                    <p className="mt-1 text-xs text-navy/55">
                      <span className="font-semibold">If overturned:</span> {f.impact_if_overturned}
                    </p>
                  )}
                  {f.blocking && (
                    <p className="mt-1 text-xs font-semibold text-[#8a6d1f]">{f.blocking}</p>
                  )}
                </div>
              ))}
          </div>
        </section>
      )}
      {run.catalysts.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl">Scheduled catalysts</h2>
          <ul className="mt-2 space-y-1 text-sm text-navy/75">
            {run.catalysts
              .filter((c) => c.date >= run.run_date)
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((c) => (
                <li key={`${c.date}-${c.event}`}>
                  <span className="font-medium">{c.date}</span> — {c.event}
                </li>
              ))}
          </ul>
        </section>
      )}

      {/* 12 — Bottom line */}
      <section className="mt-8 rounded-lg border-l-4 border-l-gold border-navy/15 bg-white p-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-navy/50">Bottom line</h2>
        <p className="mt-1 text-[15px] leading-relaxed text-navy/80">{run.narrative.bottom_line}</p>
      </section>
    </>
  );
}
