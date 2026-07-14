import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

/** Service-role client — server components and route handlers only. */
export function db(): SupabaseClient {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE;
    if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE not configured');
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}
