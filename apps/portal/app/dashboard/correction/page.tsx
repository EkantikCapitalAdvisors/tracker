import Link from 'next/link';
import { loadDashboard, type DashboardData, type TripwireCard } from '@/lib/data';
import { Sparkline } from '@/components/Sparkline';
import { StatusChip } from '@/components/StatusChip';
import { AdminDrawer } from '@/components/AdminDrawer';
import { Methodology } from '@/components/Methodology';
import { Hint } from '@/components/Hint';
import { LAYER_THEORY, TIER_DOCS, TRIPWIRE_DOCS } from '@/lib/methodology';
import { computePositioning } from '@/lib/positioning';
import { loadPlainState, type PlainState } from '@/lib/plainState';
import { loadWorkbench, rankAnalogs, type Workbench } from '@/lib/workbench';

export const dynamic = 'force-dynamic';

const TIER_LABELS: Record<number, string> = Object.fromEntries(
  TIER_DOCS.map((t) => [t.tier, t.label]),
);

const LAYERS: { key: string; title: string; ids: string[] }[] = [
  { key: 'L0', title: 'Vulnerability — how flammable are conditions?', ids: ['CAPE_HIGH', 'POLICY_SWITCH', 'CURVE_INVERTED'] },
  { key: 'L1', title: 'Causal drivers — is a real seller being activated?', ids: ['CREDIT_IMPULSE', 'CREDIT_CRISIS', 'RATE_SHOCK', 'SAHM_GATE'] },
  { key: 'L2', title: 'Seller activation — who is actually selling?', ids: ['FAILED_RECOVERY', 'RV_ACCEL'] },
  { key: 'L3', title: 'Cascade confirmation — how severe is it?', ids: ['VIX_CONFIRM'] },
];

const ACTIVE = new Set(['ARMED', 'TRIGGERED', 'CONSTRAINED', 'FIRED', 'ESCALATE']);

/** One tripwire card — name (hover: summary), reading vs threshold, sparkline, theory. */
function TripwireCardView({ t }: { t: TripwireCard }) {
  const doc = TRIPWIRE_DOCS[t.id];
  return (
    <div id={`tw-${t.id}`} className="rounded-lg border border-navy/15 bg-white p-4">
      <div className="flex items-center justify-between">
        {doc ? (
          <Hint text={doc.summary}>
            <span className="font-semibold underline decoration-navy/30 decoration-dotted underline-offset-4">
              {t.id}
            </span>
          </Hint>
        ) : (
          <span className="font-semibold">{t.id}</span>
        )}
        <StatusChip status={t.status} />
      </div>
      <div className="mt-2 text-sm">
        {doc ? (
          <Hint text={doc.reading}>
            <span>
              {t.reading} <span className="text-navy/50">vs {t.threshold}</span>
            </span>
          </Hint>
        ) : (
          <>
            {t.reading} <span className="text-navy/50">vs {t.threshold}</span>
          </>
        )}
      </div>
      <div className="mt-1 text-xs text-navy/50">
        as of {t.asOfDate}
        {t.dataGap ? ' · DATA GAP' : ''}
      </div>
      {t.note && <div className="mt-1 text-xs italic text-navy/60">{t.note}</div>}
      <div className="mt-2">
        <Sparkline values={t.spark} />
      </div>
      {doc && (
        <details className="mt-2 border-t border-navy/10 pt-2 text-xs text-navy/70">
          <summary className="cursor-pointer select-none font-medium text-navy/60">
            Theory &amp; precedent
          </summary>
          <p className="mt-1.5">{doc.theory}</p>
          <p className="mt-1.5">
            <span className="font-semibold">Precedent:</span> {doc.precedent}
          </p>
          <p className="mt-1.5">
            <span className="font-semibold">How to read:</span> {doc.reading}
          </p>
        </details>
      )}
    </div>
  );
}

/** Small context pill (COT, IG/HY OAS, manual entries) — never a trigger. */
function ContextPill({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-navy/15 bg-navy/[0.04] px-3 py-1 text-xs text-navy/70">
      <Hint text={hint}>
        <span className="font-medium underline decoration-navy/30 decoration-dotted underline-offset-4">
          {label}
        </span>
      </Hint>
      <span>{value}</span>
    </span>
  );
}

export default async function CorrectionDashboard() {
  let data: DashboardData;
  try {
    data = await loadDashboard();
  } catch (err) {
    return (
      <main className="mx-auto max-w-5xl p-8">
        <h1 className="text-2xl">Correction Dashboard</h1>
        <p className="mt-4 rounded border border-triggered/40 bg-triggered/10 p-4 text-sm">
          Data layer unavailable: {(err as Error).message}. Run the Supabase migration and the first
          daily ingest.
        </p>
      </main>
    );
  }

  const s = data.state;
  const byId = new Map(data.tripwires.map((t) => [t.id, t]));
  const boardAsOf = data.tripwires[0]?.asOfDate ?? null;
  const statuses = new Map(data.tripwires.map((t) => [String(t.id), String(t.status)]));
  const pos = s ? computePositioning({ tier: s.tier, routerStatus: s.routerStatus, statuses }) : null;

  // M2 operator panels — fail-soft: the engine room renders without them.
  const [work, plain]: [Workbench | null, PlainState | null] = await Promise.all([
    loadWorkbench().catch(() => null),
    loadPlainState().catch(() => null),
  ]);
  const analogs = plain
    ? rankAnalogs({
        policyConstrained: statuses.get('POLICY_SWITCH') === 'CONSTRAINED',
        sahmActive: ['ARMED', 'FIRED'].includes(statuses.get('SAHM_GATE') ?? ''),
        creditDeltaBp: plain.raw.creditDelta3mBp,
        capeTop: plain.raw.capeTercile === 2,
      })
    : [];

  return (
    <main className="mx-auto max-w-6xl p-6 md:p-10">
      <header className="mb-6 border-b border-navy/15 pb-4">
        <p className="text-xs text-navy/50">
          <Link href="/health" className="text-gold underline">Plain View</Link>
          <span className="mx-1.5">/</span>
          <Link href="/dashboard/positioning" className="text-gold underline">Positioning</Link>
          <span className="mx-1.5">/</span>
          Engine room
        </p>
        <p className="mt-2 text-xs uppercase tracking-widest text-navy/50">
          Ekantik Capital Advisors — Correction Intelligence Program · internal instrument
        </p>
        <h1 className="mt-1 text-3xl">Correction Dashboard</h1>
        <p className="text-sm text-navy/60">
          The evidence behind the positioning: measure the seller, not the headline. Thresholds
          frozen by the 50-year backtest; changes only via governance protocol.
        </p>
      </header>

      {/* 0 — Hand-off from Positioning (the what) */}
      {pos && (
        <Link
          href="/dashboard/positioning"
          className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gold/50 bg-gold/10 px-4 py-2.5 text-sm transition-colors hover:bg-gold/20"
        >
          <span className="text-navy/80">
            This evidence currently sets the policy at{' '}
            <span className="font-semibold text-navy">
              {pos.equityPct}% invested · {pos.cashPct}% cash ({pos.zone})
            </span>
          </span>
          <span className="font-semibold text-[#8a6d1f]">← Back to Positioning (the what)</span>
        </Link>
      )}

      {/* 0b — Divergence strip: what the client Plain View is "rounding" right now */}
      {plain &&
        (plain.divergences.length > 0 ? (
          <div className="mb-4 rounded-lg border border-[#c2622a]/40 bg-[#c2622a]/10 px-4 py-2 text-sm text-navy/80">
            <span className="font-semibold">Client-view check:</span> the Plain View is currently
            ahead of the raw engine on{' '}
            {plain.divergences.map((d) => `${d.gauge} (${d.color} — ${d.reason})`).join('; ')}.
            Presentation bands only, never state inputs.
          </div>
        ) : (
          <p className="mb-4 px-1 text-xs text-navy/50">
            Client-view check: the Plain View currently shows exactly what the machine shows — no
            presentation rounding in effect.
          </p>
        ))}

      {/* 1 — State banner: the verdict */}
      <section id="state" className="rounded-lg border border-navy/15 bg-navy p-6 text-ivory">
        {s ? (
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <div className="text-xs uppercase tracking-widest text-ivory/60">Current state</div>
              <div className="font-heading text-3xl">
                <Hint text={`${TIER_DOCS[s.tier]!.meaning} Entry rule: ${TIER_DOCS[s.tier]!.entry}`}>
                  <span className="underline decoration-ivory/40 decoration-dotted underline-offset-8">
                    TIER {s.tier} <span className="text-lg">— {TIER_LABELS[s.tier]}</span>
                  </span>
                </Hint>
              </div>
              <div className="text-sm text-ivory/70">{s.daysInState} days in state (since {s.enteredAt})</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-ivory/60">
                <Hint text="Close-basis decline from the rolling 6-month closing high (anchored at Tier-1 entry as the regain reference). Every tier entry threshold is defined on this number: −5% Tier 1, −10% Tier 2, −20% Tier 3.">
                  <span className="underline decoration-ivory/40 decoration-dotted underline-offset-4">
                    Drawdown vs cycle high
                  </span>
                </Hint>
              </div>
              <div className="font-heading text-3xl">{s.drawdownPct !== null ? `${s.drawdownPct.toFixed(1)}%` : '—'}</div>
              <div className="text-sm text-ivory/70">
                S&P {s.spClose?.toFixed(2) ?? '—'} ({s.spDate ?? '—'}) · high {s.cycleHigh?.toFixed(2) ?? '—'} ({s.cycleHighDate ?? '—'})
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-ivory/60">
                <Hint text="Failed-recovery router: after the first −5% close it opens two windows — 30 trading days to regain the peak, 60 to avoid a lower low. A failed bounce (ESCALATE) historically extended to ≥10% losses 58% of the time vs 7% for clean recoveries.">
                  <span className="underline decoration-ivory/40 decoration-dotted underline-offset-4">
                    Router windows
                  </span>
                </Hint>
              </div>
              <div className="font-heading text-2xl">{s.routerStatus ?? 'INACTIVE'}</div>
              <div className="text-sm text-ivory/70">
                {s.crossDate ? `cross ${s.crossDate} · 30td ≈ ${s.routerDeadline30} · 60td ≈ ${s.routerDeadline60}` : 'no −5% cross'}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-ivory/60">
                <Hint text="The nearest frozen rule boundary from the current state — the specific close that would change the tier next, so a reviewer always knows what number matters tomorrow.">
                  <span className="underline decoration-ivory/40 decoration-dotted underline-offset-4">
                    Next checkpoint
                  </span>
                </Hint>
              </div>
              <div className="text-sm text-ivory/85">
                {s.tier === 0
                  ? `Close ≤ ${(s.cycleHigh! * 0.95).toFixed(0)} (−5.0%) enters Tier 1 and opens the 30/60-td router windows.`
                  : s.tier === 1
                    ? `Close ≤ ${(s.cycleHigh! * 0.9).toFixed(0)} enters Tier 2; regain of ${s.cycleHigh!.toFixed(0)} exits.`
                    : s.tier === 2
                      ? `Close ≤ ${(s.cycleHigh! * 0.8).toFixed(0)} enters Tier 3; 50% retrace with credit Δ3m ≤ 0 exits.`
                      : 'Exit requires confirmed higher low + Baa−10y narrowing 4 consecutive weeks.'}
              </div>
            </div>
          </div>
        ) : (
          <p>No state recorded yet — run the first daily ingest.</p>
        )}
      </section>

      {/* 1b — Collapsed reference: tier & status legends */}
      <Methodology />

      {/* 2 — The signal board, grouped by the causal chain */}
      <section className="mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl">The signal board</h2>
          {boardAsOf && <span className="text-xs text-navy/50">evaluated on closing data · {boardAsOf}</span>}
        </div>
        <p className="mt-1 max-w-3xl text-sm text-navy/60">
          Read top to bottom — the causal chain of a correction: how flammable conditions are, what
          could ignite them, who is actually selling, and how severe the cascade is. Only the
          driver and activation layers can move the tier.
        </p>

        {data.tripwires.length === 0 && (
          <p className="mt-3 text-sm text-navy/60">No evaluations logged yet.</p>
        )}

        {LAYERS.map((layer) => {
          const cards = layer.ids
            .map((id) => byId.get(id))
            .filter((t): t is TripwireCard => t !== undefined);
          const active = cards.filter((t) => ACTIVE.has(String(t.status)));
          return (
            <div key={layer.key} className="mt-6">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-navy/15 pb-2">
                <div>
                  <h3 className="text-base font-semibold">
                    <span className="mr-2 rounded bg-navy px-1.5 py-0.5 font-mono text-xs text-ivory">
                      {layer.key}
                    </span>
                    {layer.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-navy/55">{LAYER_THEORY[layer.key]}</p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {active.length === 0 ? (
                    <span className="rounded-full border border-quiet/40 bg-quiet/10 px-2.5 py-0.5 text-xs font-semibold text-quiet">
                      ALL QUIET
                    </span>
                  ) : (
                    active.map((t) => (
                      <a
                        key={t.id}
                        href={`#tw-${t.id}`}
                        className="rounded-full border border-gold/60 bg-gold/15 px-2.5 py-0.5 text-xs font-semibold text-[#8a6d1f]"
                      >
                        {t.id} {t.status}
                      </a>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {cards.map((t) => (
                  <TripwireCardView key={t.id} t={t} />
                ))}
              </div>

              {/* Context readings that live alongside this layer — never triggers */}
              {layer.key === 'L1' && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs uppercase tracking-wide text-navy/45">Context · no trigger status</span>
                  <ContextPill
                    label="IG / HY OAS"
                    value={`${data.contextSeries.igOas?.toFixed(2) ?? 'N/A'} / ${data.contextSeries.hyOas?.toFixed(2) ?? 'N/A'}`}
                    hint="Investment-grade and high-yield option-adjusted spreads — the market-price complement to the Baa−10y series. Context only until the Jan-2027 calibration adds them to the backtest; no trigger status before then, enforced in code."
                  />
                </div>
              )}
              {layer.key === 'L2' && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs uppercase tracking-wide text-navy/45">Context · no trigger status</span>
                  <ContextPill
                    label="COT ES net specs (z)"
                    value={data.contextSeries.cotZ?.toFixed(2) ?? 'N/A — weekly'}
                    hint="CFTC Commitments of Traders: E-mini S&P net speculative positioning, expressed as a z-score vs its own 3-year history. Crowded longs = fuel for mechanical selling. Probation series — context only."
                  />
                  {data.manualEntries.length === 0 ? (
                    <ContextPill
                      label="Alight 401(k) / dealer gamma"
                      value="N/A — manual pending"
                      hint="Human-entered seller-activation context: Alight 401(k) trading index (retail panic flows) and dealer gamma positioning (whether market makers amplify or dampen moves). Entered via the admin drawer; renders N/A when stale > 14 days."
                    />
                  ) : (
                    data.manualEntries.map((m) => (
                      <ContextPill
                        key={m.field}
                        label={m.field}
                        value={m.stale ? 'N/A — stale' : `${m.valueNum ?? String(m.valueBool)} (${m.asOfDate})`}
                        hint="Human-entered via the admin drawer; renders N/A when stale > 14 days."
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* 2b — Operator: depth workbench (Tier-agnostic; official only at Tier ≥ 2) */}
      {work && (
        <section id="workbench" className="mt-10">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl">Depth workbench</h2>
            <span className="text-xs uppercase tracking-wide text-navy/45">operator instrument</span>
          </div>
          <p className="mt-1 max-w-3xl text-sm text-navy/60">
            The engine&rsquo;s own depth function run on today&rsquo;s data — watch the estimate
            form before it goes official.
            {work.preActivation &&
              ' Currently a pre-activation estimate: the range publishes only at Tier ≥ 2.'}
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {/* Range */}
            <div className={`rounded-lg border bg-white p-4 ${work.preActivation ? 'border-dashed border-navy/30' : 'border-navy/15'}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-navy/60">
                  {work.preActivation ? 'Pre-activation estimate' : 'Published depth range'}
                </span>
                {work.range && (
                  <span className="rounded-full border border-navy/20 bg-navy/5 px-2 py-0.5 text-[10px] font-semibold text-navy/70">
                    {work.range.baseBand}
                  </span>
                )}
              </div>
              {work.range ? (
                <>
                  <div className="mt-2 font-heading text-3xl">
                    −{work.range.rangeLowPct.toFixed(1)}% … −{work.range.rangeHighPct.toFixed(1)}%
                  </div>
                  <p className="mt-1 text-xs text-navy/60">
                    further decline from the cycle high · invalidation close{' '}
                    <span className="font-semibold">{work.range.invalidationClose.toFixed(0)}</span>
                  </p>
                  {work.preActivation && (
                    <p className="mt-2 text-xs font-medium text-[#8a6d1f]">
                      Hypothetical — publishes only at Tier ≥ 2.
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-2 text-sm text-navy/60">{work.rangeError ?? 'unavailable'}</p>
              )}
            </div>
            {/* Cascade */}
            <div className="rounded-lg border border-navy/15 bg-white p-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-navy/60">
                Cascade scoring{work.range ? ` · net ${work.range.cascadeScore >= 0 ? '+' : ''}${work.range.cascadeScore}` : ''}
              </span>
              {work.range && (
                <div className="mt-2 space-y-1 text-xs">
                  {work.range.redFlags.map((f) => (
                    <div key={f} className="text-triggered">▲ {f}</div>
                  ))}
                  {work.range.greenFlags.map((f) => (
                    <div key={f} className="text-quiet">▼ {f}</div>
                  ))}
                  {work.range.redFlags.length === 0 && work.range.greenFlags.length === 0 && (
                    <div className="text-navy/50">no flags</div>
                  )}
                </div>
              )}
            </div>
            {/* Inputs & overlays */}
            <div className="rounded-lg border border-navy/15 bg-white p-4 text-xs">
              <span className="text-xs font-semibold uppercase tracking-wide text-navy/60">
                Inputs &amp; overlays
              </span>
              <div className="mt-2 space-y-1.5 text-navy/70">
                <div>
                  Catalyst tag:{' '}
                  <span className="font-semibold">
                    {work.catalystTag ?? 'register empty — FUNDAMENTAL assumed'}
                  </span>
                </div>
                <div>
                  Valuation scaling:{' '}
                  <span className="font-semibold">
                    {work.range?.valuationScale !== null && work.range?.valuationScale !== undefined
                      ? `×${work.range.valuationScale.toFixed(2)}`
                      : 'skipped — P/E inputs DATA GAP'}
                  </span>
                </div>
                <div>
                  Policy overlay:{' '}
                  <span className="font-semibold">
                    {work.range?.policyOverlayApplied ? 'CONSTRAINED — upper half forced' : 'not applied (policy FREE)'}
                  </span>
                </div>
              </div>
              {work.range && work.range.notes.length > 0 && (
                <ul className="mt-2 list-disc space-y-0.5 pl-4 text-[11px] text-navy/50">
                  {work.range.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 2c — Operator: nearest historical analogs */}
      {analogs.length > 0 && (
        <section className="mt-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl">Nearest historical analogs</h2>
            <span className="text-xs uppercase tracking-wide text-navy/45">
              ranked on policy state · recession signal · credit widening
            </span>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {analogs.map((a) => (
              <div key={a.name} className="rounded-lg border border-navy/15 bg-white p-4">
                <div className="font-semibold">{a.name}</div>
                <div className="mt-1 flex items-baseline gap-3">
                  <span className="font-heading text-2xl text-triggered">−{a.depthPct.toFixed(1)}%</span>
                  <span className="text-xs text-navy/60">peak → trough {a.durationDays} days</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-navy/10">
                  <div
                    className="h-2 rounded-full bg-triggered/70"
                    style={{ width: `${Math.min(100, (a.depthPct / 60) * 100)}%` }}
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {a.matchedOn.map((m) => (
                    <span key={m} className="rounded-full border border-quiet/40 bg-quiet/10 px-2 py-0.5 text-[10px] font-medium text-quiet">
                      {m}
                    </span>
                  ))}
                  {a.matchedOn.length === 0 && (
                    <span className="text-[10px] text-navy/50">weak match — shown for depth context</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-navy/50">
            Catalog stores event endpoints (peak, trough, depth), not daily paths — bars compare
            depth, not trajectory. Source: the 54-event replay catalog.
          </p>
        </section>
      )}

      {/* 3 — Global context: is the selling worldwide or local? */}
      <section className="mt-10">
        <h2 className="text-xl">
          <Hint text="Correlated selling across regions distinguishes global repricing from a local shakeout. Context only — like VIX, this panel can never move the tier. See the methodology page for the theory and precedents.">
            <span className="underline decoration-navy/30 decoration-dotted underline-offset-4">
              Global context — is the selling worldwide?
            </span>
          </Hint>
        </h2>
        <p className="mt-1 text-sm text-navy/60">
          Sorted by trailing 60-session correlation with the S&P — the markets where US selling is
          most synchronized. Drawdowns are vs each index&rsquo;s own 6-month closing high. Context
          only — no trigger status.
        </p>
        {/* no overflow-x-auto: a scroll container would clip the hover tooltips */}
        <div className="mt-3 rounded-lg border border-navy/15 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-navy/5 text-left text-xs uppercase tracking-wide text-navy/60">
              <tr>
                <th className="p-2">Index</th>
                <th className="p-2">Close</th>
                <th className="p-2">
                  <Hint text="Percent below the index's own trailing 6-month closing high — the same convention as the S&P drawdown in the state banner. Synchronized drawdowns ≤ −5% across regions = global confirmation of a US event.">
                    <span className="underline decoration-navy/30 decoration-dotted underline-offset-4">
                      Drawdown vs 6-mo high
                    </span>
                  </Hint>
                </th>
                <th className="p-2">
                  <Hint text="Pearson correlation of daily log returns vs the S&P over the last 60 aligned sessions. Note: Asian and European sessions close before New York, so same-date correlation understates their lead — and correlations surge toward 1 inside every cascade (partly a symptom).">
                    <span className="underline decoration-navy/30 decoration-dotted underline-offset-4">
                      60-day corr vs S&P
                    </span>
                  </Hint>
                </th>
                <th className="p-2">90 sessions</th>
              </tr>
            </thead>
            <tbody>
              {data.intlIndices.map((ix) => (
                <tr key={ix.id} className="border-t border-navy/10">
                  <td className="p-2 font-medium">
                    <Hint text={ix.hint}>
                      <span className="underline decoration-navy/30 decoration-dotted underline-offset-4">
                        {ix.name}
                      </span>
                    </Hint>
                  </td>
                  <td className="p-2 whitespace-nowrap">
                    {ix.close !== null ? ix.close.toLocaleString('en-US', { maximumFractionDigits: 1 }) : 'N/A'}
                    {ix.asOfDate ? <span className="text-xs text-navy/50"> ({ix.asOfDate})</span> : null}
                  </td>
                  <td className={`p-2 font-medium ${ix.drawdownPct !== null && ix.drawdownPct <= -5 ? 'text-triggered' : 'text-quiet'}`}>
                    {ix.drawdownPct !== null ? `${ix.drawdownPct.toFixed(1)}%` : 'N/A'}
                  </td>
                  <td className="p-2">{ix.corr60 !== null ? ix.corr60.toFixed(2) : 'N/A'}</td>
                  <td className="p-2">
                    <Sparkline values={ix.spark} />
                  </td>
                </tr>
              ))}
              {data.intlIndices.every((ix) => ix.close === null) && (
                <tr>
                  <td className="p-3 text-navy/60" colSpan={5}>
                    No international readings yet — they arrive with the next daily ingest.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4 — The record: append-only history & falsifiability */}
      <section className="mt-10">
        <h2 className="text-xl">The record — append-only</h2>
        <p className="mt-1 max-w-3xl text-sm text-navy/60">
          Every transition and every triggered signal is logged permanently (database-enforced).
          Triggered readings open a 9-month outcome window — did a ≥10% event follow? — feeding the
          pre-committed retirement criteria.
        </p>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-navy/60">Tier history</h3>
            <div className="mt-2 overflow-x-auto rounded-lg border border-navy/15 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-navy/5 text-left text-xs uppercase tracking-wide text-navy/60">
                  <tr>
                    <th className="p-2">Entered</th>
                    <th className="p-2">Tier</th>
                    <th className="p-2">Entry reason</th>
                    <th className="p-2">Drawdown</th>
                  </tr>
                </thead>
                <tbody>
                  {data.tierHistory.map((h, i) => (
                    <tr key={i} className="border-t border-navy/10">
                      <td className="p-2 whitespace-nowrap">{h.enteredAt}</td>
                      <td className="p-2 font-semibold">TIER {h.tier}</td>
                      <td className="p-2">{h.reason}</td>
                      <td className="p-2">{h.drawdownPct !== null ? `${h.drawdownPct.toFixed(1)}%` : '—'}</td>
                    </tr>
                  ))}
                  {data.tierHistory.length === 0 && (
                    <tr>
                      <td className="p-3 text-navy/60" colSpan={4}>
                        No transitions yet — the live record starts with the first Tier-1 entry.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-navy/60">
              False-positive ledger
            </h3>
            <div className="mt-2 overflow-x-auto rounded-lg border border-navy/15 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-navy/5 text-left text-xs uppercase tracking-wide text-navy/60">
                  <tr>
                    <th className="p-2">Tripwire</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Triggered</th>
                    <th className="p-2">Window ends</th>
                    <th className="p-2">Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {data.fpLedger.map((f, i) => (
                    <tr key={i} className="border-t border-navy/10">
                      <td className="p-2 font-medium">{f.tripwire}</td>
                      <td className="p-2">
                        <StatusChip status={f.status} />
                      </td>
                      <td className="p-2 whitespace-nowrap">{f.triggeredOn}</td>
                      <td className="p-2 whitespace-nowrap">{f.windowEnds}</td>
                      <td className="p-2">
                        {f.outcome}
                        {f.note ? <span className="text-navy/50"> — {f.note}</span> : null}
                      </td>
                    </tr>
                  ))}
                  {data.fpLedger.length === 0 && (
                    <tr>
                      <td className="p-3 text-navy/60" colSpan={5}>
                        No live triggers yet — every future TRIGGERED / FIRED / ESCALATE lands here
                        with its outcome.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* 5 — Rulebook pointer */}
      <section className="mt-10 rounded-lg border border-navy/15 bg-navy/[0.03] p-4 text-sm text-navy/70">
        Every reading above is compared against one of 16 numeric thresholds fixed by the 50-year
        backtest <em>before</em> the first live reading — frozen at the database level, changeable
        only by written justification, a 48-hour cool-off, and a second person&rsquo;s
        countersignature.{' '}
        <Link href="/dashboard/methodology" className="text-gold underline">
          Read the full methodology and the frozen-threshold rulebook →
        </Link>
      </section>

      {/* 6 — Admin drawer */}
      <AdminDrawer pendingChanges={data.pendingChanges} />

      <footer className="mt-10 border-t border-navy/10 pt-4 text-xs text-navy/50">
        Pre-committed output per Dashboard Spec v1.0. Internal research instrument — not investment
        advice.
      </footer>
    </main>
  );
}
