import { NextResponse } from 'next/server';
import { db } from '@/lib/supabaseServer';
import { checkAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json();
  const { error } = await db().from('cd_manual_entries').insert({
    field: body.field,
    as_of_date: body.as_of_date,
    value_num: body.value_num ?? null,
    value_bool: body.value_bool ?? null,
    note: body.note ?? null,
    entered_by: body.entered_by,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
