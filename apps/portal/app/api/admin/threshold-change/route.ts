import { NextResponse } from 'next/server';
import { db } from '@/lib/supabaseServer';
import { checkAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

/**
 * Governance flow (Spec §7). The database enforces the invariants:
 * 48-hour minimum cool-off, countersigner ≠ proposer, and frozen rows
 * reject UPDATE outside cd_apply_threshold_change().
 */

// Propose
export async function POST(req: Request) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json();
  const { data: current, error: readError } = await db()
    .from('cd_thresholds')
    .select('value')
    .eq('key', body.key)
    .single();
  if (readError || !current) {
    return NextResponse.json({ error: `unknown threshold key ${body.key}` }, { status: 400 });
  }
  const { error } = await db().from('cd_threshold_changes').insert({
    key: body.key,
    old_value: current.value,
    new_value: body.new_value,
    justification: body.justification,
    proposed_by: body.proposed_by,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

// Countersign (sets effective_at; DB trigger enforces the 48h cool-off)
export async function PATCH(req: Request) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json();
  const { error } = await db()
    .from('cd_threshold_changes')
    .update({
      countersigned_by: body.countersigned_by,
      countersigned_at: new Date().toISOString(),
      effective_at: new Date(body.effective_at).toISOString(),
    })
    .eq('id', body.id)
    .eq('applied', false);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

// Apply (only path that can touch a frozen threshold row)
export async function PUT(req: Request) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json();
  const { error } = await db().rpc('cd_apply_threshold_change', { change_id: body.id });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
