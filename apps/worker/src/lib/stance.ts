/**
 * Stance-change detection + client notices — Tracker v2.1 §7 (M3).
 *
 * The deployment-rung mapping MIRRORS apps/portal/lib/positioning.ts
 * (computePositioning) and the §5 stance dictionary — keep the three in sync.
 * Deterministic presentation policy; reads engine output, never feeds it.
 *
 * Notices are rate-limited by design: they fire on LADDER RUNG changes only,
 * never on gauge color changes — scarcity of signal is the product. Every
 * notice is recorded in cd_client_notices regardless; delivery is handled by
 * lib/notify.ts, whose provider is chosen by which env vars are present
 * (SMTP / Resend / logged-only).
 */

import type { EngineResult } from '@ekantik/correction-engine';
import { db } from './supabase.js';
import { deliverNotice } from './notify.js';

const STANCE_NAMES: Record<string, string> = {
  T0: 'Fully invested',
  T1: 'Trim',
  T1_ESC: 'Reduce to core',
  T2: 'Half invested',
  T2_RED: 'Defensive',
  T3: 'Defensive floor',
  T3_FLAT: 'Full defense',
};
const RUNG_PCT: Record<string, number> = {
  T0: 100,
  T1: 85,
  T1_ESC: 70,
  T2: 55,
  T2_RED: 40,
  T3: 25,
  T3_FLAT: 0,
};

function rungFor(result: EngineResult): string {
  const s = (id: string) => result.tripwires.find((t) => t.id === id)?.status ?? 'QUIET';
  const constrained = s('POLICY_SWITCH') === 'CONSTRAINED';
  const creditImpulse = s('CREDIT_IMPULSE') === 'TRIGGERED';
  const creditCrisis = s('CREDIT_CRISIS') === 'TRIGGERED';
  const sahmFired = s('SAHM_GATE') === 'FIRED';
  if (result.tier >= 3) return sahmFired && creditCrisis && constrained ? 'T3_FLAT' : 'T3';
  if (result.tier === 2) return constrained || creditImpulse ? 'T2_RED' : 'T2';
  if (result.tier === 1) return result.state.routerStatus === 'ESCALATE' ? 'T1_ESC' : 'T1';
  return 'T0';
}

function checkpointLine(tier: number, cycleHigh: number): string {
  switch (tier) {
    case 0:
      return `A close at or below ${(cycleHigh * 0.95).toFixed(0)} on the S&P 500 (5% below the high) would change the stance to "Trim." Until that number prints, pullbacks are normal fluctuation — not a signal.`;
    case 1:
      return `A close back above ${cycleHigh.toFixed(0)} returns the stance to "Fully invested"; a close at or below ${(cycleHigh * 0.9).toFixed(0)} moves it to "Half invested."`;
    case 2:
      return `A close at or below ${(cycleHigh * 0.8).toFixed(0)} would move the stance to "Defensive floor"; recovering half the decline while credit calms steps it back up.`;
    default:
      return 'The stance steps back up only on conditions: a confirmed higher low plus four straight weeks of credit-spread improvement — never a price guess.';
  }
}

/** Detect a rung change, record it, and notify audience=client registrants. */
export async function recordStanceAndNotify(result: EngineResult, asOfDate: string): Promise<void> {
  const rung = rungFor(result);
  const { data: lastRows } = await db()
    .from('cd_stance_log')
    .select('rung_id,stance')
    .order('id', { ascending: false })
    .limit(1);
  const last = lastRows?.[0];

  if (!last) {
    // First run: record the baseline silently — a baseline is not a change.
    await db().from('cd_stance_log').insert({
      rung_id: rung,
      equity_pct: RUNG_PCT[rung] ?? 100,
      stance: STANCE_NAMES[rung] ?? rung,
      as_of_date: asOfDate,
    });
    return;
  }
  if (last.rung_id === rung) return; // no change — no mail, by design

  const from = last.stance as string;
  const to = STANCE_NAMES[rung] ?? rung;
  await db().from('cd_stance_log').insert({
    rung_id: rung,
    equity_pct: RUNG_PCT[rung] ?? 100,
    stance: to,
    as_of_date: asOfDate,
  });

  const pct = RUNG_PCT[rung] ?? 100;
  const subject = `Stance changed: ${from} → ${to}`;
  const body = [
    `The market stance changed on ${asOfDate}.`,
    '',
    `New stance: ${to} — ${pct}% invested / ${100 - pct}% cash.`,
    `S&P 500: ${result.drawdownPct.toFixed(1)}% below its recent high.`,
    '',
    checkpointLine(result.tier, result.state.cycleHigh),
    '',
    'Live view: https://tracker.ekantikcapital.com/health',
    '',
    '—',
    'General-circulation research published by Ekantik Capital Advisors LLC under the',
    "publisher's exemption. Not personalized investment advice; not tailored to any",
    "individual's circumstances. Deployment levels describe the design intent of a",
    'rules-based framework. Past performance does not guarantee future results.',
  ].join('\n');

  // Recipients: everyone on the register with audience=client.
  const { data: clients } = await db()
    .from('cd_visitors')
    .select('email,name')
    .eq('audience', 'client');
  const recipients = clients ?? [];

  const sentVia = await deliverNotice({
    subject,
    body,
    recipients: recipients.map((r) => r.email as string),
  });

  await db().from('cd_client_notices').insert({
    stance_from: from,
    stance_to: to,
    subject,
    body,
    recipients: recipients.length,
    sent_via: sentVia,
  });
  console.log(`stance change recorded: ${from} → ${to} (${recipients.length} client recipients, ${sentVia})`);
}
