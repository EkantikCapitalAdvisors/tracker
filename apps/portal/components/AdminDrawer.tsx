'use client';

import { useState } from 'react';

async function submit(path: string, method: string, body: unknown, adminKey: string): Promise<string> {
  const res = await fetch(path, {
    method,
    headers: { 'content-type': 'application/json', 'x-admin-key': adminKey },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  return res.ok ? 'OK' : `Error: ${data.error ?? res.status}`;
}

const inputCls = 'w-full rounded border border-navy/25 bg-white px-2 py-1 text-sm';
const btnCls = 'rounded bg-navy px-3 py-1.5 text-sm text-ivory hover:bg-navy/85';

export function AdminDrawer({
  pendingChanges,
}: {
  pendingChanges: { id: number; key: string; oldValue: number; newValue: number; countersignedBy: string | null; effectiveAt: string | null; applied: boolean }[];
}) {
  const [open, setOpen] = useState(false);
  const [adminKey, setAdminKey] = useState('');
  const [status, setStatus] = useState('');

  const [manual, setManual] = useState({ field: 'ALIGHT_401K_INDEX', asOfDate: '', valueNum: '', valueBool: '', enteredBy: '' });
  const [event, setEvent] = useState({ peakDate: '', catalystText: '', tag: 'SPECULATIVE', enteredBy: '' });
  const [proposal, setProposal] = useState({ key: '', newValue: '', justification: '', proposedBy: '' });
  const [countersign, setCountersign] = useState({ id: '', countersignedBy: '', effectiveAt: '' });

  return (
    <section className="mt-10 rounded-lg border border-navy/15 bg-white/70">
      <button className="w-full px-4 py-3 text-left font-heading text-lg" onClick={() => setOpen(!open)}>
        Admin drawer {open ? '▾' : '▸'}
      </button>
      {open && (
        <div className="grid gap-6 border-t border-navy/10 p-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs uppercase tracking-wide text-navy/60">Admin key</label>
            <input className={inputCls} type="password" value={adminKey} onChange={(e) => setAdminKey(e.target.value)} />
            {status && <p className="mt-2 text-sm">{status}</p>}
          </div>

          <form
            className="space-y-2"
            onSubmit={async (e) => {
              e.preventDefault();
              setStatus(
                await submit(
                  '/api/admin/manual-entry',
                  'POST',
                  {
                    field: manual.field,
                    as_of_date: manual.asOfDate,
                    value_num: manual.valueNum === '' ? null : Number(manual.valueNum),
                    value_bool: manual.valueBool === '' ? null : manual.valueBool === 'true',
                    entered_by: manual.enteredBy,
                  },
                  adminKey,
                ),
              );
            }}
          >
            <h3 className="text-base">Manual entry (Alight · gamma · revision breadth · higher low)</h3>
            <select className={inputCls} value={manual.field} onChange={(e) => setManual({ ...manual, field: e.target.value })}>
              <option>ALIGHT_401K_INDEX</option>
              <option>DEALER_GAMMA</option>
              <option>REVISION_BREADTH_NEGATIVE</option>
              <option>CONFIRMED_HIGHER_LOW</option>
            </select>
            <input className={inputCls} type="date" required value={manual.asOfDate} onChange={(e) => setManual({ ...manual, asOfDate: e.target.value })} />
            <input className={inputCls} placeholder="numeric value (optional)" value={manual.valueNum} onChange={(e) => setManual({ ...manual, valueNum: e.target.value })} />
            <select className={inputCls} value={manual.valueBool} onChange={(e) => setManual({ ...manual, valueBool: e.target.value })}>
              <option value="">boolean value (optional)</option>
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
            <input className={inputCls} placeholder="entered by" required value={manual.enteredBy} onChange={(e) => setManual({ ...manual, enteredBy: e.target.value })} />
            <button className={btnCls}>Save entry</button>
          </form>

          <form
            className="space-y-2"
            onSubmit={async (e) => {
              e.preventDefault();
              setStatus(
                await submit(
                  '/api/admin/event-register',
                  'POST',
                  { peak_date: event.peakDate, catalyst_text: event.catalystText, tag: event.tag, entered_by: event.enteredBy },
                  adminKey,
                ),
              );
            }}
          >
            <h3 className="text-base">Event register (required within 48h of Tier-1 entry)</h3>
            <input className={inputCls} type="date" required value={event.peakDate} onChange={(e) => setEvent({ ...event, peakDate: e.target.value })} />
            <textarea className={inputCls} placeholder="catalyst description" required value={event.catalystText} onChange={(e) => setEvent({ ...event, catalystText: e.target.value })} />
            <select className={inputCls} value={event.tag} onChange={(e) => setEvent({ ...event, tag: e.target.value })}>
              <option>SPECULATIVE</option>
              <option>REALITY_BASED</option>
            </select>
            <input className={inputCls} placeholder="entered by" required value={event.enteredBy} onChange={(e) => setEvent({ ...event, enteredBy: e.target.value })} />
            <button className={btnCls}>Register catalyst</button>
          </form>

          <form
            className="space-y-2"
            onSubmit={async (e) => {
              e.preventDefault();
              setStatus(
                await submit(
                  '/api/admin/threshold-change',
                  'POST',
                  { key: proposal.key, new_value: Number(proposal.newValue), justification: proposal.justification, proposed_by: proposal.proposedBy },
                  adminKey,
                ),
              );
            }}
          >
            <h3 className="text-base">Propose threshold change (48h cool-off + countersignature)</h3>
            <input className={inputCls} placeholder="threshold key" required value={proposal.key} onChange={(e) => setProposal({ ...proposal, key: e.target.value })} />
            <input className={inputCls} placeholder="new value" required value={proposal.newValue} onChange={(e) => setProposal({ ...proposal, newValue: e.target.value })} />
            <textarea className={inputCls} placeholder="written justification (min 50 chars)" required value={proposal.justification} onChange={(e) => setProposal({ ...proposal, justification: e.target.value })} />
            <input className={inputCls} placeholder="proposed by" required value={proposal.proposedBy} onChange={(e) => setProposal({ ...proposal, proposedBy: e.target.value })} />
            <button className={btnCls}>Submit proposal</button>
          </form>

          <div className="space-y-2">
            <h3 className="text-base">Pending proposals</h3>
            {pendingChanges.filter((c) => !c.applied).length === 0 && <p className="text-sm text-navy/60">None pending.</p>}
            <ul className="space-y-2 text-sm">
              {pendingChanges
                .filter((c) => !c.applied)
                .map((c) => (
                  <li key={c.id} className="rounded border border-gold/50 bg-gold/10 p-2">
                    <strong>#{c.id}</strong> {c.key}: {c.oldValue} → {c.newValue}
                    <br />
                    {c.countersignedBy ? `countersigned by ${c.countersignedBy}` : 'awaiting countersignature'}
                    {c.effectiveAt ? ` · effective ${c.effectiveAt}` : ''}
                  </li>
                ))}
            </ul>
            <form
              className="space-y-2"
              onSubmit={async (e) => {
                e.preventDefault();
                setStatus(
                  await submit(
                    '/api/admin/threshold-change',
                    'PATCH',
                    { id: Number(countersign.id), countersigned_by: countersign.countersignedBy, effective_at: countersign.effectiveAt },
                    adminKey,
                  ),
                );
              }}
            >
              <input className={inputCls} placeholder="proposal id" required value={countersign.id} onChange={(e) => setCountersign({ ...countersign, id: e.target.value })} />
              <input className={inputCls} placeholder="countersigned by (Manish Dharod)" required value={countersign.countersignedBy} onChange={(e) => setCountersign({ ...countersign, countersignedBy: e.target.value })} />
              <input className={inputCls} type="datetime-local" required value={countersign.effectiveAt} onChange={(e) => setCountersign({ ...countersign, effectiveAt: e.target.value })} />
              <button className={btnCls}>Countersign</button>
            </form>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setStatus(await submit('/api/admin/threshold-change', 'PUT', { id: Number(countersign.id) }, adminKey));
              }}
            >
              <button className={btnCls}>Apply effective change (id above)</button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
