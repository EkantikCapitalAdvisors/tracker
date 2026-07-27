/**
 * One-off delivery test for the client-notice pipeline.
 * Sends a clearly-labelled sample using the SAME templates and provider
 * dispatch as a real stance change, so a successful test proves the real
 * path. Never touches cd_stance_log — a test must not look like a change.
 */

import { activeProvider, deliverNotice } from '../lib/notify.js';
import { db } from '../lib/supabase.js';

export async function runTestNotice(): Promise<void> {
  const provider = activeProvider();
  const { data: clients } = await db().from('cd_visitors').select('email,name').eq('audience', 'client');
  const recipients = (clients ?? []).map((r) => r.email as string);

  // Route the test to the sender's own mailbox only — never to the client list.
  const self = process.env.NOTICE_FROM_EMAIL ?? process.env.SMTP_USER;
  if (!self) {
    console.error('test-notice: no NOTICE_FROM_EMAIL/SMTP_USER configured — nothing to send to');
    return;
  }

  const subject = 'TEST — Ekantik stance notice pipeline';
  const body = [
    'This is a test of the client stance-alert pipeline. No stance has changed.',
    '',
    'A real notice looks like this:',
    '',
    '  Stance changed: Fully invested → Trim',
    '  New stance: Trim — 85% invested / 15% cash.',
    '  S&P 500: -5.2% below its recent high.',
    '  A close back above 7610 returns the stance to "Fully invested".',
    '',
    `Provider in use: ${provider}.`,
    `Client register currently holds ${recipients.length} recipient(s) — none were emailed by this test.`,
    '',
    'Live view: https://tracker.ekantikcapital.com/health',
    '',
    '—',
    'General-circulation research published by Ekantik Capital Advisors LLC under the',
    "publisher's exemption. Not personalized investment advice.",
  ].join('\n');

  const sentVia = await deliverNotice({ subject, body, recipients: [self] });
  console.log(
    `test-notice: provider=${provider} sent_via=${sentVia} to=${self} ` +
      `(client register has ${recipients.length}, not emailed)`,
  );
  if (sentVia === 'logged') {
    console.error('test-notice: delivery did NOT happen — check SMTP_USER/SMTP_PASS on the worker');
  }
}
