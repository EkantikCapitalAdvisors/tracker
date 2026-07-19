import { NextResponse } from 'next/server';
import { checkAdmin } from '@/lib/adminAuth';
import { db } from '@/lib/supabaseServer';

/** Who has the site been shared with? Admin-only visitor register. */
export async function GET(req: Request) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { data, error } = await db()
    .from('cd_visitors')
    .select('name,email,first_seen,last_seen,visits')
    .order('last_seen', { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ visitors: data ?? [] });
}
