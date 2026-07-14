/**
 * Retirement criteria as scheduled checks (Spec §7). An alert PROPOSES
 * suspension via Slack; it never auto-modifies thresholds or state logic.
 *
 *  - CREDIT_IMPULSE: 3 consecutive live TRIGGERED with no ≥10% event in 9m
 *  - SAHM: second consecutive FIRED with no recession in 12m (recession is a
 *    manual determination — the alert asks for it)
 *  - FAILED_RECOVERY: live P(≥10% | ESCALATE) < 35% over any 10 escalations
 *  - RATE_SHOCK: 2 failed combined-condition flags
 */

import { db, latestReadings } from '../lib/supabase.js';
import { postMessage } from '../lib/slack.js';

export async function runRetirementChecks(): Promise<void> {
  await annotateFpLedger();

  const alerts: string[] = [];

  // Load resolved FP outcomes per tripwire, oldest first.
  const { data: ledger } = await db()
    .from('cd_fp_ledger')
    .select('triggered_on,outcome,cd_tripwire_log(tripwire,status)')
    .neq('outcome', 'PENDING')
    .order('triggered_on', { ascending: true });
  type Row = { triggered_on: string; outcome: string; cd_tripwire_log: { tripwire: string; status: string } | null };
  const rows = (ledger ?? []) as unknown as Row[];
  const byTripwire = (id: string) => rows.filter((r) => r.cd_tripwire_log?.tripwire === id);

  // CREDIT_IMPULSE — 3 consecutive triggers with no ≥10% event in 9 months.
  const credit = byTripwire('CREDIT_IMPULSE');
  const lastThree = credit.slice(-3);
  if (lastThree.length === 3 && lastThree.every((r) => r.outcome === 'NO_EVENT')) {
    alerts.push(
      'CREDIT_IMPULSE retirement criterion met: 3 consecutive live TRIGGERED readings with no ≥10% event within 9 months (historical base 11/12). Proposal: suspend pending recalibration.',
    );
  }

  // FAILED_RECOVERY — P(≥10% | ESCALATE) < 35% over any 10 live escalations.
  const escalations = byTripwire('FAILED_RECOVERY');
  for (let i = 0; i + 10 <= escalations.length; i++) {
    const window = escalations.slice(i, i + 10);
    const hits = window.filter((r) => r.outcome === 'EVENT_FOLLOWED').length;
    if (hits / 10 < 0.35) {
      alerts.push(
        `FAILED_RECOVERY retirement criterion met: live P(≥10% | ESCALATE) = ${(hits / 10 * 100).toFixed(0)}% over 10 escalations (${window[0]!.triggered_on} → ${window[9]!.triggered_on}); historical 58%. Proposal: re-estimate the router.`,
      );
      break;
    }
  }

  // SAHM — second consecutive FIRED with no ≥10-style recession outcome.
  const sahm = byTripwire('SAHM_GATE').filter((r) => r.cd_tripwire_log?.status === 'FIRED');
  const lastTwoSahm = sahm.slice(-2);
  if (lastTwoSahm.length === 2 && lastTwoSahm.every((r) => r.outcome === 'NO_EVENT')) {
    alerts.push(
      'SAHM_GATE retirement criterion candidate: second consecutive FIRED signal with no ≥10% event in the outcome window. Confirm NBER recession status manually; if none within 12 months, proposal: suspend the gate.',
    );
  }

  // RATE_SHOCK — 2 failed combined-condition flags.
  const rate = byTripwire('RATE_SHOCK');
  const failedCombined = rate.filter((r) => r.outcome === 'NO_EVENT');
  if (failedCombined.length >= 2) {
    alerts.push(
      `RATE_SHOCK retirement criterion met: ${failedCombined.length} combined-condition flags with no event. Proposal: drop the flag entirely.`,
    );
  }

  for (const alert of alerts) {
    await postMessage(`:rotating_light: RETIREMENT ALERT — ${alert} (Alert proposes only; modification requires the governance protocol: justification → 48h cool-off → countersignature.)`);
  }
}

/**
 * FP-ledger annotation: for each PENDING window, did a ≥10% drawdown from
 * the trigger-date cycle high occur before the window closed?
 */
async function annotateFpLedger(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const { data: pending } = await db()
    .from('cd_fp_ledger')
    .select('id,triggered_on,window_ends')
    .eq('outcome', 'PENDING');
  if (!pending || pending.length === 0) return;

  const spx = await latestReadings('SP500', 800);
  for (const row of pending) {
    const window = spx.filter(
      (r) => r.as_of_date >= row.triggered_on && r.as_of_date <= row.window_ends && r.value !== null,
    );
    if (window.length === 0) continue;
    let high = -Infinity;
    let eventFollowed = false;
    for (const r of window) {
      high = Math.max(high, r.value!);
      if (((r.value! - high) / high) * 100 <= -10) {
        eventFollowed = true;
        break;
      }
    }
    if (eventFollowed) {
      await db()
        .from('cd_fp_ledger')
        .update({
          outcome: 'EVENT_FOLLOWED',
          outcome_note: '≥10% close-basis event inside the 9-month window',
          evaluated_at: new Date().toISOString(),
        })
        .eq('id', row.id);
    } else if (row.window_ends < today) {
      await db()
        .from('cd_fp_ledger')
        .update({
          outcome: 'NO_EVENT',
          outcome_note: 'window closed with no ≥10% event — counts toward retirement criteria',
          evaluated_at: new Date().toISOString(),
        })
        .eq('id', row.id);
    }
  }
}
