/**
 * Client-notice delivery — provider-agnostic.
 *
 * Which provider runs is decided purely by which env vars are present, so
 * switching costs a Railway variable change, not a deploy:
 *
 *   BREVO   BREVO_API_KEY + NOTICE_FROM_EMAIL
 *           HTTPS; free tier is genuinely free (300/day) and domain auth is
 *           TXT-only, so it clears both Railway's SMTP block and Wix DNS's
 *           inability to create a subdomain MX record.
 *   SENDGRID SENDGRID_API_KEY + NOTICE_FROM_EMAIL
 *           Sends over HTTPS, so it works where outbound SMTP is blocked
 *           (Railway blocks 465 and 587). Authenticates with CNAME records
 *           only — no subdomain MX — so it also works on Wix DNS.
 *   SMTP    SMTP_USER + SMTP_PASS (+ SMTP_HOST/SMTP_PORT)
 *           Google Workspace needs no DNS work, but requires a host that
 *           permits outbound SMTP. Railway does not.
 *   RESEND  RESEND_API_KEY + NOTICE_FROM_EMAIL
 *           Requires a verified sending domain (blocked while DNS is on Wix,
 *           which cannot create the subdomain MX Resend needs).
 *   LOGGED  nothing configured — the notice is still recorded in
 *           cd_client_notices; nothing is emailed.
 *
 * Recipients always go in BCC: clients never see each other's addresses.
 */

export type NoticeProvider = 'brevo' | 'sendgrid' | 'smtp' | 'resend' | 'logged';

export interface NoticeMessage {
  subject: string;
  body: string;
  recipients: string[];
}

export function activeProvider(): NoticeProvider {
  // HTTPS providers first: Railway blocks outbound SMTP (465 and 587 both
  // time out), so anything SMTP-based cannot work from this host.
  if (process.env.BREVO_API_KEY && process.env.NOTICE_FROM_EMAIL) return 'brevo';
  if (process.env.SENDGRID_API_KEY && process.env.NOTICE_FROM_EMAIL) return 'sendgrid';
  if (process.env.SMTP_USER && process.env.SMTP_PASS) return 'smtp';
  if (process.env.RESEND_API_KEY && process.env.NOTICE_FROM_EMAIL) return 'resend';
  return 'logged';
}

/** From-address: explicit override, else the SMTP mailbox itself. */
function fromAddress(): string {
  return (
    process.env.NOTICE_FROM_EMAIL ??
    process.env.SMTP_USER ??
    'research@ekantikcapital.com'
  );
}

async function sendViaResend(msg: NoticeMessage): Promise<void> {
  const from = fromAddress();
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ from, to: [from], bcc: msg.recipients, subject: msg.subject, text: msg.body }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`resend HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

async function sendViaBrevo(msg: NoticeMessage): Promise<void> {
  const from = fromAddress();
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': process.env.BREVO_API_KEY!, 'content-type': 'application/json' },
    body: JSON.stringify({
      sender: { name: 'Ekantik Capital Advisors', email: from },
      to: [{ email: from }],
      ...(msg.recipients.length > 0 ? { bcc: msg.recipients.map((email) => ({ email })) } : {}),
      subject: msg.subject,
      textContent: msg.body,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`brevo HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

async function sendViaSendgrid(msg: NoticeMessage): Promise<void> {
  const from = fromAddress();
  // One personalization with the sender as `to` and everyone else BCC'd, so
  // recipients never see each other.
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email: from }],
          ...(msg.recipients.length > 0 ? { bcc: msg.recipients.map((email) => ({ email })) } : {}),
        },
      ],
      from: { email: from, name: 'Ekantik Capital Advisors' },
      subject: msg.subject,
      content: [{ type: 'text/plain', value: msg.body }],
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`sendgrid HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

async function sendViaSmtp(msg: NoticeMessage): Promise<void> {
  const { createTransport } = await import('nodemailer');
  const transport = createTransport({
    host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: (process.env.SMTP_PORT ?? '465') === '465',
    // Google displays app passwords in four spaced groups; strip whitespace
    // so a pasted value works either way.
    auth: {
      user: process.env.SMTP_USER!.trim(),
      pass: process.env.SMTP_PASS!.replace(/\s+/g, ''),
    },
  });
  const from = fromAddress();
  await transport.sendMail({
    from: `Ekantik Capital Advisors <${from}>`,
    to: from, // the visible recipient is us; clients are BCC'd
    bcc: msg.recipients,
    subject: msg.subject,
    text: msg.body,
  });
}

/**
 * Deliver a client notice. Returns the provider actually used so the caller
 * can record it. Never throws: delivery failure must not fail the evaluation.
 */
export async function deliverNotice(msg: NoticeMessage): Promise<NoticeProvider> {
  const provider = activeProvider();
  if (provider === 'logged' || msg.recipients.length === 0) return 'logged';
  try {
    if (provider === 'brevo') await sendViaBrevo(msg);
    else if (provider === 'sendgrid') await sendViaSendgrid(msg);
    else if (provider === 'smtp') await sendViaSmtp(msg);
    else await sendViaResend(msg);
    return provider;
  } catch (err) {
    console.error(`client notice delivery failed (${provider}): ${(err as Error).message}`);
    return 'logged';
  }
}
