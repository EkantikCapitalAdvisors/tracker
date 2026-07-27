/**
 * Client-notice delivery — provider-agnostic.
 *
 * Which provider runs is decided purely by which env vars are present, so
 * switching costs a Railway variable change, not a deploy:
 *
 *   SMTP    SMTP_USER + SMTP_PASS (+ SMTP_HOST, default Gmail/Workspace)
 *           No DNS work: Google already SPF/DKIM-signs mail from your own
 *           mailbox. Best for low volume.
 *   RESEND  RESEND_API_KEY + NOTICE_FROM_EMAIL
 *           Requires a verified sending domain (blocked while DNS is on Wix,
 *           which cannot create the subdomain MX Resend needs).
 *   LOGGED  nothing configured — the notice is still recorded in
 *           cd_client_notices; nothing is emailed.
 *
 * Recipients always go in BCC: clients never see each other's addresses.
 */

export type NoticeProvider = 'smtp' | 'resend' | 'logged';

export interface NoticeMessage {
  subject: string;
  body: string;
  recipients: string[];
}

export function activeProvider(): NoticeProvider {
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

async function sendViaSmtp(msg: NoticeMessage): Promise<void> {
  const { createTransport } = await import('nodemailer');
  const transport = createTransport({
    host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: (process.env.SMTP_PORT ?? '465') === '465',
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
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
    if (provider === 'smtp') await sendViaSmtp(msg);
    else await sendViaResend(msg);
    return provider;
  } catch (err) {
    console.error(`client notice delivery failed (${provider}): ${(err as Error).message}`);
    return 'logged';
  }
}
