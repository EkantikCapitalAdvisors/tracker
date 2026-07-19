import { NextResponse } from 'next/server';
import { db } from '@/lib/supabaseServer';
import { GATE_COOKIE, makeGateCookie } from '@/lib/gate';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Visitor self-registration: record who the site was shared with, set the gate cookie. */
export async function POST(req: Request) {
  let body: { name?: unknown; email?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  const name = String(body.name ?? '').trim().slice(0, 120);
  const email = String(body.email ?? '').trim().toLowerCase().slice(0, 200);
  if (name.length < 2) return NextResponse.json({ error: 'please enter your name' }, { status: 400 });
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'please enter a valid email' }, { status: 400 });
  }

  const client = db();
  const { data: existing } = await client
    .from('cd_visitors')
    .select('id,visits')
    .eq('email', email)
    .limit(1);
  if (existing && existing.length > 0) {
    await client
      .from('cd_visitors')
      .update({ name, last_seen: new Date().toISOString(), visits: (existing[0]!.visits ?? 0) + 1 })
      .eq('id', existing[0]!.id);
  } else {
    const { error } = await client.from('cd_visitors').insert({ name, email });
    if (error) return NextResponse.json({ error: 'registration failed — try again' }, { status: 500 });
  }

  const cookie = await makeGateCookie(name, email);
  const res = NextResponse.json({ ok: true });
  if (cookie) {
    res.cookies.set(GATE_COOKIE, cookie, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return res;
}
