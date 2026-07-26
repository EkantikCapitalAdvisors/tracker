import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { GATE_COOKIE, verifyGateCookie } from '@/lib/gate';
import { loadPlainState } from '@/lib/plainState';

export const dynamic = 'force-dynamic';

/**
 * Plain View view-model — Tracker v2.1 §4. All plain-language strings are
 * composed server-side; the client bundle contains no threshold logic.
 * Requires the visitor gate cookie (API matcher bypasses middleware).
 */
export async function GET() {
  const ok = await verifyGateCookie(cookies().get(GATE_COOKIE)?.value);
  if (!ok) return NextResponse.json({ error: 'register first at /welcome' }, { status: 401 });
  const state = await loadPlainState();
  if (!state) {
    return NextResponse.json({ error: 'no state recorded yet — first ingest pending' }, { status: 503 });
  }
  return NextResponse.json(state);
}
