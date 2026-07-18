import { loadDashboard, type DashboardData, type TripwireCard } from '@/lib/data';
import { Sparkline } from '@/components/Sparkline';
import { StatusChip } from '@/components/StatusChip';
import { AdminDrawer } from '@/components/AdminDrawer';
import { Methodology } from '@/components/Methodology';
import { LAYER_THEORY, TIER_DOCS, TRIPWIRE_DOCS } from '@/lib/methodology';

export const dynamic = 'force-dynamic';

const TIER_LABELS: Record<number, string> = Object.fromEntries(
  TIER_DOCS.map((t) => [t.tier, t.label]),
);

const LAYERS: { key: string; title: string; ids: string[] }[] = [
  { key: 'L0', title: 'L0 — Vulnerability (context multipliers; never triggers)', ids: ['CAPE_HIGH', 'POLICY_SWITCH', 'CURVE_INVERTED'] },
  { key: 'L1', title: 'L1 — Causal drivers (may set state)', ids: ['CREDIT_IMPULSE', 'CREDIT_CRISIS', 'RATE_SHOCK', 'SAHM_GATE'] },
  { key: 'L2', title: 'L2 — Seller activation (may escalate state)', ids: ['FAILED_RECOVERY', 'RV_ACCEL'] },
  { key: 'L3', title: 'L3 — Cascade confirmation (grade only; never trigger)', ids: ['VIX_CONFIRM'] },
];

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

  return (
    <main className="mx-auto max-w-6xl p-6 md:p-10">
      <header className="mb-6 border-b border-navy/15 pb-4">
        <p className="text-xs uppercase tracking-widest text-navy/50">
          Ekantik Capital Advisors — Correction Intelligence Program · internal instrument
        </p>
        <h1 className="mt-1 text-3xl">Correction Dashboard</h1>
        <p className="text-sm text-navy/60">
          Measure the seller, not the headline. Thresholds frozen by the 50-year backtest; changes
          only via governance protocol.
        </p>
      </header>

      {/* 1 — State banner */}
      <section className="rounded-lg border border-navy/15 bg-navy p-6 text-ivory">
        {s ? (
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <div className="text-xs uppercase tracking-widest text-ivory/60">Current state</div>
              <div className="font-heading text-3xl">
                TIER {s.tier} <span className="text-lg">— {TIER_LABELS[s.tier]}</span>
              </div>
              <div className="text-sm text-ivory/70">{s.daysInState} days in state (since {s.enteredAt})</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-ivory/60">Drawdown vs cycle high</div>
              <div className="font-heading text-3xl">{s.drawdownPct !== null ? `${s.drawdownPct.toFixed(1)}%` : '—'}</div>
              <div className="text-sm text-ivory/70">
                S&P {s.spClose?.toFixed(2) ?? '—'} ({s.spDate ?? '—'}) · high {s.cycleHigh?.toFixed(2) ?? '—'} ({s.cycleHighDate ?? '—'})
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-ivory/60">Router windows</div>
              <div className="font-heading text-2xl">{s.routerStatus ?? 'INACTIVE'}</div>
              <div className="text-sm text-ivory/70">
                {s.crossDate ? `cross ${s.crossDate} · 30td ≈ ${s.routerDeadline30} · 60td ≈ ${s.routerDeadline60}` : 'no −5% cross'}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-ivory/60">Next checkpoint</div>
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

      {/* 1b — Legend + methodology */}
      <Methodology />

      {/* 2 — Tripwire board */}
      <section className="mt-8">
        <h2 className="text-xl">Tripwire board</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.tripwires.map((t: TripwireCard) => (
            <div key={t.id} className="rounded-lg border border-navy/15 bg-white p-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{t.id}</span>
                <StatusChip status={t.status} />
              </div>
              <div className="mt-2 text-sm">
                {t.reading} <span className="text-navy/50">vs {t.threshold}</span>
              </div>
              <div className="mt-1 text-xs text-navy/50">
                as of {t.asOfDate}
                {t.dataGap ? ' · DATA GAP' : ''}
              </div>
              {t.note && <div className="mt-1 text-xs italic text-navy/60">{t.note}</div>}
              <div className="mt-2">
                <Sparkline values={t.spark} />
              </div>
              {TRIPWIRE_DOCS[t.id] && (
                <details className="mt-2 border-t border-navy/10 pt-2 text-xs text-navy/70">
                  <summary className="cursor-pointer select-none font-medium text-navy/60">
                    Theory &amp; precedent
                  </summary>
                  <p className="mt-1.5">{TRIPWIRE_DOCS[t.id]!.theory}</p>
                  <p className="mt-1.5">
                    <span className="font-semibold">Precedent:</span> {TRIPWIRE_DOCS[t.id]!.precedent}
                  </p>
                  <p className="mt-1.5">
                    <span className="font-semibold">How to read:</span> {TRIPWIRE_DOCS[t.id]!.reading}
                  </p>
                </details>
              )}
            </div>
          ))}
          {data.tripwires.length === 0 && (
            <p className="text-sm text-navy/60">No evaluations logged yet.</p>
          )}
        </div>
      </section>

      {/* 3 — Layer panels */}
      <section className="mt-8">
        <h2 className="text-xl">Layer panels</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          {LAYERS.map((layer) => (
            <div key={layer.key} className="rounded-lg border border-navy/15 bg-white p-4">
              <h3 className="text-base">{layer.title}</h3>
              <p className="mt-1 text-xs text-navy/60">{LAYER_THEORY[layer.key]}</p>
              <table className="mt-2 w-full text-sm">
                <tbody>
                  {layer.ids.map((id) => {
                    const t = byId.get(id);
                    return (
                      <tr key={id} className="border-t border-navy/10">
                        <td className="py-1.5 pr-2 font-medium">{id}</td>
                        <td className="py-1.5 pr-2">{t?.reading ?? 'N/A'}</td>
                        <td className="py-1.5">{t ? <StatusChip status={t.status} /> : '—'}</td>
                      </tr>
                    );
                  })}
                  {layer.key === 'L2' && (
                    <>
                      <tr className="border-t border-navy/10">
                        <td className="py-1.5 pr-2 font-medium">COT_ES_NET_SPEC_Z</td>
                        <td className="py-1.5 pr-2">{data.contextSeries.cotZ?.toFixed(2) ?? 'N/A — weekly'}</td>
                        <td className="py-1.5 text-xs text-navy/50">probation</td>
                      </tr>
                      {data.manualEntries.length === 0 && (
                        <tr className="border-t border-navy/10">
                          <td className="py-1.5 pr-2 font-medium">ALIGHT / GAMMA</td>
                          <td className="py-1.5 pr-2">N/A — manual pending</td>
                          <td className="py-1.5 text-xs text-navy/50">stale &gt;14d flagged</td>
                        </tr>
                      )}
                      {data.manualEntries.map((m) => (
                        <tr key={m.field} className="border-t border-navy/10">
                          <td className="py-1.5 pr-2 font-medium">{m.field}</td>
                          <td className="py-1.5 pr-2">
                            {m.stale ? 'N/A — stale' : (m.valueNum ?? String(m.valueBool))} ({m.asOfDate})
                          </td>
                          <td className="py-1.5 text-xs text-navy/50">manual</td>
                        </tr>
                      ))}
                    </>
                  )}
                  {layer.key === 'L1' && (
                    <tr className="border-t border-navy/10">
                      <td className="py-1.5 pr-2 font-medium">IG / HY OAS</td>
                      <td className="py-1.5 pr-2">
                        {data.contextSeries.igOas?.toFixed(2) ?? 'N/A'} / {data.contextSeries.hyOas?.toFixed(2) ?? 'N/A'}
                      </td>
                      <td className="py-1.5 text-xs text-navy/50">context only — no trigger status until Jan-2027 calibration</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </section>

      {/* 4 — Tier history */}
      <section className="mt-8">
        <h2 className="text-xl">Tier history</h2>
        <div className="mt-3 overflow-x-auto rounded-lg border border-navy/15 bg-white">
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
                    No transitions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 5 — FP ledger */}
      <section className="mt-8">
        <h2 className="text-xl">False-positive ledger</h2>
        <p className="text-sm text-navy/60">
          Every TRIGGERED / FIRED / ESCALATE reading opens a 9-month outcome window (did a ≥10% event
          follow?). Outcomes feed the pre-committed retirement criteria.
        </p>
        <div className="mt-3 overflow-x-auto rounded-lg border border-navy/15 bg-white">
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
                    No live triggers recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Frozen thresholds reference */}
      <section className="mt-8">
        <h2 className="text-xl">Frozen thresholds</h2>
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
              {data.thresholds.map((t) => (
                <tr key={t.key} className="border-t border-navy/10">
                  <td className="p-2 font-mono text-xs">{t.key}</td>
                  <td className="p-2">{t.value}</td>
                  <td className="p-2">{t.unit}</td>
                  <td className="p-2 text-navy/70">{t.basis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
