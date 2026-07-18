# GO LIVE — Correction Dashboard v2

Deployment runbook. Every step is copy-paste; nothing here changes a frozen threshold or the
state machine. Order matters: **Supabase → Redis → Railway worker → Vercel portal → bootstrap →
first sentinel → decommission v1**.

The deploy branch is `claude/new-session-h9gon4` — it is the repository's **default branch**
(the repo was created empty). Optionally rename it to `main` first (GitHub → Settings →
Branches → rename); Vercel/Railway will follow the default branch either way.

> **Automated path:** `scripts/go-live.mjs` executes steps 1–5 below via the Supabase, Upstash,
> Vercel, and Railway APIs — `node scripts/go-live.mjs` with the tokens listed in its header.
> Run it from any machine with open network access, or hand the tokens to a Claude Code session
> whose environment allows those hosts and let it drive. The manual steps below remain the
> reference and the fallback.

---

## 1. Supabase (≈10 min)

1. Use the existing Ekantik Supabase project (or create one at supabase.com).
2. **SQL Editor → New query** → paste the entire contents of
   `supabase/migrations/0001_correction_dashboard.sql` → Run.
   This creates all `cd_*` tables, the governance triggers (frozen-threshold UPDATE rejection,
   48h cool-off, countersigner ≠ proposer, append-only logs), the
   `cd_apply_threshold_change()` RPC, RLS (internal-only), and seeds the 16 frozen thresholds.
3. **Storage → New bucket** → name `cd-exports`, **private**. (Annual re-validation packages
   land here.)
4. Collect for later:
   - `SUPABASE_URL` — Settings → API → Project URL
   - `SUPABASE_SERVICE_ROLE` — Settings → API → `service_role` secret

**Verify:** `select count(*) from cd_thresholds;` → **16**. Then confirm the freeze works:
`update cd_thresholds set value = 40 where key = 'CREDIT_IMPULSE_DELTA3M_BP';` → must FAIL with
`frozen — no countersigned, cooled-off change in effect`.

## 2. Upstash Redis (≈3 min)

1. console.upstash.com → Create database (region near Railway).
2. Collect `REDIS_URL` — the **`rediss://default:<password>@<host>:<port>`** TLS URL
   (not the REST URL).

## 3. Railway — worker (≈10 min)

1. railway.app → New Project → **Deploy from GitHub repo** → `EkantikCapitalAdvisors/tracker`,
   branch `claude/new-session-h9gon4`.
2. Service settings:
   - **Root directory:** `/` (repo root — npm workspaces need the root lockfile)
   - **Build command:** `npm ci && npm run build --workspace @ekantik/correction-worker`
   - **Start command:** `npm start --workspace @ekantik/correction-worker`
3. Variables:

   | Variable | Value |
   |---|---|
   | `FRED_API_KEY` | fred.stlouisfed.org/docs/api/api_key.html |
   | `SUPABASE_URL` | from step 1 |
   | `SUPABASE_SERVICE_ROLE` | from step 1 |
   | `REDIS_URL` | from step 2 |
   | `SLACK_BOT_TOKEN` | existing Ekantik bot (`xoxb-…`) — needs `chat:write` in #all-ekantikcapital |
   | `SLACK_CHANNEL_ID` | `C0AH7FWP2JU` |
   | `ANTHROPIC_API_KEY` | optional — enables the narrative paragraph in sentinel message 3 |
   | `CFTC_APP_TOKEN` | optional |

4. Deploy. **Verify:** logs show the worker start with no errors (it idles waiting for jobs).

## 4. Vercel — portal (≈10 min)

1. vercel.com → Add New Project → import `EkantikCapitalAdvisors/tracker`.
2. **Root Directory:** `apps/portal` (Framework: Next.js — auto-detected; Vercel handles the
   npm-workspace install from the repo root, and the engine package self-builds via `prepare`).
3. Environment variables (Production):

   | Variable | Value |
   |---|---|
   | `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE` | from step 1 |
   | `REDIS_URL` | from step 2 |
   | `CRON_SECRET` | `openssl rand -hex 32` — Vercel Cron sends it automatically as the Bearer token |
   | `ADMIN_API_KEY` | `openssl rand -hex 32` — the admin drawer key (share only with dashboard admins) |

4. Deploy. `apps/portal/vercel.json` registers the crons automatically:

   | Cron | UTC | Job |
   |---|---|---|
   | daily ingest | 22:35 Mon–Fri | post-close evaluation (+ mini-sentinel while Tier ≥ 1) |
   | Friday sentinel | 22:00 Fri | three-message threaded Slack post |
   | weekly ingest | 14:00 Sat | CFTC COT, CAPE, ICI |
   | retirement checks | 14:30 Sat | FP-ledger outcomes + retirement alerts |
   | annual export | Jan 2 | re-validation package |

   > CT note: 22:35 UTC = 5:35 PM CDT. During CST (winter) that's 4:35 PM CT — still after the
   > 3 PM CT close, so evaluations stay on closing data. Shift to 23:35 UTC in winter if you
   > want the clock time exact.

## 5. Bootstrap the data (one-time, ≈5 min)

Trigger the two ingest jobs once by hand (same route the crons hit):

```sh
export PORTAL=https://<your-vercel-domain>
export CRON_SECRET=<value from step 4>

curl -H "Authorization: Bearer $CRON_SECRET" "$PORTAL/api/cron/weekly-ingest"
curl -H "Authorization: Bearer $CRON_SECRET" "$PORTAL/api/cron/daily-ingest"
```

The daily job backfills ~400 observations per FRED series (enough for the 6-month cycle high,
RV10/RV60, Sahm, and Δ3m windows), then runs the first state-machine evaluation and writes the
initial state row.

**Verify (M2):**
- Worker logs: `start daily-ingest … done daily-ingest`, no `DATA_GAP` lines beyond ICI
  (ICI is expected — it's on probation).
- Open `$PORTAL/dashboard/correction`: state banner shows the live tier and drawdown, all ten
  tripwire cards have readings and sparklines, layer panels populated, thresholds table shows
  the 16 frozen values.
- Expected first reading given the July 2026 configuration: Tier 0, POLICY_SWITCH
  CONSTRAINED (CPI > 4%), CAPE_HIGH ARMED, everything else quiet.

## 6. First sentinel + decommission v1 (M3)

1. Optionally fire a sentinel now instead of waiting for Friday:
   `curl -H "Authorization: Bearer $CRON_SECRET" "$PORTAL/api/cron/friday-sentinel"`
2. Verify in #all-ekantikcapital: parent message `🎯 CORRECTION SENTINEL — <date>` with two
   broadcast thread replies (layer detail + FP log; action linkage ending
   "Pre-committed output per Dashboard Spec v1.0. Not investment advice.").
3. **Decommission the v1 scheduled prompt** — delete/disable the scheduled task that runs
   `correction-dashboard-sentinel-v1-task-prompt.md`. Two sentinels on the same channel is
   worse than one. Record the decommission in the same change/PR per Spec §8 M3.

## 7. Governance end-to-end test (M4, ≈5 min, safe)

Proves a threshold cannot be changed by any single person — without changing anything:

```sh
export ADMIN_KEY=<ADMIN_API_KEY>

# 1. Propose (succeeds)
curl -X POST "$PORTAL/api/admin/threshold-change" -H "x-admin-key: $ADMIN_KEY" \
  -H 'content-type: application/json' \
  -d '{"key":"RV_ACCEL_RATIO","new_value":1.75,"justification":"Governance end-to-end verification only; value unchanged. This proposal will not be applied.","proposed_by":"ops-test"}'

# 2. Countersign with effective_at NOW (must FAIL — 48h cool-off enforced by the DB)
curl -X PATCH "$PORTAL/api/admin/threshold-change" -H "x-admin-key: $ADMIN_KEY" \
  -H 'content-type: application/json' \
  -d '{"id":1,"countersigned_by":"ops-test","effective_at":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}'
#    → expect: "48-hour minimum cool-off"

# 3. Countersign as the proposer with a valid date (must FAIL — proposer cannot countersign)
curl -X PATCH "$PORTAL/api/admin/threshold-change" -H "x-admin-key: $ADMIN_KEY" \
  -H 'content-type: application/json' \
  -d '{"id":1,"countersigned_by":"ops-test","effective_at":"2027-01-01T00:00:00Z"}'
#    → expect: "proposer cannot countersign their own change"

# 4. Apply without countersignature (must FAIL)
curl -X PUT "$PORTAL/api/admin/threshold-change" -H "x-admin-key: $ADMIN_KEY" \
  -H 'content-type: application/json' -d '{"id":1}'
#    → expect: "not countersigned/effective yet"
```

Clean up the test row in the Supabase SQL editor:
`delete from cd_threshold_changes where proposed_by = 'ops-test';`
(Proposals are deletable; `cd_thresholds` and the audit logs are not.)

Retirement alerts are already wired (Saturday cron) — they will stay silent until live
triggers accumulate FP-ledger outcomes.

## 8. Manual-entry cadence (ongoing)

Admin drawer on `/dashboard/correction` (needs `ADMIN_API_KEY`):
- **Alight 401(k) index / dealer gamma** — enter when reviewed; render N/A after 14 days stale.
- **Revision breadth** — required for a Sahm FIRED reading; absent breadth caps the gate at
  "ARMED — confirmation incomplete" by design.
- **Event register** — required within 48h of any Tier-1 entry (Slack nags automatically).
- **Confirmed higher low** — Tier-3 exit input.

## Done means (Spec §8)

- [ ] M1 — CI green on the 54-event replay (already enforced on every push)
- [ ] M2 — dashboard live internally, FP ledger populating from live triggers
- [ ] M3 — automated Friday sentinel posted with zero human touch; v1 prompt decommissioned
- [ ] M4 — governance rejections verified end-to-end (step 7); retirement alerts scheduled
