import { NextRequest, NextResponse } from 'next/server';
import { GATE_COOKIE, verifyGateCookie } from '@/lib/gate';

/**
 * Visitor gate: pages require the signed visitor cookie; without it the
 * request is redirected to /welcome (name + email once). API routes are
 * excluded via the matcher — crons authenticate with CRON_SECRET and admin
 * routes with ADMIN_API_KEY, exactly as before.
 */
export async function middleware(req: NextRequest) {
  const cookie = req.cookies.get(GATE_COOKIE)?.value;
  if (await verifyGateCookie(cookie)) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = '/welcome';
  url.search = '';
  const next = req.nextUrl.pathname + req.nextUrl.search;
  if (next && next !== '/') url.searchParams.set('next', next);
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except API routes, Next internals/static assets, and the gate page itself.
  matcher: ['/((?!api/|_next/|welcome|favicon\\.ico|robots\\.txt).*)'],
};
