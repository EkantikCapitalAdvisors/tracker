import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

/** Service-role client — server components and route handlers only. */
export function db(): SupabaseClient {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE;
    if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE not configured');
    client = createClient(url, key, {
      auth: { persistSession: false },
      // PostgREST reads are GETs, and Next's Data Cache will happily persist
      // them across requests — a page marked force-dynamic still re-serves the
      // response body it cached the first time. Every read here is live state,
      // so opt every one of them out explicitly.
      global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
    });
  }
  return client;
}
