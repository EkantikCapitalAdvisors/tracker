/**
 * Visitor-gate cookie: `base64url(payload).hmac`. Signed so the gate can be
 * checked in edge middleware without a database call. This is identification,
 * not authentication — the threat model is "know who the site was shared
 * with", nothing more. Uses Web Crypto only (works in edge and Node).
 */

export const GATE_COOKIE = 'cd_visitor';

function gateSecret(): string {
  // Reuse an existing deployment secret; no extra configuration required.
  return process.env.GATE_SECRET ?? process.env.CRON_SECRET ?? '';
}

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmac(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return toBase64Url(new Uint8Array(sig));
}

export async function makeGateCookie(name: string, email: string): Promise<string | null> {
  const secret = gateSecret();
  if (!secret) return null;
  const payload = toBase64Url(encoder.encode(JSON.stringify({ n: name, e: email })));
  return `${payload}.${await hmac(payload, secret)}`;
}

export async function verifyGateCookie(value: string | undefined): Promise<boolean> {
  const secret = gateSecret();
  if (!secret) return true; // no secret configured — gate disabled, never lock out
  if (!value) return false;
  const dot = value.lastIndexOf('.');
  if (dot <= 0) return false;
  const payload = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  return (await hmac(payload, secret)) === sig;
}
