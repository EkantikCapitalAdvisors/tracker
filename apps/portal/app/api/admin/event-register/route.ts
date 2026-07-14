import { NextResponse } from 'next/server';
import { db } from '@/lib/supabaseServer';
import { checkAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json();
  if (!['SPECULATIVE', 'REALITY_BASED'].includes(body.tag)) {
    return NextResponse.json({ error: 'tag must be SPECULATIVE or REALITY_BASED' }, { status: 400 });
  }
  const { error } = await db().from('cd_event_register').insert({
    peak_date: body.peak_date,
    catalyst_text: body.catalyst_text,
    tag: body.tag,
    entered_by: body.entered_by,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
