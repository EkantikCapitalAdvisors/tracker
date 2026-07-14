import 'server-only';

export function checkAdmin(req: Request): boolean {
  const key = process.env.ADMIN_API_KEY;
  if (!key) return false; // admin routes disabled until a key is configured
  return req.headers.get('x-admin-key') === key;
}
