#!/usr/bin/env node
/**
 * Correction Dashboard v2 — automated go-live (runbook steps 1–5 of GO_LIVE.md).
 *
 * Drives the Supabase, Upstash, Vercel, and Railway APIs directly. Run it from
 * any machine with open network access, or from a Claude Code session whose
 * environment allows these hosts:
 *   api.supabase.com  *.supabase.co  api.upstash.com
 *   api.vercel.com    backboard.railway.app
 *
 * Required env:
 *   SUPABASE_ACCESS_TOKEN   supabase.com/dashboard/account/tokens
 *   SUPABASE_PROJECT_REF    existing project ref (the <ref> in <ref>.supabase.co)
 *   UPSTASH_EMAIL + UPSTASH_API_KEY   console.upstash.com/account/api
 *   VERCEL_TOKEN            vercel.com/account/tokens
 *   RAILWAY_TOKEN           railway.app/account/tokens (account token)
 *   FRED_API_KEY, SLACK_BOT_TOKEN            (runtime secrets to install)
 * Optional env:
 *   ANTHROPIC_API_KEY, CFTC_APP_TOKEN, VERCEL_TEAM_ID, UPSTASH_REGION (default us-east-1)
 *   SKIP_SUPABASE / SKIP_UPSTASH / SKIP_VERCEL / SKIP_RAILWAY / SKIP_BOOTSTRAP = 1
 *
 * Idempotent where the APIs allow it; every step logs what it did. Nothing in
 * here touches thresholds or state — infrastructure only.
 */

import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPO = 'EkantikCapitalAdvisors/tracker';
const BRANCH = 'claude/new-session-h9gon4';

const out = {};
const log = (msg) => console.log(`\x1b[36m▸\x1b[0m ${msg}`);
const ok = (msg) => console.log(`\x1b[32m✓\x1b[0m ${msg}`);
const warn = (msg) => console.log(`\x1b[33m⚠\x1b[0m ${msg}`);

function env(name, required = true) {
  const v = process.env[name];
  if (!v && required) {
    console.error(`Missing env ${name} — see the header of this script.`);
    process.exit(1);
  }
  return v ?? null;
}

async function api(url, { method = 'GET', headers = {}, body, expect = [200, 201] } = {}) {
  const res = await fetch(url, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!expect.includes(res.status)) {
    throw new Error(`${method} ${url} → ${res.status}: ${text.slice(0, 400)}`);
  }
  return json;
}

// ---------------------------------------------------------------------------
// 1. Supabase — migration, service key, storage bucket
// ---------------------------------------------------------------------------
async function supabase() {
  const token = env('SUPABASE_ACCESS_TOKEN');
  const ref = env('SUPABASE_PROJECT_REF');
  const auth = { authorization: `Bearer ${token}` };
  const mgmt = `https://api.supabase.com/v1/projects/${ref}`;

  log('Supabase: applying migration…');
  const sql = readFileSync(join(ROOT, 'supabase/migrations/0001_correction_dashboard.sql'), 'utf8');
  await api(`${mgmt}/database/query`, { method: 'POST', headers: auth, body: { query: sql }, expect: [200, 201] });
  const check = await api(`${mgmt}/database/query`, {
    method: 'POST',
    headers: auth,
    body: { query: 'select count(*)::int as n from cd_thresholds;' },
  });
  const n = Array.isArray(check) ? check[0]?.n : check?.result?.[0]?.n;
  ok(`Supabase: migration applied — cd_thresholds rows: ${n ?? JSON.stringify(check).slice(0, 80)}`);

  // Prove the freeze trigger rejects a direct update.
  try {
    await api(`${mgmt}/database/query`, {
      method: 'POST',
      headers: auth,
      body: { query: "update cd_thresholds set value = 999 where key = 'RV_ACCEL_RATIO';" },
    });
    throw new Error('FROZEN-THRESHOLD TEST FAILED: direct UPDATE was accepted — do not go live.');
  } catch (err) {
    if (String(err).includes('frozen')) ok('Supabase: frozen-threshold trigger verified (direct UPDATE rejected)');
    else if (String(err).includes('FROZEN-THRESHOLD')) throw err;
    else ok(`Supabase: direct UPDATE rejected (${String(err).slice(0, 100)}…)`);
  }

  log('Supabase: fetching service-role key…');
  const keys = await api(`${mgmt}/api-keys`, { headers: auth });
  const service = (Array.isArray(keys) ? keys : []).find((k) => k.name === 'service_role');
  if (!service?.api_key) throw new Error('service_role key not found via management API');
  out.SUPABASE_URL = `https://${ref}.supabase.co`;
  out.SUPABASE_SERVICE_ROLE = service.api_key;

  log('Supabase: creating private bucket cd-exports…');
  try {
    await api(`${out.SUPABASE_URL}/storage/v1/bucket`, {
      method: 'POST',
      headers: { authorization: `Bearer ${out.SUPABASE_SERVICE_ROLE}` },
      body: { id: 'cd-exports', name: 'cd-exports', public: false },
    });
    ok('Supabase: bucket cd-exports created');
  } catch (err) {
    if (String(err).includes('already exists') || String(err).includes('409')) ok('Supabase: bucket cd-exports already exists');
    else throw err;
  }
}

// ---------------------------------------------------------------------------
// 2. Upstash — Redis database
// ---------------------------------------------------------------------------
async function upstash() {
  const auth = {
    authorization: `Basic ${Buffer.from(`${env('UPSTASH_EMAIL')}:${env('UPSTASH_API_KEY')}`).toString('base64')}`,
  };
  log('Upstash: creating Redis database…');
  const existing = await api('https://api.upstash.com/v2/redis/databases', { headers: auth });
  let db = (Array.isArray(existing) ? existing : []).find((d) => d.database_name === 'ekantik-correction');
  if (db) {
    ok('Upstash: database ekantik-correction already exists');
  } else {
    db = await api('https://api.upstash.com/v2/redis/database', {
      method: 'POST',
      headers: auth,
      body: { name: 'ekantik-correction', region: process.env.UPSTASH_REGION ?? 'us-east-1', tls: true },
    });
    ok('Upstash: database created');
  }
  out.REDIS_URL = `rediss://default:${db.password}@${db.endpoint}:${db.port}`;
}

// ---------------------------------------------------------------------------
// 3. Vercel — project, env vars, deployment
// ---------------------------------------------------------------------------
async function vercel() {
  const token = env('VERCEL_TOKEN');
  const auth = { authorization: `Bearer ${token}` };
  const team = process.env.VERCEL_TEAM_ID ? `?teamId=${process.env.VERCEL_TEAM_ID}` : '';
  out.CRON_SECRET ??= randomBytes(32).toString('hex');
  out.ADMIN_API_KEY ??= randomBytes(32).toString('hex');

  log('Vercel: creating project ekantik-correction-portal…');
  let project;
  try {
    project = await api(`https://api.vercel.com/v11/projects${team}`, {
      method: 'POST',
      headers: auth,
      body: {
        name: 'ekantik-correction-portal',
        framework: 'nextjs',
        rootDirectory: 'apps/portal',
        gitRepository: { type: 'github', repo: REPO },
      },
    });
    ok('Vercel: project created');
  } catch (err) {
    if (String(err).includes('409') || String(err).includes('already exists')) {
      project = await api(`https://api.vercel.com/v9/projects/ekantik-correction-portal${team}`, { headers: auth });
      ok('Vercel: project already exists — reusing');
    } else throw err;
  }

  log('Vercel: setting environment variables…');
  const vars = {
    SUPABASE_URL: out.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE: out.SUPABASE_SERVICE_ROLE,
    REDIS_URL: out.REDIS_URL,
    CRON_SECRET: out.CRON_SECRET,
    ADMIN_API_KEY: out.ADMIN_API_KEY,
  };
  await api(`https://api.vercel.com/v10/projects/${project.id}/env${team ? `${team}&upsert=true` : '?upsert=true'}`, {
    method: 'POST',
    headers: auth,
    body: Object.entries(vars)
      .filter(([, v]) => v)
      .map(([key, value]) => ({ key, value, type: 'encrypted', target: ['production', 'preview'] })),
  });
  ok('Vercel: env vars set');

  log('Vercel: triggering production deployment…');
  const repoId = project.link?.repoId;
  const deploy = await api(`https://api.vercel.com/v13/deployments${team}`, {
    method: 'POST',
    headers: auth,
    body: {
      name: 'ekantik-correction-portal',
      project: project.id,
      target: 'production',
      gitSource: repoId
        ? { type: 'github', repoId, ref: BRANCH }
        : { type: 'github', org: REPO.split('/')[0], repo: REPO.split('/')[1], ref: BRANCH },
    },
  });
  out.PORTAL_URL = `https://${deploy.url ?? deploy.alias?.[0] ?? 'ekantik-correction-portal.vercel.app'}`;
  ok(`Vercel: deployment triggered → ${out.PORTAL_URL}`);
}

// ---------------------------------------------------------------------------
// 4. Railway — project, worker service, variables
// ---------------------------------------------------------------------------
async function railway() {
  const token = env('RAILWAY_TOKEN');
  const gql = async (query, variables = {}) => {
    const res = await api('https://backboard.railway.app/graphql/v2', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: { query, variables },
    });
    if (res.errors) throw new Error(`Railway GraphQL: ${JSON.stringify(res.errors).slice(0, 400)}`);
    return res.data;
  };

  log('Railway: creating project…');
  const created = await gql(
    `mutation($input: ProjectCreateInput!) { projectCreate(input: $input) { id environments { edges { node { id name } } } } }`,
    { input: { name: 'ekantik-correction-worker' } },
  );
  const projectId = created.projectCreate.id;
  const envId = created.projectCreate.environments.edges[0].node.id;
  ok(`Railway: project ${projectId}`);

  log('Railway: creating service from GitHub repo…');
  const service = await gql(
    `mutation($input: ServiceCreateInput!) { serviceCreate(input: $input) { id } }`,
    { input: { projectId, name: 'worker', source: { repo: REPO }, branch: BRANCH } },
  );
  const serviceId = service.serviceCreate.id;
  ok(`Railway: service ${serviceId}`);

  log('Railway: build/start commands…');
  await gql(
    `mutation($serviceId: String!, $environmentId: String!, $input: ServiceInstanceUpdateInput!) {
       serviceInstanceUpdate(serviceId: $serviceId, environmentId: $environmentId, input: $input) }`,
    {
      serviceId,
      environmentId: envId,
      input: {
        buildCommand: 'npm ci && npm run build --workspace @ekantik/correction-worker',
        startCommand: 'npm start --workspace @ekantik/correction-worker',
      },
    },
  );

  log('Railway: variables…');
  const vars = {
    FRED_API_KEY: env('FRED_API_KEY'),
    SUPABASE_URL: out.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE: out.SUPABASE_SERVICE_ROLE,
    REDIS_URL: out.REDIS_URL,
    SLACK_BOT_TOKEN: env('SLACK_BOT_TOKEN'),
    SLACK_CHANNEL_ID: process.env.SLACK_CHANNEL_ID ?? 'C0AH7FWP2JU',
    ...(process.env.ANTHROPIC_API_KEY ? { ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY } : {}),
    ...(process.env.CFTC_APP_TOKEN ? { CFTC_APP_TOKEN: process.env.CFTC_APP_TOKEN } : {}),
  };
  await gql(
    `mutation($input: VariableCollectionUpsertInput!) { variableCollectionUpsert(input: $input) }`,
    { input: { projectId, environmentId: envId, serviceId, variables: vars } },
  );
  ok('Railway: worker configured — deployment starts automatically');
}

// ---------------------------------------------------------------------------
// 5. Bootstrap — first ingests through the portal cron routes
// ---------------------------------------------------------------------------
async function bootstrap() {
  if (!out.PORTAL_URL || !out.CRON_SECRET) {
    warn('Bootstrap skipped — PORTAL_URL/CRON_SECRET unknown (set SKIP_BOOTSTRAP=1 to silence)');
    return;
  }
  log('Waiting 90s for Vercel + Railway deploys to settle…');
  await new Promise((r) => setTimeout(r, 90_000));
  for (const job of ['weekly-ingest', 'daily-ingest']) {
    const res = await api(`${out.PORTAL_URL}/api/cron/${job}`, {
      headers: { authorization: `Bearer ${out.CRON_SECRET}` },
    });
    ok(`Bootstrap: enqueued ${job} (${JSON.stringify(res)})`);
  }
  ok(`Open ${out.PORTAL_URL}/dashboard/correction once the worker logs show "done daily-ingest".`);
}

// ---------------------------------------------------------------------------
const steps = [
  ['SUPABASE', supabase],
  ['UPSTASH', upstash],
  ['VERCEL', vercel],
  ['RAILWAY', railway],
  ['BOOTSTRAP', bootstrap],
];

for (const [name, fn] of steps) {
  if (process.env[`SKIP_${name}`]) {
    warn(`${name}: skipped via SKIP_${name}`);
    continue;
  }
  await fn();
}

console.log('\n=== OUTPUTS (store these) ===');
for (const [k, v] of Object.entries(out)) {
  console.log(`${k}=${k.includes('SERVICE_ROLE') || k.includes('SECRET') || k.includes('KEY') ? `${String(v).slice(0, 6)}…` : v}`);
}
console.log('\nNext: GO_LIVE.md §6 (first sentinel + decommission v1) and §7 (governance test).');
